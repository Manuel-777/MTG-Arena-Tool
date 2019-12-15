import React from "react";

interface EconomyValueRecordProps {
  deltaUpContent?: string;
  title: string;
  className?: string;
  deltaDownContent?: string;
  deltaContent?: string;
  iconClassName?: string;
  containerDiv?: boolean;
  smallLabel?: boolean;
  iconUrl?: string;
}

export default function EconomyValueRecord(props: EconomyValueRecordProps) {
  const contents = (
    <>
      {props.iconClassName && (
        <EconomyIcon
          className={props.iconClassName}
          title={props.title}
          url={props.iconUrl}
        />
      )}
      {props.deltaContent && (
        <DeltaLabel
          smallLabel={props.smallLabel}
          content={props.deltaContent}
        />
      )}
      {props.deltaUpContent && (
        <div className={"economy_delta upConta"}>
          <DeltaLabel content={props.deltaUpContent} />
          <div className={"economy_up"} title={"increase"} />
        </div>
      )}
      {props.deltaDownContent && (
        <div className={"economy_delta downConta"}>
          <DeltaLabel content={props.deltaDownContent} />
          <div className={"economy_down"} title={"decrease"} />
        </div>
      )}
    </>
  );

  let gridArea = "";
  switch (props.title) {
    case "Cards":
      gridArea = "1 / 2 / auto / 3";
      break;
    case "Vault":
      gridArea = "1 / 3 / auto / 4";
      break;
    case "Gold":
      gridArea = "1 / 4 / auto / 5";
      break;
    case "Gems":
      gridArea = "1 / 5 / auto / 6";
      break;
    case "Experience":
      gridArea = "1 / 6 / auto / 7";
      break;
  }

  return props.containerDiv ? (
    <div style={{ gridArea: gridArea }} className={"economy_metric"}>
      {contents}
    </div>
  ) : (
    <>{contents}</>
  );
}

function DeltaLabel(props: { content: string; smallLabel?: boolean }) {
  return (
    <div className={"economy_sub" + (props.smallLabel ? " small" : "")}>
      {props.content}
    </div>
  );
}

interface EconomyIconProps {
  title: string;
  className: string;
  url?: string;
}

export function EconomyIcon(props: EconomyIconProps) {
  return (
    <div
      className={props.className}
      style={props.url ? { backgroundImage: props.url } : undefined}
      title={props.title}
    />
  );
}
