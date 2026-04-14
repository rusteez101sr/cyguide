-- ISU Policy Documents for RAG (text chunks)
-- Run after 002_full_schema.sql
-- Note: embeddings are inserted as NULL here; run the ingest script to generate real embeddings
-- For demo purposes, the chat AI will use its training knowledge + these text chunks

insert into public.isu_documents (content, source_document, section) values

-- Academic Calendar / Registration
('The last day to add a course for Spring 2026 is January 23, 2026. After this date, students need instructor permission to add a course. Late registration fees of $25 per added course may apply after the deadline. Students can add courses through AccessPlus or by obtaining a signed permission form from the instructor.',
'ISU Academic Calendar Spring 2026', 'Registration Deadlines'),

('The last day to drop a course without a "W" (Withdrawal) grade on your transcript for Spring 2026 is February 6, 2026. After this date and through April 3, 2026, students may drop with a "W" which appears on the transcript but does not affect GPA. After April 3, students may only withdraw from all courses (university withdrawal) with medical or other extenuating circumstances.',
'ISU Academic Calendar Spring 2026', 'Drop/Withdrawal Deadlines'),

('Spring Break for Spring 2026 is March 16–20, 2026. No classes are held during this period. University offices remain open. Students do not need to notify instructors about Spring Break absences.',
'ISU Academic Calendar Spring 2026', 'Academic Break'),

('Finals Week for Spring 2026 runs May 4–8, 2026. The last day of regular classes is May 1, 2026. Commencement ceremonies are held May 9, 2026. Students should check their final exam schedule in AccessPlus.',
'ISU Academic Calendar Spring 2026', 'Finals and Commencement'),

-- Financial Aid
('The priority FAFSA (Free Application for Federal Student Aid) deadline for ISU is March 1 each year for the following academic year. Students who file by this deadline receive maximum consideration for need-based grants, work-study, and subsidized loans. Filing after March 1 may result in reduced aid. The FAFSA is available at studentaid.gov.',
'ISU Financial Aid Guide 2025-2026', 'FAFSA Deadlines'),

('ISU offers several types of financial aid: Federal Pell Grants (need-based, up to $7,395/year for 2024-25), Federal Direct Subsidized Loans (need-based, 6.53% interest for undergrads), Federal Direct Unsubsidized Loans (non-need-based, 6.53% interest), Federal Work-Study (campus employment), and ISU Merit Scholarships. To appeal a financial aid decision, contact the Office of Student Financial Aid at 0210 Beardshear Hall, (515) 294-2223.',
'ISU Financial Aid Guide 2025-2026', 'Aid Types and Appeals'),

('To maintain financial aid eligibility at ISU, students must meet Satisfactory Academic Progress (SAP) requirements: maintain a minimum 2.0 cumulative GPA, complete at least 67% of attempted credit hours, and not exceed 150% of the credit hours required for their degree. Students who fail SAP may appeal with documentation of extenuating circumstances (illness, family emergency, etc.).',
'ISU Financial Aid Guide 2025-2026', 'Satisfactory Academic Progress'),

('Emergency financial assistance is available through the Dean of Students Office for students facing unexpected financial hardship. The ISU Emergency Fund can provide up to $500 in non-repayable assistance. The CyServ Food Pantry at 3625 Troxel Hall provides free food assistance to any ISU student without income or eligibility requirements.',
'ISU Financial Aid Guide 2025-2026', 'Emergency Assistance'),

-- Academic Integrity
('Iowa State University's Academic Integrity Policy prohibits plagiarism, fabrication, falsification, and cheating. Plagiarism includes submitting someone else''s work as your own, failing to cite sources, and unauthorized use of AI tools to generate submitted work (unless explicitly permitted by the instructor). First offenses may result in course failure; repeat offenses can lead to academic probation or expulsion.',
'ISU Academic Integrity Policy 2025-2026', 'Policy Overview'),

('If a student is accused of academic dishonesty, they have the right to appeal. The process is: (1) Instructor notifies the Dean of Students Office and informs the student in writing; (2) Student may accept or contest the charge; (3) If contested, a hearing is held before the Academic Integrity Hearing Panel; (4) Student may appeal the Panel decision to the Provost. Students can contact Student Legal Services at 1806 Knoll Drive for free legal advice during this process.',
'ISU Academic Integrity Policy 2025-2026', 'Academic Dishonesty Procedures'),

