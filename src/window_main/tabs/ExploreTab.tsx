import React, { useCallback, useEffect, useState } from "react";
import { ipcSend } from "../util";
import { useDispatch, useSelector } from "react-redux";
import {
  dispatchAction,
  SET_LOADING,
  SET_EXPLORE_FILTERS,
  SET_SUB_NAV,
  SET_BACKGROUND_GRPID
} from "../../shared/redux/reducers";
import ReactSelect from "../../shared/ReactSelect";
import Button from "../components/misc/Button";
import db from "../../shared/database";
import Checkbox from "../components/misc/Checkbox";
import Input from "../components/misc/Input";
import { COLORS_LONG, RANKS, SUB_DECK } from "../../shared/constants";
import { AppState } from "../../shared/redux/appState";
import { ListItemExplore } from "../components/list-item/ListItemExplore";
import uxMove from "../uxMove";

export interface ExploreQuery {
  filterWCC: string;
  filterWCU: string;
  filterWCR: string;
  filterWCM: string;
  onlyOwned: boolean;
  filterType: string;
  filterEvent: string | null;
  filterSort: string;
  filterSortDir: -1 | 1;
  filteredMana: number[];
  filteredRanks: string[];
  filterSkip: number;
}

export default function ExploreTab(): JSX.Element {
  const dispatcher = useDispatch();
  const loading = useSelector((state: AppState) => state.loading);
  const exploreData = useSelector((state: AppState) => state.exploreData);
  const exploreFilters = useSelector((state: AppState) => state.exploreFilters);

  const [queryFilters, setQueryFilters] = useState(exploreFilters);
  useEffect(() => setQueryFilters(exploreFilters), [exploreFilters]);

  const queryExplore = useCallback(
    (filters: ExploreQuery) => {
      ipcSend("request_explore", filters);
      dispatchAction(dispatcher, SET_LOADING, true);
      dispatchAction(dispatcher, SET_EXPLORE_FILTERS, filters);
    },
    [dispatcher]
  );

  const newQuery = useCallback(() => {
    const newFilters = {
      ...queryFilters,
      filterSkip: 0
    };
    queryExplore(newFilters);
  }, [queryExplore, queryFilters]);

  const scrollQuery = useCallback(() => {
    queryExplore(queryFilters);
  }, [queryExplore, queryFilters]);

  const openRow = useCallback(
    (row: any): void => {
      uxMove(-100);
      const deck = {
        mainDeck: row.mainDeck,
        sideboard: row.sideboard,
        deckTileId: row.tile,
        name: row.name,
        id: row._id
      };
      dispatchAction(dispatcher, SET_BACKGROUND_GRPID, row.tile);
      dispatchAction(dispatcher, SET_SUB_NAV, {
        type: SUB_DECK,
        id: row._id + "_",
        data: deck
      });
    },
    [dispatcher]
  );

  useEffect(() => {
    if (!loading && !exploreData.result) {
      newQuery(); // no data and no query in flight, autolaunch
    }
  }, [exploreData, loading, newQuery]);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const onScroll = React.useCallback(() => {
    if (containerRef?.current) {
      const container = containerRef?.current;
      const desiredHeight = Math.round(
        container.scrollTop + container.offsetHeight
      );
      if (desiredHeight >= container.scrollHeight && !loading) {
        scrollQuery();
      }
    }
  }, [loading, scrollQuery]);

  return (
    <div ref={containerRef} onScroll={onScroll} className="ux_item">
      <div
        style={{ width: "100%", flexDirection: "column" }}
        className="flex_item"
      >
        <ExploreFilters doSearch={newQuery} />
        <div className="explore_list">
          {exploreData?.result?.length > 0 ? (
            exploreData.result.map((row: any) => {
              return (
                <ListItemExplore
                  key={row._id}
                  row={row}
                  openCallback={openRow}
                />
              );
            })
          ) : !loading ? (
            <div style={{ marginTop: "32px" }} className="message_sub red">
              Query returned no data.
            </div>
          ) : (
            <></>
          )}
          {loading ? (
            <div style={{ margin: "16px" }} className="message_sub white">
              Loading...
            </div>
          ) : (
            <></>
          )}
        </div>
      </div>
    </div>
  );
}

