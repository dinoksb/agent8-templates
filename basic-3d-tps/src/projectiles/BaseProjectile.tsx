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

// 외부에서 접근할 수 있는 메서드 타입 정의
export interface BaseProjectileHandle {
  getRigidBodyRef: () => React.RefObject<RapierRigidBody>;
  getCurrentPosition: () => THREE.Vector3;
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
    const [isActive, setIsActive] = useState(true);
    const currentPosition = useRef(new THREE.Vector3(...position));

    /**
     * 투사체 비활성화 함수
     * 투사체의 물리 객체를 비활성화하고 콜백을 호출합니다.
     */
    const deactivateProjectile = useCallback(() => {
      if (!isActive) return; // 이미 비활성화된 상태면 무시

      setIsActive(false);

      // 물리 바디 비활성화
      if (rigidBodyRef.current) {
        rigidBodyRef.current.setEnabled(false);
      }

      // 제거 콜백 호출
      if (onRemove) {
        onRemove();
      }
    }, [isActive, onRemove]);

    /**
     * 충돌 핸들러 함수
     * 충돌 이벤트를 처리하고 투사체를 비활성화합니다.
     */
    const handleCollision = useCallback(
      (event: CollisionPayload) => {
        // 사용자 정의 충돌 콜백 호출
        if (onCollision) {
          onCollision(event);
        }

        // 투사체 비활성화
        deactivateProjectile();
      },
      [onCollision, deactivateProjectile]
    );

    /**
     * 현재 위치 정보 가져오기
     * 물리 엔진에서 현재 위치 정보를 가져와 저장합니다.
     */
    const updateCurrentPosition = useCallback(() => {
      if (rigidBodyRef.current) {
        const translation = rigidBodyRef.current.translation();
        currentPosition.current.set(
          translation.x,
          translation.y,
          translation.z
        );
      }
      return currentPosition.current;
    }, []);

    /**
     * 초기 속도 설정 함수
     * 투사체의 초기 속도와 방향을 설정합니다.
     */
    const setupInitialVelocity = useCallback(() => {
      if (!rigidBodyRef.current) return;

      const normalizedDirection = directionProp.clone().normalize();
      const initialVelocity = new THREE.Vector3(
        normalizedDirection.x * velocity,
        normalizedDirection.y * velocity,
        normalizedDirection.z * velocity
      );

      rigidBodyRef.current.setLinvel(initialVelocity, false);
    }, [directionProp, velocity]);

    /**
     * 수명 타이머 설정 함수
     * 지정된 수명 후에 투사체를 비활성화합니다.
     */
    const setupLifespanTimer = useCallback(() => {
      if (!lifespan) return undefined;

      const timer = setTimeout(deactivateProjectile, lifespan);
      return () => clearTimeout(timer);
    }, [lifespan, deactivateProjectile]);

    // 외부에서 접근 가능한 메서드 노출
    useImperativeHandle(
      ref,
      () => ({
        getRigidBodyRef: () => rigidBodyRef,
        getCurrentPosition: updateCurrentPosition,
      }),
      [updateCurrentPosition]
    );

    // 초기 설정 및 수명 타이머
    useEffect(() => {
      setupInitialVelocity();
      return setupLifespanTimer();
    }, [setupInitialVelocity, setupLifespanTimer]);

    // 비활성화 상태면 렌더링하지 않음
    if (!isActive) return null;

    return (
      <RigidBody
        ref={rigidBodyRef}
        position={position}
        mass={mass}
        onCollisionEnter={handleCollision}
        onIntersectionEnter={handleCollision}
        sensor={sensor}
        gravityScale={gravityScale}
      >
        <mesh>
          <boxGeometry args={size} />
          <meshStandardMaterial
            transparent
            opacity={visible ? 1 : 0}
            depthWrite={visible ? true : false}
          />
        </mesh>
      </RigidBody>
    );
  }
);

export default BaseProjectile;
