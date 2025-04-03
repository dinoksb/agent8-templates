import React, { useMemo } from "react";
import { Environment, Grid } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import { useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { CharacterResource } from "../../types/characterResource";
import { Character } from "../character/Player";
import { ProjectileSystem } from "../projectile/ProjectileSystem";
import { ProjectileType } from "../../types/projectile";
import { useMouseProjectileLauncher } from "../../hooks/useProjectileSystem";

/**
 * 테스트용 충돌 박스 컴포넌트
 */
const CollisionBox: React.FC<{
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  name: string;
}> = ({ position, size, color, name }) => {
  return (
    <RigidBody
      position={position}
      type="fixed"
      restitution={0.2}
      friction={0.8}
      name={name}
    >
      <mesh castShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} />
      </mesh>
    </RigidBody>
  );
};

export const World: React.FC = () => {
  const { camera } = useThree();

  // 투사체 옵션 정의
  const projectileOptions = useMemo(
    () => ({
      speed: 20,
      lifetime: 5, // 충돌 테스트를 위해 수명 연장
      flameColor: "#ff6a00",
      flameIntensity: 2,
      pulseSpeed: 4,
    }),
    []
  );

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

  // 마우스 프로젝타일 발사기 설정
  const WorldWithProjectiles: React.FC = () => {
    const { setupMouseLauncher } = useMouseProjectileLauncher({
      cooldown: 500, // 발사 쿨다운 (ms)
      getFireOptions: () => {
        // 카메라 위치 및 방향 기반으로 발사 위치/방향 계산
        const cameraPosition = camera.position.clone();
        const direction = new Vector3(0, 0, -1)
          .applyQuaternion(camera.quaternion)
          .normalize();

        // 약간 앞쪽으로 발사 위치 조정
        const firingPosition = cameraPosition
          .clone()
          .add(direction.clone().multiplyScalar(2));
        // 손 위치처럼 약간 아래로 조정
        firingPosition.y -= 0.5;

        // 발사 시 로그
        console.log(
          `발사 위치: [${firingPosition.x.toFixed(
            2
          )}, ${firingPosition.y.toFixed(2)}, ${firingPosition.z.toFixed(2)}]`
        );
        console.log(
          `발사 방향: [${direction.x.toFixed(2)}, ${direction.y.toFixed(
            2
          )}, ${direction.z.toFixed(2)}]`
        );

        return {
          position: firingPosition,
          direction: direction,
          type: ProjectileType.FIREBALL,
          options: projectileOptions,
        };
      },
    });

    // 마우스 이벤트 설정
    React.useEffect(() => {
      const cleanup = setupMouseLauncher();
      return cleanup;
    }, [setupMouseLauncher]);

    return null;
  };

  return (
    <ProjectileSystem>
      {/* 마우스 클릭 이벤트 핸들러 컴포넌트 */}
      <WorldWithProjectiles />

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
      <RigidBody type="fixed" colliders="trimesh" name="ground">
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
          position={[0, 0, 0]}
        >
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial color="#3f3f3f" />
        </mesh>
      </RigidBody>

      {/* 테스트용 충돌 박스들 */}
      <CollisionBox
        position={[0, 2, -10]}
        size={[2, 2, 2]}
        color="#ff4400"
        name="center-box"
      />

      <CollisionBox
        position={[-5, 1.5, -8]}
        size={[1, 3, 1]}
        color="#44ff00"
        name="left-box"
      />

      <CollisionBox
        position={[5, 1.5, -8]}
        size={[1, 3, 1]}
        color="#0044ff"
        name="right-box"
      />

      <CollisionBox
        position={[0, 4, -15]}
        size={[1, 8, 1]}
        color="#ff00ff"
        name="tall-pillar"
      />

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
    </ProjectileSystem>
  );
};
