import { useAuthStore } from '../store/authStore';
import { useProjects } from '../hooks/useProjects';
import { Spinner } from '../components/ui/Spinner';
import { ProjectCard } from '../components/features/projects/ProjectCard';
import { Link } from 'react-router-dom';

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useProjects();

  const recentProjects = data?.data.slice(0, 4) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.fullName?.split(' ')[0]}
        </h1>
        <p className="text-gray-500 mt-1">Here's what's happening across your projects.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total Projects</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{data?.meta.total ?? '–'}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Active Projects</p>
          <p className="text-3xl font-bold text-primary-600 mt-1">
            {data?.data.filter((p) => p.status === 'active').length ?? '–'}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Completed Projects</p>
          <p className="text-3xl font-bold text-green-600 mt-1">
            {data?.data.filter((p) => p.status === 'completed').length ?? '–'}
          </p>
        </div>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Projects</h2>
          <Link to="/projects" className="text-sm text-primary-600 hover:underline">View all</Link>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentProjects.map((p) => <ProjectCard key={p.id} project={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}
