const { ipcRenderer: ipc, remote, shell } = require("electron");

const {
  CARD_TILE_ARENA,
  CARD_TILE_FLAT,
  OVERLAY_FULL,
  OVERLAY_LEFT,
  OVERLAY_ODDS,
  OVERLAY_SEEN,
  OVERLAY_DRAFT,
  OVERLAY_LOG,
  COLORS_ALL
} = require("../shared/constants");
const db = require("../shared/database");
const pd = require("../shared/player-data");
const {
  createDiv,
  createImg,
  createInput,
  createLabel,
  queryElements: $$
} = require("../shared/dom-fns");
const deckDrawer = require("../shared/deck-drawer");
const { createSelect } = require("../shared/select");
const { get_card_image } = require("../shared/util");
const byId = id => document.getElementById(id);

const {
  addCheckbox,
  changeBackground,
  hideLoadingBars,
  ipcSend,
  resetMainContainer,
  setLocalState,
  showColorpicker
} = require("./renderer-util");

let lastSettingsSection = 1;
let updateState = "";

function getCardStyleName(style) {
  if (style == CARD_TILE_FLAT) return "Flat";
  return "Arena";
}

let currentOverlay = 0;

//
function openSettingsTab(openSection = lastSettingsSection, scrollTop = 0) {
  if (openSection !== -1) {
    lastSettingsSection = openSection;
  } else {
    openSection = lastSettingsSection;
  }
  changeBackground("default");
  hideLoadingBars();
  const mainDiv = resetMainContainer();
  mainDiv.classList.add("flex_item");

  const wrap_l = createDiv(["wrapper_column", "sidebar_column_r"]);

  wrap_l.appendChild(createDiv(["list_fill"]));
  wrap_l.appendChild(createDiv(["settings_nav", "sn1"], "Behaviour"));
  wrap_l.appendChild(createDiv(["settings_nav", "sn2"], "Overlay"));
  wrap_l.appendChild(createDiv(["settings_nav", "sn3"], "Visual"));
  wrap_l.appendChild(createDiv(["settings_nav", "sn4"], "Privacy"));
  wrap_l.appendChild(createDiv(["settings_nav", "sn5"], "About"));
  wrap_l.appendChild(
    createDiv(["settings_nav", "sn6"], pd.offline ? "Login" : "Logout")
  );
  mainDiv.appendChild(wrap_l);
  $$(".sn" + openSection)[0].classList.add("nav_selected");
  $$(".settings_nav").forEach(el =>
    el.addEventListener("click", function() {
      const classList = [...this.classList];
      if (classList.includes("nav_selected")) return;

      $$(".settings_nav").forEach(el => {
        el.classList.remove("nav_selected");
      });
      $$(".settings_section").forEach(el => {
        el.style.display = "none";
      });

      if (classList.includes("sn1")) {
        lastSettingsSection = 1;
        $$(".ss1")[0].style.display = "block";
      } else if (classList.includes("sn2")) {
        lastSettingsSection = 2;
        $$(".ss2")[0].style.display = "block";
      } else if (classList.includes("sn3")) {
        lastSettingsSection = 3;
        $$(".ss3")[0].style.display = "block";
      } else if (classList.includes("sn4")) {
        lastSettingsSection = 4;
        $$(".ss4")[0].style.display = "block";
      } else if (classList.includes("sn5")) {
        lastSettingsSection = 5;
        $$(".ss5")[0].style.display = "block";
      } else if (classList.includes("sn6")) {
        lastSettingsSection = 6;
        $$(".ss6")[0].style.display = "block";
      }
      this.classList.add("nav_selected");
    })
  );

  const wrap_r = createDiv(["wrapper_column"]);

  const div = createDiv(["settings_page"]);
  let section;

  // BEHAVIOR
  section = createDiv(["settings_section", "ss1"]);
  appendBehaviour(section);
  div.appendChild(section);

  // OVERLAY
  section = createDiv(["settings_section", "ss2"]);
  appendOverlay(section);
  div.appendChild(section);

  // VISUAL
  section = createDiv(["settings_section", "ss3"]);
  appendVisual(section);
  div.appendChild(section);

  // PRIVACY
  section = createDiv(["settings_section", "ss4"]);
  appendPrivacy(section);
  div.appendChild(section);

  // ABOUT
  section = createDiv(["settings_section", "ss5"]);
  section.style.height = "100%";
  appendAbout(section);
  div.appendChild(section);

  // LOGIN
  section = createDiv(["settings_section", "ss6"]);
  section.style.height = "100%";
  appendLogin(section);
  div.appendChild(section);

  wrap_r.appendChild(div);
  wrap_r.addEventListener("scroll", () => {
    setLocalState({ lastScrollTop: wrap_r.scrollTop });
  });
  mainDiv.appendChild(wrap_r);
  $$(".ss" + openSection)[0].style.display = "block";
  if (scrollTop) {
    wrap_r.scrollTop = scrollTop;
  }
}

