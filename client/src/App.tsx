import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
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
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, left: 0, behavior: reduce ? "auto" : "instant" });
  }, [location]);

  /* The background belongs to <body>, which carries `:has(.lp)` so the
   * redesigned pages get the white ground and the older ones keep their
   * cream. Painting it here as well put an opaque layer over that. */
  return (
    <div className="min-h-screen flex flex-col">
      <UtilityBar />
      <Header />
      <main id="main" className="flex-1">
        <Router />
      </main>
      <Footer />
      <WhatsAppButton />
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
              <Toaster />
              <Shell />
            </ConsultationProvider>
          </TooltipProvider>
        </CmsProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
