import { Color, Vector2 } from "three";
import { AdditiveBlending } from "three";
import { Vector3 } from "three";
import { ShaderEffect } from "./ShaderEffect";
import fragmentShader from "../../public/shaders/fire/fire.frag.glsl";
import vertexShader from "../../public/shaders/fire/fire.vert.glsl";

export const FireBallEffect: React.FC<{
  position: Vector3;
  scale?: Vector3;
  normal?: Vector3;
  duration?: number;
  disableBillboard?: boolean;
  volume?: boolean;
}> = ({ position, scale, normal, duration, disableBillboard = false, volume = true }) => {
  // scale이 Vector3로 전달되면 첫 번째 값을 사용
  const scaleValue = scale instanceof Vector3 ? scale.x : 1;

  return (
    <ShaderEffect
      position={position}
      vertexShader={vertexShader}
      fragmentShader={fragmentShader}
      scale={scaleValue * 1.2}
      color={new Color(1, 1, 1)}
      duration={duration}
      blending={AdditiveBlending}
      normal={normal}
      disableBillboard={disableBillboard}
      depthWrite={false}
      depthTest={false}
      volume={volume}
      uniforms={{
        resolution: {
          value: new Vector2(window.innerWidth, window.innerHeight),
        },
        time: { value: 0 },
      }}
      fadeOut={true}
    />
  );
};
