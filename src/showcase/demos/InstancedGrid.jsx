import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const SIZE = 16;
const SPACING = 0.45;

function Grid() {
  const ref = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const mx = state.mouse.x * (SIZE * SPACING) * 0.5;
    const my = state.mouse.y * (SIZE * SPACING) * 0.5;

    let i = 0;
    for (let x = 0; x < SIZE; x++) {
      for (let z = 0; z < SIZE; z++) {
        const px = (x - SIZE / 2) * SPACING;
        const pz = (z - SIZE / 2) * SPACING;
        const dist = Math.hypot(px - mx, pz - my);
        const lift = Math.sin(t * 1.4 - dist * 1.6) * 0.35 + Math.max(0, 0.9 - dist) * 0.6;

        dummy.position.set(px, lift, pz);
        dummy.scale.setScalar(0.32);
        dummy.updateMatrix();
        ref.current.setMatrixAt(i, dummy.matrix);

        const hue = 0.06 + lift * 0.08;
        color.setHSL(hue, 0.7, 0.5 + lift * 0.15);
        ref.current.setColorAt(i, color);
        i++;
      }
    }
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[null, null, SIZE * SIZE]} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.4} metalness={0.2} />
    </instancedMesh>
  );
}

export default function InstancedGrid() {
  return (
    <Canvas shadows camera={{ position: [4, 4, 6], fov: 45 }} dpr={[1, 2]}>
      <color attach="background" args={["#f1e6d3"]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 6, 3]} intensity={1.3} castShadow />
      <Grid />
      <OrbitControls enablePan={false} minDistance={5} maxDistance={14} maxPolarAngle={Math.PI / 2.2} />
    </Canvas>
  );
}
