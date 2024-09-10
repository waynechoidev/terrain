#include "common.wgsl"

@group(0) @binding(0) var noise_texture: texture_2d<f32>;
@group(0) @binding(1) var normal_texture: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(2) var my_sampler: sampler;

@compute @workgroup_size(16, 16, 1)
fn main(@builtin(global_invocation_id) id: vec3u) {
    let x = f32(id.x);
    let y = f32(id.y);

    // Define neighboring coordinates with wrap-around logic
    var left = vec2f(x - 1, y);
    var right = vec2f(x + 1, y);
    var down = vec2f(x, y - 1);
    var up = vec2f(x, y + 1);

    let size = f32(TEX_SIZE);

    // Wrap around edges to handle boundary conditions
    if (x == 0) {
        left.x = size - 1;
    }
    if (x == size - 1) {
        right.x = 0;
    }
    if (y == size - 1) {
        up.y = 0;
    }
    if (y == 0) {
        down.y = size - 1;
    }

    // Sample height values from the texture
    let left_val:f32 = textureSampleLevel(noise_texture, my_sampler, left, 0).r;
    let right_val:f32 = textureSampleLevel(noise_texture, my_sampler, right, 0).r;
    let up_val:f32 = textureSampleLevel(noise_texture, my_sampler, up, 0).r;
    let down_val:f32 = textureSampleLevel(noise_texture, my_sampler, down, 0).r;

    // Compute gradient vectors
    let dx = vec3f(2.0, 0.0, (right_val - left_val) * HEIGHT_SCALE);
    let dy = vec3f(0.0, 2.0, (up_val - down_val) * HEIGHT_SCALE);

    // Calculate normal vector using cross product
    let normal = normalize(cross(dx, dy));
    
    // Store the computed normal vector in the normal texture
    textureStore(normal_texture, vec2<i32>(i32(x), i32(y)), vec4f(normal, 0.0));
}

// Cross product function for vec3f
fn cross(a: vec3f, b: vec3f) -> vec3f {
    return vec3f(
        a.y * b.z - a.z * b.y,
        a.z * b.x - a.x * b.z,
        a.x * b.y - a.y * b.x
    );
}
