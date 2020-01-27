// Disalbing this rule for this file since this is a known hack.
/* eslint-disable @typescript-eslint/no-namespace */

import React from "react";

export interface RelativeTimeProps
  extends React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLElement>,
    HTMLElement
  > {
  datetime: string;
}

// Because web components don't type check natively, do this hack.
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "relative-time": RelativeTimeProps;
    }
  }
}

export default function RelativeTime(props: RelativeTimeProps): JSX.Element {
  return <relative-time {...props} />;
}
