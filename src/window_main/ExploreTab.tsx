import React, { useCallback, useEffect, useState } from "react";
import { ipcSend } from "./renderer-util";
import { useDispatch } from "react-redux";
import { dispatchAction, SET_LOADING } from "./app/reducers";
import { WrappedReactSelect } from "../shared/ReactSelect";
import Button from "./components/Button";
import db from "../shared/database";
import Checkbox from "./components/Checkbox";
import Input from "./components/Input";
import { COLORS_LONG, RANKS } from "../shared/constants";

interface ExploreQuery {
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

const defaultQuery: ExploreQuery = {
  filterEvent: null,
  filterType: "Events",
  filterSort: "By Wins",
  filterSortDir: -1,
  filterSkip: 0,
  filterWCC: "",
  filterWCU: "",
  filterWCR: "",
  filterWCM: "",
  filteredMana: [],
  filteredRanks: [],
  onlyOwned: false
};

function queryExplore(query: ExploreQuery): void {
  ipcSend("request_explore", query);
}

export function ExploreTab(): JSX.Element {
  const dispatcher = useDispatch();
  const [queryFilters, setQueryFilters] = React.useState(defaultQuery);

  const doQuery = useCallback(() => {
    dispatchAction(dispatcher, SET_LOADING, true);
    queryExplore(queryFilters);
  }, [dispatcher, queryFilters]);

  useEffect(() => {
    dispatchAction(dispatcher, SET_LOADING, true);
    queryExplore(defaultQuery);
  }, [dispatcher]);

  return (
    <div style={{ width: "100%" }} className="flex_item">
      <ExploreFilters
        filters={queryFilters}
        updateFilters={setQueryFilters}
        doSearch={doQuery}
      />
      <div className="explore_list"></div>
    </div>
  );
}

function getEventPrettyName(event: string): string {
  return db.event(event) || event;
}

interface ExploreFiltersProps {
  updateFilters: (query: ExploreQuery) => void;
  doSearch: () => void;
  filters: ExploreQuery;
}

function ExploreFilters(props: ExploreFiltersProps): JSX.Element {
  const { updateFilters, doSearch } = props;
  const [filters, setFilters] = useState(props.filters);
  const [eventFilters, setEventFilters] = useState([""]);

  const typeFilter = ["Events", "Ranked Constructed", "Ranked Draft"];
  const sortFilters = ["By Date", "By Wins", "By Winrate", "By Player"];
  const sortDirection = ["Descending", "Ascending"];

  const setManaFilter = (value: number[]): void => {
    updateFilters({
      ...filters,
      filteredMana: value
    });
  };

  const setRanksFilter = (value: string[]): void => {
    updateFilters({
      ...filters,
      filteredRanks: value
    });
  };

  const getFilterEvents = useCallback(
    (prevFilters: ExploreQuery = filters): string[] => {
      let newFilters: string[] = [];
      if (prevFilters.filterType === "Events") {
        newFilters = db.eventIds
          .concat(db.activeEvents)
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

      const mappedActive = db.activeEvents;
      newFilters.forEach(item => {
        if (mappedActive.includes(item)) {
          newFilters.splice(newFilters.indexOf(item), 1);
          newFilters.unshift(item);
        }
      });
      setEventFilters(newFilters);
      return newFilters;
    },
    [filters]
  );

  useEffect(() => {
    setFilters(props.filters);
  }, [props.filters]);

  return (
    <div className="explore_buttons_container">
      <div className="explore_buttons_row explore_buttons_top">
        <WrappedReactSelect
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
        <WrappedReactSelect
          options={eventFilters}
          key={filters.filterType}
          current={eventFilters[0]}
          optionFormatter={getEventPrettyName}
          callback={(filter: string): void =>
            updateFilters({ ...filters, filterEvent: filter })
          }
        />
        <label style={{ marginLeft: "16px" }}>Sort:</label>
        <WrappedReactSelect
          style={{ width: "130px" }}
          options={sortFilters}
          current={filters.filterSort}
          callback={(filter: string): void =>
            updateFilters({ ...filters, filterSort: filter })
          }
        />
        <WrappedReactSelect
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

export function openExploreTab(): JSX.Element {
  return <ExploreTab />;
}
