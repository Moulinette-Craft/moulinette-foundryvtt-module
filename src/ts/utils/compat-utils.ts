import { AnyDict } from "../types";

export default class MouCompatUtils {

  /**
   * V12- : renderTemplate
   * V13+ : foundry.applications.handlebars.renderTemplate
   */
  static async renderTemplate(path: string, data: AnyDict) : Promise<any> {
    if((foundry as any).applications?.handlebars?.renderTemplate) {
      return await (foundry as any).applications.handlebars.renderTemplate(path, data);
    } else {
      return await renderTemplate(path, data);
    }
  }
}