import React, { useState, useMemo, useEffect } from "react";
import ManaCost from "../misc/ManaCost";
import DeckList from "../misc/DeckList";
import DeckTypesStats from "../../../shared/TypesStats";
import DeckManaCurve from "../../../shared/ManaCurve";
import {
  constants,
  Deck,
  getDeckColorsAmmount,
  getDeckLandsAmmount,
  InternalDeck,
  CardObject,
} from "mtgatool-shared";
import Button from "../misc/Button";
import { ipcSend } from "../../ipcSend";
import { useDispatch, useSelector } from "react-redux";
import db from "../../../shared/database-wrapper";
import ShareButton from "../misc/ShareButton";
import CraftingCost from "./CraftingCost";
import { reduxAction } from "../../../shared/redux/sharedRedux";
import { getDeck, decksList } from "../../../shared/store";
import VisualDeckView from "./VisualDeckView";
import ChangesDeckView from "./ChangesDeckView";
import { AppState } from "../../../shared/redux/stores/rendererStore";
import MatchResultsStatsPanel from "../misc/MatchResultsStatsPanel";
import Aggregator from "../../aggregator";
import { useAggregatorData } from "../tables/useAggregatorData";
import { animated } from "react-spring";
import useResizePanel from "../../hooks/useResizePanel";
import CardsWinratesView from "./CardsWinrateView";

import sharedCss from "../../../shared/shared.css";
import tablesCss from "../tables/tables.css";
import indexCss from "../../index.css";
import css from "./DeckView.css";
import ReactSvgPieChart from "react-svg-piechart";
import timestamp from "../../../shared/utils/timestamp";
import IncognitoButton from "../misc/IncognitoButton";
import WildcardsCostPreset from "../misc/WildcardsCostPreset";
import Separator from "../misc/Separator";
import { getCardArtCrop } from "../../../shared/utils/getCardArtCrop";
import DeckColorsBar from "../misc/DeckColorsBar";
import Section from "../misc/Section";
import BackIcon from "../../../assets/images/svg/back.svg";
import SvgButton from "../misc/SvgButton";

const { MANA_COLORS, IPC_NONE } = constants;

const VIEW_VISUAL = 0;
const VIEW_REGULAR = 1;
const VIEW_CHANGES = 2;
const VIEW_WINRATES = 3;

interface DeckViewProps {
  deck: InternalDeck;
}

interface RaritiesCount {
  c: number;
  u: number;
  r: number;
  m: number;
}

function getDeckRaritiesCount(deck: Deck): RaritiesCount {
  const cards = [...deck.getMainboard().get(), ...deck.getSideboard().get()];
  const rarities = cards
    .filter((c: CardObject) => {
      return c.quantity > 0;
    }).map((c: CardObject) => {
      const card = db.card(c.id);
      return card?.rarity;
    });

  return {
    c: rarities.filter((rarity: string | undefined) => rarity === "common").length,
    u: rarities.filter((rarity: string | undefined) => rarity === "uncommon").length,
    r: rarities.filter((rarity: string | undefined) => rarity === "rare").length,
    m: rarities.filter((rarity: string | undefined) => rarity === "mythic").length,
  };
}

