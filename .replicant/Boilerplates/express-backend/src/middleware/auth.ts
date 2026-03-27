import { Request, Response, NextFunction } from 'express';
import { expressjwt, GetVerificationKey } from 'express-jwt';
import jwksRsa from 'jwks-rsa';
import { env } from '../config/env.js';

/**
 * Auth0 JWT validation middleware.
 *
 * 🔐 Estándar NOR-PAN: Auth0 solo AUTENTICA (verifica identidad).
 * La AUTORIZACIÓN (roles) se resuelve desde MongoDB, NO desde claims JWT.
 * Ver: roles.ts y user.routes.ts (GET /users/me)
 */
const jwtCheck = expressjwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${env.auth0Domain}/.well-known/jwks.json`,
  }) as GetVerificationKey,
  audience: env.auth0Audience,
  issuer: `https://${env.auth0Domain}/`,
  algorithms: ['RS256'],
});

/** Wraps jwtCheck — in dev mode with SKIP_AUTH=true, attaches a fake user */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (env.skipAuth) {
    (req as any).auth = {
      sub: 'dev|local-admin',
    };
    return next();
  }
  jwtCheck(req, res, next);
}

/** Extract Auth0 subject (auth0Id) from JWT — NOT roles */
export function getAuth0Id(req: Request): string {
  const auth = (req as any).auth;
  return auth?.sub || 'anonymous';
}
