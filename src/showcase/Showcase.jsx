import { useState } from "react";
import { Link } from "react-router-dom";
import FloatingShapes from "./demos/FloatingShapes.jsx";
import ParticleField from "./demos/ParticleField.jsx";
import WobblyMesh from "./demos/WobblyMesh.jsx";
import InstancedGrid from "./demos/InstancedGrid.jsx";
import GlassTorus from "./demos/GlassTorus.jsx";
import StarsText from "./demos/StarsText.jsx";
import TrailOrbit from "./demos/TrailOrbit.jsx";
import SparkleCore from "./demos/SparkleCore.jsx";

const DEMOS = [
  {
    id: "shapes",
    name: "Floating shapes",
    blurb: "Three primitives with metallic shaders, contact shadows, and an apartment HDRI. Drag to orbit.",
    Component: FloatingShapes,
  },
  {
    id: "particles",
    name: "Particle field",
    blurb: "2,500 points on a spherical shell, mouse-parallaxed and slowly rotating.",
    Component: ParticleField,
  },
  {
    id: "wobble",
    name: "Distort sphere",
    blurb: "Vertex-displaced icosahedron with drei's MeshDistortMaterial. Auto-rotating.",
    Component: WobblyMesh,
  },
  {
    id: "grid",
    name: "Instanced grid",
    blurb: "256-cube InstancedMesh that ripples toward your cursor. Per-instance color updated every frame.",
    Component: InstancedGrid,
  },
  {
    id: "glass",
    name: "Glass refraction",
    blurb: "Spinning torus knot with MeshTransmissionMaterial. Backside refraction, chromatic aberration, and a multi-sample resolution pass.",
    Component: GlassTorus,
  },
  {
    id: "stars",
    name: "Stars + 3D text",
    blurb: "3,000-star Stars field with floating Troika-rendered Text. Slow auto-orbit.",
    Component: StarsText,
  },
  {
    id: "trails",
    name: "Trailing orbits",
    blurb: "Three emissive orbs on offset orbits, each leaving a tapered Trail. Attenuation curve t*t for a fast falloff.",
    Component: TrailOrbit,
  },
  {
    id: "sparkles",
    name: "Sparkle core",
    blurb: "Metallic icosahedron wrapped in two layers of drei Sparkles. Night HDRI for the rim light.",
    Component: SparkleCore,
  },
];

export default function Showcase() {
  const [active, setActive] = useState(DEMOS[0].id);
  const demo = DEMOS.find((d) => d.id === active) ?? DEMOS[0];
  const Scene = demo.Component;

  return (
    <div className="showcase">
      <header className="showcase-head">
        <div className="shell showcase-head-inner">
          <Link to="/" className="showcase-back">← back to nick/</Link>
          <div className="showcase-title">
            <span className="showcase-title-key">showcase /</span> r3f demos
          </div>
        </div>
      </header>

      <nav className="showcase-tabs" aria-label="Demo selector">
        <div className="shell showcase-tabs-inner">
          {DEMOS.map((d) => (
            <button
              key={d.id}
              type="button"
              className={"showcase-tab" + (d.id === active ? " is-active" : "")}
              onClick={() => setActive(d.id)}
            >
              {d.name}
            </button>
          ))}
        </div>
      </nav>

      <div className="showcase-stage">
        <Scene key={demo.id} />
      </div>

      <footer className="showcase-info">
        <div className="shell showcase-info-inner">
          <div className="showcase-info-label mono">// {demo.name}</div>
          <p className="showcase-info-blurb">{demo.blurb}</p>
          <div className="showcase-info-tools mono">
            three · @react-three/fiber · @react-three/drei
          </div>
        </div>
      </footer>
    </div>
  );
}
