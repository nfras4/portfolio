import { Canvas, useFrame } from "@react-three/fiber";
import { Trail, OrbitControls } from "@react-three/drei";
import { useRef } from "react";

function Orbit({ radius = 2.2, speed = 1.1, color = "#d96a2f", phase = 0 }) {
  const ref = useRef();
  useFrame((state) => {
    const t = state.clock.elapsedTime * speed + phase;
    ref.current.position.x = Math.cos(t) * radius;
    ref.current.position.y = Math.sin(t * 1.5) * 0.6;
    ref.current.position.z = Math.sin(t) * radius;
  });
  return (
    <Trail width={0.5} length={6} color={color} attenuation={(t) => t * t}>
      <mesh ref={ref}>
        <sphereGeometry args={[0.15, 24, 24]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} />
      </mesh>
    </Trail>
  );
}

export default function TrailOrbit() {
  return (
    <Canvas camera={{ position: [0, 1.5, 6], fov: 50 }} dpr={[1, 2]}>
      <color attach="background" args={["#0f0a08"]} />
      <ambientLight intensity={0.2} />
      <Orbit radius={2.2} speed={1.1} color="#d96a2f" phase={0} />
      <Orbit radius={2.6} speed={0.7} color="#e8c290" phase={Math.PI / 2} />
      <Orbit radius={1.8} speed={1.6} color="#ff8a4c" phase={Math.PI} />
      <mesh>
        <sphereGeometry args={[0.45, 32, 32]} />
        <meshStandardMaterial color="#1c1410" emissive="#2a1c12" />
      </mesh>
      <OrbitControls enablePan={false} autoRotate autoRotateSpeed={0.4} />
    </Canvas>
  );
}
