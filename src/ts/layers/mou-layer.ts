
export default class MouLayer extends ControlsLayer {

  override name = "MouLayer";

  static override get layerOptions() {
    return foundry.utils.mergeObject(super.layerOptions, {
      name: "moulayer"
    });
  }

  override activate() {
    return super.activate();
  }

  _onClickLeft(event: any) {
    
    const t = this.worldTransform;
    // @ts-ignore
    const tx = (event.data.originalEvent.clientX - t.tx) / canvas.stage.scale.x;
    // @ts-ignore
    const ty = (event.data.originalEvent.clientY - t.ty) / canvas.stage.scale.y;
    let coords = [tx, ty];
    // @ts-ignore
    coords = canvas.grid.getCenter(tx, ty);
    console.log(coords)
  }
}