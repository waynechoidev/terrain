import { Vertex } from "@/engine/utils";
import { vec2, vec3 } from "gl-matrix";

export default function Surface(num: number) {
  const vertices: Vertex[] = [];
  const indices: [number, number, number][] = [];

  for (let x = 0; x < num; x++) {
    for (let y = 0; y < num; y++) {
      vertices.push({
        // Scale to -1 ~ 1 by multiplying by 2 and subtracting 1
        position: vec3.fromValues(
          (x / (num - 1)) * 2 - 1,
          (y / (num - 1)) * 2 - 1,
          0
        ),
        texCoord: vec2.fromValues(x / (num - 1), y / (num - 1)), // texCoord remains in 0~1
      });
    }
  }

  for (let x = 0; x < num - 1; x++) {
    for (let y = 0; y < num - 1; y++) {
      indices.push(
        [x + y * num, x + (y + 1) * num, x + 1 + y * num],
        [x + (y + 1) * num, x + 1 + (y + 1) * num, x + 1 + y * num]
      );
    }
  }

  return { vertices, indices, length: indices.length * 3 };
}
