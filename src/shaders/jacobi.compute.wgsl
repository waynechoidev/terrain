#include "common.wgsl"
@group(0) @binding(0) var<storage, read_write> targetBuffer: array<f32>;
@group(0) @binding(1) var<storage, read_write> tempBuffer: array<f32>;
@group(0) @binding(2) var<storage, read_write> divergence: array<f32>;

@compute @workgroup_size(16, 16, 1)
fn main(@builtin(global_invocation_id) id: vec3u) {
    let x = id.x;
    let y = id.y;
    let idx = getIdx(id.xy);

    let left = vec2u(clamp(x-1, 0, TEX_SIZE), y);
    let right = vec2u(clamp(x+1, 0, TEX_SIZE), y);
    let up = vec2u(x, clamp(y+1, 0, TEX_SIZE));
    let down = vec2u(x, clamp(y-1, 0, TEX_SIZE));

    let divergenceScale = 0.25;

    targetBuffer[idx] = (tempBuffer[getIdx(right)] + tempBuffer[getIdx(left)]
    + tempBuffer[getIdx(up)] + tempBuffer[getIdx(down)] - divergence[idx] * 4.0 * divergenceScale) * 0.25;
}