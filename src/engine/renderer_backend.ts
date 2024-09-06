import { generateMips, loadImageBitmap, Vertex } from "@/engine/utils";

export default abstract class RendererBackend {
  protected _canvas!: HTMLCanvasElement;
  protected _device!: GPUDevice;
  protected _canvasContext!: GPUCanvasContext;
  protected _commandEncoder!: GPUCommandEncoder;

  protected readonly WIDTH: number;
  protected readonly HEIGHT: number;
  protected readonly WORKGROUP_SIZE = 16;

  protected _fps: HTMLElement;
  protected _drag: HTMLElement;
  protected _warning: HTMLElement;
  protected _previousFrameTime: number;
  protected _previousFpsUpdateTime: number;
  protected _delta: number;
  protected _frameCount: number;

  constructor() {
    this.WIDTH =
      Math.floor(window.innerWidth / this.WORKGROUP_SIZE) * this.WORKGROUP_SIZE;
    this.HEIGHT =
      Math.floor(window.innerHeight / this.WORKGROUP_SIZE) *
      this.WORKGROUP_SIZE;

    this._previousFrameTime = performance.now();
    this._previousFpsUpdateTime = performance.now();
    this._delta = 0;
    this._frameCount = 0;
    this._fps = document.getElementById("fps") as HTMLElement;
    this._drag = document.getElementById("drag") as HTMLElement;
    this._warning = document.getElementById("warning") as HTMLElement;
  }

  abstract initialize(): Promise<void>;
  abstract run(play: boolean): Promise<void>;

  protected async requestDevice() {
    const adapter: GPUAdapter | null = await navigator.gpu?.requestAdapter();
    this._device = await adapter?.requestDevice()!;
    if (!this._device) {
      console.error("Cannot find a device");
      alert("Your device does not support WebGPU");
    }
  }

  protected async getCanvasContext() {
    this._canvas = document.querySelector("canvas") as HTMLCanvasElement;
    if (!this._canvas) console.error("Cannot find a canvas");

    this._canvas.width = this.WIDTH;
    this._canvas.height = this.HEIGHT;

    this._canvasContext = this._canvas.getContext("webgpu") as GPUCanvasContext;
    if (!this._canvasContext) console.error("Cannot find a canvas context");

    const canvasConfig: GPUCanvasConfiguration = {
      device: this._device,
      format: navigator.gpu.getPreferredCanvasFormat(),
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
      alphaMode: "opaque",
    };
    this._canvasContext.configure(canvasConfig);
  }

  protected async createRenderPipeline({
    label,
    vertexShader,
    fragmentShader,
    vertexBufferLayout,
    topology = "triangle-list",
    bindGroupLayouts,
  }: {
    label: string;
    vertexShader: string;
    fragmentShader: string;
    vertexBufferLayout: GPUVertexBufferLayout[];
    topology?: GPUPrimitiveTopology;
    bindGroupLayouts?: Iterable<GPUBindGroupLayout>;
  }) {
    const renderPipelineDesc: GPURenderPipelineDescriptor = {
      label: label,
      layout: bindGroupLayouts
        ? this._device.createPipelineLayout({
            bindGroupLayouts: bindGroupLayouts,
          })
        : "auto",
      vertex: {
        module: this._device.createShaderModule({
          label: `${label} vertex shader`,
          code: vertexShader,
        }),
        buffers: vertexBufferLayout,
      },
      fragment: {
        module: this._device.createShaderModule({
          label: `${label} fragment shader`,
          code: fragmentShader,
        }),
        targets: [
          {
            format: navigator.gpu.getPreferredCanvasFormat(),
          },
        ],
      },
      primitive: {
        topology: topology,
        cullMode: "back",
      },
      depthStencil: {
        depthWriteEnabled: true,
        depthCompare: "less-equal",
        format: "depth24plus",
      },
    };
    const pipeline: GPURenderPipeline =
      this._device.createRenderPipeline(renderPipelineDesc);

    return pipeline;
  }

  protected async createComputePipeline({
    label,
    computeShader,
  }: {
    label: string;
    computeShader: string;
  }) {
    const computePipelineDesc: GPUComputePipelineDescriptor = {
      label: label,
      layout: "auto",
      compute: {
        module: this._device.createShaderModule({
          label: `${label} compute shader`,
          code: computeShader,
        }),
      },
    };
    const pipeline: GPUComputePipeline =
      this._device.createComputePipeline(computePipelineDesc);

    return pipeline;
  }

