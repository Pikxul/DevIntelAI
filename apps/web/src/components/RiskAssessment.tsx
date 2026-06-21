import { useState } from 'react';
import { motion } from 'framer-motion';

// Weights matching the implementation plan
const WEIGHTS: Record<string, number> = {
  authChange: 20,
  schemaChange: 20,
  paymentChange: 25,
  infraChange: 15,
  largeChange: 15,
  priorFailure: 5,
};

type Answers = {
  authChange: boolean;
  schemaChange: boolean;
  paymentChange: boolean;
  infraChange: boolean;
  largeChange: boolean;
  priorFailure: boolean;
};

function computeRisk(answers: Answers): number {
  let score = 0;
  for (const key of Object.keys(answers) as (keyof Answers)[]) {
    if (answers[key]) score += WEIGHTS[key];
  }
  return Math.min(100, score);
}

function riskLevel(score: number): string {
  if (score >= 80) return 'High';
  if (score >= 60) return 'Medium';
  if (score >= 40) return 'Low';
  return 'Minimal';
}

export default function RiskAssessment({ changeId }: { changeId: string }) {
  const [answers, setAnswers] = useState<Answers>({
    authChange: false,
    schemaChange: false,
    paymentChange: false,
    infraChange: false,
    largeChange: false,
    priorFailure: false,
  });
  const [result, setResult] = useState<{ score: number; level: string } | null>(null);

  const handleToggle = (field: keyof Answers) => {
    setAnswers((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const submit = async () => {
    const score = computeRisk(answers);
    const level = riskLevel(score);
    setResult({ score, level });
    try {
      await fetch('/api/risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changeId, answers }),
      });
    } catch (e) {
      console.warn('Failed to persist risk score', e);
    }
  };

  return (
    <div className="risk-assessment" style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
      <h3 style={{ marginBottom: '0.75rem', fontWeight: 600 }}>Risk Assessment</h3>
      <div className="questions" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '0.75rem' }}>
        <label style={{ cursor: 'pointer' }}>
          <input type="checkbox" checked={answers.authChange} onChange={() => handleToggle('authChange')} /> Did authentication change?
        </label>
        <label style={{ cursor: 'pointer' }}>
          <input type="checkbox" checked={answers.schemaChange} onChange={() => handleToggle('schemaChange')} /> Did database schema change?
        </label>
        <label style={{ cursor: 'pointer' }}>
          <input type="checkbox" checked={answers.paymentChange} onChange={() => handleToggle('paymentChange')} /> Did payment logic change?
        </label>
        <label style={{ cursor: 'pointer' }}>
          <input type="checkbox" checked={answers.infraChange} onChange={() => handleToggle('infraChange')} /> Did infrastructure change?
        </label>
        <label style={{ cursor: 'pointer' }}>
          <input type="checkbox" checked={answers.largeChange} onChange={() => handleToggle('largeChange')} /> Is this a large change?
        </label>
        <label style={{ cursor: 'pointer' }}>
          <input type="checkbox" checked={answers.priorFailure} onChange={() => handleToggle('priorFailure')} /> Has this area failed before?
        </label>
      </div>
      <button onClick={submit} className="btn btn-primary" style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}>
        Calculate Risk
      </button>
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="risk-result"
          style={{
            marginTop: '1rem',
            padding: '0.75rem',
            borderRadius: 'var(--radius-sm)',
            background: 'linear-gradient(135deg, #ff7e5f, #feb47b)',
            color: '#fff',
            fontWeight: 600,
            display: 'inline-block',
          }}
        >
          Risk Score: {result.score}/100 – Level: {result.level}
        </motion.div>
      )}
    </div>
  );
}
