# 🔫 총알 구현 가이드

## 📌 시스템 개요

총알 기능은 3D 게임에서 캐릭터가 발사할 수 있는 무기 효과입니다. 이 시스템은 다음과 같은 핵심 요소로 구성됩니다:

- **타입 시스템**  
  이펙트의 타입과 데이터 구조를 정의합니다.

- **상태 관리**  
  Zustand 스토어를 사용하여 활성화된 이펙트를 관리합니다.

- **총알 컨트롤러**  
  설정을 파싱하고 시각 효과를 제어합니다.

- **총알 시각화**  
  Three.js와 Rapier를 사용한 3D 렌더링과 물리 효과 그리고 충돌처리를 담당합니다.

- **이펙트 컨테이너**  
  모든 활성 이펙트를 렌더링하는 컴포넌트입니다.

- **플레이어 연동**  
  키보드 입력에 따라 총알을 발사하는 기능입니다.

---

## 🔄 데이터 흐름

1. 플레이어가 `'magic'` 키를 누름
2. `Player` 컴포넌트가 `handleMagicCast` 함수 실행
3. `spawnEffect` 콜백을 통해 부모 컴포넌트에 이펙트 생성 요청
4. 부모 컴포넌트가 `useEffectStore`의 `addEffect` 메서드 호출
5. 이펙트 스토어에 새 총알 추가 및 고유 키 할당
6. `EffectContainer`가 스토어에서 활성 이펙트 목록을 가져와 렌더링
7. `BulletEffectController`가 설정 파싱 및 `Bullet`과 `MuzzleFlash` 컴포넌트 생성
8. `Bullet` 컴포넌트가 시각적 표현 및 물리 처리
9. 충돌 감지 또는 지속 시간 종료 시 `onComplete` 콜백을 통해 이펙트 제거

---

## 🗂 구현해야 할 파일 목록

- `types/effect.ts`  
  이펙트 타입 정의 (수정 - 파일이 없다면 추가)

- `store/effectStore.ts`  
  이펙트 상태 관리 (수정 - 파일이 없다면 추가)

- `effects/BulletEffectController.tsx`  
  총알 설정 및 제어

- `effects/Bullet.tsx`  
  총알 시각화, 물리 처리, 충돌 처리

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

- `effects/MuzzleFlash.tsx`  
  총구 섬광 효과 컴포넌트

- `EffectContainer.tsx`  
  이펙트 렌더링 컨테이너 (수정 - 파일이 없다면 추가)

- `Player.tsx` (수정)  
  총알 발사 기능 추가

---

## 파일별 상세 구현

1. types/effect.ts

```tsx
/**
 * Effect type enumeration
 */
export enum EffectType {
  BULLET = 'BULLET',
  MUZZLE_FLASH = 'MUZZLE_FLASH',
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
import { create } from 'zustand';
import { ActiveEffect, EffectData } from '../types/effect';

// Define state interface
interface EffectState {
  activeEffects: ActiveEffect[]; // List of active effects
  effectKeyCounter: number; // Effect unique key counter
  // Action to add an effect
  addEffect: (type: string, sender?: string, config?: Record<string, any>) => number; // Returns the key of the added effect
  // Action to remove an effect
  removeEffect: (key: number) => void;
}

// Create Zustand store
export const useEffectStore = create<EffectState>((set, get) => ({
  activeEffects: [], // Initial state: empty array
  effectKeyCounter: 0, // Initial state: 0

  // Implement effect addition
  addEffect: (type, sender, config) => {
    const newKey = get().effectKeyCounter; // Generate a new key with the current counter value
    // Create EffectData object
    const effectData: EffectData = {
      type,
      config: config,
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
      activeEffects: state.activeEffects.filter((effect) => effect.key !== keyToRemove),
    }));
    console.log(`[EffectStore] Effect removed: key=${keyToRemove}`);
  },
}));

// Convenience selector hook
export const useActiveEffects = () => useEffectStore((state) => state.activeEffects);
```

3. effects/BulletEffectController.tsx

