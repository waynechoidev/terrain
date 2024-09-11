#include "common.wgsl"

struct MatrixUniforms {
  model: mat4x4f,
  view: mat4x4f,
  projection: mat4x4f,
  inv_transposed_model: mat4x4f,
};

@group(0) @binding(0) var<uniform> matrix_uni: MatrixUniforms;
@group(0) @binding(1) var<uniform> uni: Uniforms;
@group(0) @binding(2) var noise_map: texture_2d<f32>;
@group(0) @binding(3) var normal_map: texture_2d<f32>;
@group(0) @binding(4) var my_sampler: sampler;

@vertex fn vs(
  input: Vertex,
) -> VSOutput {
  var output: VSOutput;

  let normal = textureSampleLevel(normal_map, my_sampler, input.tex_coord, 0);
  
  let noise = textureSampleLevel(noise_map, my_sampler, input.tex_coord, 0);
  let height = noise.r;
  let color = noise.g;

  var position = input.position;
  position.z = scale_to_range(height, 0, uni.height_scale);

  output.position = matrix_uni.projection * matrix_uni.view * matrix_uni.model * vec4f(position, 1.0);
  output.pos_world = (matrix_uni.model * vec4f(position, 1.0)).xyz;
  output.normal_world = normalize(matrix_uni.inv_transposed_model * normal).xyz;
  output.height = height;
  output.color = color;
  
  return output;
}