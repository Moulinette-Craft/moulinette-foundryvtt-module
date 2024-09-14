import { MODULE_ID } from "../constants";

export class MoulinetteProgress extends Application {

  private html?: JQuery<HTMLElement>
  private progress: number;
  private description: string;

  // for some unknown reason, doesn't work if not static
  private static interrupted = false;

  constructor(title: string) {
    super({ title: title })
    this.progress = 0
    this.description = ""
    MoulinetteProgress.interrupted = false;
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
   * Returns true if progress was closed by user
   */
  wasCancelled(): boolean {
    return MoulinetteProgress.interrupted;
  }

  /**
   * Update progress bar
   * @param {0-100} progress value (pourcentage)
   */
  setProgress(progress: number, description?: string) {
    if(MoulinetteProgress.interrupted) throw new Error("Interrupted!")
    progress = Math.round(progress)
    // close window if progress is 100%
    if(progress == 100) {
      setTimeout(() => this.close(), 1000);
    }
    if(!this.html) return
    // don't update if not necessary
    if(progress >= 0 && progress <= 100) {
      if(progress != this.progress) {
        this.progress = progress
        const progressDiv = this.html.find(".progress")
        progressDiv.css("width", `${progress}%`)
        progressDiv.text(`${progress}%`)
      }
    }
    if(description && description != this.description) {
      this.html.find(".description").text(description)
    } 
  }

  override async close(options?: Application.CloseOptions): Promise<void> {
    MoulinetteProgress.interrupted = true
    super.close(options)
  }

}
