import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { lazy, Suspense, useEffect } from "react";
import { Route, Switch, useLocation, Router as WouterRouter } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CmsProvider } from "./contexts/CmsContext";
import Home from "./pages/Home";
import Header from "./components/Header";
import Footer from "./components/Footer";
import About from "./pages/About";
import Services from "./pages/Services";
import IELTS from "./pages/IELTS";
import SuccessStories from "./pages/SuccessStories";
import Contact from "./pages/Contact";
import Destinations from "./pages/Destinations";
import CountryPage from "./pages/Country";
import WhatsAppButton from "./components/WhatsAppButton";
import UtilityBar from "./components/UtilityBar";
import { ConsultationProvider } from "./components/ConsultationDialog";
import { StudentProvider } from "./contexts/StudentContext";
import StudentLogin from "./pages/StudentLogin";
import StudentPortal from "./pages/StudentPortal";
import StudentDocuments from "./pages/StudentDocuments";
import StudentMessages from "./pages/StudentMessages";
import StudentNotifications from "./pages/StudentNotifications";
import Legal from "./pages/Legal";
import CookieBanner from "./components/CookieBanner";

/* The admin is a separate chunk. A visitor who never opens it never
 * downloads it, and its stylesheet rides along with the same chunk. */
const AdminApp = lazy(() => import("./admin/AdminApp"));

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/about"} component={About} />
      <Route path={"/services"} component={Services} />
      <Route path={"/ielts"} component={IELTS} />
      <Route path={"/success-stories"} component={SuccessStories} />
      <Route path={"/destinations"} component={Destinations} />
      <Route path={"/destinations/:slug"} component={CountryPage} />
      <Route path={"/contact"} component={Contact} />
      {/* The student portal. It brings its own shell, so the marketing
          header, footer and WhatsApp button are switched off below. */}
      <Route path={"/student/login"} component={StudentLogin} />
      <Route path={"/student/documents"} component={StudentDocuments} />
      <Route path={"/student/messages"} component={StudentMessages} />
      <Route path={"/student/notifications"} component={StudentNotifications} />
      <Route path={"/student"} component={StudentPortal} />
      {/* Legal and compliance. One renderer, six documents, all driven
          from the CMS so the client can edit them without a deploy. */}
      <Route path={"/privacy"}>{() => <Legal slug="privacy" />}</Route>
      <Route path={"/terms"}>{() => <Legal slug="terms" />}</Route>
      <Route path={"/refunds"}>{() => <Legal slug="refunds" />}</Route>
      <Route path={"/complaints"}>{() => <Legal slug="complaints" />}</Route>
      <Route path={"/cookies"}>{() => <Legal slug="cookies" />}</Route>
      <Route path={"/data-processing"}>
        {() => <Legal slug="dataProcessing" />}
      </Route>
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function Shell() {
  const [location] = useLocation();

  /* Wouter keeps the scroll position across a route change, so opening a
   * country from halfway down the destinations grid used to land you
   * halfway down the country page. Jump to the top on every navigation,
   * unless the reader has asked for reduced motion, in which case do it
   * without the smooth scroll. */
  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    window.scrollTo({ top: 0, left: 0, behavior: reduce ? "auto" : "instant" });
  }, [location]);

  /* The background belongs to <body>, which carries `:has(.lp)` so the
   * redesigned pages get the white ground and the older ones keep their
   * cream. Painting it here as well put an opaque layer over that. */
  /* The portal is an application, not a page on the site: it carries its
   * own sidebar, its own title and its own footer-less canvas. Dropping
   * the marketing chrome around it is what makes it read as somewhere you
   * work rather than somewhere you browse. */
  const inPortal = location.startsWith("/student");
  const inAdmin = location.startsWith("/admin");

  if (inAdmin) {
    return (
      <Suspense
        fallback={
          <div style={{ padding: 32, fontFamily: "var(--font-sans)" }}>
            Loading the admin…
          </div>
        }
      >
        <AdminApp />
      </Suspense>
    );
  }

  if (inPortal) {
    return (
      <div className="min-h-screen">
        <Router />
        <CookieBanner />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <UtilityBar />
      <Header />
      <main id="main" className="flex-1">
        <Router />
      </main>
      <Footer />
      <WhatsAppButton />
      <CookieBanner />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <CmsProvider>
          <TooltipProvider>
            <ConsultationProvider>
              <StudentProvider>
                <Toaster />
                {/* Base so routing works whether the app is served at the
                    domain root (Vercel) or a sub-folder (XAMPP /studyhub/). */}
                <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                  <Shell />
                </WouterRouter>
              </StudentProvider>
            </ConsultationProvider>
          </TooltipProvider>
        </CmsProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
