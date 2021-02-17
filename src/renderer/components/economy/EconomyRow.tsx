/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-use-before-define */
import React from "react";
import db from "../../../shared/database-wrapper";
import LocalTime from "../../../shared/time-components/LocalTime";
import { openScryfallCard } from "../../../shared/utils/openScryfallCard";
import collectionSortRarity from "../../../shared/utils/collectionSortRarity";
import useHoverCard from "../../hooks/useHoverCard";
import { formatNumber } from "../../rendererUtil";
import {
  getCollationSet,
  getReadableCode,
  vaultPercentFormat,
} from "./economyUtils";
import EconomyValueRecord, { EconomyIcon } from "./EconomyValueRecord";
import { useSelector } from "react-redux";
import { AppState } from "../../../shared/redux/stores/rendererStore";

import notFound from "../../../assets/images/notfound.png";
import indexCss from "../../index.css";
import listCss from "../list-item/ListItem.css";
import css from "./economy.css";
import {
  getCardArtCrop,
  getCardImage,
} from "../../../shared/utils/getCardArtCrop";
import { DbCardData, formatPercent } from "mtgatool-shared";

function EconomyRowDate(date: Date): JSX.Element {
  return (
    <LocalTime
      datetime={date.toISOString()}
      year={"numeric"}
      month={"short"}
      day={"numeric"}
      hour={"numeric"}
      minute={"numeric"}
    />
  );
}

interface BoosterDeltaProps {
  booster: { collationId: number; count: number };
}

function BoosterDelta(props: BoosterDeltaProps): JSX.Element {
  const { booster } = props;
  const set = getCollationSet(booster.collationId);
  const imagePath =
    db.sets[set] && db.sets[set].code
      ? `url(data:image/svg+xml;base64,${db.sets[set].svg})`
      : `url(${notFound})`;
  return (
    <EconomyValueRecord
      iconClassName={indexCss.set_logo_med}
      iconUrl={imagePath}
      title={set + " Boosters"}
      deltaContent={"x" + Math.abs(booster.count)}
    />
  );
}

interface PossibleModifiedEconomyStats {
  checkGemsPaid?: boolean;
  checkGoldPaid?: boolean;
  checkCardsAdded?: boolean;
  checkBoosterAdded?: boolean;
  checkAetherized?: boolean;
  checkWildcardsAdded?: boolean;
  checkGoldEarnt?: boolean;
  checkGemsEarnt?: boolean;
  checkSkinsAdded?: boolean;
}

export function getThingsToCheck(
  fullContext: string,
  change: any
): PossibleModifiedEconomyStats {
  switch (fullContext) {
    case "Booster Open":
      return {
        checkGemsEarnt: true,
        checkCardsAdded: true,
        checkAetherized: true,
        checkWildcardsAdded: true,
      };
    case "Booster Redeem":
      return {
        checkGemsPaid: true,
        checkGoldPaid: true,
        checkBoosterAdded: true,
      };
    case "Pay Event Entry":
      return {
        checkGemsPaid: true,
        checkGoldPaid: true,
      };
    case "Redeem Wildcard":
      return {
        checkCardsAdded: true,
        checkAetherized: true,
      };
    default:
      return fullContext.includes("Store") || fullContext.includes("Purchase")
        ? {
            checkGemsEarnt: change.delta.gemsDelta > 0,
            checkGemsPaid: change.delta.gemsDelta < 0,
            checkGoldEarnt: change.delta.goldDelta > 0,
            checkGoldPaid: change.delta.goldDelta < 0,
            checkBoosterAdded: true,
            checkCardsAdded: true,
            checkAetherized: true,
            checkWildcardsAdded: true,
            checkSkinsAdded: true,
          }
        : {
            checkGemsEarnt: true,
            checkGoldEarnt: true,
            checkBoosterAdded: true,
            checkCardsAdded: true,
            checkAetherized: true,
            checkWildcardsAdded: true,
            checkSkinsAdded: true,
          };
  }
}

interface WildcardEconomyValueRecordProps {
  count: number;
  title: string;
  className: string;
  smallLabel?: boolean;
}

function WildcardEconomyValueRecord(
  props: WildcardEconomyValueRecordProps
): JSX.Element {
  const { count, title, className, smallLabel } = props;
  return (
    <EconomyValueRecord
      iconClassName={css.economy_wc + " " + className}
      title={title}
      smallLabel={smallLabel}
      deltaContent={"x" + Math.abs(count)}
    />
  );
}

