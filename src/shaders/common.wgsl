const TEX_SIZE:u32 = 1024;
const HEIGHT_SCALE:f32 = 2.0;

struct VSOutput {
  @builtin(position) position: vec4f,
  @location(1) pos_world: vec3f,
  @location(2) normal_world: vec3f,
  @location(3) height: f32,
  @location(4) color: f32,
};

struct Vertex {
  @location(0) position: vec3f,
  @location(1) tex_coord: vec2f,
};

fn getIdx(coord:vec2u) -> u32 {
    return coord.x + coord.y * TEX_SIZE;
}

fn scale_to_range(value: f32, min: f32, max: f32) -> f32 {
    return min + value * (max - min);
}