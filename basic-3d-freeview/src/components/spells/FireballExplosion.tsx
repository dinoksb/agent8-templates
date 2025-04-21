import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface FireballExplosionProps {
  position: THREE.Vector3;
  onComplete?: () => void;
}

export const FireballExplosion: React.FC<FireballExplosionProps> = ({ position, onComplete }) => {
  const [active, setActive] = useState(true);
  const groupRef = useRef<THREE.Group>(null);
  const startTime = useRef(Date.now());
  const duration = 1000; // 폭발 지속 시간 (밀리초)
  const particlesCount = 30;
  const particles = useRef<THREE.Object3D[]>([]);

  // 폭발 파티클 초기화
  useEffect(() => {
    if (!groupRef.current) return;

    particles.current = Array.from({ length: particlesCount }, () => {
      const particle = new THREE.Object3D();

      // 랜덤 방향으로 파티클 배치
      const direction = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize();

      // 초기 위치는 중심점
      particle.position.set(0, 0, 0);

      // 랜덤 크기
      const scale = 0.05 + Math.random() * 0.2;
      particle.scale.set(scale, scale, scale);

      // 파티클 속성
      particle.userData.direction = direction;
      particle.userData.speed = 0.05 + Math.random() * 0.15;
      particle.userData.rotationSpeed = Math.random() * 0.1;
      particle.userData.rotationAxis = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();

      groupRef.current?.add(particle);
      return particle;
    });

    // 폭발 효과 시간 제한
    const timeout = setTimeout(() => {
      setActive(false);
      onComplete?.();
    }, duration);

    return () => {
      clearTimeout(timeout);
      particles.current.forEach((p) => groupRef.current?.remove(p));
    };
  }, [onComplete]);

  // 폭발 애니메이션 업데이트
  useFrame(() => {
    if (!active || !groupRef.current) return;

    const elapsed = (Date.now() - startTime.current) / duration;
    const lifeRatio = 1 - elapsed;

    particles.current.forEach((particle) => {
      // 파티클 이동
      particle.position.add(particle.userData.direction.clone().multiplyScalar(particle.userData.speed));

      // 파티클 회전
      particle.rotateOnAxis(particle.userData.rotationAxis, particle.userData.rotationSpeed);

      // 파티클 크기 감소
      const currentScale = lifeRatio * (0.05 + Math.random() * 0.2);
      particle.scale.set(currentScale, currentScale, currentScale);
    });
  });

  if (!active) return null;

  return (
    <group ref={groupRef} position={[position.x, position.y, position.z]}>
      {/* 폭발 중심 광원 */}
      <pointLight color="#ff6600" intensity={5} distance={4} decay={2} />

      {/* 폭발 파티클 */}
      <instancedMesh args={[null, null, particlesCount]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshStandardMaterial color="#ff8800" emissive="#ff4400" emissiveIntensity={3} transparent opacity={0.8} toneMapped={false} />
      </instancedMesh>

      {/* 폭발 충격파 */}
      <mesh>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial color="#ffaa00" emissive="#ff6600" emissiveIntensity={2} transparent opacity={0.5} toneMapped={false} />
      </mesh>
    </group>
  );
};
