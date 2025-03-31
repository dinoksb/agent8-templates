import * as THREE from "three";

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
  attenuation: (width: number) => number;
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
  /** 트레일 활성화 상태 */
  active?: boolean;
};

/**
 * 랜덤 색상 생성 함수
 * @returns 랜덤 HEX 색상 문자열
 */
export const getRandomColor = (): string => {
  // 밝은 색상을 위해 각 채널의 범위를 128~255로 제한
  const r = Math.floor(Math.random() * 128 + 128)
    .toString(16)
    .padStart(2, "0");
  const g = Math.floor(Math.random() * 128 + 128)
    .toString(16)
    .padStart(2, "0");
  const b = Math.floor(Math.random() * 128 + 128)
    .toString(16)
    .padStart(2, "0");
  return `#${r}${g}${b}`;
};

/**
 * 기본 트레일 스타일 생성 함수
 * @param color 색상 (지정하지 않으면 랜덤 생성)
 * @returns 기본 트레일 스타일 객체
 */
export const createDefaultTrailStyle = (color?: string): TrailStyle => {
  return {
    color: color || getRandomColor(),
    width: 3.5,
    length: 3.5,
    decay: 1.0,
    attenuation: (width) => width,
  };
};

/**
 * 여러 본에 적용할 기본 트레일 스타일 세트 생성
 * @param boneNames 트레일을 적용할 본 이름 배열
 * @returns 본 이름을 키로, 기본 트레일 스타일을 값으로 갖는 객체
 */
export const createDefaultTrailStyles = (
  boneNames: string[]
): { [boneName: string]: TrailStyle } => {
  const styles: { [boneName: string]: TrailStyle } = {};

  boneNames.forEach((name) => {
    styles[name] = createDefaultTrailStyle();
  });

  return styles;
};
