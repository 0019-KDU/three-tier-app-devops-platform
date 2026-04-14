import { Task } from '../../../types/domain';
import { Badge } from '../../ui/Badge';
import { formatDate } from '../../../utils/formatDate';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
}

export function TaskCard({ task, onEdit, onDelete }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm cursor-grab active:cursor-grabbing"
    >
      <p className="text-sm font-medium text-gray-900 mb-2">{task.title}</p>
      <div className="flex items-center gap-2 flex-wrap">
        <Badge type="priority" value={task.priority} />
        {task.dueDate && (
          <span className="text-xs text-gray-400">{formatDate(task.dueDate)}</span>
        )}
      </div>
      {(onEdit || onDelete) && (
        <div className="mt-2 flex gap-1" onPointerDown={(e) => e.stopPropagation()}>
          {onEdit && (
            <button
              onClick={() => onEdit(task)}
              className="text-xs text-gray-400 hover:text-primary-600"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(task.id)}
              className="text-xs text-gray-400 hover:text-red-600"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
