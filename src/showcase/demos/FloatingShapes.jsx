import { Float, OrbitControls, ContactShadows, Environment } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";

function Shape({ position, color, children }) {
  return (
    <Float speed={1.5} rotationIntensity={1.2} floatIntensity={1.2}>
      <mesh position={position} castShadow receiveShadow>
        {children}
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.25} />
      </mesh>
    </Float>
  );
}

export default function FloatingShapes() {
  return (
    <Canvas shadows camera={{ position: [0, 1.2, 5.5], fov: 45 }} dpr={[1, 2]}>
      <color attach="background" args={["#f1e6d3"]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 5, 2]} intensity={1.4} castShadow />

      <Shape position={[-1.8, 0.2, 0]} color="#d96a2f">
        <icosahedronGeometry args={[0.8, 0]} />
      </Shape>
      <Shape position={[0, 0.4, 0]} color="#5a4632">
        <torusKnotGeometry args={[0.55, 0.18, 128, 16]} />
      </Shape>
      <Shape position={[1.8, 0.1, 0]} color="#e8c290">
        <dodecahedronGeometry args={[0.75]} />
      </Shape>

      <ContactShadows position={[0, -0.9, 0]} opacity={0.5} blur={2.5} far={3} />
      <Environment preset="apartment" />
      <OrbitControls enablePan={false} minDistance={3} maxDistance={9} />
    </Canvas>
  );
}
