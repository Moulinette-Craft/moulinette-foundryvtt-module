// Do not remove this import. If you do Vite will think your styles are dead
// code and not include them in the build output.
import "../styles/style.scss";
//import "../templates/browser.hbs";

import MouBrowser from "./apps/browser";
import { moduleId } from "./constants";
import { MouModule } from "./types";

let module: MouModule;

Hooks.once("init", () => {
  console.log(`Initializing ${moduleId}`);

  module = (game as Game).modules.get(moduleId) as MouModule;
  module.browser = new MouBrowser();
});

Hooks.on("renderActorDirectory", (_: Application, html: JQuery) => {
  const button = $(
    `<button class="cc-sidebar-button" type="button">🐶</button>`
  );
  button.on("click", () => {
    module.browser.render(true);
  });
  html.find(".directory-header .action-buttons").append(button);
});
