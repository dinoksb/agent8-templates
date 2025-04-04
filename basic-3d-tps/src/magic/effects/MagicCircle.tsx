import React, { useMemo } from "react";
import * as THREE from "three";
import vertexShader from "../../shaders/magicCircle/magicCircle.vert.glsl";
import fragmentShader from "../../shaders/magicCircle/magicCircle.frag.glsl";
import ShaderEffect from "../../effect/ShaderEffect";

interface MagicCircleProps {
  position: THREE.Vector3 | [number, number, number];
  radius?: number;
  opacity?: number;
  visible?: boolean;
  rotation?: number;
  onComplete?: () => void;
  duration?: number;
  fadeOut?: boolean;
}

/**
 * 마법진 효과 컴포넌트
 * ShaderEffect를 기반으로 바닥에 마법진을 표시합니다.
 */
const MagicCircle: React.FC<MagicCircleProps> = ({
  position,
  radius = 3,
  opacity = 0.8,
  visible = true,
  rotation = 0,
  onComplete,
  duration = 0, // 0은 무한 지속, 양수는 밀리초 단위 지속 시간
  fadeOut = true,
}) => {
  // 위치 벡터로 변환
  const positionVector = useMemo(() => {
    if (position instanceof THREE.Vector3) {
      return position.clone();
    }
    return new THREE.Vector3(position[0], position[1] + 0.05, position[2]); // 약간 바닥보다 위에 배치
  }, [position]);

  // 마법진은 항상 바닥에 표시되므로 노멀 벡터는 위쪽 방향
  const normal = useMemo(() => new THREE.Vector3(0, 1, 0), []);

  // 회전을 Euler 형식으로 변환 (x축 -90도 회전하여 바닥과 평행하게)
  const eulerRotation = useMemo(() => {
    return new THREE.Euler(Math.PI / 2, 0, rotation);
  }, [rotation]);

  // 쉐이더 유니폼 설정
  const uniforms = useMemo(
    () => ({
      iResolution: { value: new THREE.Vector2(radius * 2, radius * 2) },
    }),
    [radius]
  );

  // 표시되지 않을 경우 렌더링하지 않음
  if (!visible) return null;

  // ShaderEffect를 사용하여 마법진 렌더링
  return (
    <ShaderEffect
      position={positionVector}
      vertexShader={vertexShader}
      fragmentShader={fragmentShader}
      uniforms={uniforms}
      scale={radius}
      opacity={opacity}
      normal={normal}
      rotation={eulerRotation}
      duration={duration > 0 ? duration : 60000} // 무한 지속이면 장시간으로 설정 (60초)
      onComplete={onComplete}
      fadeOut={fadeOut}
      disableBillboard={true} // 빌보드 효과 비활성화 (바닥에 고정)
      blending={THREE.AdditiveBlending}
      depthWrite={false}
    />
  );
};

export default MagicCircle;
