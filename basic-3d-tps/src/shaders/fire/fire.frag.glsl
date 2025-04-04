uniform vec2 resolution;
uniform float time;
uniform float opacity;
uniform float duraion;
varying vec2 vUv;

float customSnoise(vec3 uv, float res) {
    const vec3 s = vec3(1e0, 1e2, 1e3);
    uv *= res;

    vec3 uv0 = floor(mod(uv, res)) * s;
    vec3 uv1 = floor(mod(uv + vec3(1.0), res)) * s;

    vec3 f = fract(uv);
    f = f * f * (3.0 - 2.0 * f);

    vec4 v = vec4(
        uv0.x + uv0.y + uv0.z,
        uv1.x + uv0.y + uv0.z,
        uv0.x + uv1.y + uv0.z,
        uv1.x + uv1.y + uv0.z
    );

    vec4 r = fract(sin(v * 1e-1) * 1e3);
    float r0 = mix(mix(r.x, r.y, f.x), mix(r.z, r.w, f.x), f.y);

    r = fract(sin((v + uv1.z - uv0.z) * 1e-1) * 1e3);
    float r1 = mix(mix(r.x, r.y, f.x), mix(r.z, r.w, f.x), f.y);

    return mix(r0, r1, f.z) * 2.0 - 1.0;
}

void main() {
    // 중심을 향하도록 좌표 조정 (0.5, 0.5가 중심) 
    vec2 p = vUv - 0.5;

    // 거리 계산 - 원형 마스크용
    float dist = length(p);

    // 효과 크기를 더 작게 조정 (숫자를 키워서 효과 크기를 줄임)
    float color = 3.0 - (3.0 * length(3.0 * p));

    vec3 coord = vec3(
        atan(p.x, p.y) / 6.2832 + 0.5,
        length(p) * 0.4,
        0.5
    );

    // 시간에 따른 움직임 추가
    float t = time * 2.0;
    coord += vec3(0.0, -t * 0.05, t * 0.01);

    for (int i = 1; i <= 7; i++) {
        float power = pow(2.0, float(i));
        color += (1.5 / power) * customSnoise(coord, power * 16.0);
    }

    // 불 효과를 위한 색상 조정
    vec3 fireColor = vec3(
        color * 1.8,
        pow(max(color, 0.0), 2.0) * 0.4,
        pow(max(color, 0.0), 3.0) * 0.15
    );

    // 하드 컷오프 - 불 효과의 경계를 명확하게
    float alpha = 1.0;

    if (color < 0.05) {
        discard;
    }

    // 가장자리 부분 페이딩 처리
    if (color < 0.3) {
        alpha = smoothstep(0.05, 0.3, color);
    }

    // 원형 페이드아웃 - 가장자리에서 부드럽게 사라지도록
    if (dist > 0.4) {
        alpha *= smoothstep(0.5, 0.4, dist);
    }

    // 시간 기반 투명도 애니메이션

    alpha *= opacity;

    gl_FragColor = vec4(fireColor, alpha);
}
