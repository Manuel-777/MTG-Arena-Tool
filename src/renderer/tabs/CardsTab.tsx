import React, { useEffect, useMemo, useState } from "react";

import { useSelector, useDispatch } from "react-redux";
import { getWinrateClass } from "../rendererUtil";
import { ipcSend } from "../ipcSend";
import { AppState } from "../../shared/redux/stores/rendererStore";
import {
  CardsData,
  CardsCardData,
} from "../../shared/redux/slices/exploreSlice";
import {
  database,
  formatPercent,
  getEventPrettyName,
  DbCardData,
} from "mtgatool-shared";
import CardTile from "../../shared/CardTile";
import { useTable, useSortBy, Row, useFilters } from "react-table";
import Section from "../components/misc/Section";

import StarIcon from "../../assets/images/svg/star.svg";
import indexCss from "../index.css";
import appCss from "../app/app.css";
import css from "./CardsTab.css";
import ReactSelect from "../../shared/ReactSelect";
import { reduxAction } from "../../shared/redux/sharedRedux";
import { IPC_BACKGROUND } from "mtgatool-shared/dist/shared/constants";
import PatreonPage from "../components/patreon-page";
import SetsFilter from "../components/misc/SetsFilter";
import {
  historicAnthology,
  historicAnthology2,
  historicAnthology3,
} from "../components/collection/customSets";
import { TableData } from "../components/tables/types";

const GoodSampleSize = 500;

function getSampleSize(w: number, l: number): string {
  return `W L: ${w}:${l}`;
}

function arrayAverage(arr: number[]): number {
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    sum += arr[i];
  }
  return arr.length > 0 ? Math.round((sum / arr.length) * 100) / 100 : 0;
}

function getCastWinrate(cards: CardsData | null, name: string): number {
  const w = cards?.cards[name].cw || 0;
  const l = cards?.cards[name].cl || 0;
  if (w + l < 10) return 0;
  return (100 / (w + l)) * w;
}

function getKeptRate(cards: CardsData | null, name: string): number {
  const k = cards?.cards[name].k || 0;
  const m = cards?.cards[name].m || 0;
  if (k + m < 10) return 0;
  return (100 / (k + m)) * k;
}

function getFirstHandWinrate(cards: CardsData | null, name: string): number {
  const w = cards?.cards[name].fhw || 0;
  const l = cards?.cards[name].fhl || 0;
  if (w + l < 10) return 0;
  return (100 / (w + l)) * w;
}

function getSidedInWinrate(cards: CardsData | null, name: string): number {
  const w = cards?.cards[name].siw || 0;
  const l = cards?.cards[name].sil || 0;
  if (w + l < 10) return 0;
  return (100 / (w + l)) * w;
}

function getSidedOutWinrate(cards: CardsData | null, name: string): number {
  const w = cards?.cards[name].sow || 0;
  const l = cards?.cards[name].sol || 0;
  if (w + l < 10) return 0;
  return (100 / (w + l)) * w;
}

interface MemoizedCardsData extends CardsCardData {
  cardName: string;
  dbCard: DbCardData;
  keptRate: number;
  castWinrate: number;
  firstHandWinrate: number;
  sidedInWinrate: number;
  sidedOutWinrate: number;
  avgTurn: number;
  avgFirstTurn: number;
  avg: number;
}

