import { Pool, PoolClient } from 'pg';
import { User, PublicUser } from '../../../types/domain';
import { pool } from '../../../db/pool';

function toUser(row: Record<string, unknown>): User {
  return {
    id: row['id'] as string,
    email: row['email'] as string,
    passwordHash: row['password_hash'] as string,
    fullName: row['full_name'] as string,
    avatarUrl: row['avatar_url'] as string | null,
    role: row['role'] as User['role'],
    isActive: row['is_active'] as boolean,
    createdAt: row['created_at'] as Date,
    updatedAt: row['updated_at'] as Date,
  };
}

export function toPublicUser(user: User): PublicUser {
  const { passwordHash: _ph, ...pub } = user;
  return pub;
}

export class UsersRepository {
  constructor(private readonly db: Pool = pool) {}

  async findById(id: string, client?: PoolClient): Promise<User | null> {
    const q = client ?? this.db;
    const { rows } = await q.query('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0] ? toUser(rows[0]) : null;
  }

  async findByEmail(email: string, client?: PoolClient): Promise<User | null> {
    const q = client ?? this.db;
    const { rows } = await q.query('SELECT * FROM users WHERE email = $1', [email]);
    return rows[0] ? toUser(rows[0]) : null;
  }

  async create(
    data: { email: string; passwordHash: string; fullName: string },
    client?: PoolClient,
  ): Promise<User> {
    const q = client ?? this.db;
    const { rows } = await q.query(
      `INSERT INTO users (email, password_hash, full_name)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.email, data.passwordHash, data.fullName],
    );
    return toUser(rows[0]);
  }

  async updateProfile(
    id: string,
    data: { fullName?: string; avatarUrl?: string },
    client?: PoolClient,
  ): Promise<User | null> {
    const q = client ?? this.db;
    const { rows } = await q.query(
      `UPDATE users SET
         full_name  = COALESCE($2, full_name),
         avatar_url = COALESCE($3, avatar_url)
       WHERE id = $1
       RETURNING *`,
      [id, data.fullName ?? null, data.avatarUrl ?? null],
    );
    return rows[0] ? toUser(rows[0]) : null;
  }
}

export const usersRepository = new UsersRepository();
