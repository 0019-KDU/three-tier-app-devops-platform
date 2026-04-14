import { usersRepository, toPublicUser } from './users.repository';
import { cacheGetOrSet, cacheDel } from '../../../cache/helpers';
import { CACHE_KEYS, CACHE_TTL } from '../../../constants/cache-keys';
import { AppError } from '../../../utils/AppError';
import { PublicUser } from '../../../types/domain';
import { UpdateProfileInput } from './users.schema';

export class UsersService {
  async getProfile(userId: string): Promise<PublicUser> {
    return cacheGetOrSet(
      CACHE_KEYS.USER_PROFILE(userId),
      CACHE_TTL.USER_PROFILE,
      async () => {
        const user = await usersRepository.findById(userId);
        if (!user) throw AppError.notFound('User');
        return toPublicUser(user);
      },
    );
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<PublicUser> {
    const user = await usersRepository.updateProfile(userId, {
      fullName: input.fullName,
      avatarUrl: input.avatarUrl,
    });
    if (!user) throw AppError.notFound('User');
    await cacheDel(CACHE_KEYS.USER_PROFILE(userId));
    return toPublicUser(user);
  }
}

export const usersService = new UsersService();
