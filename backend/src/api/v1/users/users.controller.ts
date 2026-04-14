import { Request, Response } from 'express';
import { usersService } from './users.service';

export async function getMyProfile(req: Request, res: Response): Promise<void> {
  const profile = await usersService.getProfile(req.user!.sub);
  res.json({ success: true, data: profile });
}

export async function updateMyProfile(req: Request, res: Response): Promise<void> {
  const profile = await usersService.updateProfile(req.user!.sub, req.body);
  res.json({ success: true, data: profile });
}
