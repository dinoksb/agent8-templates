import React, { useEffect } from "react";
import {
  ShaderMaterial,
  Color,
  DoubleSide,
  Vector2,
  UniformsUtils,
  UniformsLib,
  SkinnedMesh,
} from "three";
import {
  BaseMaterialProps,
  useMaterialModifier,
} from "../../hooks/useMaterialModifier";

interface CheckerboardMaterialProps extends BaseMaterialProps {
  color1?: string;
  color2?: string;
  scale?: number;
}

export const CheckerboardMaterial: React.FC<CheckerboardMaterialProps> = ({
  targetObject,
  color1 = "#ffffff",
  color2 = "#000000",
  scale = 1.0,
  enabled = true,
}) => {
  const { modifyMaterial, applyMaterial, resetMaterials } =
    useMaterialModifier(targetObject);

  useEffect(() => {
    if (enabled && targetObject) {
      console.log("Creating skinned checkerboard material for", targetObject);

      // 기본 유니폼을 결합한 유니폼 생성
      const uniforms = UniformsUtils.merge([
        UniformsLib.common,
        UniformsLib.fog,
        {
          color1: { value: new Color(color1) },
          color2: { value: new Color(color2) },
          scale: { value: scale },
          resolution: { value: new Vector2(1024, 1024) },
        },
      ]);

      // 스키닝 지원하는 버텍스 쉐이더
      const skinnedVertexShader = `
        #include <common>
        #include <uv_pars_vertex>
        #include <skinning_pars_vertex>
        #include <logdepthbuf_pars_vertex>
        #include <clipping_planes_pars_vertex>
        
        varying vec2 vUv;
        varying vec3 vPosition; // 로컬 위치 저장 (모델 공간)
        
        void main() {
          vUv = uv;
          
          #include <skinbase_vertex>
          #include <begin_vertex>
          #include <skinning_vertex>
          
          // transformed는 스키닝이 적용된 로컬 정점 위치
          vPosition = transformed;
          
          #include <project_vertex>
          #include <logdepthbuf_vertex>
          #include <clipping_planes_vertex>
        }
      `;

      // 프래그먼트 쉐이더
      const fragmentShader = `
        #include <common>
        #include <packing>
        #include <fog_pars_fragment>
        #include <logdepthbuf_pars_fragment>
        #include <clipping_planes_pars_fragment>
        
        uniform vec3 color1;
        uniform vec3 color2;
        uniform float scale;
        uniform vec2 resolution;
        
        varying vec2 vUv;
        varying vec3 vPosition;
        
        void main() {
          #include <clipping_planes_fragment>
          #include <logdepthbuf_fragment>
          
          // UV 기반 체커보드 (캐릭터의 UV 매핑에 따라 달라짐)
          vec2 scaledUV = vUv * scale;
          vec2 intUV = floor(scaledUV);
          float patternUV = mod(intUV.x + intUV.y, 2.0);
          
          // 로컬 위치 기반 체커보드 (캐릭터의 로컬 공간에 고정됨)
          vec2 scaledPos = vPosition.xz * scale * 0.5;
          vec2 intPos = floor(scaledPos);
          float patternPos = mod(intPos.x + intPos.y, 2.0);
          
          // 최종 패턴 선택 - 로컬 위치 기반 패턴 사용
          float pattern = patternPos;
          
          // 두 색상 사이를 보간
          vec3 finalColor = mix(color1, color2, pattern);
          
          gl_FragColor = vec4(finalColor, 1.0);
          
          #include <fog_fragment>
        }
      `;

      // 쉐이더 머테리얼 생성
      const checkerboardMaterial = new ShaderMaterial({
        uniforms: uniforms,
        vertexShader: skinnedVertexShader,
        fragmentShader: fragmentShader,
        side: DoubleSide,
        fog: true,
        transparent: false,
      });

      console.log("Skinned checkerboard material created");

      // 메시가 SkinnedMesh인지 확인하고 처리하는 방식으로 수정
      let hasSkinnedMesh = false;

      targetObject.traverse((object) => {
        if (object instanceof SkinnedMesh) {
          hasSkinnedMesh = true;
          console.log("SkinnedMesh found in the model");
        }
      });

      if (hasSkinnedMesh) {
        console.log("Model contains skinned meshes, applying skinned material");
      }

      applyMaterial(checkerboardMaterial);
    }

    return () => {
      if (enabled) {
        console.log("Resetting materials");
        resetMaterials();
      }
    };
  }, [
    enabled,
    targetObject,
    color1,
    color2,
    scale,
    modifyMaterial,
    applyMaterial,
    resetMaterials,
  ]);

  return null;
};
