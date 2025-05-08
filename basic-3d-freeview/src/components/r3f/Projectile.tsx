import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useRapier } from '@react-three/rapier';
import { RapierRigidBody } from '@react-three/rapier';
import { Collider, InteractionGroups } from '@dimforge/rapier3d-compat';

interface ProjectileProps {
  startPosition: THREE.Vector3; // starting position of the projectile
  endPosition: THREE.Vector3; // target position of the projectile
  speed: number; // units per second
  owner?: RapierRigidBody; // caster's RigidBody reference - excluded from collision
  effectCollisionGroups?: InteractionGroups; // collision groups to affect
  onHit?: (pos?: THREE.Vector3, rigidBody?: RapierRigidBody, collider?: Collider) => boolean; // callback for hit detection
  onComplete?: () => void;
}

export const Projectile: React.FC<ProjectileProps> = React.memo(({ startPosition, endPosition, speed, owner, effectCollisionGroups, onHit, onComplete }) => {
  const [active, setActive] = useState(true);
  const groupRef = useRef<THREE.Group>(null);
  const distanceTraveled = useRef(0);

  // Access Rapier physics world
  const { rapier, world } = useRapier();

  // Memoize calculation of direction and distance
  const { direction, totalDistance } = useMemo(() => {
    const dir = endPosition.clone().sub(startPosition).normalize();
    const dist = startPosition.distanceTo(endPosition);
    return { direction: dir, totalDistance: dist };
  }, [startPosition, endPosition]);

  // Function to remove the projectile
  const removeBall = useCallback(() => {
    if (active) {
      setActive(false);
      onComplete?.();
    }
  }, [active, onComplete]);

  // Effect to reset state on mount
  useEffect(() => {
    distanceTraveled.current = 0;
    setActive(true);

    // Optional cleanup on unmount (though React will clean up the component)
    return () => {
      // Any additional cleanup if needed
    };
  }, []);

  // Memoize the ray casting function
  const castRay = useCallback(
    (origin: THREE.Vector3, dir: THREE.Vector3, distance: number) => {
      const ray = new rapier.Ray(origin, dir);
      return (world as any).castRay(ray, distance, true, undefined, effectCollisionGroups, undefined, owner);
    },
    [rapier, world, effectCollisionGroups, owner],
  );

  // Handle hit detection
  const handleHit = useCallback(
    (hit: any, ray: any, group: THREE.Group) => {
      const hitPoint = ray.pointAt(hit.timeOfImpact);
      const hitPointVec3 = new THREE.Vector3(hitPoint.x, hitPoint.y, hitPoint.z);
      const hitCollider = hit.collider;
      const hitRigidBody = hitCollider.parent();

      // Move group to exact hit point
      group.position.copy(hitPointVec3);

      // Call onHit callback with collision data
      onHit?.(hitPointVec3, hitRigidBody, hitCollider);
      removeBall();
    },
    [onHit, removeBall],
  );

  // Update position using ray casting for collision detection
  useFrame((_, delta) => {
    if (!active) return;

    const group = groupRef.current;
    if (!group) return;

    // Calculate distance to travel in this frame
    const frameTravelDistance = speed * delta;

    // Check if we will exceed the total distance to end position
    const newDistanceTraveled = distanceTraveled.current + frameTravelDistance;
    if (newDistanceTraveled >= totalDistance) {
      // We've reached the end position, snap to it and remove
      group.position.copy(endPosition);
      removeBall();
      return;
    }

    // Update distance traveled
    distanceTraveled.current = newDistanceTraveled;

    // Use current position as the origin for the ray
    const origin = group.position;

    // Create ray for collision detection
    const ray = new rapier.Ray(origin, direction);

    // Cast ray to check for collisions
    const hit = castRay(origin, direction, frameTravelDistance);

    if (hit) {
      handleHit(hit, ray, group);
      return; // Important! Need to return after handling the hit
    } else {
      // No hit, advance the projectile's position
      const nextPosition = origin.clone().addScaledVector(direction, frameTravelDistance);
      group.position.copy(nextPosition);
    }
  });

  // Don't render if destroyed
  if (!active) return null;

  // Render projectile mesh
  return (
    <group ref={groupRef} position={[startPosition.x, startPosition.y, startPosition.z]}>
      {/* Simple box projectile */}
      <mesh>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="#ff3300" />
      </mesh>
    </group>
  );
});
