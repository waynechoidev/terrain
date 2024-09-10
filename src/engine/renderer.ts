import { toRadian } from "@/engine/utils";
import main_vert from "@/shaders/main.vert.wgsl";
import main_frag from "@/shaders/main.frag.wgsl";
import noise_compute from "@/shaders/noise.compute.wgsl";
import normal_compute from "@/shaders/normal.compute.wgsl";
import { mat4, vec2, vec3 } from "gl-matrix";
import Camera from "./camera";
import RendererBackend from "./renderer_backend";
import Surface from "./geometry/surface";

export default class Renderer extends RendererBackend {
  private _mainPipeline!: GPURenderPipeline;
  private _computeNoisePipeline!: GPUComputePipeline;
  private _computeNormalPipeline!: GPUComputePipeline;

  private _vertexBuffer!: GPUBuffer;
  private _indexBuffer!: GPUBuffer;
  private _indicesLength!: number;
  private _matrixUniformBuffer!: GPUBuffer;
  private _noiseUniformBuffer!: GPUBuffer;

  private _heightMapTexture!: GPUTexture;
  private _normalMapTexture!: GPUTexture;
  private _sampler!: GPUSampler;

  private _mainBindGroup!: GPUBindGroup;
  private _computeNoiseBindGroup!: GPUBindGroup;
  private _computeNormalBindGroup!: GPUBindGroup;

  private _model!: mat4;
  private _camera!: Camera;
  private _projection!: mat4;

  private _progress = 0;
  private _angle = 15;

  private readonly TEX_SIZE = 1024;

  constructor() {
    super();
  }

  // public methods
  public async initialize() {
    await this.requestDevice();
    await this.getCanvasContext();

    await this.createPipelines();

    await this.createVertexBuffers();
    await this.createOtherBuffers();

    await this.createTextures();

    await this.createBindGroups();

    document.addEventListener("scroll", () => {
      this._scroll.hidden = true;
      this._angle = 15 + window.scrollY * 0.1;
    });
  }

  public async run() {
    this._progress += 0.001;

    this.setMatrix();

    this.setFrameData();

    await this.writeBuffers();

    await this.createEncoder();

    await this.update();

    await this.draw();

    await this.submitCommandBuffer();

    requestAnimationFrame(() => this.run());
  }

  private async createPipelines() {
    this._mainPipeline = await this.createRenderPipeline({
      label: "main pipeline",
      vertexShader: main_vert,
      fragmentShader: main_frag,
      vertexBufferLayout: [
        {
          arrayStride: 5 * Float32Array.BYTES_PER_ELEMENT,
          attributes: [
            { shaderLocation: 0, offset: 0, format: "float32x3" }, // position
            {
              shaderLocation: 1,
              offset: 3 * Float32Array.BYTES_PER_ELEMENT,
              format: "float32x2",
            }, // texCoord
          ],
        },
      ],
    });

    this._computeNoisePipeline = await this.createComputePipeline({
      label: "noise compute pipeline",
      computeShader: noise_compute,
    });

    this._computeNormalPipeline = await this.createComputePipeline({
      label: "normal compute pipeline",
      computeShader: normal_compute,
    });
  }

