#include "common.wgsl"
@group(0) @binding(1) var<uniform> uni: Uniforms;

struct Material {
    specular: f32,
    shininess: f32,
    ambient: f32,
    diffuse: f32,
};

struct Light {
    direction:vec3f,
    strength:f32,
};

@fragment fn fs(input: VSOutput) -> @location(0) vec4f {
    var albedo = mix(uni.color_1, uni.color_2, vec3f(input.color));

    // snow
    if(input.height > uni.snow_height) {
        albedo = vec3f(1.0);
    }

    let ambient_occlusion = pow(vec3f(input.height), vec3f(3.0));

    var material:Material;
    material.ambient = 0.1;
    material.shininess = 1.0;
    material.diffuse = 1.0;
    material.specular = 1.0;

    var light:Light;
    light.direction = normalize(vec3f(-0.5, -0.5, -1.0));
    light.strength = 3.0;

    let cam_pos:vec3f = vec3f(0.0, 0.0, 2.5);
    let to_eye:vec3f = normalize(cam_pos - input.pos_world);
    let global_light = computeDirectionalLight(light, material, input.normal_world, to_eye);

    let color = albedo * ambient_occlusion * global_light;

    return vec4f(color, 1.0);
}


fn blinnPhong(material:Material, light_strength: vec3<f32>, light_vec: vec3<f32>, normal: vec3<f32>, to_eye: vec3<f32>) -> vec3<f32> {
    let halfway = normalize(to_eye + light_vec);
    let hdotn = dot(halfway, normal);
    let specular = material.specular * pow(max(hdotn, 0.0), material.shininess);
    return material.ambient + (material.diffuse + specular) * light_strength;
}

fn computeDirectionalLight(light:Light, material:Material, normal: vec3<f32>, to_eye: vec3<f32>) -> vec3<f32> {
    let light_vec = -light.direction;
    let ndotl = max(dot(light_vec, normal), 0.0);
    let light_strength = vec3f(light.strength) * ndotl;
    
    return blinnPhong(material, light_strength, light_vec, normal, to_eye);
}