```tsx
import * as THREE from 'three';
import { Bullet } from './Bullet';
import { MuzzleFlash } from './MuzzleFlash';
import { IntersectionEnterPayload } from '@react-three/rapier';

type Primitive = string | number | boolean | null | undefined | symbol | bigint;
type PrimitiveOrArray = Primitive | Primitive[];

const DEFAULT_SPEED = 100;
const DEFAULT_DURATION = 2000;
const DEFAULT_MUZZLE_FLASH_DURATION = 100;
const DEFAULT_SCALE = 1;

export interface BulletEffectControllerProps {
  config: { [key: string]: PrimitiveOrArray };
  onHit?: (other: IntersectionEnterPayload, pos?: THREE.Vector3) => boolean;
  onComplete?: () => void;
}

// Utility to convert THREE.Vector3 to array (needed for store/server)
const vecToArray = (vec: THREE.Vector3): [number, number, number] => {
  return [vec.x, vec.y, vec.z];
};

// Utility to convert Vector3 array to THREE.Vector3 (needed for rendering)
const arrayToVec = (arr?: [number, number, number]): THREE.Vector3 => {
  if (!arr) {
    console.error('Missing required config properties');
    return new THREE.Vector3();
  }
  return new THREE.Vector3(arr[0], arr[1], arr[2]);
};

export interface BulletEffectConfig {
  startPosition: THREE.Vector3;
  direction: THREE.Vector3;
  speed?: number;
  duration?: number;
  scale?: number;
  color?: string;
  flashDuration?: number;
}

export const createBulletEffectConfig = (config: BulletEffectConfig): { [key: string]: PrimitiveOrArray } => {
  return {
    startPosition: vecToArray(config.startPosition),
    direction: vecToArray(config.direction),
    speed: config.speed || DEFAULT_SPEED,
    duration: config.duration || DEFAULT_DURATION,
    scale: config.scale || DEFAULT_SCALE,
    color: config.color,
    flashDuration: config.flashDuration || DEFAULT_MUZZLE_FLASH_DURATION,
  };
};

const parseConfig = (config: { [key: string]: any }) => {
  return {
    startPosition: arrayToVec(config.startPosition as [number, number, number]),
    direction: arrayToVec(config.direction as [number, number, number]),
    speed: (config.speed as number) || DEFAULT_SPEED,
    duration: (config.duration as number) || DEFAULT_DURATION,
    scale: (config.scale as number) || DEFAULT_SCALE,
    color: config.color,
    flashDuration: (config.flashDuration as number) || DEFAULT_MUZZLE_FLASH_DURATION,
  };
};

export const BulletEffectController: React.FC<BulletEffectControllerProps> = ({ config, onHit, onComplete }) => {
  const { startPosition, direction, speed, duration, scale, flashDuration, color } = parseConfig(config);
  if (!startPosition || !direction || !speed || !duration) {
    console.error('[BulletEffectController] Missing required config properties');
    onComplete?.();
    return null;
  }

  const calcStartPosition = startPosition.clone().add(direction.clone().multiplyScalar(1));

  return (
    <>
      <Bullet
        startPosition={calcStartPosition}
        direction={direction}
        scale={scale}
        speed={speed}
        duration={duration}
        color={color}
        onHit={onHit}
        onComplete={onComplete}
      />
      <MuzzleFlash
        config={{
          position: vecToArray(calcStartPosition),
          direction: vecToArray(direction),
          duration: flashDuration,
        }}
      />
    </>
  );
};
```

4. effects/Bullet.tsx

