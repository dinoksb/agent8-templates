import React, { useState, useRef, useCallback } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import MagicCircle from "../../magic/effects/MagicCircle";

interface MagicCircleExampleProps {
  position?: [number, number, number];
  autoRotate?: boolean;
  radius?: number;
  fadeOut?: boolean;
}

/**
 * 마법진 효과 예제 컴포넌트
 * 바닥에 마법진을 표시하는 예제입니다.
 */
const MagicCircleExample: React.FC<MagicCircleExampleProps> = ({
  position = [0, 0, 0],
  autoRotate = true,
  radius = 5,
  fadeOut = false,
}) => {
  const [rotation, setRotation] = useState(0);
  const [visible, setVisible] = useState(true);
  const posRef = useRef(new THREE.Vector3(...position));

  // 자동 회전 효과
  useFrame(() => {
    if (autoRotate) {
      setRotation((prev) => prev + 0.005);
    }
  });

  // 마법진 완료 처리 함수
  const handleComplete = useCallback(() => {
    console.log("Magic circle animation completed");
    setVisible(false);
  }, []);

  return (
    <>
      {visible && (
        <MagicCircle
          position={posRef.current}
          radius={radius}
          opacity={0.8}
          rotation={rotation}
          duration={fadeOut ? 5000 : 0} // fadeOut이 true면 5초 후 사라짐, 아니면 무한 지속
          onComplete={handleComplete}
          fadeOut={fadeOut}
        />
      )}

      {/* 디버그용 - 마법진 생성 위치 표시 */}
      <mesh position={posRef.current} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.2, 16]} />
        <meshBasicMaterial color="#ff0000" transparent opacity={0.5} />
      </mesh>
    </>
  );
};

export default MagicCircleExample;
