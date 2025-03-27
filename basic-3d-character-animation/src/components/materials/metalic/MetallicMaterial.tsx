import React, { useEffect } from "react";
import { MeshStandardMaterial, MeshPhysicalMaterial, Color } from "three";
import {
  BaseMaterialProps,
  useMaterialModifier,
} from "../../../hooks/useMaterialModifier";

interface MetallicMaterialProps extends BaseMaterialProps {
  color?: string;
  metalness?: number;
  roughness?: number;
}

export const MetallicMaterial: React.FC<MetallicMaterialProps> = ({
  targetObject,
  color = "#ffffff",
  metalness = 0.8,
  roughness = 0.2,
  enabled = true,
}) => {
  const { modifyMaterial, applyMaterial, resetMaterials } =
    useMaterialModifier(targetObject);

  useEffect(() => {
    // 메탈릭 속성을 머테리얼에 적용하는 헬퍼 함수
    const applyMetallicProperties = (
      material: MeshStandardMaterial | MeshPhysicalMaterial
    ) => {
      material.metalness = metalness;
      material.roughness = roughness;
      if (color) {
        material.color = new Color(color);
      }
    };

    if (enabled) {
      modifyMaterial((material) => {
        if (
          material instanceof MeshStandardMaterial ||
          material instanceof MeshPhysicalMaterial
        ) {
          applyMetallicProperties(material);
        } else {
          // 기본 속성 및 텍스처 유지하며 새 머테리얼 생성
          const newMaterial = new MeshStandardMaterial();

          applyMetallicProperties(newMaterial);
          applyMaterial(newMaterial);
        }
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
    color,
    metalness,
    roughness,
    modifyMaterial,
    applyMaterial,
    resetMaterials,
  ]);

  return null;
};
