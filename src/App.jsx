import { lazy, Suspense } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import {
  Nav, Hero, AboutSection, ProjectsSection, SkillsSection,
  ExperienceSection, ContactSection, Footer,
  usePreloadKick, useReveal, useTheme,
} from "./components.jsx";

const Showcase = lazy(() => import("./showcase/Showcase.jsx"));
const Seam = lazy(() => import("./game/Seam.jsx"));
const Privacy = lazy(() => import("./Privacy.jsx"));
const Testimonial = lazy(() => import("./Testimonial.jsx"));

function EmberwoodTag() {
  return (
    <a
      href="https://emberwood.nickwfraser-b09.workers.dev"
      target="_blank"
      rel="noopener"
      className="showcase-tag"
      aria-label="Play Emberwood, opens in a new tab"
    >
      <span className="showcase-tag-kicker">↗ NEW!</span>
      <span className="showcase-tag-label">play emberwood</span>
    </a>
  );
}

function Home({ theme, onToggleTheme }) {
  const navigate = useNavigate();
  usePreloadKick();
  useReveal();
  return (
    <>
      <EmberwoodTag />
      <Nav onShowcase={() => navigate("/showcase")} theme={theme} onToggleTheme={onToggleTheme} />
      <Hero />
      <AboutSection />
      <ProjectsSection />
      <SkillsSection />
      <ExperienceSection />
      <ContactSection />
      <Footer />
    </>
  );
}

export default function App() {
  const [theme, toggleTheme] = useTheme();
  return (
    <Routes>
      <Route path="/" element={<Home theme={theme} onToggleTheme={toggleTheme} />} />
      <Route
        path="/showcase"
        element={
          <Suspense fallback={<div className="showcase-loading">loading scene…</div>}>
            <Showcase />
          </Suspense>
        }
      />
      <Route
        path="/seam"
        element={
          <Suspense fallback={<div className="showcase-loading">loading…</div>}>
            <Seam />
          </Suspense>
        }
      />
      <Route
        path="/privacy"
        element={
          <Suspense fallback={<div className="showcase-loading">loading…</div>}>
            <Privacy />
          </Suspense>
        }
      />
      <Route
        path="/testimonial"
        element={
          <Suspense fallback={<div className="showcase-loading">loading…</div>}>
            <Testimonial />
          </Suspense>
        }
      />
    </Routes>
  );
}