  protected async createCubemapTexture(imgSrcs: string[], maxMipLevel = 0) {
    const imgs = await Promise.all(imgSrcs.map(loadImageBitmap));
    const texture = this._device.createTexture({
      label: "yellow F on red",
      size: [imgs[0].width, imgs[0].height, imgs.length],
      mipLevelCount: maxMipLevel + 1,
      format: "rgba8unorm",
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });
    if (!texture) console.error("Failed to load cubemap texture");

    for (let layer = 0; layer < 6; layer++) {
      const mips = await generateMips(imgs[layer], maxMipLevel);
      mips.forEach((img, mipLevel) => {
        this._device.queue.copyExternalImageToTexture(
          { source: img, flipY: false },
          {
            texture: texture,
            origin: [0, 0, layer],
            mipLevel: mipLevel,
          },
          { width: img.width, height: img.height }
        );
      });
    }

    return texture;
  }

  protected async createTexture(imgSrc: string, maxMipLevel = 0) {
    const img = await loadImageBitmap(imgSrc);
    const mips = await generateMips(img, maxMipLevel);

    const texture = this._device.createTexture({
      label: "yellow F on red",
      size: [mips[0].width, mips[0].height],
      mipLevelCount: mips.length,
      format: "rgba8unorm",
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });
    if (!texture) console.error("Failed to load texture");

    mips.forEach((img, index) => {
      this._device.queue.copyExternalImageToTexture(
        { source: img, flipY: false },
        { texture: texture, mipLevel: index }, // Set the mip level for each copy operation
        { width: img.width, height: img.height }
      );
    });

    return texture;
  }

  protected getVerticesData(vertices: Vertex[]) {
    const verticesData: number[] = [];
    for (let i = 0; i < vertices.length; i++) {
      const { position, texCoord } = vertices[i];
      verticesData.push(...position, ...texCoord);
    }

    return verticesData;
  }

  protected async getRenderPassDesc() {
    const canvasTexture = this._canvasContext.getCurrentTexture();
    const depthTexture = this._device.createTexture({
      size: [canvasTexture.width, canvasTexture.height],
      format: "depth24plus",
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    const colorAttachment: GPURenderPassColorAttachment = {
      view: canvasTexture.createView(),
      clearValue: [1, 1, 1, 1],
      loadOp: "clear",
      storeOp: "store",
    };
    const depthStencilAttachment: GPURenderPassDepthStencilAttachment = {
      view: depthTexture.createView(),
      depthClearValue: 1.0,
      depthLoadOp: "clear",
      depthStoreOp: "store",
    };
    const renderPassDescriptor: GPURenderPassDescriptor = {
      label: "render pass",
      colorAttachments: [colorAttachment],
      depthStencilAttachment: depthStencilAttachment,
    };

    return renderPassDescriptor;
  }

  protected async createEncoder() {
    this._commandEncoder = this._device.createCommandEncoder({
      label: "encoder",
    });
  }

  protected async submitCommandBuffer() {
    const commandBuffer: GPUCommandBuffer = this._commandEncoder.finish();
    this._device.queue.submit([commandBuffer]);
  }

  protected setFrameData() {
    const time = performance.now();
    const currentDelta = time - this._previousFrameTime;

    this._delta = this._delta * 0.9 + currentDelta * 0.1;

    this._frameCount++;

    if (time - this._previousFpsUpdateTime >= 1000) {
      this._fps.innerHTML = `FPS: ${this._frameCount}`;

      this._frameCount = 0;
      this._previousFpsUpdateTime = time;
    }

    this._previousFrameTime = time;
  }

  protected initializeVecNArray(n: number) {
    return new Float32Array(this.WIDTH * this.HEIGHT * n);
  }

  protected createSurfaceBuffer(label: string, n: number) {
    const buffer = this._device.createBuffer({
      label: `${label} storage buffer`,
      size: this.WIDTH * this.HEIGHT * n * Float32Array.BYTES_PER_ELEMENT,
      usage:
        GPUBufferUsage.STORAGE |
        GPUBufferUsage.COPY_SRC |
        GPUBufferUsage.COPY_DST,
    });
    // initialize
    this._device.queue.writeBuffer(buffer, 0, this.initializeVecNArray(n));
    return buffer;
  }
}