function getEventPrettyName(event: string): string {
  return db.event(event) || event;
}

interface ExploreFiltersProps {
  doSearch: () => void;
}

function ExploreFilters(props: ExploreFiltersProps): JSX.Element {
  const { doSearch } = props;
  const filters = useSelector((state: AppState) => state.exploreFilters);
  const activeEvents = useSelector((state: AppState) => state.activeEvents);
  const [eventFilters, setEventFilters] = useState(["Ladder"]);
  const dispatcher = useDispatch();

  const typeFilter = ["Events", "Ranked Constructed", "Ranked Draft"];
  const sortFilters = ["By Date", "By Wins", "By Winrate", "By Player"];
  const sortDirection = ["Descending", "Ascending"];

  const updateFilters = useCallback(
    (filters: ExploreQuery): void => {
      dispatchAction(dispatcher, SET_EXPLORE_FILTERS, filters);
    },
    [dispatcher]
  );

  const setManaFilter = useCallback(
    (value: number[]): void => {
      updateFilters({
        ...filters,
        filteredMana: value
      });
    },
    [filters, updateFilters]
  );

  const setRanksFilter = useCallback(
    (value: string[]): void => {
      updateFilters({
        ...filters,
        filteredRanks: value
      });
    },
    [filters, updateFilters]
  );

  const getFilterEvents = useCallback(
    (prevFilters: ExploreQuery = filters): string[] => {
      // activeEvents is not really iterable? probably because
      // of how its read from the logs initially.
      const active = Object.values(activeEvents) || activeEvents;
      let newFilters: string[] = [];
      let sep = true;
      if (prevFilters.filterType === "Events") {
        sep = false;
        newFilters = db.eventIds
          .concat(active)
          .filter(item => item && !db.single_match_events.includes(item));

        newFilters = [...new Set(newFilters)];
      } else if (prevFilters.filterType === "Ranked Draft") {
        newFilters = db.limited_ranked_events;
      } else if (prevFilters.filterType === "Ranked Constructed") {
        newFilters = db.standard_ranked_events;
      }
      newFilters.sort(function(a, b) {
        if (a < b) return -1;
        if (a > b) return 1;
        return 0;
      });
      newFilters.forEach((item, index: number) => {
        if (active.includes(item)) {
          newFilters.splice(newFilters.indexOf(item), 1);
          newFilters.unshift(item);
        } else if (!sep) {
          sep = true;
          newFilters.splice(index, 0, "%%Archived");
        }
      });
      newFilters.splice(0, 0, "%%Active");
      setEventFilters(newFilters);
      return newFilters;
    },
    [filters, activeEvents]
  );

  return (
    <div className="explore_buttons_container">
      <div className="explore_buttons_row explore_buttons_top">
        <ReactSelect
          options={typeFilter}
          current={filters.filterType}
          callback={(filter: string): void =>
            updateFilters({
              ...filters,
              filterType: filter,
              filterEvent: getFilterEvents({
                ...filters,
                filterType: filter
              })[0]
            })
          }
        />
        <ReactSelect
          options={eventFilters}
          key={filters.filterType}
          current={eventFilters[1]}
          optionFormatter={getEventPrettyName}
          callback={(filter: string): void =>
            updateFilters({ ...filters, filterEvent: filter })
          }
        />
        <label style={{ marginLeft: "16px" }}>Sort:</label>
        <ReactSelect
          style={{ width: "130px" }}
          options={sortFilters}
          current={filters.filterSort}
          callback={(filter: string): void =>
            updateFilters({ ...filters, filterSort: filter })
          }
        />
        <ReactSelect
          options={sortDirection}
          style={{ width: "130px" }}
          current={
            filters.filterSortDir == -1 ? sortDirection[0] : sortDirection[1]
          }
          callback={(filter: string): void =>
            updateFilters({
              ...filters,
              filterSortDir: filter == sortDirection[0] ? -1 : 1
            })
          }
        />
      </div>
      <div className="explore_buttons_row explore_buttons_middle">
        <Checkbox
          text="Only Owned"
          value={filters.onlyOwned}
          callback={(value: boolean): void =>
            updateFilters({
              ...filters,
              onlyOwned: value
            })
          }
        />
        <div className="wc_common wc_search_icon"></div>
        <Input
          type="number"
          containerClassName="input_container_explore explore_wc_input"
          value={filters.filterWCC}
          placeholder=""
          callback={(value: string): void =>
            updateFilters({
              ...filters,
              filterWCC: value
            })
          }
        />
        <div className="wc_uncommon wc_search_icon"></div>
        <Input
          type="number"
          containerClassName="input_container_explore explore_wc_input"
          value={filters.filterWCU}
          placeholder=""
          callback={(value: string): void =>
            updateFilters({
              ...filters,
              filterWCU: value
            })
          }
        />
        <div className="wc_rare wc_search_icon"></div>
        <Input
          type="number"
          containerClassName="input_container_explore explore_wc_input"
          value={filters.filterWCR}
          placeholder=""
          callback={(value: string): void =>
            updateFilters({
              ...filters,
              filterWCR: value
            })
          }
        />
        <div className="wc_mythic wc_search_icon"></div>
        <Input
          type="number"
          containerClassName="input_container_explore explore_wc_input"
          value={filters.filterWCM}
          placeholder=""
          callback={(value: string): void =>
            updateFilters({
              ...filters,
              filterWCM: value
            })
          }
        />
      </div>
      <div className="explore_buttons_row explore_buttons_bottom">
        <ManaFilter callback={setManaFilter} filter={filters.filteredMana} />
        <RanksFilter callback={setRanksFilter} filter={filters.filteredRanks} />
        <Button
          className={"button_simple"}
          style={{ margin: "0px" }}
          text="Search"
          onClick={doSearch}
        />
      </div>
    </div>
  );
}

