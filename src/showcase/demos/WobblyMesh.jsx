import { Canvas } from "@react-three/fiber";
import { MeshDistortMaterial, OrbitControls, Environment } from "@react-three/drei";

export default function WobblyMesh() {
  return (
    <Canvas camera={{ position: [0, 0, 4], fov: 45 }} dpr={[1, 2]}>
      <color attach="background" args={["#f1e6d3"]} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 3, 3]} intensity={1.2} />

      <mesh>
        <icosahedronGeometry args={[1.4, 32]} />
        <MeshDistortMaterial
          color="#d96a2f"
          distort={0.45}
          speed={2.2}
          roughness={0.15}
          metalness={0.55}
        />
      </mesh>

      <Environment preset="studio" />
      <OrbitControls enablePan={false} autoRotate autoRotateSpeed={0.6} />
    </Canvas>
  );
}
