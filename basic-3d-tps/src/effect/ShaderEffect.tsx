import React, { useRef, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { animated } from "@react-spring/three";
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  Vector3,
  Mesh,
  Blending,
  Euler,
  Quaternion,
  ShaderMaterial,
  Vector2,
  Matrix4,
} from "three";
import { extend } from "@react-three/fiber";

// Define custom shader material class
class CustomShaderMaterial extends ShaderMaterial {
  constructor(props: any) {
    super({
      uniforms: {
        time: { value: 0 },
        resolution: {
          value: new Vector2(window.innerWidth, window.innerHeight),
        },
        color: { value: new Color(1, 1, 1) },
        invModelMatrix: { value: new Matrix4() },
        scale: { value: new Vector3(1, 1, 1) },
        ...props.uniforms,
      },
      vertexShader: props.vertexShader,
      fragmentShader: props.fragmentShader,
      transparent: true,
      ...props,
    });
  }
}

extend({ CustomShaderMaterial });

interface ShaderEffectProps {
  position: Vector3;
  vertexShader: string;
  fragmentShader: string;
  uniforms?: Record<string, any>;
  scale?: number;
  color?: Color;
  opacity?: number;
  loop?: boolean;
  blending?: number;
  depthWrite?: boolean;
  depthTest?: boolean;
  polygonOffset?: boolean;
  polygonOffsetFactor?: number;
  polygonOffsetUnits?: number;
  fadeOut?: boolean;
  autoPlay?: boolean;
  rotation?: Euler;
  onComplete?: () => void;
  // Animation properties
  scaleAnimation?: {
    start: number;
    mid: number;
    end: number;
  };
  opacityAnimation?: {
    start: number;
    mid: number;
    end: number;
  };
  // Option to disable billboard effect
  disableBillboard?: boolean;
  // Surface normal vector (used for effects like attaching to walls)
  normal?: Vector3;
  // Shader execution time (milliseconds)
  duration?: number;
  materialRef?: React.RefObject<CustomShaderMaterial>;
  // Volume rendering mode (expressing volume with multiple planes)
  volume?: boolean;
}

