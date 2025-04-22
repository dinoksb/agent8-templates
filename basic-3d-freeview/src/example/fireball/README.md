# 🔥 파이어볼 구현 가이드

## 📌 시스템 개요

파이어볼 기능은 3D 게임에서 캐릭터가 발사할 수 있는 마법 효과입니다. 이 기능은 다음과 같은 핵심 요소로 구성됩니다:

- **타입 시스템**  
  이펙트의 타입과 데이터 구조를 정의합니다.

- **상태 관리**  
  Zustand 스토어를 사용하여 활성화된 이펙트를 관리합니다.

- **파이어볼 컨트롤러**  
  설정을 파싱하고 시각 효과를 제어합니다.

- **파이어볼 시각화**  
  Three.js를 사용한 3D 렌더링과 물리 효과 그리고 충돌처리를 담당합니다.

- **이펙트 컨테이너**  
  모든 활성 이펙트를 렌더링하는 컴포넌트입니다.

- **플레이어 연동**  
  키보드 입력에 따라 파이어볼을 발사하는 기능입니다.

---

## 🔄 데이터 흐름

1. 플레이어가 `'magic'` 키를 누름
2. `Player` 컴포넌트가 `handleMagicCast` 함수 실행
3. `onCastMagic` 콜백을 통해 부모 컴포넌트에 이펙트 생성 요청
4. 부모 컴포넌트가 `useEffectStore`의 `addEffect` 메서드 호출
5. 이펙트 스토어에 새 파이어볼 추가 및 고유 키 할당
6. `EffectContainer`가 스토어에서 활성 이펙트 목록을 가져와 렌더링
7. `FireBallEffectController`가 설정 파싱 및 `FireBall` 컴포넌트 생성
8. `FireBall` 컴포넌트가 시각적 표현 및 물리 처리
9. 충돌 감지 또는 지속 시간 종료 시 `onComplete` 콜백을 통해 이펙트 제거

---

## 🗂 구현해야 할 파일 목록

- `types/effect.ts`  
  이펙트 타입 정의 (수정 - 파일이 없다면 추가)

- `store/effectStore.ts`  
  이펙트 상태 관리 (수정 - 파일이 없다면 추가)

- `effects/FireBallEffectController.tsx`  
  파이어볼 설정 및 제어

- `effects/FireBall.tsx`  
  파이어볼 시각화, 물리 처리, 충돌 처리

  `vibe-starter-3d` 노드 모듈 패키지의 CollisionGroup 은 다음과 같이 정의 되어있습니다. 아래에 정의되어있지 않은 타입은 절대 사용하지 마세요.

  ```ts
  export declare enum CollisionGroup {
    Default = 0, // General object (default)
    Player = 1, // Player
    Enemy = 2, // Enemy
    NPC = 3, // Neutral character
    Projectile = 4, // Projectile
    Environment = 5, // Walls, floors, roads, structures, etc.
    Item = 6, // Item (interactable/acquirable)
    Trigger = 7, // Trigger (for events)
    UI = 8, // For UI Raycast
    Sensor = 9, // Invisible sensor (vision, proximity, etc.)
    DeadBody = 10, // Deceased unit
    LocalPlayer = 11, // Self (for multiplayer)
    RemotePlayer = 12, // Other users (for multiplayer)
    Vehicle = 13, // Vehicle/mount
    Terrain = 14, // Terrain (for special judgment)
    Particle = 15,
    // Maximum 16 groups (indices 0-15) are allowed by Rapier.
  }
  ```

  `vibe-starter-3d` 패키지 임포트 및 collisionGroups 설정(하단의 샘플 코드 참고)

  ```tsx
  import { CollisionafGroup, collisionGroups } from "vibe-starter-3d";

  // 충돌 그룹 설정 (프로젝타일은 플레이어와 충돌하지 않음)
  const DEFAULT_MEMBERSHIP_COLLISION_GROUP = CollisionGroup.Projectile;
  const DEFAULT_EXCLUDE_COLLISION_GROUP = CollisionGroup.Player;

  // Create collision groups configuration
  const createCollisionGroups = useMemo(() => {
    return collisionGroups(
      DEFAULT_MEMBERSHIP_COLLISION_GROUP,
      DEFAULT_EXCLUDE_COLLISION_GROUP
    );
  }, []);
  ```

