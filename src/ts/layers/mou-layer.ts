
export default class MouLayer extends ControlsLayer {

  static override get layerOptions() {
    return foundry.utils.mergeObject(super.layerOptions, {
      name: "moulayer"
    });
  }

  override activate() {
    return super.activate();
  }
}