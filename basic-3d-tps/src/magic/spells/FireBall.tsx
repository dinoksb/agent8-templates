import React from "react";
import * as THREE from "three";
import { FireBallEffect } from "../../effect/FireBallEffect";
import ProjectileMagic from "../core/ProjectileMagic";
import {
  MagicCastType,
  MagicElement,
  MagicEffectType,
  ProjectileMagicProps,
} from "../core/BaseMagic";

// 파이어볼 전용 속성
export interface FireBallProps
  extends Omit<ProjectileMagicProps, "element" | "visualComponent"> {
  damage?: number;
}

/**
 * 파이어볼 마법 컴포넌트
 * - 기본 투사체 마법
 * - 충돌 시 화상 효과 추가 가능
 */
const FireBall: React.FC<FireBallProps> = ({
  position,
  direction,
  velocity = 25,
  duration = 1500,
  damage = 20,
  size = [0.3, 0.3, 0.3],
  onHit,
  onComplete,
  debug = false,
}) => {
  // 충돌 시 효과와 데미지 처리를 위한 핸들러
  const handleHit = (
    target: THREE.Object3D | THREE.Mesh | unknown,
    point: THREE.Vector3
  ) => {
    // 원래 충돌 콜백 호출
    if (onHit) onHit(target, point);
    console.log("FireBall hit at position:", point.x, point.y, point.z);
  };

  // 파이어볼 이펙트 컴포넌트
  const fireBallVisual = (
    <FireBallEffect
      position={new THREE.Vector3(0, 0, 0)} // 위치는 ProjectileMagic에서 업데이트
      scale={1}
      duration={duration}
      disableBillboard={false}
    />
  );

  //   파이어볼 효과 설정
  const effects = [
    {
      type: MagicEffectType.DAMAGE,
      damage: damage,
    },
    {
      type: MagicEffectType.BURN,
      damage: damage * 0.5,
      duration: 2000,
      interval: 1000,
    },
  ];

  return (
    <ProjectileMagic
      element={MagicElement.FIRE}
      castType={MagicCastType.PROJECTILE}
      position={position}
      direction={direction}
      velocity={velocity}
      size={size}
      duration={duration}
      piercing={false}
      effects={effects}
      visualComponent={fireBallVisual}
      onHit={handleHit}
      onComplete={onComplete}
      debug={debug}
    />
  );
};

export default FireBall;
