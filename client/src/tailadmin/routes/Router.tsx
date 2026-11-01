// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { lazy } from 'react';
import { Navigate, createBrowserRouter } from 'react-router';
import Loadable from '../layouts/full/shared/loadable/Loadable';

/* ***Layouts**** */
const FullLayout = Loadable(lazy(() => import('../layouts/full/FullLayout')));
const BlankLayout = Loadable(lazy(() => import('../layouts/blank/BlankLayout')));

// Dashboard, the template's own, left as it is.
const Modern = Loadable(lazy(() => import('../views/dashboards/Modern')));

// Students (operations)
const StudentsPage = Loadable(lazy(() => import('../views/students/StudentsPage')));
const ApplicationsPage = Loadable(lazy(() => import('../views/students/ApplicationsPage')));
const DocumentsPage = Loadable(lazy(() => import('../views/students/DocumentsPage')));
const MessagesPage = Loadable(lazy(() => import('../views/students/MessagesPage')));
const AnnouncementsPage = Loadable(lazy(() => import('../views/students/AnnouncementsPage')));
const BookingsPage = Loadable(lazy(() => import('../views/students/BookingsPage')));

// Website content
const HomePage = Loadable(lazy(() => import('../views/content/HomePage')));
const AboutPage = Loadable(lazy(() => import('../views/content/AboutPage')));
const ServicesPage = Loadable(lazy(() => import('../views/content/ServicesPage')));
const DestinationsPage = Loadable(lazy(() => import('../views/content/DestinationsPage')));
const SuccessPage = Loadable(lazy(() => import('../views/content/SuccessPage')));
const IeltsPage = Loadable(lazy(() => import('../views/content/IeltsPage')));
const ContactPage = Loadable(lazy(() => import('../views/content/ContactPage')));

// Site
const MediaPage = Loadable(lazy(() => import('../views/content/MediaPage')));
const LegalPage = Loadable(lazy(() => import('../views/content/LegalPage')));
const SettingsPage = Loadable(lazy(() => import('../views/content/SettingsPage')));

// Authentication / error (template, kept for the shell)
const Login2 = Loadable(lazy(() => import('../views/authentication/auth2/Login')));
const Register2 = Loadable(lazy(() => import('../views/authentication/auth2/Register')));
const Maintainance = Loadable(lazy(() => import('../views/authentication/Maintainance')));
const Error = Loadable(lazy(() => import('../views/authentication/Error')));

const Router = [
  {
    path: '/',
    element: <FullLayout />,
    children: [
      { path: '/', exact: true, element: <Modern /> },

      // Students
      { path: '/students', element: <StudentsPage /> },
      { path: '/students/applications', element: <ApplicationsPage /> },
      { path: '/students/documents', element: <DocumentsPage /> },
      { path: '/students/messages', element: <MessagesPage /> },
      { path: '/students/announcements', element: <AnnouncementsPage /> },
      { path: '/students/bookings', element: <BookingsPage /> },

      // Website content
      { path: '/pages/home', element: <HomePage /> },
      { path: '/pages/about', element: <AboutPage /> },
      { path: '/pages/services', element: <ServicesPage /> },
      { path: '/pages/destinations', element: <DestinationsPage /> },
      { path: '/pages/success', element: <SuccessPage /> },
      { path: '/pages/ielts', element: <IeltsPage /> },
      { path: '/pages/contact', element: <ContactPage /> },

      // Site
      { path: '/media', element: <MediaPage /> },
      { path: '/legal', element: <LegalPage /> },
      { path: '/settings', element: <SettingsPage /> },

      { path: '*', element: <Navigate to="/auth/404" /> },
    ],
  },
  {
    path: '/',
    element: <BlankLayout />,
    children: [
      { path: '/auth/auth2/login', element: <Login2 /> },
      { path: '/auth/auth2/register', element: <Register2 /> },
      { path: '/auth/maintenance', element: <Maintainance /> },
      { path: '404', element: <Error /> },
      { path: '/auth/404', element: <Error /> },
      { path: '*', element: <Navigate to="/auth/404" /> },
    ],
  },
];

/* Served under /admin on this site, so every route above is relative to that
 * prefix: "/" is /admin, "/pages/home" is /admin/pages/home. */
/* Served under /admin, relative to wherever the site is deployed: "/admin" at a
 * domain root (Vercel), "/studyhub/admin" in a XAMPP sub-folder. */
const router = createBrowserRouter(Router, {
  basename: `${import.meta.env.BASE_URL}admin`,
});

export default router;
