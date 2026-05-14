import { z } from 'zod';

export const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().max(5000).optional(),
  projectId: z.string().uuid('Invalid project ID'),
  assigneeId: z.string().uuid('Invalid assignee ID').optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  dueDate: z.string().datetime().optional().transform((v) => v ? new Date(v) : undefined),
});

export const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  status: z.enum(['todo', 'in_progress', 'in_review', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  dueDate: z.union([z.string().datetime().transform((v) => new Date(v)), z.null()]).optional(),
  position: z.number().int().min(0).optional(),
});

export const TaskFilterSchema = z.object({
  status: z.enum(['todo', 'in_progress', 'in_review', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  assigneeId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
export type TaskFilterInput = z.infer<typeof TaskFilterSchema>;
