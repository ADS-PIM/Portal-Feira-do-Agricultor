import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AdminRole } from './src/model/admin';
import { anonymousRateLimit } from './src/rateLimit/middleware';
import { AdminDAO } from './src/dao/admin.dao';


export interface AuthRequest extends Request {
    admin?: jwt.JwtPayload & {
        adminId?: string;
        role?: AdminRole;
    };
}

export async function authToken(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    const rejectAuthentication = (error: string) => {
        void anonymousRateLimit(req, res, () => { res.status(401).json({ error }); });
    };
    try {
        const authHeader = req.headers['authorization'];

        // Validar se o header de autorização existe
        if (!authHeader) {
            rejectAuthentication('Authorization header is missing');
            return;
        }

        // Extrair o token (formato: "Bearer <token>")
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            rejectAuthentication('Invalid authorization format. Use: Bearer <token>');
            return;
        }

        const token = parts[1];

        if (!token) {
            rejectAuthentication('Token is missing');
            return;
        }

        const accessSecret = process.env.JWT_ACCESS_SECRET;

        if (!accessSecret) {
            res.status(500).json({ error: 'JWT access secret is not configured' });
            return;
        }

        // Verificar o token JWT
        let admin: string | jwt.JwtPayload;
        try {
            admin = jwt.verify(token, accessSecret);
        } catch (err) {
            if (err instanceof jwt.TokenExpiredError) {
                rejectAuthentication('Token has expired');
                return;
            }
            if (err instanceof jwt.JsonWebTokenError) {
                rejectAuthentication('Invalid token');
                return;
            }
            rejectAuthentication('Token verification failed');
            return;
        }

        if (!admin || typeof admin === 'string' || typeof admin.adminId !== 'string' || !admin.adminId) {
            rejectAuthentication('Invalid token payload');
            return;
        }

        // A deleted/disabled account or an old role must not remain authorized
        // until its already-issued access token expires.
        const currentAdmin = await new AdminDAO().searchById(admin.adminId);
        if (!currentAdmin) {
            rejectAuthentication('Administrator account no longer exists');
            return;
        }
        if (!currentAdmin.active) {
            res.status(403).json({ code: 'ADMIN_DISABLED', error: 'Administrator account is disabled' });
            return;
        }
        req.admin = { ...admin, role: currentAdmin.role };
        next();
    } catch (error) {
        res.status(500).json({ error: 'Internal server error during authentication' });
    }
}

export default authToken;

export function isSuperAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
    if (!req.admin) {
        res.status(401).json({ error: 'Authentication is required' });
        return;
    }

    if (req.admin.role !== AdminRole.SUPER_ADMIN) {
        res.status(403).json({ error: 'SUPER_ADMIN role is required' });
        return;
    }

    next();
}
