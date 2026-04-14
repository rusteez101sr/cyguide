-- Campus Events Seed Data (25+ events)
-- Run after 002_full_schema.sql

insert into public.campus_events (title, description, location, event_date, category, url) values

-- Career Events
('Engineering Career Fair', 'Meet 200+ employers recruiting for full-time positions and internships. Dress professionally, bring resumes. All engineering majors welcome.', 'Scheman Building', '2026-02-18 10:00:00-06', 'Career', 'https://www.career.iastate.edu'),
('Tech Career Night', 'Networking event specifically for CS, CPR E, and IT students. Casual attire, virtual component available.', 'Atanasoff Hall Atrium', '2026-02-25 17:00:00-06', 'Career', 'https://www.career.iastate.edu'),
('Business Career Fair', 'Connect with top business employers in finance, marketing, consulting, and supply chain.', 'Lied Recreation Athletic Center', '2026-03-04 10:00:00-06', 'Career', 'https://www.career.iastate.edu'),
('Resume Workshop', 'Get real-time feedback on your resume from career advisors and peer mentors.', 'Alumni Hall 290', '2026-01-28 14:00:00-06', 'Career', 'https://www.career.iastate.edu'),
('Interview Skills Workshop', 'Practice STAR method responses, body language, and technical interview prep.', 'Memorial Union Room 213', '2026-02-11 15:00:00-06', 'Career', 'https://www.career.iastate.edu'),

-- Academic Events
('ACM Meeting — AI Workshop', 'Monthly ACM meeting featuring a hands-on workshop on machine learning with scikit-learn. Pizza provided.', '223 Atanasoff Hall', '2026-01-21 18:00:00-06', 'Academic', 'https://acm.cs.iastate.edu'),
('ACM Meeting — Competitive Programming', 'LeetCode-style problem solving session. Prizes for top solvers.', '223 Atanasoff Hall', '2026-02-04 18:00:00-06', 'Academic', 'https://acm.cs.iastate.edu'),
('Cyclone Hackathon 2026', '24-hour hackathon open to all ISU students. Form teams of 2–4. Cash prizes up to $1,000. Food and swag provided.', 'Howe Hall', '2026-03-07 09:00:00-06', 'Academic', 'https://hack.iastate.edu'),
('HCI Speaker Series — Dr. Karen Liu', 'Talk on AI-assisted interface design and accessibility. Q&A to follow.', '101 Morrill Hall', '2026-02-19 16:00:00-06', 'Academic', null),
('Research Symposium', 'Annual showcase of undergraduate research projects across all disciplines. Poster presentations and awards.', 'Memorial Union Great Hall', '2026-04-15 10:00:00-05', 'Academic', 'https://www.undergradresearch.iastate.edu'),
('Study Abroad Information Fair', 'Learn about ISU study abroad programs, scholarships, and partner universities worldwide.', 'Memorial Union Main Lounge', '2026-02-10 11:00:00-06', 'Academic', 'https://www.studyabroad.iastate.edu'),

-- Social & Cultural Events
('ISU Dance Marathon', 'Iowa State Dance Marathon supporting the University of Iowa Stead Family Children''s Hospital. 24 hours of dancing and fundraising.', 'Hilton Coliseum', '2026-02-21 18:00:00-06', 'Social', 'https://www.dancemarathon.stuorg.iastate.edu'),
('Multicultural Fair', 'Celebrate diversity through food, performances, and exhibits from student cultural organizations across campus.', 'Memorial Union Main Lounge', '2026-03-18 11:00:00-05', 'Cultural', null),
('Diwali Night', 'Annual Diwali celebration featuring traditional dances, music, food, and fireworks on central campus.', 'Central Campus', '2026-10-20 18:00:00-05', 'Cultural', null),
('Lunar New Year Celebration', 'Welcome the Year of the Horse with performances, food, and cultural activities hosted by CSSA and other Asian student orgs.', 'Memorial Union Sun Room', '2026-01-28 17:00:00-06', 'Cultural', null),
('Black History Month Kickoff', 'Opening event for ISU''s Black History Month programming series. Keynote speaker and live performances.', 'Great Hall, Memorial Union', '2026-02-01 18:00:00-06', 'Cultural', null),
('Homecoming Pep Rally', 'Annual Homecoming pep rally featuring the marching band, cheerleaders, and surprise guests.', 'Jack Trice Stadium Lot', '2026-10-07 19:00:00-05', 'Social', 'https://www.isuhomecoming.com'),

-- Sports & Recreation
('Cyclone Basketball — Iowa vs ISU', 'Home game against University of Iowa. Student section tickets available through the ISU Athletic department.', 'Hilton Coliseum', '2026-01-31 19:00:00-06', 'Sports', 'https://cyclones.com'),
('Intramural Sports Sign-Ups Open', 'Register for spring intramural soccer, basketball, volleyball, and ultimate frisbee leagues.', 'Lied Recreation Athletic Center', '2026-01-15 09:00:00-06', 'Sports', 'https://www.recservices.iastate.edu'),
('5K Run for NAMI', '5K run/walk benefiting National Alliance on Mental Illness. Student registration free with student ID.', 'Central Campus to Lake LaVerne', '2026-03-29 08:00:00-05', 'Sports', null),

-- Speaker Series
('Tech Talk — Google Engineer', 'Software engineer from Google discusses distributed systems and career advice for new grads.', '101 Pearson Hall', '2026-02-12 16:00:00-06', 'Academic', null),
('Entrepreneurship Week — Founder Panel', 'Panel of ISU alumni founders discuss their startup journeys, failures, and successes.', 'Gerdin Business Building Auditorium', '2026-03-23 17:00:00-05', 'Academic', null),
('Mental Health Awareness Panel', 'Panel discussion with Student Counseling staff and student advocates on managing academic stress and seeking help.', 'Memorial Union Sun Room', '2026-02-26 14:00:00-06', 'Social', 'https://www.counseling.iastate.edu'),
('Environmental Sustainability Fair', 'Learn about ISU''s sustainability initiatives, zero-waste efforts, and how students can get involved.', 'Parks Library Lawn', '2026-04-22 11:00:00-05', 'Social', 'https://www.sustainableu.iastate.edu'),
('Women in STEM Networking Brunch', 'Networking event connecting women in STEM with industry mentors and ISU faculty.', 'Gerdin Business Building, Room 133', '2026-03-14 09:00:00-05', 'Career', 'https://www.wse.iastate.edu')

on conflict do nothing;
