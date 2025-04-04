import React, { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { FireBallEffect } from "../../effect/FireBallEffect";
import ProjectileMagic, {
  ProjectileMagicHandle,
} from "../core/ProjectileMagic";
import {
  MagicElement,
  MagicEffectType,
  ProjectileMagicProps,
} from "../core/BaseMagic";
import MagicCircle from "../effects/MagicCircle";

// 메테오 전용 속성
export interface MeteorProps
  extends Omit<
    ProjectileMagicProps,
    "element" | "visualComponent" | "direction" | "position"
  > {
  targetPosition: THREE.Vector3 | [number, number, number]; // 목표 위치
  height?: number; // 메테오가 생성될 높이
  spreadRadius?: number; // 목적지 주변 랜덤 확산 범위
  explosionRadius?: number; // 폭발 반경
  explosionDamage?: number; // 폭발 데미지
  showMagicCircle?: boolean; // 마법진 표시 여부
  magicCircleRadius?: number; // 마법진 반경
  magicCircleDuration?: number; // 마법진 지속 시간 (ms)
  onAreaDamage?: (
    position: THREE.Vector3,
    radius: number,
    damage: number
  ) => void; // 영역 데미지 콜백
}

/**
 * 메테오 마법 컴포넌트
 * - 화염 속성 중력 영향 투사체
 * - 지정된 목표 지점에 충돌 시 폭발 및 영역 데미지
 * - 마법진 효과를 목표 지점에 표시 가능
 */
const Meteor: React.FC<MeteorProps> = ({
  targetPosition,
  height = 30, // 기본 높이
  spreadRadius = 0, // 기본값은 정확히 타겟 위치에 떨어짐
  velocity = 30,
  duration = 10000,
  explosionRadius = 5,
  explosionDamage = 50,
  showMagicCircle = true, // 기본적으로 마법진 표시
  magicCircleRadius = 4, // 기본 마법진 반경
  magicCircleDuration = 5000, // 마법진 지속 시간 (5초)
  onAreaDamage,
  onHit,
  onComplete,
  debug = false,
}) => {
  const meteorRef = useRef<ProjectileMagicHandle>(null);

  // 마법진 표시 여부 상태
  const [magicCircleVisible, setMagicCircleVisible] = useState(showMagicCircle);

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

  // 마법진 효과가 완료되면 호출
  const handleMagicCircleComplete = () => {
    setMagicCircleVisible(false);
  };

  // 충돌 시 효과와 데미지 처리를 위한 핸들러
  const handleHit = (
    target: THREE.Object3D | THREE.Mesh | unknown,
    point: THREE.Vector3
  ) => {
    // 영역 데미지 적용
    if (onAreaDamage) {
      onAreaDamage(point, explosionRadius, explosionDamage);
    }

    // 원래 충돌 콜백 호출
    if (onHit) onHit(target, point, [...effects]);
  };

  // 메테오 이펙트 컴포넌트 (크기 2배)
  const meteorVisual = (
    <FireBallEffect
      position={new THREE.Vector3(0, 0, 0)} // 위치는 ProjectileMagic에서 업데이트
      scale={8}
      duration={duration}
      disableBillboard={false}
    />
  );

  // 메테오 효과 설정
  const effects = [
    {
      type: MagicEffectType.DAMAGE,
      damage: explosionDamage,
      radius: explosionRadius,
    },
    {
      type: MagicEffectType.BURN,
      damage: explosionDamage * 0.3, // 연소 데미지
      duration: 5000, // 5초 동안 화상
      interval: 1000, // 1초마다 데미지
      radius: explosionRadius * 0.7, // 폭발 반경의 70%
    },
  ];

  // 메테오 충돌 또는 완료 시 마법진도 제거
  const handleComplete = () => {
    setMagicCircleVisible(false);
    if (onComplete) onComplete();
  };

  return (
    <>
      {/* 마법진 효과 */}
      {magicCircleVisible && (
        <MagicCircle
          position={finalTargetPosition}
          radius={magicCircleRadius}
          opacity={0.8}
          rotation={0}
          duration={magicCircleDuration}
          onComplete={handleMagicCircleComplete}
          fadeOut={true}
        />
      )}

      {/* 메테오 투사체 */}
      <ProjectileMagic
        ref={meteorRef}
        position={startPosition}
        direction={direction}
        velocity={velocity}
        element={MagicElement.FIRE}
        size={[8, 8, 8]} // 메테오는 큰 크기로
        duration={duration}
        gravity={0.1} // 중력 영향 받음
        mass={0.1} // 무거운 질량
        effects={effects}
        visualComponent={meteorVisual}
        onHit={handleHit}
        onComplete={handleComplete}
        debug={debug}
      />
    </>
  );
};

export default Meteor;
