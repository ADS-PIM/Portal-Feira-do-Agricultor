import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AdminRole } from './src/model/admin';


export interface AuthRequest extends Request {
    admin?: jwt.JwtPayload & {
        adminId?: string;
        role?: AdminRole;
    };
}

export function authToken(req: AuthRequest, res: Response, next: NextFunction): void {
    try {
        const authHeader = req.headers['authorization'];

        // Validar se o header de autorização existe
        if (!authHeader) {
            res.status(401).json({ error: 'Authorization header is missing' });
            return;
        }

        // Extrair o token (formato: "Bearer <token>")
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            res.status(401).json({ error: 'Invalid authorization format. Use: Bearer <token>' });
            return;
        }

        const token = parts[1];

        if (!token) {
            res.status(401).json({ error: 'Token is missing' });
            return;
        }

        const accessSecret = process.env.JWT_ACCESS_SECRET;

        if (!accessSecret) {
            res.status(500).json({ error: 'JWT access secret is not configured' });
            return;
        }

        // Verificar o token JWT
        jwt.verify(token, accessSecret, (err: jwt.VerifyErrors | null, admin: string | jwt.JwtPayload | undefined) => {
            if (err) {
                if (err instanceof jwt.TokenExpiredError) {
                    res.status(401).json({ error: 'Token has expired' });
                    return;
                }
                if (err instanceof jwt.JsonWebTokenError) {
                    res.status(401).json({ error: 'Invalid token' });
                    return;
                }
                res.status(401).json({ error: 'Token verification failed' });
                return;
            }

            if (!admin || typeof admin === 'string') {
                res.status(401).json({ error: 'Invalid token payload' });
                return;
            }

            req.admin = admin;
            next();
        });
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
