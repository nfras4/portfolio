import { lazy, Suspense } from "react";
import { Routes, Route, Link } from "react-router-dom";
import {
  Nav, Hero, AboutSection, ProjectsSection, SkillsSection,
  ExperienceSection, ContactSection, Footer,
} from "./components.jsx";

const Showcase = lazy(() => import("./showcase/Showcase.jsx"));

function ShowcaseTag() {
  return (
    <Link to="/showcase" className="showcase-tag" aria-label="Open 3D showcase">
      <span className="showcase-tag-kicker">↗ NEW</span>
      <span className="showcase-tag-label">3d showcase</span>
    </Link>
  );
}

function Home() {
  return (
    <>
      <ShowcaseTag />
      <Nav />
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
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route
        path="/showcase"
        element={
          <Suspense fallback={<div className="showcase-loading">loading scene…</div>}>
            <Showcase />
          </Suspense>
        }
      />
    </Routes>
  );
}
