#include "common.wgsl"
@group(0) @binding(1) var heightMap: texture_2d<f32>;
@group(0) @binding(2) var mySampler: sampler;

@fragment fn fs(input: VSOutput) -> @location(0) vec4f {
    let height = pow(vec3f(input.height), vec3f(2.5));

    let green = vec3f(0.13, 0.7, 0.13);
    var color = mix(green, vec3f(0.6, 0.0, 0.0), pow(vec3f(input.color), vec3f(1.5)));

    // snow
    if(input.height > 0.56) {
        color = vec3f(1.0);
    }
    let brightnessFactor:f32 = 3.0;
    return vec4f(color * height * brightnessFactor, 1.0);
}