function appendBehaviour(section) {
  section.appendChild(createDiv(["settings_title"], "Behaviour"));

  addCheckbox(
    section,
    "Beta updates channel",
    "settings_betachannel",
    pd.settings.beta_channel,
    updateAppSettings
  );
  addCheckbox(
    section,
    "Login automatically",
    "settings_autologin",
    pd.settings.auto_login,
    updateAppSettings
  );
  addCheckbox(
    section,
    "Launch to tray",
    "settings_launchtotray",
    pd.settings.launch_to_tray,
    updateAppSettings
  );
  addCheckbox(
    section,
    "Launch on startup",
    "settings_startup",
    pd.settings.startup,
    updateUserSettings
  );
  addCheckbox(
    section,
    "Read log on login",
    "settings_readlogonlogin",
    !pd.settings.skip_firstpass,
    updateUserSettings
  );
  const helpDiv = createDiv(
    ["settings_note"],
    `<i>Reading the log on startup can take a while, disabling this will make
    mtgatool load instantly, but you may have have to play with Arena to load
    some data, like Rank, wildcards and decklists.
    <b>This feature makes mtgatool read games when it was closed.</b></i>`
  );
  section.appendChild(helpDiv);

  addCheckbox(
    section,
    "Close main window on match found",
    "settings_closeonmatch",
    pd.settings.close_on_match,
    updateUserSettings
  );
  addCheckbox(
    section,
    "Close to tray",
    "settings_closetotray",
    pd.settings.close_to_tray,
    updateUserSettings
  );
  addCheckbox(
    section,
    "Sound when priority changes",
    "settings_soundpriority",
    pd.settings.sound_priority,
    updateUserSettings
  );

  const sliderSoundVolume = createDiv(["slidecontainer_settings"]);
  const sliderSoundVolumeLabel = createLabel(
    [],
    "Volume: " + Math.round(pd.settings.sound_priority_volume * 100) + "%"
  );
  sliderSoundVolumeLabel.style.width = "400px";
  sliderSoundVolume.appendChild(sliderSoundVolumeLabel);

  const sliderSoundVolumeInput = createInput(
    ["slider", "sliderSoundVolume"],
    "",
    {
      id: "settings_soundpriorityvolume",
      type: "range",
      min: "0",
      max: "1",
      step: ".001",
      value: pd.settings.sound_priority_volume
    }
  );
  sliderSoundVolumeInput.addEventListener("input", function() {
    const volume = Math.round(this.value * 100);
    sliderSoundVolumeLabel.innerHTML = "Volume: " + volume + "%";
  });
  sliderSoundVolumeInput.addEventListener("change", function() {
    let { Howl, Howler } = require("howler");
    let sound = new Howl({ src: ["../sounds/blip.mp3"] });
    Howler.volume(this.value);
    sound.play();
    updateUserSettingsBlend({
      sound_priority_volume: this.value
    });
  });
  sliderSoundVolume.appendChild(sliderSoundVolumeInput);
  section.appendChild(sliderSoundVolume);

  const label = createLabel(["but_container_label"], "Export Format:");
  const icd = createDiv(["input_container"]);
  const exportInput = createInput([], "", {
    type: "text",
    id: "settings_export_format",
    autocomplete: "off",
    placeholder: "$Name,$Count,$SetName,$SetCode,$Rarity,$Type",
    value: pd.settings.export_format
  });
  exportInput.addEventListener("keyup", e => {
    if (e.keyCode === 13) {
      updateUserSettings();
    }
  });
  exportInput.addEventListener("focusout", () => {
    updateUserSettings();
  });
  icd.appendChild(exportInput);
  label.appendChild(icd);
  section.appendChild(label);

  const textDiv = createDiv(
    ["settings_note"],
    "<i>Possible variables: $Name, $Count, $SetName, $SetCode, $Collector, $Rarity, $Type, $Cmc</i>"
  );
  section.appendChild(textDiv);
}

