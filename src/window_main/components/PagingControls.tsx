import React from "react";
import styled from "styled-components";
import { ReactSelect } from "../../shared/ReactSelect";

export const StyledInputContainer = styled.div.attrs(props => ({
  className: (props.className ?? "") + " input_container"
}))`
  display: inline-flex;
  margin: inherit;
  position: relative;
  width: 100%;
  height: 26px;
  padding-bottom: 4px;
  input[type="number"]::-webkit-inner-spin-button,
  input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  &.input_container input {
    margin: 0;
    width: calc(100% - 10px);
    padding: 2px 4px;
    position: absolute;
    left: 0;
    right: 0;
  }
  &:hover input {
    color: rgba(255, 255, 255, 1);
    background-color: var(--color-mid-50);
    border: 1px solid var(--color-light);
  }
`;

export interface PagingControlsProps {
  canPreviousPage: boolean;
  canNextPage: boolean;
  pageOptions: any;
  pageCount: number;
  gotoPage: any;
  nextPage: any;
  previousPage: any;
  setPageSize: any;
  pageIndex: number;
  pageSize: number;
}

export default function PagingControls({
  canPreviousPage,
  canNextPage,
  pageOptions,
  pageCount,
  gotoPage,
  nextPage,
  previousPage,
  setPageSize,
  pageIndex,
  pageSize
}: PagingControlsProps): JSX.Element {
  const expandButtons = pageCount < 10;

  let pageButtons: JSX.Element[] | JSX.Element = [];
  if (expandButtons) {
    for (let n = 0; n < pageCount; n++) {
      pageButtons.push(
        <button
          key={n}
          className={
            pageIndex === n
              ? "paging_active paging_button_disabled"
              : "paging_button"
          }
          style={{ width: "initial", height: "initial", minWidth: "30px" }}
          onClick={(): void => gotoPage(n)}
          disabled={pageIndex === n}
        >
          {n + 1}
        </button>
      );
    }
  } else {
    const prompt = "Go to page";
    pageButtons = (
      <>
        <span className={"paging_text"}>Page</span>
        <StyledInputContainer
          title={prompt}
          style={{ width: "50px", margin: "0 4px" }}
        >
          <input
            type="number"
            defaultValue={""}
            onBlur={(e): void => {
              const page = e.target.value ? Number(e.target.value) - 1 : 0;
              gotoPage(page);
              e.target.value = "";
            }}
            onKeyUp={(e: any): void => {
              if (e.keyCode === 13) {
                e.target.blur();
              }
            }}
            style={{ width: "40px" }}
            placeholder={pageIndex + 1}
          />
        </StyledInputContainer>
        <span className={"paging_text"}>
          <strong>of {pageOptions?.length}</strong>{" "}
        </span>
      </>
    );
  }

  return (
    <div className={"paging_container"}>
      {!expandButtons && (
        <button
          className={
            canPreviousPage
              ? "paging_button"
              : "paging_active paging_button_disabled"
          }
          style={{ width: "initial", height: "initial", minWidth: "30px" }}
          onClick={(): void => gotoPage(0)}
          disabled={!canPreviousPage}
        >
          {"<<"}
        </button>
      )}
      <button
        className={
          canPreviousPage ? "paging_button" : " paging_button_disabled"
        }
        style={{ width: "initial", height: "initial", minWidth: "30px" }}
        onClick={(): void => previousPage()}
        disabled={!canPreviousPage}
      >
        {"<"}
      </button>
      {pageButtons}
      <button
        className={canNextPage ? "paging_button" : " paging_button_disabled"}
        style={{ width: "initial", height: "initial", minWidth: "30px" }}
        onClick={(): void => nextPage()}
        disabled={!canNextPage}
      >
        {">"}
      </button>
      {!expandButtons && (
        <button
          className={
            canNextPage
              ? "paging_button"
              : "paging_active paging_button_disabled"
          }
          style={{ width: "initial", height: "initial", minWidth: "30px" }}
          onClick={(): void => gotoPage(pageCount - 1)}
          disabled={!canNextPage}
        >
          {">>"}
        </button>
      )}
      <div className={"select_container"} style={{ width: "140px" }}>
        <ReactSelect
          current={String(pageSize)}
          options={["10", "25", "50", "100"]}
          optionFormatter={(pageSize): JSX.Element => (
            <option key={pageSize} value={pageSize}>
              Show {pageSize}
            </option>
          )}
          callback={(val): void => setPageSize(Number(val))}
        />
      </div>
    </div>
  );
}
