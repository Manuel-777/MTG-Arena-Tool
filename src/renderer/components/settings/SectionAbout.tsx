/* eslint-disable @typescript-eslint/camelcase */
import React from "react";
import { ipcSend } from "../../ipcSend";
import { remote, shell } from "electron";
import db from "../../../shared/database-wrapper";
import { format, fromUnixTime } from "date-fns";
import Button from "../misc/Button";
import { useSelector } from "react-redux";
import { AppState } from "../../../shared/redux/stores/rendererStore";

import indexCss from "../../index.css";
import sharedCss from "../../../shared/shared.css";
import css from "./Sections.css";

export default function SectionAbout(): JSX.Element {
  const updateState = useSelector(
    (state: AppState) => state.renderer.updateState
  );
  return (
    <div className={css.about}>
      <div
        className={css.topLogoAbout}
        onClick={(): void => {
          shell.openExternal("https://mtgatool.com");
        }}
      ></div>
      <div className={`${indexCss.messageSub15}`}>
        By Manuel Etchegaray, 2020
      </div>
      <div
        className={`${indexCss.messageSub15} ${css.releaseNotesLink}`}
        onClick={(): void => {
          shell.openExternal("https://mtgatool.com/release-notes/");
        }}
      >
        {"Version " + remote.app.getVersion()}
      </div>
      {db.metadata ? (
        <div className={`${indexCss.messageSub15}`}>
          Metadata: version {db.metadata.version || "???"}, updated{" "}
          {db.metadata.updated
            ? format(fromUnixTime(db.metadata.updated / 1000), "Pp")
            : "???"}
        </div>
      ) : (
        <></>
      )}
      <div className={`${indexCss.messageUpdates} ${sharedCss.green}`}>
        {updateState || "-"}
      </div>
      <Button
        text="Check for Updates"
        onClick={(): void => {
          ipcSend("updates_check", true);
        }}
      />
      <div
        className={`${indexCss.messageSub15} ${css.releaseNotesLink}`}
        onClick={(): void => {
          shell.openExternal("https://mtgatool.com/release-notes");
        }}
      >
        Release Notes
      </div>
      <div
        style={{ margin: "16px auto 0px auto" }}
        className={indexCss.flexItem}
      >
        <div
          className={css.discordLink}
          onClick={(): void => {
            shell.openExternal("https://discord.gg/K9bPkJy");
          }}
        />
        <div
          className={css.twitterLink}
          onClick={(): void => {
            shell.openExternal("https://twitter.com/MEtchegaray7");
          }}
        />
        <div
          className={css.gitLink}
          onClick={(): void => {
            shell.openExternal("https://github.com/Manuel-777/MTG-Arena-Tool");
          }}
        />
      </div>
      <div
        style={{ margin: "16px 0px 16px" }}
        className={`${indexCss.messageSub15} ${sharedCss.white}`}
      >
        Support my work!
      </div>
      <div style={{ display: "flex", alignItems: "center" }}>
        <div
          className={css.donateLink}
          title="PayPal"
          onClick={(): void => {
            shell.openExternal("https://www.paypal.me/ManuelEtchegaray/10");
          }}
        />
        <div
          className={css.patreonLink}
          title="Patreon"
          onClick={(): void => {
            shell.openExternal("https://www.patreon.com/mtgatool");
          }}
        />
      </div>
    </div>
  );
}
