import { useRef, useState, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Trail } from "@react-three/drei";
import * as THREE from "three";
import { Vector3, Matrix4 } from "three";

/**
 * 본 이름 패턴 타입 정의
 */
export type BonePatterns = {
  [key: string]: string[];
};

/**
 * 기본 본 패턴 - 일반적인 3D 모델에서 사용되는 본 이름 패턴
 */
export const DEFAULT_BONE_PATTERNS: BonePatterns = {
  spine: ["spine", "spine1", "waist", "hips", "pelvis"],
  head: ["head", "neck", "face", "skull"],
  leftHand: ["leftHand", "hand_l", "hand.L", "leftarm", "handl", "left_hand"],
  rightHand: [
    "rightHand",
    "hand_r",
    "hand.R",
    "rightarm",
    "handr",
    "right_hand",
  ],
  leftFoot: ["leftFoot", "foot_l", "foot.L", "leftleg", "footl", "left_foot"],
  rightFoot: [
    "rightFoot",
    "foot_r",
    "foot.R",
    "rightleg",
    "footr",
    "right_foot",
  ],
};

/**
 * 트레일 스타일 타입 정의
 */
export type TrailStyle = {
  color: string;
  width: number;
  length: number;
  decay: number;
  attenuation?: (width: number) => number;
};

/**
 * 본 트레일 옵션 타입 정의
 */
export type BoneTrailOptions = {
  /** 찾고자 하는 본 이름 패턴 */
  bonePatterns?: BonePatterns;
  /** 본 찾기 시도 간격 (ms) */
  retryInterval?: number;
  /** 본 찾기 최대 시도 횟수 */
  maxRetries?: number;
  /** 트레일을 부착할 캐릭터 그룹 ref (스케일, 위치 변환을 적용하기 위함) */
  characterGroupRef?: React.RefObject<THREE.Group>;
};

/**
 * 개별 본에 트레일을 적용하는 컴포넌트
 */
export const BoneTrail: React.FC<{
  bone: THREE.Bone;
  style: TrailStyle;
  characterGroupRef?: React.RefObject<THREE.Group>;
}> = ({ bone, style, characterGroupRef }) => {
  const trailPointRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!bone || !trailPointRef.current) return;

    // 본과 관련된 모든 매트릭스를 업데이트
    bone.updateWorldMatrix(true, false);

    // 본의 월드 위치 구하기
    const worldPos = new Vector3();
    bone.getWorldPosition(worldPos);

    // 캐릭터 그룹이 있는 경우, 그룹 기준 로컬 좌표로 변환
    if (characterGroupRef?.current) {
      // 캐릭터 그룹의 월드 투 로컬 변환 매트릭스
      const groupWorldMatrix = new Matrix4();
      characterGroupRef.current.updateWorldMatrix(true, false);
      groupWorldMatrix.copy(characterGroupRef.current.matrixWorld).invert();

      // 캐릭터 그룹 기준의 로컬 위치로 변환
      const localPos = worldPos.clone().applyMatrix4(groupWorldMatrix);
      trailPointRef.current.position.copy(localPos);
    } else {
      // 캐릭터 그룹이 없는 경우 월드 위치 그대로 사용
      trailPointRef.current.position.copy(worldPos);
    }
  });

  const { color, width, length, decay, attenuation } = style;

  return (
    <Trail
      width={width}
      color={color}
      length={length}
      decay={decay}
      attenuation={attenuation || ((w) => w)}
    >
      <mesh ref={trailPointRef} visible={false}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </Trail>
  );
};

/**
 * 모델에서 본을 찾고 해당 본에 트레일을 적용하는 훅
 */
