import MouConfig, { MODULE_ID } from "../constants";
import { AnyDict } from "../types";
import MouApplication from "./application";

/**
 * This class server allow Moulinette Application to be independant from FVTT
 */
export default class MouPreview extends MouApplication {

  override APP_NAME = "MouPreview";
  private assetURL: string;
  private animated: boolean;

  static DEFAULT_OPTIONS = {
    id: "mou-preview",
    classes: ["mou"],
    window: {
      resizable: true
    },
    position: {
      width: "auto",
      height: "auto"
    }
  }

  static PARTS = {
    content: { template: `modules/${MODULE_ID}/templates/preview.hbs` }
  }

  constructor(assetURL: string) {
    super();
    this.assetURL = assetURL;
    const ext = assetURL.split("?")[0].split('.').pop() || "";
    this.animated = MouConfig.MEDIA_VIDEOS.includes(ext);
  }

  async _prepareContext(_options: AnyDict) {
    return {
      animated: this.animated,
      asset: this.assetURL
    };
  }

  /**
   * V2: activateListeners(html) is replaced by _onRender(context, options).
   */
  async _onRender(context: AnyDict, options: AnyDict) {
    await super._onRender(context, options)
    const html = $((this as AnyDict).element as HTMLElement)
    const parent = this
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

    // close on click
    html.find(".previewImg").on("mousedown", () => parent.close());
    html.find(".previewVideo").on("mousedown", () => parent.close());
  }
}
