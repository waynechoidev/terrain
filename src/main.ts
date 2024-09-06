import Renderer from "@/engine/renderer";

const renderer = new Renderer();

async function main() {
  await renderer.initialize();

  await renderer.run();
}

main();
