import * as THREE from "three";
import { ReactNode } from "react";

/**
 * 마법 속성 타입 정의 (불, 얼음, 독 등)
 */
export enum MagicElement {
  FIRE = "fire",
  ICE = "ice",
  POISON = "poison",
  EARTH = "earth",
  WIND = "wind",
  NONE = "none",
}

/**
 * 마법 효과 타입 (상태 효과 등)
 */
export enum MagicEffectType {
  DAMAGE = "damage", // 즉시 데미지
  DOT = "dot", // 지속 데미지
  STUN = "stun", // 기절
  SLOW = "slow", // 감속
  BURN = "burn", // 화상 (불)
  FREEZE = "freeze", // 빙결 (얼음)
  POISON = "poison", // 중독 (독)
  KNOCKBACK = "knockback", // 넉백
  HEAL = "heal", // 치유
  BUFF = "buff", // 버프
  DEBUFF = "debuff", // 디버프
  NONE = "none",
}

/**
 * 마법 발동 타입 (발사체, 장판, 지속, 전체 등)
 */
export enum MagicCastType {
  PROJECTILE = "projectile", // 단일 투사체
  AREA = "area", // 지역 효과/장판
  CONTINUOUS = "continuous", // 지속 효과 (브레스 등)
  GLOBAL = "global", // 광역 효과
  TARGETED = "targeted", // 대상 지정 (레이캐스트 등)
  SELF = "self", // 자기 자신에게 효과
}

/**
 * 마법 효과 데이터 인터페이스
 */
export interface MagicEffect {
  type: MagicEffectType; // 효과 타입
  value: number; // 효과 강도/값
  duration?: number; // 지속 시간 (ms)
  interval?: number; // 적용 간격 (Dot 등에 사용)
  radius?: number; // 효과 범위 (반경)
  chance?: number; // 효과 발동 확률 (0-1)
}

/**
 * 마법 기본 속성 인터페이스
 */
export interface BaseMagicProps {
  element?: MagicElement; // 마법 속성
  castType?: MagicCastType; // 발동 타입
  position?: THREE.Vector3 | [number, number, number]; // 시작 위치
  direction?: THREE.Vector3; // 방향
  duration?: number; // 지속 시간 (ms)
  cooldown?: number; // 쿨다운 (ms)
  manaCost?: number; // 마나 소모
  effects?: MagicEffect[]; // 효과 목록
  visualComponent?: ReactNode; // 시각 효과 컴포넌트
  soundEffect?: string; // 사운드 효과
  onCast?: () => void; // 발동 시 콜백
  onHit?: (
    target: THREE.Object3D | THREE.Mesh | unknown,
    point: THREE.Vector3
  ) => void; // 명중 시 콜백
  onComplete?: () => void; // 완료 시 콜백
  debug?: boolean; // 디버그 모드
}

/**
 * 마법 핸들 인터페이스
 * - 외부에서 마법 상태나 기능을 제어할 수 있는 메서드 제공
 */
export interface MagicHandle {
  activate: () => void; // 마법 활성화
  deactivate: () => void; // 마법 비활성화
  isActive: () => boolean; // 활성화 상태 확인
  getPosition: () => THREE.Vector3; // 현재 위치 반환
  getEffects: () => MagicEffect[]; // 효과 목록 반환
}

/**
 * 마법 타입별 추가 속성 인터페이스 정의
 */

// 1. 투사체 마법 추가 속성
export interface ProjectileMagicProps extends BaseMagicProps {
  velocity?: number; // 투사체 속도
  gravity?: number; // 중력 영향
  maxDistance?: number; // 최대 사거리
  size?: [number, number, number]; // 투사체 크기
  mass?: number; // 질량
  piercing?: boolean; // 관통 효과
  bouncing?: boolean; // 튕김 효과
  bounceCount?: number; // 튕김 횟수
  homing?: boolean; // 유도 효과
  homingTarget?: THREE.Object3D | THREE.Vector3; // 유도 대상
  homingStrength?: number; // 유도 강도
}

// 2. 영역 마법 추가 속성
export interface AreaMagicProps extends BaseMagicProps {
  radius?: number; // 영역 반경
  tickRate?: number; // 효과 적용 주기 (ms)
  shape?: "circle" | "square" | "custom"; // 영역 형태
  customShape?: THREE.Shape; // 커스텀 형태 (shape이 custom일 때)
  persistent?: boolean; // 지속 여부
  movingArea?: boolean; // 이동 영역 여부
  moveSpeed?: number; // 이동 속도
  moveDirection?: THREE.Vector3; // 이동 방향
}

// 3. 지속 마법 추가 속성
export interface ContinuousMagicProps extends BaseMagicProps {
  coneAngle?: number; // 원뿔 각도 (라디안)
  coneLength?: number; // 원뿔 길이
  particleCount?: number; // 파티클 수
  particleSize?: number; // 파티클 크기
  particleLifespan?: number; // 파티클 수명
  particleSpeed?: number; // 파티클 속도
  emissionRate?: number; // 방출 속도
}

// 4. 광역 마법 추가 속성
export interface GlobalMagicProps extends BaseMagicProps {
  targetPosition?: THREE.Vector3 | [number, number, number]; // 목표 위치
  spreadRadius?: number; // 확산 반경
  elementCount?: number; // 요소 개수 (메테오 등의 여러 발사체)
  spawnHeight?: number; // 생성 높이
  spawnDelay?: number; // 생성 간격
  spawnPattern?: "random" | "grid" | "circle"; // 생성 패턴
}
