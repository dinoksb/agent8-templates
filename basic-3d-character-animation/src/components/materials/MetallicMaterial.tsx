import React, { useEffect } from 'react';
import { Object3D, MeshStandardMaterial, Material, Color, Texture, Vector2 } from 'three';
import { useMaterialModifier } from '../../hooks/useMaterialModifier';

interface MetallicMaterialProps {
  targetObject: Object3D;
  metalness?: number;
  roughness?: number;
  enabled?: boolean;
}

// 메탈릭 속성을 가진 머테리얼 확장 인터페이스
interface MaterialWithMetallicProps extends Material {
  metalness?: number;
  roughness?: number;
  color?: Color;
  map?: Texture;
  normalMap?: Texture;
  normalScale?: Vector2;
}

export const MetallicMaterial: React.FC<MetallicMaterialProps> = ({
  targetObject,
  metalness = 0.8,
  roughness = 0.2,
  enabled = true
}) => {
  const { modifyMaterial, applyMaterial, resetMaterials } = useMaterialModifier(targetObject);

  useEffect(() => {
    if (enabled) {
      modifyMaterial((material) => {
        // 속성 존재 여부로 체크
        const hasMetal = 'metalness' in material;
        const hasRough = 'roughness' in material;
        
        if (hasMetal && hasRough) {
          // metalness와 roughness 속성이 이미 있는 경우 직접 수정
          (material as MaterialWithMetallicProps).metalness = metalness;
          (material as MaterialWithMetallicProps).roughness = roughness;
        } else {
          // 메탈릭 속성이 없는 경우 새 MeshStandardMaterial 생성

          // 기본 속성 및 텍스처 유지하며 새 머테리얼 생성
          const meshMaterial = new MeshStandardMaterial({
            // 메탈릭 속성 설정
            metalness: metalness,
            roughness: roughness,
          });
          
          // 새 머테리얼 적용
          applyMaterial(meshMaterial);
        }
      });
      
    }
    
    // 컴포넌트 언마운트 시 원래 머테리얼로 복원
    return () => {
      if (enabled) {
        resetMaterials();
      }
    };
  }, [enabled, metalness, roughness, modifyMaterial, applyMaterial, resetMaterials]);

  return null;
}; 