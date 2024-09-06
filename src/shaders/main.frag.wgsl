#include "common.wgsl"
@group(0) @binding(1) var heightMap: texture_2d<f32>;
@group(0) @binding(2) var mySampler: sampler;

@fragment fn fs(input: VSOutput) -> @location(0) vec4f {
    // Read height value from the texture and apply gamma correction
    let height = pow(vec3f(input.height), vec3f(2.2)); // Gamma correction

    let green= vec3f(0.133, 0.545, 0.133);
    let brown= vec3f(0.545, 0.271, 0.075);
    let color = mix(green, brown, input.color);
    
    let brightnessFactor:f32 = 3.0;
    return vec4f(color * height * brightnessFactor, 1.0);
}
