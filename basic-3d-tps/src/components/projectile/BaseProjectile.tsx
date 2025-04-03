import React, { useEffect, useRef, memo } from "react";
import { Vector3 } from "three";
import { useFrame } from "@react-three/fiber";
import {
  RigidBody,
  CuboidCollider,
  RapierRigidBody,
  CollisionEnterPayload,
} from "@react-three/rapier";
import { ProjectileCollisionData } from "../../types/projectile";

/**
 * 기본 투사체 컴포넌트 속성
 */
export interface BaseProjectileProps {
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
  /** 자식 컴포넌트 (시각적 표현) */
  children: React.ReactNode;
}

/**
 * 기본 투사체 컴포넌트
 *
 * 모든 투사체 타입의 기본이 되는 컴포넌트입니다.
 * Rapier 물리 엔진을 사용하여 투사체의 움직임과 충돌을 시뮬레이션합니다.
 * 시각적 표현은 children으로 받아서 사용합니다.
 */
export const BaseProjectile: React.FC<BaseProjectileProps> = memo(
  ({
    id = "",
    position = new Vector3(),
    direction = new Vector3(0, 0, 1),
    speed = 10,
    lifetime = 5,
    scale = new Vector3(0.2, 0.2, 0.2),
    onCollision,
    onLifetimeEnd,
    children,
  }) => {
    // 레퍼런스 및 상태 관리
    const rigidBodyRef = useRef<RapierRigidBody>(null);
    const activeRef = useRef(true);
    const elapsedTimeRef = useRef(0);
    const initialPosition = useRef(position.clone());
    const currentPositionRef = useRef(position.clone());
    const currentVelocityRef = useRef(
      direction.clone().normalize().multiplyScalar(speed)
    );

    // 정규화된 방향 벡터
    const normalizedDirection = direction.clone().normalize();

    // 물리 초기화 - 속도 설정
    useEffect(() => {
      if (!rigidBodyRef.current) return;

      const velocity = normalizedDirection.clone().multiplyScalar(speed);
      rigidBodyRef.current.setLinvel(
        { x: velocity.x, y: velocity.y, z: velocity.z },
        true
      );

      // 각속도 초기화 (회전 방지)
      rigidBodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);

      // 초기값 저장
      initialPosition.current = position.clone();
      currentVelocityRef.current = velocity.clone();

      // 컴포넌트 마운트 시 경과 시간 초기화
      elapsedTimeRef.current = 0;
      activeRef.current = true;

      return () => {
        // 언마운트 시 정리
        activeRef.current = false;
      };
    }, [normalizedDirection, speed, position]);

    // 안전하게 위치 업데이트
    useFrame(() => {
      if (!activeRef.current || !rigidBodyRef.current) return;

      try {
        // 현재 위치 안전하게 캐싱 (다른 코드에서 직접 rigidBody에 접근하지 않도록)
        const translation = rigidBodyRef.current.translation();
        currentPositionRef.current.set(
          translation.x,
          translation.y,
          translation.z
        );

        const linvel = rigidBodyRef.current.linvel();
        currentVelocityRef.current.set(linvel.x, linvel.y, linvel.z);
      } catch {
        // 에러 무시 - 다음 프레임에서 다시 시도
      }
    });

    // 수명 체크 및 관리
    useFrame((_, delta) => {
      if (!activeRef.current) return;

      // R3F의 delta 시간을 사용해 경과 시간 누적 (초 단위)
      elapsedTimeRef.current += delta;

      // 수명 체크
      if (lifetime && elapsedTimeRef.current >= lifetime) {
        activeRef.current = false;
        if (onLifetimeEnd) onLifetimeEnd(id);
      }
    });

    // 충돌 핸들러 함수
    const handleCollision = (event: CollisionEnterPayload) => {
      if (!activeRef.current) return;

      // 간단한 충돌 로그
      console.log(`🔥 충돌 감지: 투사체 ID=${id}, 충돌 발생!`);

      const otherRigidBody = event.other.rigidBody;
      if (otherRigidBody) {
        // ecctrl 캐릭터와의 충돌 감지
        try {
          // 충돌체가 캐릭터 컨트롤러인지 확인 (bodyType으로 추측)
          const bodyType = otherRigidBody.bodyType();

          // 캐릭터 컨트롤러는 대부분 kinematic(2) 타입
          if (bodyType === 2) {
            console.log("👤 캐릭터 컨트롤러와 충돌 감지됨");
          } else if (bodyType === 1) {
            // Fixed body (지형, 바닥, 벽 등)
            console.log("🧱 지형(맵)과 충돌");
          } else {
            // 동적 물체
            console.log("📦 동적 물체와 충돌");
          }

          console.log(
            `📦 충돌 대상: ${
              bodyType === 0
                ? "동적(dynamic)"
                : bodyType === 1
                ? "고정(fixed)"
                : "운동학적(kinematic)"
            } 물체`
          );
        } catch (e) {
          console.error("충돌 대상 정보 가져오기 오류", e);
        }
      }

      if (onCollision) {
        try {
          // 직접 rigidBody에 접근하지 않고 캐싱된 값 사용
          onCollision({
            projectileId: id,
            collidedWith: event.other,
            collisionPoint: currentPositionRef.current.clone(),
            velocity: currentVelocityRef.current.clone(),
          });
        } catch (error) {
          console.error("Error processing collision data:", error);
        }
      }

      // 충돌 후 비활성화
      activeRef.current = false;
    };

    // 비활성화 시 렌더링하지 않음
    if (!activeRef.current) return null;

    return (
      <RigidBody
        ref={rigidBodyRef}
        position={[position.x, position.y, position.z]}
        type="dynamic"
        colliders={false}
        sensor={true}
        gravityScale={0}
        linearDamping={0}
        angularDamping={1}
        friction={0}
        restitution={0}
        onCollisionEnter={handleCollision}
        ccd={true}
        // 충돌 그룹 설정 (캐릭터와 충돌하지 않도록)
        collisionGroups={0x00000002}
      >
        {/* 충돌 감지를 위한 콜라이더 */}
        <CuboidCollider
          args={[scale.x / 2, scale.y / 2, scale.z / 2]}
          sensor={true}
        />

        {/* 시각적 표현은 자식 컴포넌트로만 제공 */}
        {children}
      </RigidBody>
    );
  }
);

// 디스플레이 이름 설정 (개발 도구에서 확인 용이)
BaseProjectile.displayName = "BaseProjectile";
