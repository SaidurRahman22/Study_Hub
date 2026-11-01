import { RouterProvider } from 'react-router';
import router from './routes/Router';
import './css/globals.css';
import { ThemeProvider } from './components/provider/theme-provider';
import { ContentProvider } from './content/store';
import { StudentsProvider } from './content/students-store';
import { PageSearchProvider } from './content/search';
import { RequireStaff } from './content/AdminAuth';

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      {/* Website content edited on the CMS pages. */}
      <ContentProvider>
        {/* Students, their files and the enquiry list, from the API. */}
        <StudentsProvider>
          {/* Nothing below renders until a staff account is signed in. */}
          <RequireStaff>
            {/* The top-bar search drives whichever list page is open. */}
            <PageSearchProvider>
              <RouterProvider router={router} />
            </PageSearchProvider>
          </RequireStaff>
        </StudentsProvider>
      </ContentProvider>
    </ThemeProvider>
  );
}

export default App;
