precision highp float;

varying vec2 v_texcoord;

uniform sampler2D u_image;
uniform sampler2D u_blurred;
uniform float u_time;
uniform float u_show_original;
uniform float u_exposure;
uniform float u_contrast;
uniform float u_shadows;
uniform float u_highlights;
uniform float u_blacks;
uniform float u_whites;
uniform float u_fade;
uniform float u_temp;
uniform float u_tint;
uniform float u_saturation;
uniform float u_vibrance;
uniform vec3  u_shadow_tint;
uniform float u_shadow_strength;
uniform vec3  u_highlight_tint;
uniform float u_highlight_strength;
uniform float u_clarity;
uniform float u_blur;
uniform float u_grain_amount;
uniform float u_grain_size;
uniform float u_grain_roughness;
uniform float u_vignette;
uniform float u_vignette_shape;

float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

float scurve(float x, float s) {
    if (abs(s) < 0.002) return x;
    float k = 1.0 + s * 3.5;
    float r = (x - 0.5) * k;
    r = r / sqrt(1.0 + r * r) * 0.7071068;
    return clamp(r + 0.5, 0.0, 1.0);
}

vec3 adjShadows(vec3 c, float a) {
    float m = (1.0 - smoothstep(0.0, 0.65, luma(c))); m = m*m;
    return clamp(c + a*0.5*m, 0.0, 1.0);
}
vec3 adjHighlights(vec3 c, float a) {
    float m = smoothstep(0.35,1.0,luma(c)); m = m*m;
    return clamp(c + a*0.5*m, 0.0, 1.0);
}
vec3 adjBlacks(vec3 c, float a) {
    float m = 1.0 - smoothstep(0.0,0.28,luma(c));
    return clamp(c + a*0.6*m, 0.0, 1.0);
}
vec3 adjWhites(vec3 c, float a) {
    float m = smoothstep(0.72,1.0,luma(c));
    return clamp(c + a*0.6*m, 0.0, 1.0);
}

vec3 rgb2hsl(vec3 c) {
    float mx=max(c.r,max(c.g,c.b)), mn=min(c.r,min(c.g,c.b));
    float l=(mx+mn)*0.5;
    if(mx-mn<0.0001) return vec3(0.0,0.0,l);
    float d=mx-mn;
    float s=l>0.5 ? d/(2.0-mx-mn) : d/(mx+mn);
    float h=0.0;
    if(mx==c.r)      h=(c.g-c.b)/d+(c.g<c.b ? 6.0 : 0.0);
    else if(mx==c.g) h=(c.b-c.r)/d+2.0;
    else             h=(c.r-c.g)/d+4.0;
    return vec3(h/6.0,s,l);
}
float h2r(float p,float q,float t){
    if(t<0.0)t+=1.0; if(t>1.0)t-=1.0;
    if(t<1.0/6.0) return p+(q-p)*6.0*t;
    if(t<0.5)     return q;
    if(t<2.0/3.0) return p+(q-p)*(2.0/3.0-t)*6.0;
    return p;
}
vec3 hsl2rgb(vec3 hsl){
    if(hsl.y<0.0001) return vec3(hsl.z);
    float q=hsl.z<0.5 ? hsl.z*(1.0+hsl.y) : hsl.z+hsl.y-hsl.z*hsl.y;
    float p=2.0*hsl.z-q;
    return clamp(vec3(h2r(p,q,hsl.x+1.0/3.0),h2r(p,q,hsl.x),h2r(p,q,hsl.x-1.0/3.0)),0.0,1.0);
}

float hash(vec2 p, float seed){
    return fract(sin(dot(p+seed,vec2(127.1,311.7)))*43758.5453);
}
float smoothNoise(vec2 p, float seed){
    vec2 i=floor(p), f=fract(p), u=f*f*(3.0-2.0*f);
    float a=hash(i,seed), b=hash(i+vec2(1.0,0.0),seed);
    float c2=hash(i+vec2(0.0,1.0),seed), d=hash(i+vec2(1.0,1.0),seed);
    return mix(mix(a,b,u.x),mix(c2,d,u.x),u.y);
}
float filmGrain(vec2 uv, float time, float size, float roughness){
    float scale=mix(420.0,55.0,size);
    vec2 p=uv*scale;
    float seed=floor(time*24.0)*1.618;
    float n=(roughness>0.5) ? hash(floor(p),seed) : smoothNoise(p,seed);
    return n*2.0-1.0;
}

