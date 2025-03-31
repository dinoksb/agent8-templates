import { Color, Vector3 } from "three";
import vertexShader from "./ghibli.vert.glsl";
import fragmentShader from "./ghibli.frag.glsl";

export const GhibliShader = {
  uniforms: {
    colorMap: {
      value: [
        new Color("#7EB6A4"),
        new Color("#5D9E8F"),
        new Color("#3D7B7D"),
        new Color("#2D5A6B"),
      ],
    },
    brightnessThresholds: {
      value: [0.7, 0.4, 0.1],
    },
    lightPosition: { value: new Vector3(15, 15, 15) },
  },
  vertexShader,
  fragmentShader,
};
