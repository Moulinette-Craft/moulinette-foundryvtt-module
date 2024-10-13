import MouConfig, { MODULE_ID } from "../constants";
import MouApplication from "./application";

/**
 * This class server allow Moulinette Application to be independant from FVTT
 */
export default class MouPreview extends MouApplication {
 
  override APP_NAME = "MouPreview";
  private assetURL: string;
  private animated: boolean;

  constructor(assetURL: string) {
    super();
    this.assetURL = assetURL;
    const ext = assetURL.split("?")[0].split('.').pop() || "";
    this.animated = MouConfig.MEDIA_VIDEOS.includes(ext);
  }

  static override get defaultOptions(): ApplicationOptions {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "mou-preview",
      classes: ["mou"],
      template: `modules/${MODULE_ID}/templates/preview.hbs`,
      width: "auto",
      height: "auto",
      resizable: true
    }) as ApplicationOptions;
  }

  override async getData() {
    
    return {
      animated: this.animated,
      asset: this.assetURL
    };
  }

  override activateListeners(html: JQuery<HTMLElement>): void {
    super.activateListeners(html);
    const parent = this;
    html.find(".previewImg").one("load", function() {
      parent.autoResize();
    }).each(function() {
      // required for cached images
      if((this as HTMLImageElement).complete) {
        $(this).trigger('load');
      }
    });
    html.find(".previewVideo").one("playing", function() {
      parent.autoResize();
    })
  }
}