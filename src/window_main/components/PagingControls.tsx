import React from "react";
import { ReactSelect } from "../../shared/ReactSelect";
import { InputContainer, PagingButton } from "./display";

export interface PagingControlsProps {
  canPreviousPage: boolean;
  canNextPage: boolean;
  pageOptions: any[];
  pageCount: number;
  gotoPage: (index: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  setPageSize: (index: number) => void;
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
        <PagingButton
          key={n}
          onClick={(): void => gotoPage(n)}
          disabled={pageIndex === n}
          selected={pageIndex === n}
        >
          {n + 1}
        </PagingButton>
      );
    }
  } else {
    const prompt = "Go to page";
    pageButtons = (
      <>
        <span className={"paging_text"}>Page</span>
        <InputContainer
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
            onKeyUp={(e: React.KeyboardEvent<HTMLInputElement>): void => {
              if (e.keyCode === 13) {
                (e.target as HTMLInputElement).blur();
              }
            }}
            style={{ width: "40px" }}
            placeholder={String(pageIndex + 1)}
          />
        </InputContainer>
        <span className={"paging_text"}>
          <strong>of {pageOptions?.length}</strong>{" "}
        </span>
      </>
    );
  }

  return (
    <div className={"paging_container"}>
      {!expandButtons && (
        <PagingButton
          onClick={(): void => gotoPage(0)}
          disabled={!canPreviousPage}
          selected={!canPreviousPage}
        >
          {"<<"}
        </PagingButton>
      )}
      <PagingButton
        onClick={(): void => previousPage()}
        disabled={!canPreviousPage}
      >
        {"<"}
      </PagingButton>
      {pageButtons}
      <PagingButton onClick={(): void => nextPage()} disabled={!canNextPage}>
        {">"}
      </PagingButton>
      {!expandButtons && (
        <PagingButton
          style={{ width: "initial", height: "initial", minWidth: "30px" }}
          onClick={(): void => gotoPage(pageCount - 1)}
          disabled={!canNextPage}
          selected={!canNextPage}
        >
          {">>"}
        </PagingButton>
      )}
      <div
        className={"select_container"}
        style={{ width: "140px" }}
        key={pageSize} // for some reason, React needs this to refresht the ReactSelect
      >
        <ReactSelect
          current={String(pageSize)}
          options={["10", "25", "50", "100"]}
          optionFormatter={(pageSize): string => "Show " + pageSize}
          callback={(val): void => setPageSize(Number(val))}
        />
      </div>
    </div>
  );
}
