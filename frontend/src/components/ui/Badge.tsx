import { cn } from '../../utils/cn';
import { TaskStatus, TaskPriority } from '../../types/domain';

const statusColors: Record<TaskStatus, string> = {
  todo: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  in_review: 'bg-yellow-100 text-yellow-700',
  done: 'bg-green-100 text-green-700',
};

const priorityColors: Record<TaskPriority, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

interface BadgeProps {
  type: 'status' | 'priority';
  value: TaskStatus | TaskPriority;
  className?: string;
}

export function Badge({ type, value, className }: BadgeProps) {
  const color = type === 'status'
    ? statusColors[value as TaskStatus]
    : priorityColors[value as TaskPriority];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        color,
        className,
      )}
    >
      {value.replace('_', ' ')}
    </span>
  );
}
