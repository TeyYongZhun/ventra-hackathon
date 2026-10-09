import { buildMetrics, mdmTanSeed } from '@ventra/core';
import type { MetricsResponse } from '@ventra/core';

export function getMockMetrics(): MetricsResponse {
  return buildMetrics(mdmTanSeed);
}
