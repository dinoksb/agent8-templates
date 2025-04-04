import React, {
  useRef,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { animated } from "@react-spring/three";
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  Vector3,
  Mesh,
  Blending,
  Euler,
  Quaternion,
  ShaderMaterial,
  Vector2,
  Matrix4,
  IUniform,
} from "three";
import { extend } from "@react-three/fiber";

// 셰이더 머티리얼에 전달할 프롭스 타입 정의
type ShaderMaterialProps = {
  vertexShader: string;
  fragmentShader: string;
  uniforms: Record<string, IUniform>;
  [key: string]: unknown; // 추가 셰이더 속성
};

// Define custom shader material class
class CustomShaderMaterial extends ShaderMaterial {
  constructor(props: ShaderMaterialProps) {
    super({
      uniforms: {
        time: { value: 0 },
        resolution: {
          value: new Vector2(window.innerWidth, window.innerHeight),
        },
        color: { value: new Color(1, 1, 1) },
        invModelMatrix: { value: new Matrix4() },
        scale: { value: new Vector3(1, 1, 1) },
        ...props.uniforms,
      },
      vertexShader: props.vertexShader,
      fragmentShader: props.fragmentShader,
      transparent: true,
      ...props,
    });
  }
}

extend({ CustomShaderMaterial });

// 애니메이션 키프레임 타입
interface AnimationKeyframes {
  start: number;
  mid: number;
  end: number;
}

interface ShaderEffectProps {
  position: Vector3;
  vertexShader: string;
  fragmentShader: string;
  uniforms?: Record<string, IUniform>;
  scale?: number;
  color?: Color;
  opacity?: number;
  loop?: boolean;
  blending?: number;
  depthWrite?: boolean;
  depthTest?: boolean;
  polygonOffset?: boolean;
  polygonOffsetFactor?: number;
  polygonOffsetUnits?: number;
  fadeOut?: boolean;
  autoPlay?: boolean;
  rotation?: Euler;
  onComplete?: () => void;
  // Animation properties
  scaleAnimation?: AnimationKeyframes;
  opacityAnimation?: AnimationKeyframes;
  // Option to disable billboard effect
  disableBillboard?: boolean;
  // Surface normal vector (used for effects like attaching to walls)
  normal?: Vector3;
  // Shader execution time (milliseconds)
  duration?: number;
  materialRef?: React.RefObject<CustomShaderMaterial>;
  // Volume rendering mode (expressing volume with multiple planes)
  volume?: boolean;
}

/**
 * 셰이더 이펙트 컴포넌트
 * 커스텀 셰이더를 사용하여 다양한 시각 효과를 구현합니다.
 */
