import { useRef, useState, useEffect } from "react";
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
  // 머리/얼굴 부분
  head: ["head", "neck", "face", "skull", "spine2"],

  // 왼쪽 손/팔
  leftHand: ["hand_l", "handleft", "lefthand", "hand.l"],

  // 오른쪽 손/팔
  rightHand: ["hand_r", "handright", "righthand", "hand.r"],

  // 왼쪽 발/다리
  leftFoot: ["foot_l", "footleft", "leftfoot", "foot.l"],

  // 오른쪽 발/다리
  rightFoot: ["foot_r", "footright", "rightfoot", "foot.r"],

  // 몸통/허리
  spine: ["spine", "spine1", "waist", "hips", "pelvis"],
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
  /** 디버그 모드 (본 찾기 과정 콘솔 출력) */
  debug?: boolean;
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
      attenuation={attenuation || ((w) => w * 0.5)}
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
    debug = false,
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
          if (debug) {
            console.log(
              "[useBoneTrail] Found skeleton with bones:",
              skeleton.bones.length
            );
            console.log(
              "[useBoneTrail] All bones:",
              skeleton.bones.map((b) => b.name).join(", ")
            );
          }
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
            if (debug)
              console.log(
                `[useBoneTrail] Found bone with pattern '${pattern}': ${bone.name}`
              );
            return bone;
          }
        }
        return null;
      };

      // 각 본 타입별로 찾기
      const foundBones: { [key: string]: THREE.Bone | null } = {};

      for (const [boneType, patterns] of Object.entries(bonePatterns)) {
        foundBones[boneType] = findBoneByPattern(patterns);

        if (debug) {
          console.log(
            `[useBoneTrail] ${boneType}: ${
              foundBones[boneType] ? foundBones[boneType]!.name : "Not found"
            }`
          );
        }
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
          if (debug)
            console.error(
              "[useBoneTrail] Failed to find skeleton after",
              maxRetries,
              "attempts"
            );
        }
      }
    }, retryInterval);

    return () => clearInterval(intervalId);
  }, [modelRef, bonePatterns, debug, retryInterval, maxRetries]);

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

  /**
   * 여러 본에 한번에 트레일 적용
   */
  const createMultipleTrails = (trailConfigs: {
    [boneName: string]: TrailStyle;
  }) => {
    return Object.entries(trailConfigs)
      .filter(([boneName]) => bones[boneName])
      .map(([boneName, style]) => createBoneTrail(boneName, style));
  };

  return {
    bones,
    isLoading,
    error,
    createBoneTrail,
    createMultipleTrails,
  };
}

/**
 * 기본 트레일 스타일 - 색상별로 미리 정의된 스타일
 */
export const DEFAULT_TRAIL_STYLES: { [key: string]: TrailStyle } = {
  head: {
    color: "#00ffff", // 밝은 청록색
    width: 1.0,
    length: 7,
    decay: 1.2,
    attenuation: (width) => width * 0.8,
  },
  leftHand: {
    color: "#ff70ff", // 밝은 마젠타
    width: 0.9,
    length: 6,
    decay: 1.0,
    attenuation: (width) => width * 0.9,
  },
  rightHand: {
    color: "#a0ff50", // 밝은 라임
    width: 0.9,
    length: 6,
    decay: 1.0,
    attenuation: (width) => width * 0.9,
  },
  leftFoot: {
    color: "#ffdd40", // 밝은 앰버
    width: 0.8,
    length: 5,
    decay: 1.5,
    attenuation: (width) => width * 0.9,
  },
  rightFoot: {
    color: "#ff8040", // 밝은 오렌지
    width: 0.8,
    length: 5,
    decay: 1.5,
    attenuation: (width) => width * 0.9,
  },
  spine: {
    color: "#1e90ff", // 다저 블루 (더 눈에 띄는 파란색)
    width: 1.2, // 약간 두꺼운 트레일
    length: 6,
    decay: 1.3,
    attenuation: (width) => width * 0.85,
  },
};

// 사용법 예시 (마지막에 추가):

//  * 사용법 예시
//  *
//  * // 기본 사용법
//  * function MyCharacter() {
//  *   const characterRef = useRef<THREE.Group>(null);
//  *   const characterGroupRef = useRef<THREE.Group>(null);
//  *
//  *   const { isLoading, createBoneTrail, createMultipleTrails } = useBoneTrail(characterRef, {
//  *     characterGroupRef,
//  *     debug: true
//  *   });
//  *
//  *   return (
//  *     <group ref={characterGroupRef}>
//  *       <group ref={characterRef}>
//  *         {/* 캐릭터 모델 */}
//  *         <primitive object={myModel} />
//  *       </group>
//  *
//  *       {/* 단일 본에 트레일 적용 */}
//  *       {!isLoading && createBoneTrail('leftHand', {
//  *         color: '#ff00ff',
//  *         width: 0.8,
//  *         length: 5,
//  *         decay: 1.2
//  *       })}
//  *
//  *       {/* 여러 본에 동시에 트레일 적용 */}
//  *       {!isLoading && createMultipleTrails({
//  *         head: DEFAULT_TRAIL_STYLES.head,
//  *         leftHand: DEFAULT_TRAIL_STYLES.leftHand,
//  *         rightHand: DEFAULT_TRAIL_STYLES.rightHand
//  *       })}
//  *     </group>
//  *   );
//  * }
//  *
//  * // 커스텀 본 패턴으로 사용하기
//  * const myBonePatterns = {
//  *   weapon: ['sword', 'gun', 'weapon'],
//  *   cape: ['cape', 'cloak', 'mantle']
//  * };
//  *
//  * function CharacterWithCustomBones() {
//  *   const { createMultipleTrails } = useBoneTrail(characterRef, {
//  *     bonePatterns: myBonePatterns
//  *   });
//  *
//  *   return (
//  *     <>
//  *       {/* 캐릭터와 무기에 트레일 적용 */}
//  *       {createMultipleTrails({
//  *         weapon: { color: '#ff0000', width: 1.0, length: 8, decay: 1.0 },
//  *         cape: { color: '#5500ff', width: 1.2, length: 6, decay: 1.5 }
//  *       })}
//  *     </>
//  *   );
//  * }
