import React from "react";
import { useContext } from "../../app/web-provider";

export default function TopBar(): JSX.Element {
  const appContext = useContext();

  return (
    <div className="top">
      <div className="flex_item">
        <div className="top_logo"></div>
        <div className="top_artist">{appContext.TopArtist}</div>
      </div>
      <div className="flex_item">
        <div className="unlink" title="You are not logged-in."></div>
        <div className="notification"></div>
        <div className="button minimize"></div>
        <div className="button settings"></div>
        <div className="button close"></div>
      </div>
    </div>
  );
}
