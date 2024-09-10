var D=Object.defineProperty;var F=(e,t,i)=>t in e?D(e,t,{enumerable:!0,configurable:!0,writable:!0,value:i}):e[t]=i;var c=(e,t,i)=>F(e,typeof t!="symbol"?t+"":t,i);(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))r(n);new MutationObserver(n=>{for(const a of n)if(a.type==="childList")for(const s of a.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&r(s)}).observe(document,{childList:!0,subtree:!0});function i(n){const a={};return n.integrity&&(a.integrity=n.integrity),n.referrerPolicy&&(a.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?a.credentials="include":n.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function r(n){if(n.ep)return;n.ep=!0;const a=i(n);fetch(n.href,a)}})();async function C(e){const i=await(await fetch(e)).blob();return await createImageBitmap(i,{colorSpaceConversion:"none"})}async function R(e,t){let i=e;const r=[i];let n=0;for(;n<t&&(i.width>1||i.height>1);)i=await A(i),r.push(i),n++;return r}async function A(e){const t=Math.max(1,e.width/2|0),i=Math.max(1,e.height/2|0),r=document.createElement("canvas");r.width=t,r.height=i;const n=r.getContext("2d");if(!n)throw new Error("Unable to get 2D context");return n.drawImage(e,0,0,t,i),createImageBitmap(r)}const V=Math.PI/180;function y(e){return e*V}var L=`const TEX_SIZE:u32 = 1024;

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

@group(0) @binding(0) var<uniform> uni: MatrixUniforms;
@group(0) @binding(1) var heightMap: texture_2d<f32>;
@group(0) @binding(2) var mySampler: sampler;

@vertex fn vs(
  input: Vertex,
) -> VSOutput {
  var output: VSOutput;
  var position = input.position;
  let heightMap = textureSampleLevel(heightMap, mySampler, input.texCoord, 0);
  position.z = scale_to_range(heightMap.r, 0, 2);

  output.position = uni.projection * uni.view * uni.model * vec4f(position, 1.0);
  output.height = heightMap.r;
  output.color = heightMap.g;
  
  return output;
}`,H=`const TEX_SIZE:u32 = 1024;

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
@group(0) @binding(1) var heightMap: texture_2d<f32>;
@group(0) @binding(2) var mySampler: sampler;

@fragment fn fs(input: VSOutput) -> @location(0) vec4f {
    let height = pow(vec3f(input.height), vec3f(2.5));

    let green = vec3f(0.13, 0.7, 0.13);
    let brown = vec3f(0.55, 0.194, 0.0);
    var color = mix(green, brown, vec3f(input.color));

    
    if(input.height > 0.56) {
        color = vec3f(1.0);
    }
    let brightnessFactor:f32 = 3.0;
    return vec4f(color * height * brightnessFactor, 1.0);
}`,z=`const TEX_SIZE:u32 = 1024;

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
@group(0) @binding(0) var noise_texture: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(1) var<uniform> uni: NoiseUniforms;

@compute @workgroup_size(16, 16, 1)
fn main(@builtin(global_invocation_id) id: vec3u) {
    let x = id.x;
    let y = id.y;
    let idx = getIdx(id.xy);
    
    let uv = vec2<f32>(f32(x) / f32(TEX_SIZE) + uni.progress, f32(y) / f32(TEX_SIZE));

    var height = noise_sum(uv, mat2x2<f32>(131.1, 283.7, 143.8, 113.3), 14232.34234);
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
}`,U=1e-6,g=typeof Float32Array<"u"?Float32Array:Array;Math.hypot||(Math.hypot=function(){for(var e=0,t=arguments.length;t--;)e+=arguments[t]*arguments[t];return Math.sqrt(e)});function P(){var e=new g(16);return g!=Float32Array&&(e[1]=0,e[2]=0,e[3]=0,e[4]=0,e[6]=0,e[7]=0,e[8]=0,e[9]=0,e[11]=0,e[12]=0,e[13]=0,e[14]=0),e[0]=1,e[5]=1,e[10]=1,e[15]=1,e}function Z(e){return e[0]=1,e[1]=0,e[2]=0,e[3]=0,e[4]=0,e[5]=1,e[6]=0,e[7]=0,e[8]=0,e[9]=0,e[10]=1,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,e}function Y(e,t,i){var r=i[0],n=i[1],a=i[2],s,o,f,d,h,l,u,p,m,v,_,x;return t===e?(e[12]=t[0]*r+t[4]*n+t[8]*a+t[12],e[13]=t[1]*r+t[5]*n+t[9]*a+t[13],e[14]=t[2]*r+t[6]*n+t[10]*a+t[14],e[15]=t[3]*r+t[7]*n+t[11]*a+t[15]):(s=t[0],o=t[1],f=t[2],d=t[3],h=t[4],l=t[5],u=t[6],p=t[7],m=t[8],v=t[9],_=t[10],x=t[11],e[0]=s,e[1]=o,e[2]=f,e[3]=d,e[4]=h,e[5]=l,e[6]=u,e[7]=p,e[8]=m,e[9]=v,e[10]=_,e[11]=x,e[12]=s*r+h*n+m*a+t[12],e[13]=o*r+l*n+v*a+t[13],e[14]=f*r+u*n+_*a+t[14],e[15]=d*r+p*n+x*a+t[15]),e}function W(e,t,i){var r=i[0],n=i[1],a=i[2];return e[0]=t[0]*r,e[1]=t[1]*r,e[2]=t[2]*r,e[3]=t[3]*r,e[4]=t[4]*n,e[5]=t[5]*n,e[6]=t[6]*n,e[7]=t[7]*n,e[8]=t[8]*a,e[9]=t[9]*a,e[10]=t[10]*a,e[11]=t[11]*a,e[12]=t[12],e[13]=t[13],e[14]=t[14],e[15]=t[15],e}function O(e,t,i){var r=Math.sin(i),n=Math.cos(i),a=t[4],s=t[5],o=t[6],f=t[7],d=t[8],h=t[9],l=t[10],u=t[11];return t!==e&&(e[0]=t[0],e[1]=t[1],e[2]=t[2],e[3]=t[3],e[12]=t[12],e[13]=t[13],e[14]=t[14],e[15]=t[15]),e[4]=a*n+d*r,e[5]=s*n+h*r,e[6]=o*n+l*r,e[7]=f*n+u*r,e[8]=d*n-a*r,e[9]=h*n-s*r,e[10]=l*n-o*r,e[11]=u*n-f*r,e}function X(e,t,i){var r=Math.sin(i),n=Math.cos(i),a=t[0],s=t[1],o=t[2],f=t[3],d=t[8],h=t[9],l=t[10],u=t[11];return t!==e&&(e[4]=t[4],e[5]=t[5],e[6]=t[6],e[7]=t[7],e[12]=t[12],e[13]=t[13],e[14]=t[14],e[15]=t[15]),e[0]=a*n-d*r,e[1]=s*n-h*r,e[2]=o*n-l*r,e[3]=f*n-u*r,e[8]=a*r+d*n,e[9]=s*r+h*n,e[10]=o*r+l*n,e[11]=f*r+u*n,e}function q(e,t,i){var r=Math.sin(i),n=Math.cos(i),a=t[0],s=t[1],o=t[2],f=t[3],d=t[4],h=t[5],l=t[6],u=t[7];return t!==e&&(e[8]=t[8],e[9]=t[9],e[10]=t[10],e[11]=t[11],e[12]=t[12],e[13]=t[13],e[14]=t[14],e[15]=t[15]),e[0]=a*n+d*r,e[1]=s*n+h*r,e[2]=o*n+l*r,e[3]=f*n+u*r,e[4]=d*n-a*r,e[5]=h*n-s*r,e[6]=l*n-o*r,e[7]=u*n-f*r,e}function j(e,t,i,r,n){var a=1/Math.tan(t/2),s;return e[0]=a/i,e[1]=0,e[2]=0,e[3]=0,e[4]=0,e[5]=a,e[6]=0,e[7]=0,e[8]=0,e[9]=0,e[11]=-1,e[12]=0,e[13]=0,e[15]=0,n!=null&&n!==1/0?(s=1/(r-n),e[10]=(n+r)*s,e[14]=2*n*r*s):(e[10]=-1,e[14]=-2*r),e}var $=j;function K(e,t,i,r){var n,a,s,o,f,d,h,l,u,p,m=t[0],v=t[1],_=t[2],x=r[0],B=r[1],b=r[2],M=i[0],S=i[1],I=i[2];return Math.abs(m-M)<U&&Math.abs(v-S)<U&&Math.abs(_-I)<U?Z(e):(h=m-M,l=v-S,u=_-I,p=1/Math.hypot(h,l,u),h*=p,l*=p,u*=p,n=B*u-b*l,a=b*h-x*u,s=x*l-B*h,p=Math.hypot(n,a,s),p?(p=1/p,n*=p,a*=p,s*=p):(n=0,a=0,s=0),o=l*s-u*a,f=u*n-h*s,d=h*a-l*n,p=Math.hypot(o,f,d),p?(p=1/p,o*=p,f*=p,d*=p):(o=0,f=0,d=0),e[0]=n,e[1]=o,e[2]=h,e[3]=0,e[4]=a,e[5]=f,e[6]=l,e[7]=0,e[8]=s,e[9]=d,e[10]=u,e[11]=0,e[12]=-(n*m+a*v+s*_),e[13]=-(o*m+f*v+d*_),e[14]=-(h*m+l*v+u*_),e[15]=1,e)}function w(){var e=new g(3);return g!=Float32Array&&(e[0]=0,e[1]=0,e[2]=0),e}function E(e,t,i){var r=new g(3);return r[0]=e,r[1]=t,r[2]=i,r}function T(e,t,i){var r=t[0],n=t[1],a=t[2],s=i[3]*r+i[7]*n+i[11]*a+i[15];return s=s||1,e[0]=(i[0]*r+i[4]*n+i[8]*a+i[12])/s,e[1]=(i[1]*r+i[5]*n+i[9]*a+i[13])/s,e[2]=(i[2]*r+i[6]*n+i[10]*a+i[14])/s,e}(function(){var e=w();return function(t,i,r,n,a,s){var o,f;for(i||(i=3),r||(r=0),n?f=Math.min(n*i+r,t.length):f=t.length,o=r;o<f;o+=i)e[0]=t[o],e[1]=t[o+1],e[2]=t[o+2],a(e,e,s),t[o]=e[0],t[o+1]=e[1],t[o+2]=e[2];return t}})();function k(){var e=new g(2);return g!=Float32Array&&(e[0]=0,e[1]=0),e}function N(e,t){var i=new g(2);return i[0]=e,i[1]=t,i}(function(){var e=k();return function(t,i,r,n,a,s){var o,f;for(i||(i=2),r||(r=0),n?f=Math.min(n*i+r,t.length):f=t.length,o=r;o<f;o+=i)e[0]=t[o],e[1]=t[o+1],a(e,e,s),t[o]=e[0],t[o+1]=e[1];return t}})();class J{constructor({position:t,center:i,up:r,initialRotate:n}){c(this,"_position");c(this,"_center");c(this,"_up");c(this,"_rotate");this._position=t,this._center=i,this._up=r,this._rotate=n}get position(){const t=this.getViewRotationMatrix(),i=w();return T(i,this._position,t),i}get up(){const t=this.getViewRotationMatrix(),i=w();return T(i,this._up,t),i}getViewMatrix(){const t=P(),i=this.getViewRotationMatrix(),r=w(),n=w(),a=w();return T(r,this._position,i),T(n,this._center,i),T(a,this._up,i),K(t,r,n,a),t}getViewRotationMatrix(){const t=P();return X(t,t,y(this._rotate[1])),O(t,t,y(this._rotate[0])),t}}class Q{constructor(){c(this,"_canvas");c(this,"_device");c(this,"_canvasContext");c(this,"_commandEncoder");c(this,"WIDTH");c(this,"HEIGHT");c(this,"WORKGROUP_SIZE",16);c(this,"_fps");c(this,"_scroll");c(this,"_previousFrameTime");c(this,"_previousFpsUpdateTime");c(this,"_delta");c(this,"_frameCount");this.WIDTH=Math.floor(window.innerWidth/this.WORKGROUP_SIZE)*this.WORKGROUP_SIZE,this.HEIGHT=Math.floor(window.innerHeight/this.WORKGROUP_SIZE)*this.WORKGROUP_SIZE,this._previousFrameTime=performance.now(),this._previousFpsUpdateTime=performance.now(),this._delta=0,this._frameCount=0,this._fps=document.getElementById("fps"),this._scroll=document.getElementById("scroll")}async requestDevice(){var i;const t=await((i=navigator.gpu)==null?void 0:i.requestAdapter());this._device=await(t==null?void 0:t.requestDevice()),this._device||(console.error("Cannot find a device"),alert("Your device does not support WebGPU"))}async getCanvasContext(){this._canvas=document.querySelector("canvas"),this._canvas||console.error("Cannot find a canvas"),this._canvas.width=this.WIDTH,this._canvas.height=this.HEIGHT,this._canvasContext=this._canvas.getContext("webgpu"),this._canvasContext||console.error("Cannot find a canvas context");const t={device:this._device,format:navigator.gpu.getPreferredCanvasFormat(),usage:GPUTextureUsage.RENDER_ATTACHMENT,alphaMode:"opaque"};this._canvasContext.configure(t)}async createRenderPipeline({label:t,vertexShader:i,fragmentShader:r,vertexBufferLayout:n,topology:a="triangle-list",bindGroupLayouts:s}){const o={label:t,layout:s?this._device.createPipelineLayout({bindGroupLayouts:s}):"auto",vertex:{module:this._device.createShaderModule({label:`${t} vertex shader`,code:i}),buffers:n},fragment:{module:this._device.createShaderModule({label:`${t} fragment shader`,code:r}),targets:[{format:navigator.gpu.getPreferredCanvasFormat()}]},primitive:{topology:a,cullMode:"back"},depthStencil:{depthWriteEnabled:!0,depthCompare:"less-equal",format:"depth24plus"}};return this._device.createRenderPipeline(o)}async createComputePipeline({label:t,computeShader:i}){const r={label:t,layout:"auto",compute:{module:this._device.createShaderModule({label:`${t} compute shader`,code:i})}};return this._device.createComputePipeline(r)}async createCubemapTexture(t,i=0){const r=await Promise.all(t.map(C)),n=this._device.createTexture({label:"yellow F on red",size:[r[0].width,r[0].height,r.length],mipLevelCount:i+1,format:"rgba8unorm",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT});n||console.error("Failed to load cubemap texture");for(let a=0;a<6;a++)(await R(r[a],i)).forEach((o,f)=>{this._device.queue.copyExternalImageToTexture({source:o,flipY:!1},{texture:n,origin:[0,0,a],mipLevel:f},{width:o.width,height:o.height})});return n}async createTexture(t,i=0){const r=await C(t),n=await R(r,i),a=this._device.createTexture({label:"yellow F on red",size:[n[0].width,n[0].height],mipLevelCount:n.length,format:"rgba8unorm",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT});return a||console.error("Failed to load texture"),n.forEach((s,o)=>{this._device.queue.copyExternalImageToTexture({source:s,flipY:!1},{texture:a,mipLevel:o},{width:s.width,height:s.height})}),a}getVerticesData(t){const i=[];for(let r=0;r<t.length;r++){const{position:n,texCoord:a}=t[r];i.push(...n,...a)}return i}async getRenderPassDesc(){const t=this._canvasContext.getCurrentTexture(),i=this._device.createTexture({size:[t.width,t.height],format:"depth24plus",usage:GPUTextureUsage.RENDER_ATTACHMENT}),r={view:t.createView(),clearValue:[1,1,1,1],loadOp:"clear",storeOp:"store"},n={view:i.createView(),depthClearValue:1,depthLoadOp:"clear",depthStoreOp:"store"};return{label:"render pass",colorAttachments:[r],depthStencilAttachment:n}}async createEncoder(){this._commandEncoder=this._device.createCommandEncoder({label:"encoder"})}async submitCommandBuffer(){const t=this._commandEncoder.finish();this._device.queue.submit([t])}setFrameData(){const t=performance.now(),i=t-this._previousFrameTime;this._delta=this._delta*.9+i*.1,this._frameCount++,t-this._previousFpsUpdateTime>=1e3&&(this._fps.innerHTML=`FPS: ${this._frameCount}`,this._frameCount=0,this._previousFpsUpdateTime=t),this._previousFrameTime=t}initializeVecNArray(t){return new Float32Array(this.WIDTH*this.HEIGHT*t)}createSurfaceBuffer(t,i){const r=this._device.createBuffer({label:`${t} storage buffer`,size:this.WIDTH*this.HEIGHT*i*Float32Array.BYTES_PER_ELEMENT,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST});return this._device.queue.writeBuffer(r,0,this.initializeVecNArray(i)),r}}function ee(e){const t=[],i=[];for(let r=0;r<e;r++)for(let n=0;n<e;n++)t.push({position:E(r/(e-1)*2-1,n/(e-1)*2-1,0),texCoord:N(r/(e-1),n/(e-1))});for(let r=0;r<e-1;r++)for(let n=0;n<e-1;n++)i.push([r+n*e,r+(n+1)*e,r+1+n*e],[r+(n+1)*e,r+1+(n+1)*e,r+1+n*e]);return{vertices:t,indices:i,length:i.length*3}}class te extends Q{constructor(){super();c(this,"_mainPipeline");c(this,"_computeNoisePipeline");c(this,"_vertexBuffer");c(this,"_indexBuffer");c(this,"_indicesLength");c(this,"_matrixUniformBuffer");c(this,"_noiseUniformBuffer");c(this,"_heightMapTexture");c(this,"_sampler");c(this,"_mainBindGroup");c(this,"_computeNoiseBindGroup");c(this,"_model");c(this,"_camera");c(this,"_projection");c(this,"_progress",0);c(this,"_angle",15);c(this,"TEX_SIZE",1024)}async initialize(){await this.requestDevice(),await this.getCanvasContext(),await this.createPipelines(),await this.createVertexBuffers(),await this.createOtherBuffers(),await this.createTextures(),await this.createBindGroups(),document.addEventListener("scroll",()=>{this._scroll.hidden=!0,this._angle=15+window.scrollY*.1})}async run(){this._progress+=.001,this.setMatrix(),this.setFrameData(),await this.writeBuffers(),await this.createEncoder(),await this.update(),await this.draw(),await this.submitCommandBuffer(),requestAnimationFrame(()=>this.run())}async createPipelines(){this._mainPipeline=await this.createRenderPipeline({label:"main pipeline",vertexShader:L,fragmentShader:H,vertexBufferLayout:[{arrayStride:5*Float32Array.BYTES_PER_ELEMENT,attributes:[{shaderLocation:0,offset:0,format:"float32x3"},{shaderLocation:1,offset:3*Float32Array.BYTES_PER_ELEMENT,format:"float32x2"}]}]}),this._computeNoisePipeline=await this.createComputePipeline({label:"noise compute pipeline",computeShader:z})}async createVertexBuffers(){const i=ee(this.TEX_SIZE),r=new Float32Array(this.getVerticesData(i.vertices));this._vertexBuffer=this._device.createBuffer({label:"surface vertex buffer",size:r.byteLength,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST}),this._device.queue.writeBuffer(this._vertexBuffer,0,r);const n=new Uint32Array(i.indices.flat());this._indicesLength=i.length,this._indexBuffer=this._device.createBuffer({label:"surface index buffer",size:n.byteLength,usage:GPUBufferUsage.INDEX|GPUBufferUsage.COPY_DST}),this._device.queue.writeBuffer(this._indexBuffer,0,n)}async createOtherBuffers(){this._matrixUniformBuffer=this._device.createBuffer({label:"matrix uniforms",size:48*Float32Array.BYTES_PER_ELEMENT,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this._noiseUniformBuffer=this._device.createBuffer({label:"noise uniforms",size:4*Float32Array.BYTES_PER_ELEMENT,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST})}async createTextures(){this._heightMapTexture=this._device.createTexture({label:"height map texture",size:[this.TEX_SIZE,this.TEX_SIZE],format:"rgba8unorm",usage:GPUTextureUsage.COPY_DST|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.STORAGE_BINDING}),this._sampler=this._device.createSampler({magFilter:"linear",minFilter:"linear",mipmapFilter:"linear"})}async createBindGroups(){this._mainBindGroup=this._device.createBindGroup({label:"bind group for object",layout:this._mainPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this._matrixUniformBuffer}},{binding:1,resource:this._heightMapTexture.createView()},{binding:2,resource:this._sampler}]}),this._computeNoiseBindGroup=this._device.createBindGroup({label:"compute noise bind group",layout:this._computeNoisePipeline.getBindGroupLayout(0),entries:[{binding:0,resource:this._heightMapTexture.createView()},{binding:1,resource:{buffer:this._noiseUniformBuffer}}]})}setMatrix(){this._model=P();const i=this.WIDTH>500?.8:.5;Y(this._model,this._model,E(0,this.WIDTH>500?-.5:-.3,0)),W(this._model,this._model,E(i,i,i)),O(this._model,this._model,y(-50)),q(this._model,this._model,y(this._angle)),this._camera=new J({position:E(0,0,2.5),center:E(0,0,0),up:E(0,1,0),initialRotate:N(0,0)}),this._projection=P(),$(this._projection,y(45),this.WIDTH/this.HEIGHT,.1,100)}async writeBuffers(){const i=this._camera.getViewMatrix();this._device.queue.writeBuffer(this._matrixUniformBuffer,0,new Float32Array([...this._model,...i,...this._projection])),this._device.queue.writeBuffer(this._noiseUniformBuffer,0,new Float32Array([this._progress,0,0,0]))}async draw(){const i=await this.getRenderPassDesc(),r=this._commandEncoder.beginRenderPass(i);r.setPipeline(this._mainPipeline),r==null||r.setBindGroup(0,this._mainBindGroup),r.setVertexBuffer(0,this._vertexBuffer),r.setIndexBuffer(this._indexBuffer,"uint32"),r.drawIndexed(this._indicesLength),r.end()}async update(){const i=this._commandEncoder.beginComputePass({label:"compute pass"});i.setPipeline(this._computeNoisePipeline),i.setBindGroup(0,this._computeNoiseBindGroup),i.dispatchWorkgroups(this.TEX_SIZE/this.WORKGROUP_SIZE,this.TEX_SIZE/this.WORKGROUP_SIZE,1),i.end()}}const G=new te;async function re(){await G.initialize(),await G.run()}re();
