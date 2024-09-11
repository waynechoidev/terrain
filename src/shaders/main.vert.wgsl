#include "common.wgsl"

@group(0) @binding(0) var<uniform> uni: MatrixUniforms;
@group(0) @binding(1) var height_map: texture_2d<f32>;
@group(0) @binding(2) var my_sampler: sampler;

@vertex fn vs(
  input: Vertex,
) -> VSOutput {
  var output: VSOutput;
  var position = input.position;
  let height_map = textureSampleLevel(height_map, my_sampler, input.tex_coord, 0);
  position.z = scale_to_range(height_map.r, 0, HEIGHT_SCALE);

  output.position = uni.projection * uni.view * uni.model * vec4f(position, 1.0);
  output.height = height_map.r;
  output.color = height_map.g;
  
  return output;
}