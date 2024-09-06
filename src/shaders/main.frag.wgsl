#include "common.wgsl"
@group(0) @binding(1) var heightMap: texture_2d<f32>;
@group(0) @binding(2) var mySampler: sampler;

@fragment fn fs(input: VSOutput) -> @location(0) vec4f {
  let height = input.height;
  
  return vec4f(vec3f(1-height), 1.0);
}