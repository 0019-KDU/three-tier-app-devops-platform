import { createBrowserRouter } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { DashboardPage } from '../pages/DashboardPage';
import { ProjectsPage } from '../pages/ProjectsPage';
import { ProjectDetailPage } from '../pages/ProjectDetailPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { PageLayout } from '../components/layout/PageLayout';

export const router = createBrowserRouter(
  [
    { path: '/login', element: <LoginPage /> },
    { path: '/register', element: <RegisterPage /> },
    {
      element: <ProtectedRoute />,
      children: [
        {
          element: <PageLayout />,
          children: [
            { path: '/', element: <DashboardPage /> },
            { path: '/dashboard', element: <DashboardPage /> },
            { path: '/projects', element: <ProjectsPage /> },
            { path: '/projects/:id', element: <ProjectDetailPage /> },
          ],
        },
      ],
    },
    { path: '*', element: <NotFoundPage /> },
  ],
  {
    // Opt-in to React Router v7 behaviour early to silence deprecation warnings
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_partialHydration: true,
      v7_skipActionErrorRevalidation: true,
    } as Record<string, boolean>,
  },
);
