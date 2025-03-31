import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Trail } from "@react-three/drei";
import * as THREE from "three";

/**
 * Trail style type definition
 */
export type TrailStyle = {
  color: string;
  width: number;
  length: number;
  decay: number;
  attenuation?: (width: number) => number;
};

/**
 * Trail options type definition
 */
export type TrailOptions = {
  /** Position vector passed from outside */
  position?: THREE.Vector3 | null;
  /** Custom trail color (required) */
  color: string;
};

/**
 * Default trail style
 */
export const DEFAULT_TRAIL_STYLE: Omit<TrailStyle, "color"> = {
  width: 3.5,
  length: 3.5,
  decay: 1.0,
  attenuation: (width) => width,
};

/**
 * Trail point component - Updates the trail position
 */
export const TrailPoint: React.FC<{
  position: THREE.Vector3 | null;
  style: TrailStyle;
}> = ({ position, style }) => {
  const trailPointRef = useRef<THREE.Mesh>(null);
  const positionRef = useRef<THREE.Vector3 | null>(position);

  // Update position received from outside
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useFrame(() => {
    if (!trailPointRef.current || !positionRef.current) return;

    // Set position directly (coordinate transformation is already handled externally)
    trailPointRef.current.position.copy(positionRef.current);
  });

  return (
    <mesh ref={trailPointRef} visible={false}>
      <sphereGeometry args={[0.05, 8, 8]} />
      <meshBasicMaterial color={style.color} />
    </mesh>
  );
};

/**
 * Trail component - Combines Trail and TrailPoint
 */
export const TrailEffect: React.FC<{
  position: THREE.Vector3 | null;
  style: TrailStyle;
}> = ({ position, style }) => {
  const { color, width, length, decay, attenuation } = style;

  return (
    <Trail
      width={width}
      color={color}
      length={length}
      decay={decay}
      attenuation={attenuation || ((w) => w)}
    >
      <TrailPoint position={position} style={style} />
    </Trail>
  );
};

/**
 * Hook to create a position-based trail
 * Creates a trail based on position received from outside
 */
export function useTrailEffect(
  _: React.RefObject<THREE.Group> | null, // Model reference is not used (kept for backward compatibility)
  options: TrailOptions
) {
  const { position = null, color } = options;

  /**
   * Create trail
   */
  const createTrail = () => {
    // Create trail only if position is provided
    if (position) {
      // Combine default style with required color
      const trailStyle: TrailStyle = {
        ...DEFAULT_TRAIL_STYLE,
        color,
      };

      return (
        <TrailEffect
          key="trail-position"
          position={position}
          style={trailStyle}
        />
      );
    }

    // If no position
    return null;
  };

  return { position, createTrail };
}

/**
 * useTrailEffect Usage Examples
 *
 * 1. Basic Usage:
 * ```tsx
 * // Inside component
 * const [position, setPosition] = useState<THREE.Vector3 | null>(null);
 *
 * // Call useTrailEffect (pass null as first parameter since it's no longer used)
 * const { createTrail } = useTrailEffect(null, {
 *   position: position, // Pass THREE.Vector3 type position
 *   color: "#00ffff", // Required: trail color (cyan)
 * });
 *
 * // Update position each frame (e.g., inside useFrame)
 * useFrame(() => {
 *   // Calculate character's world position
 *   const worldPos = new THREE.Vector3();
 *   character.getWorldPosition(worldPos);
 *
 *   // Coordinate transformation if needed (world -> local)
 *   const groupWorldMatrix = new THREE.Matrix4();
 *   parentGroup.updateWorldMatrix(true, false);
 *   groupWorldMatrix.copy(parentGroup.matrixWorld).invert();
 *   const localPos = worldPos.clone().applyMatrix4(groupWorldMatrix);
 *
 *   // Set transformed position
 *   setPosition(localPos);
 * });
 *
 * // Render trail in JSX
 * return (
 *   <>
 *     <MyCharacterModel />
 *     {createTrail()}
 *   </>
 * );
 * ```
 *
 * 2. Applying trail to a specific bone:
 * ```tsx
 * // characterRef: Reference to character model
 * // characterGroupRef: Reference to character group (needed for coordinate transformation)
 * const [boneLocalPosition, setBoneLocalPosition] = useState<THREE.Vector3 | null>(null);
 *
 * // Call useTrailEffect
 * const { createTrail } = useTrailEffect(null, {
 *   position: boneLocalPosition,
 *   color: "#ff00ff", // Required: trail color (magenta)
 * });
 *
 * // Track bone position
 * useFrame(() => {
 *   if (!characterRef.current || !characterGroupRef.current) return;
 *
 *   // Find desired bone in the model
 *   let foundBone: THREE.Bone | null = null;
 *
 *   // Bone names to look for (in priority order)
 *   const bodyBoneNames = ["spine", "waist", "pelvis", "hips", "torso", "body", "chest"];
 *
 *   characterRef.current.traverse((object) => {
 *     if (foundBone) return; // Stop traversing if bone is already found
 *
 *     if (object.type === "SkinnedMesh" && (object as THREE.SkinnedMesh).skeleton) {
 *       const skeleton = (object as THREE.SkinnedMesh).skeleton;
 *
 *       // Find bone by name (e.g., first match from priority list)
 *       for (const boneName of bodyBoneNames) {
 *         const bone = skeleton.bones.find(
 *           (b) => b.name.toLowerCase().includes(boneName)
 *         );
 *
 *         if (bone) {
 *           foundBone = bone;
 *           break;
 *         }
 *       }
 *     }
 *   });
 *
 *   // Calculate world position if bone is found
 *   if (foundBone) {
 *     // 1. Calculate bone's world position
 *     const worldPos = new THREE.Vector3();
 *     foundBone.updateWorldMatrix(true, false);
 *     foundBone.getWorldPosition(worldPos);
 *
 *     // 2. Transform world coordinates to local coordinates (required)
 *     // Calculate inverse world matrix of characterGroupRef
 *     const groupWorldMatrix = new THREE.Matrix4();
 *     characterGroupRef.current.updateWorldMatrix(true, false);
 *     groupWorldMatrix.copy(characterGroupRef.current.matrixWorld).invert();
 *
 *     // Apply inverse matrix to world coordinates to get local coordinates
 *     const localPos = worldPos.clone().applyMatrix4(groupWorldMatrix);
 *
 *     // Set transformed local position
 *     setBoneLocalPosition(localPos);
 *   } else {
 *     // Use character's position if bone is not found
 *     const worldPos = new THREE.Vector3();
 *     characterRef.current.getWorldPosition(worldPos);
 *
 *     // Transform world coordinates to local coordinates
 *     const groupWorldMatrix = new THREE.Matrix4();
 *     characterGroupRef.current.updateWorldMatrix(true, false);
 *     groupWorldMatrix.copy(characterGroupRef.current.matrixWorld).invert();
 *
 *     const localPos = worldPos.clone().applyMatrix4(groupWorldMatrix);
 *     setBoneLocalPosition(localPos);
 *   }
 * });
 *
 * // Render trail in JSX
 * return (
 *   <>
 *     <group ref={characterGroupRef}>
 *       <Model ref={characterRef} />
 *       {effectsEnabled.trail && createTrail()}
 *     </group>
 *   </>
 * );
 * ```
 */
