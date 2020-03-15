import { TableState } from "react-table";
import { CardsData } from "../window_main/components/collection/types";
import { DecksData } from "../window_main/components/decks/types";
import { TransactionData } from "../window_main/components/economy/types";
import { EventTableData } from "../window_main/components/events/types";
import { MatchTableData } from "../window_main/components/matches/types";

export interface OverlaySettingsData {
  alpha: number;
  alpha_back: number;
  bounds: { width: number; height: number; x: number; y: number };
  cards_overlay: boolean;
  clock: boolean;
  draw_odds: boolean;
  deck: boolean;
  lands: boolean;
  keyboard_shortcut: boolean;
  mana_curve: boolean;
  mode: number;
  ontop: boolean;
  show: boolean;
  show_always: boolean;
  sideboard: boolean;
  title: boolean;
  top: boolean;
  type_counts: boolean;
}

export interface AppSettings {
  auto_login: boolean;
  beta_channel: boolean;
  close_to_tray: boolean;
  email: string;
  launch_to_tray: boolean;
  log_locale_format: string;
  logUri: string;
  metadata_lang: string;
  remember_me: boolean;
  token: string;
  toolVersion: number;
}

export interface SettingsData {
  anon_explore: boolean;
  back_color: string;
  back_url: string;
  card_tile_style: number | string;
  cards_quality: string;
  cards_size: number;
  cards_size_hover_card: number;
  close_on_match: boolean;
  collectionTableState?: TableState<CardsData>;
  collectionTableMode: string;
  decksTableMode: string;
  decksTableState?: TableState<DecksData>;
  economyTableMode: string;
  economyTableState?: TableState<TransactionData>;
  enable_keyboard_shortcuts: boolean;
  eventsTableMode: string;
  eventsTableState?: TableState<EventTableData>;
  export_format: string;
  last_date_filter: string;
  last_open_tab: number;
  last_settings_overlay_section: number;
  last_settings_section: number;
  matchesTableMode: string;
  matchesTableState?: TableState<MatchTableData>;
  metadata_lang: string;
  overlay_back_color: string;
  overlay_ontop: boolean;
  overlay_scale: number;
  overlayHover: { x: number; y: number };
  overlays: OverlaySettingsData[];
  right_panel_width: number;
  startup: boolean;
  skip_firstpass: boolean;
  sound_priority: boolean;
  sound_priority_volume: number;
  shortcut_editmode: string;
  shortcut_devtools_main: string;
  shortcut_devtools_overlay: string;
  send_data: boolean;
}

export interface MergedSettings extends AppSettings, SettingsData {}
