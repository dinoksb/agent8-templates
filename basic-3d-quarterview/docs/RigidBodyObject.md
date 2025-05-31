# RigidBodyObject

`RigidBodyObject` is an enhanced physics object component provided by Vibe Starter 3D. Built on top of the standard `@react-three/rapier` `RigidBody` component, it provides **unified collision event handling** and **duplicate event prevention** functionality.

## Overview

`RigidBodyObject` is a wrapper component that enables simplified handling of various collision events that occur in the physics engine. It unifies and improves the complex collision event handling approach of the existing `RigidBody`, allowing developers to implement interaction logic more easily.

## Why Use RigidBodyObject?

Reasons why using `RigidBodyObject` instead of the standard `RigidBody` is strongly recommended:

### 1. **Unified Collision Event Handling**

- Handle both **physical collisions** and **sensor intersections** with a single callback
- Process all collision types consistently with `onTriggerEnter` and `onTriggerExit`
- Provides a simple interface without requiring developers to distinguish collision types

### 2. **Duplicate Event Prevention**

- Automatically prevents duplicate trigger events that can occur in fast physics simulations
- Tracks collider handles to block duplicate events for the same collision
- Enables stable and predictable interaction implementation

### 3. **Comprehensive Detection Capability**

- Detects both solid collisions and sensor intersections
- Handles various interaction scenarios in a consistent manner
- Simplifies complex physics interactions

### 4. **Perfect Compatibility**

- Supports all properties and features of the standard `RigidBody`
- Drop-in replacement (minimal changes to existing code)
- Fully compatible with the React Three Fiber ecosystem

## Key Features

### Unified Trigger Events

- `onTriggerEnter`: Called when collision starts (physical collision + sensor intersection)
- `onTriggerExit`: Called when collision ends (physical collision + sensor intersection)

### Automatic Duplicate Prevention

- Collider handle-based duplicate event filtering
- Stable event handling even in high-performance physics simulations

### Full RigidBody Compatibility

- Supports all `RigidBodyProps`
- Identical usage to existing `RigidBody`

## Interface

### RigidBodyObjectProps

```typescript
interface RigidBodyObjectProps extends RigidBodyProps {
  onTriggerEnter?: (payload: CollisionPayload) => void;
  onTriggerExit?: (payload: CollisionPayload) => void;
}
```

| Property         | Type                                  | Description                                                                               | Default Value |
| ---------------- | ------------------------------------- | ----------------------------------------------------------------------------------------- | ------------- |
| `onTriggerEnter` | `(payload: CollisionPayload) => void` | Callback called when collision starts (includes physical collision + sensor intersection) | Optional      |
| `onTriggerExit`  | `(payload: CollisionPayload) => void` | Callback called when collision ends (includes physical collision + sensor intersection)   | Optional      |

**Note**: This interface extends `RigidBodyProps` from `@react-three/rapier`, so all standard RigidBody properties are available.

### RigidBodyObjectRef

```typescript
type RigidBodyObjectRef = RapierRigidBody;
```

`RigidBodyObjectRef` is completely identical to `RapierRigidBody`, so all Rapier RigidBody methods and properties can be used as-is.

## Usage

### Basic Usage

```tsx
import { RigidBodyObject } from 'vibe-starter-3d';
import { CuboidCollider } from '@react-three/rapier';

function InteractiveBox() {
  const handleTriggerEnter = (payload) => {
    console.log('Collision started:', payload.other.rigidBody?.userData?.type);
    // Handle interaction logic (processes both physical collisions and sensor intersections)
  };

  const handleTriggerExit = (payload) => {
    console.log('Collision ended:', payload.other.rigidBody?.userData?.type);
    // Handle cleanup logic (processes both physical collisions and sensor intersections)
  };

  return (
    <RigidBodyObject type="fixed" onTriggerEnter={handleTriggerEnter} onTriggerExit={handleTriggerExit}>
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="blue" />
      </mesh>
      <CuboidCollider args={[0.5, 0.5, 0.5]} sensor />
    </RigidBodyObject>
  );
}
```

### Real Example: Floor Object

Floor object implementation used in the freeview example:

```tsx
import { RigidBodyObject } from 'vibe-starter-3d';

function Floor() {
  return (
    <RigidBodyObject type="fixed" colliders="trimesh" userData={{ type: 'FLOOR' }}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#3f3f3f" />
      </mesh>
    </RigidBodyObject>
  );
}
```

### Advanced Usage: Item Collection System

```tsx
import { RigidBodyObject } from 'vibe-starter-3d';
import { CuboidCollider } from '@react-three/rapier';
import { useState } from 'react';

function CollectibleItem({ itemId, onCollect }) {
  const [isCollected, setIsCollected] = useState(false);

  const handleTriggerEnter = (payload) => {
    const playerType = payload.other.rigidBody?.userData?.type;

    if (playerType === 'LOCAL_PLAYER' && !isCollected) {
      setIsCollected(true);
      onCollect(itemId);

      // Item collection effect
      console.log(`Item ${itemId} collected!`);
    }
  };

  if (isCollected) return null;

  return (
    <RigidBodyObject type="fixed" userData={{ type: 'ITEM', itemId }} onTriggerEnter={handleTriggerEnter}>
      <mesh>
        <sphereGeometry args={[0.5]} />
        <meshStandardMaterial color="gold" />
      </mesh>
      {/* Set as sensor collider to trigger only without physical collision */}
      <CuboidCollider args={[0.6, 0.6, 0.6]} sensor />
    </RigidBodyObject>
  );
}
```

