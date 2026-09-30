import Redis from 'ioredis';

const redis = new Redis({
  host: '172.17.52.68',
  port: 6379,
  connectTimeout: 3000,
});

redis.on('connect', () => {
  console.log('Successfully connected to Redis at 172.17.52.68!');
  process.exit(0);
});

redis.on('error', (err) => {
  console.error('Redis Connection Error:', err.message);
  process.exit(1);
});

setTimeout(() => {
  console.error('Redis connection timed out after 3 seconds.');
  process.exit(1);
}, 4000);
