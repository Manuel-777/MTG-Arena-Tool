/* eslint-disable @typescript-eslint/camelcase */
import React from "react";
import { ipcSend } from "../../rendererUtil";
import { remote, shell } from "electron";
import db from "../../../shared/database";
import { format, fromUnixTime } from "date-fns";
import Button from "../misc/Button";
import { useSelector } from "react-redux";
import { AppState } from "../../../shared/redux/reducers";

export default function SectionAbout(): JSX.Element {
  const updateState = useSelector(
    (state: AppState) => state.renderer.updateState
  );
  return (
    <div className="about">
      <div
        className="top_logo_about"
        onClick={(): void => {
          shell.openExternal("https://mtgatool.com");
        }}
      ></div>
      <div className="message_sub_15 white">By Manuel Etchegaray, 2019</div>
      <div
        className="message_sub_15 white release_notes_link"
        onClick={(): void => {
          shell.openExternal("https://mtgatool.com/release-notes/");
        }}
      >
        {"Version " + remote.app.getVersion()}
      </div>
      {db.metadata ? (
        <div className="message_sub_15 white">
          Metadata: version {db.metadata.version || "???"}, updated{" "}
          {db.metadata.updated
            ? format(fromUnixTime(db.metadata.updated / 1000), "Pp")
            : "???"}
        </div>
      ) : (
        <></>
      )}
      <div className="message_updates green">{updateState || "-"}</div>
      <Button
        text="Check for Updates"
        onClick={(): void => {
          ipcSend("updates_check", true);
        }}
      />
      <div
        className="message_sub_15 white release_notes_link"
        onClick={(): void => {
          shell.openExternal("https://mtgatool.com/release-notes");
        }}
      >
        Release Notes
      </div>
      <div style={{ margin: "40px auto 0px auto" }} className="flex_item">
        <div
          className="discord_link"
          onClick={(): void => {
            shell.openExternal("https://discord.gg/K9bPkJy");
          }}
        />
        <div
          className="twitter_link"
          onClick={(): void => {
            shell.openExternal("https://twitter.com/MEtchegaray7");
          }}
        />
        <div
          className="git_link"
          onClick={(): void => {
            shell.openExternal("https://github.com/Manuel-777/MTG-Arena-Tool");
          }}
        />
      </div>
      <div style={{ margin: "24px 0 12px 0" }} className="message_sub_15 white">
        Support my work!
      </div>
      <div style={{ display: "flex", alignItems: "center" }}>
        <div
          className="donate_link"
          title="PayPal"
          onClick={(): void => {
            shell.openExternal("https://www.paypal.me/ManuelEtchegaray/10");
          }}
        />
        <div
          className="patreon_link"
          title="Patreon"
          onClick={(): void => {
            shell.openExternal("https://www.patreon.com/mtgatool");
          }}
        />
      </div>
    </div>
  );
}
