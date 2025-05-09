import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { keyboardMap } from '../../constants/controls';
import { KeyboardControls } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import Experience from '../r3f/Experience';
import EffectContainer from '../r3f/EffectContainer';

/**
 * Main game scene component
 *
 * This component is responsible for setting up the 3D environment
 * including physics, lighting, and scene elements.
 */
const GameScene: React.FC = () => {
  return (
    <div className="relative w-full h-screen">
      {/* Keyboard preset */}
      <KeyboardControls map={keyboardMap}>
        {/* Single Canvas for the 3D scene */}
        <Canvas
          shadows
          onPointerDown={(e) => {
            (e.target as HTMLCanvasElement).requestPointerLock();
          }}
        >
          <Physics>
            <Suspense fallback={null}>
              <Experience />
              <EffectContainer />
            </Suspense>
          </Physics>
        </Canvas>
      </KeyboardControls>

      {/* Crosshair rendered as a standard HTML element outside the Canvas */}
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
        <div className="crosshair-container relative flex items-center justify-center w-6 h-6">
          {/* Horizontal line with black outline */}
          <div className="w-3 h-[1px] bg-white opacity-100 absolute shadow-[0_0_0_1px_rgba(0,0,0,0.8)]"></div>
          {/* Vertical line with black outline */}
          <div className="h-3 w-[1px] bg-white opacity-100 absolute shadow-[0_0_0_1px_rgba(0,0,0,0.8)]"></div>
        </div>
      </div>
    </div>
  );
};

export default GameScene;
