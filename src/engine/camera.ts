import { mat4, vec3 } from "gl-matrix";
export default class Camera {
  private _position: vec3;
  private _center: vec3;
  private _up: vec3;

  constructor({
    position,
    center,
    up,
  }: {
    position: vec3;
    center: vec3;
    up: vec3;
  }) {
    this._position = position;
    this._center = center;
    this._up = up;
  }

  public getViewMatrix() {
    const view = mat4.create();

    mat4.lookAt(view, this._position, this._center, this._up);

    return view;
  }
}
