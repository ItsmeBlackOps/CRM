import { logger } from "./logger.js";

interface Counters {
  requests: Record<string, number>;
  errors: Record<string, number>;
  rateLimits: Record<string, number>;
  cacheHits: number;
  cacheMisses: number;
}

const counters: Counters = {
  requests: {},
  errors: {},
  rateLimits: {},
  cacheHits: 0,
  cacheMisses: 0,
};

export function countRequest(event: string) {
  counters.requests[event] = (counters.requests[event] || 0) + 1;
}
export function countError(event: string) {
  counters.errors[event] = (counters.errors[event] || 0) + 1;
}
export function countRateLimit(event: string) {
  counters.rateLimits[event] = (counters.rateLimits[event] || 0) + 1;
}
export function countCacheHit() {
  counters.cacheHits += 1;
}
export function countCacheMiss() {
  counters.cacheMisses += 1;
}
export function getSummary() {
  return counters;
}
export function logSummary() {
  logger.info({ metrics: counters }, "metrics summary");
}
