// Disalbing this rule for this file since this is a known hack.
/* eslint-disable @typescript-eslint/no-namespace */

import React from "react";

export interface LocalTimeProps
  extends React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLElement>,
    HTMLElement
  > {
  datetime: string;
  year?: string;
  month?: string;
  day?: string;
  hour?: string;
  minute?: string;
}

// Because web components don't type check natively, do this hack.
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "local-time": LocalTimeProps;
    }
  }
}

export default function LocalTime(props: LocalTimeProps) {
  return <local-time {...props} />;
}
