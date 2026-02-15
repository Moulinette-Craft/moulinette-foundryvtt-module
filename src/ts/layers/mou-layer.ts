export default class MouLayer extends CanvasLayer {

  override name = "MouLayer";

  _draw(): this {
    return this;
  }

  override async draw() {
    await super.draw();
    return this;
  }

  override activate(): this {
    return this;
  }
}