### Interaction Zone

```tsx
import { RigidBodyObject } from 'vibe-starter-3d';
import { CuboidCollider } from '@react-three/rapier';
import { useState } from 'react';

function InteractionZone() {
  const [playersInZone, setPlayersInZone] = useState(new Set());

  const handleTriggerEnter = (payload) => {
    const playerType = payload.other.rigidBody?.userData?.type;
    const playerId = payload.other.rigidBody?.userData?.account;

    if (playerType === 'LOCAL_PLAYER' || playerType === 'REMOTE_PLAYER') {
      setPlayersInZone((prev) => new Set([...prev, playerId]));
      console.log(`Player ${playerId} entered interaction zone`);
    }
  };

  const handleTriggerExit = (payload) => {
    const playerType = payload.other.rigidBody?.userData?.type;
    const playerId = payload.other.rigidBody?.userData?.account;

    if (playerType === 'LOCAL_PLAYER' || playerType === 'REMOTE_PLAYER') {
      setPlayersInZone((prev) => {
        const newSet = new Set(prev);
        newSet.delete(playerId);
        return newSet;
      });
      console.log(`Player ${playerId} exited interaction zone`);
    }
  };

  return (
    <RigidBodyObject type="fixed" userData={{ type: 'INTERACTION_ZONE' }} onTriggerEnter={handleTriggerEnter} onTriggerExit={handleTriggerExit}>
      {/* Visual indicator (optional) */}
      <mesh>
        <cylinderGeometry args={[2, 2, 0.1]} />
        <meshStandardMaterial color="cyan" transparent opacity={0.3} />
      </mesh>
      {/* Sensor collider */}
      <CuboidCollider args={[2, 1, 2]} sensor />
    </RigidBodyObject>
  );
}
```

### Door Object

```tsx
import { RigidBodyObject } from 'vibe-starter-3d';
import { CuboidCollider } from '@react-three/rapier';
import { useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';

function Door() {
  const [isOpen, setIsOpen] = useState(false);
  const [playersNearby, setPlayersNearby] = useState(0);
  const doorRef = useRef();

  const handleTriggerEnter = (payload) => {
    const playerType = payload.other.rigidBody?.userData?.type;

    if (playerType === 'LOCAL_PLAYER' || playerType === 'REMOTE_PLAYER') {
      setPlayersNearby((prev) => prev + 1);
      setIsOpen(true);
    }
  };

  const handleTriggerExit = (payload) => {
    const playerType = payload.other.rigidBody?.userData?.type;

    if (playerType === 'LOCAL_PLAYER' || playerType === 'REMOTE_PLAYER') {
      setPlayersNearby((prev) => {
        const newCount = prev - 1;
        if (newCount <= 0) {
          setIsOpen(false);
        }
        return Math.max(0, newCount);
      });
    }
  };

  // Door animation
  useFrame((state, delta) => {
    if (doorRef.current) {
      const targetRotation = isOpen ? Math.PI / 2 : 0;
      doorRef.current.rotation.y += (targetRotation - doorRef.current.rotation.y) * delta * 5;
    }
  });

  return (
    <RigidBodyObject type="fixed" userData={{ type: 'DOOR' }} onTriggerEnter={handleTriggerEnter} onTriggerExit={handleTriggerExit}>
      <group ref={doorRef}>
        <mesh>
          <boxGeometry args={[2, 3, 0.2]} />
          <meshStandardMaterial color="brown" />
        </mesh>
        {/* Physical collider (when door is closed) */}
        <CuboidCollider args={[1, 1.5, 0.1]} />
      </group>

      {/* Detection area (sensor) */}
      <CuboidCollider args={[3, 1.5, 3]} sensor position={[0, 0, 1.5]} />
    </RigidBodyObject>
  );
}
```

## Direct Control via Ref

```tsx
import { RigidBodyObject, RigidBodyObjectRef } from 'vibe-starter-3d';
import { useRef, useEffect } from 'react';

function ControlledObject() {
  const rigidBodyRef = useRef<RigidBodyObjectRef>(null);

  useEffect(() => {
    if (!rigidBodyRef.current) return;

    // All RapierRigidBody methods are available
    const position = rigidBodyRef.current.translation();
    const velocity = rigidBodyRef.current.linvel();

    // Control physics properties
    rigidBodyRef.current.setLinvel({ x: 0, y: 5, z: 0 }, true);
    rigidBodyRef.current.setGravityScale(0.5, true);

    console.log('Object position:', position);
    console.log('Object velocity:', velocity);
  }, []);

  const handleTriggerEnter = (payload) => {
    if (rigidBodyRef.current) {
      // Push object upward on collision
      rigidBodyRef.current.setLinvel({ x: 0, y: 10, z: 0 }, true);
    }
  };

  return (
    <RigidBodyObject ref={rigidBodyRef} type="dynamic" onTriggerEnter={handleTriggerEnter}>
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="red" />
      </mesh>
    </RigidBodyObject>
  );
}
```

