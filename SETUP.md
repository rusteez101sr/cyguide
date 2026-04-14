# CyGuide Setup Guide

## Supabase SQL Setup (run in order)

Go to your Supabase project → SQL Editor, and run these files in order:

### 1. Full Schema Migration
Copy and paste the contents of:
```
supabase/migrations/002_full_schema.sql
```

This creates all new tables: students, student_courses, chat_messages, calendar_events, campus_events, canvas_courses, dining_menus, isu_documents, isu_academic_calendar.

### 2. Seed Canvas Courses (30+ courses)
```
supabase/seed/canvas_courses.sql
```

### 3. Seed Campus Events (25 events)
```
supabase/seed/campus_events.sql
```

### 4. Seed Dining Menus
```
supabase/seed/dining_menus.sql
```

### 5. Seed ISU Policy Documents (for chat RAG)
```
supabase/seed/isu_documents.sql
```

## Environment Variables

Add to `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key  # optional, for enhanced responses
```

## Features Implemented

- **Conversational Onboarding** — new users go through a chat-style setup
- **Intent Router** — 8 intents: policy_qa, degree_planning, professor_lookup, advisor_email, campus_events, dining, general_isu, struggling
- **Personalized AI** — student profile injected into every AI prompt
- **Canvas iCal Sync** — assignments appear in dashboard and chat context
- **Academic Planning** — course cards, GPT-4o degree plan generator, what-if scenarios
- **Calendar** — personal events + ISU academic deadlines
- **Campus Events** — 25+ seeded events with personalized recommendations
- **Dining** — today's menu for Conversations, Friley Windows, UDCC
- **Struggling Student Handler** — empathetic responses + ISU resource referrals
- **Chat History** — messages saved per student in Supabase

## Demo Day Checklist

1. New user signs up → onboarding → profile created → dashboard ✓
2. Return user sees "Welcome back, [Name]" ✓
3. Ask "deadline to drop?" → policy_qa intent → ISU policy answer ✓
4. Ask "plan my next 2 semesters" → GPT-4o degree plan ✓
5. Ask "draft email to advisor about struggling in COMS 311" → email draft ✓
6. Say "I'm overwhelmed and think I might fail" → struggling handler + resources ✓
7. Navigate Events → personalized recommendations by major ✓
8. Navigate Dining → today's menu + meal plan info ✓
9. Navigate Planning → courses + generate degree plan ✓
10. Ask about assignments → reads Canvas calendar ✓