void main(){
    if(u_show_original>0.5){ gl_FragColor=texture2D(u_image,v_texcoord); return; }

    vec3 orig=texture2D(u_image,v_texcoord).rgb;
    vec3 blurred=texture2D(u_blurred,v_texcoord).rgb;

    vec3 color=orig;
    if(abs(u_clarity)>0.002){ vec3 hf=orig-blurred; color=clamp(orig+hf*u_clarity*1.9,0.0,1.0); }
    if(u_blur>0.002){ color=mix(color,blurred,u_blur); }

    color*=pow(2.0,u_exposure);
    color=clamp(color,0.0,5.0);

    color.r=clamp(color.r+u_temp*0.16,0.0,1.0);
    color.b=clamp(color.b-u_temp*0.16,0.0,1.0);
    color.g=clamp(color.g+u_tint*0.08,0.0,1.0);
    color.b=clamp(color.b-u_tint*0.05,0.0,1.0);

    if(abs(u_contrast)>0.002){
        color.r=scurve(color.r,u_contrast);
        color.g=scurve(color.g,u_contrast);
        color.b=scurve(color.b,u_contrast);
    }
    color=clamp(color,0.0,1.0);

    color=adjShadows(color,u_shadows);
    color=adjHighlights(color,u_highlights);
    color=adjBlacks(color,u_blacks);
    color=adjWhites(color,u_whites);

    if(u_fade>0.002){
        float fadeMask=clamp((1.0-luma(color))*1.5,0.0,1.0);
        color=mix(color,vec3(0.18,0.155,0.13),u_fade*0.42*fadeMask);
    }

    if(abs(u_saturation)>0.002){
        vec3 hsl=rgb2hsl(color);
        hsl.y=clamp(hsl.y*(1.0+u_saturation),0.0,1.0);
        color=hsl2rgb(hsl);
    }
    if(abs(u_vibrance)>0.002){
        vec3 hsl=rgb2hsl(color);
        float boost=u_vibrance*(1.0-hsl.y*0.85)*0.55;
        hsl.y=clamp(hsl.y+boost,0.0,1.0);
        color=hsl2rgb(hsl);
    }

    float lum=luma(color);
    if(u_shadow_strength>0.002){
        float m=clamp(1.0-lum*2.6,0.0,1.0); m=m*m;
        color=mix(color,u_shadow_tint,m*u_shadow_strength*0.48);
    }
    if(u_highlight_strength>0.002){
        float m=clamp(lum*2.6-1.6,0.0,1.0); m=m*m;
        color=mix(color,u_highlight_tint,m*u_highlight_strength*0.48);
    }
    color=clamp(color,0.0,1.0);

    /* --- Vignette --- */
    if(abs(u_vignette)>0.002){
        vec2 d = abs(v_texcoord - 0.5) * 2.0;
        float circ = length(d) * 0.7071;
        float rect = max(d.x, d.y);
        float dist = mix(circ, rect, u_vignette_shape);
        float mask = smoothstep(0.35, 1.0, dist);
        mask = mask * mask;
        if(u_vignette>0.0) color=mix(color,vec3(0.0),mask*u_vignette*0.95);
        else               color=mix(color,vec3(1.0),mask*(-u_vignette)*0.75);
    }

    /* --- Film Grain --- */
    if(u_grain_amount>0.002){
        float g=filmGrain(v_texcoord,u_time,u_grain_size,u_grain_roughness);
        float grainMask=1.0-abs(luma(color)*2.0-1.0)*0.38;
        color+=g*u_grain_amount*0.21*grainMask;
        color=clamp(color,0.0,1.0);
    }

    gl_FragColor=vec4(color,1.0);
}