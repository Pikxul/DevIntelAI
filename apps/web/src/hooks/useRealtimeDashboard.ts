'use client';
import { useEffect, useState } from 'react';
import { getSocket } from '@/lib/socket';
import { PipelineStats, AIReviewStats } from '@/lib/api';

export function useRealtimeDashboard(
  initialPipelineStats: PipelineStats | undefined,
  initialAiStats: AIReviewStats | undefined
) {
  const [pipelineStats, setPipelineStats] = useState<PipelineStats | undefined>(initialPipelineStats);
  const [aiStats, setAiStats] = useState<AIReviewStats | undefined>(initialAiStats);

  // Sync initial state if it changes from SWR
  useEffect(() => {
    if (initialPipelineStats) setPipelineStats(initialPipelineStats);
  }, [initialPipelineStats]);

  useEffect(() => {
    if (initialAiStats) setAiStats(initialAiStats);
  }, [initialAiStats]);

  useEffect(() => {
    let active = true;

    const setupSocket = async () => {
      const socket = await getSocket();
      if (!active) return;

      socket.on('dashboard:stats', (data: { pipelineStats: PipelineStats; aiStats: AIReviewStats }) => {
        setPipelineStats(data.pipelineStats);
        setAiStats(data.aiStats);
      });

      socket.on('pipeline:update', () => {
        // We could trigger an SWR revalidation here, but for now
        // the 10s polling interval on useRecentPipelines will catch it,
        // or we can expect the gateway to push dashboard:stats.
      });
    };

    setupSocket();

    return () => {
      active = false;
      getSocket().then(socket => {
        socket.off('dashboard:stats');
        socket.off('pipeline:update');
      });
    };
  }, []);

  return {
    pipelineStats,
    aiStats,
  };
}
