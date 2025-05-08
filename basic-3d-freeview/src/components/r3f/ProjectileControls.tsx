import React, { useContext, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import { ProjectileSystemContext } from './ProjectileSystem';
import { InteractionGroups } from '@dimforge/rapier3d-compat';

// 발사 쿨다운 시간 (ms)
const SHOOT_COOLDOWN = 500;

const ProjectileControls: React.FC = React.memo(() => {
  // 프로젝타일 시스템의 spawnProjectile 함수 가져오기
  const { spawnProjectile } = useContext(ProjectileSystemContext);

  // 키 입력 상태 저장
  const actionKeyPressedLastFrame = useRef(false);

  // 다음 발사 가능 시간 저장
  const shootTimestamp = useRef(0);

  // 키보드 컨트롤(action1 등 감지)
  const [, getKeys] = useKeyboardControls();

  // 매 프레임마다 실행
  useFrame(({ camera }) => {
    // 키보드 입력 직접 확인
    const { action1 } = getKeys();

    const now = Date.now();
    const actionKeyJustPressed = action1 && !actionKeyPressedLastFrame.current;
    actionKeyPressedLastFrame.current = action1;

    if (actionKeyJustPressed && now > shootTimestamp.current) {
      shootTimestamp.current = now + SHOOT_COOLDOWN;

      // 카메라 방향 벡터 얻기
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);

      const bulletSpeed = 10;

      // 카메라 위치 벡터 얻기
      const cameraPosition = new THREE.Vector3();
      camera.getWorldPosition(cameraPosition);

      // 시작 위치는 카메라 위치에서 방향으로 약간 앞으로 이동
      // clone() 사용하여 원본 벡터를 변경하지 않도록 함
      const startPosition = cameraPosition.clone().add(direction.clone().multiplyScalar(1.5));

      // 목표 위치는 방향으로 30유닛 이동한 지점
      const endPosition = startPosition.clone().add(direction.clone().multiplyScalar(30));

      // 프로젝타일 발사
      spawnProjectile(startPosition, endPosition, bulletSpeed, {
        onHit: (hitPosition) => {
          console.log('Hit at position:', hitPosition);
          return true;
        },
      });
    }
  });

  return null; // 이 컴포넌트는 아무것도 렌더링하지 않음
});

export default ProjectileControls;