function appendOverlay(section) {
  section.appendChild(createDiv(["settings_title"], "Overlays"));
  const helpDiv = createDiv(
    ["settings_note"],
    `You can have up to 5 overlay windows active, and each window has its own settings.
<br> Draft overlay will only show in a draft, while the others will work during any match.`
  );
  helpDiv.style.margin = "0px 64px 0px 16px";
  section.appendChild(helpDiv);

  const topCont = createDiv(["overlay_section_selector_cont"]);
  const updateContent = () => {
    $$(".overlay_section").forEach(el => (el.style.display = "none"));
    $$(".overlay_section_" + currentOverlay)[0].style.display = "block";
    $$(".overlay_current")[0].innerHTML =
      "Current overlay settings: " + (currentOverlay + 1);
    $$(".overlay_icon")[0].style.backgroundColor = `var(--color-${
      COLORS_ALL[currentOverlay]
    })`;
  };

  const topPrev = createDiv(["overlay_prev"]);
  topPrev.addEventListener("click", () => {
    currentOverlay -= 1;
    if (currentOverlay < 0) {
      currentOverlay = pd.settings.overlays.length - 1;
    }
    updateContent();
  });
  topCont.appendChild(topPrev);

  const topIcon = createDiv(["overlay_icon"]);
  topIcon.style.backgroundColor = `var(--color-${COLORS_ALL[currentOverlay]})`;
  topCont.appendChild(topIcon);
  const topIndex = createDiv(
    ["overlay_current"],
    `Current overlay settings: ${currentOverlay + 1}`
  );
  topCont.appendChild(topIndex);

  const topNext = createDiv(["overlay_next"]);
  topNext.addEventListener("click", () => {
    currentOverlay += 1;
    if (currentOverlay >= pd.settings.overlays.length) {
      currentOverlay = 0;
    }
    updateContent();
  });
  topCont.appendChild(topNext);

  section.appendChild(topCont);

  pd.settings.overlays.forEach((settings, index) => {
    const overlaySection = createDiv([
      "overlay_section",
      "overlay_section_" + index
    ]);

    if (currentOverlay !== index) {
      overlaySection.style.display = "none";
    }

    const label = createLabel(["but_container_label"], "Mode:");

    const modeOptions = [];
    modeOptions[OVERLAY_FULL] = "Full Deck";
    modeOptions[OVERLAY_LEFT] = "Cards Left";
    modeOptions[OVERLAY_ODDS] = "Cards Odds";
    modeOptions[OVERLAY_SEEN] = "Cards Seen";
    modeOptions[OVERLAY_DRAFT] = "Draft";
    modeOptions[OVERLAY_LOG] = "Action Log";

    const modeSelect = createSelect(
      label,
      modeOptions,
      modeOptions[settings.mode],
      filter => {
        pd.settings.overlays[index].mode = modeOptions.indexOf(filter);
        updateUserSettingsBlend();
      },
      `overlay_${index}_mode`
    );
    modeSelect.style.width = "180px";
    modeSelect.style.marginLeft = "32px";
    overlaySection.appendChild(label);

    addCheckbox(
      overlaySection,
      "Always on top",
      `overlay_${index}_ontop`,
      settings.ontop,
      updateUserSettings
    );
    addCheckbox(
      overlaySection,
      "Show overlay",
      `overlay_${index}_show`,
      settings.show,
      updateUserSettings
    );
    addCheckbox(
      overlaySection,
      "Persistent overlay&nbsp;<i>(useful for OBS setup)</i>",
      `overlay_${index}_show_always`,
      settings.show_always,
      updateUserSettings
    );
    addCheckbox(
      overlaySection,
      `Enable Alt+${index + 1} keyboard shortcut`,
      `overlay_${index}_keyboard_shortcut`,
      settings.keyboard_shortcut,
      updateUserSettings
    );
    addCheckbox(
      overlaySection,
      "Show top bar",
      `overlay_${index}_top`,
      settings.top,
      updateUserSettings
    );
    addCheckbox(
      overlaySection,
      "Show title",
      `overlay_${index}_title`,
      settings.title,
      updateUserSettings
    );
    addCheckbox(
      overlaySection,
      "Show deck/lists",
      `overlay_${index}_deck`,
      settings.deck,
      updateUserSettings
    );
    addCheckbox(
      overlaySection,
      "Show clock",
      `overlay_${index}_clock`,
      settings.clock,
      updateUserSettings
    );
    addCheckbox(
      overlaySection,
      "Show sideboard",
      `overlay_${index}_sideboard`,
      settings.sideboard,
      updateUserSettings
    );
    addCheckbox(
      overlaySection,
      "Compact lands",
      `overlay_${index}_lands`,
      settings.lands,
      updateUserSettings
    );

    const sliderOpacity = createDiv(["slidecontainer_settings"]);
    const sliderOpacityLabel = createLabel(
      ["card_size_container"],
      "Elements transparency: " + transparencyFromAlpha(settings.alpha) + "%"
    );
    sliderOpacityLabel.style.width = "400px";
    sliderOpacity.appendChild(sliderOpacityLabel);

    const sliderOpacityInput = createInput(["slider"], "", {
      id: "opacityRange" + index,
      type: "range",
      min: "0",
      max: "100",
      step: "5",
      value: transparencyFromAlpha(settings.alpha)
    });
    sliderOpacityInput.addEventListener("input", function() {
      const overlayAlpha = alphaFromTransparency(parseInt(this.value));
      sliderOpacityLabel.innerHTML =
        "Elements transparency: " + transparencyFromAlpha(overlayAlpha) + "%";
    });
    sliderOpacityInput.addEventListener("change", function() {
      pd.settings.overlays[index].alpha = alphaFromTransparency(
        parseInt(this.value)
      );
      updateUserSettingsBlend();
    });
    sliderOpacity.appendChild(sliderOpacityInput);
    overlaySection.appendChild(sliderOpacity);

    const sliderOpacityBack = createDiv(["slidecontainer_settings"]);
    const sliderOpacityBackLabel = createLabel(
      ["card_size_container"],
      "Background transparency: " +
        transparencyFromAlpha(settings.alpha_back) +
        "%"
    );
    sliderOpacityBackLabel.style.width = "400px";
    sliderOpacityBack.appendChild(sliderOpacityBackLabel);

    const sliderOpacityBackInput = createInput(["slider"], "", {
      id: "opacityBackRange",
      type: "range",
      min: "0",
      max: "100",
      step: "5",
      value: transparencyFromAlpha(settings.alpha_back)
    });
    sliderOpacityBackInput.addEventListener("input", function() {
      const overlayAlphaBack = alphaFromTransparency(parseInt(this.value));
      sliderOpacityBackLabel.innerHTML =
        "Background transparency: " +
        transparencyFromAlpha(overlayAlphaBack) +
        "%";
    });
    sliderOpacityBackInput.addEventListener("change", function() {
      pd.settings.overlays[index].alpha_back = alphaFromTransparency(
        parseInt(this.value)
      );
      updateUserSettingsBlend();
    });
    sliderOpacityBack.appendChild(sliderOpacityBackInput);
    overlaySection.appendChild(sliderOpacityBack);

    const sliderScale = createDiv(["slidecontainer_settings"]);
    const sliderScaleLabel = createLabel(
      ["card_size_container"],
      "Scale: " + settings.scale + "%"
    );
    sliderScaleLabel.style.width = "400px";
    sliderScale.appendChild(sliderScaleLabel);

    const sliderScaleInput = createInput(["slider"], "", {
      id: "scaleRange",
      type: "range",
      min: "10",
      max: "200",
      step: "10",
      value: settings.scale
    });
    sliderScaleInput.addEventListener("input", function() {
      sliderScaleLabel.innerHTML = "Scale: " + parseInt(this.value) + "%";
    });
    sliderScaleInput.addEventListener("change", function() {
      pd.settings.overlays[index].scale = parseInt(this.value);
      updateUserSettingsBlend();
    });
    sliderScale.appendChild(sliderScaleInput);
    overlaySection.appendChild(sliderScale);

    const resetButton = createDiv(
      ["button_simple", "centered"],
      "Reset Position"
    );
    resetButton.addEventListener("click", function() {
      ipcSend("reset_overlay_pos", index);
    });
    overlaySection.appendChild(resetButton);

    section.appendChild(overlaySection);
  });
}

