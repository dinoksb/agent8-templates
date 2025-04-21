import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RigidBody, IntersectionEnterPayload } from '@react-three/rapier';
import { FireballExplosion } from './FireballExplosion';

interface FireBallProps {
  /** 발사 시작 위치 (월드 좌표) */
  startPosition: THREE.Vector3;
  /** 발사하는 주체가 바라보는 정규화된 Forward 벡터 */
  direction: THREE.Vector3;
  /** 초당 이동 거리 */
  speed: number;
  /** 파이어볼 지속 시간 (밀리초) */
  duration: number;
  /** 충돌 시 콜백 함수 */
  onHit?: (other: IntersectionEnterPayload, pos?: THREE.Vector3) => boolean;
  /** 파이어볼이 사라질 때 호출되는 콜백 */
  onComplete?: () => void;
}

export const FireBall: React.FC<FireBallProps> = ({ startPosition, direction, speed, duration, onHit, onComplete }) => {
  const rigidRef = useRef(null);
  const startTime = useRef(Date.now());
  const [active, setActive] = useState(true);
  const [showExplosion, setShowExplosion] = useState(false);
  const [explosionPosition, setExplosionPosition] = useState<THREE.Vector3 | null>(null);

  // 파이어볼 생성 시 초기 위치 설정
  useEffect(() => {
    if (rigidRef.current) {
      rigidRef.current.setNextKinematicTranslation(startPosition);
    }

    // 지속 시간이 끝나면 파이어볼 제거
    const timeout = setTimeout(() => {
      if (active) {
        setActive(false);
        // 지속 시간 종료 시에도 폭발 효과 표시
        const currentPos = rigidRef.current?.translation();
        if (currentPos) {
          //   setExplosionPosition(new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z));
          //   setShowExplosion(true);
        } else {
          onComplete?.();
        }
      }
    }, duration);

    return () => clearTimeout(timeout);
  }, [duration, onComplete, active]);

  // 파이어볼 이동 및 애니메이션 업데이트
  useFrame(() => {
    if (!active || !rigidRef.current) return;

    const t = (Date.now() - startTime.current) / 1000; // elapsed sec
    const next = startPosition.clone().add(direction.clone().multiplyScalar(speed * t));
    rigidRef.current.setNextKinematicTranslation(next);
  });

  // 충돌 처리 핸들러
  const handleCollision = (payload: IntersectionEnterPayload) => {
    if (!active) return;

    // 현재 위치 가져오기
    const currentPos = rigidRef.current?.translation();
    const hitPosition = currentPos ? new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z) : null;

    // onHit이 없거나 true를 반환하면 파이어볼을 제거
    if (!onHit || onHit(payload, hitPosition)) {
      setActive(false);

      // 충돌 위치에 폭발 효과 표시
      if (hitPosition) {
        setExplosionPosition(hitPosition);
        setShowExplosion(true);
      } else {
        onComplete?.();
      }
    }
  };

  // 폭발 효과가 끝나면 컴포넌트 완전히 제거
  const handleExplosionComplete = () => {
    setShowExplosion(false);
    onComplete?.();
  };

  return (
    <>
      {active && (
        <RigidBody
          ref={rigidRef}
          type="kinematicPosition"
          position={[startPosition.x, startPosition.y, startPosition.z]}
          gravityScale={0}
          sensor
          //   onIntersectionEnter={handleCollision}
        >
          {/* 파이어볼 시각 효과 */}
          <group>
            {/* 메인 파이어볼 */}
            <mesh>
              <sphereGeometry args={[0.3, 16, 16]} />
              <meshStandardMaterial color="#ff5500" emissive="#ff3300" emissiveIntensity={2} toneMapped={false} />
            </mesh>

            {/* 내부 코어 */}
            <mesh>
              <sphereGeometry args={[0.2, 12, 12]} />
              <meshStandardMaterial color="#ffdd00" emissive="#ffaa00" emissiveIntensity={3} toneMapped={false} />
            </mesh>

            {/* 파티클 효과 */}
            <ParticleTrail />

            {/* 광원 */}
            <pointLight color="#ff5500" intensity={2} distance={5} decay={2} />
          </group>
        </RigidBody>
      )}

      {showExplosion && explosionPosition && <FireballExplosion position={explosionPosition} onComplete={handleExplosionComplete} />}
    </>
  );
};

// 파이어볼 궤적 파티클 효과
const ParticleTrail: React.FC = () => {
  const particlesCount = 20;
  const particles = useRef<THREE.Object3D[]>([]);
  const group = useRef<THREE.Group>(null);

  // 파티클 초기화
  useEffect(() => {
    if (!group.current) return;

    particles.current = Array.from({ length: particlesCount }, (_, i) => {
      const particle = new THREE.Object3D();
      const scale = 0.05 + Math.random() * 0.1;
      particle.scale.set(scale, scale, scale);

      // 랜덤 위치에 배치
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const r = 0.2 + Math.random() * 0.2;

      particle.position.x = r * Math.sin(phi) * Math.cos(theta);
      particle.position.y = r * Math.sin(phi) * Math.sin(theta);
      particle.position.z = r * Math.cos(phi);

      // 속성 부여
      particle.userData.life = Math.random() * 0.5 + 0.5;
      particle.userData.decay = Math.random() * 0.05 + 0.02;
      particle.userData.velocity = new THREE.Vector3((Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.05);

      group.current?.add(particle);
      return particle;
    });

    return () => {
      particles.current.forEach((p) => group.current?.remove(p));
    };
  }, []);

  // 파티클 애니메이션
  useFrame(() => {
    particles.current.forEach((particle) => {
      // 생명력 감소
      particle.userData.life -= particle.userData.decay;

      // 스케일 감소
      const lifeRatio = particle.userData.life;
      particle.scale.setScalar(lifeRatio * 0.15);

      // 위치 업데이트
      particle.position.add(particle.userData.velocity);

      // 생명력이 다하면 재활용
      if (particle.userData.life <= 0) {
        // 위치 리셋
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const r = 0.2 + Math.random() * 0.2;

        particle.position.x = r * Math.sin(phi) * Math.cos(theta);
        particle.position.y = r * Math.sin(phi) * Math.sin(theta);
        particle.position.z = r * Math.cos(phi);

        // 속성 리셋
        particle.userData.life = Math.random() * 0.5 + 0.5;
        particle.userData.decay = Math.random() * 0.05 + 0.02;
        particle.userData.velocity = new THREE.Vector3((Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.05);

        particle.scale.set(particle.userData.life * 0.15, particle.userData.life * 0.15, particle.userData.life * 0.15);
      }
    });
  });

  return (
    <group ref={group}>
      <instancedMesh args={[null, null, particlesCount]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshStandardMaterial color="#ff8800" emissive="#ff6600" emissiveIntensity={2} transparent opacity={0.8} toneMapped={false} />
      </instancedMesh>
    </group>
  );
};
