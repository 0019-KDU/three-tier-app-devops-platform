import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { pool } from '../../../db/pool';
import { usersRepository, toPublicUser } from '../users/users.repository';
import { hashPassword, comparePassword } from '../../../utils/password';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../../utils/jwt';
import { AppError } from '../../../utils/AppError';
import { PublicUser } from '../../../types/domain';
import { config } from '../../../config';
import { RegisterInput, LoginInput } from './auth.schema';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface AuthResult {
  user: PublicUser;
  tokens: TokenPair;
}

async function saveRefreshToken(userId: string, rawToken: string): Promise<void> {
  const tokenHash = await bcrypt.hash(rawToken, 10);
  const expiresAt = new Date(Date.now() + config.jwt.refreshExpiresInMs);
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt],
  );
}

async function revokeRefreshToken(tokenHash: string): Promise<void> {
  await pool.query(
    'UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1',
    [tokenHash],
  );
}

async function findValidRefreshToken(
  userId: string,
  rawToken: string,
): Promise<{ id: string; tokenHash: string } | null> {
  const { rows } = await pool.query<{ id: string; token_hash: string }>(
    `SELECT id, token_hash FROM refresh_tokens
     WHERE user_id = $1 AND revoked = false AND expires_at > NOW()`,
    [userId],
  );

  for (const row of rows) {
    const match = await bcrypt.compare(rawToken, row['token_hash']);
    if (match) return { id: row['id'], tokenHash: row['token_hash'] };
  }
  return null;
}

export class AuthService {
  async register(input: RegisterInput): Promise<AuthResult> {
    const existing = await usersRepository.findByEmail(input.email);
    if (existing) {
      throw AppError.conflict('Email already in use', 'EMAIL_TAKEN');
    }

    const passwordHash = await hashPassword(input.password);
    const user = await usersRepository.create({
      email: input.email,
      passwordHash,
      fullName: input.fullName,
    });

    const jti = uuidv4();
    const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });
    const refreshToken = signRefreshToken({ sub: user.id, jti });

    await saveRefreshToken(user.id, refreshToken);

    return { user: toPublicUser(user), tokens: { accessToken, refreshToken } };
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await usersRepository.findByEmail(input.email);
    if (!user || !user.isActive) {
      throw AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const valid = await comparePassword(input.password, user.passwordHash);
    if (!valid) {
      throw AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const jti = uuidv4();
    const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });
    const refreshToken = signRefreshToken({ sub: user.id, jti });

    await saveRefreshToken(user.id, refreshToken);

    return { user: toPublicUser(user), tokens: { accessToken, refreshToken } };
  }

  async refresh(rawRefreshToken: string): Promise<TokenPair> {
    const payload = verifyRefreshToken(rawRefreshToken);
    const userId = payload.sub;

    const stored = await findValidRefreshToken(userId, rawRefreshToken);
    if (!stored) {
      throw AppError.unauthorized('Refresh token is invalid or expired', 'INVALID_REFRESH_TOKEN');
    }

    const user = await usersRepository.findById(userId);
    if (!user || !user.isActive) {
      throw AppError.unauthorized('User not found or inactive');
    }

    // Rotate: revoke old, issue new
    await revokeRefreshToken(stored.tokenHash);

    const jti = uuidv4();
    const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role });
    const newRefreshToken = signRefreshToken({ sub: user.id, jti });

    await saveRefreshToken(user.id, newRefreshToken);

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(rawRefreshToken: string): Promise<void> {
    try {
      const payload = verifyRefreshToken(rawRefreshToken);
      const stored = await findValidRefreshToken(payload.sub, rawRefreshToken);
      if (stored) await revokeRefreshToken(stored.tokenHash);
    } catch {
      // Silently ignore — logout should always succeed from client perspective
    }
  }
}

export const authService = new AuthService();
