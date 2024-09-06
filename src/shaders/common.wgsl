const TEX_SIZE:u32 = 256;

struct VSOutput {
  @builtin(position) position: vec4f,
  @location(1) height: f32,
};

struct Vertex {
  @location(0) position: vec3f,
  @location(1) texCoord: vec2f,
};

struct MatrixUniforms {
  model: mat4x4f,
  view: mat4x4f,
  projection: mat4x4f,
};

fn getIdx(coord:vec2u) -> u32 {
    return coord.x + coord.y * TEX_SIZE;
}