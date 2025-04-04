import React, {
  useMemo,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { Environment, Grid } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import { useThree, useFrame } from "@react-three/fiber";
import { CharacterResource } from "../../types/characterResource";
import { Character } from "../character/Player";
import * as THREE from "three";
import FireBall from "../../magic/spells/FireBall";
import Meteor from "../../magic/spells/Meteor";
import { FireBallEffect } from "../../effect/FireBallEffect";
import CameraRaycast from "../raycast/CameraRaycast";

// ======================= 시각 효과 컴포넌트 =======================

/**
 * 데미지 범위 디버그 시각화 컴포넌트
 */
const DamageRadiusDebug = ({ position, radius, duration = 3000 }) => {
  const [visible, setVisible] = useState(true);
  const radiusRef = useRef<THREE.Mesh>(null);

  // 애니메이션 효과
  useFrame(() => {
    if (radiusRef.current && visible) {
      // 천천히 회전
      radiusRef.current.rotation.y += 0.01;
    }
  });

  // 일정 시간 후 자동으로 숨김 처리
  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  if (!visible) return null;

  return (
    <mesh ref={radiusRef} position={[position.x, position.y + 0.1, position.z]}>
      <sphereGeometry args={[radius, 32, 16]} />
      <meshBasicMaterial color="#ff3300" transparent opacity={0.25} />
      <lineSegments>
        <edgesGeometry args={[new THREE.SphereGeometry(radius, 32, 16)]} />
        <lineBasicMaterial color="#ff3300" transparent opacity={0.7} />
      </lineSegments>
    </mesh>
  );
};

/**
 * 충돌 테스트용 박스 컴포넌트
 */
const CollisionTestBox = ({
  position,
  size = [1, 1, 1],
  color = "#2a6fc9",
  name = "TestBox",
}) => (
  <RigidBody type="fixed" position={position} userData={{ name }}>
    <mesh castShadow receiveShadow name={name}>
      <boxGeometry args={[size[0], size[1], size[2]]} />
      <meshStandardMaterial color={color} />
    </mesh>
  </RigidBody>
);

// ======================= 메인 월드 컴포넌트 =======================

export const World: React.FC = () => {
  // ======================= 상태 및 참조 =======================

  // 캐릭터 리소스 정의 (메모이제이션)
  const characterResource = useMemo<CharacterResource>(
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

  // 각종 게임 요소 상태 관리
  const [fireballs, setFireballs] = useState<
    { id: string; element: JSX.Element }[]
  >([]);
  const [meteors, setMeteors] = useState<
    { id: string; element: JSX.Element }[]
  >([]);
  const [fireballsHitEffects, setEffects] = useState<
    { id: string; element: JSX.Element }[]
  >([]);
  const [damageDebugVisuals, setDamageDebugVisuals] = useState<
    { id: string; element: JSX.Element }[]
  >([]);

  // 카메라 참조
  const { camera } = useThree();

  // ======================= 충돌 테스트 박스 설정 =======================

  const collisionBoxes = useMemo(
    () => [
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
    ],
    []
  );

  // ======================= 파이어볼 관련 함수 =======================

  // 파이어볼 제거 핸들러
  const handleFireballRemove = useCallback((id: string) => {
    console.log(`Removing fireball: ${id}`);
    setFireballs((prev) => prev.filter((fb) => fb.id !== id));
  }, []);

  // 파이어볼 충돌 핸들러
  const handleFireballHit = useCallback(
    (
      fireballId: string,
      target: THREE.Object3D | THREE.Mesh | unknown,
      point: THREE.Vector3
    ) => {
      console.log(`Fireball ${fireballId} hit:`, target);

      // 충돌 지점에 효과 생성
      const hitEffectId = `hit-effect-${Date.now()}-${Math.random().toString(
        36
      )}`;
      const hitEffect = (
        <FireBallEffect
          key={hitEffectId}
          position={point}
          scale={1.5}
          duration={1000}
          onComplete={() => {
            console.log(`Removing fireball effect: ${hitEffectId}`);
            setEffects((prev) => prev.filter((e) => e.id !== hitEffectId));
          }}
        />
      );

      // 효과 추가
      setEffects((prev) => [...prev, { id: hitEffectId, element: hitEffect }]);
    },
    []
  );

  // 파이어볼 생성 함수
  const createFireball = useCallback(
    (position: [number, number, number], direction: THREE.Vector3) => {
      const fireballId = `fireball-${Date.now()}`;

      const fireball = (
        <FireBall
          key={fireballId}
          position={position}
          direction={direction}
          velocity={25}
          damage={30}
          onHit={(target, point) =>
            handleFireballHit(fireballId, target, point)
          }
          onComplete={() => handleFireballRemove(fireballId)}
        />
      );

      setFireballs((prev) => [...prev, { id: fireballId, element: fireball }]);
      return fireballId;
    },
    [handleFireballHit, handleFireballRemove]
  );

  // ======================= 메테오 관련 함수 =======================

  // 메테오 제거 핸들러
  const handleMeteorRemove = useCallback((id: string) => {
    console.log(`Removing meteor: ${id}`);
    setMeteors((prev) => prev.filter((m) => m.id !== id));
  }, []);

  // 영역 데미지 처리 함수
  const handleAreaDamage = useCallback(
    (
      meteorId: string,
      position: THREE.Vector3,
      radius: number,
      damage: number
    ) => {
      console.log(
        `Meteor explosion at ${position.x}, ${position.y}, ${position.z}`
      );
      console.log(`Area damage: radius ${radius}, damage ${damage}`);

      // 고유 ID 생성 (이펙트용)
      const effectId = `effect-${meteorId}-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // 폭발 이펙트 생성
      const meteorEffect = (
        <FireBallEffect
          key={effectId}
          position={position}
          scale={3}
          duration={2000}
          onComplete={() => {
            // 효과가 끝나면 해당 효과만 제거
            setEffects((prev) => prev.filter((e) => e.id !== effectId));
          }}
        />
      );

      // 디버그용 데미지 범위 시각화 ID
      const debugId = `debug-damage-${meteorId}-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)}`;

      // 데미지 범위 시각화 생성
      const damageVisual = (
        <DamageRadiusDebug
          key={debugId}
          position={position}
          radius={radius}
          duration={3000} // 3초 동안 표시
        />
      );

      // 효과 추가
      setEffects((prev) => [...prev, { id: effectId, element: meteorEffect }]);

      // 데미지 범위 시각화 추가
      setDamageDebugVisuals((prev) => [
        ...prev,
        { id: debugId, element: damageVisual },
      ]);
    },
    []
  );

  // 메테오 생성 함수
  const createMeteor = useCallback(
    (targetPoint: THREE.Vector3) => {
      const meteorId = `meteor-${Date.now()}`;

      const meteor = (
        <Meteor
          key={meteorId}
          targetPosition={targetPoint}
          height={40}
          spreadRadius={5} // 목표 지점 주변 5미터 내에 랜덤하게 떨어짐
          velocity={40}
          duration={5000}
          explosionRadius={8}
          explosionDamage={100}
          onAreaDamage={(position, radius, damage) =>
            handleAreaDamage(meteorId, position, radius, damage)
          }
          onComplete={() => handleMeteorRemove(meteorId)}
        />
      );

      setMeteors((prev) => [...prev, { id: meteorId, element: meteor }]);
      return meteorId;
    },
    [handleAreaDamage, handleMeteorRemove]
  );

  // ======================= 입력 처리 =======================

  // 마우스 입력 처리
  useEffect(() => {
    const handleClick = (event) => {
      if (!document.pointerLockElement) return;

      // 카메라 위치를 플레이어 위치로 사용
      const playerPosition = camera.position.clone();
      playerPosition.y -= 1.6; // 플레이어 높이 조정 (카메라가 머리 위에 있음)

      // 카메라 방향 가져오기
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);

      // 좌클릭: 파이어볼 발사
      if (event.button === 0) {
        const spawnPosition: [number, number, number] = [
          playerPosition.x + direction.x * 0.5,
          playerPosition.y + 2, // 눈 높이
          playerPosition.z + direction.z * 0.5,
        ];

        createFireball(spawnPosition, direction);
      }
      // 우클릭: 메테오 발사
      else if (event.button === 2) {
        // 카메라 방향으로 레이캐스팅하여 타겟 위치 결정
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera); // 화면 중앙 기준

        // 지면과의 교차점 계산 (y=0 평면 사용)
        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const targetPoint = new THREE.Vector3();
        raycaster.ray.intersectPlane(groundPlane, targetPoint);

        // 타겟 지점을 찾지 못하면 카메라 앞 20미터 지점으로 설정
        if (!targetPoint.x && !targetPoint.z) {
          const farPoint = camera.position
            .clone()
            .add(direction.clone().multiplyScalar(20));
          targetPoint.set(farPoint.x, 0, farPoint.z);
        }

        console.log(
          `Meteor target: ${targetPoint.x}, ${targetPoint.y}, ${targetPoint.z}`
        );
        createMeteor(targetPoint);
      }
    };

    // 우클릭 방지 (컨텍스트 메뉴 방지)
    const preventContextMenu = (e) => {
      e.preventDefault();
    };

    // 이벤트 리스너 등록
    window.addEventListener("mousedown", handleClick);
    window.addEventListener("contextmenu", preventContextMenu);

    // 이벤트 리스너 정리
    return () => {
      window.removeEventListener("mousedown", handleClick);
      window.removeEventListener("contextmenu", preventContextMenu);
    };
  }, [camera, createFireball, createMeteor]);

  // ======================= 렌더링 =======================
  return (
    <>
      {/* 조명 */}
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[5, 5, 5]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />

      {/* 환경 */}
      <Environment preset="sunset" background={false} />

      {/* 지면 */}
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

      {/* 그리드 */}
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

      {/* 캐릭터 */}
      <Character characterResource={characterResource} />

      {/* 카메라 레이캐스트 */}
      <CameraRaycast
        sphereRadius={0.15}
        sphereColor="#ff9900"
        emissiveColor="#ff6600"
        maxDistance={50}
        debug={true}
      />

      {/* 투사체 및 효과 */}
      <group name="projectiles-and-effects">
        {/* 파이어볼 */}
        {fireballs.map((fireball) => fireball.element)}

        {/* 메테오 */}
        {meteors.map((meteor) => meteor.element)}

        {/* 파이어볼 충돌 시 효과 */}
        {fireballsHitEffects.map((effect) => effect.element)}

        {/* 데미지 범위 시각화 */}
        {damageDebugVisuals.map((debug) => debug.element)}
      </group>

      {/* 충돌 테스트용 박스들 */}
      <group name="collision-test-boxes">
        {collisionBoxes.map((box, index) => (
          <CollisionTestBox
            key={`test-box-${index}`}
            position={box.position as [number, number, number]}
            size={box.size as [number, number, number]}
            color={box.color}
            name={box.name}
          />
        ))}
      </group>
    </>
  );
};
