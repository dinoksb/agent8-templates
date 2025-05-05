import { useRef } from 'react';
import { Environment, Grid } from '@react-three/drei';
import { Floor } from './Floor';
import { useGameServer } from '@agent8/gameserver';
import { ControllerHandle, FirstPersonViewController } from 'vibe-starter-3d';
import { Player } from './Player';

const targetHeight = 1.6;

export function Experience() {
  return (
    <>
      {/* Grid */}
      <Grid
        args={[100, 100]}
        position={[0, 0.1, 0]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#6f6f6f"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#9f9f9f"
        fadeDistance={100}
        fadeStrength={1}
        userData={{ camExcludeCollision: true }}
      />

      <ambientLight intensity={0.7} />

      {/* Environment */}
      <Environment preset="sunset" background={false} />

      {/* player with controller */}
      <FirstPersonViewController targetHeight={targetHeight}>
        <Player />
      </FirstPersonViewController>

      {/* Floor */}
      <Floor />
    </>
  );
}