- `EffectContainer.tsx`  
  이펙트 렌더링 컨테이너 (수정 - 파일이 없다면 추가)

- `Player.tsx` (수정)  
  파이어볼 발사 기능 추가

---

## 파일별 상세 구현

1. types/effect.ts

```tsx
/**
 * Effect type enumeration
 */
export enum EffectType {
  FIREBALL = "FIREBALL",
  // 추후 다른 이펙트 타입 추가 가능
}

/**
 * Base effect data interface
 * Basic structure for all effect-related data
 */
export interface EffectData {
  type: string;
  config: { [key: string]: any };
}

/**
 * Active effect interface
 * Effect instance managed on the client
 */
export interface ActiveEffect {
  key: number;
  // Sender account
  sender?: string;
  effectData: EffectData;
}

/**
 * Effect message exchanged between server and client
 */
export interface EffectEventMessage {
  sender: string;
  effectData: EffectData;
  timestamp: number;
}
```

2. store/effectStore.ts

```tsx
import { create } from "zustand";
import { ActiveEffect, EffectData } from "../types/effect";

/**
 * Effect store state interface
 * Defines the structure and actions available in the effect store
 */
interface EffectState {
  activeEffects: ActiveEffect[]; // List of active effects
  effectKeyCounter: number; // Effect unique key counter
  // Action to add an effect
  addEffect: (
    type: string,
    sender?: string,
    config?: Record<string, any>
  ) => number; // Returns the key of the added effect
  // Action to remove an effect
  removeEffect: (key: number) => void;
}

/**
 * Create Zustand store for managing effects
 * Provides state and actions for adding/removing effects
 */
export const useEffectStore = create<EffectState>((set, get) => ({
  activeEffects: [], // Initial state: empty array
  effectKeyCounter: 0, // Initial state: 0

  // Implement effect addition
  addEffect: (type, sender, config) => {
    const newKey = get().effectKeyCounter; // Generate a new key with the current counter value
    // Create EffectData object
    const effectData: EffectData = {
      type,
      config: config || {},
    };
    // Create ActiveEffect object
    const newEffect: ActiveEffect = {
      key: newKey,
      sender,
      effectData,
    };

    // State update: add new effect and increment counter
    set((state) => ({
      activeEffects: [...state.activeEffects, newEffect],
      effectKeyCounter: state.effectKeyCounter + 1,
    }));

    console.log(`[EffectStore] Effect added: key=${newKey}, type=${type}`);
    return newKey; // Return the generated key
  },

  // Implement effect removal
  removeEffect: (keyToRemove: number) => {
    // State update: filter and remove the effect with the corresponding key
    set((state) => ({
      activeEffects: state.activeEffects.filter(
        (effect) => effect.key !== keyToRemove
      ),
    }));
    console.log(`[EffectStore] Effect removed: key=${keyToRemove}`);
  },
}));

// Convenience selector hook
export const useActiveEffects = () =>
  useEffectStore((state) => state.activeEffects);
```

3. effects/FireBallEffectController.tsx

