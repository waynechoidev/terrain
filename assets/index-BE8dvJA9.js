var V=Object.defineProperty;var A=(e,n,r)=>n in e?V(e,n,{enumerable:!0,configurable:!0,writable:!0,value:r}):e[n]=r;var c=(e,n,r)=>A(e,typeof n!="symbol"?n+"":n,r);(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))t(i);new MutationObserver(i=>{for(const a of i)if(a.type==="childList")for(const o of a.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&t(o)}).observe(document,{childList:!0,subtree:!0});function r(i){const a={};return i.integrity&&(a.integrity=i.integrity),i.referrerPolicy&&(a.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?a.credentials="include":i.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function t(i){if(i.ep)return;i.ep=!0;const a=r(i);fetch(i.href,a)}})();async function L(e){const r=await(await fetch(e)).blob();return await createImageBitmap(r,{colorSpaceConversion:"none"})}async function D(e,n){let r=e;const t=[r];let i=0;for(;i<n&&(r.width>1||r.height>1);)r=await X(r),t.push(r),i++;return t}async function X(e){const n=Math.max(1,e.width/2|0),r=Math.max(1,e.height/2|0),t=document.createElement("canvas");t.width=n,t.height=r;const i=t.getContext("2d");if(!i)throw new Error("Unable to get 2D context");return i.drawImage(e,0,0,n,r),createImageBitmap(t)}const Z=Math.PI/180;function N(e){return e*Z}var Y=`const TEX_SIZE:u32 = 1024;

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

struct Uniforms {
  color_1:vec3f,
  snow_height:f32,
  color_2:vec3f,
  height_scale:f32,
  cam_pos:vec3f,
  progress: f32,
};

fn getIdx(coord:vec2u) -> u32 {
    return coord.x + coord.y * TEX_SIZE;
}

fn scale_to_range(value: f32, min: f32, max: f32) -> f32 {
    return min + value * (max - min);
}

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
}`,q=`const TEX_SIZE:u32 = 1024;

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

struct Uniforms {
  color_1:vec3f,
  snow_height:f32,
  color_2:vec3f,
  height_scale:f32,
  cam_pos:vec3f,
  progress: f32,
};

fn getIdx(coord:vec2u) -> u32 {
    return coord.x + coord.y * TEX_SIZE;
}

fn scale_to_range(value: f32, min: f32, max: f32) -> f32 {
    return min + value * (max - min);
}
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
}`,H=`const TEX_SIZE:u32 = 1024;

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

struct Uniforms {
  color_1:vec3f,
  snow_height:f32,
  color_2:vec3f,
  height_scale:f32,
  cam_pos:vec3f,
  progress: f32,
};

fn getIdx(coord:vec2u) -> u32 {
    return coord.x + coord.y * TEX_SIZE;
}

fn scale_to_range(value: f32, min: f32, max: f32) -> f32 {
    return min + value * (max - min);
}

@group(0) @binding(0) var<uniform> uni: Uniforms;
@group(0) @binding(1) var noise_texture: texture_storage_2d<rgba8unorm, write>;

@compute @workgroup_size(16, 16, 1)
fn main(@builtin(global_invocation_id) id: vec3u) {
    let x = id.x;
    let y = id.y;
    let idx = getIdx(id.xy);
    
    let uv = vec2<f32>(f32(x) / f32(TEX_SIZE) + uni.progress, f32(y) / f32(TEX_SIZE));

    var height = noise_sum(uv, mat2x2<f32>(231.1, 283.7, 143.8, 113.3), 14232.34234);
    height = (height + 1.0) * 0.5;

    var color = noise_sum(uv, mat2x2<f32>(423.5, 342.3, 153.7, 342.5), 18473.58352);
    color = (color + 1.0) * 0.5;

    textureStore(noise_texture, vec2<i32>(i32(x), i32(y)), vec4<f32>(height, color, 0, 255));
}

fn hash22(p: vec2<f32>, mat: mat2x2<f32>, scale: f32) -> vec2<f32> {
    let temp_p = p * mat;
    let p_transformed = -1.0 + 2.0 * fract(sin(temp_p) * scale);
    return sin(p_transformed * 6.283);
}

fn perlin_noise(p: vec2<f32>, mat: mat2x2<f32>, scale: f32) -> f32 {
    let pi = floor(p);
    let pf = p - pi;
    let w = pf * pf * (3.0 - 2.0 * pf);
    
    let f00 = dot(hash22(pi + vec2<f32>(0.0, 0.0), mat, scale), pf - vec2<f32>(0.0, 0.0));
    let f01 = dot(hash22(pi + vec2<f32>(0.0, 1.0), mat, scale), pf - vec2<f32>(0.0, 1.0));
    let f10 = dot(hash22(pi + vec2<f32>(1.0, 0.0), mat, scale), pf - vec2<f32>(1.0, 0.0));
    let f11 = dot(hash22(pi + vec2<f32>(1.0, 1.0), mat, scale), pf - vec2<f32>(1.0, 1.0));
    
    let xm1 = mix(f00, f10, w.x);
    let xm2 = mix(f01, f11, w.x);
    let ym = mix(xm1, xm2, w.y);

    return ym;
}

fn noise_sum(p: vec2<f32>, mat: mat2x2<f32>, scale: f32) -> f32 {
    var p_scaled = p * 4.0;
    var a = 1.0;
    var r = 0.0;
    var s = 0.0;
    
    for (var i = 0; i < 5; i = i + 1) {
        r = r + a * perlin_noise(p_scaled, mat, scale);
        s = s + a;
        p_scaled = p_scaled * 2.0;
        a = a * 0.5;
    }
    
    return r / s;
}`,W=`const TEX_SIZE:u32 = 1024;

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

struct Uniforms {
  color_1:vec3f,
  snow_height:f32,
  color_2:vec3f,
  height_scale:f32,
  cam_pos:vec3f,
  progress: f32,
};

fn getIdx(coord:vec2u) -> u32 {
    return coord.x + coord.y * TEX_SIZE;
}

fn scale_to_range(value: f32, min: f32, max: f32) -> f32 {
    return min + value * (max - min);
}

@group(0) @binding(0) var<uniform> uni: Uniforms;
@group(0) @binding(1) var noise_texture: texture_2d<f32>;
@group(0) @binding(2) var normal_texture: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(3) var my_sampler: sampler;

@compute @workgroup_size(16, 16, 1)
fn main(@builtin(global_invocation_id) id: vec3u) {
    let x = f32(id.x);
    let y = f32(id.y);

    let size = f32(TEX_SIZE);

    
    var left = vec2f((x - 1.0) / size, y / size);
    var right = vec2f((x + 1.0) / size, y / size);
    var down = vec2f(x / size, (y - 1.0) / size);
    var up = vec2f(x / size, (y + 1.0) / size);

    
    if (x == 0.0) {
        left.x = (size - 1.0) / size;
    }
    if (x == size - 1.0) {
        right.x = 0.0;
    }
    if (y == size - 1.0) {
        up.y = 0.0;
    }
    if (y == 0.0) {
        down.y = (size - 1.0) / size;
    }

    
    let left_val:f32 = textureSampleLevel(noise_texture, my_sampler, left, 0).r;
    let right_val:f32 = textureSampleLevel(noise_texture, my_sampler, right, 0).r;
    let up_val:f32 = textureSampleLevel(noise_texture, my_sampler, up, 0).r;
    let down_val:f32 = textureSampleLevel(noise_texture, my_sampler, down, 0).r;

    
    let dx = vec3f(2.0 / size, 0.0, (right_val - left_val) * uni.height_scale);
    let dy = vec3f(0.0, 2.0 / size, (up_val - down_val) * uni.height_scale);

    
    let normal = normalize(cross(dx, dy));
    
    
    textureStore(normal_texture, vec2<i32>(i32(x), i32(y)), vec4f(normal, 0.0));
}

fn cross(a: vec3f, b: vec3f) -> vec3f {
    return vec3f(
        a.y * b.z - a.z * b.y,
        a.z * b.x - a.x * b.z,
        a.x * b.y - a.y * b.x
    );
}`,O=1e-6,w=typeof Float32Array<"u"?Float32Array:Array;Math.hypot||(Math.hypot=function(){for(var e=0,n=arguments.length;n--;)e+=arguments[n]*arguments[n];return Math.sqrt(e)});function R(){var e=new w(16);return w!=Float32Array&&(e[1]=0,e[2]=0,e[3]=0,e[4]=0,e[6]=0,e[7]=0,e[8]=0,e[9]=0,e[11]=0,e[12]=0,e[13]=0,e[14]=0),e[0]=1,e[5]=1,e[10]=1,e[15]=1,e}function $(e){var n=new w(16);return n[0]=e[0],n[1]=e[1],n[2]=e[2],n[3]=e[3],n[4]=e[4],n[5]=e[5],n[6]=e[6],n[7]=e[7],n[8]=e[8],n[9]=e[9],n[10]=e[10],n[11]=e[11],n[12]=e[12],n[13]=e[13],n[14]=e[14],n[15]=e[15],n}function j(e){return e[0]=1,e[1]=0,e[2]=0,e[3]=0,e[4]=0,e[5]=1,e[6]=0,e[7]=0,e[8]=0,e[9]=0,e[10]=1,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,e}function K(e,n){if(e===n){var r=n[1],t=n[2],i=n[3],a=n[6],o=n[7],s=n[11];e[1]=n[4],e[2]=n[8],e[3]=n[12],e[4]=r,e[6]=n[9],e[7]=n[13],e[8]=t,e[9]=a,e[11]=n[14],e[12]=i,e[13]=o,e[14]=s}else e[0]=n[0],e[1]=n[4],e[2]=n[8],e[3]=n[12],e[4]=n[1],e[5]=n[5],e[6]=n[9],e[7]=n[13],e[8]=n[2],e[9]=n[6],e[10]=n[10],e[11]=n[14],e[12]=n[3],e[13]=n[7],e[14]=n[11],e[15]=n[15];return e}function k(e,n){var r=n[0],t=n[1],i=n[2],a=n[3],o=n[4],s=n[5],l=n[6],p=n[7],h=n[8],u=n[9],_=n[10],f=n[11],d=n[12],v=n[13],g=n[14],x=n[15],y=r*s-t*o,b=r*l-i*o,E=r*p-a*o,T=t*l-i*s,P=t*p-a*s,S=i*p-a*l,U=h*v-u*d,M=h*g-_*d,I=h*x-f*d,G=u*g-_*v,C=u*x-f*v,z=_*x-f*g,m=y*z-b*C+E*G+T*I-P*M+S*U;return m?(m=1/m,e[0]=(s*z-l*C+p*G)*m,e[1]=(i*C-t*z-a*G)*m,e[2]=(v*S-g*P+x*T)*m,e[3]=(_*P-u*S-f*T)*m,e[4]=(l*I-o*z-p*M)*m,e[5]=(r*z-i*I+a*M)*m,e[6]=(g*E-d*S-x*b)*m,e[7]=(h*S-_*E+f*b)*m,e[8]=(o*C-s*I+p*U)*m,e[9]=(t*I-r*C-a*U)*m,e[10]=(d*P-v*E+x*y)*m,e[11]=(u*E-h*P-f*y)*m,e[12]=(s*M-o*G-l*U)*m,e[13]=(r*G-t*M+i*U)*m,e[14]=(v*b-d*T-g*y)*m,e[15]=(h*T-u*b+_*y)*m,e):null}function J(e,n,r){var t=r[0],i=r[1],a=r[2],o,s,l,p,h,u,_,f,d,v,g,x;return n===e?(e[12]=n[0]*t+n[4]*i+n[8]*a+n[12],e[13]=n[1]*t+n[5]*i+n[9]*a+n[13],e[14]=n[2]*t+n[6]*i+n[10]*a+n[14],e[15]=n[3]*t+n[7]*i+n[11]*a+n[15]):(o=n[0],s=n[1],l=n[2],p=n[3],h=n[4],u=n[5],_=n[6],f=n[7],d=n[8],v=n[9],g=n[10],x=n[11],e[0]=o,e[1]=s,e[2]=l,e[3]=p,e[4]=h,e[5]=u,e[6]=_,e[7]=f,e[8]=d,e[9]=v,e[10]=g,e[11]=x,e[12]=o*t+h*i+d*a+n[12],e[13]=s*t+u*i+v*a+n[13],e[14]=l*t+_*i+g*a+n[14],e[15]=p*t+f*i+x*a+n[15]),e}function Q(e,n,r){var t=r[0],i=r[1],a=r[2];return e[0]=n[0]*t,e[1]=n[1]*t,e[2]=n[2]*t,e[3]=n[3]*t,e[4]=n[4]*i,e[5]=n[5]*i,e[6]=n[6]*i,e[7]=n[7]*i,e[8]=n[8]*a,e[9]=n[9]*a,e[10]=n[10]*a,e[11]=n[11]*a,e[12]=n[12],e[13]=n[13],e[14]=n[14],e[15]=n[15],e}function ee(e,n,r){var t=Math.sin(r),i=Math.cos(r),a=n[4],o=n[5],s=n[6],l=n[7],p=n[8],h=n[9],u=n[10],_=n[11];return n!==e&&(e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[12]=n[12],e[13]=n[13],e[14]=n[14],e[15]=n[15]),e[4]=a*i+p*t,e[5]=o*i+h*t,e[6]=s*i+u*t,e[7]=l*i+_*t,e[8]=p*i-a*t,e[9]=h*i-o*t,e[10]=u*i-s*t,e[11]=_*i-l*t,e}function ne(e,n,r){var t=Math.sin(r),i=Math.cos(r),a=n[0],o=n[1],s=n[2],l=n[3],p=n[4],h=n[5],u=n[6],_=n[7];return n!==e&&(e[8]=n[8],e[9]=n[9],e[10]=n[10],e[11]=n[11],e[12]=n[12],e[13]=n[13],e[14]=n[14],e[15]=n[15]),e[0]=a*i+p*t,e[1]=o*i+h*t,e[2]=s*i+u*t,e[3]=l*i+_*t,e[4]=p*i-a*t,e[5]=h*i-o*t,e[6]=u*i-s*t,e[7]=_*i-l*t,e}function te(e,n,r,t,i){var a=1/Math.tan(n/2),o;return e[0]=a/r,e[1]=0,e[2]=0,e[3]=0,e[4]=0,e[5]=a,e[6]=0,e[7]=0,e[8]=0,e[9]=0,e[11]=-1,e[12]=0,e[13]=0,e[15]=0,i!=null&&i!==1/0?(o=1/(t-i),e[10]=(i+t)*o,e[14]=2*i*t*o):(e[10]=-1,e[14]=-2*t),e}var ie=te;function re(e,n,r,t){var i,a,o,s,l,p,h,u,_,f,d=n[0],v=n[1],g=n[2],x=t[0],y=t[1],b=t[2],E=r[0],T=r[1],P=r[2];return Math.abs(d-E)<O&&Math.abs(v-T)<O&&Math.abs(g-P)<O?j(e):(h=d-E,u=v-T,_=g-P,f=1/Math.hypot(h,u,_),h*=f,u*=f,_*=f,i=y*_-b*u,a=b*h-x*_,o=x*u-y*h,f=Math.hypot(i,a,o),f?(f=1/f,i*=f,a*=f,o*=f):(i=0,a=0,o=0),s=u*o-_*a,l=_*i-h*o,p=h*a-u*i,f=Math.hypot(s,l,p),f?(f=1/f,s*=f,l*=f,p*=f):(s=0,l=0,p=0),e[0]=i,e[1]=s,e[2]=h,e[3]=0,e[4]=a,e[5]=l,e[6]=u,e[7]=0,e[8]=o,e[9]=p,e[10]=_,e[11]=0,e[12]=-(i*d+a*v+o*g),e[13]=-(s*d+l*v+p*g),e[14]=-(h*d+u*v+_*g),e[15]=1,e)}function ae(){var e=new w(3);return w!=Float32Array&&(e[0]=0,e[1]=0,e[2]=0),e}function B(e,n,r){var t=new w(3);return t[0]=e,t[1]=n,t[2]=r,t}(function(){var e=ae();return function(n,r,t,i,a,o){var s,l;for(r||(r=3),t||(t=0),i?l=Math.min(i*r+t,n.length):l=n.length,s=t;s<l;s+=r)e[0]=n[s],e[1]=n[s+1],e[2]=n[s+2],a(e,e,o),n[s]=e[0],n[s+1]=e[1],n[s+2]=e[2];return n}})();function se(){var e=new w(2);return w!=Float32Array&&(e[0]=0,e[1]=0),e}function oe(e,n){var r=new w(2);return r[0]=e,r[1]=n,r}(function(){var e=se();return function(n,r,t,i,a,o){var s,l;for(r||(r=2),t||(t=0),i?l=Math.min(i*r+t,n.length):l=n.length,s=t;s<l;s+=r)e[0]=n[s],e[1]=n[s+1],a(e,e,o),n[s]=e[0],n[s+1]=e[1];return n}})();class ce{constructor({position:n,center:r,up:t}){c(this,"_position");c(this,"_center");c(this,"_up");this._position=n,this._center=r,this._up=t}getViewMatrix(){const n=R();return re(n,this._position,this._center,this._up),n}get pos(){return this._position}}class le{constructor(){c(this,"_canvas");c(this,"_device");c(this,"_canvasContext");c(this,"_commandEncoder");c(this,"WORKGROUP_SIZE",16);c(this,"_fps");c(this,"_scroll");c(this,"_snow");c(this,"_mountain");c(this,"_previousFrameTime");c(this,"_previousFpsUpdateTime");c(this,"_delta");c(this,"_frameCount");this._previousFrameTime=performance.now(),this._previousFpsUpdateTime=performance.now(),this._delta=0,this._frameCount=0,this._fps=document.getElementById("fps"),this._scroll=document.getElementById("scroll"),this._snow=document.getElementById("snow"),this._mountain=document.getElementById("mountain")}async requestDevice(){var r;const n=await((r=navigator.gpu)==null?void 0:r.requestAdapter());this._device=await(n==null?void 0:n.requestDevice()),this._device||(console.error("Cannot find a device"),alert("Your device does not support WebGPU"))}async getCanvasContext(){this._canvas=document.querySelector("canvas"),this._canvas||console.error("Cannot find a canvas"),this._canvas.width=window.innerWidth,this._canvas.height=window.innerHeight,this._canvasContext=this._canvas.getContext("webgpu"),this._canvasContext||console.error("Cannot find a canvas context");const n={device:this._device,format:navigator.gpu.getPreferredCanvasFormat(),usage:GPUTextureUsage.RENDER_ATTACHMENT,alphaMode:"opaque"};this._canvasContext.configure(n)}async createRenderPipeline({label:n,vertexShader:r,fragmentShader:t,vertexBufferLayout:i,topology:a="triangle-list",bindGroupLayouts:o}){const s={label:n,layout:o?this._device.createPipelineLayout({bindGroupLayouts:o}):"auto",vertex:{module:this._device.createShaderModule({label:`${n} vertex shader`,code:r}),buffers:i},fragment:{module:this._device.createShaderModule({label:`${n} fragment shader`,code:t}),targets:[{format:navigator.gpu.getPreferredCanvasFormat()}]},primitive:{topology:a,cullMode:"back"},depthStencil:{depthWriteEnabled:!0,depthCompare:"less-equal",format:"depth24plus"}};return this._device.createRenderPipeline(s)}async createComputePipeline({label:n,computeShader:r}){const t={label:n,layout:"auto",compute:{module:this._device.createShaderModule({label:`${n} compute shader`,code:r})}};return this._device.createComputePipeline(t)}async createCubemapTexture(n,r=0){const t=await Promise.all(n.map(L)),i=this._device.createTexture({label:"yellow F on red",size:[t[0].width,t[0].height,t.length],mipLevelCount:r+1,format:"rgba8unorm",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT});i||console.error("Failed to load cubemap texture");for(let a=0;a<6;a++)(await D(t[a],r)).forEach((s,l)=>{this._device.queue.copyExternalImageToTexture({source:s,flipY:!1},{texture:i,origin:[0,0,a],mipLevel:l},{width:s.width,height:s.height})});return i}async createTexture(n,r=0){const t=await L(n),i=await D(t,r),a=this._device.createTexture({label:"yellow F on red",size:[i[0].width,i[0].height],mipLevelCount:i.length,format:"rgba8unorm",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT});return a||console.error("Failed to load texture"),i.forEach((o,s)=>{this._device.queue.copyExternalImageToTexture({source:o,flipY:!1},{texture:a,mipLevel:s},{width:o.width,height:o.height})}),a}getVerticesData(n){const r=[];for(let t=0;t<n.length;t++){const{position:i,texCoord:a}=n[t];r.push(...i,...a)}return r}async getRenderPassDesc(){const n=this._canvasContext.getCurrentTexture(),r=this._device.createTexture({size:[n.width,n.height],format:"depth24plus",usage:GPUTextureUsage.RENDER_ATTACHMENT}),t={view:n.createView(),clearValue:[1,1,1,1],loadOp:"clear",storeOp:"store"},i={view:r.createView(),depthClearValue:1,depthLoadOp:"clear",depthStoreOp:"store"};return{label:"render pass",colorAttachments:[t],depthStencilAttachment:i}}async createEncoder(){this._commandEncoder=this._device.createCommandEncoder({label:"encoder"})}async submitCommandBuffer(){const n=this._commandEncoder.finish();this._device.queue.submit([n])}setFrameData(){const n=performance.now(),r=n-this._previousFrameTime;this._delta=this._delta*.9+r*.1,this._frameCount++,n-this._previousFpsUpdateTime>=1e3&&(this._fps.innerHTML=`FPS: ${this._frameCount}`,this._frameCount=0,this._previousFpsUpdateTime=n),this._previousFrameTime=n}}function fe(e){const n=[],r=[];for(let t=0;t<e;t++)for(let i=0;i<e;i++)n.push({position:B(t/(e-1)*2-1,i/(e-1)*2-1,0),texCoord:oe(t/(e-1),i/(e-1))});for(let t=0;t<e-1;t++)for(let i=0;i<e-1;i++)r.push([t+i*e,t+(i+1)*e,t+1+i*e],[t+(i+1)*e,t+1+(i+1)*e,t+1+i*e]);return{vertices:n,indices:r,length:r.length*3}}class he extends le{constructor(){super();c(this,"_mainPipeline");c(this,"_computeNoisePipeline");c(this,"_computeNormalPipeline");c(this,"_vertexBuffer");c(this,"_indexBuffer");c(this,"_indicesLength");c(this,"_matrixUniformBuffer");c(this,"_uniformBuffer");c(this,"_noiseMapTexture");c(this,"_normalMapTexture");c(this,"_sampler");c(this,"_mainBindGroup");c(this,"_computeNoiseBindGroup");c(this,"_computeNormalBindGroup");c(this,"_model");c(this,"_camera");c(this,"_projection");c(this,"_invTransposedModel");c(this,"_color1");c(this,"_color2");c(this,"_snowHeight");c(this,"_heightScale");c(this,"_progress");c(this,"_angle");c(this,"TEX_SIZE",1024);this._color1=B(.13,.7,.13),this._color2=B(.55,.194,0),this._snowHeight=.56,this._heightScale=2,this._progress=0,this._angle=15}async initialize(){await this.requestDevice(),await this.getCanvasContext(),await this.createPipelines(),await this.createVertexBuffers(),await this.createOtherBuffers(),await this.createTextures(),await this.createBindGroups(),this.setStaticMatrix(),document.addEventListener("scroll",()=>{this._scroll.hidden=!0,this._angle=15+window.scrollY*.1}),this._snow.min="0",this._snow.max="80",this._snow.value=(this._snowHeight*100).toString(),this._snow.addEventListener("input",()=>{this._snowHeight=parseFloat(this._snow.value)/100,console.log(this._snow.value)}),this._mountain.min="0",this._mountain.max="500",this._mountain.value=(this._heightScale*100).toString(),this._mountain.addEventListener("input",()=>{this._heightScale=parseFloat(this._mountain.value)/100,console.log(this._mountain.value)})}async run(){this._progress+=.001,this.setDynamicMatrix(),this.setFrameData(),await this.writeBuffers(),await this.createEncoder(),await this.update(),await this.draw(),await this.submitCommandBuffer(),requestAnimationFrame(()=>this.run())}async createPipelines(){this._mainPipeline=await this.createRenderPipeline({label:"main pipeline",vertexShader:Y,fragmentShader:q,vertexBufferLayout:[{arrayStride:5*Float32Array.BYTES_PER_ELEMENT,attributes:[{shaderLocation:0,offset:0,format:"float32x3"},{shaderLocation:1,offset:3*Float32Array.BYTES_PER_ELEMENT,format:"float32x2"}]}]}),this._computeNoisePipeline=await this.createComputePipeline({label:"noise compute pipeline",computeShader:H}),this._computeNormalPipeline=await this.createComputePipeline({label:"normal compute pipeline",computeShader:W})}async createVertexBuffers(){const r=fe(this.TEX_SIZE),t=new Float32Array(this.getVerticesData(r.vertices));this._vertexBuffer=this._device.createBuffer({label:"surface vertex buffer",size:t.byteLength,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST}),this._device.queue.writeBuffer(this._vertexBuffer,0,t);const i=new Uint32Array(r.indices.flat());this._indicesLength=r.length,this._indexBuffer=this._device.createBuffer({label:"surface index buffer",size:i.byteLength,usage:GPUBufferUsage.INDEX|GPUBufferUsage.COPY_DST}),this._device.queue.writeBuffer(this._indexBuffer,0,i)}async createOtherBuffers(){this._matrixUniformBuffer=this._device.createBuffer({label:"matrix uniforms",size:16*4*Float32Array.BYTES_PER_ELEMENT,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this._uniformBuffer=this._device.createBuffer({label:"noise uniforms",size:12*Float32Array.BYTES_PER_ELEMENT,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST})}async createTextures(){this._noiseMapTexture=this._device.createTexture({label:"noise map texture",size:[this.TEX_SIZE,this.TEX_SIZE],format:"rgba8unorm",usage:GPUTextureUsage.COPY_DST|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.STORAGE_BINDING}),this._normalMapTexture=this._device.createTexture({label:"normal map texture",size:[this.TEX_SIZE,this.TEX_SIZE],format:"rgba8unorm",usage:GPUTextureUsage.COPY_DST|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.STORAGE_BINDING}),this._sampler=this._device.createSampler({magFilter:"linear",minFilter:"linear",mipmapFilter:"linear"})}async createBindGroups(){this._mainBindGroup=this._device.createBindGroup({label:"bind group for object",layout:this._mainPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this._matrixUniformBuffer}},{binding:1,resource:{buffer:this._uniformBuffer}},{binding:2,resource:this._noiseMapTexture.createView()},{binding:3,resource:this._normalMapTexture.createView()},{binding:4,resource:this._sampler}]}),this._computeNoiseBindGroup=this._device.createBindGroup({label:"compute noise bind group",layout:this._computeNoisePipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this._uniformBuffer}},{binding:1,resource:this._noiseMapTexture.createView()}]}),this._computeNormalBindGroup=this._device.createBindGroup({label:"compute normal bind group",layout:this._computeNormalPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this._uniformBuffer}},{binding:1,resource:this._noiseMapTexture.createView()},{binding:2,resource:this._normalMapTexture.createView()},{binding:3,resource:this._sampler}]})}setStaticMatrix(){this._camera=new ce({position:B(0,0,2.5),center:B(0,0,0),up:B(0,1,0)}),this._projection=R(),ie(this._projection,N(45),window.innerWidth/window.innerHeight,.1,100)}setDynamicMatrix(){this._model=R();const r=.6;J(this._model,this._model,B(0,this._heightScale*-.25,0)),Q(this._model,this._model,B(r,r,r)),ee(this._model,this._model,N(-50)),ne(this._model,this._model,N(this._angle)),this._invTransposedModel=$(this._model),k(this._invTransposedModel,this._invTransposedModel),K(this._invTransposedModel,this._invTransposedModel)}async writeBuffers(){this._device.queue.writeBuffer(this._matrixUniformBuffer,0,new Float32Array([...this._model,...this._camera.getViewMatrix(),...this._projection,...this._invTransposedModel])),this._device.queue.writeBuffer(this._uniformBuffer,0,new Float32Array([...this._color1,this._snowHeight,...this._color2,this._heightScale,...this._camera.pos,this._progress]))}async draw(){const r=await this.getRenderPassDesc(),t=this._commandEncoder.beginRenderPass(r);t.setPipeline(this._mainPipeline),t==null||t.setBindGroup(0,this._mainBindGroup),t.setVertexBuffer(0,this._vertexBuffer),t.setIndexBuffer(this._indexBuffer,"uint32"),t.drawIndexed(this._indicesLength),t.end()}async update(){const r=this._commandEncoder.beginComputePass({label:"compute pass"});r.setPipeline(this._computeNoisePipeline),r.setBindGroup(0,this._computeNoiseBindGroup),r.dispatchWorkgroups(this.TEX_SIZE/this.WORKGROUP_SIZE,this.TEX_SIZE/this.WORKGROUP_SIZE,1),r.setPipeline(this._computeNormalPipeline),r.setBindGroup(0,this._computeNormalBindGroup),r.dispatchWorkgroups(this.TEX_SIZE/this.WORKGROUP_SIZE,this.TEX_SIZE/this.WORKGROUP_SIZE,1),r.end()}}const F=new he;async function ue(){await F.initialize(),await F.run()}ue();