```tsx
import * as THREE from 'three';
import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { CollisionGroup, collisionGroups } from 'vibe-starter-3d';
import { RigidBody, CuboidCollider, IntersectionEnterPayload } from '@react-three/rapier';
import { ActiveCollisionTypes } from '@dimforge/rapier3d-compat';

const DEFAULT_SIZE = new THREE.Vector3(0.5, 0.5, 1);
const DEFAULT_MEMBERSHIP_COLLISION_GROUP = CollisionGroup.Projectile;
const DEFAULT_EXCLUDE_COLLISION_GROUP = [CollisionGroup.LocalPlayer];

export interface BulletProps {
  startPosition: THREE.Vector3;
  direction: THREE.Vector3;
  color?: THREE.ColorRepresentation | undefined;
  scale?: number;
  speed: number;
  duration: number;
  onHit?: (other: IntersectionEnterPayload, pos?: THREE.Vector3) => boolean; // Callback on collision
  onComplete?: () => void;
}

export const Bullet: React.FC<BulletProps> = ({ startPosition, direction, color = 'orange', scale = 1, speed, duration, onHit, onComplete }) => {
  const [active, setActive] = useState(true);
  const rigidRef = useRef(null);
  const timeRef = useRef(0);
  const normalizedDirection = direction.clone().normalize();
  const bulletGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.3);
  const bulletMaterial = new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 2 });
  const onCompleteRef = useRef(onComplete);
  const startTime = useRef(Date.now());

  // Bullet removal function
  const removeBullet = useCallback(() => {
    if (active) {
      setActive(false);
      if (onCompleteRef.current) onCompleteRef.current();
    }
  }, [active]);

  const createCollisionGroups = useMemo(() => {
    return collisionGroups(DEFAULT_MEMBERSHIP_COLLISION_GROUP, DEFAULT_EXCLUDE_COLLISION_GROUP);
  }, []);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    // Reset the timer when the component mounts
    timeRef.current = 0;
    startTime.current = Date.now();
    setActive(true);

    // Automatically remove bullet after the specified duration
    const timer = setTimeout(() => {
      removeBullet();
    }, duration);

    return () => {
      clearTimeout(timer);
    };
  }, [duration, removeBullet]);

  useFrame(() => {
    if (!active || !rigidRef.current) return;

    const elapsed = Date.now() - startTime.current;
    // Destroy when lifetime ends (backup check)
    if (elapsed > duration) {
      removeBullet();
    }
  });

  // Calculate rotation quaternion in the firing direction
  const bulletQuaternion = useMemo(() => {
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normalizedDirection);
    return quaternion;
  }, [normalizedDirection]);

  // Calculate rotation & position for RigidBody
  const bulletRotation = useMemo(() => {
    return new THREE.Euler().setFromQuaternion(bulletQuaternion);
  }, [bulletQuaternion]);

  // Calculate actual bullet size (base geometry × scale)
  const actualBulletSize = useMemo(() => {
    return {
      x: bulletGeometry.parameters.width * DEFAULT_SIZE.x,
      y: bulletGeometry.parameters.height * DEFAULT_SIZE.y,
      z: bulletGeometry.parameters.depth * DEFAULT_SIZE.z,
    };
  }, [bulletGeometry.parameters]);

  // Don't render if the bullet has been removed
  if (!active) return null;

  return (
    <RigidBody
      ref={rigidRef}
      type="dynamic"
      position={[startPosition.x, startPosition.y, startPosition.z]}
      linearVelocity={normalizedDirection.clone().multiplyScalar(speed).toArray()}
      colliders={false}
      sensor={true}
      rotation={bulletRotation}
      activeCollisionTypes={ActiveCollisionTypes.ALL}
      onIntersectionEnter={(payload) => {
        const translation = rigidRef.current?.translation();
        const hitPosition = translation ? new THREE.Vector3(translation.x, translation.y, translation.z) : undefined;
        if (onHit) {
          if (onHit(payload, hitPosition)) {
            removeBullet();
          }
        } else {
          removeBullet();
        }
      }}
      gravityScale={0}
      collisionGroups={createCollisionGroups}
    >
      <group scale={scale}>
        {/* CuboidCollider for bullet collision - considers both base geometry size and scale */}
        <CuboidCollider args={[actualBulletSize.x / 2, actualBulletSize.y / 2, actualBulletSize.z / 2]} />

        <mesh geometry={bulletGeometry} material={bulletMaterial} scale={DEFAULT_SIZE} />
      </group>
    </RigidBody>
  );
};
```

5. effects/MuzzleFlash.tsx

