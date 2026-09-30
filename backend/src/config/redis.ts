import { ConnectionOptions } from 'bullmq';
import Redis from 'ioredis';

const redisConfig: ConnectionOptions = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Critical requirement for BullMQ
};

export const getRedisConnection = () => {
  return new Redis({
    host: redisConfig.host,
    port: redisConfig.port,
    password: redisConfig.password,
    maxRetriesPerRequest: null,
  });
};

export default redisConfig;