export const ShaderEffect: React.FC<ShaderEffectProps> = ({
  position,
  vertexShader,
  fragmentShader,
  color = new Color(1, 1, 1),
  duration = 1000,
  scaleAnimation,
  opacityAnimation,
  fadeOut,
  normal,
  uniforms = {},
  materialRef: externalMaterialRef,
  disableBillboard = false,
  rotation,
  blending = AdditiveBlending,
  scale = 1,
  volume = false,
}) => {
  const meshRef = useRef<Mesh>(null);
  const internalMaterialRef = useRef<ShaderMaterial>(null);
  const materialRef = externalMaterialRef || internalMaterialRef;
  const [opacity, setOpacity] = useState(1);
  const [currentScale, setCurrentScale] = useState(scale);
  const [isVisible, setIsVisible] = useState(true);
  const timeRef = useRef(0);
  const { camera } = useThree();

  // Create shader material
  const shaderMaterialProps = {
    vertexShader,
    fragmentShader,
    uniforms: {
      color: { value: color },
      opacity: { value: opacity },
      time: { value: 0 },
      resolution: { value: new Vector2(window.innerWidth, window.innerHeight) },
      invModelMatrix: { value: new Matrix4() },
      scale: { value: new Vector3(1, 1, 1) },
      ...uniforms,
    },
    transparent: true,
    side: DoubleSide,
    blending: blending as Blending,
  };

  // Store quaternion for rotation based on normal vector
  const normalRotationRef = useRef<Quaternion | null>(null);

  // Calculate rotation towards the direction if normal vector is provided
  useEffect(() => {
    if (normal) {
      const upVector = new Vector3(0, 1, 0);
      const quaternion = new Quaternion();
      quaternion.setFromUnitVectors(upVector, normal.clone().normalize());
      normalRotationRef.current = quaternion;
      if (meshRef.current) {
        meshRef.current.quaternion.copy(quaternion);
      }
    }
  }, [normal, disableBillboard]);

  // useFrame for time updates and billboard effects
  useFrame((_, delta) => {
    // Update time
    timeRef.current += delta;

    if (!meshRef.current || !materialRef.current) return;

    // 매 프레임마다 위치 업데이트 - position이 Vector3 객체이므로 참조가 변경되지 않더라도 값이 변경될 수 있음
    if (meshRef.current && position) {
      meshRef.current.position.copy(position);
    }

    // Update uniforms
    materialRef.current.uniforms.time.value = timeRef.current;
    materialRef.current.uniforms.opacity.value = opacity;

    // Update mesh
    meshRef.current.scale.set(currentScale, currentScale, currentScale);

    // Billboard effect (applied only when disableBillboard is false)
    if (!disableBillboard) {
      // Calculate direction vector from camera to mesh
      const dirToCam = camera.position.clone().sub(meshRef.current.position);

      // World up vector (Y-axis)
      const worldUp = new Vector3(0, 1, 0);

      // Calculate right vector using camera direction and world up vector (cross product)
      const right = new Vector3().crossVectors(dirToCam, worldUp).normalize();

      // Recalculate up vector using right vector and camera direction (this makes it always point towards the Y-axis)
      const up = new Vector3().crossVectors(right, dirToCam).normalize();

      // Create rotation matrix with three axes
      const rotationMatrix = new Matrix4().makeBasis(
        right,
        up,
        dirToCam.normalize().negate()
      );

      // Extract quaternion from rotation matrix
      const quaternion = new Quaternion().setFromRotationMatrix(rotationMatrix);

      // Apply quaternion to mesh
      meshRef.current.quaternion.copy(quaternion);

      // Apply Z-axis rotation (if rotation parameter exists)
      if (rotation) {
        // Create quaternion for Z-axis rotation
        const zRotation = new Quaternion().setFromAxisAngle(
          new Vector3(0, 0, 1), // Z-axis
          rotation.z // Rotation angle
        );

        // Apply Z-axis rotation to current quaternion
        meshRef.current.quaternion.multiply(zRotation);
      }
    } else if (normal && normalRotationRef.current) {
      meshRef.current.quaternion.copy(normalRotationRef.current);
      if (rotation) {
        const rotationQuat = new Quaternion();
        rotationQuat.setFromEuler(rotation);
        meshRef.current.quaternion.multiply(rotationQuat);
      }
    } else if (rotation) {
      meshRef.current.setRotationFromEuler(rotation);
    }
  });

  useEffect(() => {
    if (!meshRef.current) return;

    const startTime = Date.now();
    let animationFrameId: number;

    const updateEffect = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Scale animation
      if (scaleAnimation) {
        const { start, mid, end } = scaleAnimation;
        let newScale = scale;

        if (progress < 0.5) {
          const t = progress * 2;
          newScale = scale * (start + (mid - start) * t);
        } else {
          const t = (progress - 0.5) * 2;
          newScale = scale * (mid + (end - mid) * t);
        }

        setCurrentScale(newScale);
      }

      // Opacity animation
      if (opacityAnimation) {
        const { start, mid, end } = opacityAnimation;
        let newOpacity = 1;

        if (progress < 0.5) {
          const t = progress * 2;
          newOpacity = start + (mid - start) * t;
        } else {
          const t = (progress - 0.5) * 2;
          newOpacity = mid + (end - mid) * t;
        }

        setOpacity(newOpacity);
      }

      // Fade out
      if (fadeOut && progress > 0.7) {
        const fadeProgress = (progress - 0.7) / 0.3;
        setOpacity((prev) => Math.max(0, prev * (1 - fadeProgress)));
      }

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(updateEffect);
      } else {
        setIsVisible(false);
      }
    };

    updateEffect();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [duration, scaleAnimation, opacityAnimation, fadeOut, scale]);

  // Window resize handler
  useEffect(() => {
    const handleResize = () => {
      if (materialRef.current) {
        materialRef.current.uniforms.resolution.value.set(
          window.innerWidth,
          window.innerHeight
        );
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!isVisible) return null;

  // Calculate offset from wall
  const offsetPosition = position.clone();
  if (normal) {
    // Move slightly forward in normal direction (0.1 units)
    offsetPosition.add(normal.clone().multiplyScalar(0.1));
  }

  // Modified shader properties
  const modifiedShaderProps = {
    ...shaderMaterialProps,
    side: DoubleSide,
  };

  // Use flat panel that always faces the camera
  return (
    <animated.mesh ref={meshRef} position={offsetPosition}>
      {/* Volume rendering mode - using multiple planes. There are geometric limitations when using a single plane, so multiple planes are used. */}
      <group>
        {/* Base plane - serves as background with the largest size */}
        <mesh position={[0, 0, -0.005]}>
          <planeGeometry args={[1.05, 1.05]} />
          <shaderMaterial
            ref={materialRef}
            args={[
              {
                ...modifiedShaderProps,
                depthWrite: false,
                polygonOffset: true,
                polygonOffsetFactor: -1,
                polygonOffsetUnits: -1,
              },
            ]}
          />
        </mesh>

        {/* 90 degrees rotation (X-axis) - slightly smaller */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <planeGeometry args={[0.98, 0.98]} />
          <shaderMaterial
            args={[
              {
                ...modifiedShaderProps,
                depthWrite: false,
                polygonOffset: true,
                polygonOffsetFactor: -2,
                polygonOffsetUnits: -2,
              },
            ]}
          />
        </mesh>

        {/* 90 degrees rotation (Y-axis) - slightly smaller */}
        <mesh rotation={[0, Math.PI / 2, 0]} position={[0, 0, 0]}>
          <planeGeometry args={[0.99, 0.99]} />
          <shaderMaterial
            args={[
              {
                ...modifiedShaderProps,
                depthWrite: false,
                polygonOffset: true,
                polygonOffsetFactor: -3,
                polygonOffsetUnits: -3,
              },
            ]}
          />
        </mesh>

        {/* 45 degrees rotation (diagonal #1) - even smaller */}
        <mesh rotation={[0, Math.PI / 4, Math.PI / 4]} position={[0, 0, 0.002]}>
          <planeGeometry args={[0.92, 0.92]} />
          <shaderMaterial
            args={[
              {
                ...modifiedShaderProps,
                depthWrite: false,
                polygonOffset: true,
                polygonOffsetFactor: -4,
                polygonOffsetUnits: -4,
              },
            ]}
          />
        </mesh>

        {/* -45 degrees rotation (diagonal #2) - even smaller */}
        <mesh
          rotation={[0, -Math.PI / 4, Math.PI / 4]}
          position={[0, 0, 0.002]}
        >
          <planeGeometry args={[0.9, 0.9]} />
          <shaderMaterial
            args={[
              {
                ...modifiedShaderProps,
                depthWrite: false,
                polygonOffset: true,
                polygonOffsetFactor: -5,
                polygonOffsetUnits: -5,
              },
            ]}
          />
        </mesh>
      </group>
    </animated.mesh>
  );
};

export default ShaderEffect;
