import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

// Resolve DB path relative to project root
const dbPath = path.resolve(process.cwd(), 'risk.db');

async function getDb() {
  // Ensure DB file exists
  await fs.mkdir(path.dirname(dbPath), { recursive: true });
  const db = await open({ filename: dbPath, driver: sqlite3.Database });
  await db.exec(`
    CREATE TABLE IF NOT EXISTS risk_scores (
      change_id TEXT PRIMARY KEY,
      score INTEGER NOT NULL,
      level TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  return db;
}

export async function POST(request: Request) {
  try {
    const { changeId, answers } = await request.json();
    // Compute risk server‑side (duplicate logic to keep API stateless)
    const WEIGHTS: Record<string, number> = {
      authChange: 20,
      schemaChange: 20,
      paymentChange: 25,
      infraChange: 15,
      largeChange: 15,
      priorFailure: 5,
    };
    const computeRisk = (ans: Record<string, boolean>) => {
      let score = 0;
      for (const k of Object.keys(ans)) {
        if (ans[k]) score += WEIGHTS[k] ?? 0;
      }
      return Math.min(100, score);
    };
    const riskLevel = (score: number) => {
      if (score >= 80) return 'High';
      if (score >= 60) return 'Medium';
      if (score >= 40) return 'Low';
      return 'Minimal';
    };
    const score = computeRisk(answers);
    const level = riskLevel(score);

    const db = await getDb();
    await db.run(
      `INSERT OR REPLACE INTO risk_scores (change_id, score, level) VALUES (?, ?, ?);`,
      changeId,
      score,
      level
    );

    return NextResponse.json({ score, level }, { status: 200 });
  } catch (err) {
    console.error('Risk API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const changeId = url.searchParams.get('changeId');
    if (!changeId) {
      return NextResponse.json({ error: 'Missing changeId' }, { status: 400 });
    }
    const db = await getDb();
    const row = await db.get(
      `SELECT score, level FROM risk_scores WHERE change_id = ?;`,
      changeId
    );
    if (!row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(row, { status: 200 });
  } catch (err) {
    console.error('Risk API GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