interface ManaFilterProps {
  filter: number[];
  callback: (filter: number[]) => void;
}

function ManaFilter(props: ManaFilterProps): JSX.Element {
  const { filter, callback } = props;
  const [filters, setFilters] = useState(filter);

  const filterSize = { height: "20px", width: "30px" };

  const setFilter = (filter: number): void => {
    const n = filters.indexOf(filter);
    const newFilters = [...filters];
    if (n > -1) {
      newFilters.splice(n, 1);
    } else {
      newFilters.push(filter);
    }
    setFilters(newFilters);
    callback(newFilters);
  };

  useEffect(() => {
    setFilters(filter);
  }, [filter]);

  const manas = [1, 2, 3, 4, 5];

  return (
    <div className="mana_filters_explore">
      {manas.map((mana: number) => {
        return (
          <div
            key={"mana-filter-" + mana}
            onClick={(): void => setFilter(mana)}
            style={filterSize}
            className={
              "mana_filter mana_" +
              COLORS_LONG[mana - 1] +
              " " +
              (filters.includes(mana) ? "" : "mana_filter_on")
            }
          ></div>
        );
      })}
    </div>
  );
}

interface RanksFilterProps {
  filter: string[];
  callback: (filter: string[]) => void;
}

function RanksFilter(props: RanksFilterProps): JSX.Element {
  const { filter, callback } = props;
  const [filters, setFilters] = useState(filter);

  const setFilter = (filter: string): void => {
    const n = filters.indexOf(filter);
    const newFilters = [...filters];
    if (n > -1) {
      newFilters.splice(n, 1);
    } else {
      newFilters.push(filter);
    }
    setFilters(newFilters);
    callback(newFilters);
  };

  useEffect(() => {
    setFilters(filter);
  }, [filter]);

  return (
    <div className="mana_filters_explore">
      {RANKS.map((rank: string, index: number) => {
        return (
          <div
            key={"rank-filter-" + rank}
            onClick={(): void => setFilter(rank)}
            style={{
              backgroundPosition: (index + 1) * -16 + "px 0px",
              backgroundImage: "url(../images/ranks_16.png)"
            }}
            className={
              "rank_filter " + (filters.includes(rank) ? "" : "rank_filter_on")
            }
          ></div>
        );
      })}
    </div>
  );
}
