import {
  COLORS_BRIEF,
  DATE_LAST_30,
  DATE_LAST_DAY,
  DATE_ALL_TIME,
  DATE_SEASON
} from "../shared/constants";
import { getReadableEvent } from "../shared/util";
import { ipcSend, showDatepicker } from "./renderer-util";
import Aggregator from "./aggregator";
import React from "react";
import TagOption from "./TagOption";
import DateFilter from "./DateFilter";
import ManaFilter, { ColorFilter } from "./ManaFilter";
import { WrappedReactSelect } from "../shared/ReactSelect";
import { getDeckComponentForwarded } from "./getDeckComponent";

class FilterPanel {
  prefixId: string;
  onFilterChange: (changed: any, filter: any) => void;
  filters: any;
  events: string[];
  tags: string[];
  decks: any;
  showManaFilter: boolean;
  archs: any;
  showOppManaFilter: boolean;
  archCounts: { [key: string]: number };
  showArchivedFilter: boolean;
  showSortOption: boolean;

  constructor(
    prefixId: string,
    onFilterChange: (changed: any, filter: any) => void,
    filters: any,
    events: string[],
    tags: string[],
    decks: { id: string }[],
    showManaFilter: boolean,
    archs: string[],
    showOppManaFilter: boolean,
    archCounts: { [key: string]: number } | null,
    showArchivedFilter: boolean,
    showSortOption: boolean
  ) {
    this.prefixId = prefixId;
    this.onFilterChange = onFilterChange;
    this.filters = {
      ...Aggregator.getDefaultFilters(),
      ...filters
    };
    this.events = events || [];
    this.tags = tags || [];
    this.decks = decks || [];
    this.showManaFilter = showManaFilter || false;
    this.archs = archs || [];
    this.showOppManaFilter = showOppManaFilter || false;
    this.archCounts = archCounts || {};
    this.showArchivedFilter = showArchivedFilter || false;
    this.showSortOption = showSortOption || false;
    return this;
  }

  private filterCallback = (propertyString: string) => (
    filter: string | boolean | ColorFilter
  ) => {
    this.filters[propertyString] = filter;
    this.onFilterChange({ [propertyString]: filter }, this.filters);
  };

  private dateSelectCallback = (filter: string) => {
    if (filter === "Custom") {
      const lastWeek = new Date();
      lastWeek.setDate(new Date().getDate() - 7);
      showDatepicker(lastWeek, (date: Date) => {
        const filter = date.toISOString();
        this.onFilterChange({ date: filter }, this.filters);
        ipcSend("save_user_settings", {
          last_date_filter: filter,
          skip_refresh: true
        });
      });
    } else {
      this.filters.date = filter;
      this.onFilterChange({ date: filter }, this.filters);
      ipcSend("save_user_settings", {
        last_date_filter: filter,
        skip_refresh: true
      });
    }
  };

  render() {
    const dateOptions = [
      DATE_ALL_TIME,
      DATE_SEASON,
      DATE_LAST_30,
      DATE_LAST_DAY,
      "Custom"
    ];
    let dateSelected = this.filters.date;
    if (this.filters.date && !dateOptions.includes(this.filters.date)) {
      const prettyDate = `Since ${new Date(this.filters.date).toDateString()}`;
      dateOptions.unshift(prettyDate);
      dateSelected = prettyDate;
    }

    const sortSelect = ["By Date", "By Wins", "By Winrate", "By Incomplete"];

    return (
      <div className={this.prefixId + "_filter filter_panel_root"}>
        <div className={"filter_column"}>
          <DateFilter
            showArchivedValue={this.filters.showArchived}
            prefixId={this.prefixId}
            options={dateOptions}
            current={dateSelected}
            callback={this.dateSelectCallback}
            showArchivedFilter={this.showArchivedFilter}
            onArchiveClick={this.filterCallback("showArchived")}
          />
          {!!this.events.length && (
            <WrappedReactSelect
              className={this.prefixId + "_query_event"}
              options={this.events}
              current={this.filters.eventId}
              callback={this.filterCallback("eventId")}
              optionFormatter={getReadableEvent}
            />
          )}
        </div>
        {(this.tags.length || this.showManaFilter) && (
          <div className={"filter_column"}>
            {(this.tags.length || this.decks.length) && (
              <div className={"deckFiltersCont"}>
                {this.tags.length && (
                  <WrappedReactSelect
                    className={this.prefixId + "_query_tag spacer180"}
                    options={this.tags}
                    current={this.filters.tag}
                    callback={this.filterCallback("tag")}
                    optionFormatter={(tag: string) => <TagOption tag={tag} />}
                  />
                )}
                {this.decks.length ? (
                  <WrappedReactSelect
                    className={this.prefixId + "_query_deck spacer180"}
                    options={this.decks.map((deck: { id: string }) => deck.id)}
                    current={this.filters.deckId}
                    callback={this.filterCallback("deckId")}
                    optionFormatter={getDeckComponentForwarded(this.decks)}
                  />
                ) : (
                  <div className={"spacer180"} />
                )}
              </div>
            )}
            {this.showManaFilter && (
              <ManaFilter
                prefixId={this.prefixId}
                filterKey={"colors"}
                filters={this.filters}
                onFilterChanged={this.filterCallback("colors")}
              />
            )}
          </div>
        )}
        {(this.archs.length ||
          this.showOppManaFilter ||
          this.showSortOption) && (
          <div className={"filter_column"}>
            {!!this.archs.length && (
              <WrappedReactSelect
                className={
                  this.prefixId +
                  "_query_optag filter_panel_select_margin spacer180"
                }
                options={this.archs}
                current={this.filters.arch}
                callback={this.filterCallback("arch")}
                optionFormatter={(tag: string) => (
                  <TagOption
                    tag={tag}
                    showCount={true}
                    archCounts={this.archCounts}
                  />
                )}
              />
            )}
            {this.showOppManaFilter ? (
              <ManaFilter
                prefixId={this.prefixId}
                filterKey={"oppColors"}
                filters={this.filters}
                onFilterChanged={this.filterCallback("oppColors")}
              />
            ) : this.showSortOption ? (
              <div className={"sortDiv"}>
                <label className={"sortLabel"}>Sort</label>
                <WrappedReactSelect
                  className={
                    this.prefixId +
                    "_query_sort sortSelect filter_panel_select_margin"
                  }
                  options={sortSelect}
                  current={this.filters.sort}
                  callback={this.filterCallback("sort")}
                />
                <div
                  className={"select_container filter_panel_select_margin"}
                />
              </div>
            ) : (
              <div className={"spacer180"} />
            )}
          </div>
        )}
      </div>
    );
  }
}

export default FilterPanel;
