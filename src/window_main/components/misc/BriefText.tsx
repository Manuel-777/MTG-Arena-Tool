import React from "react";
import { LabelText } from "./LabelText";

export interface BriefTextProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  maxLength?: number;
}

export function BriefText({
  value,
  maxLength,
  ...otherProps
}: BriefTextProps): JSX.Element {
  let displayName = value ?? "";
  const cutoff = maxLength ?? 25;
  if (displayName.length > cutoff) {
    displayName = displayName.slice(0, cutoff - 3) + "...";
  }
  return (
    <LabelText title={value} {...otherProps}>
      {displayName}
    </LabelText>
  );
}