  private async createVertexBuffers() {
    const surface = Surface(this.TEX_SIZE);
    const cubeVertexValues = new Float32Array(
      this.getVerticesData(surface.vertices)
    );
    this._vertexBuffer = this._device.createBuffer({
      label: "surface vertex buffer",
      size: cubeVertexValues.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this._device.queue.writeBuffer(this._vertexBuffer, 0, cubeVertexValues);
    const cubeIndexValues = new Uint32Array(surface.indices.flat());
    this._indicesLength = surface.length;
    this._indexBuffer = this._device.createBuffer({
      label: "surface index buffer",
      size: cubeIndexValues.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    this._device.queue.writeBuffer(this._indexBuffer, 0, cubeIndexValues);
  }

  private async createOtherBuffers() {
    this._matrixUniformBuffer = this._device.createBuffer({
      label: "matrix uniforms",
      size: (16 + 16 + 16) * Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this._noiseUniformBuffer = this._device.createBuffer({
      label: "noise uniforms",
      size: 4 * Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
  }

  private async createTextures() {
    this._heightMapTexture = this._device.createTexture({
      label: "height map texture",
      size: [this.TEX_SIZE, this.TEX_SIZE],
      format: "rgba8unorm",
      usage:
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.STORAGE_BINDING,
    });

    this._normalMapTexture = this._device.createTexture({
      label: "normal map texture",
      size: [this.TEX_SIZE, this.TEX_SIZE],
      format: "rgba8unorm",
      usage:
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.STORAGE_BINDING,
    });

    this._sampler = this._device.createSampler({
      magFilter: "linear",
      minFilter: "linear",
      mipmapFilter: "linear",
    });
  }

  private async createBindGroups() {
    this._mainBindGroup = this._device.createBindGroup({
      label: "bind group for object",
      layout: this._mainPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this._matrixUniformBuffer } },
        { binding: 1, resource: this._heightMapTexture.createView() },
        { binding: 2, resource: this._sampler },
      ],
    });

    this._computeNoiseBindGroup = this._device.createBindGroup({
      label: "compute noise bind group",
      layout: this._computeNoisePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: this._heightMapTexture.createView() },
        { binding: 1, resource: { buffer: this._noiseUniformBuffer } },
      ],
    });

    this._computeNormalBindGroup = this._device.createBindGroup({
      label: "compute noise bind group",
      layout: this._computeNormalPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: this._heightMapTexture.createView() },
        { binding: 1, resource: this._normalMapTexture.createView() },
        { binding: 2, resource: this._sampler },
      ],
    });
  }

  private setMatrix() {
    this._model = mat4.create();
    const scale = window.innerWidth > 500 ? 0.8 : 0.5;
    mat4.translate(
      this._model,
      this._model,
      vec3.fromValues(0, window.innerHeight > 500 ? -0.5 : -0.3, 0)
    );
    mat4.scale(this._model, this._model, vec3.fromValues(scale, scale, scale));
    mat4.rotateX(this._model, this._model, toRadian(-50));
    mat4.rotateZ(this._model, this._model, toRadian(this._angle));

    this._camera = new Camera({
      position: vec3.fromValues(0, 0, 2.5),
      center: vec3.fromValues(0, 0, 0),
      up: vec3.fromValues(0, 1, 0),
      initialRotate: vec2.fromValues(0, 0),
    });

    this._projection = mat4.create();
    mat4.perspective(
      this._projection,
      toRadian(45),
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
  }

  private async writeBuffers() {
    const view = this._camera.getViewMatrix();
    this._device.queue.writeBuffer(
      this._matrixUniformBuffer,
      0,
      new Float32Array([...this._model, ...view, ...this._projection])
    );

    this._device.queue.writeBuffer(
      this._noiseUniformBuffer,
      0,
      new Float32Array([this._progress, 0, 0, 0])
    );
  }

  private async draw() {
    const renderPassDesc: GPURenderPassDescriptor =
      await this.getRenderPassDesc();
    const renderPassEncoder: GPURenderPassEncoder =
      this._commandEncoder.beginRenderPass(renderPassDesc);

    renderPassEncoder.setPipeline(this._mainPipeline);
    renderPassEncoder?.setBindGroup(0, this._mainBindGroup);
    renderPassEncoder.setVertexBuffer(0, this._vertexBuffer);
    renderPassEncoder.setIndexBuffer(this._indexBuffer, "uint32");
    renderPassEncoder.drawIndexed(this._indicesLength);

    renderPassEncoder.end();
  }

  private async update() {
    const computePassEncoder = this._commandEncoder.beginComputePass({
      label: "compute pass",
    });

    computePassEncoder.setPipeline(this._computeNoisePipeline);
    computePassEncoder.setBindGroup(0, this._computeNoiseBindGroup);
    computePassEncoder.dispatchWorkgroups(
      this.TEX_SIZE / this.WORKGROUP_SIZE,
      this.TEX_SIZE / this.WORKGROUP_SIZE,
      1
    );

    computePassEncoder.setPipeline(this._computeNormalPipeline);
    computePassEncoder.setBindGroup(0, this._computeNormalBindGroup);
    computePassEncoder.dispatchWorkgroups(
      this.TEX_SIZE / this.WORKGROUP_SIZE,
      this.TEX_SIZE / this.WORKGROUP_SIZE,
      1
    );

    computePassEncoder.end();
  }
}
