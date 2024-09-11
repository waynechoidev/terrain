#include "common.wgsl"
@group(0) @binding(1) var heightMap: texture_2d<f32>;
@group(0) @binding(2) var mySampler: sampler;

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
    let height = pow(vec3f(input.height), vec3f(3.0));

    let green = vec3f(0.13, 0.7, 0.13);
    let brown = vec3f(0.55, 0.194, 0.0);
    var color = mix(green, brown, vec3f(input.color));

    // snow
    if(input.height > 0.56) {
        color = vec3f(1.0);
    }
    color = color * height;

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
    let light_factor = computeDirectionalLight(light, material, input.normal_world, to_eye);

    return vec4f(color*light_factor, 1.0);
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
