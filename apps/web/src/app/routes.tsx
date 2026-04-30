import { Navigate, createBrowserRouter } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { CalendarPage } from '../pages/CalendarPage';
import { EventDetailPage } from '../pages/EventDetailPage';
import { OnboardingPage } from '../pages/OnboardingPage';
import { SettingsPage } from '../pages/SettingsPage';

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <Navigate to="/calendar" replace /> },
      { path: '/calendar', element: <CalendarPage /> },
      { path: '/events/:id', element: <EventDetailPage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '/onboarding', element: <OnboardingPage /> },
      { path: '*', element: <Navigate to="/calendar" replace /> }
    ]
  }
]);
