// Disalbing this rule for this file since this is a known hack.
/* eslint-disable @typescript-eslint/no-namespace */

import React from "react";

// https://github.com/github/time-elements#options
type numericOptions = "2-digit" | "numeric";
type textOptions = "short" | "long";
export interface LocalTimeProps
  extends React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLElement>,
    HTMLElement
  > {
  datetime: string;
  year?: numericOptions;
  month?: textOptions;
  day?: numericOptions;
  weekday?: textOptions;
  hour?: numericOptions;
  minute?: numericOptions;
  second?: numericOptions;
}

// Because web components don't type check natively, do this hack.
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "local-time": LocalTimeProps;
    }
  }
}

export default function LocalTime(props: LocalTimeProps): JSX.Element {
  return <local-time {...props} />;
}
