import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/lib/openrouter";

interface ChatRequestBody {
  message: string;
  history?: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  profile?: Record<string, string>;
}

export async function POST(req: NextRequest) {
  let body: ChatRequestBody;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 }
    );
  }

  const { message, history = [], profile = {} } = body;

  if (!message || typeof message !== "string" || message.trim() === "") {
    return NextResponse.json(
      { error: "message is required and must be a non-empty string" },
      { status: 400 }
    );
  }

  try {
    const result = await chat(message.trim(), history, profile);
    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred";
    console.error("[/api/chat]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
