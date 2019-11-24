import {
  formatNumber,
  formatPercent,
  toggleArchived,
} from "../../renderer-util";
import db from "../../../shared/database";
import { getCollationSet, getPrettyContext, vaultPercentFormat } from '../../economyUtils';
import pd from "../../../shared/player-data";
import {
  collectionSortRarity,
  getCardImage,
  openScryfallCard,
  getCardArtCrop,
} from "../../../shared/util";

import { addCardHover } from "../../../shared/card-hover";

import React, { useState } from "react";
import EconomyValueRecord, { EconomyIcon } from "./EconomyValueRecord";
import ReactDOM from "react-dom";
import LocalTime from "../../../shared/time-components/LocalTime";

function EconomyRowDate(date: Date) {
  return (
    <LocalTime datetime={date.toISOString()} month={"short"} day={"numeric"} hour={"numeric"} minute={"numeric"} />
  );
}

interface BoosterDeltaProps {
  booster: { collationId: number, count: number };
}

function BoosterDelta(props: BoosterDeltaProps) {
  const { booster } = props;
  const set = getCollationSet(booster.collationId);
  return <EconomyValueRecord iconClassName={"set_logo_med"} iconUrl={"url(../images/sets/" + db.sets[set].code + ".png)"} title={set} deltaContent={"x" + Math.abs(booster.count)} />
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

function getThingsToCheck(fullContext: string, change: any): PossibleModifiedEconomyStats {
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
      return (
        fullContext.includes("Store") ||
        fullContext.includes("Purchase")
      ) ? {
          checkGemsEarnt: (change.delta.gemsDelta > 0),
          checkGemsPaid: (change.delta.gemsDelta < 0),
          checkGoldEarnt: (change.delta.goldDelta > 0),
          checkGoldPaid: (change.delta.goldDelta < 0),
          checkBoosterAdded: true,
          checkCardsAdded: true,
          checkAetherized: true,
          checkWildcardsAdded: true,
          checkSkinsAdded: true,
        } : {
          checkGemsEarnt: true,
          checkGoldEarnt: true,
          checkBoosterAdded: true,
          checkCardsAdded: true,
          checkAetherized: true,
          checkWildcardsAdded: true,
          checkSkinsAdded: true,
        }
  }
}

interface WildcardEconomyValueRecordProps {
  count: number;
  title: string;
  className: string;
  smallLabel?: boolean;
}