interface WildcardDelta {
  wcCommonDelta: number;
  wcUncommonDelta: number;
  wcRareDelta: number;
  wcMythicDelta: number;
}

interface AllWildcardsEconomyValueRecordProps {
  delta: WildcardDelta;
  isSmall?: boolean;
}

function AllWildcardsEconomyValueRecord(
  props: AllWildcardsEconomyValueRecordProps
): JSX.Element {
  const { delta, isSmall } = props;
  return (
    <>
      {delta && delta.wcCommonDelta ? (
        <WildcardEconomyValueRecord
          count={delta.wcCommonDelta}
          title={"Common Wildcard"}
          className={indexCss.wcCommon}
          smallLabel={isSmall}
        />
      ) : (
        <></>
      )}
      {delta && delta.wcUncommonDelta ? (
        <WildcardEconomyValueRecord
          count={delta.wcUncommonDelta}
          title={"Uncommon Wildcard"}
          className={indexCss.wcUncommon}
          smallLabel={isSmall}
        />
      ) : (
        <></>
      )}
      {delta && delta.wcRareDelta ? (
        <WildcardEconomyValueRecord
          count={delta.wcRareDelta}
          title={"Rare Wildcard"}
          className={indexCss.wcRare}
          smallLabel={isSmall}
        />
      ) : (
        <></>
      )}
      {delta && delta.wcMythicDelta ? (
        <WildcardEconomyValueRecord
          count={delta.wcMythicDelta}
          title={"Mythic Wildcard"}
          className={indexCss.wcMythic}
          smallLabel={isSmall}
        />
      ) : (
        <></>
      )}
    </>
  );
}

interface FlexBottomProps {
  fullContext: string;
  change: any;
  thingsToCheck: PossibleModifiedEconomyStats;
}

export function FlexBottom(props: FlexBottomProps): JSX.Element {
  const { fullContext, change, thingsToCheck } = props;
  const { checkGemsPaid, checkGoldPaid } = thingsToCheck;
  return (
    <div className={indexCss.flex_bottom}>
      {fullContext === "Booster Open" ? (
        change.delta.boosterDelta.map((booster: any) => (
          <BoosterDelta booster={booster} key={booster.collationId} />
        ))
      ) : fullContext === "Redeem Wildcard" ? (
        <AllWildcardsEconomyValueRecord delta={change.delta} isSmall />
      ) : undefined}
      {checkGemsPaid && !!change.delta.gemsDelta && (
        <EconomyValueRecord
          iconClassName={css.economy_gems}
          title={"Gems"}
          smallLabel
          deltaContent={formatNumber(Math.abs(change.delta.gemsDelta))}
        />
      )}
      {checkGoldPaid && !!change.delta.goldDelta && (
        <EconomyValueRecord
          iconClassName={css.economy_gold}
          title={"Gold"}
          smallLabel
          deltaContent={formatNumber(Math.abs(change.delta.goldDelta))}
        />
      )}
    </div>
  );
}

interface CardPoolAddedEconomyValueRecordProps {
  addedCardIds: string[];
  aetherizedCardIds: string[];
}

function countDupesArray(array: string[] | undefined): Record<string, number> {
  if (!array) {
    return {};
  }
  const counted: Record<string, number> = {};
  array.forEach((value) => {
    counted[value] = counted[value] ? counted[value] + 1 : 1;
  });
  return counted;
}

interface InventoryCardListProps {
  cardsList: string[];
  isAetherized: boolean;
}

export function CardPoolAddedEconomyValueRecord(
  props: CardPoolAddedEconomyValueRecordProps
): JSX.Element {
  const { addedCardIds, aetherizedCardIds } = props;
  return (
    <>
      <InventoryCardList cardsList={addedCardIds} isAetherized={false} />
      <InventoryCardList cardsList={aetherizedCardIds} isAetherized={true} />
    </>
  );
}

function InventoryCardList(props: InventoryCardListProps): JSX.Element {
  const { cardsList, isAetherized } = props;
  const uniqueCardList = countDupesArray(cardsList);
  const cardCounts = Object.entries(uniqueCardList);
  cardCounts.sort((a: [string, number], b: [string, number]): number =>
    collectionSortRarity(parseInt(a[0]), parseInt(b[0]))
  );
  return (
    <>
      {cardCounts.map(([grpId, quantity]: [string, number]) => {
        const card = db.card(parseInt(grpId));
        if (!card || quantity === 0) {
          return <></>;
        }
        return (
          <InventoryCard
            key={grpId}
            card={card}
            quantity={quantity}
            isAetherized={isAetherized}
          />
        );
      })}
    </>
  );
}

