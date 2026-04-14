import { Pool, PoolClient } from 'pg';
import { pool } from '../../../db/pool';
import { Task, PaginatedResult } from '../../../types/domain';

function toTask(row: Record<string, unknown>): Task {
  return {
    id: row['id'] as string,
    title: row['title'] as string,
    description: row['description'] as string | null,
    projectId: row['project_id'] as string,
    assigneeId: row['assignee_id'] as string | null,
    createdBy: row['created_by'] as string,
    status: row['status'] as Task['status'],
    priority: row['priority'] as Task['priority'],
    dueDate: row['due_date'] as Date | null,
    position: row['position'] as number,
    createdAt: row['created_at'] as Date,
    updatedAt: row['updated_at'] as Date,
  };
}

interface TaskFilter {
  status?: string;
  priority?: string;
  assigneeId?: string;
  page: number;
  limit: number;
}

export class TasksRepository {
  constructor(private readonly db: Pool = pool) {}

  async findById(id: string, client?: PoolClient): Promise<Task | null> {
    const q = client ?? this.db;
    const { rows } = await q.query('SELECT * FROM tasks WHERE id = $1', [id]);
    return rows[0] ? toTask(rows[0]) : null;
  }

  async findByProject(projectId: string, filter: TaskFilter): Promise<PaginatedResult<Task>> {
    const conditions = ['project_id = $1'];
    const params: unknown[] = [projectId];
    let i = 2;

    if (filter.status) { conditions.push(`status = $${i++}`); params.push(filter.status); }
    if (filter.priority) { conditions.push(`priority = $${i++}`); params.push(filter.priority); }
    if (filter.assigneeId) { conditions.push(`assignee_id = $${i++}`); params.push(filter.assigneeId); }

    const where = conditions.join(' AND ');
    const offset = (filter.page - 1) * filter.limit;

    const { rows } = await this.db.query(
      `SELECT *, COUNT(*) OVER() AS total_count
       FROM tasks WHERE ${where}
       ORDER BY position ASC, created_at ASC
       LIMIT $${i++} OFFSET $${i}`,
      [...params, filter.limit, offset],
    );

    const total = rows[0] ? Number(rows[0]['total_count']) : 0;
    return {
      data: rows.map(toTask),
      meta: { page: filter.page, limit: filter.limit, total, totalPages: Math.ceil(total / filter.limit) },
    };
  }

  async create(
    data: {
      title: string;
      description?: string;
      projectId: string;
      assigneeId?: string;
      createdBy: string;
      priority: string;
      dueDate?: Date;
    },
    client?: PoolClient,
  ): Promise<Task> {
    const q = client ?? this.db;
    // Set position to max + 1 within the project/status group
    const { rows: posRows } = await (client ?? this.db).query(
      'SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM tasks WHERE project_id = $1 AND status = $2',
      [data.projectId, 'todo'],
    );
    const position = posRows[0]['next_pos'] as number;

    const { rows } = await q.query(
      `INSERT INTO tasks (title, description, project_id, assignee_id, created_by, priority, due_date, position)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [data.title, data.description ?? null, data.projectId, data.assigneeId ?? null,
       data.createdBy, data.priority, data.dueDate ?? null, position],
    );
    return toTask(rows[0]);
  }

  async update(
    id: string,
    data: {
      title?: string;
      description?: string | null;
      assigneeId?: string | null;
      status?: string;
      priority?: string;
      dueDate?: Date | null;
      position?: number;
    },
    client?: PoolClient,
  ): Promise<Task | null> {
    const q = client ?? this.db;
    const { rows } = await q.query(
      `UPDATE tasks SET
         title       = COALESCE($2, title),
         description = COALESCE($3, description),
         assignee_id = COALESCE($4, assignee_id),
         status      = COALESCE($5, status),
         priority    = COALESCE($6, priority),
         due_date    = COALESCE($7, due_date),
         position    = COALESCE($8, position)
       WHERE id = $1 RETURNING *`,
      [id, data.title ?? null, data.description ?? null, data.assigneeId ?? null,
       data.status ?? null, data.priority ?? null, data.dueDate ?? null, data.position ?? null],
    );
    return rows[0] ? toTask(rows[0]) : null;
  }

  async delete(id: string, client?: PoolClient): Promise<boolean> {
    const q = client ?? this.db;
    const { rowCount } = await q.query('DELETE FROM tasks WHERE id = $1', [id]);
    return (rowCount ?? 0) > 0;
  }
}

export const tasksRepository = new TasksRepository();
