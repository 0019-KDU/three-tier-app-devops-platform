import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProject } from '../hooks/useProjects';
import { useTasksByProject } from '../hooks/useTasks';
import { Spinner } from '../components/ui/Spinner';
import { Button } from '../components/ui/Button';
import { TaskKanban } from '../components/features/tasks/TaskKanban';
import { CreateTaskModal } from '../components/features/tasks/CreateTaskModal';

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [showCreateTask, setShowCreateTask] = useState(false);
  const navigate = useNavigate();

  const {
    data: project,
    isLoading: loadingProject,
    isError: projectError,
  } = useProject(id!);

  const {
    data: tasksData,
    isLoading: loadingTasks,
  } = useTasksByProject(id!);

  if (loadingProject) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-gray-400">Loading project…</p>
      </div>
    );
  }

  if (projectError || !project) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 mb-4">
          {projectError ? 'Failed to load project. Check the backend is running.' : 'Project not found.'}
        </p>
        <Button onClick={() => navigate('/projects')}>← Back to projects</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => navigate('/projects')}
            className="text-sm text-gray-400 hover:text-gray-600 mb-1 flex items-center gap-1"
          >
            ← Projects
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          {project.description && (
            <p className="text-gray-500 mt-1 max-w-2xl">{project.description}</p>
          )}
        </div>
        <Button onClick={() => setShowCreateTask(true)}>+ New Task</Button>
      </div>

      {/* Kanban board */}
      {loadingTasks ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-gray-400">Loading tasks…</p>
        </div>
      ) : (
        <TaskKanban
          tasks={tasksData?.data ?? []}
          projectId={id!}
        />
      )}

      <CreateTaskModal
        open={showCreateTask}
        onClose={() => setShowCreateTask(false)}
        projectId={id!}
      />
    </div>
  );
}