function getTableLine(row: any): JSX.Element {
  const orig = row.original as MemoizedCardsData;
  const DbCard = orig.dbCard;
  return DbCard ? (
    <>
      <div style={{ gridArea: "card" }} className={css.cardsTableCell}>
        <CardTile
          quantity={Math.round(orig.avg)}
          card={DbCard}
          isSideboard={false}
          showWildcards={false}
          indent="ex-"
          isHighlighted={false}
        />
      </div>

      <div
        style={{ gridArea: "castWr" }}
        title={getSampleSize(orig.cw, orig.cl)}
        className={`${getWinrateClass(orig.castWinrate / 100, true)} ${
          css.cardsTableCell
        }
        `}
      >
        {orig.cw + orig.cl > GoodSampleSize ? (
          <StarIcon
            width="16px"
            height="16px"
            style={{ marginRight: "8px" }}
            fill="var(--color-g)"
          />
        ) : (
          <></>
        )}
        {orig.castWinrate > 0 ? formatPercent(orig.castWinrate / 100) : "-"}
      </div>

      <div
        style={{ gridArea: "firstHandWr" }}
        title={getSampleSize(orig.fhw, orig.fhl)}
        className={`${getWinrateClass(orig.firstHandWinrate / 100, true)} ${
          css.cardsTableCell
        }`}
      >
        {orig.firstHandWinrate > 0
          ? formatPercent(orig.firstHandWinrate / 100)
          : "-"}
      </div>

      <div
        style={{ gridArea: "kept" }}
        title={getSampleSize(orig.k, orig.m)}
        className={`${getWinrateClass(orig.keptRate / 100, true)} ${
          css.cardsTableCell
        }`}
      >
        {orig.firstHandWinrate > 0 ? formatPercent(orig.keptRate / 100) : "-"}
      </div>
      <div style={{ gridArea: "sidedIn" }} className={css.cardsTableCell}>
        {orig.si}
      </div>

      <div style={{ gridArea: "sidedOut" }} className={css.cardsTableCell}>
        {orig.so}
      </div>

      <div
        style={{ gridArea: "sidedInWr" }}
        title={getSampleSize(orig.siw, orig.sil)}
        className={`${getWinrateClass(orig.sidedInWinrate / 100, true)} ${
          css.cardsTableCell
        }`}
      >
        {orig.sidedInWinrate > 0
          ? formatPercent(orig.sidedInWinrate / 100)
          : "-"}
      </div>

      <div
        style={{ gridArea: "sidedOutWr" }}
        title={getSampleSize(orig.sow, orig.sol)}
        className={`${getWinrateClass(orig.sidedOutWinrate / 100, true)} ${
          css.cardsTableCell
        }`}
      >
        {orig.sidedOutWinrate > 0
          ? formatPercent(orig.sidedOutWinrate / 100)
          : "-"}
      </div>

      <div style={{ gridArea: "turnCast" }} className={css.cardsTableCell}>
        {orig.avgTurn}
      </div>

      <div style={{ gridArea: "firstTurnCast" }} className={css.cardsTableCell}>
        {orig.avgFirstTurn}
      </div>
    </>
  ) : (
    <></>
  );
}

function setFilterFn<MemoizedCardsData extends TableData>(
  rows: Row<MemoizedCardsData>[],
  _id: string,
  filterValue: string[]
): Row<MemoizedCardsData>[] {
  console.log(rows, _id, filterValue);
  return rows.filter((row) => {
    let res = false;
    if (filterValue.length == 0) return true;
    filterValue.forEach((F) => {
      if (F == "ha1" && historicAnthology.includes(row.original.dbCard.id))
        res = true;
      if (F == "ha2" && historicAnthology2.includes(row.original.dbCard.id))
        res = true;
      if (F == "ha3" && historicAnthology3.includes(row.original.dbCard.id))
        res = true;
      if (F == row.original.set) res = true;
    });

    return res;
  });
}

