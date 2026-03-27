import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware, getAuth0Id } from '../middleware/auth.js';
import { User } from '../models/user.model.js';

const router = Router();

/**
 * GET /api/users/me
 *
 * 🔐 Estándar NOR-PAN: "Auth0 autentica, la BD autoriza"
 *
 * Este endpoint es el punto central de resolución de identidad + rol.
 * El frontend llama aquí después de autenticarse con Auth0 para
 * obtener el perfil completo (incluyendo rol) desde MongoDB.
 *
 * No se usan Auth0 Actions/Rules/Claims para roles.
 */
router.get('/me', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth0Id = getAuth0Id(req);

    let user = await User.findOne({ auth0Id, active: true });

    // Auto-create user on first login (default role: lector)
    if (!user) {
      const auth = (req as any).auth;
      user = await User.create({
        auth0Id,
        email: auth?.email || auth?.[`${process.env.AUTH0_AUDIENCE}/email`] || 'unknown@email.com',
        name: auth?.name || auth?.nickname || 'New User',
        role: 'lector',
        active: true,
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    res.json({
      id: user._id,
      auth0Id: user.auth0Id,
      email: user.email,
      nombre: user.name,
      role: user.role,
      active: user.active,
      lastLogin: user.lastLogin,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
