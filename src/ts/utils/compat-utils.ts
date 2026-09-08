import { AnyDict } from "../types";

export default class MouCompatUtils {

  /**
   * Wrapper around foundry.applications.handlebars.renderTemplate
   */
  static async renderTemplate(path: string, data: AnyDict) : Promise<any> {
    return await (foundry as any).applications.handlebars.renderTemplate(path, data);
  }
}
