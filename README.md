# Exam Intelligence Assistant

Turn exam question papers (PDF) and notes into a working study tool: onboard every question from a paper, explore it in a question viewer, generate flashcards, see what to study first, and plan revision.

## Features

- **PDF question onboarding** — upload a question paper; text is extracted with `pdfjs-dist` and questions are parsed (deterministic parser + Gemini extraction for anything ambiguous, including sub-parts and marks).
- **Question Explorer** — browse every onboarded question with source paper, subject, topic, and marks.
- **Flashcards** — AI-generated cards per question/topic.
- **Study Priorities** — analytics over your papers, with topic coverage and unmapped-question fallback so no question is dropped from the report.
- **Revision planner** — spaced revision plan built from your questions and exam dates.
- **Notes analysis** — Gemini-based summary and explanation of your notes against the syllabus.
- **Cheat sheets / concept explanations** — generated on demand from any topic.
- **Analytics, syllabus, and data-quality views**, plus JSON workspace export/import.
- **Auto-analysis flow** — one confirm modal runs the full pipeline (extract → analyze → questions → flashcards).

## Stack

| Layer | Tech |
| --- | --- |
| Frontend | Vite 8, React 19, TypeScript, Tailwind CSS v4 |
| PDF parsing | `pdfjs-dist` (runs in the browser) |
| Backend | Express (`server.ts`) — all `/api/gemini/*` routes |
| AI | Google Gemini via `@google/genai` (`gemini-3.8-flash`, falls back to `gemini-3.1-flash-lite` on overload/quota) |
| Hosting | Vercel — static frontend + `api/[...all].ts` serverless function that mounts the same Express app |

Locally, `server.ts` serves both the app and the API on one origin (`http://localhost:3000`). On Vercel the API runs through `api/[...all].ts`, so the browser can keep using relative `/api/...` URLs.

## Getting started

**Prerequisites:** Node.js 18+

```bash
npm install
```

Create a `.env` in the project root with your Gemini API key:

```
GEMINI_API_KEY=your-key
```

Then run:

```bash
npm run dev
```

`.npmrc` already sets `legacy-peer-deps=true`, so a plain `npm install` works even with Vite 8's peer conflicts.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts Express + Vite dev server on `localhost:3000` |
| `npm run build` | Builds the production frontend to `dist/` |
| `npm run lint` | Type-check (`tsc --noEmit`) |
| `npm run preview` | Preview the built frontend |

## Deployment

Pushed to GitHub → auto-deploys on Vercel.

- **Production:** https://remix-exam-intelligence-assistant-oct-9-2026-2-01-05-a-pravaah3.vercel.app
- Set `GEMINI_API_KEY` in the Vercel project environment (Production + Preview).
- `api/[...all].ts` must keep the explicit `../server.js` import — the Vercel Node runtime will not resolve the extensionless one.

## Project layout

```
server.ts                 Express app + /api/gemini/* endpoints
api/[...all].ts           Vercel serverless handler (mounts the Express app)
vercel.json               /api rewrite to the function, SPA fallback
src/
  App.tsx                 App shell, views, auto-analysis flow
  components/             Views and modals (upload, questions, flashcards, …)
  services/
    documentExtractor.ts  pdf.js text extraction (uses hasEOL for line breaks)
    questionParser.ts     deterministic question parsing
    geminiService.ts      client calls to /api/gemini/*
    flashcardService.ts   flashcard generation
    analyticsEngine.ts    study-priority analytics (topic coverage)
    revisionPlanner.ts    revision scheduling
  types/                  Shared types
```