interface FlexRightProps {
  fullContext: string;
  change: any;
  thingsToCheck: PossibleModifiedEconomyStats;
  economyId: string;
}

export function FlexRight(props: FlexRightProps): JSX.Element {
  const { trackName } = useSelector(
    (state: AppState) => state.playerdata.economy
  );
  const { fullContext, change, thingsToCheck, economyId } = props;
  const {
    checkAetherized,
    checkBoosterAdded,
    checkGemsEarnt,
    checkGoldEarnt,
    checkSkinsAdded,
    checkWildcardsAdded,
  } = thingsToCheck;

  const lvlDelta =
    change.trackDiff &&
    Math.abs(
      (change.trackDiff.currentLevel || 0) - (change.trackDiff.oldLevel || 0)
    );

  const orbDelta =
    change.orbCountDiff &&
    Math.abs(
      (change.orbCountDiff.currentOrbCount || 0) -
        (change.orbCountDiff.oldOrbCount || 0)
    );
  //debugLog(change, props);
  const checkCards =
    change.cardsAddedCount > 0 &&
    change.delta.cardsAdded &&
    change.delta.cardsAdded.length > 0;

  const checkAether =
    checkAetherized &&
    change.aetherizedCardsCount > 0 &&
    change.aetherizedCards &&
    change.aetherizedCards.length > 0;
  const aetherCards: string[] = checkAether
    ? change.aetherizedCards.reduce(
        (aggregator: string[], obj: { grpId: string }) => {
          const grpId = obj.grpId;
          if (change.delta.cardsAdded) {
            if (change.delta.cardsAdded.indexOf(grpId) == -1) {
              aggregator.push(grpId);
            }
          } else {
            aggregator.push(grpId);
          }
          return aggregator;
        },
        []
      )
    : [];

  const checkSkins =
    change.artSkinsAddedCount > 0 &&
    checkSkinsAdded &&
    change.delta.artSkinsAdded !== undefined;
  const skinsToCards = checkSkins
    ? change.delta.artSkinsAdded.map((obj: { artId: string }) =>
        db.cardFromArt(obj.artId)
      )
    : undefined;
  const vanityCodes: string[] | undefined =
    change.vanityAddedCount > 0 && change.delta.vanityItemsAdded;

  const xpGainedNumber = change.xpGained > 0 && parseInt(change.xpGained);
  return (
    <div
      className={css.tiny_scroll + " " + listCss.list_economy_awarded}
      id={economyId}
    >
      {fullContext === "Pay Event Entry" ? (
        <EconomyIcon title={"Event Entry"} className={"economy_ticket_med"} />
      ) : (
        <></>
      )}
      {checkGemsEarnt && change.delta && !!change.delta.gemsDelta ? (
        <EconomyValueRecord
          iconClassName={css.economy_gems}
          title={"Gems"}
          deltaContent={formatNumber(Math.abs(change.delta.gemsDelta))}
        />
      ) : (
        <></>
      )}
      {checkGoldEarnt && change.delta && !!change.delta.goldDelta ? (
        <EconomyValueRecord
          iconClassName={css.economy_gold + " " + css.marginLeft}
          title={"Gold"}
          deltaContent={formatNumber(Math.abs(change.delta.goldDelta))}
        />
      ) : (
        <></>
      )}
      {lvlDelta ? (
        <EconomyValueRecord
          iconClassName={css.economy_mastery_med}
          title={`Mastery Level (${trackName})`}
          deltaContent={"+" + formatNumber(lvlDelta)}
        />
      ) : (
        <></>
      )}
      {orbDelta ? (
        <EconomyValueRecord
          iconClassName={css.economy_mastery_med}
          title={"Orbs"}
          deltaContent={formatNumber(orbDelta)}
        />
      ) : (
        <></>
      )}
      {xpGainedNumber ? (
        <EconomyValueRecord
          iconClassName={css.economy_exp}
          title={"Experience"}
          deltaContent={formatNumber(xpGainedNumber)}
        />
      ) : (
        <></>
      )}
      {change.delta && Math.abs(change.delta.draftTokensDelta) > 0 ? (
        <EconomyValueRecord
          iconClassName={css.economy_ticket_med}
          title={"Traditional Draft Entry Tokens"}
          smallLabel
          deltaContent={formatNumber(change.delta.draftTokensDelta)}
        />
      ) : (
        <></>
      )}
      {change.delta && Math.abs(change.delta.sealedTokensDelta) > 0 ? (
        <EconomyValueRecord
          iconClassName={css.economy_ticket_med}
          title={"Sealed Entry Tokens"}
          smallLabel
          deltaContent={formatNumber(change.delta.sealedTokensDelta)}
        />
      ) : (
        <></>
      )}
      {checkBoosterAdded && change.delta && change.delta.boosterDelta ? (
        change.delta.boosterDelta.map((booster: any) => (
          <BoosterDelta booster={booster} key={booster.collationId} />
        ))
      ) : (
        <></>
      )}
      {checkWildcardsAdded ? (
        <AllWildcardsEconomyValueRecord delta={change.delta} />
      ) : (
        <></>
      )}
      {checkCards || checkAether ? (
        <CardPoolAddedEconomyValueRecord
          addedCardIds={change.delta.cardsAdded}
          aetherizedCardIds={aetherCards}
        />
      ) : (
        <></>
      )}
      {skinsToCards ? (
        skinsToCards.map((card: any) => (
          <EconomyIcon
            key={economyId + "_" + card.id}
            title={card.name + " Skin"}
            className={css.economy_skin_art}
            url={`url("${getCardArtCrop(card)}")`}
          />
        ))
      ) : (
        <></>
      )}
      {vanityCodes ? (
        vanityCodes.map((code) => (
          <EconomyValueRecord
            key={economyId + "_" + code}
            iconClassName={css.economy_vanity}
            title={code}
            smallLabel
            deltaContent={getReadableCode(code)}
          />
        ))
      ) : (
        <></>
      )}
    </div>
  );
}