```tsx
import * as THREE from "three";
import { FireBall } from "./FireBall";
import { IntersectionEnterPayload } from "@react-three/rapier";

/**
 * Primitive types that can be serialized for network/store
 */
type Primitive = string | number | boolean | null | undefined | symbol | bigint;
type PrimitiveOrArray = Primitive | Primitive[];

// Default configuration values
const DEFAULT_SPEED = 10;
const DEFAULT_DURATION = 2000;

/**
 * Props for the FireBallEffectController component
 */
interface FireBallEffectControllerProps {
  config: { [key: string]: PrimitiveOrArray };
  onHit: (other: IntersectionEnterPayload, pos?: THREE.Vector3) => boolean;
  onComplete: () => void;
}

/**
 * Utility to convert THREE.Vector3 to array (needed for store/server)
 */
const vecToArray = (vec: THREE.Vector3): [number, number, number] => {
  return [vec.x, vec.y, vec.z];
};

/**
 * Utility to convert Vector3 array to THREE.Vector3 (needed for rendering)
 */
const arrayToVec = (arr?: [number, number, number]): THREE.Vector3 => {
  if (!arr) {
    console.error("Missing required config properties");
    return new THREE.Vector3();
  }
  return new THREE.Vector3(arr[0], arr[1], arr[2]);
};

/**
 * Create configuration for a fireball effect
 * @param startPosition Starting position of the fireball
 * @param direction Direction vector (will be normalized)
 * @param speed Speed of travel (units per second)
 * @param duration Duration before auto-destruction (milliseconds)
 */
export const createFireBallEffectConfig = (
  startPosition: THREE.Vector3,
  direction: THREE.Vector3,
  speed?: number,
  duration?: number
): { [key: string]: PrimitiveOrArray } => {
  return {
    startPosition: vecToArray(startPosition),
    direction: vecToArray(direction),
    speed: speed || DEFAULT_SPEED,
    duration: duration || DEFAULT_DURATION,
  };
};

/**
 * Parse the configuration object into usable THREE.js objects
 */
const parseConfig = (config: { [key: string]: any }) => {
  return {
    startPosition: arrayToVec(config.startPosition as [number, number, number]),
    direction: arrayToVec(config.direction as [number, number, number]),
    speed: (config.speed as number) || DEFAULT_SPEED,
    duration: (config.duration as number) || DEFAULT_DURATION,
  };
};

/**
 * Controller component for FireBall effects
 * Acts as a configuration layer between the effect store and the visual effect
 */
export const FireBallEffectController: React.FC<
  FireBallEffectControllerProps
> = ({ config, onHit, onComplete }) => {
  // Parse configuration into usable format
  const { startPosition, direction, speed, duration } = parseConfig(config);

  // Validate configuration
  if (!startPosition || !direction || !speed || !duration) {
    console.error(
      "[FireBallEffectController] Missing required config properties"
    );
    onComplete?.();
    return null;
  }

  // Calculate actual start position (slightly offset in direction of travel)
  const calculatedStartPosition = startPosition
    .clone()
    .add(direction.clone().multiplyScalar(1));

  return (
    <FireBall
      startPosition={calculatedStartPosition}
      direction={direction}
      speed={speed}
      duration={duration}
      onHit={onHit}
      onComplete={onComplete}
    />
  );
};
```

4. effects/FireBall.tsx

