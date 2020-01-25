import {
  UseExpandedHooks,
  UseExpandedInstanceProps,
  UseExpandedOptions,
  UseExpandedRowProps,
  UseExpandedState,
  UseFiltersColumnOptions,
  UseFiltersColumnProps,
  UseFiltersInstanceProps,
  UseFiltersOptions,
  UseFiltersState,
  UseGlobalFiltersInstanceProps,
  UseGlobalFiltersOptions,
  UseGlobalFiltersState,
  UseGroupByCellProps,
  UseGroupByColumnOptions,
  UseGroupByColumnProps,
  UseGroupByHooks,
  UseGroupByInstanceProps,
  UseGroupByOptions,
  UseGroupByRowProps,
  UseGroupByState,
  UsePaginationInstanceProps,
  UsePaginationOptions,
  UsePaginationState,
  UseSortByColumnOptions,
  UseSortByColumnProps,
  UseSortByHooks,
  UseSortByInstanceProps,
  UseSortByOptions,
  UseSortByState,
  UseTableColumnProps
} from "react-table";

declare module "react-table" {
  // take this file as-is, or comment out the sections that don't apply to your plugin configuration

  export interface TableOptions<D extends object>
    extends UseExpandedOptions<D>,
      UseFiltersOptions<D>,
      UseGlobalFiltersOptions<D>,
      UseGroupByOptions<D>,
      UsePaginationOptions<D>,
      UseSortByOptions<D>,
      // note that having Record here allows you to add anything to the options, this matches the spirit of the
      // underlying js library, but might be cleaner if it's replaced by a more specific type that matches your
      // feature set, this is a safe default.
      Record<string, any> {}

  export interface Hooks<D extends object = {}>
    extends UseExpandedHooks<D>,
      UseGroupByHooks<D>,
      UseSortByHooks<D> {}

  export interface TableInstance<D extends object = {}>
    extends UseExpandedInstanceProps<D>,
      UseFiltersInstanceProps<D>,
      UseGlobalFiltersInstanceProps<D>,
      UseGroupByInstanceProps<D>,
      UsePaginationInstanceProps<D>,
      UseSortByInstanceProps<D> {}

  export interface TableState<D extends object = {}>
    extends UseExpandedState<D>,
      UseFiltersState<D>,
      UseGlobalFiltersState<D>,
      UseGroupByState<D>,
      UsePaginationState<D>,
      UseSortByState<D> {}

  export interface Column<D extends object = {}>
    extends UseFiltersColumnOptions<D>,
      UseGroupByColumnOptions<D>,
      UseSortByColumnOptions<D> {
    // add custom column property options below
    gridWidth?: string;
    mayToggle?: boolean;
    defaultVisible?: boolean;
    percentFormatOptions?: any;
    divideBy100?: boolean;
    needsTileLabel?: boolean;
    listItemSection?: number;
  }

  export interface ColumnInstance<D extends object = {}>
    extends UseFiltersColumnProps<D>,
      UseGroupByColumnProps<D>,
      UseSortByColumnProps<D>,
      UseTableColumnProps<D> {
    // this is a bugfix for a misspelled function type declaration
    getToggleHiddenProps: (userProps: any) => any;
  }

  export interface Cell<D extends object = {}>
    extends UseGroupByCellProps<D>,
      UseRowStateCellProps<D> {}

  export interface Row<D extends object = {}>
    extends UseExpandedRowProps<D>,
      UseGroupByRowProps<D> {}
}