function appendVisual(section) {
  let label;
  section.appendChild(createDiv(["settings_title"], "Visual"));

  label = createLabel(["but_container_label"], "Background URL:");
  const icd = createDiv(["input_container"]);
  const urlInput = createInput([], "", {
    type: "url",
    id: "query_image",
    autocomplete: "off",
    placeholder: "https://example.com/photo.png",
    value: pd.settings.back_url !== "default" ? pd.settings.back_url : ""
  });
  urlInput.addEventListener("keyup", e => {
    if (e.keyCode === 13) {
      updateUserSettings();
    }
  });
  urlInput.addEventListener("focusout", () => updateUserSettings());
  icd.appendChild(urlInput);
  label.appendChild(icd);
  section.appendChild(label);

  label = createLabel(
    ["but_container_label"],
    "<span style='margin-right: 32px;'>Background shade:</span>"
  );
  const colorPick = createInput(["color_picker"], "", {
    id: "flat",
    type: "text",
    value: "Example Content"
  });
  colorPick.style.backgroundColor = pd.settings.back_color;
  colorPick.addEventListener("click", function(e) {
    e.stopPropagation();
    showColorpicker(
      pd.settings.back_color,
      color => (colorPick.style.backgroundColor = color.rgbaString),
      color => updateUserSettingsBlend({ back_color: color.rgbaString }),
      () => (colorPick.style.backgroundColor = pd.settings.back_color),
      { alpha: true }
    );
  });
  label.appendChild(colorPick);
  section.appendChild(label);

  label = createLabel(["but_container_label"], "List style:");
  const tagStyleSelect = createSelect(
    label,
    [CARD_TILE_ARENA, CARD_TILE_FLAT],
    pd.settings.card_tile_style,
    filter => updateUserSettingsBlend({ card_tile_style: filter }),
    "settings_cards_style",
    getCardStyleName
  );
  tagStyleSelect.style.width = "180px";
  tagStyleSelect.style.marginLeft = "32px";
  const tile = deckDrawer.cardTile(pd.settings.card_tile_style, 67518, "a", 4);
  tile.style.width = "auto";
  label.appendChild(tile);
  section.appendChild(label);

  label = createLabel(["but_container_label"], "Image quality:");
  const tagSelect = createSelect(
    label,
    ["small", "normal", "large"],
    pd.settings.cards_quality,
    filter => updateUserSettingsBlend({ cards_quality: filter }),
    "settings_cards_quality"
  );
  tagSelect.style.width = "180px";
  tagSelect.style.marginLeft = "32px";
  section.appendChild(label);

  const slider = createDiv(["slidecontainer_settings"]);
  slider.style.marginTop = "20px";
  const sliderlabel = createLabel(
    ["card_size_container", "card_size_label"],
    "Card size: " + pd.cardsSize + "px"
  );
  sliderlabel.style.width = "180px";
  sliderlabel.style.margin = "0";
  sliderlabel.style.whiteSpace = "nowrap";

  slider.appendChild(sliderlabel);

  const sliderInput = createInput(["slider", "sliderA"], "", {
    type: "range",
    min: "0",
    max: "20",
    value: pd.settings.cards_size,
    id: "myRange"
  });
  sliderInput.addEventListener("input", function() {
    const cardSize = 100 + Math.round(parseInt(this.value)) * 10;
    $$(".card_size_label")[0].innerHTML = "Card size: " + cardSize + "px";
    $$(".inventory_card_settings")[0].style.width = cardSize + "px";
    $$(".inventory_card_settings_img")[0].style.width = cardSize + "px";
  });
  sliderInput.addEventListener("change", function() {
    updateUserSettingsBlend({ cards_size: Math.round(parseInt(this.value)) });
  });
  slider.appendChild(sliderInput);
  section.appendChild(slider);

  label = createLabel(["but_container_label"], "Example card:");
  const d = createDiv(["inventory_card_settings"]);
  d.style.width = pd.cardsSize + "px";
  d.style.alignSelf = "flex-start";
  const img = createImg(["inventory_card_settings_img"]);
  img.style.width = pd.cardsSize + "px";
  const card = db.card(67518);
  img.src = get_card_image(card);
  d.appendChild(img);
  label.appendChild(d);
  section.appendChild(label);
}