```tsx
import React, { useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import {
  RigidBody,
  BallCollider,
  IntersectionEnterPayload,
} from "@react-three/rapier";
import { ActiveCollisionTypes } from "@dimforge/rapier3d-compat";
import { CollisionafGroup, collisionGroups } from "vibe-starter-3d";

// 충돌 그룹 설정 (프로젝타일은 플레이어와 충돌하지 않음)
const DEFAULT_MEMBERSHIP_COLLISION_GROUP = CollisionGroup.Projectile;
const DEFAULT_EXCLUDE_COLLISION_GROUP = CollisionGroup.Player;

/**
 * Props for the FireBall component
 */
interface FireBallProps {
  startPosition: THREE.Vector3;
  direction: THREE.Vector3; // Normalized direction vector
  speed: number; // Distance traveled per second
  duration: number; // Lifespan (milliseconds)
  onHit?: (other: IntersectionEnterPayload, pos?: THREE.Vector3) => boolean; // 충돌 시 콜백
  onComplete?: () => void; // 이펙트 종료 시 콜백
}

/**
 * FireBall component - 3D visual effect with physics collision
 */
export const FireBall: React.FC<FireBallProps> = ({
  startPosition,
  direction,
  speed,
  duration,
  onHit,
  onComplete,
}) => {
  // State for lifecycle management
  const [destroyed, setDestroyed] = useState(false);
  // Record creation time for lifespan calculation
  const startTime = useRef(Date.now());

  // References to 3D objects
  const rigidRef = useRef(null); // Physics body
  const outerRef = useRef<THREE.Mesh>(null); // Outer flame shell
  const coreRef = useRef<THREE.Mesh>(null); // Inner bright core
  const lightRef = useRef<THREE.PointLight>(null); // Dynamic light source

  // Create collision groups configuration
  const createCollisionGroups = useMemo(() => {
    return collisionGroups(
      DEFAULT_MEMBERSHIP_COLLISION_GROUP,
      DEFAULT_EXCLUDE_COLLISION_GROUP
    );
  }, []);

  // Animation loop - updates position, visual effects, and handles lifecycle
  useFrame(() => {
    if (destroyed) return;

    // Calculate elapsed time and current position
    const elapsed = Date.now() - startTime.current;
    const seconds = elapsed / 1000;

    // New position = initial position + direction * speed * elapsed time
    const currentPos = startPosition
      .clone()
      .add(direction.clone().multiplyScalar(speed * seconds));

    // Update physics body position
    rigidRef.current?.setNextKinematicTranslation({
      x: currentPos.x,
      y: currentPos.y,
      z: currentPos.z,
    });

    // Visual effects: fade out, flicker, scale
    const fadeStart = duration - 400; // Start fading 400ms before destruction
    const fadeElapsed = Math.max(elapsed - fadeStart, 0);
    const fadeProgress = THREE.MathUtils.clamp(fadeElapsed / 400, 0, 1);
    const opacityFactor = 1 - fadeProgress;

    // Scale variation for flame effect
    const flickerScale =
      0.9 + Math.sin(elapsed * 0.02) * 0.1 + Math.random() * 0.05;
    if (outerRef.current) {
      outerRef.current.scale.setScalar(flickerScale);
    }
    if (coreRef.current) {
      coreRef.current.scale.setScalar(0.6 + Math.sin(elapsed * 0.04) * 0.1);
    }

    // Update material opacity for fade out
    const outerMat = outerRef.current?.material as THREE.MeshBasicMaterial;
    const coreMat = coreRef.current?.material as THREE.MeshBasicMaterial;
    if (outerMat && coreMat) {
      outerMat.opacity = 0.8 * opacityFactor;
      coreMat.opacity = 1.0 * opacityFactor;
      outerMat.needsUpdate = true;
      coreMat.needsUpdate = true;
    }

    // Flickering light intensity
    if (lightRef.current) {
      lightRef.current.intensity =
        (5 + Math.sin(elapsed * 0.03) * 2 + Math.random()) * opacityFactor;
    }

    // Destroy at the end of lifespan
    if (elapsed > duration) {
      setDestroyed(true);
      onComplete?.();
    }
  });

  // Don't render if destroyed
  if (destroyed) return null;

  return (
    <RigidBody
      ref={rigidRef}
      type="kinematicPosition" // Controlled by our animation
      position={[startPosition.x, startPosition.y, startPosition.z]}
      colliders={false} // We'll define our own collider
      sensor={true} // Only detect collisions, don't react physically
      activeCollisionTypes={ActiveCollisionTypes.ALL}
      onIntersectionEnter={(other) => {
        console.log("onIntersectionEnter", other);
        // Called when FireBall intersects another RigidBody
        // Get current position of the fireball
        const translation = rigidRef.current?.translation();
        const hitPosition = translation
          ? new THREE.Vector3(translation.x, translation.y, translation.z)
          : undefined;
        // Only destroy if onHit callback returns true
        if (onHit?.(other, hitPosition)) {
          onComplete?.();
          setDestroyed(true);
        }
      }}
      collisionGroups={createCollisionGroups}
      gravityScale={0} // No gravity effect
    >
      {/* Spherical collision shape */}
      <BallCollider args={[0.4]} />

      {/* Outer flame shell */}
      <mesh ref={outerRef}>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshBasicMaterial
          color="#ff3300"
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Bright inner core */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial
          color="#ffffcc"
          transparent
          opacity={1}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Dynamic light source */}
      <pointLight
        ref={lightRef}
        color="#ff6600"
        intensity={5}
        distance={8}
        decay={2}
      />
    </RigidBody>
  );
};
```

5. EffectContainer.tsx

