#include "common.wgsl"
@group(0) @binding(0) var<storage, read_write> srcBuffer: array<f32>;
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

    divergence[idx] = (srcBuffer[getIdx(right)] + srcBuffer[getIdx(left)] + srcBuffer[getIdx(up)] + srcBuffer[getIdx(down)] - 4 * srcBuffer[idx]) * 0.25;
    tempBuffer[idx] = srcBuffer[idx];
}