import { Request, Response } from 'express';
import { tasksService } from './tasks.service';

export async function listTasks(req: Request, res: Response): Promise<void> {
  const result = await tasksService.listByProject(
    req.params['projectId']!,
    req.query as never,
    req.user!.sub,
  );
  res.json({ success: true, ...result });
}

export async function getTask(req: Request, res: Response): Promise<void> {
  const task = await tasksService.getById(req.params['id']!, req.user!.sub);
  res.json({ success: true, data: task });
}

export async function createTask(req: Request, res: Response): Promise<void> {
  const task = await tasksService.create(req.body, req.user!.sub);
  res.status(201).json({ success: true, data: task });
}

export async function updateTask(req: Request, res: Response): Promise<void> {
  const task = await tasksService.update(req.params['id']!, req.body, req.user!.sub);
  res.json({ success: true, data: task });
}

export async function deleteTask(req: Request, res: Response): Promise<void> {
  await tasksService.delete(req.params['id']!, req.user!.sub);
  res.status(204).send();
}
