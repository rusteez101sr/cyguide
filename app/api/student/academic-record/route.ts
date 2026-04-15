import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase-server";

type DocumentType = "transcript" | "schedule";
type SupabaseClientType = Awaited<ReturnType<typeof createClient>>;

interface ParsedCourse {
  course_code: string;
  course_name: string;
  credits?: number;
  semester?: string;
  grade?: string;
  status?: "completed" | "current";
  source?: string;
  professor_name?: string;
  professor_email?: string;
  professor_office?: string;
  professor_office_hours?: string;
}

interface ParsedAcademicRecord {
  student: {
    major?: string;
    gpa?: string;
  };
  summary: string;
  current_courses: ParsedCourse[];
  completed_courses: ParsedCourse[];
}

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const TEXT_TYPES = new Set(["text/plain", "text/csv", "application/csv"]);

function currentSemesterLabel(date = new Date()): string {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  if (month <= 5) return `Spring ${year}`;
  if (month <= 8) return `Summer ${year}`;
  return `Fall ${year}`;
}

function cleanModelJson(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

function normalizeCourseCode(input: string): string {
  return input
    .replace(/\s+/g, " ")
    .replace(/\s*-\s*/g, " ")
    .trim()
    .toUpperCase();
}

function normalizeCourseName(input: string, fallback: string): string {
  const cleaned = input.replace(/\s+/g, " ").replace(/[|]+/g, " ").trim();
  return cleaned || fallback;
}

function normalizeGrade(input?: string): string | undefined {
  if (!input) return undefined;
  const grade = input.trim().toUpperCase();
  return grade || undefined;
}

function normalizeParsedCourses(courses: unknown[], fallbackStatus: "completed" | "current"): ParsedCourse[] {
  if (!Array.isArray(courses)) return [];

  const seen = new Set<string>();
  const normalized: ParsedCourse[] = [];

  for (const rawEntry of courses) {
    if (!rawEntry || typeof rawEntry !== "object") continue;
    const entry = rawEntry as Record<string, unknown>;
    const rawCode = typeof entry.course_code === "string" ? entry.course_code : "";
    const rawName = typeof entry.course_name === "string" ? entry.course_name : rawCode;
    const courseCode = normalizeCourseCode(rawCode);

    if (!courseCode) continue;

    const courseName = normalizeCourseName(rawName, courseCode);
    const credits = typeof entry.credits === "number"
      ? entry.credits
      : typeof entry.credits === "string" && entry.credits.trim()
        ? Number(entry.credits)
        : undefined;
    const semester = typeof entry.semester === "string" && entry.semester.trim()
      ? entry.semester.trim()
      : undefined;
    const grade = normalizeGrade(typeof entry.grade === "string" ? entry.grade : undefined);
    const key = [courseCode, semester ?? "", grade ?? "", fallbackStatus].join("|");

    if (seen.has(key)) continue;
    seen.add(key);

    normalized.push({
      course_code: courseCode,
      course_name: courseName,
      credits: Number.isFinite(credits) ? credits : undefined,
      semester,
      grade,
      status: fallbackStatus,
    });
  }

  return normalized;
}

function summarizeParsedRecord(parsed: ParsedAcademicRecord, documentType: DocumentType): string {
  const summary = parsed.summary?.trim();
  if (summary) return summary;

  const parts = [
    `${parsed.completed_courses.length} completed course${parsed.completed_courses.length === 1 ? "" : "s"}`,
    `${parsed.current_courses.length} current course${parsed.current_courses.length === 1 ? "" : "s"}`,
  ];

  return `${documentType === "transcript" ? "Transcript" : "Schedule"} parsed with ${parts.join(" and ")}.`;
}

function parseAcademicRecordLocally(text: string, documentType: DocumentType): ParsedAcademicRecord {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const gpaMatch = text.match(/\b(?:cum(?:ulative)?\s+)?gpa[:\s]+([0-4]\.\d{1,2})\b/i);
  const majorMatch = text.match(/\bmajor[:\s]+([A-Za-z0-9,&/()' -]{3,80})/i);
  const coursePattern = /\b([A-Z]{2,4}\s?[A-Z]?\s?\d{3}[A-Z]?)\b(?:\s*[-:]\s*|\s{2,})(.+?)?(?:\s+([0-9](?:\.[0-9])?)\s*(?:cr|credits?|hrs?))?(?:\s+([A-F][+-]?|P|S|IP|W))?$/i;

  const currentCourses: ParsedCourse[] = [];
  const completedCourses: ParsedCourse[] = [];

  for (const line of lines) {
    const match = line.match(coursePattern);
    if (!match) continue;

    const [, code, rawName = "", rawCredits, rawGrade] = match;
    const grade = normalizeGrade(rawGrade);
    const credits = rawCredits ? Number(rawCredits) : undefined;
    const course: ParsedCourse = {
      course_code: normalizeCourseCode(code),
      course_name: normalizeCourseName(rawName, normalizeCourseCode(code)),
      credits: Number.isFinite(credits) ? credits : undefined,
      semester: currentSemesterLabel(),
      grade: grade && grade !== "IP" ? grade : undefined,
      status: documentType === "schedule" || grade === "IP" ? "current" : "completed",
    };

    if (documentType === "schedule" || grade === "IP") {
      currentCourses.push({ ...course, grade: undefined, semester: currentSemesterLabel() });
    } else {
      completedCourses.push(course);
    }
  }

  return {
    student: {
      major: majorMatch?.[1]?.trim(),
      gpa: gpaMatch?.[1],
    },
    summary: `${documentType === "transcript" ? "Transcript" : "Schedule"} parsed from text upload. Review any courses with generic titles before using the plan.`,
    current_courses: currentCourses,
    completed_courses: completedCourses,
  };
}

async function parseAcademicRecordWithAnthropic(file: File, documentType: DocumentType): Promise<ParsedAcademicRecord> {
  if (!anthropic) {
    throw new Error("ANTHROPIC_API_KEY is required to scan PDF or image uploads.");
  }

  const prompt = `Extract the student's academic record from this ${documentType}.

Return ONLY valid JSON in this exact shape:
{
  "student": {
    "major": string | null,
    "gpa": string | null
  },
  "summary": string,
  "current_courses": [
    {
      "course_code": string,
      "course_name": string,
      "credits": number | null,
      "semester": string | null
    }
  ],
  "completed_courses": [
    {
      "course_code": string,
      "course_name": string,
      "credits": number | null,
      "semester": string | null,
      "grade": string | null
    }
  ]
}

Rules:
- Transcript uploads should put past completed work in completed_courses and any in-progress enrollment in current_courses.
- Schedule uploads should only populate current_courses unless prior coursework is explicitly listed.
- Normalize course codes like "COM S 227" or "CPRE 281".
- Do not invent missing courses, grades, semesters, or GPA.
- If a field is unavailable, use null.
- Summary should mention what you detected and any ambiguity.`;

  // The Anthropic SDK accepts a mixed array of text/document/image blocks here.
  // A loose type keeps the content construction readable across file formats.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let content: any[] = [{ type: "text", text: prompt }];

  if (file.type === "application/pdf") {
    const buffer = Buffer.from(await file.arrayBuffer());
    content = [
      ...content,
      {
        type: "document",
        title: file.name,
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: buffer.toString("base64"),
        },
      },
    ];
  } else if (IMAGE_TYPES.has(file.type)) {
    const buffer = Buffer.from(await file.arrayBuffer());
    content = [
      ...content,
      {
        type: "image",
        source: {
          type: "base64",
          media_type: file.type,
          data: buffer.toString("base64"),
        },
      },
    ];
  } else {
    const text = (await file.text()).slice(0, 40000);
    content = [
      ...content,
      {
        type: "document",
        title: file.name,
        source: {
          type: "text",
          media_type: "text/plain",
          data: text,
        },
      },
    ];
  }

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: "You extract structured course and transcript data. Return JSON only with no markdown.",
    messages: [{ role: "user", content }],
  });

  const rawText = message.content.find((block) => block.type === "text");
  const cleaned = cleanModelJson(rawText?.type === "text" ? rawText.text : "");
  const parsed = JSON.parse(cleaned) as ParsedAcademicRecord;

  return {
    student: {
      major: parsed.student?.major ?? undefined,
      gpa: parsed.student?.gpa ?? undefined,
    },
    summary: summarizeParsedRecord(parsed, documentType),
    current_courses: normalizeParsedCourses(parsed.current_courses, "current"),
    completed_courses: normalizeParsedCourses(parsed.completed_courses, "completed"),
  };
}

async function parseAcademicRecord(file: File, documentType: DocumentType): Promise<ParsedAcademicRecord> {
  if (anthropic) {
    try {
      return await parseAcademicRecordWithAnthropic(file, documentType);
    } catch (error) {
      if (!TEXT_TYPES.has(file.type) && file.type !== "") {
        throw error;
      }
    }
  }

  if (file.type === "application/pdf" || IMAGE_TYPES.has(file.type)) {
    throw new Error(
      anthropic
        ? "We could not read that file cleanly. Try a clearer transcript or schedule export."
        : "PDF and image uploads require ANTHROPIC_API_KEY. Upload TXT or CSV instead.",
    );
  }

  if (!TEXT_TYPES.has(file.type) && file.type !== "") {
    throw new Error("Upload a PDF, image, TXT, or CSV file for transcript scanning.");
  }

  const text = await file.text();
  return parseAcademicRecordLocally(text, documentType);
}

async function ensureStudentRecord(supabase: SupabaseClientType, userId: string) {
  const upsert = await supabase
    .from("students")
    .upsert({ user_id: userId, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
    .select("id, major, gpa")
    .single();

  if (upsert.data) return upsert.data;

  const fallback = await supabase
    .from("students")
    .select("id, major, gpa")
    .eq("user_id", userId)
    .single();

  if (fallback.data) return fallback.data;
  throw upsert.error ?? fallback.error ?? new Error("Unable to create student record.");
}

async function enrichCoursesFromCatalog(supabase: SupabaseClientType, courses: ParsedCourse[]): Promise<ParsedCourse[]> {
  if (courses.length === 0) return courses;

  const uniqueCodes = [...new Set(courses.map((course) => course.course_code))];
  const { data: catalogCourses } = await supabase
    .from("canvas_courses")
    .select("course_code, course_name, professor_name, professor_email, professor_office, professor_office_hours, credits")
    .in("course_code", uniqueCodes);

  const byCode = new Map(
    (catalogCourses ?? []).map((course) => [normalizeCourseCode(course.course_code), course]),
  );

  return courses.map((course) => {
    const catalog = byCode.get(course.course_code);
    if (!catalog) return course;

    return {
      ...course,
      course_name: course.course_name === course.course_code ? catalog.course_name : course.course_name,
      credits: course.credits ?? catalog.credits ?? undefined,
      professor_name: catalog.professor_name ?? undefined,
      professor_email: catalog.professor_email ?? undefined,
      professor_office: catalog.professor_office ?? undefined,
      professor_office_hours: catalog.professor_office_hours ?? undefined,
    };
  });
}

function toInsertPayload(studentId: string, course: ParsedCourse) {
  return {
    student_id: studentId,
    course_code: course.course_code,
    course_name: course.course_name,
    professor_name: course.professor_name ?? undefined,
    professor_email: course.professor_email ?? undefined,
    professor_office: course.professor_office ?? undefined,
    professor_office_hours: course.professor_office_hours ?? undefined,
    credits: course.credits ?? undefined,
    semester: course.semester ?? currentSemesterLabel(),
    grade: course.grade ?? undefined,
    status: course.status ?? undefined,
    source: course.source ?? undefined,
  };
}

async function upsertStudentMetadata(
  supabase: SupabaseClientType,
  userId: string,
  parsed: ParsedAcademicRecord,
  documentType: DocumentType,
  fileName: string,
) {
  const timestamp = new Date().toISOString();
  const updatePayload = {
    user_id: userId,
    updated_at: timestamp,
    major: parsed.student.major ?? undefined,
    gpa: parsed.student.gpa ?? undefined,
    transcript_summary: documentType === "transcript" ? parsed.summary : undefined,
    transcript_uploaded_at: documentType === "transcript" ? timestamp : undefined,
    transcript_file_name: documentType === "transcript" ? fileName : undefined,
    schedule_summary: documentType === "schedule" ? parsed.summary : undefined,
    schedule_uploaded_at: documentType === "schedule" ? timestamp : undefined,
    schedule_file_name: documentType === "schedule" ? fileName : undefined,
  };

  let { data: student, error } = await supabase
    .from("students")
    .upsert(updatePayload, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error && error.message?.includes("column")) {
    const {
      transcript_summary,
      transcript_uploaded_at,
      transcript_file_name,
      schedule_summary,
      schedule_uploaded_at,
      schedule_file_name,
      ...corePayload
    } = updatePayload;

    void transcript_summary;
    void transcript_uploaded_at;
    void transcript_file_name;
    void schedule_summary;
    void schedule_uploaded_at;
    void schedule_file_name;

    const retry = await supabase
      .from("students")
      .upsert(corePayload, { onConflict: "user_id" })
      .select("*")
      .single();

    student = retry.data;
    error = retry.error;
  }

  if (error) throw error;
  return student;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const documentType = formData.get("documentType");
    const file = formData.get("file");

    if (documentType !== "transcript" && documentType !== "schedule") {
      return NextResponse.json({ error: "Upload type must be transcript or schedule." }, { status: 400 });
    }

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Choose a transcript or class schedule file to upload." }, { status: 400 });
    }

    const studentRecord = await ensureStudentRecord(supabase, user.id);
    const parsed = await parseAcademicRecord(file, documentType);
    const parsedSummary = summarizeParsedRecord(parsed, documentType);

    const completedCourses = await enrichCoursesFromCatalog(
      supabase,
      parsed.completed_courses.map((course) => ({
        ...course,
        semester: course.semester ?? currentSemesterLabel(),
        status: "completed",
        source: "transcript_upload",
      })),
    );

    const currentSource = documentType === "transcript" ? "transcript_upload" : "schedule_upload";
    const currentCourses = await enrichCoursesFromCatalog(
      supabase,
      parsed.current_courses.map((course) => ({
        ...course,
        semester: course.semester ?? currentSemesterLabel(),
        status: "current",
        source: currentSource,
      })),
    );

    const { data: existingCourses } = await supabase
      .from("student_courses")
      .select("*")
      .eq("student_id", studentRecord.id);

    const preservedCourses = documentType === "schedule"
      ? (existingCourses ?? []).filter((course) => Boolean(course.grade) || course.status === "completed")
      : [];

    const nextCourses = documentType === "transcript"
      ? [...completedCourses, ...currentCourses]
      : [
          ...preservedCourses.map((course) => ({
            ...course,
            course_code: normalizeCourseCode(course.course_code),
            course_name: normalizeCourseName(course.course_name, normalizeCourseCode(course.course_code)),
            status: "completed" as const,
          })),
          ...currentCourses,
        ];

    await supabase.from("student_courses").delete().eq("student_id", studentRecord.id);

    if (nextCourses.length > 0) {
      const insertPayload = nextCourses.map((course) => toInsertPayload(studentRecord.id, course));
      let { error: insertError } = await supabase.from("student_courses").insert(insertPayload);

      if (insertError && insertError.message?.includes("column")) {
        const fallbackPayload = insertPayload.map(({ status, source, ...course }) => course);
        insertError = (await supabase.from("student_courses").insert(fallbackPayload)).error;
      }

      if (insertError) throw insertError;
    }

    const student = await upsertStudentMetadata(
      supabase,
      user.id,
      { ...parsed, summary: parsedSummary },
      documentType,
      file.name,
    );

    const { data: refreshedCourses } = await supabase
      .from("student_courses")
      .select("*")
      .eq("student_id", studentRecord.id)
      .order("semester", { ascending: true })
      .order("course_code", { ascending: true });

    return NextResponse.json({
      success: true,
      student,
      courses: refreshedCourses ?? [],
      parsed: {
        summary: parsedSummary,
        currentCount: currentCourses.length,
        completedCount: completedCourses.length,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to scan academic record";
    console.error("[POST /api/student/academic-record]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
