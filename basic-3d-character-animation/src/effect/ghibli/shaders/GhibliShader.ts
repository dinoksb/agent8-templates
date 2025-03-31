import { Color, Vector3 } from "three";
import vertexShader from "./ghibli.vert.glsl";
import fragmentShader from "./ghibli.frag.glsl";

export const GhibliShader = {
  uniforms: {
    colorMap: {
      value: [
        new Color("#427062"),
        new Color("#33594E"),
        new Color("#234549"),
        new Color("#1E363F"),
      ],
    },
    brightnessThresholds: {
      value: [0.9, 0.45, 0.001],
    },
    lightPosition: { value: new Vector3(15, 15, 15) },
  },
  vertexShader,
  fragmentShader,
};
