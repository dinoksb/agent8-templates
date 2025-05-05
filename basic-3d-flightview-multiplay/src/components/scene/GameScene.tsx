import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Experience } from '../r3f/Experience';
import { StatusDisplay } from '../ui/StatusDisplay';
import { RTT } from '../ui/RTT';
import { Physics } from '@react-three/rapier';
import { NetworkContainer } from '../r3f/NetworkContainer';
import { EffectContainer } from '../r3f/EffectContainer';
import { KeyboardControls } from '@react-three/drei';
import { keyboardMap } from '../../constants/controls';

/**
 * Game scene props
 */
interface GameSceneProps {
  /** Current room ID */
  roomId: string;
  /** Handler for leaving room */
  onLeaveRoom: () => Promise<void>;
}

/**
 * Main game scene component
 *
 * This component is responsible for setting up the 3D environment
 * including physics, lighting, and scene elements.
 */
export const GameScene: React.FC<GameSceneProps> = ({ roomId, onLeaveRoom }) => {
  return (
    <div className="relative w-full h-screen">
      <div className="absolute top-0 left-0 w-full p-3 flex justify-between items-center z-10">
        <button className="px-3 py-1 border border-gray-300 rounded text-sm bg-black/30 text-white hover:bg-black/50" onClick={onLeaveRoom}>
          Leave Game
        </button>
        <div className="flex items-center space-x-2">
          <RTT />
          <div className="px-3 py-1 bg-black/30 text-white rounded border border-gray-500 text-sm">
            Room ID: <span className="font-semibold">{roomId}</span>
          </div>
        </div>
      </div>

      {/* UI Overlay */}
      <StatusDisplay />

      {/* Keyboard preset */}
      <KeyboardControls map={keyboardMap}>
        <Canvas
          shadows
          camera={{ far: 5000 }}
          onPointerDown={(e) => {
            (e.target as HTMLCanvasElement).requestPointerLock();
          }}
        >
          <Physics>
            <Suspense fallback={null}>
              <Experience />
              <NetworkContainer />
              <EffectContainer />
            </Suspense>
          </Physics>
        </Canvas>
      </KeyboardControls>
    </div>
  );
};