// eslint-disable-next-line import/no-unused-modules
export default function CardsTab(): JSX.Element {
  const activeEvents = useSelector(
    (state: AppState) => state.explore.activeEvents
  );
  const isPatreon = useSelector(
    (state: AppState) => state.renderer.patreon.patreon
  );
  const [filterSets, setFilterSets] = useState<string[]>([]);
  const [currentEvent, setCurrentEvent] = useState("Ladder");
  const cards = useSelector((state: AppState) => state.explore.cards);
  const dispatcher = useDispatch();

  const cardsMemo: MemoizedCardsData[] = useMemo(() => {
    const allCardNames = [...new Set([...Object.keys(cards?.cards || {})])];

    return allCardNames
      .filter(
        (name) =>
          (cards?.cards[name].q.length || 0) > 0 &&
          (cards?.cards[name].cw || 0) + (cards?.cards[name].cl || 0) > 50
      )
      .map((name) => {
        return {
          cardName: name,
          dbCard: database.cardByName(name) as DbCardData,
          set: database.sets[
            (database.cardByName(name) as DbCardData).set
          ].code.toLowerCase(),
          ...(cards?.cards[name] as CardsCardData),
          keptRate: getKeptRate(cards, name),
          castWinrate: getCastWinrate(cards, name),
          firstHandWinrate: getFirstHandWinrate(cards, name),
          sidedInWinrate: getSidedInWinrate(cards, name),
          sidedOutWinrate: getSidedOutWinrate(cards, name),
          avgTurn: arrayAverage(cards?.cards[name].tc || []),
          avgFirstTurn: arrayAverage(cards?.cards[name].ftc || []),
          avg: arrayAverage(cards?.cards[name].q || []),
        };
      })
      .filter((d) => d.dbCard);
  }, [cards]);

  const columns = useMemo(
    () => [
      {
        Header: "Card (average copies)",
        accessor: "cardName",
      },
      {
        Header: "Cast WR",
        accessor: "castWinrate",
      },
      {
        Header: "First Hand WR",
        accessor: "firstHandWinrate",
      },
      {
        Header: "Kept %",
        accessor: "keptRate",
      },
      {
        Header: "Sided In",
        accessor: "si",
      },
      {
        Header: "Sided Out",
        accessor: "so",
      },
      {
        Header: "Sided In WR",
        accessor: "sidedInWinrate",
      },
      {
        Header: "Sided Out WR",
        accessor: "sidedOutWinrate",
      },
      {
        Header: "Avg. turn",
        accessor: "avgTurn",
      },
      {
        Header: "Avg. First Turn",
        accessor: "avgFirstTurn",
      },
      {
        Header: "set",
        filter: "set",
        accessor: "set",
        hidden: true,
      },
    ],
    []
  );

  const { headerGroups, rows, prepareRow, setAllFilters } = useTable(
    {
      columns,
      data: cardsMemo,
      filterTypes: {
        set: setFilterFn,
      },
      filters: {
        set: filterSets,
      },
      initialState: {
        sortBy: [
          {
            id: "castWinrate",
            desc: true,
          },
        ],
      },
    },
    useFilters,
    useSortBy
  );

  useEffect(() => {
    setAllFilters([{ id: "set", value: filterSets }]);
  }, [setAllFilters, filterSets]);

  useEffect(() => {
    if (isPatreon) {
      reduxAction(
        dispatcher,
        { type: "SET_LOADING", arg: true },
        IPC_BACKGROUND
      );
      ipcSend("request_cards", currentEvent);
    }
  }, [isPatreon, currentEvent, dispatcher]);

  return (
    <div className={appCss.uxItem}>
      {isPatreon ? (
        <div className={css.container}>
          <Section style={{ padding: "16px", gridArea: "controls" }}>
            <ReactSelect
              options={[...new Set(activeEvents)]}
              current={currentEvent}
              optionFormatter={getEventPrettyName}
              callback={(filter: string): void => setCurrentEvent(filter)}
            />
            <SetsFilter
              style={{
                margin: "auto 8px",
                justifyContent: "space-between",
                width: "-webkit-fill-available",
              }}
              callback={setFilterSets}
              filtered={filterSets}
            />
          </Section>
          <Section
            style={{
              flexDirection: "column",
              padding: "16px",
              gridArea: "cards",
            }}
          >
            <div className={css.cardsTableLine}>
              {headerGroups.map((headerGroup: any) => {
                return headerGroup.headers.map((column: any) => {
                  return column.hidden ? (
                    <></>
                  ) : (
                    <div
                      key={"header-" + column.accessor}
                      className={css.cardsTableCell}
                      {...column.getHeaderProps(column.getSortByToggleProps())}
                    >
                      {column.Header}
                      <div
                        style={{ margin: "auto 6px" }}
                        className={
                          column.isSorted
                            ? column.isSortedDesc
                              ? indexCss.sortDesc
                              : indexCss.sortAsc
                            : ""
                        }
                      />
                    </div>
                  );
                });
              })}
            </div>
            {rows.map((row: any) => {
              prepareRow(row);
              return (
                <div
                  key={"tablecell-" + row.original.cardName}
                  className={css.cardsTableLine}
                >
                  {getTableLine(row)}
                </div>
              );
            })}
          </Section>
        </div>
      ) : (
        <div
          style={{
            width: "-webkit-fill-available",
            maxWidth: "800px",
            margin: "auto",
          }}
        >
          <PatreonPage page="cards" />
        </div>
      )}
    </div>
  );
}
