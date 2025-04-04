varying vec2 vUv;

void main() {
    // UV 좌표 전달
    vUv = uv;

    // 최종 클립 공간 위치 계산
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
