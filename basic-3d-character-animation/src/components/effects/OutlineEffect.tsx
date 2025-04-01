import React, { RefObject, useState, useEffect } from "react";
import * as THREE from "three";
import { Outlines } from "@react-three/drei";

/**
 * 아웃라인 효과 설정 옵션
 */
export type OutlineProps = {
  /** 아웃라인 활성화 여부 */
  enabled?: boolean;
  /** 아웃라인 색상 */
  color?: string;
  /** 아웃라인 두께 */
  thickness?: number;
  /** 아웃라인 투명도 */
  opacity?: number;
};

/**
 * 캐릭터 아웃라인 컴포넌트 프롭스
 */
type CharacterOutlineProps = {
  /** 캐릭터 모델 참조 */
  modelRef: RefObject<THREE.Group>;
  /** 아웃라인 효과 설정 */
  outlineProps?: OutlineProps;
};

/**
 * 캐릭터 모델에 아웃라인 효과를 적용하는 컴포넌트
 * Character 컴포넌트와 함께 사용됩니다.
 */
export const CharacterOutline: React.FC<CharacterOutlineProps> = ({
  modelRef,
  outlineProps = { enabled: true, color: "black", thickness: 1.5, opacity: 1 },
}) => {
  const [meshes, setMeshes] = useState<THREE.Mesh[]>([]);

  // 모델이 로드된 후 모든 메시 찾기
  useEffect(() => {
    if (!modelRef.current) return;

    const foundMeshes: THREE.Mesh[] = [];

    modelRef.current.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        foundMeshes.push(object);
      }
    });

    setMeshes(foundMeshes);
  }, [modelRef.current]);

  // 아웃라인 효과가 비활성화된 경우 아무것도 렌더링하지 않음
  if (!outlineProps.enabled || meshes.length === 0) {
    return null;
  }

  // 아웃라인 속성
  const { color = "black", thickness = 1.5, opacity = 1 } = outlineProps;

  return (
    <>
      {meshes.map((mesh, index) => (
        <primitive key={`outline-mesh-${index}`} object={mesh}>
          <Outlines
            color={color}
            thickness={thickness}
            opacity={opacity}
            transparent={true}
            angle={0}
          />
        </primitive>
      ))}
    </>
  );
};
