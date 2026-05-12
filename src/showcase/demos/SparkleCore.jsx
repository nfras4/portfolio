import { Canvas, useFrame } from "@react-three/fiber";
import { Sparkles, OrbitControls, Environment } from "@react-three/drei";
import { useRef } from "react";

function Core() {
  const ref = useRef();
  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.rotation.y += dt * 0.5;
    ref.current.rotation.x += dt * 0.2;
  });
  return (
    <mesh ref={ref}>
      <icosahedronGeometry args={[1, 1]} />
      <meshStandardMaterial color="#d96a2f" metalness={0.85} roughness={0.18} />
    </mesh>
  );
}

export default function SparkleCore() {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 50 }} dpr={[1, 2]}>
      <color attach="background" args={["#1c1410"]} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[4, 3, 5]} intensity={1.3} />
      <Core />
      <Sparkles count={140} scale={4.5} size={4} speed={0.5} color="#f1e6d3" />
      <Sparkles count={80} scale={3} size={2.2} speed={0.8} color="#ff8a4c" />
      <Environment preset="night" />
      <OrbitControls enablePan={false} autoRotate autoRotateSpeed={0.5} />
    </Canvas>
  );
}
