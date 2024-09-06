import { Vertex } from "@/engine/utils";
import { vec2, vec3 } from "gl-matrix";

export default function Surface(num: number) {
  const vertices: Vertex[] = [];
  const indices: [number, number, number][] = [];

  for (let x = 0; x < num; x++) {
    for (let z = 0; z < num; z++) {
      vertices.push({
        position: vec3.fromValues(x / num, 0, z / num),
        texCoord: vec2.fromValues(x / num, z / num),
      });
    }
  }

  for (let x = 0; x < num - 1; x++) {
    for (let z = 0; z < num - 1; z++) {
      indices.push(
        [x + z * num, x + 1 + z * num, x + (z + 1) * num],
        [x + 1 + z * num, x + 1 + (z + 1) * num, x + (z + 1) * num]
      );
    }
  }

  return { vertices, indices, length: indices.length * 3 };
}