```tsx
import React, { useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

type Primitive = string | number | boolean | null | undefined | symbol | bigint;
type PrimitiveOrArray = Primitive | Primitive[];

// --- Muzzle Flash Configuration ---
const FLASH_PETAL_COUNT = 5; // Number of flame petals
const FLASH_PETAL_LENGTH = 0.4; // Length of each petal
const FLASH_PETAL_BASE_RADIUS = 0.03; // Base radius of each petal
const FLASH_RADIAL_SEGMENTS = 4; // Number of radial segments for each cone
const FLASH_TILT_ANGLE = Math.PI / 4; // Tilt angle of flame petals (45 degrees)
const FLASH_INNER_GLOW_SIZE = 0.08; // Size of the center glow
const FLASH_COLOR = '#FFA500'; // Orange color
const FLASH_INNER_COLOR = '#FFFF55'; // Brighter yellow for center
const DEFAULT_DURATION = 100; // Default duration
// ------------------------

interface MuzzleFlashProps {
  config: { [key: string]: PrimitiveOrArray };
  onComplete?: () => void;
}

// Utility to convert THREE.Vector3 to array (needed for store/server)
const vecToArray = (vec: THREE.Vector3): [number, number, number] => {
  return [vec.x, vec.y, vec.z];
};

// Utility to convert Vector3 array to THREE.Vector3 (needed for rendering)
const arrayToVec = (arr?: [number, number, number]): THREE.Vector3 => {
  if (!arr) {
    console.error('Missing required config properties');
    return new THREE.Vector3();
  }
  return new THREE.Vector3(arr[0], arr[1], arr[2]);
};

export const createMuzzleFlashConfig = (position: THREE.Vector3, direction: THREE.Vector3, duration: number): { [key: string]: PrimitiveOrArray } => {
  return {
    position: vecToArray(position),
    direction: vecToArray(direction),
    duration,
  };
};

const parseConfig = (config: { [key: string]: any }) => {
  return {
    position: arrayToVec(config.position as [number, number, number]),
    direction: arrayToVec(config.direction as [number, number, number]),
    duration: (config.duration as number) || DEFAULT_DURATION,
  };
};

export const MuzzleFlash: React.FC<MuzzleFlashProps> = ({ config, onComplete }) => {
  const { position, direction, duration } = parseConfig(config);

  const [visible, setVisible] = useState(true);
  const startTime = useMemo(() => Date.now(), []); // Record creation time (for animation)

  // Calculate rotation based on direction
  const flashQuaternion = useMemo(() => {
    const quaternion = new THREE.Quaternion();
    const normalizedDirection = direction.clone().normalize();
    // Rotate the group whose default direction is Z-axis (0,0,1) to the firing direction
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normalizedDirection);
    return quaternion;
  }, [direction]);

  // --- Muzzle Flash Related Memos ---
  const petalGeometry = useMemo(() => new THREE.ConeGeometry(FLASH_PETAL_BASE_RADIUS, FLASH_PETAL_LENGTH, FLASH_RADIAL_SEGMENTS), []);
  const petalMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: FLASH_COLOR,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
      }),
    [],
  );
  const innerGlowGeometry = useMemo(() => new THREE.SphereGeometry(FLASH_INNER_GLOW_SIZE, 16, 8), []);
  const innerGlowMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: FLASH_INNER_COLOR,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 1.0,
        depthWrite: false,
      }),
    [],
  );
  // --- End of Muzzle Flash Related Memos ---

  // Auto-destruction timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      if (onComplete) onComplete();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]); // Timer reset when id or onComplete function changes

  // Opacity animation
  useFrame(() => {
    if (!visible) return;
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const opacity = 1.0 - progress; // Opacity decreases over time

    petalMaterial.opacity = opacity * 0.8;
    innerGlowMaterial.opacity = opacity;
  });

  if (!position || !direction || !duration) {
    console.error('[MuzzleFlash] Missing required config properties');
    return null;
  }

  if (!visible) return null; // Don't render if not visible

  return (
    <group position={position} quaternion={flashQuaternion}>
      {/* Center glow */}
      <mesh geometry={innerGlowGeometry} material={innerGlowMaterial} />

      {/* Flame petals (using ConeGeometry with tilt applied) */}
      {Array.from({ length: FLASH_PETAL_COUNT }).map((_, i) => {
        const radialAngle = (i / FLASH_PETAL_COUNT) * Math.PI * 2;
        return (
          <group key={i} rotation={[0, 0, radialAngle]}>
            <group rotation={[FLASH_TILT_ANGLE, 0, 0]}>
              <mesh geometry={petalGeometry} material={petalMaterial} position={[0, FLASH_PETAL_LENGTH / 2, 0]} />
            </group>
          </group>
        );
      })}
    </group>
  );
};
```

6. EffectContainer.tsx

```tsx
import { useCallback } from 'react';
import { useGameServer } from '@agent8/gameserver';
import * as THREE from 'three';
import { ActiveEffect, EffectType } from './types/effect';
import { useEffectStore, useActiveEffects } from './store/effectStore';
import { IntersectionEnterPayload } from '@react-three/rapier';
import { BulletEffectController } from './effects/BulletEffectController';
import { MuzzleFlash } from './effects/MuzzleFlash';

/**
 * Effect container component using Zustand store for effect management.
 */
export function EffectContainer() {
  // Call ALL hooks unconditionally at the top
  const { connected } = useGameServer();
  const activeEffects = useActiveEffects();
  const removeEffect = useEffectStore((state) => state.removeEffect);

  // Callback to remove completed effects using the store action
  const handleEffectComplete = useCallback(
    (keyToRemove: number) => {
      console.log('[EffectContainer] Effect complete:', keyToRemove);
      removeEffect(keyToRemove);
    },
    [removeEffect],
  );

  // Handler for when an effect hits something (logic might be needed here)
  const handleBulletEffectHit = useCallback((other: IntersectionEnterPayload, pos?: THREE.Vector3, sender?: string) => {
    if (sender) {
      if (other.rigidBody?.userData?.['account'] === sender) return false;
    }

    console.log('Bullet effect hit:', other, pos, sender);
    return true;
  }, []);

  // Function to render individual effects based on their type
  const renderEffect = useCallback(
    (effect: ActiveEffect) => {
      const type = effect.effectData.type;

      switch (type) {
        case EffectType.BULLET:
          return (
            <BulletEffectController
              key={effect.key}
              config={effect.effectData.config}
              onHit={(other, pos) => handleBulletEffectHit(other, pos, effect.sender)}
              onComplete={() => {
                handleEffectComplete(effect.key);
              }}
            />
          );
        case EffectType.MUZZLE_FLASH:
          return <MuzzleFlash key={effect.key} config={effect.effectData.config} />;
        // Add cases for other effect types here
        default:
          console.warn(`[EffectContainer] Unknown effect type: ${type}`);
          return null;
      }
    },
    [handleBulletEffectHit, handleEffectComplete],
  );

  // Now perform the conditional return/render AFTER all hooks have been called
  if (!connected) return null;

  // Render all active effects from the store
  return <>{activeEffects.map(renderEffect)}</>;
}
```

