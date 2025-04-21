import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RigidBody, IntersectionEnterPayload } from '@react-three/rapier';

/*****************************************************************
 * FireBall.tsx – T‑FB‑001/002 회귀 보호용 스니펫
 *
 *    절대 수정 금지(LOCK) 구역을 변경하면
 *     ─ T‑FB‑001  초기 스폰 테스트
 *     ─ T‑FB‑002  방향·속도 이동 테스트
 *     두 가지 회귀 테스트가 실패합니다!
 *
 * TODO 구역만 수정하세요.
 *****************************************************************/

/* ===== LOCK-BEGIN: 타입 정의 & 유틸 ===== */
interface FireBallProps {
  /** 발사 시작 위치 (월드 좌표)
   * 플레이어 위치에서 약간 앞으로 이동하여 시작 위치가 설정 되도록 합니다.
   * 예)
   * ```tsx
   *
   * const currentPosition = new THREE.Vector3(
   *   playerPos.x,
   *   playerPos.y,
   *   playerPos.z
   * );
   *
   * 바라보는 방향으로 1만큼 앞 위치를 startPosition 으로 설정합니다.
   * startPosition 의 y 좌표는 수정또는 조정하지 않습니다(일반적으로 플레이어의 높이와 동일합니다).
   * const startPosition = currentPosition.clone().add(direction.clone().multiplyScalar(1));
   * ```
   */
  startPosition: THREE.Vector3;
  /**
   * 발사하는 주체 (플레이어 또는 카메라)가 바라보는 정규화된 Forward 벡터.
   * 예 1)  
   * ```tsx
   *  const rotation = rigidBodyRef.current.rotation();
      const quaternion = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);
      const direction = new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion).normalize();
   * ```
   *
   * 예 2) 
   * ```tsx
   * camera.getWorldDirection(new THREE.Vector3())
   * ```
   */
  direction: THREE.Vector3;
  speed: number; // Distance traveled per second
  duration: number; // Lifespan (milliseconds)
  onHit?: (other: IntersectionEnterPayload, pos?: THREE.Vector3) => boolean; // Callback on collision
  onComplete?: () => void;
}
/* ===== LOCK-END =========================================== */

/* ========= LOCK-BEGIN: 스폰 + 이동 로직 =====================
   - T‑FB‑001: startPosition이 그대로 사용됨을 검증
   - T‑FB‑002: direction·speed·elapsed로 산출된 좌표를 검증
   ▶ 이 블록을 변경 시 두 테스트가 실패하므로 절대 수정 금지
================================================================ */
export const FireBall: React.FC<FireBallProps> = ({ startPosition, direction, speed, duration, onHit, onComplete }) => {
  const rigidRef = useRef(null);
  const startTime = useRef(Date.now());

  // 파이어볼 생성 시 초기 위치 설정
  useEffect(() => {
    if (rigidRef.current) {
      rigidRef.current.setNextKinematicTranslation(startPosition);
    }
  });

  useFrame(() => {
    const t = (Date.now() - startTime.current) / 1000; // elapsed sec
    const next = startPosition.clone().add(direction.clone().multiplyScalar(speed * t));
    rigidRef.current?.setNextKinematicTranslation(next);
  });
  /* ===== LOCK-END =========================================== */

  return (
    <RigidBody
      ref={rigidRef}
      type="kinematicPosition"
      position={[startPosition.x, startPosition.y, startPosition.z]} // LOCKED
      gravityScale={0}
    ></RigidBody>
  );
};
