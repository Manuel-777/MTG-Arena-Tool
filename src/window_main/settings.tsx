import _ from "lodash";
import React from "react";
import db from "../shared/database";
import pd from "../shared/player-data";
import {
  changeBackground,
  hideLoadingBars,
  resetMainContainer
} from "./renderer-util";

import {
  CARD_TILE_ARENA,
  CARD_TILE_FLAT,
  COLORS_ALL,
  OVERLAY_FULL,
  OVERLAY_LEFT,
  OVERLAY_ODDS,
  OVERLAY_MIXED,
  OVERLAY_SEEN,
  OVERLAY_DRAFT,
  OVERLAY_DRAFT_BREW,
  OVERLAY_LOG,
  OVERLAY_DRAFT_MODES,
  SHORTCUT_NAMES,
  SETTINGS_BEHAVIOUR,
  SETTINGS_ARENA_DATA,
  SETTINGS_OVERLAY,
  SETTINGS_VISUAL,
  SETTINGS_SHORTCUTS,
  SETTINGS_PRIVACY,
  SETTINGS_ABOUT,
  SETTINGS_LOGIN
} from "../shared/constants";

import mountReactComponent from "./mountReactComponent";
import SectionBehaviour from "./components/settings/SectionBehaviour";

let lastSettingsSection = 1;
const updateState = "";
let currentOverlay = 0;

const LANGUAGES = [
  "en",
  "es",
  "br",
  "de",
  "fr",
  "it",
  "js",
  "ru",
  "ko-kr",
  "zh-cn"
];

function getLanguageName(lang: string): string {
  switch (lang) {
    case "en":
      return "English";
    case "es":
      return "Spanish";
    case "br":
      return "Portuguese";
    case "de":
      return "Deutsche";
    case "fr":
      return "French";
    case "it":
      return "Italian";
    case "js":
      return "Japanese";
    case "ru":
      return "Russian";
    case "ko-kr":
      return "Korean";
    case "zh-cn":
      return "Chinese (simplified)";
    default:
      return "-";
  }
}

interface SettingsNavProps {
  component: () => JSX.Element;
  id: number;
  title: string;
  currentTab: number;
  callback: React.Dispatch<React.SetStateAction<number>>;
}

function SettingsNav(props: SettingsNavProps): JSX.Element {
  const click = () => {
    props.callback(props.id);
  };

  return (
    <div className="settings_nav" onClick={click}>
      {props.title}
    </div>
  );
}

function SectionData(): JSX.Element {
  return <></>;
}

function SectionOverlay(): JSX.Element {
  return <></>;
}

function SectionVisual(): JSX.Element {
  return <></>;
}

function SectionShortcuts(): JSX.Element {
  return <></>;
}

function SectionPrivacy(): JSX.Element {
  return <></>;
}

function SectionAbout(): JSX.Element {
  return <></>;
}

function SectionLogin(): JSX.Element {
  return <></>;
}

interface SettingsProps {
  openSection: number;
}

/**
 * Settings
 * @param props openSection: number
 */
function Settings(props: SettingsProps): JSX.Element {
  const [currentTab, setCurrentTab] = React.useState(props.openSection);

  const defaultTab = {
    currentTab: currentTab,
    callback: setCurrentTab
  };

  const tabs: SettingsNavProps[] = [];
  tabs[SETTINGS_BEHAVIOUR] = {
    ...defaultTab,
    id: SETTINGS_BEHAVIOUR,
    component: SectionBehaviour,
    title: "Behaviour"
  };
  tabs[SETTINGS_ARENA_DATA] = {
    ...defaultTab,
    id: SETTINGS_ARENA_DATA,
    component: SectionData,
    title: "Data"
  };
  tabs[SETTINGS_OVERLAY] = {
    ...defaultTab,
    id: SETTINGS_OVERLAY,
    component: SectionOverlay,
    title: "Overlay"
  };
  tabs[SETTINGS_VISUAL] = {
    ...defaultTab,
    id: SETTINGS_VISUAL,
    component: SectionVisual,
    title: "Visual"
  };
  tabs[SETTINGS_SHORTCUTS] = {
    ...defaultTab,
    id: SETTINGS_SHORTCUTS,
    component: SectionShortcuts,
    title: "Shortcuts"
  };
  tabs[SETTINGS_PRIVACY] = {
    ...defaultTab,
    id: SETTINGS_PRIVACY,
    component: SectionPrivacy,
    title: "Privacy"
  };
  tabs[SETTINGS_ABOUT] = {
    ...defaultTab,
    id: SETTINGS_ABOUT,
    component: SectionAbout,
    title: "About"
  };
  tabs[SETTINGS_LOGIN] = {
    ...defaultTab,
    id: SETTINGS_LOGIN,
    component: SectionLogin,
    title: "Login"
  };

  return (
    <>
      <div
        style={{ paddingTop: "16px" }}
        className="wrapper_column sidebar_column_r"
      >
        <SettingsNav {...tabs[SETTINGS_BEHAVIOUR]} />
        <SettingsNav {...tabs[SETTINGS_ARENA_DATA]} />
        <SettingsNav {...tabs[SETTINGS_OVERLAY]} />
        <SettingsNav {...tabs[SETTINGS_VISUAL]} />
        <SettingsNav {...tabs[SETTINGS_SHORTCUTS]} />
        <SettingsNav {...tabs[SETTINGS_PRIVACY]} />
        <SettingsNav {...tabs[SETTINGS_ABOUT]} />
        <SettingsNav {...tabs[SETTINGS_LOGIN]} />
      </div>
      <div className="wrapper_column settings_page">
        <div className="settings_title">{tabs[currentTab].title}</div>
        {tabs[currentTab].component()}
      </div>
    </>
  );
}

export function openSettingsTab(
  openSection = lastSettingsSection,
  scrollTop = 0
): void {
  if (openSection !== -1) {
    lastSettingsSection = openSection;
  } else {
    openSection = lastSettingsSection;
  }
  changeBackground("default");
  hideLoadingBars();

  const mainDiv = resetMainContainer() as HTMLElement;
  mainDiv.classList.add("flex_item");
  mountReactComponent(<Settings openSection={openSection} />, mainDiv);
}

export function setCurrentOverlaySettings(index: number): void {
  currentOverlay = index;
}