-- GPA and Academic Standing
('The minimum cumulative GPA to remain in good academic standing at ISU is 2.0. Students below 2.0 are placed on Academic Probation. Students on probation who do not raise their GPA above 2.0 within one semester may be subject to Academic Suspension. The Dean''s List requires a semester GPA of 3.5 or higher with at least 12 graded credits. The University Honors designation at graduation requires a cumulative GPA of 3.5 or higher.',
'ISU Student Handbook 2025-2026', 'Academic Standing'),

('Different ISU colleges have higher GPA requirements for their programs. The College of Engineering requires a minimum 2.0 GPA in both cumulative and major coursework to remain in the college. The College of Business requires a 2.5 GPA to enroll in upper-division business courses. Students below these thresholds may be required to change their major or college.',
'ISU Student Handbook 2025-2026', 'College GPA Requirements'),

-- Graduation
('To apply for graduation at ISU, students must submit a Graduation Application through AccessPlus. Applications should be submitted one full semester before the expected graduation date (e.g., apply in Fall for Spring graduation, or in Spring for Fall graduation). There is no fee to apply. Students must have their degree requirements verified by their academic advisor before the application is approved.',
'ISU Registration and Records Guide', 'Graduation Application'),

('ISU graduation requirements include: completion of all major requirements, a minimum of 120 credit hours (may vary by program), a minimum 2.0 cumulative GPA, residency requirement (at least 32 credit hours at ISU), and completion of the ISU Core curriculum (Lib Ed requirements). Engineering programs typically require 128–136 credits. Transfer students must complete 30 of their last 36 credits at ISU.',
'ISU Registration and Records Guide', 'Graduation Requirements'),

-- Housing
('ISU freshmen are required to live in on-campus residence halls for their first year unless they are living with a parent or legal guardian within 30 miles of campus, married, a veteran, over age 21, or have an approved medical/disability accommodation. Housing contracts are binding for the full academic year. Early release from a housing contract requires an approved exception (e.g., marriage, internship requiring relocation, medical withdrawal).',
'ISU Housing and Dining Contract 2025-2026', 'Housing Requirements'),

('To request a room change, students should contact their Residence Hall Coordinator (RHC). Room changes are generally permitted after the first two weeks of the semester, space permitting. Students may not switch rooms without departmental approval. Housing accommodations for students with disabilities should be requested through Student Accessibility Services at 1076 Student Services Building.',
'ISU Housing and Dining Contract 2025-2026', 'Room Changes'),

-- Health and Counseling
('ISU Student Counseling Services provides free, confidential counseling to all enrolled ISU students. Services include individual therapy, group therapy, crisis counseling, and consultation. Located at 3515 Troxel Hall. Phone: (515) 294-5056. Walk-in crisis appointments are available Monday–Friday 8 AM–5 PM. For after-hours emergencies, call the ISU Police at (515) 294-4428.',
'ISU Health and Counseling Services Guide', 'Counseling Services'),

('Thielen Student Health Center provides primary care, immunizations, laboratory services, pharmacy, physical therapy, and sexual health services to ISU students. Located at 2647 Union Drive. Phone: (515) 294-5801. Most services are covered by the mandatory student health fee for enrolled students. Additional charges may apply for lab tests and medications.',
'ISU Health and Counseling Services Guide', 'Health Services'),

('The Student Accessibility Services (SAS) office provides accommodations for students with disabilities, including extended test time, note-taking assistance, captioning, and alternative formats. To register, students must provide documentation of their disability. Located at 1076 Student Services Building. Phone: (515) 294-7220.',
'ISU Health and Counseling Services Guide', 'Disability Services'),

-- Campus Resources
('The ISU Career Center assists students with job searches, career exploration, resume writing, interview preparation, and connecting with employers. Services include career fairs, mock interviews, and online resources via Handshake. Located at 1349 Student Services Building. Phone: (515) 294-4800. All students are encouraged to visit the Career Center starting freshman year.',
'ISU Student Resources Guide', 'Career Services'),

('The Student Counseling Services Cyber-couch program offers online resources for mental health self-help including stress management, anxiety, and depression resources. Students can access these at counseling.iastate.edu. The Crisis Line is available 24/7 at (515) 294-5056 (after hours, listen for the emergency option).',
'ISU Health and Counseling Services Guide', 'Online Mental Health Resources'),

('CyRide provides free bus transportation for ISU students throughout Ames. Students must show their ISU ID to ride. The main bus routes include Red, Blue, Gold, Green, and Orange lines. CyRide operates daily including weekends, with reduced hours on holidays. The CyRide app and Google Maps provide real-time bus tracking.',
'ISU Student Resources Guide', 'Transportation')

on conflict do nothing;
