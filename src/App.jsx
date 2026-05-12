import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import {
  Nav, Hero, AboutSection, ProjectsSection, SkillsSection,
  ExperienceSection, ContactSection, Footer,
} from "./components.jsx";

const Showcase = lazy(() => import("./showcase/Showcase.jsx"));

function Home() {
  return (
    <>
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
