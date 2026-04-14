import { Link } from 'react-router-dom';
import { Project } from '../../../types/domain';
import { formatRelative } from '../../../utils/formatDate';
import { cn } from '../../../utils/cn';

const statusColors = {
  active: 'bg-green-100 text-green-700',
  archived: 'bg-gray-100 text-gray-600',
  completed: 'bg-blue-100 text-blue-700',
};

interface ProjectCardProps { project: Project }

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link
      to={`/projects/${project.id}`}
      className="block rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-primary-300 transition-all"
    >
      <div className="flex items-start justify-between">
        <h3 className="font-semibold text-gray-900 truncate">{project.name}</h3>
        <span
          className={cn(
            'ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize',
            statusColors[project.status],
          )}
        >
          {project.status}
        </span>
      </div>
      {project.description && (
        <p className="mt-1 text-sm text-gray-500 line-clamp-2">{project.description}</p>
      )}
      <p className="mt-3 text-xs text-gray-400">Updated {formatRelative(project.updatedAt)}</p>
    </Link>
  );
}
