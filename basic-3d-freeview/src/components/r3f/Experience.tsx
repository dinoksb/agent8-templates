import { useRef } from 'react';
import { Physics } from '@react-three/rapier';
import { Environment, Grid, KeyboardControls } from '@react-three/drei';
import { CharacterState } from '../../constants/character';
import { FreeViewController, ControllerHandle } from 'vibe-starter-3d';
import { useState } from 'react';
import { useEffect } from 'react';
import { keyboardMap } from '../../constants/controls';
import { Floor } from './Floor';
import { Player, PlayerRef } from './Player';
import { FireballManager } from '../spells/FireBallManager';
import * as THREE from 'three';

export function Experience() {
  const controllerRef = useRef<ControllerHandle>(null);
  const playerRef = useRef<PlayerRef>(null);
  const targetHeight = 1.6;

  /**
   * Delay physics activate
   */
  const [pausedPhysics, setPausedPhysics] = useState(true);
  useEffect(() => {
    const timeout = setTimeout(() => {
      setPausedPhysics(false);
    }, 500);

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (playerRef.current) {
      const boundingBox = playerRef.current.boundingBox;

      if (boundingBox) {
        console.log('Player character size information updated:', boundingBox);
      }
    }
  }, [playerRef.current?.boundingBox]);

  // 플레이어 위치를 가져오는 함수
  const getPlayerPosition = () => {
    if (!controllerRef.current?.rigidBodyRef?.current) {
      return new THREE.Vector3(0, 0, 0);
    }

    const translation = controllerRef.current.rigidBodyRef.current.translation();
    return new THREE.Vector3(translation.x, translation.y, translation.z);
  };

  // 플레이어가 바라보는 방향을 가져오는 함수
  const getPlayerDirection = () => {
    if (!controllerRef.current?.rigidBodyRef?.current) {
      return new THREE.Vector3(0, 0, 1);
    }

    const rotation = controllerRef.current.rigidBodyRef.current.rotation();
    const quaternion = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);
    return new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion).normalize();
  };

  // 파이어볼 충돌 처리 콜백
  const handleFireballHit = (payload, position) => {
    console.log('파이어볼 충돌:', payload, position);
    // 충돌 효과를 구현할 수 있습니다.
    return true; // true를 반환하면 파이어볼이 제거됩니다.
  };

  return (
    <>
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
        userData={{ camExcludeCollision: true }} // this won't be collide by camera ray
      />

      <ambientLight intensity={0.7} />

      <Physics debug={true} paused={pausedPhysics}>
        {/* Keyboard preset */}
        <KeyboardControls map={keyboardMap}>
          {/* Environment */}
          <Environment preset="sunset" background={false} />

          {/* player character with controller */}
          <FreeViewController
            ref={controllerRef}
            targetHeight={targetHeight}
            followLight={{
              position: [20, 30, 10],
              intensity: 1.2,
            }}
          >
            <Player ref={playerRef} initState={CharacterState.IDLE} controllerRef={controllerRef} targetHeight={targetHeight} />
          </FreeViewController>

          {/* 파이어볼 매니저 */}
          <FireballManager getPlayerPosition={getPlayerPosition} getPlayerDirection={getPlayerDirection} onHit={handleFireballHit} />
        </KeyboardControls>

        {/* Floor */}
        <Floor />
      </Physics>
    </>
  );
}
