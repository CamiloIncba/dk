import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env, connectDatabase } from './config/index.js';
import { errorHandler, notFoundHandler } from './middleware/index.js';
import routes from './routes/index.js';

const app = express();

// ─── Security ──────────────────────────────────────────────
app.use(helmet());

// ─── CORS ──────────────────────────────────────────────────
app.use(
  cors({
    origin: env.corsOrigin,
    credentials: true,
  }),
);

// ─── Parsing ───────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Logging ───────────────────────────────────────────────
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

// ─── Routes ────────────────────────────────────────────────
app.use('/api', routes);

// ─── Error handling ────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── Start server ──────────────────────────────────────────
async function start() {
  await connectDatabase();

  app.listen(env.port, () => {
    console.log(`\n🚀 {{PROYECTO}} Backend running on http://localhost:${env.port}`);
    console.log(`   Environment: ${env.nodeEnv}`);
    console.log(`   Auth: ${env.skipAuth ? 'SKIPPED (dev)' : 'Auth0 JWT'}`);
    console.log(`   CORS origin: ${env.corsOrigin}\n`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export default app;
