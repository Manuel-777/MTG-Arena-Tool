/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-use-before-define */
import React from "react";

import db from "../../../shared/database";
import pd from "../../../shared/PlayerData";
import {
  collectionSortRarity,
  getCardImage,
  openScryfallCard,
  getCardArtCrop
} from "../../../shared/util";
import LocalTime from "../../../shared/time-components/LocalTime";
import { DbCardData } from "../../../types/Metadata";

import {
  formatNumber,
  formatPercent,
  toggleArchived
} from "../../rendererUtil";
import {
  getCollationSet,
  getPrettyContext,
  vaultPercentFormat,
  getReadableCode
} from "./economyUtils";

import EconomyValueRecord, { EconomyIcon } from "./EconomyValueRecord";
import useHoverCard from "../../hooks/useHoverCard";

function EconomyRowDate(date: Date): JSX.Element {
  return (
    <LocalTime
      datetime={date.toISOString()}
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
      : "url(../images/notfound.png)";
  return (
    <EconomyValueRecord
      iconClassName={"set_logo_med"}
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

function getThingsToCheck(
  fullContext: string,
  change: any
): PossibleModifiedEconomyStats {
  switch (fullContext) {
    case "Booster Open":
      return {
        checkGemsEarnt: true,
        checkCardsAdded: true,
        checkAetherized: true,
        checkWildcardsAdded: true
      };
    case "Booster Redeem":
      return {
        checkGemsPaid: true,
        checkGoldPaid: true,
        checkBoosterAdded: true
      };
    case "Pay Event Entry":
      return {
        checkGemsPaid: true,
        checkGoldPaid: true
      };
    case "Redeem Wildcard":
      return {
        checkCardsAdded: true,
        checkAetherized: true
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
            checkSkinsAdded: true
          }
        : {
            checkGemsEarnt: true,
            checkGoldEarnt: true,
            checkBoosterAdded: true,
            checkCardsAdded: true,
            checkAetherized: true,
            checkWildcardsAdded: true,
            checkSkinsAdded: true
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
      iconClassName={"economy_wc " + className}
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
      {!!delta.wcCommonDelta && (
        <WildcardEconomyValueRecord
          count={delta.wcCommonDelta}
          title={"Common Wildcard"}
          className={"wc_common"}
          smallLabel={isSmall}
        />
      )}
      {!!delta.wcUncommonDelta && (
        <WildcardEconomyValueRecord
          count={delta.wcUncommonDelta}
          title={"Uncommon Wildcard"}
          className={"wc_uncommon"}
          smallLabel={isSmall}
        />
      )}
      {!!delta.wcRareDelta && (
        <WildcardEconomyValueRecord
          count={delta.wcRareDelta}
          title={"Rare Wildcard"}
          className={"wc_rare"}
          smallLabel={isSmall}
        />
      )}
      {!!delta.wcMythicDelta && (
        <WildcardEconomyValueRecord
          count={delta.wcMythicDelta}
          title={"Mythic Wildcard"}
          className={"wc_mythic"}
          smallLabel={isSmall}
        />
      )}
    </>
  );
}

interface FlexBottomProps {
  fullContext: string;
  change: any;
  thingsToCheck: PossibleModifiedEconomyStats;
}

function FlexBottom(props: FlexBottomProps): JSX.Element {
  const { fullContext, change, thingsToCheck } = props;
  const { checkGemsPaid, checkGoldPaid } = thingsToCheck;
  return (
    <div className={"flex_bottom"}>
      {fullContext === "Booster Open" ? (
        change.delta.boosterDelta.map((booster: any) => (
          <BoosterDelta booster={booster} key={booster.collationId} />
        ))
      ) : fullContext === "Redeem Wildcard" ? (
        <AllWildcardsEconomyValueRecord delta={change.delta} isSmall />
      ) : (
        undefined
      )}
      {checkGemsPaid && !!change.delta.gemsDelta && (
        <EconomyValueRecord
          iconClassName={"economy_gems"}
          title={"Gems"}
          smallLabel
          deltaContent={formatNumber(Math.abs(change.delta.gemsDelta))}
        />
      )}
      {checkGoldPaid && !!change.delta.goldDelta && (
        <EconomyValueRecord
          iconClassName={"economy_gold"}
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
  array.forEach(value => {
    counted[value] = counted[value] ? counted[value] + 1 : 1;
  });
  return counted;
}

interface InventoryCardListProps {
  cardsList: string[];
  isAetherized: boolean;
}

function CardPoolAddedEconomyValueRecord(
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
        const card = db.card(grpId);
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

function FlexRight(props: FlexRightProps): JSX.Element {
  const { fullContext, change, thingsToCheck, economyId } = props;
  const {
    checkAetherized,
    checkBoosterAdded,
    checkGemsEarnt,
    checkGoldEarnt,
    checkSkinsAdded,
    checkWildcardsAdded
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

  const checkCards =
    change.delta.cardsAdded && change.delta.cardsAdded.length > 0;
  const checkAether =
    checkAetherized &&
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
    checkSkinsAdded && change.delta.artSkinsAdded !== undefined;
  const skinsToCards = checkSkins
    ? change.delta.artSkinsAdded.map((obj: { artId: string }) =>
        db.cardFromArt(obj.artId)
      )
    : undefined;
  const vanityCodes: string[] | undefined = change.delta.vanityItemsAdded;

  const xpGainedNumber = change.xpGained && parseInt(change.xpGained);
  return (
    <div className={"tiny_scroll list_economy_awarded"} id={economyId}>
      {fullContext === "Pay Event Entry" && (
        <EconomyIcon title={"Event Entry"} className={"economy_ticket_med"} />
      )}
      {checkGemsEarnt && !!change.delta.gemsDelta && (
        <EconomyValueRecord
          iconClassName={"economy_gems"}
          title={"Gems"}
          deltaContent={formatNumber(Math.abs(change.delta.gemsDelta))}
        />
      )}
      {checkGoldEarnt && !!change.delta.goldDelta && (
        <EconomyValueRecord
          iconClassName={"economy_gold marginLeft"}
          title={"Gold"}
          deltaContent={formatNumber(Math.abs(change.delta.goldDelta))}
        />
      )}
      {!!lvlDelta && (
        <EconomyValueRecord
          iconClassName={"economy_mastery_med"}
          title={`Mastery Level (${pd.economy.trackName})`}
          deltaContent={"+" + formatNumber(lvlDelta)}
        />
      )}
      {!!orbDelta && (
        <EconomyValueRecord
          iconClassName={"economy_mastery_med"}
          title={"Orbs"}
          deltaContent={formatNumber(orbDelta)}
        />
      )}
      {!!xpGainedNumber && (
        <EconomyValueRecord
          iconClassName={"economy_exp"}
          title={"Experience"}
          deltaContent={formatNumber(xpGainedNumber)}
        />
      )}
      {Math.abs(change.delta.draftTokensDelta) > 0 && (
        <EconomyValueRecord
          iconClassName={"economy_ticket_med"}
          title={"Traditional Draft Entry Tokens"}
          smallLabel
          deltaContent={formatNumber(change.delta.draftTokensDelta)}
        />
      )}
      {Math.abs(change.delta.sealedTokensDelta) > 0 && (
        <EconomyValueRecord
          iconClassName={"economy_ticket_med"}
          title={"Sealed Entry Tokens"}
          smallLabel
          deltaContent={formatNumber(change.delta.sealedTokensDelta)}
        />
      )}
      {checkBoosterAdded &&
        change.delta.boosterDelta &&
        change.delta.boosterDelta.map((booster: any) => (
          <BoosterDelta booster={booster} key={booster.collationId} />
        ))}
      {checkWildcardsAdded && (
        <AllWildcardsEconomyValueRecord delta={change.delta} />
      )}
      {(checkCards || checkAether) && (
        <CardPoolAddedEconomyValueRecord
          addedCardIds={change.delta.cardsAdded}
          aetherizedCardIds={aetherCards}
        />
      )}
      {skinsToCards &&
        skinsToCards.map((card: any) => (
          <EconomyIcon
            key={economyId + "_" + card.id}
            title={card.name + " Skin"}
            className={"economy_skin_art"}
            url={`url("${getCardArtCrop(card)}")`}
          />
        ))}
      {vanityCodes &&
        vanityCodes.map(code => (
          <EconomyValueRecord
            key={economyId + "_" + code}
            iconClassName={"economy_vanity"}
            title={code}
            smallLabel
            deltaContent={getReadableCode(code)}
          />
        ))}
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
    const lookupCard = db.card(card?.dfcId) ?? card;
    openScryfallCard(lookupCard);
  }, [card]);
  // inventoryCard.style.width = "39px";

  const [hoverIn, hoverOut] = useHoverCard(card?.id || 0);

  const tooltip = isAetherized
    ? computeAetherizedTooltip(card, quantity)
    : card?.name ?? "";
  return (
    <div
      onMouseEnter={hoverIn}
      onMouseLeave={hoverOut}
      className={"inventory_card small"}
      onClick={onCardClick}
    >
      <img
        className={
          "inventory_card_img 39px" +
          (isAetherized ? " inventory_card_aetherized" : "")
        }
        src={getCardImage(card)}
        title={tooltip}
      />
      {quantity && quantity > 1 && (
        <div className={"inventory_card_quantity_container"}>
          <span className={"inventory_card_quantity"}>{"x" + quantity}</span>
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

function FlexTop(props: FlexTopProps): JSX.Element {
  const { change, fullContext } = props;
  // flexTop.style.lineHeight = "32px";
  return (
    <div className={"flex_top economy_sub"}>
      <span title={change.originalContext}>{fullContext}</span>
      <div className={"list_economy_time"}>
        {EconomyRowDate(new Date(change.date))}
      </div>
    </div>
  );
}

interface DeleteButtonProps {
  change: any;
  economyId: string;
  hideRowCallback: () => void;
}

function DeleteButton(props: DeleteButtonProps): JSX.Element {
  const { change, economyId, hideRowCallback } = props;
  const archiveClass = change.archived
    ? "list_item_unarchive"
    : "list_item_archive";

  const title = change.archived ? "restore" : "archive (will not delete data)";

  const archiveCallback = React.useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      if (!change.archived) {
        hideRowCallback();
      }
      toggleArchived(economyId);
    },
    [change, economyId, hideRowCallback]
  );

  return (
    <div
      className={"flex_item " + economyId + "_del " + archiveClass}
      onClick={archiveCallback}
      title={title}
    />
  );
}

interface ChangeRowProps {
  economyId: string;
  change: any;
}

export function ChangeRow(props: ChangeRowProps): JSX.Element {
  const { economyId, change } = props;
  const fullContext = getPrettyContext(change.originalContext);
  const thingsToCheck = getThingsToCheck(fullContext, change);

  const flexTopProps = {
    fullContext,
    change
  };

  const flexBottomProps = {
    ...flexTopProps,
    thingsToCheck
  };

  const flexRightProps = {
    ...flexBottomProps,
    economyId
  };

  const [isHidden, setIsHidden] = React.useState(false);

  const hideRowCallback = React.useCallback(() => {
    setIsHidden(true);
  }, []);

  return (
    <div
      className={
        economyId + " list_economy" + (isHidden ? " economy_row_hidden" : "")
      }
    >
      <div className={"flex_item flexLeft"}>
        <FlexTop {...flexTopProps} />
        <FlexBottom {...flexBottomProps} />
      </div>
      <FlexRight {...flexRightProps} />
      <DeleteButton
        change={change}
        economyId={economyId}
        hideRowCallback={hideRowCallback}
      />
    </div>
  );
}
