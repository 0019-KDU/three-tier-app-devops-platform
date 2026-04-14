import { Request, Response } from 'express';
import { projectsService } from './projects.service';

export async function listProjects(req: Request, res: Response): Promise<void> {
  const result = await projectsService.listForUser(req.user!.sub, req.query as never);
  res.json({ success: true, ...result });
}

export async function getProject(req: Request, res: Response): Promise<void> {
  const project = await projectsService.getById(req.params['id']!, req.user!.sub);
  res.json({ success: true, data: project });
}

export async function createProject(req: Request, res: Response): Promise<void> {
  const project = await projectsService.create(req.body, req.user!.sub);
  res.status(201).json({ success: true, data: project });
}

export async function updateProject(req: Request, res: Response): Promise<void> {
  const project = await projectsService.update(req.params['id']!, req.body, req.user!.sub);
  res.json({ success: true, data: project });
}

export async function deleteProject(req: Request, res: Response): Promise<void> {
  await projectsService.delete(req.params['id']!, req.user!.sub);
  res.status(204).send();
}

export async function getMembers(req: Request, res: Response): Promise<void> {
  const members = await projectsService.getMembers(req.params['id']!, req.user!.sub);
  res.json({ success: true, data: members });
}

export async function addMember(req: Request, res: Response): Promise<void> {
  const member = await projectsService.addMember(req.params['id']!, req.body, req.user!.sub);
  res.status(201).json({ success: true, data: member });
}

export async function removeMember(req: Request, res: Response): Promise<void> {
  await projectsService.removeMember(req.params['id']!, req.params['userId']!, req.user!.sub);
  res.status(204).send();
}
