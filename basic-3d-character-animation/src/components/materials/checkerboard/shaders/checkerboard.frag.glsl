precision highp float;

// 유니폼
uniform vec3 color1;
uniform vec3 color2;
uniform float scale;

// 버텍스 쉐이더에서 받은 값
varying vec3 vPosition;

void main() {
  // 로컬 위치 기반 체커보드 패턴 계산
  vec2 scaledPos = vPosition.xz * scale * 0.5;
  vec2 intPos = floor(scaledPos);
  float pattern = mod(intPos.x + intPos.y, 2.0);
  
  // 두 색상 사이를 패턴에 따라 선택
  vec3 finalColor = mix(color1, color2, pattern);
  
  // 최종 색상 출력
  gl_FragColor = vec4(finalColor, 1.0);
}