function appendPrivacy(section) {
  section.appendChild(createDiv(["settings_title"], "Privacy"));
  addCheckbox(
    section,
    "Anonymous sharing&nbsp;<i>(makes your username anonymous on Explore)</i>",
    "settings_anon_explore",
    pd.settings.anon_explore,
    updateUserSettings
  );
  addCheckbox(
    section,
    "Online sharing&nbsp;<i>(when disabled, blocks any connections with our servers)</i>",
    "settings_senddata",
    pd.settings.send_data,
    updateUserSettings
  );

  const label = createLabel(["check_container_but"]);
  const button = createDiv(
    ["button_simple", "button_long"],
    "Erase my shared data"
  );
  button.addEventListener("click", eraseData);
  label.appendChild(button);

  section.appendChild(label);
}

function appendAbout(section) {
  const about = createDiv(["about"]);

  const aboutLogo = createDiv(["top_logo_about"]);
  aboutLogo.addEventListener("click", () => {
    shell.openExternal("https://mtgatool.com");
  });
  about.appendChild(aboutLogo);
  about.appendChild(
    createDiv(["message_sub_15", "white"], "By Manuel Etchegaray, 2019")
  );
  const versionLink = createDiv(
    ["message_sub_15", "white", "release_notes_link"],
    "Version " + remote.app.getVersion()
  );
  versionLink.addEventListener("click", function() {
    shell.openExternal("https://mtgatool.com/release-notes/");
  });
  about.appendChild(versionLink);
  about.appendChild(createDiv(["message_updates", "green"], updateState + "."));
  const updateButton = createDiv(
    ["button_simple", "centered"],
    "Check for updates"
  );
  updateButton.addEventListener("click", () => ipcSend("updates_check", true));
  about.appendChild(updateButton);

  const linkDiv = createDiv(["flex_item"]);
  linkDiv.style.margin = "64px auto 0px auto";

  const discordLink = createDiv(["discord_link"]);
  discordLink.addEventListener("click", () => {
    shell.openExternal("https://discord.gg/K9bPkJy");
  });
  linkDiv.appendChild(discordLink);
  const twitterLink = createDiv(["twitter_link"]);
  twitterLink.addEventListener("click", () => {
    shell.openExternal("https://twitter.com/MEtchegaray7");
  });
  linkDiv.appendChild(twitterLink);
  const gitLink = createDiv(["git_link"]);
  gitLink.addEventListener("click", () => {
    shell.openExternal("https://github.com/Manuel-777/MTG-Arena-Tool");
  });

  linkDiv.appendChild(gitLink);
  about.appendChild(linkDiv);

  const supportDiv = createDiv(["message_sub_15", "white"], "Support my work!");
  supportDiv.style.margin = "24px 0 12px 0";
  about.appendChild(supportDiv);

  const donateLink = createDiv(
    ["donate_link"],
    '<img src="https://www.paypalobjects.com/webstatic/en_US/i/buttons/PP_logo_h_100x26.png" alt="PayPal" />'
  );
  donateLink.addEventListener("click", () => {
    shell.openExternal("https://www.paypal.me/ManuelEtchegaray/10");
  });
  about.appendChild(donateLink);

  section.appendChild(about);
}

