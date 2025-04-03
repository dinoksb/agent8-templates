import { useRef, useMemo, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import BaseProjectile, {
  BaseProjectileProps,
  BaseProjectileHandle,
} from "./BaseProjectile";
import { FireBallEffect } from "../effect/FireBallEffect";
import { CollisionPayload } from "@react-three/rapier";

interface FireBallProps extends BaseProjectileProps {
  damage?: number;
  explosionRadius?: number;
}

export default function FireBall({
  position,
  direction,
  velocity = 25,
  sensor = true,
  lifespan = 1000,
  size = [0.1, 0.1, 0.1],
  onCollision,
  onRemove, // 🔥 BaseProjectile에서 호출될 제거 콜백
}: FireBallProps) {
  const projectileRef = useRef<BaseProjectileHandle>(null);
  const [hasCollided, setHasCollided] = useState(false);
  const collisionPosition = useRef(new THREE.Vector3(...position));

  // 이펙트 위치 및 스케일 (ref 객체 유지)
  const effectPosition = useMemo(() => new THREE.Vector3(...position), [position]);
  const effectScale = useMemo(() => 0.5, []);

  // 충돌 핸들러
  const handleCollision = (collisionEvent: CollisionPayload) => {
    // 현재 투사체 위치 저장
    const pos = projectileRef.current?.getCurrentPosition();
    if (pos) collisionPosition.current.copy(pos);
    
    setHasCollided(true);
    
    // 원래 콜백 호출
    if (onCollision) onCollision(collisionEvent);
  };

  // 매 프레임 이펙트 위치 업데이트
  useFrame(() => {
    const pos = projectileRef.current?.getCurrentPosition();
    if (pos) effectPosition.copy(pos);
  });

  return (
    <>
      {/* 물리 투사체 */}
      <BaseProjectile
        ref={projectileRef}
        position={position}
        direction={direction}
        velocity={velocity}
        size={size}
        sensor={sensor}
        lifespan={lifespan}
        onCollision={handleCollision}
        visible={false}
        gravityScale={0}
      />

      {/* 시각적 이펙트 */}
      <FireBallEffect
        position={effectPosition}
        scale={effectScale}
        duration={lifespan}
        disableBillboard={false}
      />

      {/* 충돌 위치에 추가 이펙트 */}
      {hasCollided && (
        <FireBallEffect
          position={collisionPosition.current}
          scale={effectScale * 1.5}
          duration={lifespan * 0.5}
          disableBillboard={false}
          onComplete={onRemove}
        />
      )}
    </>
  );
}
