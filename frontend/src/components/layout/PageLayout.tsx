import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { useUiStore } from '../../store/uiStore';
import { cn } from '../../utils/cn';

export function PageLayout() {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Sidebar />
      <main
        className={cn(
          'pt-16 transition-all duration-200',
          sidebarOpen ? 'pl-60' : 'pl-0',
        )}
      >
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
