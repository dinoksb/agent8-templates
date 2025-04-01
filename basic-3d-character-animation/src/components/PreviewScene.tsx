import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { Canvas } from "@react-three/fiber";
import { Character } from "./character/Character";
import { CharacterResource } from "../types/characterResource";
import { Environment, OrbitControls } from "@react-three/drei";
import { CharacterAction } from "../constants/character.constant.ts";
import { CharacterOutline, OutlineProps } from "./effects/OutlineEffect.tsx";
import * as THREE from "three";

/**
 * Simple 3D character preview scene
 */
const PreviewScene: React.FC = () => {
  // 효과 상태 관리
  const [effectsEnabled, setEffectsEnabled] = useState({
    outline: true, // 아웃라인 기본 활성화
  });

  // 캐릭터 모델 참조
  const characterRef = useRef<THREE.Group>(null);

  const [currentAction, setCurrentAction] = useState<CharacterAction>(
    CharacterAction.IDLE
  );
  const currentActionRef = useRef<CharacterAction>(CharacterAction.IDLE);

  // 아웃라인 효과 설정
  const outlineProps = useMemo<OutlineProps>(
    () => ({
      enabled: effectsEnabled.outline,
      color: "black",
      thickness: 1.5,
      opacity: 0.8,
    }),
    [effectsEnabled.outline]
  );

  // 효과 토글 핸들러
  const toggleEffect = (effectName: string) => {
    setEffectsEnabled((prev) => ({
      ...prev,
      [effectName]: !prev[effectName],
    }));
  };

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

          {/* Character group */}
          <group scale={2} position={[0, -1.75, 0]} ref={characterRef}>
            <Character
              characterResource={characterResource}
              currentActionRef={currentActionRef}
              onAnimationComplete={handleAnimationComplete}
            />

            {/* 아웃라인 효과 적용 */}
            <CharacterOutline
              modelRef={characterRef}
              outlineProps={outlineProps}
            />
          </group>

          {/* Simple camera controls */}
          <OrbitControls enablePan={false} minDistance={3} maxDistance={8} />
        </Canvas>
      </div>

      {/* 효과 컨트롤 버튼 */}
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
          효과 설정
        </h3>
        <button
          style={{
            padding: "8px 16px",
            backgroundColor: effectsEnabled.outline ? "#27ae60" : "#555",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
          onClick={() => toggleEffect("outline")}
        >
          아웃라인 {effectsEnabled.outline ? "ON" : "OFF"}
        </button>
      </div>

      {/* 애니메이션 컨트롤 버튼 */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "10px",
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
    </div>
  );
};

export default PreviewScene;