function DeckView(props: DeckViewProps): JSX.Element {
  const deck = new Deck(props.deck);
  const [deckView, setDeckView] = useState(VIEW_REGULAR);
  const dispatcher = useDispatch();

  const goBack = (): void => {
    reduxAction(dispatcher, { type: "SET_BACK_GRPID", arg: 0 }, IPC_NONE);
    reduxAction(dispatcher, { type: "SET_NAV_INDEX", arg: 0 }, IPC_NONE);
  };

  const deckWinratesView = (): void => {
    setDeckView(VIEW_WINRATES);
  };

  const deckChangesView = (): void => {
    setDeckView(VIEW_CHANGES);
  };

  const visualView = (): void => {
    setDeckView(VIEW_VISUAL);
  };

  const regularView = (): void => {
    setDeckView(VIEW_REGULAR);
  };

  useEffect(() => {
    deck.id;
    setDeckView(VIEW_REGULAR);
  }, [deck.id]);

  const arenaExport = (): void => {
    const list = deck.getExportArena();
    ipcSend("set_clipboard", list);
    const newTime = timestamp() + 2000;
    reduxAction(
      dispatcher,
      {
        type: "SET_POPUP",
        arg: {
          text: "Copied to clipboard",
          time: newTime,
          duration: 2000,
        },
      },
      IPC_NONE
    );
  };

  const txtExport = (): void => {
    const list = deck.getExportArena();
    ipcSend("export_txt", { str: list, name: deck.getName() });
  };

  const colorCounts = getDeckColorsAmmount(deck);
  const colorsPie = [
    { title: "White", value: colorCounts.w, color: MANA_COLORS[0] },
    { title: "Blue", value: colorCounts.u, color: MANA_COLORS[1] },
    { title: "Black", value: colorCounts.b, color: MANA_COLORS[2] },
    { title: "Red", value: colorCounts.r, color: MANA_COLORS[3] },
    { title: "Green", value: colorCounts.g, color: MANA_COLORS[4] },
  ];
  const landCounts = getDeckLandsAmmount(deck);
  const landsPie = [
    { title: "White", value: landCounts.w, color: MANA_COLORS[0] },
    { title: "Blue", value: landCounts.u, color: MANA_COLORS[1] },
    { title: "Black", value: landCounts.b, color: MANA_COLORS[2] },
    { title: "Red", value: landCounts.r, color: MANA_COLORS[3] },
    { title: "Green", value: landCounts.g, color: MANA_COLORS[4] },
  ];

  const wildcardsCost = getDeckRaritiesCount(deck);

  const [width, bind] = useResizePanel();

  const dateFilter = useSelector(
    (state: AppState) => state.settings.last_date_filter
  );
  const DecksTableState = useSelector(
    (state: AppState) => state.settings.decksTableState
  );

  const initFilters = useMemo(() => {
    dateFilter && DecksTableState;
    return { deckId: deck.id };
  }, [deck.id, dateFilter, DecksTableState]);

  const { aggFilters, setAggFilters } = useAggregatorData({
    aggFiltersArg: initFilters,
    getData: decksList,
    showArchived: false,
  });

  const aggregator = useMemo(() => {
    return new Aggregator({ ...aggFilters });
  }, [aggFilters]);

  return (
    <>
      <div className={indexCss.wrapperColumn}>
        <div className={indexCss.centeredUx}>
          <div
            className={indexCss.top}
            style={{
              backgroundImage: `url(${getCardArtCrop(deck.tile)})`,
            }}
          >
            <DeckColorsBar deck={deck} />
            <div className={indexCss.topInner}>
              <div className={indexCss.flexItem}>
                <SvgButton
                  style={{
                    marginRight: "8px",
                    backgroundColor: "var(--color-section)",
                  }}
                  svg={BackIcon}
                  onClick={goBack}
                />
                <div
                  style={{
                    lineHeight: "32px",
                    color: "var(--color-text-hover)",
                    textShadow: "3px 3px 6px #000000",
                  }}
                >
                  {deck.getName()}
                </div>
              </div>
              <div className={indexCss.flexItem}>
                <ManaCost
                  class={sharedCss.manaS20}
                  colors={deck.getColors().get()}
                />
              </div>
            </div>
          </div>

          <>
            {deckView == VIEW_VISUAL && (
              <VisualDeckView deck={deck} setRegularView={regularView} />
            )}
            {deckView == VIEW_CHANGES && (
              <ChangesDeckView deck={deck} setRegularView={regularView} />
            )}
            {deckView == VIEW_WINRATES && (
              <CardsWinratesView
                deck={deck}
                setRegularView={regularView}
                aggFilters={aggFilters}
                setAggFilters={setAggFilters}
                aggregator={aggregator}
              />
            )}
            {deckView == VIEW_REGULAR && (
              <div className={css.regularViewGrid}>
                <Section
                  style={{
                    justifyContent: "space-between",
                    gridArea: "controls",
                  }}
                >
                  <ShareButton
                    style={{ margin: "auto 4px auto 16px" }}
                    type="deck"
                    data={deck.getSave()}
                  />
                  {props.deck.type == "InternalDeck" ? (
                    <IncognitoButton
                      style={{ margin: "auto 0" }}
                      id={deck.id}
                    />
                  ) : (
                    <></>
                  )}
                  {props.deck.type == "InternalDeck" ? (
                    <>
                      <Button
                        style={{ margin: "16px" }}
                        className={indexCss.buttonSimple}
                        text="Deck Changes"
                        onClick={deckChangesView}
                      />
                      <Button
                        style={{ margin: "16px" }}
                        className={indexCss.buttonSimple}
                        text="Card Winrates"
                        onClick={deckWinratesView}
                      />
                    </>
                  ) : (
                    <></>
                  )}
                  <Button
                    style={{ margin: "16px" }}
                    className={indexCss.buttonSimple}
                    text="Visual View"
                    onClick={visualView}
                  />
                  <Button
                    style={{ margin: "16px" }}
                    className={indexCss.buttonSimple}
                    text="Export to Arena"
                    onClick={arenaExport}
                  />
                  <Button
                    style={{ margin: "16px" }}
                    className={indexCss.buttonSimple}
                    text="Export to .txt"
                    onClick={txtExport}
                  />
                </Section>
                <Section
                  style={{
                    flexDirection: "column",
                    gridArea: "deck",
                    paddingBottom: "16px",
                    paddingLeft: "24px",
                  }}
                >
                  <DeckList deck={deck} showWildcards={true} />
                </Section>
                <Section style={{ flexDirection: "column", gridArea: "types" }}>
                  <Separator>Types</Separator>
                  <DeckTypesStats deck={deck} />
                </Section>
                <Section
                  style={{ flexDirection: "column", gridArea: "curves" }}
                >
                  <Separator>Mana Curve</Separator>
                  <DeckManaCurve deck={deck} />
                </Section>
                <Section style={{ flexDirection: "column", gridArea: "pies" }}>
                  <Separator>Color Pie</Separator>
                  <div className={sharedCss.pieContainerOuter}>
                    <div className={sharedCss.pieContainer}>
                      <span>Mana Symbols</span>
                      <ReactSvgPieChart strokeWidth={0} data={colorsPie} />
                    </div>
                    <div className={sharedCss.pieContainer}>
                      <span>Mana Sources</span>
                      <ReactSvgPieChart strokeWidth={0} data={landsPie} />
                    </div>
                  </div>
                </Section>
                <Section
                  style={{ flexDirection: "column", gridArea: "rarities" }}
                >
                  <Separator>Rarities</Separator>
                  <WildcardsCostPreset
                    wildcards={wildcardsCost}
                    showComplete={true}
                  />
                  <Separator>Wildcards Needed</Separator>
                  <CraftingCost deck={deck} />
                </Section>
              </div>
            )}
          </>
        </div>
      </div>
      <animated.div
        {...bind()}
        className={tablesCss.sidebarDragger}
      ></animated.div>
      <animated.div
        className={tablesCss.sidebarMain}
        style={{ width, minWidth: width, maxWidth: width }}
      >
        <MatchResultsStatsPanel
          prefixId={"deck_view"}
          aggregator={aggregator}
          showCharts
        />
      </animated.div>
    </>
  );
}

export default function openDeckSub(
  deckId: string,
  deck: InternalDeck | null = null
): JSX.Element {
  const decklist = deck ?? getDeck(deckId);
  if (!decklist) return <div>{deckId}</div>;
  return <DeckView deck={decklist} />;
}