7. Player.tsx
   Player 컴포넌트에 다음 코드를 추가해야 합니다.

```tsx
// Player 컴포넌트 내부에 필요한 임포트 추가:
import { EffectType } from './types/effect';
import { createBulletEffectConfig } from './effects/BulletEffectController';
import { CollisionGroup, collisionGroups } from 'vibe-starter-3d';

// 마법 발사가 트리거 되었는지 추적하는 ref
const magicTriggeredRef = useRef(false);

// Magic casting 로직
const handleMagicCast = useCallback(() => {
  if (!controllerRef?.current?.rigidBodyRef?.current) return;

  console.log('Magic key pressed - Requesting cast!');

  // 부모 컴포넌트에서 제공된 콜백 호출
  if (onCastMagic) {
    // 캐릭터가 바라보는 방향으로 총알 발사
    const rigidBody = controllerRef.current.rigidBodyRef.current;
    const position = rigidBody.translation();
    const startPosition = new THREE.Vector3(position.x, position.y, position.z);
    const rotation = rigidBody.rotation();
    const quaternion = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);

    // 자유로운 시점의 게임 또는 카메라인 경우
    const direction = new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion).normalize();

    // 이펙트 스토어를 통해 총알 생성
    onCastMagic(
      EffectType.BULLET,
      createBulletEffectConfig({
        startPosition,
        direction,
        color: '#ff5500', // 총알 색상
        speed: 100, // 총알 속도
        duration: 2000, // 총알 지속 시간
      }),
    );
  } else {
    console.warn('Player tried to cast magic, but onCastMagic prop is missing!');
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

---

## 🚀 구현 단계 요약

1. **타입 정의 파일 생성**  
   `types/effect.ts` – 이펙트 타입과 구성 구조 정의

2. **이펙트 상태 관리 저장소 구현**  
   `store/effectStore.ts` – Zustand 기반 이펙트 스토어 구현

3. **총알 효과 컨트롤러 구현**  
   `effects/BulletEffectController.tsx` – 설정 파싱 및 이펙트 생성 로직

4. **총알 시각화 및 물리 구현**  
   `effects/Bullet.tsx` – Three.js 기반 시각 표현, Rapier 물리 적용과 충돌 그룹 설정

5. **총구 섬광 효과 구현**  
   `effects/MuzzleFlash.tsx` – 총알 발사 시 표시되는 섬광 효과

6. **이펙트 컨테이너 구현**  
   `EffectContainer.tsx` – 전체 이펙트 렌더링 및 상태 추적

7. **`Player.tsx`에 총알 발사 기능 추가**  
   사용자 입력 처리 및 `spawnEffect` 콜백 연결

---

## ⚠️ 중요 고려사항

- **충돌 그룹 설정**

  - 총알이 자신을 발사한 플레이어와 충돌하지 않도록 `vibe-starter-3d` 노드 모듈 패키지의 `CollisionGroup`와 `collisionGroups`를 이용하여 Rapier Rigidbody의 `collisionGroups`를 설정해야 합니다.

- **네트워크 직렬화**

  - `Vector3`와 같은 객체는 JSON 직렬화 시 `[x, y, z]` 형태의 배열로 변환하여 저장/전송하세요.

- **성능 최적화**

  - 오래된 이펙트는 자동 제거 (지속 시간 기반)
  - 불필요한 충돌 계산 최소화
  - THREE.js 재질의 `depthWrite` 속성을 `false`로 설정하여 반투명 효과로 인한 깊이 버퍼 문제 방지

- **시각 효과 강화**
  - 총알에 발광 효과(emissive) 적용
  - 총구 섬광 크기와 지속 시간 조절
  - 충돌 시 다양한 파티클 효과 추가 가능

---
