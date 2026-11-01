import { RouterProvider } from 'react-router';
import router from './routes/Router';
import './css/globals.css';
import { ThemeProvider } from './components/provider/theme-provider';
import { ContentProvider } from './content/store';
import { StudentsProvider } from './content/students-store';
import { PageSearchProvider } from './content/search';

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      {/* Website content edited on the CMS pages. */}
      <ContentProvider>
        {/* Student files, documents, bookings, etc. (in-memory, frontend phase). */}
        <StudentsProvider>
          {/* The top-bar search drives whichever list page is open. */}
          <PageSearchProvider>
            <RouterProvider router={router} />
          </PageSearchProvider>
        </StudentsProvider>
      </ContentProvider>
    </ThemeProvider>
  );
}

export default App;
