import React, { useRef, useState, useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface CameraRaycastProps {
  /**
   * 레이캐스트 충돌 지점에 표시할 구체의 반지름
   */
  sphereRadius?: number;

  /**
   * 레이캐스트 충돌 지점에 표시할 구체의 색상
   */
  sphereColor?: string;

  /**
   * 발광 색상
   */
  emissiveColor?: string;

  /**
   * 최대 레이캐스트 거리
   */
  maxDistance?: number;

  /**
   * 충돌 지점 감지 시 호출될 콜백
   */
  onHitPoint?: (point: THREE.Vector3, normal: THREE.Vector3) => void;

  /**
   * 디버그 모드 활성화 여부
   */
  debug?: boolean;
}

/**
 * 카메라 방향으로 레이캐스트를 수행하고 충돌 지점을 시각화하는 컴포넌트
 */
export const CameraRaycast: React.FC<CameraRaycastProps> = ({
  sphereRadius = 0.1,
  sphereColor = "#ff9900",
  emissiveColor = "#ff6600",
  maxDistance = 100,
  onHitPoint,
  debug = true,
}) => {
  // 레이캐스트 결과 상태
  const [hitPoint, setHitPoint] = useState<THREE.Vector3 | null>(null);
  // 충돌 표면의 법선 방향
  const [, setHitNormal] = useState<THREE.Vector3 | null>(null);

  // 구체 및 라인 참조
  const sphereRef = useRef<THREE.Mesh>(null);
  const lineRef = useRef(null);

  // lineGeometry 생성 (메모이제이션)
  const lineGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(6); // 2 점 x 3 좌표
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, []);

  // lineMaterial 생성 (메모이제이션)
  const lineMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({ color: sphereColor });
  }, [sphereColor]);

  // Three.js 요소
  const { camera } = useThree();

  // 레이캐스터 생성 (메모이제이션)
  const raycaster = useMemo(() => {
    const rc = new THREE.Raycaster();
    rc.far = maxDistance;
    return rc;
  }, [maxDistance]);

  // 매 프레임마다 레이캐스트 수행
  useFrame(() => {
    // 카메라 중앙 방향으로 레이 설정
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

    // 바닥면과의 교차점 계산 (y=0 평면)
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectPoint = new THREE.Vector3();

    if (raycaster.ray.intersectPlane(groundPlane, intersectPoint)) {
      setHitPoint(intersectPoint);
      setHitNormal(new THREE.Vector3(0, 1, 0));

      // 콜백 호출
      if (onHitPoint) {
        onHitPoint(intersectPoint, new THREE.Vector3(0, 1, 0));
      }

      // 구체 위치 업데이트
      if (sphereRef.current) {
        sphereRef.current.position.copy(intersectPoint);

        // 부드러운 애니메이션 효과
        sphereRef.current.position.y += Math.sin(Date.now() * 0.003) * 0.05;
      }

      // 라인 업데이트
      if (lineRef.current && debug) {
        const positions = lineGeometry.attributes.position
          .array as Float32Array;
        const cameraPosition = new THREE.Vector3();
        camera.getWorldPosition(cameraPosition);

        // 시작점: 카메라 위치
        positions[0] = cameraPosition.x;
        positions[1] = cameraPosition.y;
        positions[2] = cameraPosition.z;

        // 끝점: 교차 지점
        positions[3] = intersectPoint.x;
        positions[4] = intersectPoint.y;
        positions[5] = intersectPoint.z;

        // 버퍼 업데이트 필요 플래그 설정
        lineGeometry.attributes.position.needsUpdate = true;
      }
    } else {
      // 충돌 없음
      setHitPoint(null);
      setHitNormal(null);
    }
  });

  // 클린업 함수
  useEffect(() => {
    return () => {
      // 자원 정리
      lineGeometry.dispose();
      lineMaterial.dispose();

      if (sphereRef.current?.geometry) {
        sphereRef.current.geometry.dispose();
      }

      if (sphereRef.current?.material) {
        const material = sphereRef.current.material as THREE.Material;
        material.dispose();
      }
    };
  }, [lineGeometry, lineMaterial]);

  // 충돌 지점이 없으면 아무것도 렌더링하지 않음
  if (!hitPoint) return null;

  return (
    <>
      {/* 충돌 지점 표시 구체 */}
      <mesh ref={sphereRef} position={[hitPoint.x, hitPoint.y, hitPoint.z]}>
        <sphereGeometry args={[sphereRadius, 16, 16]} />
        <meshStandardMaterial
          color={sphereColor}
          emissive={emissiveColor}
          emissiveIntensity={0.5}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* 디버그 모드에서 레이 라인 표시 */}
      {debug && (
        <primitive
          ref={lineRef}
          object={new THREE.Line(lineGeometry, lineMaterial)}
        />
      )}
    </>
  );
};

export default CameraRaycast;
