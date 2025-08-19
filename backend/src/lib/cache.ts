import Redis from "ioredis";
import { countCacheHit, countCacheMiss } from "./metrics.js";

const url = process.env.REDIS_URL || "redis://localhost:6379";
export const cacheRedis = new Redis(url);

export async function getJson<T>(
  namespace: string,
  key: string,
): Promise<T | null> {
  const raw = await cacheRedis.get(`${namespace}:${key}`);
  if (raw) {
    countCacheHit();
    return JSON.parse(raw) as T;
  }
  countCacheMiss();
  return null;
}

export async function setJson<T>(
  namespace: string,
  key: string,
  value: T,
  ttlSeconds?: number,
): Promise<void> {
  const raw = JSON.stringify(value);
  if (ttlSeconds) {
    await cacheRedis.set(`${namespace}:${key}`, raw, "EX", ttlSeconds);
  } else {
    await cacheRedis.set(`${namespace}:${key}`, raw);
  }
}
