precision highp float;

varying vec2 v_texcoord;
uniform sampler2D u_image;
uniform vec2 u_texel_size;
uniform float u_radius;
uniform vec2 u_direction;

void main() {
    if (u_radius < 0.5) {
        gl_FragColor = texture2D(u_image, v_texcoord);
        return;
    }
    float sigma = max(u_radius / 2.5, 1.0);
    float two_sigma2 = 2.0 * sigma * sigma;
    vec4 color = vec4(0.0);
    float total = 0.0;
    for (int i = -6; i <= 6; i++) {
        float fi = float(i);
        float weight = exp(-(fi * fi) / two_sigma2);
        vec2 off = u_direction * u_texel_size * fi * (u_radius / 6.0);
        color += texture2D(u_image, v_texcoord + off) * weight;
        total += weight;
    }
    gl_FragColor = color / total;
}