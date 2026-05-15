'use client';
import useSWR from 'swr';
import { getPipelineStats, getAIReviewStats, getPipelines, PipelineStats, AIReviewStats, PipelineRun } from '@/lib/api';

const ORG_ID = 'default-org'; // TODO: get from session once multi-tenancy is added

// ─── Pipeline Stats ───────────────────────────────────────────────────────────

export function usePipelineStats() {
  const { data, error, isLoading, mutate } = useSWR<PipelineStats>(
    'pipeline-stats',
    () => getPipelineStats(ORG_ID),
    { refreshInterval: 15_000 },
  );
  return { stats: data, error, isLoading, refresh: mutate };
}

// ─── AI Review Stats ──────────────────────────────────────────────────────────

export function useAIReviewStats() {
  const { data, error, isLoading } = useSWR<AIReviewStats>(
    'ai-review-stats',
    () => getAIReviewStats(),
    { refreshInterval: 30_000 },
  );
  return { stats: data, error, isLoading };
}

// ─── Recent Pipelines ─────────────────────────────────────────────────────────

export function useRecentPipelines() {
  const { data, error, isLoading, mutate } = useSWR<PipelineRun[]>(
    'recent-pipelines',
    () => getPipelines(ORG_ID),
    { refreshInterval: 10_000 },
  );
  return { pipelines: data ?? [], error, isLoading, refresh: mutate };
}

// ─── Chart data derived from pipeline runs ────────────────────────────────────

export function usePipelineChartData() {
  const { pipelines } = useRecentPipelines();

  // Group into 7 hourly buckets
  const now = Date.now();
  const buckets = Array.from({ length: 7 }, (_, i) => {
    const hoursAgo = 6 - i;
    const label = hoursAgo === 0 ? 'Now' : `${hoursAgo}h ago`;
    const bucketStart = now - (hoursAgo + 1) * 3_600_000;
    const bucketEnd = now - hoursAgo * 3_600_000;

    const inBucket = pipelines.filter((p) => {
      const t = new Date(p.createdAt).getTime();
      return t >= bucketStart && t < bucketEnd;
    });

    return {
      time: label,
      success: inBucket.filter((p) => p.status === 'success').length,
      failed: inBucket.filter((p) => p.status === 'failed').length,
    };
  });

  return buckets;
}
