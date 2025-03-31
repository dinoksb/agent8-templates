import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Character } from "./character/Character";
import { CharacterResource } from "../types/characterResource";
import { Environment, OrbitControls } from "@react-three/drei";
import { CharacterAction } from "../constants/character.constant.ts";
import {
  EffectComposer,
  Bloom,
  Noise,
  Vignette,
  DepthOfField,
  Pixelation,
  Glitch,
  Sepia,
  Scanline,
  ColorAverage,
  SMAA,
} from "@react-three/postprocessing";
import { BlendFunction, GlitchMode } from "postprocessing";
import * as THREE from "three";
import { Vector2 } from "three";
import { useTrailEffect } from "../hooks/useTrailEffect.tsx";

/**
 * Simple 3D character preview scene
 */
const PreviewScene: React.FC = () => {
  // 포스트 프로세싱 효과 활성화 상태
  const [effectsEnabled, setEffectsEnabled] = useState({
    bloom: false,
    noise: false,
    vignette: false,
    depthOfField: false,
    pixelation: false,
    glitch: false,
    sepia: false,
    scanline: false,
    colorAverage: false,
    smaa: false,
    trail: false,
  });

  const [currentAction, setCurrentAction] = useState<CharacterAction>(
    CharacterAction.IDLE
  );
  const currentActionRef = useRef<CharacterAction>(CharacterAction.IDLE);

  // Update currentActionRef when currentAction state changes
  useEffect(() => {
    currentActionRef.current = currentAction;
  }, [currentAction]);

  // Handle animation completion
  const handleAnimationComplete = useCallback((action: CharacterAction) => {
    console.log(`Animation ${action} completed`);

    // Transition to appropriate next state after animation completion
    switch (action) {
      case CharacterAction.JUMP_UP:
        // Transition to FALL_IDLE after JUMP_UP animation completes
        console.log("Transitioning from JUMP_UP to FALL_IDLE");
        setCurrentAction(CharacterAction.FALL_IDLE);
        break;

      case CharacterAction.FALL_DOWN:
        // Transition to IDLE after FALL_DOWN animation completes
        console.log("Transitioning from FALL_DOWN to IDLE");
        setCurrentAction(CharacterAction.IDLE);
        break;

      default:
        // Do nothing by default
        break;
    }
  }, []);

  const characterResource: CharacterResource = useMemo(
    () => ({
      name: "Default Character",
      url: "https://agent8-games.verse8.io/assets/3d/characters/human/space-marine.glb",
      animations: {
        IDLE: "https://agent8-games.verse8.io/assets/3d/animations/mixamorig/idle.glb",
        WALK: "https://agent8-games.verse8.io/assets/3d/animations/mixamorig/walk.glb",
        RUN: "https://agent8-games.verse8.io/assets/3d/animations/mixamorig/run.glb",
        JUMP_UP:
          "https://agent8-games.verse8.io/assets/3d/animations/mixamorig/jump-up.glb",
        FALL_IDLE:
          "https://agent8-games.verse8.io/assets/3d/animations/mixamorig/fall-idle.glb",
        FALL_DOWN:
          "https://agent8-games.verse8.io/assets/3d/animations/mixamorig/fall-down.glb",
        PUNCH:
          "https://agent8-games.verse8.io/assets/3d/animations/mixamorig/punch.glb",
        MELEE_ATTACK:
          "https://agent8-games.verse8.io/assets/3d/animations/mixamorig/melee-attack.glb",
        AIM: "https://agent8-games.verse8.io/assets/3d/animations/mixamorig/aimming.glb",
        SHOOT:
          "https://agent8-games.verse8.io/assets/3d/animations/mixamorig/shoot.glb",
        AIM_RUN:
          "https://agent8-games.verse8.io/assets/3d/animations/mixamorig/shoot-run.glb",
        HIT: "https://agent8-games.verse8.io/assets/3d/animations/mixamorig/hit.glb",
        DIE: "https://agent8-games.verse8.io/assets/3d/animations/mixamorig/death.glb",
      },
    }),
    []
  );

  // 효과 토글 핸들러
  const toggleEffect = (effectName) => {
    setEffectsEnabled((prev) => {
      const newState = {
        ...prev,
        [effectName]: !prev[effectName],
      };

      // If enabling trails, automatically enable bloom for better visibility
      if (effectName === "trail" && !prev.trail) {
        newState.bloom = true;
      }

      return newState;
    });
  };

  // Glitch 효과를 위한 값 생성
  const glitchDelay = useMemo(() => new Vector2(1.5, 3.5), []);
  const glitchDuration = useMemo(() => new Vector2(0.6, 1.0), []);
  const glitchStrength = useMemo(() => new Vector2(0.3, 1.0), []);

  // 캐릭터 그룹에 대한 참조
  const characterGroupRef = useRef(null);

  // Character 컴포넌트와 Trail을 통합한 컴포넌트
  const CharacterWithTrails: React.FC<{
    characterResource: CharacterResource;
    currentActionRef: React.RefObject<CharacterAction>;
    onAnimationComplete: (action: CharacterAction) => void;
  }> = ({ characterResource, currentActionRef, onAnimationComplete }) => {
    const characterRef = useRef<THREE.Group>(null);

    // 본 위치를 저장할 상태 (로컬 좌표계)
    const [boneLocalPosition, setBoneLocalPosition] =
      useState<THREE.Vector3 | null>(null);

    // 트레일 생성을 위한 훅 - 위치만 전달
    const { createTrail } = useTrailEffect(null, {
      position: boneLocalPosition,
    });

    // 매 프레임마다 본 위치 계산
    useFrame(() => {
      if (!characterRef.current || !characterGroupRef.current) return;

      // 모델에서 몸통 본 찾기
      let foundBone: THREE.Bone | null = null;

      characterRef.current.traverse((object) => {
        if (
          object.type === "SkinnedMesh" &&
          (object as THREE.SkinnedMesh).skeleton
        ) {
          const skeleton = (object as THREE.SkinnedMesh).skeleton;

          // 몸통 본 이름들 (우선순위 순서대로)
          const bodyBoneNames = [
            "spine",
            "spine1",
            "waist",
            "hips",
            "pelvis",
            "torso",
            "body",
            "abdomen",
            "Hips",
          ];

          // 몸통 본 찾기
          for (const boneName of bodyBoneNames) {
            const bone = skeleton.bones.find((b) =>
              b.name.toLowerCase().includes(boneName.toLowerCase())
            );

            if (bone) {
              foundBone = bone;
              break;
            }
          }
        }
      });

      // 월드 좌표 계산
      const worldPos = new THREE.Vector3();

      // 본을 찾았으면 본의 위치 계산
      if (foundBone) {
        // 본의 월드 매트릭스 업데이트
        foundBone.updateWorldMatrix(true, false);

        // 본의 월드 위치 구하기
        foundBone.getWorldPosition(worldPos);
      }
      // 본을 찾지 못했을 경우 캐릭터 위치를 사용
      else {
        characterRef.current.getWorldPosition(worldPos);
      }

      // 캐릭터 그룹의 로컬 좌표계로 변환
      // characterGroupRef의 월드 투 로컬 변환 매트릭스
      const groupWorldMatrix = new THREE.Matrix4();
      characterGroupRef.current.updateWorldMatrix(true, false);
      groupWorldMatrix.copy(characterGroupRef.current.matrixWorld).invert();

      // 월드 좌표를 캐릭터 그룹 기준의 로컬 좌표로 변환
      const localPos = worldPos.clone().applyMatrix4(groupWorldMatrix);

      // 변환된 로컬 위치 업데이트
      setBoneLocalPosition(localPos);
    });

    return (
      <>
        <group ref={characterRef}>
          <Character
            characterResource={characterResource}
            currentActionRef={currentActionRef}
            onAnimationComplete={onAnimationComplete}
          />
        </group>

        {/* 트레일 효과가 활성화된 경우에만 트레일 렌더링 */}
        {effectsEnabled.trail && createTrail()}
      </>
    );
  };

  return (
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <div
        style={{
          width: "800px",
          height: "450px",
          backgroundColor: "#2b2b2b",
          marginBottom: "20px",
          borderRadius: "8px",
          overflow: "hidden",
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
        }}
      >
        <Canvas camera={{ position: [0, 0, 5], fov: 50 }} shadows>
          {/* Simple ambient light for base illumination */}
          <ambientLight intensity={0.7} />

          {/* Main directional light with shadows */}
          <directionalLight
            position={[5, 5, 5]}
            intensity={1.2}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />

          {/* Environment map for nice reflections */}
          <Environment preset="sunset" background={false} />

          {/* Character group with Trail effect */}
          <group ref={characterGroupRef} scale={2} position={[0, -1.75, 0]}>
            <CharacterWithTrails
              characterResource={characterResource}
              currentActionRef={currentActionRef}
              onAnimationComplete={handleAnimationComplete}
            />
          </group>

          {/*
           * EffectComposer is required to apply any post-processing effects
           * All post-processing effects must be children of EffectComposer
           */}
          <EffectComposer>
            {/*
             * Bloom adds a glow effect to bright areas of the scene
             * Parameters:
             * - intensity: Controls the strength of the glow
             * - luminanceThreshold: Minimum luminance value that will cause bloom
             * - luminanceSmoothing: How smoothly the bloom transitions
             * - mipmapBlur: Enables mipmap-based blur for better performance
             */}
            {effectsEnabled.bloom && (
              <Bloom
                intensity={1.5}
                luminanceThreshold={0.2}
                luminanceSmoothing={0.9}
                mipmapBlur
              />
            )}

            {/*
             * Noise adds film grain or static noise to the image
             * Parameters:
             * - opacity: Controls the intensity of the noise
             * - blendFunction: Determines how the noise blends with the scene
             */}
            {effectsEnabled.noise && (
              <Noise opacity={0.2} blendFunction={BlendFunction.OVERLAY} />
            )}

            {/*
             * Vignette darkens the edges of the screen
             * Parameters:
             * - eskil: Controls the algorithm used
             * - offset: How far the vignette extends from the edges
             * - darkness: Intensity of the darkening effect
             */}
            {effectsEnabled.vignette && (
              <Vignette eskil={false} offset={0.5} darkness={0.9} />
            )}

            {/*
             * DepthOfField simulates camera focus
             * Parameters:
             * - focusDistance: Distance to the focus point
             * - focalLength: Controls how quickly things blur with distance
             * - bokehScale: Size of the bokeh effect for out-of-focus areas
             */}
            {effectsEnabled.depthOfField && (
              <DepthOfField
                focusDistance={0.02}
                focalLength={0.05}
                bokehScale={2}
              />
            )}

            {/*
             * Pixelation creates a retro pixelated look
             * Parameters:
             * - granularity: Controls the size of the pixels (higher = larger pixels)
             */}
            {effectsEnabled.pixelation && <Pixelation granularity={5} />}

            {/*
             * Glitch creates digital distortion effects
             * Parameters:
             * - delay: Range of time between glitches (as Vector2)
             * - duration: Range of glitch duration (as Vector2)
             * - strength: Strength of the glitch effect (as Vector2)
             * - mode: Type of glitch effect (CONSTANT, SPORADIC, DISABLED)
             */}
            {effectsEnabled.glitch && (
              <Glitch
                delay={glitchDelay}
                duration={glitchDuration}
                strength={glitchStrength}
                mode={GlitchMode.SPORADIC}
              />
            )}

            {/*
             * Sepia gives the scene an old, vintage brownish tint
             * Parameters:
             * - intensity: Controls the strength of the sepia effect
             */}
            {effectsEnabled.sepia && (
              <Sepia intensity={0.8} blendFunction={BlendFunction.NORMAL} />
            )}

            {/*
             * Scanline adds horizontal lines like on old CRT monitors
             * Parameters:
             * - density: Number of scanlines
             * - opacity: Intensity of the scanlines
             */}
            {effectsEnabled.scanline && (
              <Scanline density={1.25} opacity={0.35} />
            )}

            {/*
             * ColorAverage averages all colors in the scene, useful for simpler color schemes
             * Parameters:
             * - blendFunction: How the effect is applied
             */}
            {effectsEnabled.colorAverage && (
              <ColorAverage blendFunction={BlendFunction.NORMAL} />
            )}

            {/*
             * SMAA (Subpixel Morphological Anti-Aliasing) reduces jagged edges
             * This is often applied as the last effect in the pipeline
             */}
            {effectsEnabled.smaa && <SMAA />}
          </EffectComposer>

          {/* Simple camera controls */}
          <OrbitControls enablePan={false} minDistance={3} maxDistance={8} />
        </Canvas>
      </div>

      {/* 애니메이션 컨트롤 버튼 */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "10px",
          marginBottom: "20px",
        }}
      >
        {Object.values(CharacterAction)
          .filter((action) => typeof action === "string")
          .map((action) => (
            <button
              key={action}
              style={{
                padding: "8px 16px",
                backgroundColor:
                  currentAction === action ? "#2980b9" : "#3498db",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
              onClick={() => setCurrentAction(action as CharacterAction)}
            >
              {action}
            </button>
          ))}
      </div>

      {/* 포스트 프로세싱 효과 컨트롤 패널 */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "10px",
          marginBottom: "20px",
          backgroundColor: "#333",
          padding: "15px",
          borderRadius: "8px",
          maxWidth: "800px",
        }}
      >
        <h3
          style={{
            width: "100%",
            textAlign: "center",
            margin: "0 0 10px 0",
            color: "white",
          }}
        >
          포스트 프로세싱 효과
        </h3>
        <button
          style={{
            padding: "8px 16px",
            backgroundColor: effectsEnabled.bloom ? "#27ae60" : "#555",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
          onClick={() => toggleEffect("bloom")}
        >
          Bloom {effectsEnabled.bloom ? "ON" : "OFF"}
        </button>
        <button
          style={{
            padding: "8px 16px",
            backgroundColor: effectsEnabled.noise ? "#27ae60" : "#555",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
          onClick={() => toggleEffect("noise")}
        >
          Noise {effectsEnabled.noise ? "ON" : "OFF"}
        </button>
        <button
          style={{
            padding: "8px 16px",
            backgroundColor: effectsEnabled.vignette ? "#27ae60" : "#555",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
          onClick={() => toggleEffect("vignette")}
        >
          Vignette {effectsEnabled.vignette ? "ON" : "OFF"}
        </button>
        <button
          style={{
            padding: "8px 16px",
            backgroundColor: effectsEnabled.depthOfField ? "#27ae60" : "#555",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
          onClick={() => toggleEffect("depthOfField")}
        >
          Depth of Field {effectsEnabled.depthOfField ? "ON" : "OFF"}
        </button>
        <button
          style={{
            padding: "8px 16px",
            backgroundColor: effectsEnabled.pixelation ? "#27ae60" : "#555",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
          onClick={() => toggleEffect("pixelation")}
        >
          Pixelation {effectsEnabled.pixelation ? "ON" : "OFF"}
        </button>
        <button
          style={{
            padding: "8px 16px",
            backgroundColor: effectsEnabled.glitch ? "#27ae60" : "#555",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
          onClick={() => toggleEffect("glitch")}
        >
          Glitch {effectsEnabled.glitch ? "ON" : "OFF"}
        </button>
        <button
          style={{
            padding: "8px 16px",
            backgroundColor: effectsEnabled.sepia ? "#27ae60" : "#555",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
          onClick={() => toggleEffect("sepia")}
        >
          Sepia {effectsEnabled.sepia ? "ON" : "OFF"}
        </button>
        <button
          style={{
            padding: "8px 16px",
            backgroundColor: effectsEnabled.scanline ? "#27ae60" : "#555",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
          onClick={() => toggleEffect("scanline")}
        >
          Scanline {effectsEnabled.scanline ? "ON" : "OFF"}
        </button>
        <button
          style={{
            padding: "8px 16px",
            backgroundColor: effectsEnabled.colorAverage ? "#27ae60" : "#555",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
          onClick={() => toggleEffect("colorAverage")}
        >
          Color Average {effectsEnabled.colorAverage ? "ON" : "OFF"}
        </button>
        <button
          style={{
            padding: "8px 16px",
            backgroundColor: effectsEnabled.smaa ? "#27ae60" : "#555",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
          onClick={() => toggleEffect("smaa")}
        >
          Anti-Aliasing (SMAA) {effectsEnabled.smaa ? "ON" : "OFF"}
        </button>
        <button
          style={{
            padding: "8px 16px",
            backgroundColor: effectsEnabled.trail ? "#27ae60" : "#555",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
          onClick={() => toggleEffect("trail")}
        >
          Trail Effect {effectsEnabled.trail ? "ON" : "OFF"}
        </button>
      </div>
    </div>
  );
};

export default PreviewScene;
