import React, { useEffect, useMemo } from "react";
import {
  Object3D,
  MeshToonMaterial,
  Color,
  Texture,
  Material,
  Vector2,
  TextureLoader,
  NearestFilter,
} from "three";
import { useMaterialModifier } from "../../../hooks/useMaterialModifier";

interface ToonMaterialProps {
  targetObject: Object3D;
  enabled?: boolean;
  color?: string;
  steps?: number; // 톤 단계 수 (2-5)
  emissive?: string; // 발광 색상
  specular?: string; // 하이라이트 색상
  shininess?: number; // 광택도 (MeshToonMaterial이 지원하는 경우)
}

// 텍스처 속성을 가진 머테리얼 인터페이스
interface MaterialWithTextureProps extends Material {
  map?: Texture;
  normalMap?: Texture;
  normalScale?: Vector2;
}

export const ToonMaterial: React.FC<ToonMaterialProps> = ({
  targetObject,
  enabled = true,
  color = "#ffffff",
  steps = 4,
  emissive = "#000000",
  specular = "#111111",
  shininess = 30,
}) => {
  const { modifyMaterial, applyMaterial, resetMaterials } =
    useMaterialModifier(targetObject);

  // 톤을 위한 그라디언트 맵 생성 (단계적 음영을 위함)
  const gradientMap = useMemo(() => {
    // 단계 수에 따라 적절한 크기의 텍스처 생성
    const size = Math.max(2, Math.min(steps, 5));

    // 캔버스를 사용하여 그라디언트 맵 생성
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 1;

    const context = canvas.getContext("2d");
    if (!context) return null;

    // 그라디언트 생성
    const gradient = context.createLinearGradient(0, 0, 256, 0);

    if (size === 2) {
      // 2단계: 단순한 카툰 효과 (그림자와 밝은 부분)
      gradient.addColorStop(0.0, "#000000");
      gradient.addColorStop(0.5, "#ffffff");
    } else if (size === 3) {
      // 3단계: 그림자, 중간톤, 하이라이트
      gradient.addColorStop(0.0, "#000000");
      gradient.addColorStop(0.4, "#666666");
      gradient.addColorStop(0.7, "#ffffff");
    } else if (size === 4) {
      // 4단계: 더 세분화된 톤 (일반적으로 많이 사용)
      gradient.addColorStop(0.0, "#000000");
      gradient.addColorStop(0.33, "#444444");
      gradient.addColorStop(0.67, "#aaaaaa");
      gradient.addColorStop(1.0, "#ffffff");
    } else {
      // 5단계: 세밀한 툰 셰이딩
      gradient.addColorStop(0.0, "#000000");
      gradient.addColorStop(0.2, "#333333");
      gradient.addColorStop(0.4, "#777777");
      gradient.addColorStop(0.6, "#aaaaaa");
      gradient.addColorStop(0.8, "#ffffff");
    }

    // 그라디언트 그리기
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 1);

    // 텍스처 생성
    const texture = new TextureLoader().load(canvas.toDataURL());
    texture.minFilter = NearestFilter; // 가장 가까운 픽셀 필터링 (선명한 경계)
    texture.magFilter = NearestFilter; // 단계적 경계를 위해 중요
    texture.generateMipmaps = false; // 미맵 비활성화

    return texture;
  }, [steps]);

  useEffect(() => {
    if (enabled && gradientMap) {
      modifyMaterial((material) => {
        const baseMaterial = material as MaterialWithTextureProps;

        // MeshToonMaterial 생성
        const toonMaterial = new MeshToonMaterial({
          color: new Color(color),
          emissive: new Color(emissive),
          gradientMap: gradientMap,
          // 기존 텍스처 유지
          map: baseMaterial.map,
          normalMap: baseMaterial.normalMap,
          normalScale: baseMaterial.normalScale
            ? baseMaterial.normalScale.clone()
            : undefined,
          // 기타 속성
          transparent: material.transparent,
          opacity: material.opacity,
          side: material.side,
        });

        // 머테리얼 적용
        applyMaterial(toonMaterial);
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
    emissive,
    specular,
    shininess,
    gradientMap,
    modifyMaterial,
    applyMaterial,
    resetMaterials,
  ]);

  return null;
};
