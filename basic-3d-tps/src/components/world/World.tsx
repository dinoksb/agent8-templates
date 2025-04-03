import React, { useMemo, useState, useEffect } from "react";
import { Environment, Grid } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import { useThree } from "@react-three/fiber";
import { CharacterResource } from "../../types/characterResource";
import { Character } from "../character/Player";
import * as THREE from "three";
import FireBall from "../../projectiles/FireBall";

// 충돌 테스트용 박스 컴포넌트
const CollisionTestBox = ({
  position,
  size = [1, 1, 1],
  color = "#2a6fc9",
  name = "TestBox",
}) => {
  return (
    <RigidBody type="fixed" position={position} userData={{ name }}>
      <mesh castShadow receiveShadow name={name}>
        <boxGeometry args={[size[0], size[1], size[2]]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </RigidBody>
  );
};

export const World: React.FC = () => {
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

  // 발사된 파이어볼 목록 관리
  const [fireballs, setFireballs] = useState<
    { id: string; element: JSX.Element }[]
  >([]);

  // 카메라 참조
  const { camera } = useThree();

  // 충돌 테스트용 박스 설정
  const collisionBoxes = useMemo(() => {
    return [
      // 전방에 배치된 박스들
      {
        position: [0, 1, -10],
        size: [1, 2, 1],
        color: "#2a6fc9",
        name: "CenterBox",
      },
      {
        position: [3, 1.5, -10],
        size: [1, 3, 1],
        color: "#2a9c2a",
        name: "RightFrontBox",
      },
      {
        position: [-3, 1, -10],
        size: [1, 2, 1],
        color: "#c92a2a",
        name: "LeftFrontBox",
      },

      // 좌우에 배치된 박스들
      {
        position: [10, 1, 0],
        size: [1, 2, 1],
        color: "#7d2ac9",
        name: "RightSideBox",
      },
      {
        position: [-10, 1, 0],
        size: [1, 2, 1],
        color: "#c9a12a",
        name: "LeftSideBox",
      },

      // 대각선 방향에 배치된 박스들
      {
        position: [7, 1, -7],
        size: [1, 2, 1],
        color: "#2ac9c9",
        name: "RightDiagonalBox",
      },
      {
        position: [-7, 1, -7],
        size: [1, 2, 1],
        color: "#c92a84",
        name: "LeftDiagonalBox",
      },

      // 높이가 다른 박스들
      {
        position: [0, 3, -15],
        size: [1, 1, 1],
        color: "#8fc92a",
        name: "HighBox",
      },
      {
        position: [4, 0.5, -15],
        size: [1, 1, 1],
        color: "#c95e2a",
        name: "LowBox",
      },
    ];
  }, []);

  // 클릭 이벤트로 파이어볼 발사
  useEffect(() => {
    const handleClick = () => {
      if (document.pointerLockElement) {
        // 카메라 위치를 플레이어 위치로 사용
        const playerPosition = camera.position.clone();
        playerPosition.y -= 1.6; // 플레이어 높이 조정 (카메라가 머리 위에 있음)

        // 카메라 방향 가져오기
        const direction = new THREE.Vector3();
        camera.getWorldDirection(direction);

        // 발사 위치 계산 (플레이어 위치 + 높이 + 약간 앞으로 오프셋)
        const spawnPosition: [number, number, number] = [
          playerPosition.x + direction.x * 0.5,
          playerPosition.y + 1.5, // 눈 높이
          playerPosition.z + direction.z * 0.5,
        ];

        // 고유 ID 생성
        const fireballId = `fireball-${Date.now()}`;

        // 파이어볼 제거 함수
        const handleRemove = () => {
          console.log(`Removing fireball: ${fireballId}`);
          setFireballs((prev) => prev.filter((fb) => fb.id !== fireballId));
        };

        // 파이어볼 생성
        const fireball = (
          <FireBall
            key={fireballId}
            position={spawnPosition}
            direction={direction}
            velocity={25}
            onRemove={handleRemove}
          />
        );

        // 파이어볼을 상태에 추가
        setFireballs((prev) => [
          ...prev,
          { id: fireballId, element: fireball },
        ]);
      }
    };

    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [camera]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[5, 5, 5]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />

      {/* Environment */}
      <Environment preset="sunset" background={false} />

      {/* Ground plane */}
      <RigidBody type="fixed" colliders="trimesh">
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
          position={[0, 0, 0]}
        >
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial color="#3f3f3f" />
        </mesh>
      </RigidBody>

      {/* Grid */}
      <Grid
        args={[100, 100]}
        position={[0, 0.01, 0]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#6f6f6f"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#9f9f9f"
        fadeDistance={100}
        fadeStrength={1}
        followCamera={false}
      />

      {/* Character */}
      <Character characterResource={characterResource} />

      {/* 발사된 파이어볼 렌더링 */}
      {fireballs.map((fireball) => fireball.element)}

      {/* 충돌 테스트용 박스들 */}
      {collisionBoxes.map((box, index) => (
        <CollisionTestBox
          key={`test-box-${index}`}
          position={box.position as [number, number, number]}
          size={box.size as [number, number, number]}
          color={box.color}
          name={box.name}
        />
      ))}
    </>
  );
};
