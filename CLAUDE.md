# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Where2Meet is a registration-free web app that helps groups find fair meeting locations based on everyone's addresses. Users create events via invitation-style links, participants join by providing their location, and an AI recommends optimal meeting spots.

**Key Features:**
- No user registration required - invitation link-based workflow
- QR code and 6-digit short codes for easy event sharing
- AI-powered location recommendations using Google Gemini
- 30-day event expiration for privacy
- Client-side participation tracking via localStorage

## Development Commands

```bash
# Development
pnpm dev                    # Start Next.js dev server (localhost:3000)
pnpm build                  # Production build
pnpm start                  # Start production server
pnpm lint                   # Run ESLint

# Database (Prisma with Supabase PostgreSQL)
pnpm db:push                # Push schema changes to database
pnpm db:generate            # Generate Prisma Client
pnpm db:studio              # Open Prisma Studio GUI
pnpm db:migrate             # Create and run migrations

# Note: All db commands use dotenv-cli to load .env.local
```

## Technology Stack

- **Framework:** Next.js 16.0.1 (App Router, React 19, Turbopack)
- **Database:** PostgreSQL (Supabase) via Prisma ORM
- **AI:** Google Gemini 2.0 Flash via Vercel AI SDK
- **Validation:** Zod 4.x (note: breaking changes from v3)
- **UI:** Tailwind CSS 4, Radix UI components, Sonner toasts
- **Unique IDs:** nanoid for event IDs and short codes

## Architecture Overview

### Data Flow

```
1. User creates event → Event + Creator as first Participant
2. Share link/QR/short code → Other users join
3. When 2nd participant joins → Auto-trigger LLM recommendation (async, non-blocking)
4. Frontend polls/displays recommendations → User sees AI suggestions
```

### Database Schema

Three main models with cascade deletion:

```
Event (id, shortCode, title, purpose, eventTime, expiresAt)
  ├─ Participant[] (nickname, address, isCreator)
  └─ Recommendation[] (locationName, rank, suitabilityScore, facilities, distances)
```

**Important:**
- Event IDs are 8-character nanoid (URL-safe)
- Short codes are 6-character uppercase alphanumeric
- Events expire after 30 days (checked via `expiresAt > now()`)

### LLM Recommendation System

**Two trigger points (both endpoints call `llmService.generateRecommendations()`):**

1. **Automatic (Background):** `POST /api/events/[id]/participants`
   - Triggers when final participant joins (event transitions from WAITING to READY)
   - Runs asynchronously via `Promise.resolve().then(...)`
   - Silent failure (logged to console)
   - Purpose: Generate recommendations immediately without user action

2. **Manual (Creator Retry):** `POST /api/events/[id]/retry`
   - Requires the creator's nickname in the payload for authorization
   - Clears old recommendations before saving new ones
   - Only available while the event is in READY status (i.e., auto-generation failed)
   - Purpose: Creator-initiated retry when auto-generation fails

**Why both exist:** Auto-generation provides instant results, manual retry gives the event creator a recovery path without exposing the LLM endpoint to other participants.

### AI Integration (Vercel AI SDK)

Located in `src/lib/llm.ts` and `src/lib/ai.ts`:

```typescript
// src/lib/ai.ts - Model configuration
export const textModel = google('gemini-2.5-flash')
export { generateObject } from 'ai'

// src/lib/llm.ts - Service layer
const result = await generateObject({
  model: textModel,
  schema: llmResponseSchema,  // Zod schema for structured output
  prompt: prompt,
  system: systemPrompt,
  temperature: 0.0,
})
```

**Key points:**
- Uses Gemini's structured output mode (no manual JSON parsing)
- Response validated against Zod schema (`llmResponseSchema`)
- Supports both success (recommendations array) and error responses
- Schema defined in `src/lib/validations.ts`

## Critical Technical Details

### Zod 4.x Breaking Changes

Zod 4.x has API changes from v3:

```typescript
// ❌ OLD (v3)
validation.error.errors.forEach(...)
z.enum(['a', 'b'], { errorMap: () => ({ message: '...' }) })

// ✅ NEW (v4)
validation.error.issues.forEach(...)
z.enum(['a', 'b'], { message: '...' })
```

