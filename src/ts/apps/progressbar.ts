import { MODULE_ID } from "../constants";
import { AnyDict } from "../types";
import MouApplication from "./application";

export class MoulinetteProgress extends MouApplication {

  private html?: JQuery<HTMLElement>
  private progress: number;
  private description: string;

  // for some unknown reason, doesn't work if not static
  private static interrupted = false;

  static DEFAULT_OPTIONS = {
    id: "mou-progress",
    classes: ["mou"],
    window: {
      title: "MOU.progressbar"
    },
    position: {
      width: 600,
      height: 90
    }
  }

  static PARTS = {
    content: { template: `modules/${MODULE_ID}/templates/progressbar.hbs` }
  }

  constructor(title: string, progress?: number, description?: string) {
    super({ window: { title } } as AnyDict);
    this.progress = progress ? progress : 0
    this.description = description ? description : ""
    MoulinetteProgress.interrupted = false;
  }

  async _prepareContext(_options: AnyDict) {
    return {
      progress: this.progress,
      description: this.description
    };
  }

  /**
   * V2: activateListeners(html) is replaced by _onRender(context, options).
   */
  async _onRender(context: AnyDict, options: AnyDict) {
    await super._onRender(context, options)
    this.html = $((this as AnyDict).element as HTMLElement)
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

  async close(options?: AnyDict): Promise<void> {
    if(this.progress < 100) {
      MoulinetteProgress.interrupted = true
    }

    await super.close(options)
  }

}
