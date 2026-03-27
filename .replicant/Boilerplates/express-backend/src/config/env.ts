import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: parseInt(process.env.PORT || '{{PORT_BACKEND}}', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/{{DB_NAME}}',
  auth0Domain: process.env.AUTH0_DOMAIN || '',
  auth0Audience: process.env.AUTH0_AUDIENCE || '',
  skipAuth: process.env.SKIP_AUTH === 'true',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:{{PORT_FRONTEND}}',
} as const;

export type Env = typeof env;
