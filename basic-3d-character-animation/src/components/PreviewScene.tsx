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
import { MaterialType } from "../constants/material.constant";
import { MetallicMaterial } from "./materials/MetallicMaterial";
import { ToonMaterial } from "./materials/ToonMaterial";
import * as THREE from 'three';


/**
 * Simple 3D character preview scene
 */
const PreviewScene: React.FC = () => {
  const [currentAction, setCurrentAction] = useState<CharacterAction>(
    CharacterAction.IDLE
  );
  const [currentMaterial, setCurrentMaterial] = useState<MaterialType>(MaterialType.DEFAULT);
  const currentActionRef = useRef<CharacterAction>(CharacterAction.IDLE);
  const characterRef = useRef<THREE.Group>(null);

  // 머테리얼 변경 시 처리 로직
  const handleMaterialChange = useCallback((materialType: MaterialType) => {
    // 현재 머테리얼에서 다른 머테리얼로 변경될 때만 처리
    if (currentMaterial === materialType) return;
    
    // 현재 머테리얼 상태 업데이트
    setCurrentMaterial(materialType);
    
    // materialType이 변경될 때마다 characterRef가 확실히 설정되어 있는지 확인
    if (!characterRef.current) return;
    
    // 여기서 MaterialType에 따라 필요한 추가 처리를 수행할 수 있음
    console.log(`Changing material from ${currentMaterial} to: ${materialType}`);
  }, [currentMaterial]);

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
      url: "https://agent8-games.verse8.io/assets/3d/characters/space-marine.glb",
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
          </group>

          {characterRef.current && (
            <MetallicMaterial 
              targetObject={characterRef.current} 
              metalness={0.1} 
              roughness={0.2} 
              enabled={currentMaterial === MaterialType.METALLIC}
            />
          )}

          {characterRef.current && (
            <ToonMaterial 
              targetObject={characterRef.current} 
              enabled={currentMaterial === MaterialType.TOON}
              // color="#ffffff"
            />
          )}
          
          {/* Simple camera controls */}
          <OrbitControls enablePan={false} minDistance={3} maxDistance={8} />
        </Canvas>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          width: "800px",
        }}
      >
        {/* Material Controls */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "10px",
          }}
        >
          {Object.values(MaterialType).map((materialType) => (
            <button
              key={materialType}
              style={{
                padding: "8px 16px",
                backgroundColor:
                  currentMaterial === materialType ? "#2980b9" : "#3498db",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
              onClick={() => handleMaterialChange(materialType)}
            >
              {materialType}
            </button>
          ))}
        </div>

        {/* Animation Controls */}
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
    </div>
  );
};

export default PreviewScene;