```tsx
import { useCallback } from "react";
import { useGameServer } from "@agent8/gameserver";
import * as THREE from "three";
import { ActiveEffect, EffectType } from "./types/effect";
import { useEffectStore, useActiveEffects } from "./store/effectStore";
import { IntersectionEnterPayload } from "@react-three/rapier";
import { FireBallEffectController } from "./effects/FireBallEffectController";

/**
 * Effect container component using Zustand store for effect management.
 * Renders all active effects from the store.
 */
export function EffectContainer() {
  // Call ALL hooks unconditionally at the top
  const { connected } = useGameServer();
  const activeEffects = useActiveEffects();
  const removeEffect = useEffectStore((state) => state.removeEffect);

  // Callback to remove completed effects using the store action
  const handleEffectComplete = useCallback(
    (keyToRemove: number) => {
      console.log("[EffectContainer] Effect complete:", keyToRemove);
      removeEffect(keyToRemove);
    },
    [removeEffect]
  );

  // Handler for when a fireball hits something
  const handleFireballEffectHit = useCallback(
    (other: IntersectionEnterPayload, pos?: THREE.Vector3, sender?: string) => {
      // Prevent hitting the player who cast the fireball
      if (sender) {
        if (other.rigidBody?.userData?.["account"] === sender) return false;
      }

      console.log("Fireball effect hit:", other, pos, sender);
      return true; // Return true to destroy the fireball on impact
    },
    []
  );

  // Function to render individual effects based on their type
  const renderEffect = useCallback(
    (effect: ActiveEffect) => {
      const type = effect.effectData.type;

      switch (type) {
        case EffectType.FIREBALL:
          return (
            <FireBallEffectController
              key={effect.key}
              config={effect.effectData.config}
              onHit={(other, pos) =>
                handleFireballEffectHit(other, pos, effect.sender)
              }
              onComplete={() => {
                handleEffectComplete(effect.key);
              }}
            />
          );
        // Add cases for other effect types here as needed
        default:
          console.warn(`[EffectContainer] Unknown effect type: ${type}`);
          return null;
      }
    },
    [handleFireballEffectHit, handleEffectComplete]
  );

  // Don't render effects if not connected to game server
  if (!connected) return null;

  // Render all active effects from the store
  return <>{activeEffects.map(renderEffect)}</>;
}
```

6. Player.tsx
   Player 에는 파이어볼 발사를 위한 코드를 추가해야 합니다.

```tsx
// Player 컴포넌트 내부에 필요한 임포트 추가:
import { EffectType } from "./types/effect";
import { createFireBallEffectConfig } from "./effects/FireBallEffectController";
import { CollisionafGroup, collisionGroups } from "vibe-starter-3d";

// Player 컴포넌트 내부에 다음 코드 추가:
const createCollisionGroups = useMemo(() => {
  return collisionGroups(
    CollisionafGroup.Player
    // 멀티플레이 환경인 경우
    // CollisionafGroup.LocalPlayer,
  );
}, []);

// 마법 발사가 트리거 되었는지 추적하는 ref
const magicTriggeredRef = useRef(false);

// Magic casting 로직
const handleMagicCast = useCallback(() => {
  if (!controllerRef?.current?.rigidBodyRef?.current) return;

  console.log("Magic key pressed - Requesting cast!");

  // 부모 컴포넌트에서 제공된 콜백 호출
  if (onCastMagic) {
    // 캐릭터가 바라보는 방향으로 파이어볼 발사
    const rigidBody = controllerRef.current.rigidBodyRef.current;
    const position = rigidBody.translation();
    const startPosition = new THREE.Vector3(position.x, position.y, position.z);
    const rotation = rigidBody.rotation();
    const quaternion = new THREE.Quaternion(
      rotation.x,
      rotation.y,
      rotation.z,
      rotation.w
    );

    // 자유로운 시점의 게임 또는 카메라인 경우
    const direction = new THREE.Vector3(0, 0, 1)
      .applyQuaternion(quaternion)
      .normalize();

    // 사이드뷰(플랫포머 스타일) 게임또는 카메라인 경우
    // 플레이어가 바라보는 방향(좌/우)에 따라 direction 설정
    // const playerFacingRight = true; // 플레이어가 오른쪽을 보고 있는지 여부 (playerState 등에서 가져옴)
    // const direction = new THREE.Vector3(playerFacingRight ? 1 : -1, 0, 0).normalize();

    // 이펙트 스토어를 통해 파이어볼 생성
    onCastMagic(
      EffectType.FIREBALL,
      createFireBallEffectConfig(startPosition, direction)
    );
  } else {
    console.warn(
      "Player tried to cast magic, but onCastMagic prop is missing!"
    );
  }
}, [controllerRef, onCastMagic]);

// useFrame 내부에서 마법 키 입력 처리 추가
useFrame(() => {
  // 기존 코드...

  // 키보드 입력 처리
  const inputs = getKeyboardInputs();
  const { magic } = inputs;

  // 매직 키가 눌렸을 때만 한 번 호출하도록 처리
  const triggerMagic = magic && !magicTriggeredRef.current;
  if (triggerMagic) {
    handleMagicCast();
  }
  magicTriggeredRef.current = magic;

  // 나머지 기존 코드...
});
```