## CollisionPayload Utilization

You can obtain detailed collision information by utilizing the `CollisionPayload` provided in the `onTriggerEnter` and `onTriggerExit` callbacks:

```tsx
const handleTriggerEnter = (payload) => {
  // Information about the colliding object
  const otherType = payload.other.rigidBody?.userData?.type;
  const otherPosition = payload.other.rigidBody?.translation();
  const otherId = payload.other.rigidBody?.userData?.id;

  // Information about the current object
  const myPosition = payload.target.rigidBody.translation();
  const myType = payload.target.rigidBody?.userData?.type;

  // Collider information
  const isSensorCollision = payload.other.collider.isSensor() || payload.target.collider.isSensor();

  // Distance calculation
  const distance = Math.sqrt(
    Math.pow(myPosition.x - otherPosition.x, 2) + Math.pow(myPosition.y - otherPosition.y, 2) + Math.pow(myPosition.z - otherPosition.z, 2),
  );

  console.log(`${myType} collided with ${otherType} (distance: ${distance})`);

  // Handle by object type
  switch (otherType) {
    case 'LOCAL_PLAYER':
      handlePlayerCollision(payload);
      break;
    case 'ENEMY':
      handleEnemyCollision(payload);
      break;
    case 'ITEM':
      handleItemCollision(payload);
      break;
    default:
      handleGenericCollision(payload);
  }
};
```

## Best Practices

### 1. Object Identification via userData

Set `userData` on objects to easily identify object types during collision handling:

```tsx
<RigidBodyObject userData={{ type: 'ITEM', id: 'sword_001', value: 100 }}>{/* Object content */}</RigidBodyObject>
```

### 2. Appropriate Use of Sensor vs Physical Colliders

- **Sensor Colliders**: When only trigger events are needed (item collection, area detection)
- **Physical Colliders**: When actual physical response is needed (walls, obstacles)

```tsx
{
  /* Sensor: Only triggers, no physical collision */
}
<CuboidCollider args={[1, 1, 1]} sensor />;

{
  /* Physical: Actual collision and physics response */
}
<CuboidCollider args={[1, 1, 1]} />;
```

### 3. Duplicate Event Handling

While `RigidBodyObject` automatically prevents duplicate events, use state management when additional logic is needed:

```tsx
const [isProcessing, setIsProcessing] = useState(false);

const handleTriggerEnter = async (payload) => {
  if (isProcessing) return;

  setIsProcessing(true);
  try {
    await processCollision(payload);
  } finally {
    setIsProcessing(false);
  }
};
```

### 4. Performance Optimization

**⚠️ Warning**: Collision group settings are recommended **only when performance optimization is absolutely necessary**. In most cases, default collision settings are sufficient, and unnecessary optimization can increase code complexity.

Use appropriate collision groups to reduce unnecessary collision checks:

```tsx
<RigidBodyObject
  collisionGroups={interactionGroup(Group.ITEM, [Group.PLAYER])}
  // Items only check collision with players (apply only when performance is critical)
>
  {/* Item content */}
</RigidBodyObject>
```

## Differences from RigidBodyPlayer

| Feature                | RigidBodyObject         | RigidBodyPlayer      |
| ---------------------- | ----------------------- | -------------------- |
| Purpose                | General physics objects | Player-specific      |
| Auto Collider Creation | ❌                      | ✅ (CapsuleCollider) |
| Controller Target      | ❌                      | ✅                   |
| bottomY Property       | ❌                      | ✅                   |
| Multiple Instances     | ✅                      | ❌ (one per scene)   |

## Precautions

1. **Distinguish from RigidBodyPlayer**: `RigidBodyObject` is for general physics objects, and `RigidBodyPlayer` should be used for player characters.

2. **Collision Group Settings**: Only set collision groups when performance optimization is absolutely necessary. Default settings are sufficient in most cases.

3. **Memory Leak Prevention**: When changing state in event handlers, ensure cleanup work is done when components unmount.

4. **Null Checking**: Always use optional chaining when accessing `payload.other.rigidBody?.userData`.

## Migration Guide

How to migrate from existing `RigidBody` to `RigidBodyObject`:

### Existing Code

```tsx
<RigidBody type="fixed" onCollisionEnter={handleCollision} onIntersectionEnter={handleIntersection}>
  <mesh>...</mesh>
</RigidBody>
```

### After Migration

```tsx
<RigidBodyObject
  type="fixed"
  onTriggerEnter={handleTrigger} // Handles both collisions and intersections
>
  <mesh>...</mesh>
</RigidBodyObject>
```

Now you can implement simpler and more stable physics interactions using the powerful features of `RigidBodyObject`!
