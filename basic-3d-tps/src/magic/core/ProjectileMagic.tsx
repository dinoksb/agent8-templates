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

export interface ProjectileMagicHandle extends MagicHandle {
  getRigidBodyRef: () => React.RefObject<RapierRigidBody>;
}

/**
 * 투사체 마법의 기본 컴포넌트
 * 물리 기반 투사체를 생성하고, 충돌 및 효과를 처리합니다.
 */
const ProjectileMagic = forwardRef<ProjectileMagicHandle, ProjectileMagicProps>(
  (
    {
      // 기본 속성
      position = [0, 0, 0],
      direction = new THREE.Vector3(0, 0, 1), // 기본 방향은 전방
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
    // 상태 및 참조
    const [active, setActive] = useState(true);
    const activeRef = useRef(true);
    const rigidBodyRef = useRef<RapierRigidBody>(null);
    const bounceCountRef = useRef(0);
    const distanceTraveledRef = useRef(0);
    const currentPositionRef = useRef(
      new THREE.Vector3(
        position instanceof THREE.Vector3 ? position.x : position[0],
        position instanceof THREE.Vector3 ? position.y : position[1],
        position instanceof THREE.Vector3 ? position.z : position[2]
      )
    );

    // 활성 상태 동기화
    useEffect(() => {
      activeRef.current = active;
    }, [active]);

    // 투사체 비활성화 함수
    const deactivateProjectile = useCallback(() => {
      if (!activeRef.current) return;

      // 상태 비활성화
      setActive(false);

      // 물리 비활성화
      if (rigidBodyRef.current) {
        rigidBodyRef.current.setEnabled(false);
      }

      // 완료 콜백 호출
      onComplete?.();
    }, [onComplete]);

    // 충돌 핸들러
    const handleCollision = useCallback(
      (event: CollisionPayload) => {
        if (!activeRef.current) return;

        // 충돌한 객체와 지점 정보
        const collidedBody = event.other;
        const collisionPoint = currentPositionRef.current.clone();

        // 관통 처리
        if (piercing) {
          // 관통 시에는 비활성화하지 않고 효과만 적용
          onHit?.(collidedBody, collisionPoint);
        }
        // 바운스 처리
        else if (bouncing && bounceCountRef.current < bounceCount) {
          bounceCountRef.current++;

          // 바운스 로직 (간단한 방향 반전)
          if (rigidBodyRef.current) {
            const vel = rigidBodyRef.current.linvel();
            // 충돌 표면에 따라 반사 방향 계산 (단순화됨)
            rigidBodyRef.current.setLinvel(
              { x: -vel.x, y: vel.y, z: -vel.z },
              true
            );
          }

          // 효과 적용
          onHit?.(collidedBody, collisionPoint);
        }
        // 일반 충돌
        else {
          // 효과 적용
          onHit?.(collidedBody, collisionPoint);

          // 투사체 비활성화
          deactivateProjectile();
        }
      },
      [deactivateProjectile, onHit, piercing, bouncing, bounceCount]
    );

    // 현재 위치 업데이트
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

    // 초기 속도 설정
    const setupInitialVelocity = useCallback(() => {
      if (!activeRef.current || !rigidBodyRef.current) return;

      const normalizedDirection =
        direction instanceof THREE.Vector3
          ? direction.clone().normalize()
          : new THREE.Vector3(0, 0, 1).normalize();

      const initialVelocity = normalizedDirection.multiplyScalar(velocity);
      rigidBodyRef.current.setLinvel(initialVelocity, false);
    }, [direction, velocity]);

    // 수명 타이머 설정
    const setupLifespanTimer = useCallback(() => {
      if (!duration) return;

      const timer = setTimeout(deactivateProjectile, duration);
      return () => clearTimeout(timer);
    }, [duration, deactivateProjectile]);

    // 외부 제어용 핸들 제공
    useImperativeHandle(
      ref,
      () => ({
        getRigidBodyRef: () => rigidBodyRef,
        activate: () => setActive(true),
        deactivate: deactivateProjectile,
        isActive: () => active,
        getPosition: () => currentPositionRef.current.clone(),
        getEffects: () => effects,
      }),
      [active, deactivateProjectile, effects]
    );

    // 프레임 업데이트에서 거리 및 유도 처리
    useFrame((_, delta) => {
      if (!activeRef.current || !rigidBodyRef.current) return;

      // 현재 위치 업데이트
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
        // 현재 속도 가져오기
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

    // 초기화
    useEffect(() => {
      // 마법 발동 콜백
      onCast?.();

      // 초기 속도 설정
      setupInitialVelocity();

      // 수명 타이머 설정
      return setupLifespanTimer();
    }, [onCast, setupInitialVelocity, setupLifespanTimer]);

    // 비활성화 시 렌더링 중단
    if (!active) return null;

    // 위치 변환
    const positionArray: [number, number, number] =
      position instanceof THREE.Vector3
        ? [position.x, position.y, position.z]
        : position;

    return (
      <>
        {/* 물리 개체 */}
        <RigidBody
          ref={rigidBodyRef}
          position={positionArray}
          mass={mass}
          gravityScale={gravity}
          sensor={piercing}
          onCollisionEnter={handleCollision}
          onIntersectionEnter={handleCollision}
        >
          {/* 충돌 감지용 메쉬 */}
          <mesh>
            <boxGeometry args={size} />
            <meshStandardMaterial
              color="red"
              wireframe
              transparent
              opacity={debug ? 1 : 0}
            />
          </mesh>
        </RigidBody>

        {/* 시각 효과 (별도 컴포넌트로 분리) */}
        {visualComponent &&
          React.cloneElement(visualComponent as React.ReactElement, {
            position: currentPositionRef.current,
          })}

        {/* 디버그 정보 */}
        {debug && (
          <group
            position={[
              currentPositionRef.current.x,
              currentPositionRef.current.y + 1,
              currentPositionRef.current.z,
            ]}
          >
            <mesh>
              <sphereGeometry args={[0.1, 8, 8]} />
              <meshBasicMaterial color="yellow" />
            </mesh>
            {homing && homingTarget && (
              <line>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    count={2}
                    array={
                      new Float32Array([
                        currentPositionRef.current.x,
                        currentPositionRef.current.y,
                        currentPositionRef.current.z,
                        homingTarget instanceof THREE.Object3D
                          ? homingTarget.position.x
                          : homingTarget.x,
                        homingTarget instanceof THREE.Object3D
                          ? homingTarget.position.y
                          : homingTarget.y,
                        homingTarget instanceof THREE.Object3D
                          ? homingTarget.position.z
                          : homingTarget.z,
                      ])
                    }
                    itemSize={3}
                  />
                </bufferGeometry>
                <lineBasicMaterial color="red" />
              </line>
            )}
          </group>
        )}
      </>
    );
  }
);

export default ProjectileMagic;
