import React, { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useKeyboardControls } from '@react-three/drei';
import { FireBall } from './FireBall';
import { IntersectionEnterPayload } from '@react-three/rapier';

interface FireballManagerProps {
  /** 플레이어 위치를 가져오는 함수 */
  getPlayerPosition: () => THREE.Vector3;
  /** 플레이어가 바라보는 방향을 가져오는 함수 */
  getPlayerDirection: () => THREE.Vector3;
  /** 충돌 시 호출될 콜백 함수 */
  onHit?: (other: IntersectionEnterPayload, pos?: THREE.Vector3) => boolean;
}

interface FireballState {
  id: number;
  startPosition: THREE.Vector3;
  direction: THREE.Vector3;
}

export const FireballManager: React.FC<FireballManagerProps> = ({ getPlayerPosition, getPlayerDirection, onHit }) => {
  const [fireballs, setFireballs] = useState<FireballState[]>([]);
  const nextId = useRef(0);
  const lastCastTime = useRef(0);
  const COOLDOWN_MS = 2000; // 파이어볼 발사 쿨다운 (2초)
  const FIREBALL_SPEED = 15; // 초당 이동 거리
  const FIREBALL_DURATION = 3000; // 파이어볼 지속 시간 (밀리초)

  // 키보드 입력 감지
  const [subscribeKeys, getKeys] = useKeyboardControls();

  useEffect(() => {
    // 키보드 입력 구독
    const unsubFireball = subscribeKeys(
      (state) => state.fireballCast,
      (pressed) => {
        if (pressed) castFireball();
      },
    );

    return () => {
      unsubFireball();
    };
  }, []);

  // 파이어볼 발사 함수
  const castFireball = () => {
    const now = Date.now();

    // 쿨다운 확인
    if (now - lastCastTime.current < COOLDOWN_MS) return;

    // 현재 플레이어 위치와 방향 가져오기
    const playerPosition = getPlayerPosition();
    const direction = getPlayerDirection();

    // 플레이어 위치보다 약간 앞에서 파이어볼 생성
    const startPosition = playerPosition.clone().add(direction.clone().multiplyScalar(1));

    // 높이 조정 (어깨 높이)
    startPosition.y += 1.5;

    // 새 파이어볼 생성
    const newFireball: FireballState = {
      id: nextId.current++,
      startPosition,
      direction,
    };

    setFireballs((prev) => [...prev, newFireball]);

    // 마지막 발사 시간 업데이트
    lastCastTime.current = now;
  };

  // 파이어볼 제거 함수
  const removeFireball = (id: number) => {
    setFireballs((prev) => prev.filter((fireball) => fireball.id !== id));
  };

  return (
    <>
      {fireballs.map((fireball) => (
        <FireBall
          key={fireball.id}
          startPosition={fireball.startPosition}
          direction={fireball.direction}
          speed={FIREBALL_SPEED}
          duration={FIREBALL_DURATION}
          onHit={onHit}
          onComplete={() => removeFireball(fireball.id)}
        />
      ))}
    </>
  );
};
