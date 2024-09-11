#include "common.wgsl"

@group(0) @binding(0) var<uniform> uni: MatrixUniforms;
@group(0) @binding(1) var noise_map: texture_2d<f32>;
@group(0) @binding(2) var normal_map: texture_2d<f32>;
@group(0) @binding(3) var my_sampler: sampler;

@vertex fn vs(
  input: Vertex,
) -> VSOutput {
  var output: VSOutput;

  let normal = textureSampleLevel(normal_map, my_sampler, input.tex_coord, 0);
  
  let noise = textureSampleLevel(noise_map, my_sampler, input.tex_coord, 0);
  let height = noise.r;
  let color = noise.g;

  var position = input.position;
  position.z = scale_to_range(height, 0, HEIGHT_SCALE);

  output.position = uni.projection * uni.view * uni.model * vec4f(position, 1.0);
  output.pos_world = (uni.model * vec4f(position, 1.0)).xyz;
  output.normal_world = normalize(uni.inv_transposed_model * normal).xyz;
  output.height = height;
  output.color = color;
  
  return output;
}