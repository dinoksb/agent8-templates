import React, { useEffect, useRef } from "react";
import { MeshStandardMaterial, Color } from "three";
import { useFrame } from "@react-three/fiber";
import {
  BaseMaterialProps,
  useMaterialModifier,
} from "../../hooks/useMaterialModifier";

interface EmissiveMaterialProps extends BaseMaterialProps {
  emissiveColor?: string;
  emissiveIntensity?: number;
  preserveOriginal?: boolean;
  pulseEnabled?: boolean;
  pulseSpeed?: number;
}

export const EmissiveMaterial: React.FC<EmissiveMaterialProps> = ({
  targetObject,
  emissiveColor = "#ffffff",
  emissiveIntensity = 1.0,
  preserveOriginal = true,
  pulseEnabled = false,
  pulseSpeed = 1.0,
  enabled = true,
}) => {
  const { modifyMaterial, applyMaterial, resetMaterials } =
    useMaterialModifier(targetObject);

  // 발광 머테리얼 참조 변수
  const materialRef = useRef<MeshStandardMaterial | null>(null);

  useEffect(() => {
    if (enabled) {
      modifyMaterial((material) => {
        // 기본 머테리얼 생성
        const baseMaterial = new MeshStandardMaterial({
          color: "#ffffff",
          metalness: 0.0,
          roughness: 0.5,
          transparent: false,
          opacity: 1.0,
        });

        // 기존 머테리얼이 MeshStandardMaterial인 경우 속성 복사
        if (material instanceof MeshStandardMaterial) {
          baseMaterial.color = material.color;
          baseMaterial.metalness = material.metalness;
          baseMaterial.roughness = material.roughness;
          baseMaterial.map = material.map;
          baseMaterial.normalMap = material.normalMap;
          baseMaterial.normalScale = material.normalScale;
          baseMaterial.transparent = material.transparent;
          baseMaterial.opacity = material.opacity;
        }

        // 발광 효과를 가진 새 머테리얼 생성
        const emissiveMaterial = new MeshStandardMaterial({
          ...baseMaterial,
          emissive: new Color(emissiveColor),
          emissiveIntensity: pulseEnabled ? 0 : emissiveIntensity,
        });

        // 참조 저장
        materialRef.current = emissiveMaterial;

        // 단일 머테리얼로 적용
        applyMaterial(emissiveMaterial);
      });
    }

    // 컴포넌트 언마운트 시 원래 머테리얼로 복원
    return () => {
      if (enabled) {
        resetMaterials();
      }
    };
  }, [
    enabled,
    emissiveColor,
    emissiveIntensity,
    preserveOriginal,
    pulseEnabled,
    modifyMaterial,
    applyMaterial,
    resetMaterials,
  ]);

  // 애니메이션 프레임마다 발광 강도 업데이트
  useFrame((state) => {
    if (enabled && pulseEnabled && materialRef.current) {
      // sin 함수를 사용하여 0에서 emissiveIntensity까지 부드럽게 변화
      const time = state.clock.elapsedTime * pulseSpeed;
      const newIntensity = Math.abs(Math.sin(time)) * emissiveIntensity;

      // 머테리얼의 발광 강도 업데이트
      materialRef.current.emissiveIntensity = newIntensity;
    }
  });

  return null;
};
