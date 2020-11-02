import React from "react";
import css from "./economy.css";

interface EconomyValueRecordProps {
  deltaUpContent?: string;
  title: string;
  className?: string;
  deltaDownContent?: string;
  deltaContent?: string;
  iconClassName?: string;
  smallLabel?: boolean;
  iconUrl?: string;
}

export default function EconomyValueRecord(
  props: EconomyValueRecordProps
): JSX.Element {
  return (
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
        <div className={`${css.economy_delta} upConta`}>
          <DeltaLabel content={props.deltaUpContent} />
          <div className={css.economyUp} title={"increase"} />
        </div>
      )}
      {props.deltaDownContent && (
        <div className={`${css.economy_delta} downConta`}>
          <DeltaLabel content={props.deltaDownContent} />
          <div className={css.economyDown} title={"decrease"} />
        </div>
      )}
    </>
  );
}

function DeltaLabel(props: {
  content: string;
  smallLabel?: boolean;
}): JSX.Element {
  return (
    <div
      className={css.economy_sub + " " + (props.smallLabel ? css.small : "")}
    >
      {props.content}
    </div>
  );
}

interface EconomyIconProps {
  title: string;
  className: string;
  url?: string;
}

export function EconomyIcon(props: EconomyIconProps): JSX.Element {
  return (
    <div
      className={props.className}
      style={props.url ? { backgroundImage: props.url } : undefined}
      title={props.title}
    />
  );
}
