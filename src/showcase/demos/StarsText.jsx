import { Canvas, useFrame } from "@react-three/fiber";
import { Stars, Float, Text, OrbitControls } from "@react-three/drei";
import { useRef } from "react";

function Spinner() {
  const ref = useRef();
  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.rotation.y += dt * 0.08;
  });
  return (
    <group ref={ref}>
      <Float speed={1.5} rotationIntensity={0.4} floatIntensity={0.7}>
        <Text
          fontSize={1}
          color="#f1e6d3"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.01}
          outlineColor="#d96a2f"
        >
          MONKEY BARREL
        </Text>
      </Float>
    </group>
  );
}

export default function StarsText() {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 55 }} dpr={[1, 2]}>
      <color attach="background" args={["#0a0710"]} />
      <ambientLight intensity={0.5} />
      <pointLight position={[3, 3, 3]} intensity={1.2} color="#d96a2f" />
      <Stars radius={50} depth={50} count={3000} factor={3} saturation={0.2} fade speed={0.8} />
      <Spinner />
      <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={0.3} />
    </Canvas>
  );
}
