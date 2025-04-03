import { useState, useRef, useMemo, useCallback } from "react";
import { CollisionPayload, CollisionTarget } from "@react-three/rapier";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import BaseProjectile, {
  BaseProjectileProps,
  BaseProjectileHandle,
} from "./BaseProjectile";
import { FireBallEffect } from "../effect/FireBallEffect";

// FireBall 전용 추가 속성
interface FireBallProps extends BaseProjectileProps {
  damage?: number;
  explosionRadius?: number;
  onRemove?: () => void; // 제거될 때 호출될 콜백
}

export default function FireBall({
  position,
  direction,
  velocity = 25,
  sensor = true,
  lifespan = 1000,
  size = [0.1, 0.1, 0.1],
  onCollision,
}: FireBallProps) {
  // 상태 관리
  const [exploded, setExploded] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // 참조
  const projectileRef = useRef<BaseProjectileHandle>(null);

  // 시각적 효과 위치 및 크기 메모
  const effectPosition = useMemo(() => new THREE.Vector3(...position), []);
  const effectScale = useMemo(() => new THREE.Vector3(0.5, 0.5, 0.5), []);

  /**
   * 파이어볼 폭발 효과 설정 함수
   */
  const triggerExplosion = useCallback(() => {
    setExploded(true);
    setIsActive(false); // 물리적 투사체 비활성화
  }, []);

  /**
   * 충돌한 객체의 이름 가져오기
   */
  const getHitObjectName = useCallback((hitObject: CollisionTarget) => {
    if (!hitObject.rigidBodyObject) return "Unknown Object";

    // userData에서 이름 찾기
    const userData = hitObject.rigidBodyObject.userData;
    if (userData && userData.name) {
      return userData.name;
    }

    // mesh 이름 찾기
    if (hitObject.rigidBodyObject.name) {
      return hitObject.rigidBodyObject.name;
    }

    return "Unknown Object";
  }, []);

  /**
   * 충돌 처리 함수
   */
  const handleCollision = useCallback(
    (collision: CollisionPayload) => {
      if (exploded || !isActive) return;

      // 폭발 효과 트리거
      triggerExplosion();

      // 충돌한 객체의 이름 가져오기
      const objectName = getHitObjectName(collision.other);

      // 충돌 정보 로그 출력
      console.log(
        `%c🔥 FireBall hit: ${objectName}`,
        "color: #ff4500; font-weight: bold"
      );

      // 선택적으로 제공된 onCollide 콜백 호출
      if (onCollision && collision.other) {
        onCollision(collision);
      }
    },
    [exploded, isActive, onCollision, triggerExplosion, getHitObjectName]
  );

  // 매 프레임마다 이펙트 위치 업데이트
  useFrame(() => {
    if (!projectileRef.current || !isActive) return;

    // 현재 투사체의 위치 가져오기
    const currentPos = projectileRef.current.getCurrentPosition();
    // 이펙트 위치 업데이트 (값만 변경, 객체 참조는 유지)
    effectPosition.copy(currentPos);
  });

  return (
    <>
      {/* 물리적 투사체 - 충돌하거나 수명이 다하면 제거됨 */}
      {isActive && (
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
      )}

      {/* 시각적 효과 - 지정된 시간 동안 유지되다가 사라짐 */}
      <FireBallEffect
        position={effectPosition}
        scale={effectScale}
        disableBillboard={false}
      />
    </>
  );
}
