#include "common.wgsl"
@group(0) @binding(1) var heightMap: texture_2d<f32>;
@group(0) @binding(2) var mySampler: sampler;

@fragment fn fs(input: VSOutput) -> @location(0) vec4f {
  let height = input.height;
  
  return vec4f(0.8, 0.9 * (1.0 - height), 0.0, 1.0);
}