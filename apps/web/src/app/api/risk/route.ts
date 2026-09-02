import { NextResponse } from 'next/server';

// In-memory store for risk calculations
const riskStore = new Map<string, { change_id: string; score: number; level: string; timestamp: string }>();

export async function POST(request: Request) {
  try {
    const { changeId, answers } = await request.json();
    if (!changeId) {
      return NextResponse.json({ error: 'Missing changeId' }, { status: 400 });
    }

    const WEIGHTS: Record<string, number> = {
      authChange: 20,
      schemaChange: 20,
      paymentChange: 25,
      infraChange: 15,
      largeChange: 15,
      priorFailure: 5,
    };

    const computeRisk = (ans: Record<string, boolean> = {}) => {
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

    riskStore.set(changeId, {
      change_id: changeId,
      score,
      level,
      timestamp: new Date().toISOString(),
    });

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

    const record = riskStore.get(changeId);
    if (!record) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(record, { status: 200 });
  } catch (err) {
    console.error('Risk API GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

