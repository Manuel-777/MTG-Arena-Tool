import React from "react";

interface ButtonProps {
  onClick: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  text: string;
  style?: React.CSSProperties;
  class?: string
}

export default function Button(props: ButtonProps): JSX.Element {
  return (
    <div
      style={props.style || {}}
      onClick={props.onClick}
      className={props.class || "button_simple centered"}
    >
      {props.text}
    </div>
  );
}
