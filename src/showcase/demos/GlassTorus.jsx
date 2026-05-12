import { Canvas, useFrame } from "@react-three/fiber";
import { MeshTransmissionMaterial, OrbitControls, Environment } from "@react-three/drei";
import { useRef } from "react";

function Knot() {
  const ref = useRef();
  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.rotation.x += dt * 0.25;
    ref.current.rotation.y += dt * 0.35;
  });
  return (
    <mesh ref={ref}>
      <torusKnotGeometry args={[0.9, 0.32, 220, 32]} />
      <MeshTransmissionMaterial
        thickness={0.6}
        roughness={0.05}
        transmission={1}
        ior={1.5}
        chromaticAberration={0.08}
        backside
        samples={6}
        resolution={512}
      />
    </mesh>
  );
}

function Backdrop() {
  return (
    <>
      <mesh position={[-1.4, 0.6, -2]}>
        <sphereGeometry args={[0.9, 32, 32]} />
        <meshStandardMaterial color="#d96a2f" />
      </mesh>
      <mesh position={[1.6, -0.4, -2.4]}>
        <boxGeometry args={[1.2, 1.2, 1.2]} />
        <meshStandardMaterial color="#5a4632" />
      </mesh>
      <mesh position={[1.1, 1.2, -3]}>
        <icosahedronGeometry args={[0.55, 0]} />
        <meshStandardMaterial color="#e8c290" />
      </mesh>
    </>
  );
}

export default function GlassTorus() {
  return (
    <Canvas camera={{ position: [0, 0, 4.5], fov: 45 }} dpr={[1, 2]}>
      <color attach="background" args={["#f1e6d3"]} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} />
      <Backdrop />
      <Knot />
      <Environment preset="city" />
      <OrbitControls enablePan={false} minDistance={3.2} maxDistance={8} />
    </Canvas>
  );
}
