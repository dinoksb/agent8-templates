import { Vector3 } from "three";
import { ReactNode } from "react";

/**
 * 투사체 타입 열거형
 */
export enum ProjectileType {
  FIREBALL = "fireball",
}

/**
 * 투사체 충돌 데이터 인터페이스
 */
export interface ProjectileCollisionData {
  /** 투사체 ID */
  projectileId: string;
  /** 충돌한 객체 */
  collidedWith: unknown;
  /** 충돌 지점 */
  collisionPoint: Vector3;
  /** 충돌 시 투사체의 속도 */
  velocity: Vector3;
}

/**
 * 투사체 재질 속성
 */
export interface ProjectileMaterial {
  /** 재질 색상 */
  color?: string;
  /** 발광 색상 */
  emissive?: string;
  /** 발광 강도 */
  emissiveIntensity?: number;
}

/**
 * 투사체 속성 인터페이스 - 컴포넌트에서 사용
 */
export interface ProjectileProps {
  /** 투사체 ID */
  id?: string;
  /** 투사체 위치 */
  position?: Vector3;
  /** 투사체 방향 (정규화된 벡터) */
  direction?: Vector3;
  /** 투사체 속도 */
  speed?: number;
  /** 투사체 생존 시간 (초) */
  lifetime?: number;
  /** 투사체 스케일 */
  scale?: Vector3;
  /** 투사체 충돌 콜백 */
  onCollision?: (collisionData: ProjectileCollisionData) => void;
  /** 투사체 수명 종료 콜백 */
  onLifetimeEnd?: (projectileId: string) => void;
  /** 커스텀 속성 - R3F 컴포넌트 전달을 위한 속성 */
  children?: ReactNode;
  /** 커스텀 material 속성 */
  material?: ProjectileMaterial;
  /** 기타 커스텀 속성 */
  [key: string]: unknown;
}
