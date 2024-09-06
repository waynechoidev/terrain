import { toRadian } from "@/engine/utils";
import main_vert from "@/shaders/main.vert.wgsl";
import main_frag from "@/shaders/main.frag.wgsl";
import initialize_compute from "@/shaders/initialize.compute.wgsl";
import divergence_compute from "@/shaders/divergence.compute.wgsl";
import jacobi_compute from "@/shaders/jacobi.compute.wgsl";
import texture_compute from "@/shaders/texture.compute.wgsl";
import { mat4, vec2, vec3 } from "gl-matrix";
import Camera from "./camera";
import RendererBackend from "./renderer_backend";
import Surface from "./geometry/surface";

export default class Renderer extends RendererBackend {
  private _mainPipeline!: GPURenderPipeline;
  private _computeInitializePipeline!: GPUComputePipeline;
  private _computeDivergencePipeline!: GPUComputePipeline;
  private _computeJacobiPipeline!: GPUComputePipeline;
  private _computeTexturePipeline!: GPUComputePipeline;

  private _vertexBuffer!: GPUBuffer;
  private _indexBuffer!: GPUBuffer;
  private _indicesLength!: number;
  private _matrixUniformBuffer!: GPUBuffer;
  private _heightMapStorageBuffer!: GPUBuffer;
  private _heightMapTempStorageBuffer!: GPUBuffer;
  private _divergenceStorageBuffer!: GPUBuffer;

  private _heightMapTexture!: GPUTexture;
  private _sampler!: GPUSampler;

  private _mainBindGroup!: GPUBindGroup;
  private _computeInitializeBindGroup!: GPUBindGroup;
  private _computeDivergenceBindGroup!: GPUBindGroup;
  private _computeJacobiBindGroupOdd!: GPUBindGroup;
  private _computeJacobiBindGroupEven!: GPUBindGroup;
  private _computeTextureBindGroup!: GPUBindGroup;

  private _model!: mat4;
  private _camera!: Camera;
  private _projection!: mat4;

  private readonly TEX_SIZE = 256;
  private readonly WORKGROUP_SIZE = 16;

  private _play: boolean;

  constructor() {
    super();
    this._play = false;
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

    await this.computeInitialize();

    this.setMatrix();
  }

  public async run() {
    await this.writeBuffers();

    await this.createEncoder();

    if (this._play) await this.update();

    await this.draw();

    await this.submitCommandBuffer();

    requestAnimationFrame(() => this.run());
  }

