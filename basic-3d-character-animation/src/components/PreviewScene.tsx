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
import { Environment, OrbitControls, Trail } from "@react-three/drei";
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
import { Vector2, Vector3 } from "three";

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

  // Trail 관련 컴포넌트
  const CharacterWithTrail = ({ children }) => {
    const characterRef = useRef<THREE.Group>(null);
    const [bones, setBones] = useState(null);

    // Find skeleton and bones after character loads
    useEffect(() => {
      if (!characterRef.current) return;

      const findSkeleton = () => {
        let skeleton = null;

        // 모든 bone들의 이름을 로그에 기록 (디버깅 용도)
        console.log("Character group contents:");
        characterRef.current.traverse((obj) => {
          console.log(`Object: ${obj.name}, Type: ${obj.type}`);
        });

        characterRef.current.traverse((object) => {
          if (
            object.type === "SkinnedMesh" &&
            (object as THREE.SkinnedMesh).skeleton
          ) {
            skeleton = (object as THREE.SkinnedMesh).skeleton;

            // 본 이름 출력
            console.log(
              "All bones in skeleton:",
              skeleton.bones.map((bone) => bone.name).join(", ")
            );
          }
        });
        return skeleton;
      };

      // Try to find the skeleton for a few frames as it might not be available immediately
      const checkInterval = setInterval(() => {
        const skeleton = findSkeleton();
        if (skeleton) {
          console.log("Found skeleton with bones:", skeleton.bones.length);

          // Find bones by name patterns - expanded patterns to catch more variations
          const findBoneByPattern = (patterns) => {
            for (const pattern of patterns) {
              const bone = skeleton.bones.find((b) =>
                b.name.toLowerCase().includes(pattern.toLowerCase())
              );
              if (bone) {
                console.log(
                  `Found bone with pattern '${pattern}': ${bone.name}`
                );
                return bone;
              }
            }
            return null;
          };

          // Look for specific bones - 본 이름 패턴 확장
          const foundBones = {
            head: findBoneByPattern([
              "head",
              "neck",
              "mixamorigHead",
              "mixamorigNeck",
              "spine2",
              "face",
              "skull",
              "Neck",
            ]),
            leftHand: findBoneByPattern([
              "lefthand",
              "hand_l",
              "handleft",
              "mixamorigLeftHand",
              "left_hand",
              "handl",
              "LeftHand",
              "Hand_L",
              "Palm_L",
              "Lwrist",
            ]),
            rightHand: findBoneByPattern([
              "righthand",
              "hand_r",
              "handright",
              "mixamorigRightHand",
              "right_hand",
              "handr",
              "RightHand",
              "Hand_R",
              "Palm_R",
              "Rwrist",
            ]),
            leftFoot: findBoneByPattern([
              "leftfoot",
              "foot_l",
              "footleft",
              "mixamorigLeftFoot",
              "left_foot",
              "footl",
              "LeftFoot",
              "Foot_L",
              "lAnkle",
            ]),
            rightFoot: findBoneByPattern([
              "rightfoot",
              "foot_r",
              "footright",
              "mixamorigRightFoot",
              "right_foot",
              "footr",
              "RightFoot",
              "Foot_R",
              "rAnkle",
            ]),
          };

          setBones(foundBones);
          clearInterval(checkInterval);
        }
      }, 100);

      // Clean up interval
      return () => clearInterval(checkInterval);
    }, []);

    // 본 위치를 트랙킹하는 컴포넌트
    const BoneTracker = ({
      bone,
      color,
      width,
      length,
      decay,
      attenuation,
    }) => {
      const trailPointRef = useRef<THREE.Mesh>(null);

      // 본 위치 트래킹
      useFrame(() => {
        if (bone && trailPointRef.current && characterRef.current) {
          // 본과 관련된 모든 매트릭스를 업데이트
          bone.updateWorldMatrix(true, false);

          // 본의 월드 위치를 구함
          const worldPos = new Vector3();
          bone.getWorldPosition(worldPos);

          // 캐릭터 그룹의 월드 투 로컬 변환 매트릭스
          // 참고: 캐릭터 그룹은 scale={2} position={[0, -1.75, 0]} 변환이 적용됨
          // 이 변환의 역을 적용하여 본의 위치를 캐릭터 그룹 로컬 좌표계로 변환
          const groupWorldMatrix = new THREE.Matrix4();
          characterGroupRef.current.updateWorldMatrix(true, false);
          groupWorldMatrix.copy(characterGroupRef.current.matrixWorld).invert();

          // 캐릭터 그룹 기준의 로컬 위치로 변환
          const localPos = worldPos.clone().applyMatrix4(groupWorldMatrix);

          // 트레일 포인트 위치 업데이트
          trailPointRef.current.position.copy(localPos);
        }
      });

      return (
        <Trail
          width={width}
          color={color}
          length={length}
          decay={decay}
          attenuation={attenuation || ((width) => width * 0.5)}
        >
          <mesh ref={trailPointRef} visible={false}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshBasicMaterial color={color} />
          </mesh>
        </Trail>
      );
    };

    return (
      <>
        <group ref={characterRef}>{children}</group>

        {/* 모든 트레일은 캐릭터 그룹의 자식으로 배치하여 변환을 상속받음 */}
        {effectsEnabled.trail && bones && (
          <>
            {bones.head && (
              <BoneTracker
                bone={bones.head}
                color="#00ffff" // Brighter cyan
                width={1.0} // 더 넓게 수정
                length={7}
                decay={1.2}
                attenuation={(width) => width * 0.8}
              />
            )}
            {bones.leftHand && (
              <BoneTracker
                bone={bones.leftHand}
                color="#ff70ff" // 더 밝은 마젠타
                width={0.9} // 더 넓게 수정
                length={6}
                decay={1.0}
                attenuation={(width) => width * 0.9}
              />
            )}
            {bones.rightHand && (
              <BoneTracker
                bone={bones.rightHand}
                color="#a0ff50" // 더 밝은 라임
                width={0.9} // 더 넓게 수정
                length={6}
                decay={1.0}
                attenuation={(width) => width * 0.9}
              />
            )}
            {bones.leftFoot && (
              <BoneTracker
                bone={bones.leftFoot}
                color="#ffdd40" // 더 밝은 앰버
                width={0.8} // 더 넓게 수정
                length={5}
                decay={1.5}
                attenuation={(width) => width * 0.9}
              />
            )}
            {bones.rightFoot && (
              <BoneTracker
                bone={bones.rightFoot}
                color="#ff8040" // 더 밝은 오렌지
                width={0.8} // 더 넓게 수정
                length={5}
                decay={1.5}
                attenuation={(width) => width * 0.9}
              />
            )}
          </>
        )}
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
            <CharacterWithTrail>
              <Character
                characterResource={characterResource}
                currentActionRef={currentActionRef}
                onAnimationComplete={handleAnimationComplete}
              />
            </CharacterWithTrail>
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
