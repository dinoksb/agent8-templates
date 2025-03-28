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
import { MetallicMaterial } from "./materials/MetallicMaterial.tsx";
import { ToonMaterial } from "./materials/ToonMaterial.tsx";
import { PlasticMaterial } from "./materials/PlasticMaterial.tsx";
import { EmissiveMaterial } from "./materials/EmissiveMaterial.tsx";
import { CheckerboardMaterial } from "./materials/CheckerboardMaterial.tsx";
import * as THREE from "three";

/**
 * Simple 3D character preview scene
 */
const PreviewScene: React.FC = () => {
  const [currentAction, setCurrentAction] = useState<CharacterAction>(
    CharacterAction.IDLE
  );
  const [currentMaterial, setCurrentMaterial] = useState<MaterialType>(
    MaterialType.DEFAULT
  );
  const [checkerboardColor1, setCheckerboardColor1] =
    useState<string>("#ffffff");
  const [checkerboardColor2, setCheckerboardColor2] =
    useState<string>("#000000");
  const [checkerboardScale, setCheckerboardScale] = useState<number>(10);

  const [plasticColor, setPlasticColor] = useState<string>("#3498db"); // 기본 파란색
  const [plasticRoughness, setPlasticRoughness] = useState<number>(0.3);
  const [plasticClearcoat, setPlasticClearcoat] = useState<number>(0.5);
  const [emissiveColor, setEmissiveColor] = useState<string>("#ff0000");
  const [emissiveIntensity, setEmissiveIntensity] = useState<number>(0.5);
  const currentActionRef = useRef<CharacterAction>(CharacterAction.IDLE);
  const characterRef = useRef<THREE.Group>(null);

  // 머테리얼 변경 시 처리 로직
  const handleMaterialChange = useCallback(
    (materialType: MaterialType) => {
      // 현재 머테리얼에서 다른 머테리얼로 변경될 때만 처리
      if (currentMaterial === materialType) return;

      // 현재 머테리얼 상태 업데이트
      setCurrentMaterial(materialType);

      // materialType이 변경될 때마다 characterRef가 확실히 설정되어 있는지 확인
      if (!characterRef.current) return;

      // 여기서 MaterialType에 따라 필요한 추가 처리를 수행할 수 있음
      console.log(
        `Changing material from ${currentMaterial} to: ${materialType}`
      );
    },
    [currentMaterial]
  );

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
      url: "https://agent8-games.verse8.io/assets/3d/characters/human/commando.glb",
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

  // 플라스틱 머테리얼 타입 확인 헬퍼 함수
  const isPlasticMaterial = useCallback((material: MaterialType) => {
    return [
      MaterialType.PLASTIC_GLOSSY,
      MaterialType.PLASTIC_MATTE,
      MaterialType.PLASTIC_TRANSLUCENT,
    ].includes(material);
  }, []);

  // 현재 선택된 플라스틱 머테리얼 타입에 따른 type 값 계산
  const getCurrentPlasticType = useCallback(() => {
    switch (currentMaterial) {
      case MaterialType.PLASTIC_GLOSSY:
        return "glossy";
      case MaterialType.PLASTIC_MATTE:
        return "matte";
      case MaterialType.PLASTIC_TRANSLUCENT:
        return "translucent";
      default:
        return "glossy";
    }
  }, [currentMaterial]);

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
          <group scale={2} position={[0.1, -1, 0.1]} ref={characterRef}>
            <Character
              characterResource={characterResource}
              currentActionRef={currentActionRef}
              onAnimationComplete={handleAnimationComplete}
            />
          </group>

          {/* Apply materials */}
          {characterRef.current && currentMaterial === MaterialType.DEFAULT && (
            <MetallicMaterial
              targetObject={characterRef.current}
              metalness={0.0}
              roughness={0.5}
              enabled={true}
            />
          )}

          {characterRef.current &&
            currentMaterial === MaterialType.METALLIC && (
              <MetallicMaterial
                targetObject={characterRef.current}
                metalness={0.1}
                roughness={0.2}
                enabled={true}
              />
            )}

          {characterRef.current && currentMaterial === MaterialType.TOON && (
            <ToonMaterial targetObject={characterRef.current} enabled={true} />
          )}

          {characterRef.current && isPlasticMaterial(currentMaterial) && (
            <PlasticMaterial
              targetObject={characterRef.current}
              roughness={plasticRoughness}
              color={plasticColor}
              clearcoat={plasticClearcoat}
              transparent={currentMaterial === MaterialType.PLASTIC_TRANSLUCENT}
              opacity={
                currentMaterial === MaterialType.PLASTIC_TRANSLUCENT ? 0.8 : 1.0
              }
              type={getCurrentPlasticType()}
              enabled={true}
            />
          )}

          {characterRef.current &&
            currentMaterial === MaterialType.EMISSIVE && (
              <EmissiveMaterial
                targetObject={characterRef.current}
                emissiveColor={emissiveColor}
                emissiveIntensity={emissiveIntensity}
                preserveOriginal={false}
                enabled={true}
              />
            )}

          {characterRef.current &&
            currentMaterial === MaterialType.CHECKERBOARD && (
              <CheckerboardMaterial
                targetObject={characterRef.current}
                color1={checkerboardColor1}
                color2={checkerboardColor2}
                scale={checkerboardScale}
                enabled={true}
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

        {/* 플라스틱 머테리얼 조절 UI */}
        {isPlasticMaterial(currentMaterial) && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "15px",
              backgroundColor: "#f0f0f0",
              padding: "15px",
              borderRadius: "8px",
            }}
          >
            <h3 style={{ margin: "0 0 10px 0", textAlign: "center" }}>
              플라스틱 머테리얼 조절
            </h3>

            {/* 색상 선택 */}
            <div>
              <label
                htmlFor="color-picker"
                style={{ display: "block", marginBottom: "5px" }}
              >
                색상:
              </label>
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <input
                  type="color"
                  id="color-picker"
                  value={plasticColor}
                  onChange={(e) => setPlasticColor(e.target.value)}
                  style={{ width: "50px", height: "30px" }}
                />
                <span>{plasticColor}</span>
              </div>
            </div>

            {/* 거칠기 조절 */}
            <div>
              <label
                htmlFor="roughness-slider"
                style={{ display: "block", marginBottom: "5px" }}
              >
                거칠기: {plasticRoughness.toFixed(2)}
              </label>
              <input
                type="range"
                id="roughness-slider"
                min="0"
                max="1"
                step="0.01"
                value={plasticRoughness}
                onChange={(e) =>
                  setPlasticRoughness(parseFloat(e.target.value))
                }
                style={{ width: "100%" }}
              />
            </div>

            {/* 코팅 조절 (glossy와 translucent 타입만) */}
            {(currentMaterial === MaterialType.PLASTIC_GLOSSY ||
              currentMaterial === MaterialType.PLASTIC_TRANSLUCENT) && (
              <div>
                <label
                  htmlFor="clearcoat-slider"
                  style={{ display: "block", marginBottom: "5px" }}
                >
                  코팅 강도: {plasticClearcoat.toFixed(2)}
                </label>
                <input
                  type="range"
                  id="clearcoat-slider"
                  min="0"
                  max="1"
                  step="0.01"
                  value={plasticClearcoat}
                  onChange={(e) =>
                    setPlasticClearcoat(parseFloat(e.target.value))
                  }
                  style={{ width: "100%" }}
                />
              </div>
            )}
          </div>
        )}

        {/* 발광 머테리얼 조절 UI */}
        {currentMaterial === MaterialType.EMISSIVE && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "15px",
              backgroundColor: "#f0f0f0",
              padding: "15px",
              borderRadius: "8px",
            }}
          >
            <h3 style={{ margin: "0 0 10px 0", textAlign: "center" }}>
              발광 머테리얼 조절
            </h3>

            {/* 발광 색상 선택 */}
            <div>
              <label
                htmlFor="emissive-color-picker"
                style={{ display: "block", marginBottom: "5px" }}
              >
                발광 색상:
              </label>
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <input
                  type="color"
                  id="emissive-color-picker"
                  value={emissiveColor}
                  onChange={(e) => setEmissiveColor(e.target.value)}
                  style={{ width: "50px", height: "30px" }}
                />
                <span>{emissiveColor}</span>
              </div>
            </div>

            {/* 발광 강도 조절 */}
            <div>
              <label
                htmlFor="emissive-intensity-slider"
                style={{ display: "block", marginBottom: "5px" }}
              >
                발광 강도: {emissiveIntensity.toFixed(2)}
              </label>
              <input
                type="range"
                id="emissive-intensity-slider"
                min="0"
                max="2"
                step="0.01"
                value={emissiveIntensity}
                onChange={(e) =>
                  setEmissiveIntensity(parseFloat(e.target.value))
                }
                style={{ width: "100%" }}
              />
            </div>
          </div>
        )}

        {currentMaterial === MaterialType.CHECKERBOARD && (
          <div
            style={{
              padding: "15px",
              backgroundColor: "#f5f5f5",
              borderRadius: "8px",
            }}
          >
            <h3 style={{ margin: "0 0 10px 0", textAlign: "center" }}>
              체커보드 머테리얼 조절
            </h3>

            {/* 색상 1 선택 */}
            <div>
              <label
                htmlFor="checker-color1-picker"
                style={{ display: "block", marginBottom: "5px" }}
              >
                색상 1:
              </label>
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <input
                  type="color"
                  id="checker-color1-picker"
                  value={checkerboardColor1}
                  onChange={(e) => setCheckerboardColor1(e.target.value)}
                  style={{ width: "50px", height: "30px" }}
                />
                <span>{checkerboardColor1}</span>
              </div>
            </div>

            {/* 색상 2 선택 */}
            <div>
              <label
                htmlFor="checker-color2-picker"
                style={{ display: "block", marginBottom: "5px" }}
              >
                색상 2:
              </label>
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <input
                  type="color"
                  id="checker-color2-picker"
                  value={checkerboardColor2}
                  onChange={(e) => setCheckerboardColor2(e.target.value)}
                  style={{ width: "50px", height: "30px" }}
                />
                <span>{checkerboardColor2}</span>
              </div>
            </div>

            {/* 스케일 조절 */}
            <div>
              <label
                htmlFor="checker-scale-slider"
                style={{ display: "block", marginBottom: "5px" }}
              >
                패턴 크기: {checkerboardScale.toFixed(1)}
              </label>
              <input
                type="range"
                id="checker-scale-slider"
                min="0.1"
                max="3"
                step="0.1"
                value={checkerboardScale}
                onChange={(e) =>
                  setCheckerboardScale(parseFloat(e.target.value))
                }
                style={{ width: "100%" }}
              />
            </div>
          </div>
        )}

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