  public play() {
    this._play = true;
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

    this._computeInitializePipeline = await this.createComputePipeline({
      label: "initialize compute pipeline",
      computeShader: initialize_compute,
    });

    this._computeDivergencePipeline = await this.createComputePipeline({
      label: "divergence compute pipeline",
      computeShader: divergence_compute,
    });

    this._computeJacobiPipeline = await this.createComputePipeline({
      label: "jacobi compute pipeline",
      computeShader: jacobi_compute,
    });

    this._computeTexturePipeline = await this.createComputePipeline({
      label: "texture compute pipeline",
      computeShader: texture_compute,
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
    this._heightMapStorageBuffer = this._device.createBuffer({
      label: "height map storage buffer",
      size: this.TEX_SIZE * this.TEX_SIZE * Float32Array.BYTES_PER_ELEMENT,
      usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_SRC |
        GPUBufferUsage.COPY_DST,
    });
    const heightMap = new Float32Array(this.TEX_SIZE * this.TEX_SIZE);
    this._device.queue.writeBuffer(this._heightMapStorageBuffer, 0, heightMap);

    this._heightMapTempStorageBuffer = this._device.createBuffer({
      label: "height map temp storage buffer",
      size: this.TEX_SIZE * this.TEX_SIZE * Float32Array.BYTES_PER_ELEMENT,
      usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_SRC |
        GPUBufferUsage.COPY_DST,
    });
    this._device.queue.writeBuffer(
      this._heightMapTempStorageBuffer,
      0,
      heightMap
    );

    this._divergenceStorageBuffer = this._device.createBuffer({
      label: "divergence storage buffer",
      size: this.TEX_SIZE * this.TEX_SIZE * Float32Array.BYTES_PER_ELEMENT,
      usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_SRC |
        GPUBufferUsage.COPY_DST,
    });
    this._device.queue.writeBuffer(this._divergenceStorageBuffer, 0, heightMap);

    this._matrixUniformBuffer = this._device.createBuffer({
      label: "matrix uniforms",
      size: (16 + 16 + 16) * Float32Array.BYTES_PER_ELEMENT,
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

    this._computeInitializeBindGroup = this._device.createBindGroup({
      label: "compute initialize bind group",
      layout: this._computeInitializePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this._heightMapStorageBuffer } },
      ],
    });

    this._computeDivergenceBindGroup = this._device.createBindGroup({
      label: "compute divergence bind group",
      layout: this._computeDivergencePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this._heightMapStorageBuffer } },
        { binding: 1, resource: { buffer: this._heightMapTempStorageBuffer } },
        { binding: 2, resource: { buffer: this._divergenceStorageBuffer } },
      ],
    });

    this._computeJacobiBindGroupOdd = this._device.createBindGroup({
      label: "compute jacobi bind group odd",
      layout: this._computeJacobiPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this._heightMapTempStorageBuffer } },
        { binding: 1, resource: { buffer: this._heightMapStorageBuffer } },
        { binding: 2, resource: { buffer: this._divergenceStorageBuffer } },
      ],
    });

    this._computeJacobiBindGroupEven = this._device.createBindGroup({
      label: "compute jacobi bind group even",
      layout: this._computeJacobiPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this._heightMapStorageBuffer } },
        { binding: 1, resource: { buffer: this._heightMapTempStorageBuffer } },
        { binding: 2, resource: { buffer: this._divergenceStorageBuffer } },
      ],
    });

    this._computeTextureBindGroup = this._device.createBindGroup({
      label: "compute movement bind group",
      layout: this._computeTexturePipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this._heightMapStorageBuffer } },
        { binding: 1, resource: this._heightMapTexture.createView() },
      ],
    });
  }

  private setMatrix() {
    this._model = mat4.create();
    const scale = this.WIDTH > 500 ? 0.4 : 0.3;
    mat4.scale(this._model, this._model, vec3.fromValues(scale, scale, scale));
    mat4.translate(this._model, this._model, vec3.fromValues(-0.5, 0.2, 0));
    mat4.rotateX(this._model, this._model, toRadian(30));
    mat4.rotateY(this._model, this._model, toRadian(-15));

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
      this.WIDTH / this.HEIGHT,
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
  }

  private async computeInitialize() {
    await this.createEncoder();

    const computePassEncoder = this._commandEncoder.beginComputePass({
      label: "compute initialize pass",
    });

    computePassEncoder.setPipeline(this._computeInitializePipeline);
    computePassEncoder.setBindGroup(0, this._computeInitializeBindGroup);
    computePassEncoder.dispatchWorkgroups(
      this.TEX_SIZE / this.WORKGROUP_SIZE,
      this.TEX_SIZE / this.WORKGROUP_SIZE,
      1
    );

    computePassEncoder.setPipeline(this._computeTexturePipeline);
    computePassEncoder.setBindGroup(0, this._computeTextureBindGroup);
    computePassEncoder.dispatchWorkgroups(
      this.TEX_SIZE / this.WORKGROUP_SIZE,
      this.TEX_SIZE / this.WORKGROUP_SIZE,
      1
    );

    computePassEncoder.end();

    await this.submitCommandBuffer();
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

    computePassEncoder.setPipeline(this._computeDivergencePipeline);
    computePassEncoder.setBindGroup(0, this._computeDivergenceBindGroup);
    computePassEncoder.dispatchWorkgroups(
      this.TEX_SIZE / this.WORKGROUP_SIZE,
      this.TEX_SIZE / this.WORKGROUP_SIZE,
      1
    );

    computePassEncoder.setPipeline(this._computeJacobiPipeline);
    for (let i = 0; i < 40; i++) {
      if (i % 2 == 0) {
        computePassEncoder.setBindGroup(0, this._computeJacobiBindGroupOdd);
      } else {
        computePassEncoder.setBindGroup(0, this._computeJacobiBindGroupEven);
      }
      computePassEncoder.dispatchWorkgroups(
        this.TEX_SIZE / this.WORKGROUP_SIZE,
        this.TEX_SIZE / this.WORKGROUP_SIZE,
        1
      );
    }

    computePassEncoder.setPipeline(this._computeTexturePipeline);
    computePassEncoder.setBindGroup(0, this._computeTextureBindGroup);
    computePassEncoder.dispatchWorkgroups(
      this.TEX_SIZE / this.WORKGROUP_SIZE,
      this.TEX_SIZE / this.WORKGROUP_SIZE,
      1
    );

    computePassEncoder.end();
  }
}
