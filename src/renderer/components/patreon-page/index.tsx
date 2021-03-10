import { shell } from "electron";

import React from "react";
import css from "./index.css";
import Section from "../misc/Section";

import cardsShowcase from "../../../assets/images/cards-showcase.png";

type PatreonPageTypes = "" | "cards";

export default function PatreonPage(props: {
  page: PatreonPageTypes;
}): JSX.Element {
  const { page } = props;
  return (
    <div>
      <Section
        style={{
          padding: "16opx",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0px 8px 12px 3px #00000075",
        }}
      >
        <div className={css.patreonInfoPopTop}>
          <div
            style={{ color: "var(--color-text-hover)" }}
            className={css.messageSub}
          >
            You discovered a Patreon exclusive feature!
          </div>
        </div>
        <div className={css.patreonInfoPopBottom}>
          {page == "cards" ? (
            <>
              <div className={css.patreonInfoText}>
                Access global cards winrates statistics!
              </div>
              <div
                className={css.showcaseImage}
                style={{ backgroundImage: `url(${cardsShowcase})` }}
              />
            </>
          ) : (
            <></>
          )}

          <div
            className={css.patreonLinkThin}
            title="Open on browser"
            onClick={(): void => {
              shell.openExternal("https://www.patreon.com/mtgatool");
            }}
          />
        </div>
      </Section>
    </div>
  );
}
