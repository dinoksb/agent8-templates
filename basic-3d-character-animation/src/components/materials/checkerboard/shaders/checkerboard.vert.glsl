// 정밀도 선언
precision highp float;
precision highp int;

// 출력 varying 변수 (프래그먼트 쉐이더로 전달)
varying vec3 vPosition;

void main() {
  // 기본 위치 설정 (Three.js가 제공하는 position 사용)
  vec3 transformed = position;
  
  // Three.js 내장 스키닝 처리 활용
  #ifdef USE_SKINNING
    // skinning_vertex 코드가 여기서 실행됨
    // Three.js가 이 부분을 내부적으로 처리
  #endif
  
  // 로컬 위치 저장 (체커보드 패턴용)
  vPosition = transformed;
  
  // 최종 위치 계산 (Three.js 유니폼 사용)
  gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
}