import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Trail } from "@react-three/drei";
import * as THREE from "three";
import { Vector3, Matrix4 } from "three";
import {
  DEFAULT_BONE_PATTERNS,
  TrailStyle,
  BoneTrailOptions,
  createDefaultTrailStyles,
} from "./boneTrailUtils";

/**
 * 개별 본에 트레일을 적용하는 컴포넌트
 */
export const BoneTrail: React.FC<{
  bone: THREE.Bone;
  style: TrailStyle;
  characterGroupRef?: React.RefObject<THREE.Group>;
  active?: boolean;
}> = ({ bone, style, characterGroupRef, active = true }) => {
  const trailPointRef = useRef<THREE.Mesh>(null);

  // 트레일 트랜지션을 위한 상태
  const [opacity, setOpacity] = useState(active ? 1 : 0);
  const [currentWidth, setCurrentWidth] = useState(active ? style.width : 0);

  // 트랜지션 속도 설정
  const FADE_SPEED = 0.03; // 불투명도 변화 속도
  const WIDTH_SPEED = 0.07; // 너비 변화 속도

  // active 상태가 변경될 때 트랜지션 처리
  useEffect(() => {
    // 이미 목표 상태에 도달했으면 아무것도 하지 않음
    if (
      (active && opacity === 1 && currentWidth === style.width) ||
      (!active && opacity === 0 && currentWidth === 0)
    ) {
      return;
    }

    // 트랜지션 애니메이션 시작
    const intervalId = setInterval(() => {
      if (active) {
        // 페이드 인 (나타나기) - 너비 먼저 증가
        setCurrentWidth((prev) => {
          const next = Math.min(prev + style.width * WIDTH_SPEED, style.width);
          return next;
        });

        // 너비가 어느 정도 증가한 후 불투명도 증가
        if (currentWidth > style.width * 0.3) {
          setOpacity((prev) => {
            const next = Math.min(prev + FADE_SPEED, 1);
            return next;
          });
        }

        // 완전히 나타났으면 인터벌 정리
        if (opacity >= 0.99 && currentWidth >= style.width * 0.99) {
          setOpacity(1);
          setCurrentWidth(style.width);
          clearInterval(intervalId);
        }
      } else {
        // 페이드 아웃 (사라지기) - 불투명도 먼저 감소
        setOpacity((prev) => {
          const next = Math.max(prev - FADE_SPEED, 0);
          return next;
        });

        // 불투명도가 어느 정도 감소한 후 너비 감소
        if (opacity < 0.7) {
          setCurrentWidth((prev) => {
            const next = Math.max(prev - style.width * WIDTH_SPEED, 0);
            return next;
          });
        }

        // 완전히 사라졌으면 인터벌 정리
        if (opacity <= 0.01 && currentWidth <= 0.01) {
          setOpacity(0);
          setCurrentWidth(0);
          clearInterval(intervalId);
        }
      }
    }, 16); // 약 60fps

    return () => clearInterval(intervalId);
  }, [active, opacity, currentWidth, style.width]);

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

    // 머티리얼 불투명도 업데이트
    if (trailPointRef.current.material) {
      (trailPointRef.current.material as THREE.Material).opacity = opacity;
    }
  });

  const { color, length, decay, attenuation } = style;

  // 완전히 투명하고 너비가 0이면 렌더링하지 않음
  if (opacity === 0 && currentWidth === 0) return null;

  return (
    <Trail
      width={currentWidth}
      color={color}
      length={length}
      decay={decay}
      attenuation={attenuation || ((w) => w * 0.5)}
    >
      <mesh ref={trailPointRef} visible={opacity > 0}>
        <sphereGeometry args={[0.01, 8, 8]} />
        <meshBasicMaterial color={color} transparent={true} opacity={opacity} />
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
    active = true,
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
        active={active}
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

  /**
   * 지정된 본 이름들에 대해 기본 스타일로 트레일 생성
   */
  const createDefaultTrailsForBones = (boneNames?: string[]) => {
    // 본 이름이 지정되지 않았거나 빈 배열인 경우, 기본적으로 허리/엉덩이('spine')에 트레일 생성
    const namesToUse =
      boneNames && boneNames.length > 0 ? boneNames : ["spine"];
    return createMultipleTrails(createDefaultTrailStyles(namesToUse));
  };

  return {
    bones,
    isLoading,
    error,
    createBoneTrail,
    createMultipleTrails,
    createDefaultTrailsForBones,
  };
}

/**
 * 사용법 예시
 *
 * 1. 기본 사용법
 * - characterRef: 캐릭터 모델 참조 (useRef<THREE.Group>)
 * - characterGroupRef: 캐릭터 그룹 참조 (useRef<THREE.Group>) - 선택사항
 * - useBoneTrail 훅 사용: const { isLoading, createDefaultTrailsForBones } = useBoneTrail(characterRef, { options })
 * - 트레일 적용: createDefaultTrailsForBones(['head', 'leftHand', 'rightHand'])
 * - 파라미터 없이 호출: createDefaultTrailsForBones() - 기본적으로 허리/엉덩이('spine')에 트레일 생성
 *
 * 2. 커스텀 본 패턴 사용
 * - 커스텀 본 패턴 정의:
 *   const myBonePatterns = {
 *     weapon: ['sword', 'gun', 'weapon'],
 *     cape: ['cape', 'cloak', 'mantle']
 *   }
 * - useBoneTrail 사용 시 옵션으로 전달:
 *   useBoneTrail(characterRef, { bonePatterns: myBonePatterns })
 *
 * 3. 커스텀 스타일 적용
 * - boneTrailUtils의 createDefaultTrailStyle 함수 사용
 * - import { createDefaultTrailStyle } from './boneTrailUtils'
 * - 스타일 적용 예시:
 *   createMultipleTrails({
 *     weapon: { ...createDefaultTrailStyle('#ff0000'), length: 8 },
 *     cape: { ...createDefaultTrailStyle('#5500ff'), length: 6, decay: 1.5 }
 *   })
 *
 * 4. 모든 발견된 본에 트레일 적용
 * - bones 객체에서 발견된 본 추출:
 *   const allBoneNames = Object.keys(bones).filter(name => bones[name] !== null)
 * - 모든 본에 기본 스타일 적용:
 *   createDefaultTrailsForBones(allBoneNames)
 */
