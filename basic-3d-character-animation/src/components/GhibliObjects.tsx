import React, { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import { Mesh, BoxGeometry, SphereGeometry } from "three";
import { GhibliShader } from "../effect/ghibli/shaders/GhibliShader";

// Component for a mesh with Ghibli shader
const GhibliMesh = ({ geometry, position }) => {
  const meshRef = useRef<Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
      meshRef.current.rotation.x += 0.005;
    }
  });

  return (
    <mesh ref={meshRef} position={position} geometry={geometry} castShadow>
      <shaderMaterial
        attach="material"
        args={[GhibliShader]}
        uniforms-lightPosition-value={[15, 15, 15]}
      />
    </mesh>
  );
};

const GhibliObjects: React.FC = () => {
  const boxGeometry = new BoxGeometry(1.5, 1.5, 1.5);
  const sphereGeometry = new SphereGeometry(1, 32, 32);

  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <Canvas camera={{ position: [0, 0, 6], fov: 50 }}>
        <color attach="background" args={["#f0f0f0"]} />
        <ambientLight intensity={0.8} />
        <directionalLight position={[15, 15, 15]} intensity={1.5} castShadow />

        <GhibliMesh geometry={boxGeometry} position={[-2, 0, 0]} />
        <GhibliMesh geometry={sphereGeometry} position={[2, 0, 0]} />

        <Grid infiniteGrid fadeDistance={30} fadeStrength={5} />
        <OrbitControls enablePan={false} minDistance={3} maxDistance={10} />
      </Canvas>
    </div>
  );
};

export default GhibliObjects;
