import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { OutlinePass } from "three/addons/postprocessing/OutlinePass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { FXAAShader } from "three/addons/shaders/FXAAShader.js";
import { useGlobalComposer } from "../../hooks/useGlobalComposer";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

// 전역 싱글톤 레퍼런스 (컴포넌트 외부에서 관리)
const globalOutlinePass = {
  instance: null as OutlinePass | null,
  initialized: false,
  patternTexture: null as THREE.Texture | null,
};

interface OutlineMaterialProps {
  targetObject: THREE.Object3D;
  enabled?: boolean;
  edgeStrength?: number;
  edgeGlow?: number;
  edgeThickness?: number;
  pulsePeriod?: number;
  visibleEdgeColor?: string;
  hiddenEdgeColor?: string;
  usePatternTexture?: boolean;
  patternTexturePath?: string;
}

/**
 * 캐릭터나 객체에 아웃라인 효과를 적용하는 컴포넌트 (전역 컴포저 최적화 버전)
 */
export const OutlineMaterial: React.FC<OutlineMaterialProps> = ({
  targetObject,
  enabled = true,
  edgeStrength = 3.0,
  edgeGlow = 0.0,
  edgeThickness = 1.0,
  pulsePeriod = 0,
  visibleEdgeColor = "#ffffff",
  hiddenEdgeColor = "#190a05",
  usePatternTexture = false,
  patternTexturePath = "/textures/tri_pattern.jpg",
}) => {
  const { scene, camera, size } = useThree();
  // 전역 컴포저 사용
  const composer = useGlobalComposer();

  // 속성 변경 감지를 위한 레퍼런스
  const enabledRef = useRef(enabled);
  const visibleEdgeColorObjRef = useRef(new THREE.Color(visibleEdgeColor));
  const hiddenEdgeColorObjRef = useRef(new THREE.Color(hiddenEdgeColor));

  // 전역 OutlinePass 초기화 (단 한번만 실행)
  useEffect(() => {
    if (!composer || globalOutlinePass.initialized) return;

    console.log("전역 아웃라인 패스 초기화");
    globalOutlinePass.initialized = true;

    // OutlinePass 생성 (단 한번만 생성)
    const outlinePass = new OutlinePass(
      new THREE.Vector2(size.width, size.height),
      scene,
      camera
    );

    // 기본 설정값 적용
    outlinePass.edgeGlow = edgeGlow;
    outlinePass.edgeThickness = edgeThickness;
    outlinePass.pulsePeriod = pulsePeriod;
    outlinePass.visibleEdgeColor = visibleEdgeColorObjRef.current;
    outlinePass.hiddenEdgeColor = hiddenEdgeColorObjRef.current;
    outlinePass.usePatternTexture = usePatternTexture;
    outlinePass.selectedObjects = [];

    // 패턴 텍스처 설정
    if (usePatternTexture && patternTexturePath) {
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load(patternTexturePath, (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        globalOutlinePass.patternTexture = texture;
        outlinePass.patternTexture = texture;
      });
    }

    // FXAA 패스 추가
    const fxaaPass = new ShaderPass(FXAAShader);
    fxaaPass.uniforms["resolution"].value.set(1 / size.width, 1 / size.height);

    // 출력 패스 추가
    const outputPass = new OutputPass();

    // 컴포저에 패스 추가 (순서 중요)
    composer.addPass(outlinePass);
    composer.addPass(fxaaPass);
    composer.addPass(outputPass);

    // 전역 레퍼런스에 저장
    globalOutlinePass.instance = outlinePass;

    console.log("아웃라인 패스 설정 완료");
  }, [composer, scene, camera, size.width, size.height]);

  // 초기 렌더링 및 객체 등록 (마운트 시 한 번만 실행)
  useEffect(() => {
    if (!composer || !globalOutlinePass.instance || !targetObject) return;

    // 컴포넌트 마운트 시 enabled가 true인 경우 객체 추가
    if (enabled) {
      console.log(`초기 아웃라인 등록: ${targetObject.name || "unnamed"}`);
      const outlinePass = globalOutlinePass.instance;

      // 이미 있는지 확인 후 추가
      if (!outlinePass.selectedObjects.includes(targetObject)) {
        outlinePass.selectedObjects.push(targetObject);
      }
    }

    // 컴포넌트 언마운트 시 객체 제거
    return () => {
      if (!globalOutlinePass.instance) return;

      console.log(`아웃라인 객체 제거: ${targetObject.name || "unnamed"}`);
      const idx =
        globalOutlinePass.instance.selectedObjects.indexOf(targetObject);
      if (idx !== -1) {
        globalOutlinePass.instance.selectedObjects.splice(idx, 1);
      }
    };
  }, [targetObject, composer, enabled]);

  // 객체 활성화/비활성화 처리
  useEffect(() => {
    if (!composer || !globalOutlinePass.instance || !targetObject) return;

    const outlinePass = globalOutlinePass.instance;
    const wasEnabled = enabledRef.current;
    enabledRef.current = enabled;

    if (!wasEnabled && enabled) {
      // 활성화될 때: 선택 객체 배열에 현재 객체 추가
      console.log(`아웃라인 활성화: ${targetObject.name || "unnamed"}`);
      if (!outlinePass.selectedObjects.includes(targetObject)) {
        outlinePass.selectedObjects.push(targetObject);
      }
    } else if (wasEnabled && !enabled) {
      // 비활성화될 때: 선택 객체 배열에서 현재 객체 제거
      console.log(`아웃라인 비활성화: ${targetObject.name || "unnamed"}`);
      const idx = outlinePass.selectedObjects.indexOf(targetObject);
      if (idx !== -1) {
        outlinePass.selectedObjects.splice(idx, 1);
      }
    }
  }, [enabled, targetObject, composer]);

  // 색상 업데이트 처리
  useEffect(() => {
    if (!globalOutlinePass.instance) return;

    visibleEdgeColorObjRef.current.set(visibleEdgeColor);
    globalOutlinePass.instance.visibleEdgeColor.copy(
      visibleEdgeColorObjRef.current
    );
  }, [visibleEdgeColor]);

  useEffect(() => {
    if (!globalOutlinePass.instance) return;

    hiddenEdgeColorObjRef.current.set(hiddenEdgeColor);
    globalOutlinePass.instance.hiddenEdgeColor.copy(
      hiddenEdgeColorObjRef.current
    );
  }, [hiddenEdgeColor]);

  // 아웃라인 설정 업데이트 (글로벌 설정 업데이트)
  useEffect(() => {
    if (!globalOutlinePass.instance) return;

    // 중요: 여기서는 모든 객체가 동일한 설정을 공유함
    globalOutlinePass.instance.edgeStrength = edgeStrength;
    globalOutlinePass.instance.edgeGlow = edgeGlow;
    globalOutlinePass.instance.edgeThickness = edgeThickness;
    globalOutlinePass.instance.pulsePeriod = pulsePeriod;
    globalOutlinePass.instance.usePatternTexture = usePatternTexture;

    // 패턴 텍스처 설정
    if (
      usePatternTexture &&
      !globalOutlinePass.instance.patternTexture &&
      globalOutlinePass.patternTexture
    ) {
      globalOutlinePass.instance.patternTexture =
        globalOutlinePass.patternTexture;
    }
  }, [edgeStrength, edgeGlow, edgeThickness, pulsePeriod, usePatternTexture]);

  // 크기 변경 시 처리
  useEffect(() => {
    if (!globalOutlinePass.instance) return;

    // 아웃라인 패스 크기 업데이트
    globalOutlinePass.instance.resolution.set(size.width, size.height);
  }, [size.width, size.height]);

  return null;
};
