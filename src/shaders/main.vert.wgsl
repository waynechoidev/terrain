#include "common.wgsl"

@group(0) @binding(0) var<uniform> uni: MatrixUniforms;
@group(0) @binding(1) var heightMap: texture_2d<f32>;
@group(0) @binding(2) var mySampler: sampler;

@vertex fn vs(
  input: Vertex,
) -> VSOutput {
  var output: VSOutput;
  var position = input.position;
  let heightMap = textureSampleLevel(heightMap, mySampler, input.texCoord, 0);
  position.y = heightMap.r;

  output.position = uni.projection * uni.view * uni.model * vec4f(position, 1.0);
  output.height = heightMap.r;
  
  return output;
}