7. 상위 씬에서 컴포넌트 연결

```tsx
import { useEffectStore } from "./store/effectStore";

function Experience() {
  // EffectStore에서 addEffect 액션 가져오기
  const addEffect = useEffectStore((state) => state.addEffect);

  // 이펙트 생성 함수 - Player에 전달할 콜백
  const handleSpawnEffect = useCallback(
    (type, config) => {
      // 현재 플레이어 계정 또는 ID를 sender로 사용
      const currentAccount = "player1"; // 실제 구현에서는 현재 플레이어 ID 사용
      addEffect(type, currentAccount, config);
    },
    [addEffect]
  );

  return (
    <>
      {/* 기타 씬 요소들 */}

      {/* Player에 이펙트 생성 콜백 전달 */}
      <Player spawnEffect={handleSpawnEffect} {...otherProps} />

      {/* 모든 이펙트 렌더링 컨테이너 */}
      <EffectContainer />
    </>
  );
}
```

---

## 🚀 구현 단계 요약

1. **타입 정의 파일 생성**  
   `types/effect.ts` – 이펙트 타입과 구성 구조 정의

2. **이펙트 상태 관리 저장소 구현**  
   `store/effectStore.ts` – Zustand 기반 이펙트 스토어 구현

3. **파이어볼 컨트롤러 구현**  
   `effects/FireBallEffectController.tsx` – 설정 파싱 및 이펙트 생성 로직

4. **파이어볼 시각화 및 물리 구현**  
   `effects/FireBall.tsx` – Three.js 기반 시각 표현, Rapier 물리 적용과 충돌 그룹 설정 및 충돌 처리 적용

5. **이펙트 컨테이너 구현**  
   `EffectContainer.tsx` – 전체 이펙트 렌더링 및 상태 추적

6. **`Player.tsx`에 파이어볼 발사 기능 추가**  
   사용자 입력 처리 및 `onCastMagic` 콜백 연결

7. **게임 씬에서 모든 컴포넌트 연결**  
   `App.tsx` 또는 `GameScene.tsx` 등에서 구성 요소 조립

---

## ⚠️ 중요 고려사항

- **충돌 그룹 설정**

  - 파이어볼이 자신을 발사한 플레이어와 충돌하지 않도록 `vibe-starter-3d` 노드 모듈 패키지를 import 하고고 `CollisionGroup` 와 `collisionGroups` 를 이용하여 Rapier Rigidbody 의 `collisionGroups`를 설정해야 합니다.

- **네트워크 직렬화**

  - `Vector3`와 같은 객체는 JSON 직렬화 시 `[x, y, z]` 형태의 배열로 변환하여 저장/전송하세요.

- **성능 최적화**

  - 오래된 이펙트는 자동 제거 (예: 지속 시간 기반)
  - 불필요한 충돌 계산 최소화

- **시각 효과 강화**
  - 투명도 페이드 인/아웃
  - 스케일 변화 애니메이션
  - 컬러 그라데이션 등으로 시각적 생동감 부여

---