export const ShaderEffect: React.FC<ShaderEffectProps> = ({
  position,
  vertexShader,
  fragmentShader,
  color = new Color(1, 1, 1),
  duration = 1000,
  scaleAnimation,
  opacityAnimation,
  fadeOut,
  normal,
  uniforms = {},
  materialRef: externalMaterialRef,
  disableBillboard = false,
  rotation,
  blending = AdditiveBlending,
  scale = 1,
  volume = false,
  onComplete,
}) => {
  // 참조 및 상태 관리
  const meshRef = useRef<Mesh>(null);
  const internalMaterialRef = useRef<ShaderMaterial>(null);
  const materialRef = externalMaterialRef || internalMaterialRef;
  const [opacity, setOpacity] = useState(1);
  const [currentScale] = useState(scale);
  const [isVisible, setIsVisible] = useState(true);
  const timeRef = useRef(0);
  const { camera } = useThree();

  // 빌보드 계산에 사용할 임시 벡터들 (성능 최적화)
  const tempVectors = useMemo(
    () => ({
      dirToCam: new Vector3(),
      worldUp: new Vector3(0, 1, 0),
      right: new Vector3(),
      up: new Vector3(),
      rotationMatrix: new Matrix4(),
      quaternion: new Quaternion(),
      zAxis: new Vector3(0, 0, 1),
      rotationQuat: new Quaternion(),
      offsetPosition: new Vector3(),
    }),
    []
  );

  // 셰이더 머티리얼 프롭스
  const shaderMaterialProps = useMemo(
    () => ({
      vertexShader,
      fragmentShader,
      uniforms: {
        color: { value: color },
        opacity: { value: opacity },
        time: { value: 0 },
        resolution: {
          value: new Vector2(window.innerWidth, window.innerHeight),
        },
        invModelMatrix: { value: new Matrix4() },
        scale: { value: new Vector3(1, 1, 1) },
        ...uniforms,
      },
      transparent: true,
      side: DoubleSide,
      blending: blending as Blending,
    }),
    [vertexShader, fragmentShader, color, opacity, uniforms, blending]
  );

  // Store quaternion for rotation based on normal vector
  const normalRotationRef = useRef<Quaternion | null>(null);

  /**
   * 노멀 벡터 방향으로 회전 계산
   */
  useEffect(() => {
    if (!normal) return;

    const quaternion = new Quaternion();
    quaternion.setFromUnitVectors(
      tempVectors.worldUp,
      normal.clone().normalize()
    );
    normalRotationRef.current = quaternion;

    if (meshRef.current) {
      meshRef.current.quaternion.copy(quaternion);
    }
  }, [normal, tempVectors.worldUp]);

  /**
   * 빌보드 효과 업데이트 함수
   * 메시가 항상 카메라를 향하도록 회전을 갱신합니다.
   */
  const updateBillboard = useCallback(() => {
    if (!meshRef.current) return;

    const { dirToCam, worldUp, right, up, rotationMatrix, quaternion, zAxis } =
      tempVectors;

    // 카메라에서 메시까지의 방향 벡터 계산
    dirToCam.copy(camera.position).sub(meshRef.current.position);

    // 오른쪽 벡터 계산 (방향 벡터와 월드 업 벡터의 외적)
    right.crossVectors(dirToCam, worldUp).normalize();

    // 위쪽 벡터 재계산 (오른쪽 벡터와 방향 벡터의 외적)
    up.crossVectors(right, dirToCam).normalize();

    // 세 축을 이용하여 회전 행렬 생성
    rotationMatrix.makeBasis(right, up, dirToCam.normalize().negate());

    // 회전 행렬에서 쿼터니언 추출
    quaternion.setFromRotationMatrix(rotationMatrix);

    // 메시에 쿼터니언 적용
    meshRef.current.quaternion.copy(quaternion);

    // Z축 회전 적용 (rotation 파라미터가 있는 경우)
    if (rotation) {
      const zRotation = tempVectors.rotationQuat;
      zRotation.setFromAxisAngle(zAxis, rotation.z);
      meshRef.current.quaternion.multiply(zRotation);
    }
  }, [camera, tempVectors, rotation]);

  /**
   * 노멀 기반 회전 업데이트 함수
   */
  const updateNormalRotation = useCallback(() => {
    if (!meshRef.current || !normalRotationRef.current) return;

    meshRef.current.quaternion.copy(normalRotationRef.current);

    if (rotation) {
      const rotationQuat = tempVectors.rotationQuat;
      rotationQuat.setFromEuler(rotation);
      meshRef.current.quaternion.multiply(rotationQuat);
    }
  }, [tempVectors, rotation]);

  /**
   * 위치 업데이트 함수
   */
  const updatePosition = useCallback(() => {
    if (!meshRef.current || !position) return;
    meshRef.current.position.copy(position);
  }, [position]);

  /**
   * 셰이더 유니폼 업데이트 함수
   */
  const updateUniforms = useCallback(() => {
    if (!materialRef.current) return;

    materialRef.current.uniforms.time.value = timeRef.current;
    materialRef.current.uniforms.opacity.value = opacity;
  }, [opacity, materialRef]);

  // 프레임마다 실행되는 업데이트 로직
  useFrame((_, delta) => {
    // 시간 업데이트
    timeRef.current += delta;

    if (!meshRef.current || !materialRef.current) return;

    // 위치, 유니폼, 스케일 업데이트
    updatePosition();
    updateUniforms();
    meshRef.current.scale.set(currentScale, currentScale, currentScale);

    // 회전 업데이트 (빌보드 효과, 노멀 기반 회전 등)
    if (!disableBillboard) {
      updateBillboard();
    } else if (normal && normalRotationRef.current) {
      updateNormalRotation();
    } else if (rotation) {
      meshRef.current.setRotationFromEuler(rotation);
    }
  });

  // 애니메이션 및 수명 관리
  useEffect(() => {
    if (!meshRef.current) return;

    const startTime = Date.now();
    let animationFrameId: number;

    const updateEffect = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // ✨ 등장-유지-사라짐 알파 계산
      const fadeRatio = 0.3; // 앞/뒤 30%를 fade로 사용
      let newOpacity = 1;

      if (progress < fadeRatio) {
        newOpacity = progress / fadeRatio; // fade-in
      } else if (progress > 1 - fadeRatio) {
        newOpacity = (1 - progress) / fadeRatio; // fade-out
      } else {
        newOpacity = 1.0; // 유지
      }

      setOpacity(newOpacity); // 내부 상태 업데이트

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(updateEffect);
      } else {
        if (newOpacity === 0 || newOpacity < 1) {
          setIsVisible(false);
          onComplete?.();
          // if (meshRef.current) {
          //   // geometry 및 material 해제
          //   if (meshRef.current.geometry) {
          //     meshRef.current.geometry.dispose();
          //   }

          //   if (meshRef.current.material) {
          //     if (Array.isArray(meshRef.current.material)) {
          //       meshRef.current.material.forEach((material) =>
          //         material.dispose()
          //       );
          //     } else {
          //       meshRef.current.material.dispose();
          //     }
          //   }
          // }
          // console.log("ShaderEffect completed");
        }
      }
    };

    updateEffect();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [
    duration,
    scaleAnimation,
    opacityAnimation,
    fadeOut,
    scale,
    onComplete,
    materialRef,
  ]);

  // 윈도우 리사이즈 핸들러 (디바운스 적용)
  useEffect(() => {
    let resizeTimeoutId: ReturnType<typeof setTimeout>;

    const handleResize = () => {
      clearTimeout(resizeTimeoutId);
      resizeTimeoutId = setTimeout(() => {
        if (materialRef.current) {
          materialRef.current.uniforms.resolution.value.set(
            window.innerWidth,
            window.innerHeight
          );
        }
      }, 100); // 100ms 디바운스
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimeoutId);
    };
  }, []);

  // 컴포넌트가 visible이 아니면 렌더링하지 않음
  if (!isVisible) return null;

  // 노멀 방향으로 약간 오프셋된, 카메라를 향하는 패널 계산
  const offsetPosition = tempVectors.offsetPosition.copy(position);
  if (normal) {
    // 노멀 방향으로 약간 앞으로 이동 (0.1 단위)
    offsetPosition.add(normal.clone().multiplyScalar(0.1));
  }

  // 다중 평면 렌더링을 위한 설정
  const planes = [
    // 기본 평면 - 가장 큰 사이즈로 배경 역할
    {
      position: [0, 0, -0.005] as const,
      rotation: [0, 0, 0] as const,
      size: [1.05, 1.05] as [number, number],
      factor: -1,
    },
    // X축 90도 회전 - 약간 작은 사이즈
    {
      position: [0, 0, 0] as const,
      rotation: [Math.PI / 2, 0, 0] as const,
      size: [0.98, 0.98] as [number, number],
      factor: -2,
    },
    // Y축 90도 회전 - 약간 작은 사이즈
    {
      position: [0, 0, 0] as const,
      rotation: [0, Math.PI / 2, 0] as const,
      size: [0.99, 0.99] as [number, number],
      factor: -3,
    },
    // 대각선 #1 (45도 회전) - 더 작은 사이즈
    {
      position: [0, 0, 0.002] as const,
      rotation: [0, Math.PI / 4, Math.PI / 4] as const,
      size: [0.92, 0.92] as [number, number],
      factor: -4,
    },
    // 대각선 #2 (-45도 회전) - 더 작은 사이즈
    {
      position: [0, 0, 0.002] as const,
      rotation: [0, -Math.PI / 4, Math.PI / 4] as const,
      size: [0.9, 0.9] as [number, number],
      factor: -5,
    },
  ];

  // 셰이더 속성 수정
  const modifiedShaderProps = {
    ...shaderMaterialProps,
    side: DoubleSide,
  };

  // 볼륨 렌더링 모드 설정 - 다중 평면 사용
  return (
    <animated.mesh ref={meshRef} position={offsetPosition}>
      <group>
        {/* 첫 번째 평면은 머티리얼 참조를 가져야 함 */}
        <mesh position={new Vector3(...planes[0].position)}>
          <planeGeometry args={planes[0].size} />
          <shaderMaterial
            ref={materialRef}
            args={[
              {
                ...modifiedShaderProps,
                depthWrite: false,
                polygonOffset: true,
                polygonOffsetFactor: planes[0].factor,
                polygonOffsetUnits: planes[0].factor,
              },
            ]}
          />
        </mesh>

        {/* 나머지 평면들은 같은 셰이더 머티리얼 속성을 공유하지만 참조는 필요 없음 */}
        {volume &&
          planes.slice(1).map((plane, index) => (
            <mesh
              key={index + 1}
              position={new Vector3(...plane.position)}
              rotation={new Euler(...plane.rotation)}
            >
              <planeGeometry args={plane.size} />
              <shaderMaterial
                args={[
                  {
                    ...modifiedShaderProps,
                    depthWrite: false,
                    polygonOffset: true,
                    polygonOffsetFactor: plane.factor,
                    polygonOffsetUnits: plane.factor,
                  },
                ]}
              />
            </mesh>
          ))}
      </group>
    </animated.mesh>
  );
};

export default ShaderEffect;
