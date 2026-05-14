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

// Pencil icon
function IconEdit() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M16.862 3.487a2.25 2.25 0 113.182 3.182L7.5 19.213l-4.5 1 1-4.5 12.862-12.226z" />
    </svg>
  );
}

// Trash icon
function IconTrash() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// Calendar icon
function IconCalendar() {
  return (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

export function TaskCard({ task, onEdit, onDelete }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="rounded-lg border border-gray-200 bg-white p-3.5 shadow-sm
                 cursor-grab active:cursor-grabbing hover:border-gray-300 hover:shadow-md
                 transition-all duration-150"
    >
      {/* Title */}
      <p className="text-sm font-semibold text-gray-900 leading-snug mb-1">
        {task.title}
      </p>

      {/* Description */}
      {task.description && (
        <p className="text-xs text-gray-500 leading-relaxed mb-2 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Priority badge + due date */}
      <div className="flex items-center gap-2 flex-wrap mt-2">
        <Badge type="priority" value={task.priority} />
        {task.dueDate && (
          <span className="inline-flex items-center gap-1 text-xs text-gray-400">
            <IconCalendar />
            {formatDate(task.dueDate)}
          </span>
        )}
      </div>

      {/* Edit / Delete — shown on hover */}
      {(onEdit || onDelete) && (
        <div
          className="mt-3 pt-2.5 border-t border-gray-100 flex items-center gap-1.5"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {onEdit && (
            <button
              onClick={() => onEdit(task)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs
                         font-medium text-blue-600 bg-blue-50 hover:bg-blue-100
                         transition-colors"
            >
              <IconEdit />
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(task.id)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs
                         font-medium text-red-600 bg-red-50 hover:bg-red-100
                         transition-colors"
            >
              <IconTrash />
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
