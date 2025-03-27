import React, { useEffect } from "react";
import { MeshStandardMaterial, MeshPhysicalMaterial, Color } from "three";
import {
  BaseMaterialProps,
  useMaterialModifier,
} from "../../../hooks/useMaterialModifier";

interface PlasticMaterialProps extends BaseMaterialProps {
  color?: string;
  roughness?: number;
  clearcoat?: number;
  transparent?: boolean;
  opacity?: number;
  type?: "glossy" | "matte" | "translucent";
}

export const PlasticMaterial: React.FC<PlasticMaterialProps> = ({
  targetObject,
  roughness = 0.3,
  clearcoat = 0.5,
  transparent = false,
  opacity = 1.0,
  color,
  enabled = true,
  type: plasticType = "glossy",
}) => {
  const { modifyMaterial, applyMaterial, resetMaterials } =
    useMaterialModifier(targetObject);

  useEffect(() => {
    if (enabled) {
      modifyMaterial((material: MeshPhysicalMaterial) => {
        let plasticMaterial;

        switch (plasticType) {
          case "glossy":
            // 광택 플라스틱
            plasticMaterial = new MeshPhysicalMaterial({
              color: new Color(color),
              roughness: roughness,
              metalness: 0.0, // 금속성 없음
              clearcoat: clearcoat, // 코팅 효과
              clearcoatRoughness: 0.1, // 매끄러운 코팅
              transparent,
              map: material.map,
              opacity,
            });
            break;

          case "matte":
            // 무광 플라스틱
            plasticMaterial = new MeshStandardMaterial({
              color: new Color(color),
              roughness: Math.min(0.9, roughness + 0.3), // 더 거친 표면
              metalness: 0.0, // 금속성 없음
              transparent,
              map: material.map,
              opacity,
            });
            break;

          case "translucent":
            // 반투명 플라스틱
            plasticMaterial = new MeshPhysicalMaterial({
              color: new Color(color),
              roughness: roughness,
              metalness: 0.0, // 금속성 없음
              clearcoat: clearcoat, // 코팅 효과
              clearcoatRoughness: 0.1, // 매끄러운 코팅
              transmission: 0.5, // 빛 투과 정도
              thickness: 1.0, // 두께
              ior: 1.4, // 굴절률
              transparent: true,
              map: material.map,
              opacity: Math.min(0.95, opacity), // 반투명 보장
            });
            break;
        }

        if (material instanceof MeshPhysicalMaterial === false) {
          // 플라스틱 타입에 따른 프로퍼티 설정
          applyMaterial(plasticMaterial);
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
    plasticType,
    color,
    roughness,
    clearcoat,
    transparent,
    opacity,
    modifyMaterial,
    applyMaterial,
    resetMaterials,
  ]);

  return null;
};
