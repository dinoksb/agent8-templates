import * as THREE from "three";
import {
  useRef,
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from "react";
import {
  RapierRigidBody,
  RigidBody,
  CollisionPayload,
} from "@react-three/rapier";

export interface BaseProjectileProps {
  position: [number, number, number];
  velocity: number;
  direction: THREE.Vector3;
  color?: string;
  size?: [number, number, number];
  mass?: number;
  lifespan?: number;
  sensor?: boolean;
  visible?: boolean;
  gravityScale?: number;
  onCollision?: (collision: CollisionPayload) => void;
  onRemove?: () => void;
}

export interface BaseProjectileHandle {
  getRigidBodyRef: () => React.RefObject<RapierRigidBody>;
  getCurrentPosition: () => THREE.Vector3;
  deactivateProjectile: () => void;
  isActive: boolean;
}

const BaseProjectile = forwardRef<BaseProjectileHandle, BaseProjectileProps>(
  (
    {
      position,
      velocity = 20,
      direction: directionProp,
      size = [0.5, 0.5, 0.5],
      mass = 0.6,
      lifespan,
      sensor = false,
      visible = true,
      gravityScale = 0,
      onCollision,
      onRemove,
    },
    ref
  ) => {
    const rigidBodyRef = useRef<RapierRigidBody>(null);

    // ✅ 상태 기반으로 isActive 관리 (렌더링 자동 트리거)
    const [isActive, setIsActive] = useState(true);

    // ✅ ref로 접근 가능한 값 유지 (최신 상태 동기화)
    const isActiveRef = useRef(true);
    useEffect(() => {
      isActiveRef.current = isActive;
    }, [isActive]);

    const currentPosition = useRef(new THREE.Vector3(...position));

    const deactivateProjectile = useCallback(() => {
      if (!isActiveRef.current) return;

      // 상태 비활성화
      setIsActive(false);

      // 물리 비활성화
      if (rigidBodyRef.current) {
        rigidBodyRef.current.setEnabled(false);
      }

      // 외부 제거 콜백
      onRemove?.();
    }, [onRemove]);

    const handleCollision = useCallback(
      (event: CollisionPayload) => {
        if (!isActiveRef.current) return;
        onCollision?.(event);
        deactivateProjectile();
      },
      [onCollision, deactivateProjectile]
    );

    const updateCurrentPosition = useCallback(() => {
      if (!isActiveRef.current || !rigidBodyRef.current) return;
      const translation = rigidBodyRef.current.translation();
      currentPosition.current.set(
        translation.x,
        translation.y,
        translation.z
      );
      return currentPosition.current;
    }, []);

    const setupInitialVelocity = useCallback(() => {
      if (!isActiveRef.current || !rigidBodyRef.current) return;

      const normalizedDirection = directionProp.clone().normalize();
      const initialVelocity = normalizedDirection.multiplyScalar(velocity);
      rigidBodyRef.current.setLinvel(initialVelocity, false);
    }, [directionProp, velocity]);

    const setupLifespanTimer = useCallback(() => {
      if (!lifespan) return;
      const timer = setTimeout(deactivateProjectile, lifespan);
      return () => clearTimeout(timer);
    }, [lifespan, deactivateProjectile]);

    // 외부 제어용 메서드 제공
    useImperativeHandle(
      ref,
      () => ({
        getRigidBodyRef: () => rigidBodyRef,
        getCurrentPosition: updateCurrentPosition,
        deactivateProjectile,
        isActive,
      }),
      [updateCurrentPosition, deactivateProjectile, isActive]
    );

    useEffect(() => {
      setupInitialVelocity();
      return setupLifespanTimer();
    }, [setupInitialVelocity, setupLifespanTimer]);

    // ❗ 상태로 렌더링 제어
    if (!isActive) return null;

    return (
      <RigidBody
        ref={rigidBodyRef}
        position={position}
        mass={mass}
        sensor={sensor}
        gravityScale={gravityScale}
        onCollisionEnter={handleCollision}
        onIntersectionEnter={handleCollision}
      >
        <mesh>
          <boxGeometry args={size} />
          <meshStandardMaterial
            transparent
            color={"red"}
            opacity={visible ? 1 : 0}
            depthWrite={visible}
          />
        </mesh>
      </RigidBody>
    );
  }
);

export default BaseProjectile;
