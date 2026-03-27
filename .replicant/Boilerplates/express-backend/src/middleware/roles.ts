import { Request, Response, NextFunction } from 'express';
import { getAuth0Id } from './auth.js';
import { createError } from './errorHandler.js';
import { User } from '../models/user.model.js';

export type Role = 'admin' | 'operador' | 'lector';

/**
 * 🔐 Estándar NOR-PAN: "Auth0 autentica, la BD autoriza"
 *
 * Este middleware resuelve el rol del usuario desde MongoDB,
 * NO desde claims del JWT de Auth0.
 *
 * Flujo:
 * 1. authMiddleware verifica JWT y extrae `sub` (auth0Id)
 * 2. resolveUser busca en MongoDB por auth0Id y adjunta user a req
 * 3. requireRole verifica req.resolvedUser.role
 */

/** Middleware: resolve user from MongoDB and attach to req */
export async function resolveUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const auth0Id = getAuth0Id(req);
    if (auth0Id === 'anonymous') {
      return next(createError('Not authenticated', 401));
    }

    const user = await User.findOne({ auth0Id, active: true }).lean();
    if (!user) {
      return next(createError('User not found in database', 403));
    }

    (req as any).resolvedUser = user;
    next();
  } catch (error) {
    next(error);
  }
}

/** Middleware factory: require specific roles (must be used AFTER resolveUser) */
export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = (req as any).resolvedUser;
    if (!user) {
      return next(createError('User not resolved', 500));
    }

    if (!allowedRoles.includes(user.role)) {
      return next(createError('Insufficient permissions', 403));
    }
    next();
  };
}

/** Convenience: require admin role */
export const requireAdmin = requireRole('admin');

/** Convenience: require admin or operador */
export const requireOperator = requireRole('admin', 'operador');
