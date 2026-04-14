import { projectsRepository } from './projects.repository';
import { cacheGetOrSet, cacheDel } from '../../../cache/helpers';
import { CACHE_KEYS, CACHE_TTL } from '../../../constants/cache-keys';
import { AppError } from '../../../utils/AppError';
import { Project, ProjectMember, PaginatedResult } from '../../../types/domain';
import {
  CreateProjectInput,
  UpdateProjectInput,
  AddMemberInput,
  PaginationInput,
} from './projects.schema';

export class ProjectsService {
  async listForUser(userId: string, pagination: PaginationInput): Promise<PaginatedResult<Project>> {
    if (pagination.page === 1 && pagination.limit === 20) {
      return cacheGetOrSet(
        CACHE_KEYS.PROJECT_LIST(userId),
        CACHE_TTL.PROJECT_LIST,
        () => projectsRepository.findByUser(userId, pagination.page, pagination.limit),
      );
    }
    return projectsRepository.findByUser(userId, pagination.page, pagination.limit);
  }

  async getById(projectId: string, requestingUserId: string): Promise<Project> {
    const isMember = await projectsRepository.isMember(projectId, requestingUserId);
    if (!isMember) throw AppError.forbidden('You do not have access to this project');

    return cacheGetOrSet(
      CACHE_KEYS.PROJECT(projectId),
      CACHE_TTL.PROJECT,
      async () => {
        const project = await projectsRepository.findById(projectId);
        if (!project) throw AppError.notFound('Project');
        return project;
      },
    );
  }

  async create(input: CreateProjectInput, ownerId: string): Promise<Project> {
    const project = await projectsRepository.create({
      name: input.name,
      description: input.description,
      ownerId,
    });
    await cacheDel(CACHE_KEYS.PROJECT_LIST(ownerId));
    return project;
  }

  async update(
    projectId: string,
    input: UpdateProjectInput,
    requestingUserId: string,
  ): Promise<Project> {
    await this.assertOwner(projectId, requestingUserId);
    const project = await projectsRepository.update(projectId, input);
    if (!project) throw AppError.notFound('Project');
    await cacheDel(CACHE_KEYS.PROJECT(projectId), CACHE_KEYS.PROJECT_LIST(requestingUserId));
    return project;
  }

  async delete(projectId: string, requestingUserId: string): Promise<void> {
    await this.assertOwner(projectId, requestingUserId);
    const deleted = await projectsRepository.delete(projectId);
    if (!deleted) throw AppError.notFound('Project');
    await cacheDel(CACHE_KEYS.PROJECT(projectId), CACHE_KEYS.PROJECT_LIST(requestingUserId));
  }

  async getMembers(projectId: string, requestingUserId: string): Promise<ProjectMember[]> {
    const isMember = await projectsRepository.isMember(projectId, requestingUserId);
    if (!isMember) throw AppError.forbidden('Access denied');

    return cacheGetOrSet(
      CACHE_KEYS.PROJECT_MEMBERS(projectId),
      CACHE_TTL.PROJECT_MEMBERS,
      () => projectsRepository.getMembers(projectId),
    );
  }

  async addMember(
    projectId: string,
    input: AddMemberInput,
    requestingUserId: string,
  ): Promise<ProjectMember> {
    await this.assertOwner(projectId, requestingUserId);
    const member = await projectsRepository.addMember(projectId, input.userId, input.role);
    await cacheDel(CACHE_KEYS.PROJECT_MEMBERS(projectId));
    return member;
  }

  async removeMember(projectId: string, userId: string, requestingUserId: string): Promise<void> {
    await this.assertOwner(projectId, requestingUserId);
    await projectsRepository.removeMember(projectId, userId);
    await cacheDel(CACHE_KEYS.PROJECT_MEMBERS(projectId));
  }

  private async assertOwner(projectId: string, userId: string): Promise<void> {
    const project = await projectsRepository.findById(projectId);
    if (!project) throw AppError.notFound('Project');
    if (project.ownerId !== userId) {
      throw AppError.forbidden('Only the project owner can perform this action');
    }
  }
}

export const projectsService = new ProjectsService();
