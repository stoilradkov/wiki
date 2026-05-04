import type { RedisOptions } from "bullmq";

export function createRedisConnection(redisUrl: string): RedisOptions {
  const url = new URL(redisUrl);
  const port = url.port ? Number(url.port) : 6379;
  const username = url.username ? decodeURIComponent(url.username) : undefined;
  const password = url.password ? decodeURIComponent(url.password) : undefined;

  return {
    host: url.hostname,
    port,
    username,
    password
  };
}