export function useBoneTrail(
  modelRef: React.RefObject<THREE.Group>,
  options: BoneTrailOptions = {}
) {
  const {
    bonePatterns = DEFAULT_BONE_PATTERNS,
    retryInterval = 100,
    maxRetries = 10,
    characterGroupRef,
  } = options;

  const [bones, setBones] = useState<{ [key: string]: THREE.Bone | null }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 스켈레톤에서 본 찾기
  useEffect(() => {
    if (!modelRef.current) return;

    let retryCount = 0;
    let foundSkeleton = false;

    // 본을 찾는 함수
    const findBones = () => {
      if (!modelRef.current) return false;

      // 모델에서 스켈레톤 찾기
      let skeleton: THREE.Skeleton | null = null;

      modelRef.current.traverse((object) => {
        if (
          object.type === "SkinnedMesh" &&
          (object as THREE.SkinnedMesh).skeleton
        ) {
          skeleton = (object as THREE.SkinnedMesh).skeleton;
        }
      });

      if (!skeleton) return false;
      foundSkeleton = true;

      // 본 이름 패턴으로 찾기
      const findBoneByPattern = (patterns: string[]) => {
        for (const pattern of patterns) {
          const bone = skeleton!.bones.find((b) =>
            b.name.toLowerCase().includes(pattern.toLowerCase())
          );
          if (bone) {
            return bone;
          }
        }
        return null;
      };

      // 각 본 타입별로 찾기
      const foundBones: { [key: string]: THREE.Bone | null } = {};

      for (const [boneType, patterns] of Object.entries(bonePatterns)) {
        foundBones[boneType] = findBoneByPattern(patterns);
      }

      setBones(foundBones);
      setIsLoading(false);
      return true;
    };

    // 본을 찾을 때까지 주기적으로 시도
    const intervalId = setInterval(() => {
      retryCount++;

      if (findBones() || retryCount >= maxRetries) {
        clearInterval(intervalId);

        if (!foundSkeleton && retryCount >= maxRetries) {
          setError("Failed to find skeleton in the model");
          setIsLoading(false);
        }
      }
    }, retryInterval);

    return () => clearInterval(intervalId);
  }, [modelRef, bonePatterns, retryInterval, maxRetries]);

  /**
   * 특정 본에 트레일 적용하는 컴포넌트 반환
   */
  const createBoneTrail = (boneName: string, style: TrailStyle) => {
    const bone = bones[boneName];
    if (!bone) return null;

    return (
      <BoneTrail
        key={`trail-${boneName}`}
        bone={bone}
        style={style}
        characterGroupRef={characterGroupRef}
      />
    );
  };

  return {
    bones,
    isLoading,
    error,
    createBoneTrail,
  };
}

/**
 * 단일 본에 트레일을 적용하는 간단한 훅
 */
export function useSingleBoneTrail(
  modelRef: React.RefObject<THREE.Group>,
  boneType: string,
  options: Omit<BoneTrailOptions, "bonePatterns"> = {}
) {
  const { retryInterval = 100, maxRetries = 10, characterGroupRef } = options;

  const [bone, setBone] = useState<THREE.Bone | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 본 패턴 가져오기 (기본 패턴에서 해당 타입 찾기)
  const patterns = useMemo(() => {
    return DEFAULT_BONE_PATTERNS[boneType] || [boneType];
  }, [boneType]);

  // 스켈레톤에서 본 찾기
  useEffect(() => {
    if (!modelRef.current) return;

    let retryCount = 0;
    let foundSkeleton = false;

    // 본을 찾는 함수
    const findBone = () => {
      if (!modelRef.current) return false;

      // 모델에서 스켈레톤 찾기
      let skeleton: THREE.Skeleton | null = null;

      modelRef.current.traverse((object) => {
        if (
          object.type === "SkinnedMesh" &&
          (object as THREE.SkinnedMesh).skeleton
        ) {
          skeleton = (object as THREE.SkinnedMesh).skeleton;
        }
      });

      if (!skeleton) return false;
      foundSkeleton = true;

      // 본 이름 패턴으로 찾기
      for (const pattern of patterns) {
        const foundBone = skeleton.bones.find((b) =>
          b.name.toLowerCase().includes(pattern.toLowerCase())
        );
        if (foundBone) {
          setBone(foundBone);
          setIsLoading(false);
          return true;
        }
      }

      // 본을 찾지 못함
      setIsLoading(false);
      return false;
    };

    // 본을 찾을 때까지 주기적으로 시도
    const intervalId = setInterval(() => {
      retryCount++;

      if (findBone() || retryCount >= maxRetries) {
        clearInterval(intervalId);

        if (!foundSkeleton && retryCount >= maxRetries) {
          setError("Failed to find skeleton in the model");
          setIsLoading(false);
        }
      }
    }, retryInterval);

    return () => clearInterval(intervalId);
  }, [modelRef, patterns, retryInterval, maxRetries]);

  /**
   * 해당 본에 트레일 생성하기
   */
  const createTrail = (color: string = "#ffffff") => {
    if (!bone) return null;

    const style: TrailStyle = {
      color,
      width: 1.5,
      length: 2.5,
      decay: 1.0,
      attenuation: (width) => width,
    };

    return (
      <BoneTrail
        key={`trail-${boneType}`}
        bone={bone}
        style={style}
        characterGroupRef={characterGroupRef}
      />
    );
  };

  return { bone, isLoading, error, createTrail };
}
