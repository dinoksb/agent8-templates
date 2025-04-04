precision highp float;

uniform vec2 iResolution;
uniform float time;

varying vec2 v_uv;

#define M_PI 3.1415926535897932384626433832795
#define M_PI05 (M_PI * 0.5)

vec2 rotate(vec2 v, float c, float s){
	return vec2(v.x * c - v.y * s, v.x * s + v.y * c);
}

vec2 rotate(vec2 v, float r){
	return rotate(v, cos(r), sin(r));
}

float boxLength(vec2 pos) {
	vec2 q = abs(pos);
	return max(q.x, q.y);
}

float capsuleLength(vec2 pos, vec2 dir) {
	vec2 ba = -dir;
	vec2 pa = pos + ba;
	ba *= 2.0;
	return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), -1.0, 1.0));
}

float triangleLength(vec2 p) {
    p.y += 0.32;
	return max(abs(p.x * 1.8) + p.y, 1.0 - p.y * 1.8) * 0.75;
}

float Sa(vec2 pos){
 	float a = capsuleLength(pos + vec2(0.0, -0.7), vec2(0.5, 0.0));   
 	float b = capsuleLength(pos + vec2(-0.3, -0.3), vec2(0.3, 1.3));  
    float c = capsuleLength(pos + vec2(0.3, -0.5), vec2(0, 0.5)); 
    return min(min(a, b), c);
}

float Ke(vec2 pos){
 	float a = capsuleLength(pos + vec2(0.0, -0.3), vec2(0.4, 0.0));   
 	float b = capsuleLength(pos + vec2(0.7, -0.3), vec2(0.5, 0.6));  
    float c = capsuleLength(pos + vec2(0.1, 0.7), vec2(0.3, 0.3));  
    return min(min(a, b), c);
}

float To(vec2 pos){
 	float a = capsuleLength(pos + vec2(0.6, 0.0), vec2(0.4, 1.0));   
 	float b = capsuleLength(pos + vec2(0.0, 0.0), vec2(1.0, -0.8) * 0.4);    
    return min(a, b);
}

float Ba(vec2 pos){
 	float a = capsuleLength(pos + vec2(0.8, 0.0), vec2(0.2, 1.0));   
 	float b = capsuleLength(pos + vec2(-0.8, 0.0), vec2(-0.2, 1.0));     
    float c = length(pos + vec2(-1.0, -1.3));
    float d = length(pos + vec2(-1.2, -0.8));
    return min(min(min(a, b), c), d);
}

float Saketoba(vec2 pos, float power){
    return dot(vec4(1.0), power / (0.01 + vec4(Sa(pos), Ke(pos + vec2(-3.0, 0.0)), To(pos + vec2(-6.0, 0.0)), Ba(pos + vec2(-9.0, 0.0)))));
}

float smoothLine(float value, float target, float width){
    return width / abs(value - target);
}

float circleTriangle(vec2 pos){
    float circle = length(pos * 0.5);
    float triangle = triangleLength(pos * 0.3);    
    return smoothLine(circle, 1.0, 0.025) + smoothLine(triangle, 1.0, 0.025);
}

vec2 circleTriangle2(vec2 pos){
    float circle2 = length(pos * 0.35);
    float weight = smoothLine(circle2, 1.0, 0.025);
    weight += circleTriangle(pos);
    return vec2(1.0, weight); // x값은 항상 1.0로 설정 (마스크 효과 제거 목적)
}

vec2 polar(vec2 uv) {
	float r = length(uv);
	float s = atan(uv.y, uv.x) / M_PI;
	return vec2(r, s);
}

float SakeobaCircle(vec2 pos){
    vec2 pp = polar(rotate(pos, -time) * 0.75);
    vec2 md = mod(rotate(pp * vec2(2.0, 32.0), M_PI05), vec2(16.0, 4.0));
    return Saketoba(md - vec2(3.5, 1.5), 0.05);
}

void main() {
    vec2 uv = (gl_FragCoord.xy - iResolution * 0.5) / iResolution.yy * 20.0;
    uv *= clamp(time * 0.25, 0.0, 1.0) * 1.1;
    uv = rotate(uv, time * 0.3);
    
    float len = length(uv);
    
    vec2 c2 = circleTriangle2(uv * 1.4 + vec2(0.0, 8.0));
    vec2 c3 = circleTriangle2(uv * 1.4 + rotate(vec2(0.0, 8.0), M_PI * 2.0 * 0.3333));
    vec2 c4 = circleTriangle2(uv * 1.4 + rotate(vec2(0.0, 8.0), M_PI * 2.0 * 0.6666));
    
    float mask = clamp(c2.x * c3.x * c4.x, 0.0, 1.0);
    
    float color1 = SakeobaCircle(uv) * 4.0
        + smoothLine(len, 11.2, 0.1)
        + smoothLine(len, 10.8, 0.1)
        + smoothLine(len, 8.2, 0.01)
        + smoothLine(len, 8.0, 0.02)
        + smoothLine(len, 7.5, 0.01)
        + smoothLine(len, 7.3, 0.01)
        + smoothLine(len, 6.7, 0.02)
        + smoothLine(len, 5.0, 0.02)
        + smoothLine(len, 5.5, 0.02)
        + smoothLine(len, 4.5, 0.02)
        ;

    float color2 = c2.y + c3.y + c4.y;

    vec3 col = vec3(
        (color1 + color2) * 1.5,
    	color1 + color2,
        color1 * 0.2
    );

    gl_FragColor = vec4(col, 1.0);
}