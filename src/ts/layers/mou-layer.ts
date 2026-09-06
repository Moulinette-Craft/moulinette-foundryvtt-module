export default class MouLayer extends CanvasLayer {

  override name = "MouLayer";

  override async _draw(_options: unknown): Promise<void> {}

  override async draw() {
    await super.draw();
    return this;
  }

  activate(): this {
    return this;
  }
}