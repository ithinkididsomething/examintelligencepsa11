import type { Request, Response } from 'express';
import app from '../server';

// Vercel catch-all serverless function: mounts the full Express app so every
// /api/* route (Gemini analysis, flashcards, questions, etc.) works in production.
export default function handler(req: Request, res: Response) {
  app(req, res);
}