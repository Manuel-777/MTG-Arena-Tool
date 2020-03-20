/* eslint-disable @typescript-eslint/camelcase */
import React from "react";
import { useSelector } from "react-redux";
import { ipcSend } from "../rendererUtil";

import {
  SETTINGS_BEHAVIOUR,
  SETTINGS_ARENA_DATA,
  SETTINGS_OVERLAY,
  SETTINGS_VISUAL,
  SETTINGS_SHORTCUTS,
  SETTINGS_PRIVACY,
  SETTINGS_ABOUT,
  SETTINGS_LOGIN
} from "../../shared/constants";

import { AppState } from "../../shared/redux/reducers";
import SectionBehaviour from "../components/settings/SectionBehaviour";
import SectionData from "../components/settings/SectionData";
import SectionOverlay from "../components/settings/sectionOverlay";
import SectionVisual from "../components/settings/sectionVisual";
import SectionShortcuts from "../components/settings/SectionShortcuts";
import SectionPrivacy from "../components/settings/SectionPrivacy";
import SectionAbout from "../components/settings/SectionAbout";
import SectionLogin from "../components/settings/SectionLogin";

interface SettingsNavProps {
  component: () => JSX.Element;
  id: number;
  title: string;
  currentTab: number;
  callback: React.Dispatch<React.SetStateAction<number>>;
}

function SettingsNav(props: SettingsNavProps): JSX.Element {
  const click = (): void => {
    props.callback(props.id);
  };

  return (
    <div
      className={
        "settings_nav" + (props.currentTab == props.id ? " nav_selected" : "")
      }
      onClick={click}
    >
      {props.title}
    </div>
  );
}

interface SettingsProps {
  openSection?: number;
}

/**
 * Settings
 * @param props openSection: number
 */
export default function SettingsTab(props: SettingsProps): JSX.Element {
  const settings = useSelector((state: AppState) => state.settings);
  const openSection =
    (props.openSection === -1
      ? settings.last_settings_section
      : props.openSection) ?? settings.last_settings_section;
  const [currentTab, setCurrentTab] = React.useState(openSection);
  React.useEffect(() => setCurrentTab(openSection), [openSection]);

  const defaultTab = {
    currentTab: currentTab,
    callback: setCurrentTab
  };

  React.useEffect(() => {
    ipcSend("save_user_settings", {
      last_settings_section: currentTab,
      skipRefresh: true
    });
  }, [currentTab]);

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
    title: "Arena Data"
  };
  tabs[SETTINGS_OVERLAY] = {
    ...defaultTab,
    id: SETTINGS_OVERLAY,
    component: SectionOverlay,
    title: "Overlays"
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

  const CurrentSettings = tabs[currentTab].component;
  return (
    <div className="ux_item">
      <div className="wrapper_column sidebar_column_r">
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
        <CurrentSettings />
      </div>
    </div>
  );
}
