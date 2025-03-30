import React, { useEffect, useMemo } from "react";
import {
  Object3D,
  MeshToonMaterial,
  Color,
  Texture,
  Material,
  Vector2,
  NearestFilter,
  LinearFilter,
  RepeatWrapping,
  DataTexture,
  RedFormat,
} from "three";
import { useMaterialModifier } from "../../hooks/useMaterialModifier";

// 핵심 파라미터만 포함하는 간소화된 인터페이스
interface ToonMaterialProps {
  targetObject: Object3D;
  enabled?: boolean;
  color?: string;
  steps?: number; // 톤 단계 수 (2-8)
}

// 텍스처 속성을 가진 머테리얼 인터페이스
interface MaterialWithTextureProps extends Material {
  map?: Texture;
  normalMap?: Texture;
  normalScale?: Vector2;
  color?: Color;
}

export const ToonMaterial: React.FC<ToonMaterialProps> = ({
  targetObject,
  enabled = true,
  color = "#ffffff", // 기본 색상을 완전한 흰색으로 유지
  steps = 4, // 기본 단계 수
}) => {
  // 내부 상수로 고정된 파라미터들
  const PRESERVE_TEXTURES = true;
  
  const { modifyMaterial, applyMaterial, resetMaterials } =
    useMaterialModifier(targetObject);

  // 톤을 위한 그라디언트 맵 생성 (단계적 음영을 위함)
  // useMemo를 사용하여 불필요한 재계산 방지
  const gradientMap = useMemo(() => {
    // 단계 수에 따라 데이터 생성 (최소 2, 최대 8단계)
    const numSteps = Math.max(2, Math.min(steps, 8));
    
    // 그라디언트 맵을 위한 색상 배열 생성
    const colors = new Uint8Array(numSteps);
    
    // 음영값 계산 (어두운 부분을 밝게 시작하기 위해 베이스값 조정)
    const baseValue = 100; // 가장 어두운 부분의 기본값 (0-255) - 더 밝게 조정
    
    for (let i = 0; i < numSteps; i++) {
      // 밝기 값 계산 (어두운 부분을 더 밝게 조정)
      // i=0일 때 baseValue, i=numSteps-1일 때 255가 되도록 계산
      colors[i] = Math.round(baseValue + (255 - baseValue) * (i / (numSteps - 1)));
    }
    
    // DataTexture 생성
    const texture = new DataTexture(colors, colors.length, 1, RedFormat);
    
    // 필요한 속성 설정
    texture.needsUpdate = true; 
    texture.minFilter = NearestFilter;
    texture.magFilter = LinearFilter;
    texture.generateMipmaps = false;
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    
    return texture;
  }, [steps]);

  // 기존 색상에서 밝은 색상으로 변환하는 함수
  const getBrightenedColor = (originalColor: string): Color => {
    const color = new Color(originalColor);
    
    // HSL로 변환하여 밝기(L) 조정
    const hsl = {h: 0, s: 0, l: 0};
    color.getHSL(hsl);
    
    // 밝기 증가 (최대 1.0)
    hsl.l = Math.min(1.0, hsl.l * 1.5);
    
    // 업데이트된 HSL 값 적용
    color.setHSL(hsl.h, hsl.s, hsl.l);
    
    return color;
  };

  useEffect(() => {
    if (enabled && gradientMap) {
      modifyMaterial((material) => {
        const baseMaterial = material as MaterialWithTextureProps;
        
        // 원본 색상 추출
        const baseColor = baseMaterial.color 
          ? baseMaterial.color.clone() 
          : new Color(color);
        
        // 색상을 더 밝게 조정
        const brightenedColor = getBrightenedColor(baseColor.getStyle());

        // MeshToonMaterial 생성
        const toonMaterial = new MeshToonMaterial({
          color: brightenedColor,
          gradientMap: gradientMap,
          
          // 기존 텍스처 유지
          map: PRESERVE_TEXTURES && baseMaterial.map ? baseMaterial.map : null,
          normalMap: PRESERVE_TEXTURES && baseMaterial.normalMap ? baseMaterial.normalMap : null,
          normalScale: PRESERVE_TEXTURES && baseMaterial.normalScale 
            ? baseMaterial.normalScale.clone() 
            : new Vector2(1, 1),
          
          // 기타 속성
          transparent: material.transparent,
          opacity: material.opacity,
          side: material.side,
          // 추가 속성 보존
          depthWrite: material.depthWrite,
          depthTest: material.depthTest,
        });

        // 머테리얼 적용
        applyMaterial(toonMaterial);
      });
    } else if (!enabled) {
      // 비활성화 시 원래 머테리얼로 되돌림
      resetMaterials();
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
    steps,
    gradientMap,
    modifyMaterial,
    applyMaterial,
    resetMaterials,
  ]);

  return null;
};
