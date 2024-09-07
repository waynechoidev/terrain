#include "common.wgsl"
@group(0) @binding(0) var noise_texture: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(1) var<uniform> uni: NoiseUniforms;

@compute @workgroup_size(16, 16, 1)
fn main(@builtin(global_invocation_id) id: vec3u) {
    let x = id.x;
    let y = id.y;
    let idx = getIdx(id.xy);
    
    let uv = vec2<f32>(f32(x) / f32(TEX_SIZE) + uni.progress, f32(y) / f32(TEX_SIZE));

    var height = noise_sum(uv, mat2x2<f32>(131.1, 283.7, 143.8, 113.3), 14232.34234);
    height = (height + 1.0) * 0.5;

    var color = noise_sum(uv, mat2x2<f32>(423.5, 342.3, 153.7, 342.5), 18473.58352);
    color = (color + 1.0) * 0.5;

    textureStore(noise_texture, vec2<i32>(i32(x), i32(y)), vec4<f32>(height, color, 0, 255));
}

fn hash22(p: vec2<f32>, mat: mat2x2<f32>, scale: f32) -> vec2<f32> {
    let temp_p = p * mat;
    let p_transformed = -1.0 + 2.0 * fract(sin(temp_p) * scale);
    return sin(p_transformed * 6.283);
}

fn perlin_noise(p: vec2<f32>, mat: mat2x2<f32>, scale: f32) -> f32 {
    let pi = floor(p);
    let pf = p - pi;
    let w = pf * pf * (3.0 - 2.0 * pf);
    
    let f00 = dot(hash22(pi + vec2<f32>(0.0, 0.0), mat, scale), pf - vec2<f32>(0.0, 0.0));
    let f01 = dot(hash22(pi + vec2<f32>(0.0, 1.0), mat, scale), pf - vec2<f32>(0.0, 1.0));
    let f10 = dot(hash22(pi + vec2<f32>(1.0, 0.0), mat, scale), pf - vec2<f32>(1.0, 0.0));
    let f11 = dot(hash22(pi + vec2<f32>(1.0, 1.0), mat, scale), pf - vec2<f32>(1.0, 1.0));
    
    let xm1 = mix(f00, f10, w.x);
    let xm2 = mix(f01, f11, w.x);
    let ym = mix(xm1, xm2, w.y);

    return ym;
}

fn noise_sum(p: vec2<f32>, mat: mat2x2<f32>, scale: f32) -> f32 {
    var p_scaled = p * 4.0;
    var a = 1.0;
    var r = 0.0;
    var s = 0.0;
    
    for (var i = 0; i < 5; i = i + 1) {
        r = r + a * perlin_noise(p_scaled, mat, scale);
        s = s + a;
        p_scaled = p_scaled * 2.0;
        a = a * 0.5;
    }
    
    return r / s;
}