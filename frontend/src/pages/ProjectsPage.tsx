import { useState } from 'react';
import { useProjects, useDeleteProject } from '../hooks/useProjects';
import { Spinner } from '../components/ui/Spinner';
import { Button } from '../components/ui/Button';
import { ProjectCard } from '../components/features/projects/ProjectCard';
import { CreateProjectModal } from '../components/features/projects/CreateProjectModal';

export function ProjectsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const { data, isLoading } = useProjects();
  const deleteProject = useDeleteProject();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        <Button onClick={() => setShowCreate(true)}>+ New Project</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : data?.data.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-300 py-16 text-center">
          <p className="text-gray-500">No projects yet.</p>
          <Button className="mt-4" onClick={() => setShowCreate(true)}>Create your first project</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data?.data.map((p) => <ProjectCard key={p.id} project={p} />)}
        </div>
      )}

      <CreateProjectModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
