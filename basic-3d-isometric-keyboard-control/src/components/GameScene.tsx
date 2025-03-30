import React from "react";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { World } from "./world/World.tsx";
import { 
  EffectComposer,
  Bloom,
  ChromaticAberration,
  ColorAverage,
  ColorDepth,
  DepthOfField,
  DotScreen,
  Glitch,
  Grid,
  HueSaturation,
  Noise,
  Pixelation,
  Scanline,
  SelectiveBloom,
  SMAA,
  SSAO,
  ToneMapping,
  Vignette
} from '@react-three/postprocessing';
import { BlendFunction, GlitchMode } from 'postprocessing';
import { Vector2 } from 'three';

export const GameScene: React.FC = () => {
  return (
    <>
      <Canvas shadows>
        <Physics debug={true} gravity={[0, -9.81, 0]}>
          <World />
        </Physics>
        
        {/* 기본 예제: 단일 효과 사용 */}
        <EffectComposer>
          {/* Vignette: 화면 가장자리를 어둡게 처리 */}
          <Vignette
            eskil={false}
            offset={0.1}
            darkness={1.1}
          />
        </EffectComposer>
        
        {/* 여러 효과를 함께 사용할 때의 예제 (실제 사용 시에는 하나의 EffectComposer만 사용해야 함) */}
        
        <EffectComposer>
          {/* // Bloom: 밝은 부분에 빛 번짐 효과 */}
          {/* <Bloom 
            intensity={1.0} // 강도
            luminanceThreshold={0.5} // 빛나기 시작할 밝기 임계값
            luminanceSmoothing={0.9} // 밝기 경계 부드러움
            height={300} // 렌더 해상도 높이
          /> */}

          // ChromaticAberration: 색 수차 효과 (색상이 분리되는 효과)
          {/* <ChromaticAberration
            offset={new Vector2(0.005, 0.005)} // 색상 분리 정도
          /> */}

          {/* // ColorAverage: 색상 평균화 효과 */}
          {/* <ColorAverage
            blendFunction={BlendFunction.NORMAL} // 블렌딩 방식
          /> */}

          {/* // ColorDepth: 색상 깊이 조절 (색상 비트 수 감소) */}
          {/* <ColorDepth
            bits={16} // 색상 비트 수
          /> */}

          {/* // DepthOfField: 피사계 심도 효과 */}
          {/* <DepthOfField 
            focusDistance={0.02} // 초점 거리
            focalLength={0.02} // 초점 길이
            bokehScale={2} // 보케 스케일
            height={480} // 렌더 해상도 높이
          /> */}

          {/* // DotScreen: 도트 스크린 효과 */}
          {/* <DotScreen
            angle={Math.PI * 0.5} // 패턴 각도
            scale={1.0} // 패턴 크기
          /> */}

          {/* // Glitch: 화면 깨짐 효과 */}
          {/* <Glitch
            delay={new Vector2(1.5, 3.5)} // 글리치 지연 시간
            duration={new Vector2(0.1, 0.3)} // 글리치 지속 시간
            strength={new Vector2(0.3, 1.0)} // 글리치 강도
            mode={GlitchMode.SPORADIC} // 글리치 모드 (CONSTANT, SPORADIC)
            active // 활성화 여부
          /> */}

          {/* // Grid: 그리드 효과 */}
          {/* <Grid
            lineWidth={1.0} // 선 두께
            scale={1.0} // 그리드 크기
          /> */}

          {/* // HueSaturation: 색조 및 채도 조절 */}
          {/* <HueSaturation
            hue={0} // 색조 조절 (-Math.PI ~ Math.PI)
            saturation={0.5} // 채도 조절 (-1 ~ 1)
          /> */}

          {/* // Noise: 노이즈 효과 */}
          {/* <Noise
            opacity={0.25} // 노이즈 불투명도
            premultiply // 프리멀티플라이 여부
          /> */}

          {/* // Pixelation: 픽셀화 효과 */}
          <Pixelation
            granularity={5} // 픽셀 크기 (값이 클수록 픽셀이 커짐)
          />

          {/* // Scanline: 스캔라인 효과 */}
          {/* <Scanline
            density={1.25} // 스캔라인 밀도
            blendFunction={BlendFunction.OVERLAY} // 블렌딩 방식
          /> */}

          {/* // SelectiveBloom: 선택적 블룸 효과 (특정 물체만 블룸 적용) */}
          {/* <SelectiveBloom
            lights={[]} // 빛나는 메시 배열
            selection={[]} // 블룸을 적용할 메시 배열
            intensity={1.0} // 강도
            luminanceThreshold={0.3} // 임계값
            luminanceSmoothing={0.8} // 부드러움
          /> */}

          {/* // SMAA: 안티앨리어싱 효과 */}
          <SMAA />

          {/* // SSAO: 스크린스페이스 앰비언트 오클루전 */}
          {/* <SSAO
            samples={21} // 샘플 수
            radius={0.1} // 반경
            intensity={2} // 강도
            luminanceInfluence={0.7} // 밝기 영향도
            bias={0.025} // 바이어스
          /> */}

          {/* // ToneMapping: 톤 매핑 효과 */}
          {/* <ToneMapping
            adaptive // 적응형 여부
            resolution={256} // 해상도
            middleGrey={0.6} // 중간 회색 레벨
            maxLuminance={16.0} // 최대 휘도
            averageLuminance={1.0} // 평균 휘도
            adaptationRate={1.0} // 적응 속도
          /> */}
        </EffectComposer>
       
      </Canvas>
    </>
  );
};