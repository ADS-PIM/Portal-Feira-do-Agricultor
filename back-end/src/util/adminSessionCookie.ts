const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';

export const refreshCookieOptions = {
    httpOnly: true,
    sameSite: isProduction ? 'none' as const : 'lax' as const,
    secure: isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/admin',
};
