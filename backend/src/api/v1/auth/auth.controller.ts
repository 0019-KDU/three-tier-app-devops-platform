import { Request, Response } from 'express';
import { authService } from './auth.service';
import { AppError } from '../../../utils/AppError';
import { config } from '../../../config';

const REFRESH_COOKIE = 'refreshToken';

const cookieOptions = {
  httpOnly: true,
  secure: config.isProd,
  sameSite: 'strict' as const,
  maxAge: config.jwt.refreshExpiresInMs,
  path: '/api/v1/auth',
};

export async function register(req: Request, res: Response): Promise<void> {
  const result = await authService.register(req.body);
  res.cookie(REFRESH_COOKIE, result.tokens.refreshToken, cookieOptions);
  res.status(201).json({
    success: true,
    data: {
      user: result.user,
      accessToken: result.tokens.accessToken,
    },
  });
}

export async function login(req: Request, res: Response): Promise<void> {
  const result = await authService.login(req.body);
  res.cookie(REFRESH_COOKIE, result.tokens.refreshToken, cookieOptions);
  res.status(200).json({
    success: true,
    data: {
      user: result.user,
      accessToken: result.tokens.accessToken,
    },
  });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const rawToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (!rawToken) {
    throw AppError.unauthorized('No refresh token provided');
  }

  const tokens = await authService.refresh(rawToken);
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, cookieOptions);
  res.status(200).json({
    success: true,
    data: { accessToken: tokens.accessToken },
  });
}

export async function logout(req: Request, res: Response): Promise<void> {
  const rawToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (rawToken) await authService.logout(rawToken);
  res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
  res.status(204).send();
}

export function me(req: Request, res: Response): void {
  res.status(200).json({ success: true, data: { user: req.user } });
}
