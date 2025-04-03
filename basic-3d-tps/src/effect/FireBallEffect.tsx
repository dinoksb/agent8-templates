import { Color, Vector2 } from "three";
import { AdditiveBlending } from "three";
import { Vector3 } from "three";
import { ShaderEffect } from "./ShaderEffect";
import fragmentShader from "../../public/shaders/fire/fire.frag.glsl";
import vertexShader from "../../public/shaders/fire/fire.vert.glsl";
import { useMemo } from "react";

export const FireBallEffect: React.FC<{
  position: Vector3;
  scale?: number;
  normal?: Vector3;
  duration?: number;
  disableBillboard?: boolean;
  volume?: boolean;
}> = ({ position, scale, normal, duration, disableBillboard = false, volume = true }) => {

  const resolutionUniform = useMemo(() => ({
    value: new Vector2(window.innerWidth, window.innerHeight)
  }), [])

  return (
    <ShaderEffect
      position={position}
      vertexShader={vertexShader}
      fragmentShader={fragmentShader}
      scale={scale * 1.2}
      color={new Color(1, 1, 1)}
      duration={duration}
      blending={AdditiveBlending}
      normal={normal}
      disableBillboard={disableBillboard}
      depthWrite={false}
      depthTest={false}
      volume={volume}
      uniforms={{
        resolution: resolutionUniform,
        time: { value: 0 },
      }}
      fadeOut={true}
    />
  );
};
