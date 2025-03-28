import React, { useEffect, useCallback, useMemo } from "react";
import {
  ShaderMaterial,
  Color,
  DoubleSide,
  UniformsUtils,
  UniformsLib,
} from "three";
import {
  BaseMaterialProps,
  useMaterialModifier,
} from "../../../hooks/useMaterialModifier";
import vertexShader from "./shaders/checkerboard.vert.glsl";
import fragmentShader from "./shaders/checkerboard.frag.glsl";

// 체커보드 머테리얼 속성 정의
interface CheckerboardMaterialProps extends BaseMaterialProps {
  color1?: string;
  color2?: string;
  scale?: number;
}

// // 버텍스 쉐이더 코드 - 스키닝 지원
// const VERTEX_SHADER = `
//   #include <common>
//   #include <uv_pars_vertex>
//   #include <skinning_pars_vertex>
//   #include <logdepthbuf_pars_vertex>
//   #include <clipping_planes_pars_vertex>

//   varying vec3 vPosition; // 로컬 위치 저장 (모델 공간)

//   void main() {
//     #include <skinbase_vertex>
//     #include <begin_vertex>
//     #include <skinning_vertex>

//     // transformed는 스키닝이 적용된 로컬 정점 위치
//     vPosition = transformed;

//     #include <project_vertex>
//     #include <logdepthbuf_vertex>
//     #include <clipping_planes_vertex>
//   }
// `;

// // 프래그먼트 쉐이더 코드 - 체커보드 패턴 생성
// const FRAGMENT_SHADER = `
//   #include <common>
//   #include <packing>
//   #include <fog_pars_fragment>
//   #include <logdepthbuf_pars_fragment>
//   #include <clipping_planes_pars_fragment>

//   uniform vec3 color1;
//   uniform vec3 color2;
//   uniform float scale;

//   varying vec3 vPosition;

//   void main() {
//     #include <clipping_planes_fragment>
//     #include <logdepthbuf_fragment>

//     // 로컬 위치 기반 체커보드 (캐릭터의 로컬 공간에 고정됨)
//     vec2 scaledPos = vPosition.xz * scale * 0.5;
//     vec2 intPos = floor(scaledPos);
//     float pattern = mod(intPos.x + intPos.y, 2.0);

//     // 두 색상 사이를 보간
//     vec3 finalColor = mix(color1, color2, pattern);

//     gl_FragColor = vec4(finalColor, 1.0);

//     #include <fog_fragment>
//   }
// `;

/**
 * 체커보드 패턴을 가진 쉐이더 머테리얼 컴포넌트
 * 캐릭터 모델의 애니메이션을 지원하는 스키닝 기능 포함
 */
export const CheckerboardMaterial: React.FC<CheckerboardMaterialProps> = ({
  targetObject,
  color1 = "#ffffff",
  color2 = "#000000",
  scale = 1.0,
  enabled = true,
}) => {
  const { applyMaterial, resetMaterials } = useMaterialModifier(targetObject);

  // 유니폼 객체 생성
  const uniforms = useMemo(() => {
    return UniformsUtils.merge([
      UniformsLib.common,
      UniformsLib.fog,
      {
        color1: { value: new Color(color1) },
        color2: { value: new Color(color2) },
        scale: { value: scale },
      },
    ]);
  }, [color1, color2, scale]);

  // 체커보드 머테리얼 생성 함수
  const createCheckerboardMaterial = useCallback(() => {
    return new ShaderMaterial({
      uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      side: DoubleSide,
      fog: true,
      transparent: false,
    });
  }, [uniforms]);

  // 머테리얼 적용 효과
  useEffect(() => {
    if (!enabled || !targetObject) return;

    // 체커보드 머테리얼 생성 및 적용
    const checkerboardMaterial = createCheckerboardMaterial();
    applyMaterial(checkerboardMaterial);

    // 컴포넌트 언마운트 시 원래 머테리얼로 복원
    return () => {
      resetMaterials();
    };
  }, [
    enabled,
    targetObject,
    createCheckerboardMaterial,
    applyMaterial,
    resetMaterials,
  ]);

  return null;
};