### Prisma null vs TypeScript undefined

Prisma returns `null` for optional fields, but TypeScript types use `undefined`:

```typescript
// ✅ Correct
const llmRequest: LLMRequest = {
  eventTime: event.eventTime ?? undefined,
  specialRequirements: event.specialRequirements ?? undefined,
}

// ❌ Wrong - type error
const llmRequest: LLMRequest = {
  eventTime: event.eventTime,  // Type 'Date | null' not assignable to 'Date | undefined'
}
```

### Form Validation with Empty Strings

Optional fields must handle empty strings (`""`) from form inputs:

```typescript
// In src/lib/validations.ts
eventTime: z.string().optional()
  .transform(val => !val || val === '' ? undefined : val)
  .refine(val => !val || !isNaN(Date.parse(val)), {
    message: 'Invalid date/time format'
  })
```

### localStorage Participation Tracking

Client-side tracking to hide "Join" button for users who already joined:

```typescript
// Check if user joined
localStorageUtils.hasJoinedEvent(eventId)

// Mark as joined after successful join
localStorageUtils.markEventJoined(eventId, nickname)

// Storage format: { [eventId]: { nickname, joinedAt } }
```

## API Routes

RESTful structure under `/api`:

```
GET  /api/events                    # List events (health check)
POST /api/events                    # Create event
GET  /api/events/[id]               # Get event details
GET  /api/events/code/[shortCode]   # Get event by short code
GET  /api/events/[id]/qrcode        # Generate QR code

POST /api/events/[id]/participants       # Join event (auto-triggers LLM)
GET  /api/events/[id]/participants       # List participants

POST /api/events/[id]/recommendations    # Manual LLM regeneration
GET  /api/events/[id]/recommendations    # Get recommendations
```

**Pattern:** All routes check `expiresAt > new Date()` before returning events.

## Environment Variables

Required in `.env.local`:

```bash
# Database (Supabase PostgreSQL)
DATABASE_URL="postgresql://..."        # Connection pooling (pgbouncer)
DIRECT_URL="postgresql://..."          # Direct connection for migrations

# AI Service
GOOGLE_GENERATIVE_AI_API_KEY="..."     # Get from https://aistudio.google.com/app/apikey
```

## Common Development Patterns

### Type Safety

All API responses use `ApiResponse<T>` wrapper:

```typescript
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Usage
return NextResponse.json({
  success: true,
  data: { event, participants, recommendations }
})
```

### Error Handling

Consistent error codes defined in `src/lib/utils.ts`:

```typescript
export const errorMessages = {
  NETWORK_ERROR: 'Network connection failed. Please check your connection and try again.',
  EVENT_NOT_FOUND: 'This event does not exist or has expired.',
  LLM_ERROR: 'The recommendation service is temporarily unavailable. Please try again later.',
  // ...
} as const
```

### Component Organization

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Homepage (create event form)
│   ├── event/[id]/        # Event detail page
│   └── api/               # API routes
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── JoinEventDialog.tsx
├── lib/                   # Utilities and services
│   ├── ai.ts             # AI model config
│   ├── llm.ts            # LLM service layer
│   ├── prisma.ts         # Prisma client singleton
│   ├── utils.ts          # General utilities
│   └── validations.ts    # Zod schemas
└── types/                 # TypeScript type definitions
    └── index.ts
```

## Known Issues & Considerations

### Current UI Limitation

The manual recommendation endpoint (`POST /api/events/[id]/recommendations`) exists but has no UI button trigger in the frontend. If auto-generation fails silently, users cannot manually retry without page refresh.

**Context:** The event detail page (`src/app/event/[id]/page.tsx`) currently uses polling to wait for recommendations to appear after a join. This causes database query spam (SELECT every 5 seconds) without actually triggering LLM regeneration.

### Database Connection

Uses Supabase PostgreSQL with connection pooling:
- `DATABASE_URL` with pgbouncer (port 6543) for app queries
- `DIRECT_URL` without pooling (port 5432) for migrations

### Font Configuration

The app uses system fonts (no Google Fonts) due to network restrictions:

```css
/* In globals.css */
--font-sans: ui-sans-serif, system-ui, sans-serif, ...
--font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, ...
```