function appendLogin(section) {
  const login = createDiv(["about"]);
  const loginButton = createDiv(
    ["button_simple", "centered"],
    pd.offline ? "Login" : "Logout"
  );
  loginButton.addEventListener("click", () => {
    const clearAppSettings = {
      remember_me: false,
      auto_login: false,
      launch_to_tray: false
    };
    ipcSend("save_app_settings", clearAppSettings);
    remote.app.relaunch();
    remote.app.exit(0);
  });
  login.appendChild(loginButton);
  section.appendChild(login);
}

//
function updateAppSettings() {
  const auto_login = byId("settings_autologin").checked;
  const launch_to_tray = byId("settings_launchtotray").checked;
  const beta_channel = byId("settings_betachannel").checked;
  const rSettings = {
    auto_login,
    launch_to_tray,
    beta_channel
  };
  ipcSend("save_app_settings", rSettings);
}

//
function alphaFromTransparency(transparency) {
  return 1 - transparency / 100;
}

//
function transparencyFromAlpha(alpha) {
  return Math.round((1 - alpha) * 100);
}

// only purpose is to strip paramaters for use with addCheckbox
function updateUserSettings() {
  updateUserSettingsBlend();
}

//
function updateUserSettingsBlend(_settings = {}) {
  const overlays = pd.settings.overlays.map((settings, index) => {
    return {
      ...settings,
      show: byId(`overlay_${index}_show`).checked,
      show_always: byId(`overlay_${index}_show_always`).checked,
      keyboard_shortcut: byId(`overlay_${index}_keyboard_shortcut`).checked,
      top: byId(`overlay_${index}_top`).checked,
      title: byId(`overlay_${index}_title`).checked,
      deck: byId(`overlay_${index}_deck`).checked,
      clock: byId(`overlay_${index}_clock`).checked,
      sideboard: byId(`overlay_${index}_sideboard`).checked,
      ontop: byId(`overlay_${index}_ontop`).checked,
      lands: byId(`overlay_${index}_lands`).checked
    };
  });

  ipcSend("save_user_settings", {
    anon_explore: byId("settings_anon_explore").checked,
    back_url: byId("query_image").value || "default",
    close_on_match: byId("settings_closeonmatch").checked,
    close_to_tray: byId("settings_closetotray").checked,
    export_format: byId("settings_export_format").value,
    send_data: byId("settings_senddata").checked,
    skip_firstpass: !byId("settings_readlogonlogin").checked,
    sound_priority: byId("settings_soundpriority").checked,
    startup: byId("settings_startup").checked,
    overlays,
    ..._settings
  });
}

//
ipc.on("set_update_state", function(event, arg) {
  updateState = arg;
});

//
function eraseData() {
  if (
    confirm(
      "This will erase all of your decks and events shared online, are you sure?"
    )
  ) {
    ipcSend("delete_data", true);
  } else {
    return;
  }
}

function setCurrentOverlaySettings(index) {
  currentOverlay = index;
}

module.exports = { setCurrentOverlaySettings, openSettingsTab };
