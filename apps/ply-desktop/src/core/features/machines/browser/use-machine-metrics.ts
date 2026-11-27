import type { ResourceUsageSample } from '@ply/core/runtimes/resource-usage/api';
import { useEffect, useState } from 'react';
import { getMachinesClient } from '@core/features/machines/api/browser/client';

const REFRESH_INTERVAL_MS = 5_000;

export function useMachineMetrics(): ResourceUsageSample | null {
  const [metrics, setMetrics] = useState<ResourceUsageSample | null>(null);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const client = await getMachinesClient();
        const sample = await client.getMachineMetrics({});
        if (!cancelled) setMetrics(sample);
      } catch {
        if (!cancelled) setMetrics(null);
      }
    };
    void refresh();
    const interval = window.setInterval(() => void refresh(), REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  return metrics;
}