function WildcardEconomyValueRecord(props: WildcardEconomyValueRecordProps) {
  const { count, title, className, smallLabel } = props;
  return <EconomyValueRecord iconClassName={"economy_wc " + className} title={title} smallLabel={smallLabel} deltaContent={"x" + Math.abs(count)} />
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

function AllWildcardsEconomyValueRecord(props: AllWildcardsEconomyValueRecordProps) {
  const { delta, isSmall } = props;
  return (
    <>
      {!!delta.wcCommonDelta && <WildcardEconomyValueRecord count={delta.wcCommonDelta} title={"Common Wildcard"} className={"wc_common"} smallLabel={isSmall} />}
      {!!delta.wcUncommonDelta && <WildcardEconomyValueRecord count={delta.wcUncommonDelta} title={"Uncommon Wildcard"} className={"wc_uncommon"} smallLabel={isSmall} />}
      {!!delta.wcRareDelta && <WildcardEconomyValueRecord count={delta.wcRareDelta} title={"Rare Wildcard"} className={"wc_rare"} smallLabel={isSmall} />}
      {!!delta.wcMythicDelta && <WildcardEconomyValueRecord count={delta.wcMythicDelta} title={"Mythic Wildcard"} className={"wc_mythic"} smallLabel={isSmall} />}
    </>
  )
}

interface FlexBottomProps {
  fullContext: string;
  change: any;
  thingsToCheck: PossibleModifiedEconomyStats;
}

function FlexBottom(props: FlexBottomProps) {
  const { fullContext, change, thingsToCheck } = props;
  const { checkGemsPaid, checkGoldPaid } = thingsToCheck;
  return (
    <div className={"flex_bottom"}>
      {fullContext === "Booster Open" ? change.delta.boosterDelta.map((booster: any) => <BoosterDelta booster={booster} key={booster.collationId} />) : fullContext === "Redeem Wildcard" ? (
        <AllWildcardsEconomyValueRecord delta={change.delta} isSmall />
      ) : undefined
      }
      {checkGemsPaid && !!change.delta.gemsDelta && <EconomyValueRecord iconClassName={"economy_gems"} title={"Gems"} smallLabel deltaContent={formatNumber(Math.abs(change.delta.gemsDelta))} />}
      {checkGoldPaid && !!change.delta.goldDelta && <EconomyValueRecord iconClassName={"economy_gold"} title={"Gold"} smallLabel deltaContent={formatNumber(Math.abs(change.delta.goldDelta))} />}
    </div>
  )
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

function CardPoolAddedEconomyValueRecord(props: CardPoolAddedEconomyValueRecordProps) {
  const { addedCardIds, aetherizedCardIds } = props;

  return (<>
    <InventoryCardList cardsList={addedCardIds} isAetherized={false} />
    <InventoryCardList cardsList={aetherizedCardIds} isAetherized={true} />
  </>);
}

function InventoryCardList(props: InventoryCardListProps) {
  const { cardsList, isAetherized } = props;
  const uniqueCardList = countDupesArray(cardsList);

  return (
    <>
      {Object.entries(uniqueCardList).map((entry: [string, number]) => <InventoryCard key={entry[0]} card={db.card(entry[0])} quantity={entry[1]} isAetherized={isAetherized} />)}
    </>
  )
}


interface FlexRightProps {
  fullContext: string;
  change: any;
  thingsToCheck: PossibleModifiedEconomyStats;
  economyId: string
}

function FlexRight(props: FlexRightProps) {
  const { fullContext, change, thingsToCheck, economyId } = props;
  const { checkAetherized, checkBoosterAdded, checkCardsAdded, checkGemsEarnt, checkGoldEarnt, checkSkinsAdded, checkWildcardsAdded } = thingsToCheck;

  const lvlDelta = change.trackDiff && Math.abs(
    (change.trackDiff.currentLevel || 0) - (change.trackDiff.oldLevel || 0)
  );

  const orbDelta = change.orbCountDiff && Math.abs(
    (change.orbCountDiff.currentOrbCount || 0) -
    (change.orbCountDiff.oldOrbCount || 0)
  );

  const checkCards = checkCardsAdded && change.delta.cardsAdded && change.delta.cardsAdded.length > 0;

  if (checkCards) {
    // presort here
    change.delta.cardsAdded.sort(collectionSortRarity);
  }

  const checkAether = checkAetherized && change.aetherizedCards && change.aetherizedCards.length > 0;
  const aetherCards: string[] = checkAether ? change.aetherizedCards.reduce(
    (aggregator: string[], obj: { grpId: string }) => {
      var grpId = obj.grpId;
      if (change.delta.cardsAdded) {
        if (change.delta.cardsAdded.indexOf(grpId) == -1) {
          aggregator.push(grpId);
        }
      } else {
        aggregator.push(grpId);
      }
      return aggregator;
    }
    , []) : [];

  const checkSkins = checkSkinsAdded && change.delta.artSkinsAdded !== undefined;
  const skinsToCards = checkSkins ? change.delta.artSkinsAdded.map((obj: { artId: string }) => db.cardFromArt(obj.artId)) : undefined;

  const xpGainedNumber = change.xpGained && parseInt(change.xpGained);
  return (
    <div className={"tiny_scroll list_economy_awarded"} id={economyId}>
      {fullContext === "Pay Event Entry" && <EconomyIcon title={"Event Entry"} className={"economy_ticket_med"} />}
      {checkGemsEarnt && !!change.delta.gemsDelta && <EconomyValueRecord iconClassName={"economy_gems"} title={"Gems"} deltaContent={formatNumber(Math.abs(change.delta.gemsDelta))} />}
      {checkGoldEarnt && !!change.delta.goldDelta && <EconomyValueRecord iconClassName={"economy_gold marginLeft"} title={"Gold"} deltaContent={formatNumber(Math.abs(change.delta.goldDelta))} />}
      {!!lvlDelta && <EconomyValueRecord iconClassName={"economy_mastery_med"} title={`Mastery Level (${pd.economy.trackName})`} deltaContent={"+" + formatNumber(lvlDelta)} />}
      {!!orbDelta && <EconomyValueRecord iconClassName={"economy_mastery_med"} title={"Orbs"} deltaContent={formatNumber(orbDelta)} />}
      {!!xpGainedNumber && <EconomyValueRecord iconClassName={"economy_exp"} title={"Experience"} deltaContent={formatNumber(xpGainedNumber)} />}
      {checkBoosterAdded && change.delta.boosterDelta && change.delta.boosterDelta.map((booster: any) => <BoosterDelta booster={booster} key={booster.collationId} />)}
      {checkWildcardsAdded && <AllWildcardsEconomyValueRecord delta={change.delta} />}
      {(checkCards || checkAether) && <CardPoolAddedEconomyValueRecord addedCardIds={change.delta.cardsAdded} aetherizedCardIds={aetherCards} />}
      {skinsToCards && skinsToCards.map((card: any) => <EconomyIcon key={economyId + "_" + card.id} title={card.name + " Skin"} className={"economy_skin_art"} url={`url("${getCardArtCrop(card)}")`} />)}
    </div>
  )
}

interface InventoryCardProps {
  card: any;
  isAetherized?: boolean;
  quantity?: number;
}

function InventoryCard(props: InventoryCardProps) {
  const { card, isAetherized, quantity } = props;
  const inventoryCardRef = React.useRef(null);
  const onCardClick = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const lookupCard = card.dfc == "SplitHalf" ? db.card(card.dfcId) : card;
    openScryfallCard(lookupCard);
  }, [card]);
  // inventoryCard.style.width = "39px";

  React.useEffect(() => {
    if (inventoryCardRef) {
      addCardHover(inventoryCardRef.current, card);
    }
  });

  const tooltip = isAetherized ? computeAetherizedTooltip(card, quantity) : card.name;
  return (
    <div ref={inventoryCardRef} className={"inventory_card small"} onClick={onCardClick}>
      <img className={"inventory_card_img 39px" + (isAetherized ? " inventory_card_aetherized" : "")} src={getCardImage(card)} title={tooltip} />
      {(quantity && quantity > 1) && <div className={"inventory_card_quantity_container"}>
        <span className={"inventory_card_quantity"}>{"x" + quantity}</span>
      </div>}
    </div>
  )
}

