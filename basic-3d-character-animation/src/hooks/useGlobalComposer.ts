// hooks/useOutlineComposer.ts
import { useThree, useFrame } from "@react-three/fiber";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { useEffect, useState, useRef } from "react";

// 싱글톤 패턴으로 전역 컴포저 관리
let globalComposer: EffectComposer | null = null;

export function useGlobalComposer() {
  const { gl, scene, camera, size } = useThree();
  const [composer, setComposer] = useState<EffectComposer | null>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    // 글로벌 컴포저가 없으면 생성
    if (!globalComposer) {
      console.log("Creating new global composer");
      const newComposer = new EffectComposer(gl);
      const renderPass = new RenderPass(scene, camera);
      newComposer.addPass(renderPass);
      globalComposer = newComposer;
    }

    setComposer(globalComposer);
    isInitializedRef.current = true;

    // 크기 업데이트
    globalComposer.setSize(size.width, size.height);

    return () => {
      // 앱이 종료될 때만 정리 (선택적)
      // if (이 앱이 종료될 때) globalComposer = null;
    };
  }, [gl, scene, camera, size]);

  // 매 프레임마다 전역 컴포저 렌더링
  useFrame(() => {
    if (globalComposer && isInitializedRef.current) {
      // 원래 렌더 타겟 저장
      const currentRenderTarget = gl.getRenderTarget();

      // 컴포저로 렌더링
      gl.setRenderTarget(null);
      globalComposer.render();

      // 원래 렌더 타겟 복원
      gl.setRenderTarget(currentRenderTarget);
    }
  }, 1); // 우선순위 1로 일반 렌더링 이후에 실행

  return composer;
}
