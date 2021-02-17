import React from "react";
import css from "./economy.css";

interface EconomyValueRecordProps {
  title: string;
  className?: string;
  deltaContent?: string;
  deltaUp?: boolean;
  deltaDown?: boolean;
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
        <div className={`${css.economy_delta}`}>
          <DeltaLabel
            smallLabel={props.smallLabel}
            content={props.deltaContent}
          />
          {props.deltaUp && (
            <div className={css.economyUp} title={"increase"} />
          )}
          {props.deltaDown && (
            <div className={css.economyDown} title={"decrease"} />
          )}
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
