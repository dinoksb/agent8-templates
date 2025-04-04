import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { BatchedRenderer, QuarksLoader, QuarksUtil } from "three.quarks";
import { useFrame } from "@react-three/fiber";

export interface LightningBallEffectProps {
  position: [number, number, number];
  scale?: number;
  duration?: number;
  onComplete?: () => void;
  jsonPath?: string;
}

export const LightningBallEffect: React.FC<LightningBallEffectProps> = ({
  position,
  scale = 1,
  duration,
  onComplete,
  jsonPath = "/assets/particles/Cartoon Lightning Ball.json",
}) => {
  const batchRendererRef = useRef<BatchedRenderer>(new BatchedRenderer());
  const groupRef = useRef<THREE.Group>(new THREE.Group());
  const timerRef = useRef<number | null>(null);
  const particleObjRef = useRef<THREE.Object3D | null>(null);

  // 그룹 초기 설정
  useEffect(() => {
    groupRef.current.position.set(position[0], position[1], position[2]);
    groupRef.current.scale.set(scale, scale, scale);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [position, scale]);

  // 파티클 시스템 로드
  useEffect(() => {
    const batchRenderer = batchRendererRef.current;
    const loader = new QuarksLoader();
    loader.setCrossOrigin("");

    loader.load(
      jsonPath,
      (obj) => {
        // 파티클 시스템을 배치 렌더러에 추가
        QuarksUtil.addToBatchRenderer(obj, batchRenderer);
        particleObjRef.current = obj;

        // 그룹에 객체들 추가
        groupRef.current.add(obj);
        groupRef.current.add(batchRenderer);

        // 지속 시간 설정
        if (duration) {
          timerRef.current = window.setTimeout(() => {
            if (onComplete) onComplete();
          }, duration);
        }
      },
      undefined,
      (error) => {
        console.error("Lightning particle effect load error:", error);
      }
    );

    // 정리 함수
    return () => {
      if (particleObjRef.current) {
        groupRef.current.remove(particleObjRef.current);
      }
      groupRef.current.remove(batchRenderer);
    };
  }, [jsonPath, duration, onComplete]);

  // 프레임마다 파티클 업데이트
  useFrame((_, delta) => {
    batchRendererRef.current.update(delta);
  });

  return <primitive object={groupRef.current} />;
};