interface InventoryCardProps {
  card?: DbCardData;
  isAetherized?: boolean;
  quantity?: number;
}

function InventoryCard(props: InventoryCardProps): JSX.Element {
  const { card, isAetherized, quantity } = props;
  const onCardClick = React.useCallback(() => {
    const lookupCard =
      card && card.dfcId && card.dfcId !== true ? db.card(card.dfcId) : card;
    openScryfallCard(lookupCard);
  }, [card]);
  const cardQuality = useSelector(
    (state: AppState) => state.settings.cards_quality
  );

  const [hoverIn, hoverOut] = useHoverCard(card?.id || 0);

  const tooltip = isAetherized
    ? computeAetherizedTooltip(card, quantity)
    : card?.name ?? "";
  return (
    <div
      onMouseEnter={hoverIn}
      onMouseLeave={hoverOut}
      className={`${indexCss.inventory_card} ${indexCss.small}`}
      onClick={onCardClick}
      style={{ margin: "auto 6px", boxShadow: "none" }}
    >
      <img
        className={`${indexCss.inventoryCardImg} ${
          isAetherized ? indexCss.inventory_card_aetherized : ""
        }`}
        src={getCardImage(card, cardQuality)}
        title={tooltip}
      />
      {quantity && quantity > 1 && (
        <div className={indexCss.inventoryCardQuantityContainer}>
          <span className={indexCss.inventoryCardQuantity}>
            {"x" + quantity}
          </span>
        </div>
      )}
    </div>
  );
}

function computeAetherizedTooltip(card: any, quantity?: number): string {
  let tooltip = card.name;
  const multiplier = quantity ? quantity : 1;
  switch (card.rarity) {
    case "mythic":
      tooltip += ` (Gems: +${multiplier * 40})`;
      break;
    case "rare":
      tooltip += ` (Gems: +${multiplier * 20})`;
      break;
    case "uncommon":
      tooltip += ` (Vault: +${formatPercent(
        multiplier / 300,
        vaultPercentFormat as any
      )})`;
      break;
    case "common":
      tooltip += ` (Vault: +${formatPercent(
        multiplier / 900,
        vaultPercentFormat as any
      )})`;
      break;
  }
  return tooltip;
}

interface FlexTopProps {
  fullContext: string;
  change: any;
}

export function FlexTop(props: FlexTopProps): JSX.Element {
  const { change, fullContext } = props;
  // flexTop.style.lineHeight = "32px";
  return (
    <div className={`${indexCss.flexTop} ${css.economy_sub}`}>
      <span title={change.originalContext}>{fullContext}</span>
      <div className={css.economyTime}>
        {EconomyRowDate(new Date(change.date))}
      </div>
    </div>
  );
}
