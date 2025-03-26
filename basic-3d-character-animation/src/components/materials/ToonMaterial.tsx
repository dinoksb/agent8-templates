import React, { useEffect, useMemo } from 'react';
import { Object3D, MeshToonMaterial, Color, Texture, Material, Vector2 } from 'three';
import { useMaterialModifier } from '../../hooks/useMaterialModifier';

interface ToonMaterialProps {
  targetObject: Object3D;
  enabled?: boolean;
  color?: string;
}

// 툰 머테리얼에서 필요한 속성들만 정의
interface MaterialWithTextureProps extends Material {
  map?: Texture;
  normalMap?: Texture;
  normalScale?: Vector2;
}

export const ToonMaterial: React.FC<ToonMaterialProps> = ({
  targetObject,
  enabled = true,
  color = '#ffffff'
}) => {
  const { modifyMaterial, applyMaterial, resetMaterials } = useMaterialModifier(targetObject);
  
  // 그라디언트 맵을 메모이제이션
  const gradientMap = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 1;
    const ctx = canvas.getContext('2d')!;

    // 그라디언트 생성
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0.0, '#000000');  // 그림자
    gradient.addColorStop(0.5, '#808080');  // 중간톤
    gradient.addColorStop(1.0, '#ffffff');  // 하이라이트

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const texture = new Texture(canvas);
    texture.needsUpdate = true;

    return texture;
  }, []);

  useEffect(() => {
    if (enabled) {
      modifyMaterial((material) => {
        if (material instanceof MeshToonMaterial) {
          material.color.setStyle(color);
          material.gradientMap = gradientMap;
        } else {
          const baseMaterial = material as MaterialWithTextureProps;
          // 새로운 MeshToonMaterial 생성
          const toonMaterial = new MeshToonMaterial({
            color: new Color(color),
            gradientMap: gradientMap,
            map: baseMaterial.map,
            normalMap: baseMaterial.normalMap,
            normalScale: baseMaterial.normalScale,
          });
          // 새로운 머테리얼 적용
          applyMaterial(toonMaterial);
        }
      });
    }
    
    // 컴포넌트 언마운트 시 원래 머테리얼로 복원
    return () => {
      if (enabled) {
        resetMaterials();
      }
    };
  }, [enabled, color, modifyMaterial, applyMaterial, resetMaterials, gradientMap]);

  return null;
}; 