const TEX_SIZE:u32 = 1024;

struct VSOutput {
  @builtin(position) position: vec4f,
  @location(1) height: f32,
  @location(2) color: f32,
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

struct NoiseUniforms {
  progress: f32,
};

fn getIdx(coord:vec2u) -> u32 {
    return coord.x + coord.y * TEX_SIZE;
}

fn scale_to_range(value: f32, min: f32, max: f32) -> f32 {
    return min + value * (max - min);
}