#include "common.wgsl"
@group(0) @binding(0) var<storage, read_write> srcBuffer: array<f32>;

@compute @workgroup_size(16, 16, 1)
fn main(@builtin(global_invocation_id) id: vec3u) {
    let x = id.x;
    let y = id.y;
    let idx = getIdx(id.xy);

    let texture_width: u32 = TEX_SIZE;
    let texture_height: u32 = TEX_SIZE;
    
    let center_x: u32 = u32(texture_width / 2u);
    let center_y: u32 = u32(texture_height / 2u);
    
    let dx: u32 = u32(x) - center_x;
    let dy: u32 = u32(y) - center_y;
    let distance_sq: u32 = dx * dx + dy * dy;
    
    let radius_sq: u32 = 10 * TEX_SIZE;
    
    if (x < texture_width && y < texture_height && distance_sq < radius_sq) {
        srcBuffer[idx] = 1.0;
    } else {
        srcBuffer[idx] = 0.0;
    }
}