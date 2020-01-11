import React from "react";
import { renderEventRow } from "../../events";
import { TableViewRowProps } from "../tables/types";
import { EventTableData } from "./types";

export default function EventsListViewRow({
  row
}: TableViewRowProps<EventTableData>): JSX.Element {
  const containerRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (containerRef?.current) {
      containerRef.current.innerHTML = "";
      renderEventRow(containerRef.current, row.original);
    }
  }, [row, containerRef]);
  return <div title={"show event details"} ref={containerRef} />;
}
