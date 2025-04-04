import * as THREE from "three";
import { useRef, useEffect, useMemo } from "react";
import BaseProjectile, { BaseProjectileProps } from "./BaseProjectile";

interface MeteorProps
  extends Omit<
    BaseProjectileProps,
    "gravityScale" | "size" | "mass" | "direction" | "position"
  > {
  targetPosition: THREE.Vector3 | [number, number, number]; // 목적지 위치
  height?: number; // 메테오가 생성될 높이
  spreadRadius?: number; // 목적지 주변 랜덤 확산 범위
  explosionRadius?: number;
  explosionDamage?: number;
  onAreaDamage?: (
    position: THREE.Vector3,
    radius: number,
    damage: number
  ) => void;
}

const Meteor = ({
  targetPosition,
  height = 30, // 기본 높이
  spreadRadius = 0, // 기본값은 정확히 타겟 위치에 떨어짐
  velocity = 30,
  color = "#FF5500",
  lifespan = 10000,
  explosionRadius = 5,
  explosionDamage = 50,
  onAreaDamage,
  onCollision,
  onRemove,
  ...rest
}: MeteorProps) => {
  const meteorRef = useRef(null);

  // 타겟 위치를 Vector3로 변환
  const targetVector = useMemo(() => {
    if (targetPosition instanceof THREE.Vector3) {
      return targetPosition.clone();
    }
    return new THREE.Vector3(
      targetPosition[0],
      targetPosition[1],
      targetPosition[2]
    );
  }, [targetPosition]);

  // 랜덤 오프셋 계산 (목적지 주변으로 약간의 랜덤성 추가)
  const randomOffset = useMemo(() => {
    if (spreadRadius <= 0) return new THREE.Vector3(0, 0, 0);

    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * spreadRadius;
    return new THREE.Vector3(
      Math.cos(angle) * distance,
      0,
      Math.sin(angle) * distance
    );
  }, [spreadRadius]);

  // 최종 목적지 위치 (랜덤 오프셋 적용)
  const finalTargetPosition = useMemo(() => {
    return targetVector.clone().add(randomOffset);
  }, [targetVector, randomOffset]);

  // 시작 위치 계산 (목적지 위의 높이에서 시작)
  const startPosition = useMemo<[number, number, number]>(() => {
    return [
      finalTargetPosition.x,
      finalTargetPosition.y + height,
      finalTargetPosition.z,
    ];
  }, [finalTargetPosition, height]);

  // 방향 벡터 계산 (시작 위치에서 목적지로 향하는 벡터)
  const direction = useMemo(() => {
    const dir = new THREE.Vector3(0, -1, 0); // 기본적으로 아래로 향함
    return dir.normalize();
  }, []);

  // Custom collision handler to handle explosion and area damage
  const handleMeteorCollision = (collision) => {
    if (meteorRef.current) {
      const position = meteorRef.current.getCurrentPosition();
      // Trigger area damage on collision
      onAreaDamage?.(position, explosionRadius, explosionDamage);
    }
    // Forward to original collision handler
    onCollision?.(collision);
  };

  // Create meteor trail effect
  useEffect(() => {
    const updateTrail = () => {
      if (!meteorRef.current?.isActive) return;

      // Update trail effects here if needed
      // This is where you'd add particles or other visual effects

      requestAnimationFrame(updateTrail);
    };

    updateTrail();
  }, []);

  return (
    <>
      <BaseProjectile
        ref={meteorRef}
        position={startPosition}
        velocity={velocity}
        direction={direction}
        color={color}
        size={[2, 2, 2]} // Larger size for meteor
        mass={10} // Heavy mass
        gravityScale={3} // Strong gravity effect
        lifespan={lifespan}
        onCollision={handleMeteorCollision}
        onRemove={onRemove}
        {...rest}
      />
    </>
  );
};

export default Meteor;
