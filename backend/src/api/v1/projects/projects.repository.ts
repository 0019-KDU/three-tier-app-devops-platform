import { Pool, PoolClient } from 'pg';
import { pool } from '../../../db/pool';
import { Project, ProjectMember, PaginatedResult } from '../../../types/domain';

function toProject(row: Record<string, unknown>): Project {
  return {
    id: row['id'] as string,
    name: row['name'] as string,
    description: row['description'] as string | null,
    ownerId: row['owner_id'] as string,
    status: row['status'] as Project['status'],
    createdAt: row['created_at'] as Date,
    updatedAt: row['updated_at'] as Date,
  };
}

function toMember(row: Record<string, unknown>): ProjectMember {
  return {
    projectId: row['project_id'] as string,
    userId: row['user_id'] as string,
    role: row['role'] as ProjectMember['role'],
    joinedAt: row['joined_at'] as Date,
  };
}

export class ProjectsRepository {
  constructor(private readonly db: Pool = pool) {}

  async findById(id: string, client?: PoolClient): Promise<Project | null> {
    const q = client ?? this.db;
    const { rows } = await q.query('SELECT * FROM projects WHERE id = $1', [id]);
    return rows[0] ? toProject(rows[0]) : null;
  }

  async findByUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<Project>> {
    const offset = (page - 1) * limit;
    const { rows } = await this.db.query(
      `SELECT p.*, COUNT(*) OVER() AS total_count
       FROM projects p
       LEFT JOIN project_members pm ON p.id = pm.project_id
       WHERE p.owner_id = $1 OR pm.user_id = $1
       GROUP BY p.id
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );

    const total = rows[0] ? Number(rows[0]['total_count']) : 0;
    return {
      data: rows.map(toProject),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async create(
    data: { name: string; description?: string; ownerId: string },
    client?: PoolClient,
  ): Promise<Project> {
    const q = client ?? this.db;
    const { rows } = await q.query(
      `INSERT INTO projects (name, description, owner_id)
       VALUES ($1, $2, $3) RETURNING *`,
      [data.name, data.description ?? null, data.ownerId],
    );
    return toProject(rows[0]);
  }

  async update(
    id: string,
    data: { name?: string; description?: string | null; status?: string },
    client?: PoolClient,
  ): Promise<Project | null> {
    const q = client ?? this.db;
    const { rows } = await q.query(
      `UPDATE projects SET
         name        = COALESCE($2, name),
         description = COALESCE($3, description),
         status      = COALESCE($4, status)
       WHERE id = $1 RETURNING *`,
      [id, data.name ?? null, data.description ?? null, data.status ?? null],
    );
    return rows[0] ? toProject(rows[0]) : null;
  }

  async delete(id: string, client?: PoolClient): Promise<boolean> {
    const q = client ?? this.db;
    const { rowCount } = await q.query('DELETE FROM projects WHERE id = $1', [id]);
    return (rowCount ?? 0) > 0;
  }

  async isMember(projectId: string, userId: string): Promise<boolean> {
    const { rows } = await this.db.query(
      `SELECT 1 FROM projects p
       LEFT JOIN project_members pm ON p.id = pm.project_id
       WHERE p.id = $1 AND (p.owner_id = $2 OR pm.user_id = $2)`,
      [projectId, userId],
    );
    return rows.length > 0;
  }

  async getMembers(projectId: string): Promise<ProjectMember[]> {
    const { rows } = await this.db.query(
      'SELECT * FROM project_members WHERE project_id = $1',
      [projectId],
    );
    return rows.map(toMember);
  }

  async addMember(
    projectId: string,
    userId: string,
    role: string,
    client?: PoolClient,
  ): Promise<ProjectMember> {
    const q = client ?? this.db;
    const { rows } = await q.query(
      `INSERT INTO project_members (project_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (project_id, user_id) DO UPDATE SET role = $3
       RETURNING *`,
      [projectId, userId, role],
    );
    return toMember(rows[0]);
  }

  async removeMember(projectId: string, userId: string): Promise<boolean> {
    const { rowCount } = await this.db.query(
      'DELETE FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, userId],
    );
    return (rowCount ?? 0) > 0;
  }
}

export const projectsRepository = new ProjectsRepository();
