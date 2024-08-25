import { DISCORD_CLIENT_ID, MODULE_ID, MOU_SERVER_URL, PATREON_CLIENT_ID, SETTINGS_SESSION_ID } from "../constants";
import MouApplication from "./application";

export default class MouUser extends MouApplication {
  
  override APP_NAME = "MouUser"
  static TIMER_DURATION = 120;  // authentication workflow max duration
  static TIMER_CHECK_EVERY = 2; // interval (in seconds) for checking if user completed the authentication

  private html?: JQuery<HTMLElement>;
  private timerSecondsLeft = 0;
  private timer?: NodeJS.Timer;

  private forceRefresh = false

  override get title(): string {
    return (game as Game).i18n.localize("MOU.user");
  }

  static override get defaultOptions(): ApplicationOptions {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "mou-user",
      classes: ["mou"],
      template: `modules/${MODULE_ID}/templates/user.hbs`,
      width: 600,
      height: "auto",
      closeOnSubmit: false,
      submitOnClose: false
    }) as ApplicationOptions;
  }

  _resetTimer() {
    if(this.timer) {
      this.logInfo(`Timer reset with ${this.timerSecondsLeft} seconds left.`)
      clearInterval(this.timer);
      this.timerSecondsLeft = 0
    }
  }

  override async close(options?: Application.CloseOptions): Promise<void> {
    this._resetTimer()
    super.close(options)
  }

  override async getData() {
    this._resetTimer()
    const user = await this.getModule().cloudclient.getUser(true, this.forceRefresh)
    const data = { 
      refreshed: this.forceRefresh,
      user: user 
    }
    this.forceRefresh = false
    return data
  }

  override activateListeners(html: JQuery<HTMLElement>): void {
    super.activateListeners(html);
    this.html = html
    
    // buttons
    this.html.find("button").on("click", this._onClickButton.bind(this))

    // make sure window is on top of others
    this.bringToTop()
  }

  /**
   * User clicked on button (or ENTER on search)
   */
  async _onClickButton(event: Event): Promise<void> {
    event.preventDefault();
    if(!event.currentTarget) return
    const source = $(event.currentTarget)
    if(source.hasClass("refresh")) {
      this.html?.find(".login button").prop('disabled', true);
      this.forceRefresh = true
      this.render()
    } 
    else if(source.hasClass("loginPatreon") || source.hasClass("loginDiscord")) {      
      let authURL = "";
      let authSource = "";
      const newGUID = foundry.utils.randomID(26)
      if(source.hasClass("loginPatreon")) {
        authURL = `https://www.patreon.com/oauth2/authorize?response_type=code&client_id=${PATREON_CLIENT_ID}&redirect_uri=${MOU_SERVER_URL}/patreon/callback&scope=identity identity.memberships&state=${newGUID}`
        authSource = "patreon"
      } else if(source.hasClass("loginDiscord")) {
        authURL = `https://discord.com/oauth2/authorize?response_type=code&client_id=${DISCORD_CLIENT_ID}&scope=identify guilds guilds.members.read&redirect_uri=${MOU_SERVER_URL}/discord/callback&state=${newGUID}`
        authSource = "discord"
      }
      this.logInfo(`Signing in with ${authSource?.capitalize()}...`)
      
      //game.moulinette.cache.clear()

      await MouApplication.setSettings(SETTINGS_SESSION_ID, newGUID)
      window.open(authURL, '_blank');

      this.html?.find(".login").hide()
      this.html?.find(".loginPatreon").prop('disabled', true);
      this.html?.find(".loginDiscord").prop('disabled', true);
      this.html?.find(".mou-alert-warning").hide()
      this.html?.find(".mou-alert-info").show()
      this.autoResize()

      const parent = this
      this.timerSecondsLeft = MouUser.TIMER_DURATION
      this.timer = setInterval(async function(){
        const progress = parent.html?.find(".timer")

        parent.timerSecondsLeft -= MouUser.TIMER_CHECK_EVERY;
        progress?.html(String(parent.timerSecondsLeft))

        if(parent.timerSecondsLeft <= 0 || await parent.getModule().cloudclient.isUserAuthenticated(newGUID, authSource)) {
          parent._resetTimer()
          parent.render()
        }

      }, MouUser.TIMER_CHECK_EVERY * 1000);

    }
    else if(source.hasClass("logout")) {
      this.logInfo("Signing out...")
      await MouApplication.setSettings(SETTINGS_SESSION_ID, "anonymous")
      this.getModule().cache.clearCache()
      this.render()
    }
    else if(source.hasClass("gift")) {
      //new MoulinettePatreonGift(this).render(true)
    }
  }
  
}
  
