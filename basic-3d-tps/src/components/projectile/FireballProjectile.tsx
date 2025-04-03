import React, { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
import { BaseProjectile, BaseProjectileProps } from "./BaseProjectile";

/**
 * 파이어볼 투사체 속성
 */
interface FireballProps extends Omit<BaseProjectileProps, "children"> {
  /** 불꽃 색상 */
  flameColor?: string;
  /** 불꽃 강도 */
  flameIntensity?: number;
  /** 불꽃 크기 변화 속도 */
  pulseSpeed?: number;
}

/**
 * 파이어볼 투사체 컴포넌트
 *
 * 기본 투사체를 확장하여 파이어볼을 구현합니다.
 */
export const FireballProjectile: React.FC<FireballProps> = ({
  flameColor = "#ff4500",
  flameIntensity = 1.5,
  pulseSpeed = 3,
  lifetime = 1,
  ...projectileProps
}) => {
  // 디버깅용: 마운트 시 수명 기록
  useEffect(() => {
    console.log(
      `FireballProjectile created with lifetime: ${lifetime} seconds`
    );
    return () => {
      console.log(`FireballProjectile destroyed after lifetime`);
    };
  }, [lifetime]);

  // 크기 조절을 위한 참조
  const pulseRef = useRef<number>(0);
  const scaleRef = useRef<Vector3>(new Vector3(1, 1, 1));

  // 불꽃 효과 애니메이션 및 시각적 표현
  const FireballEffect: React.FC = () => {
    useFrame((_, delta) => {
      pulseRef.current += delta * pulseSpeed;

      // 맥동 효과 계산 (0.9 ~ 1.1 사이 크기 변화)
      const pulseFactor = 0.9 + 0.2 * (0.5 + 0.5 * Math.sin(pulseRef.current));
      scaleRef.current.set(pulseFactor, pulseFactor, pulseFactor);
    });

    return (
      <group scale={scaleRef.current}>
        {/* 내부 코어 */}
        <mesh castShadow>
          <sphereGeometry args={[0.8, 20, 20]} />
          <meshStandardMaterial
            color={flameColor}
            emissive={flameColor}
            emissiveIntensity={flameIntensity}
          />
        </mesh>

        {/* 외부 글로우 효과 */}
        <mesh scale={[1.3, 1.3, 1.3]}>
          <sphereGeometry args={[1, 20, 20]} />
          <meshStandardMaterial
            color={flameColor}
            emissive={flameColor}
            emissiveIntensity={flameIntensity * 0.7}
            transparent
            opacity={0.6}
          />
        </mesh>
      </group>
    );
  };

  // 기본 속성 설정
  const baseProps: BaseProjectileProps = {
    speed: 15,
    lifetime,
    scale: new Vector3(0.5, 0.5, 0.5),
    ...projectileProps,
    // children은 항상 FireballEffect 컴포넌트로 제공
    children: <FireballEffect />,
  };

  return <BaseProjectile {...baseProps} />;
};
