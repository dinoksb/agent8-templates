import React, { useEffect } from "react";
import { MeshStandardMaterial, Color } from "three";
import {
  BaseMaterialProps,
  useMaterialModifier,
} from "../../../hooks/useMaterialModifier";

interface EmissiveMaterialProps extends BaseMaterialProps {
  emissiveColor?: string;
  emissiveIntensity?: number;
  preserveOriginal?: boolean;
}

export const EmissiveMaterial: React.FC<EmissiveMaterialProps> = ({
  targetObject,
  emissiveColor = "#ffffff",
  emissiveIntensity = 1.0,
  preserveOriginal = true,
  enabled = true,
}) => {
  const { modifyMaterial, applyMaterial, resetMaterials } =
    useMaterialModifier(targetObject);

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
          emissiveIntensity: emissiveIntensity,
        });

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
    modifyMaterial,
    applyMaterial,
    resetMaterials,
  ]);

  return null;
};
