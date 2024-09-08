import { MODULE_ID } from "../constants";

export class MoulinetteProgress extends Application {

  private html?: JQuery<HTMLElement>

  constructor(title: string) {
    super({ title: title })
  }

  static override get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "mou-progress",
      classes: ["mou"],
      title: (game as Game).i18n.localize("MOU.progressbar"),
      template: `modules/${MODULE_ID}/templates/progressbar.hbs`,
      width: 500,
      height: 90
    });
  }

  override activateListeners(html: JQuery<HTMLElement>) {
    super.activateListeners(html);
    this.html = html
  }

  /**
   * Update progress bar
   * @param {0-100} progress value (pourcentage)
   */
  setProgress(progress: number, description: string) {
    progress = Math.round(progress)
    // close window if progress is 100%
    if(progress == 100) {
      setTimeout(() => this.close(), 1000);
    }
    if(!this.html) return
    if(progress >= 0 && progress <= 100) {
      const progressDiv = this.html.find(".progress")
      progressDiv.css("width", `${progress}%`)
      progressDiv.text(`${progress}%`)
    }
    if(description) {
      this.html.find(".description").text(description)
    }
  }

}
