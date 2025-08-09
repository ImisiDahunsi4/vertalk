import { createClient, type RedisClientType } from "redis";

// Keep singletons across Next.js hot reloads
const g = globalThis as unknown as {
  __redisClient?: RedisClientType;
  __redisSubscriber?: RedisClientType;
};

const REDIS_URL = process.env.REDIS_URL || "redis://default:xDnOjnDM7iWHWonrROQtx8ezG5isAaNx@redis-12540.c325.us-east-1-4.ec2.redns.redis-cloud.com:12540";

export async function getRedis(): Promise<RedisClientType> {
  if (!g.__redisClient) {
    const client = createClient({ url: REDIS_URL });
    client.on("error", (err) => console.error("Redis Client Error", err));
    await client.connect();
    g.__redisClient = client;
  }
  return g.__redisClient as RedisClientType;
}

export async function getRedisSubscriber(): Promise<RedisClientType> {
  if (!g.__redisSubscriber) {
    const client = await getRedis();
    const subscriber = client.duplicate();
    subscriber.on("error", (err) => console.error("Redis Subscriber Error", err));
    await subscriber.connect();
    g.__redisSubscriber = subscriber;
  }
  return g.__redisSubscriber as RedisClientType;
}

export function sanitizeSearchQuery(q: string): string {
  // Basic escaping for RediSearch query special characters
  // Ref: https://redis.io/docs/interact/search-and-query/search/query_syntax/
  return q.replace(/[\\@\-\[\]\{\}\(\)\|\<\>\~\*\:\"\']/g, " ").trim();
}
