export type ApiEnv = {
  PORT: number;
  HOST: string;
  DATABASE_URL: string | undefined;
  REDIS_URL: string | undefined;
  S3_ENDPOINT: string | undefined;
  S3_REGION: string | undefined;
  S3_BUCKET: string | undefined;
};

export function getEnv(): ApiEnv {
  const PORT = Number(process.env.PORT ?? 3000);
  const HOST = process.env.HOST ?? "0.0.0.0";

  return {
    PORT,
    HOST,
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    S3_REGION: process.env.S3_REGION,
    S3_BUCKET: process.env.S3_BUCKET,
  };
}
