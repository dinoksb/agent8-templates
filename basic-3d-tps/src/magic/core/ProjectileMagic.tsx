import React, {
  useState,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useEffect,
} from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import {
  RigidBody,
  RapierRigidBody,
  CollisionPayload,
} from "@react-three/rapier";
import { ProjectileMagicProps, MagicHandle } from "./BaseMagic";

/**
 * 투사체 마법의 핸들 인터페이스 - 외부에서 제어할 수 있는 메서드 제공
 */
export interface ProjectileMagicHandle extends MagicHandle {
  getRigidBodyRef: () => React.RefObject<RapierRigidBody>;
}

/**
 * 투사체 마법 컴포넌트
 * 물리 기반 투사체를 생성하고 충돌 및 효과를 처리합니다.
 */
const ProjectileMagic = forwardRef<ProjectileMagicHandle, ProjectileMagicProps>(
  (
    {
      // 기본 속성
      position = [0, 0, 0],
      direction = new THREE.Vector3(0, 0, 1),
      duration = 3000,
      effects = [],
      onCast,
      onHit,
      onComplete,
      debug = false,

      // 투사체 특화 속성
      velocity = 20,
      gravity = 0,
      maxDistance,
      size = [0.5, 0.5, 0.5],
      mass = 1,
      piercing = false,
      bouncing = false,
      bounceCount = 0,
      homing = false,
      homingTarget,
      homingStrength = 0.1,

      // 시각 효과
      visualComponent,
    },
    ref
  ) => {
    // ======================= 상태 및 참조 =======================
    const [active, setActive] = useState(true);
    const activeRef = useRef(true);
    const rigidBodyRef = useRef<RapierRigidBody>(null);
    const bounceCountRef = useRef(0);
    const distanceTraveledRef = useRef(0);

    // 현재 위치 참조 (매 프레임 업데이트)
    const currentPositionRef = useRef(
      position instanceof THREE.Vector3
        ? position.clone()
        : new THREE.Vector3(position[0], position[1], position[2])
    );

    // 활성 상태 동기화
    useEffect(() => {
      activeRef.current = active;
    }, [active]);

    // ======================= 핵심 기능 =======================
    /**
     * 투사체 비활성화 - 충돌 후 또는 수명 종료 시 호출
     */
    const deactivateProjectile = useCallback(() => {
      if (!activeRef.current) return;

      setActive(false);

      if (rigidBodyRef.current) {
        rigidBodyRef.current.setEnabled(false);
      }

      onComplete?.();
    }, [onComplete]);

    /**
     * 현재 위치 업데이트 - 물리 엔진의 위치로 현재 위치를 동기화
     */
    const updatePosition = useCallback(() => {
      if (!activeRef.current || !rigidBodyRef.current) return;

      const translation = rigidBodyRef.current.translation();
      currentPositionRef.current.set(
        translation.x,
        translation.y,
        translation.z
      );

      return currentPositionRef.current;
    }, []);

    /**
     * 충돌 처리 함수 - 물체와 충돌 시 호출
     */
    const handleCollision = useCallback(
      (event: CollisionPayload) => {
        if (!activeRef.current) return;

        const collidedBody = event.other;
        const collisionPoint = currentPositionRef.current.clone();
        const effectsCopy = [...effects]; // 효과 데이터 복사

        // 충돌 시 효과 적용 및 로직 처리
        onHit?.(collidedBody, collisionPoint, effectsCopy);

        // 투사체 타입별 처리
        if (piercing) {
          // 관통형 - 계속 진행
          return;
        } else if (bouncing && bounceCountRef.current < bounceCount) {
          // 바운스형 - 방향 변경
          bounceCountRef.current++;

          if (rigidBodyRef.current) {
            const vel = rigidBodyRef.current.linvel();
            rigidBodyRef.current.setLinvel(
              { x: -vel.x, y: vel.y, z: -vel.z },
              true
            );
          }
        } else {
          // 일반형 - 충돌 후 제거
          deactivateProjectile();
        }
      },
      [deactivateProjectile, onHit, piercing, bouncing, bounceCount, effects]
    );

    /**
     * 초기 속도 설정 - 시작할 때 한 번 호출
     */
    const setupInitialVelocity = useCallback(() => {
      if (!activeRef.current || !rigidBodyRef.current) return;

      const normalizedDirection =
        direction instanceof THREE.Vector3
          ? direction.clone().normalize()
          : new THREE.Vector3(0, 0, 1).normalize();

      const initialVelocity = normalizedDirection.multiplyScalar(velocity);
      rigidBodyRef.current.setLinvel(initialVelocity, false);
    }, [direction, velocity]);

    // ======================= 수명 및 초기화 =======================
    // 수명 타이머 설정
    useEffect(() => {
      if (!duration) return;

      const timer = setTimeout(deactivateProjectile, duration);
      return () => clearTimeout(timer);
    }, [duration, deactivateProjectile]);

    // 초기화
    useEffect(() => {
      onCast?.();
      setupInitialVelocity();
    }, [onCast, setupInitialVelocity]);

    // ======================= 외부 제어 핸들 =======================
    useImperativeHandle(
      ref,
      () => ({
        getRigidBodyRef: () => rigidBodyRef,
        activate: () => setActive(true),
        deactivate: deactivateProjectile,
        isActive: () => active,
        getPosition: () => currentPositionRef.current.clone(),
        getEffects: () => [...effects],
      }),
      [active, deactivateProjectile, effects]
    );

    // ======================= 프레임별 업데이트 =======================
    useFrame((_, delta) => {
      if (!activeRef.current || !rigidBodyRef.current) return;

      // 위치 업데이트
      updatePosition();

      // 최대 거리 체크
      if (maxDistance) {
        const currentVel = rigidBodyRef.current.linvel();
        const speed = Math.sqrt(
          currentVel.x ** 2 + currentVel.y ** 2 + currentVel.z ** 2
        );
        distanceTraveledRef.current += speed * delta;

        if (distanceTraveledRef.current >= maxDistance) {
          deactivateProjectile();
          return;
        }
      }

      // 유도 미사일 로직
      if (homing && homingTarget && homingStrength > 0) {
        const vel = rigidBodyRef.current.linvel();
        const currentVelocity = new THREE.Vector3(vel.x, vel.y, vel.z);
        const currentSpeed = currentVelocity.length();

        // 타겟 방향 계산
        const targetPos =
          homingTarget instanceof THREE.Object3D
            ? homingTarget.position
            : homingTarget;

        const targetDirection = new THREE.Vector3()
          .subVectors(targetPos, currentPositionRef.current)
          .normalize();

        // 현재 방향
        const currentDirection = currentVelocity.clone().normalize();

        // 타겟 방향으로 점진적 회전
        const newDirection = currentDirection.lerp(
          targetDirection,
          homingStrength * delta * 10
        );

        // 새로운 속도 적용 (속도 크기는 유지)
        const newVelocity = newDirection.multiplyScalar(currentSpeed);
        rigidBodyRef.current.setLinvel(newVelocity, true);
      }
    });

    // ======================= 렌더링 =======================
    // 비활성화 시 렌더링 중단
    if (!active) return null;

    // 위치 변환
    const positionArray: [number, number, number] =
      position instanceof THREE.Vector3
        ? [position.x, position.y, position.z]
        : position;

    return (
      <>
        {/* 물리 엔진 객체 */}
        <RigidBody
          ref={rigidBodyRef}
          position={positionArray}
          mass={mass}
          gravityScale={gravity}
          sensor={piercing}
          onCollisionEnter={handleCollision}
          onIntersectionEnter={piercing ? handleCollision : undefined}
        >
          {/* 충돌 감지용 메시 (디버그 모드에서만 보임) */}
          <mesh>
            <boxGeometry args={size} />
            <meshStandardMaterial color="red" visible={debug} />
          </mesh>
        </RigidBody>

        {/* 시각 효과 (별도 컴포넌트) */}
        {visualComponent &&
          React.cloneElement(visualComponent as React.ReactElement, {
            position: currentPositionRef.current,
          })}
      </>
    );
  }
);

export default ProjectileMagic;
