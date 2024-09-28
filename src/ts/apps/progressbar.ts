import { MODULE_ID } from "../constants";

export class MoulinetteProgress extends Application {

  private html?: JQuery<HTMLElement>
  private progress: number;
  private description: string;

  // for some unknown reason, doesn't work if not static
  private static interrupted = false;

  constructor(title: string, progress?: number, description?: string) {
    super({ title: title })
    this.progress = progress ? progress : 0
    this.description = description ? description : ""
    MoulinetteProgress.interrupted = false;
  }

  static override get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "mou-progress",
      classes: ["mou"],
      title: (game as Game).i18n.localize("MOU.progressbar"),
      template: `modules/${MODULE_ID}/templates/progressbar.hbs`,
      width: 600,
      height: 90
    });
  }

  override async getData() {
    return {
      progress: this.progress,
      description: this.description
    };
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
    if(MoulinetteProgress.interrupted) throw new Error(`Interrupted! ${this.progress}%`)
    progress = Math.round(progress)
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
    if(this.progress < 100) {
      MoulinetteProgress.interrupted = true
    }
    
    await super.close(options)
  }

}