function computeAetherizedTooltip(card: any, quantity?: number) {
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
      tooltip +=
        ` (Vault: +${formatPercent(multiplier / 300, vaultPercentFormat as any)})`;
      break;
    case "common":
      tooltip +=
        ` (Vault: +${formatPercent(multiplier / 900, vaultPercentFormat as any)})`;
      break;
  }
  return tooltip;
}

interface FlexTopProps {
  fullContext: string;
  change: any;
}

function FlexTop(props: FlexTopProps) {
  const { change, fullContext } = props;
  // flexTop.style.lineHeight = "32px";
  return (
    <div className={"flex_top economy_sub"}>
      <span title={change.originalContext}>{fullContext}</span>
      <div className={"list_economy_time"}>{EconomyRowDate(new Date(change.date))}</div>
    </div>
  )
}

interface DeleteButtonProps {
  change: any;
  economyId: string;
  hideRowCallback: () => void;
}

function DeleteButton(props: DeleteButtonProps) {
  const { change, economyId, hideRowCallback } = props;
  const archiveClass = change.archived
    ? "list_item_unarchive"
    : "list_item_archive";

  const title = change.archived
    ? "restore"
    : "archive (will not delete data)";

  const archiveCallback = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!change.archived) {
      hideRowCallback();
    }
    toggleArchived(economyId);
  }, []);

  return (
    <div className={"flex_item " + economyId + "_del " + archiveClass} onClick={archiveCallback} />
  )
}

interface ChangeRowProps {
  economyId: string;
  change: any;
}

function ChangeRow(props: ChangeRowProps) {
  const { economyId, change } = props;
  const fullContext = getPrettyContext(change.originalContext);
  const thingsToCheck = getThingsToCheck(fullContext, change);

  const flexTopProps = {
    fullContext,
    change,
  }

  const flexBottomProps = {
    ...flexTopProps,
    thingsToCheck,
  }

  const flexRightProps = {
    ...flexBottomProps,
    economyId,
  }

  const [isHidden, setIsHidden] = React.useState(false)

  const hideRowCallback = React.useCallback(() => {
    setIsHidden(true);
  }, []);

  return (
    <div className={economyId + " list_economy" + (isHidden ? " economy_row_hidden" : "")} >
      <div className={"flex_item flexLeft"}>
        <FlexTop {...flexTopProps} />
        <FlexBottom {...flexBottomProps} />
      </div>
      <FlexRight {...flexRightProps} />
      <DeleteButton change={change} economyId={economyId} hideRowCallback={hideRowCallback} />
    </div>
  )
}

export function createChangeRow(change: any, economyId: string) {
  const container = document.createElement('div');
  ReactDOM.render(<ChangeRow change={change} economyId={economyId} />, container);

  return container;
}