import React, { useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { Projectile } from './Projectile';
import { RapierRigidBody } from '@react-three/rapier';
import { Collider, InteractionGroups } from '@dimforge/rapier3d-compat';

// Unique ID for each projectile
let nextProjectileId = 0;

// Type for projectile data
interface ProjectileData {
  id: number;
  startPosition: THREE.Vector3;
  endPosition: THREE.Vector3;
  speed: number;
  owner?: RapierRigidBody;
  effectCollisionGroups?: InteractionGroups;
  onHit?: (pos?: THREE.Vector3, rigidBody?: RapierRigidBody, collider?: Collider) => boolean;
  onComplete?: () => void;
}

// Create a context to access the projectile system from anywhere
export const ProjectileSystemContext = React.createContext<{
  spawnProjectile: (
    startPos: THREE.Vector3,
    endPos: THREE.Vector3,
    speed: number,
    options?: {
      owner?: RapierRigidBody;
      effectCollisionGroups?: InteractionGroups;
      onHit?: (pos?: THREE.Vector3, rigidBody?: RapierRigidBody, collider?: Collider) => boolean;
      onComplete?: () => void;
    },
  ) => void;
}>({
  spawnProjectile: () => {},
});

const ProjectileSystem: React.FC<{ children?: React.ReactNode }> = React.memo(({ children }) => {
  const [projectiles, setProjectiles] = useState<ProjectileData[]>([]);

  // Function to spawn a new projectile
  const spawnProjectile = useCallback(
    (
      startPos: THREE.Vector3,
      endPos: THREE.Vector3,
      speed: number,
      options?: {
        owner?: RapierRigidBody;
        effectCollisionGroups?: InteractionGroups;
        onHit?: (pos?: THREE.Vector3, rigidBody?: RapierRigidBody, collider?: Collider) => boolean;
        onComplete?: () => void;
      },
    ) => {
      const id = nextProjectileId++;

      setProjectiles((prevProjectiles) => [
        ...prevProjectiles,
        {
          id,
          startPosition: startPos.clone(),
          endPosition: endPos.clone(),
          speed,
          owner: options?.owner,
          effectCollisionGroups: options?.effectCollisionGroups,
          onHit: options?.onHit,
          onComplete: options?.onComplete,
        },
      ]);
    },
    [],
  );

  // Remove completed projectiles
  const cleanupProjectile = useCallback((id: number) => {
    setProjectiles((prevProjectiles) => prevProjectiles.filter((projectile) => projectile.id !== id));
  }, []);

  // Context value - memoize to prevent unnecessary renders of context consumers
  const contextValue = useMemo(
    () => ({
      spawnProjectile,
    }),
    [spawnProjectile],
  );

  return (
    <ProjectileSystemContext.Provider value={contextValue}>
      {/* Render all active projectiles */}
      {projectiles.map((projectile) => (
        <Projectile
          key={projectile.id}
          startPosition={projectile.startPosition}
          endPosition={projectile.endPosition}
          speed={projectile.speed}
          owner={projectile.owner}
          effectCollisionGroups={projectile.effectCollisionGroups}
          onHit={projectile.onHit}
          onComplete={projectile.onComplete}
        />
      ))}

      {/* Render children components */}
      {children}
    </ProjectileSystemContext.Provider>
  );
});

export default ProjectileSystem;
