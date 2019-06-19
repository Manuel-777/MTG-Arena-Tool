const { shell } = require("electron");

const { differenceInCalendarDays } = require("date-fns");

const db = require("../shared/database");
const pd = require("../shared/player-data");
const { createDivision } = require("../shared/dom-fns");
const { createSelect } = require("../shared/select");
const { addCardHover } = require("../shared/card-hover");
const {
  collectionSortRarity,
  get_card_image,
  get_set_scryfall,
  getReadableEvent
} = require("../shared/util");

const DataScroller = require("./data-scroller");
const {
  formatNumber,
  formatPercent,
  toggleArchived
} = require("./renderer-util");

var filterEconomy = "All";
let showArchived = false;
var daysago = 0;
var dayList = [];
let sortedChanges = [];

class economyDay {
  constructor(
    goldEarned = 0,
    gemsEarned = 0,
    goldSpent = 0,
    gemsSpent = 0,
    cardsEarned = 0,
    vaultProgress = 0.0
  ) {
    this.goldEarned = goldEarned;
    this.gemsEarned = gemsEarned;
    this.goldSpent = goldSpent;
    this.gemsSpent = gemsSpent;
    this.cardsEarned = cardsEarned;
    this.vaultProgress = vaultProgress;
  }
}

// These should match the full text of the event
const economyTransactionContextsMap = {
  "Booster.Open": "Booster Open",
  "Event.GrantCardPool": "Event Card Pool",
  "Event.PayEntry": "Pay Event Entry",
  "Event.Season.Constructed.Payout": "Constructed Season Rewards",
  "Event.Season.Limited.Payout": "Limited Season Rewards",
  "PlayerReward.OnMatchCompletedDaily": "Player Rewards",
  "Quest.Completed": "Quest Completed",
  "Store.Fulfillment": "Store",
  "Store.Fulfillment.Chest": "Chest Redeem",
  "Store.Fulfillment.Boosters": "Booster Redeem",
  "WildCard.Redeem": "Redeem Wildcard",
  "Vault.Complete": "Vault Opening",
  "PlayerReward.OnMatchCompletedWeekly": "Weekly rewards"
};

function localDateFormat(date) {
  return `<local-time datetime="${date.toISOString()}"
    month="short"
    day="numeric"
    hour="numeric"
    minute="numeric">
    ${date.toString()}
  </local-time>`;
}

function localDayDateFormat(date) {
  return `<local-time datetime="${date.toISOString()}"
    year="numeric"
    month="long"
    day="numeric">
    ${date.toDateString()}
  </local-time>`;
}

function getReadableQuest(questCode) {
  // FIXME: Can we get a human readable quest name?
  // For now lets just use a small portion of the ID.
  return `#${questCode.substring(0, 6)}`;
}

//
function get_colation_set(collationid) {
  var ret = "";
  Object.keys(db.sets).forEach(function(setName) {
    if (db.sets[setName].collation == collationid) {
      ret = setName;
    }
  });

  return ret;
}

//
function get_card_art(cardObj) {
  if (typeof cardObj !== "object") {
    cardObj = db.card(cardObj);
  }

  if (!cardObj) {
    return "../images/notfound.png";
  } else {
    return "https://img.scryfall.com/cards" + cardObj.images.art_crop;
  }
}

function getPrettyContext(context, full = true) {
  if (context.startsWith("Event.Prize")) {
    var eventCode = context.substring(12);
    return full ? `Event Prize: ${getReadableEvent(eventCode)}` : "Event Prize";
  }

  if (context.startsWith("Quest.Completed")) {
    var questCode = context.substring(16);
    return full
      ? `Quest Completed: ${getReadableQuest(questCode)}`
      : "Quest Completed";
  }

  var pretty = economyTransactionContextsMap[context];

  // If there's no valid pretty context keep the code as is.
  return pretty || context;
}

function openEconomyTab(dataIndex = 25, scrollTop = 0) {
  const mainDiv = document.getElementById("ux_0");
  createEconomyUI(mainDiv);
  const dataScroller = new DataScroller(
    mainDiv,
    renderData,
    20,
    sortedChanges.length
  );
  dataScroller.render(dataIndex, scrollTop);
}

// return val = how many rows it rendered into container
function renderData(container, index) {
  // for performance reasons, we leave changes order mostly alone
  // to display most-recent-first, we use a reverse index
  const revIndex = sortedChanges.length - index - 1;
  const economyId = sortedChanges[revIndex];
  const change = pd.change(economyId);

  if (change === undefined) return 0;
  if (change.archived && !showArchived) return 0;

  // print out daily summaries but no sub-events
  if (
    filterEconomy === "Day Summaries" &&
    daysago !== differenceInCalendarDays(new Date(), new Date(change.date))
  ) {
    container.appendChild(createDayHeader(change));
    return 1;
  }

  const selectVal = getPrettyContext(change.context, false);
  if (filterEconomy !== "All" && selectVal !== filterEconomy) {
    return 0;
  }

  let rowsAdded = 0;

  if (daysago != differenceInCalendarDays(new Date(), new Date(change.date))) {
    container.appendChild(createDayHeader(change));
    rowsAdded++;
  }

  var div = createChangeRow(change, economyId);
  container.appendChild(div);
  rowsAdded++;

  return rowsAdded;
}

function createDayHeader(change) {
  daysago = differenceInCalendarDays(new Date(), new Date(change.date));
  let headerGrid = createDivision(["economy_title"]);

  const cont = createDivision(["economy_metric"]);
  let tx = createDivision();
  tx.style.lineHeight = "64px";
  tx.classList.add("economy_sub");
  let up = createDivision(["economy_up"]);
  let down = createDivision(["economy_down"]);

  // Title
  let gridTitle = createDivision(["flex_item"]);
  gridTitle.style.gridArea = "1 / 1 / auto / 2";
  gridTitle.style.lineHeight = "64px";

  if (daysago == 0) gridTitle.innerHTML = "Today";
  if (daysago == 1) gridTitle.innerHTML = "Yesterday";
  if (daysago > 1) {
    let date = new Date(change.date);
    date = new Date(date.setHours(0, 0, 0, 0));
    gridTitle.innerHTML = localDayDateFormat(date);
  }

  // Cards
  const gridCards = cont.cloneNode(true);
  gridCards.style.gridArea = "1 / 2 / auto / 3";
  const icca = tx.cloneNode(true);
  icca.innerHTML = "Cards:";
  const catx = tx.cloneNode(true);
  catx.innerHTML = formatNumber(dayList[daysago].cardsEarned);
  gridCards.appendChild(icca);
  const upcontca = createDivision(["economy_delta"]);
  upcontca.style.width = "auto";
  upcontca.appendChild(catx);
  upcontca.appendChild(up.cloneNode(true));
  gridCards.appendChild(upcontca);

  // Gold
  const gridGold = cont.cloneNode(true);
  gridGold.style.gridArea = "1 / 3 / auto / 4";
  let icgo = createDivision(["economy_gold_med"]);
  icgo.margin = "3px";
  icgo.title = "Gold";
  gridGold.appendChild(icgo);

  const upcontgo = createDivision(["economy_delta"]);
  tx.innerHTML = formatNumber(dayList[daysago].goldEarned);
  upcontgo.appendChild(tx);
  upcontgo.appendChild(up.cloneNode(true));
  gridGold.appendChild(upcontgo);

  const dncontgo = createDivision(["economy_delta"]);
  let ntx = tx.cloneNode(true);
  ntx.innerHTML = formatNumber(dayList[daysago].goldSpent);
  dncontgo.appendChild(ntx);
  dncontgo.appendChild(down.cloneNode(true));
  gridGold.appendChild(dncontgo);

  // Gems
  const gridGems = cont.cloneNode(true);
  gridGems.style.gridArea = "1 / 4 / auto / 5";
  let icge = createDivision(["economy_gems_med"]);
  icge.margin = "3px";
  icge.title = "Gems";
  gridGems.appendChild(icge);

  const upcontge = createDivision(["economy_delta"]);
  ntx = tx.cloneNode(true);
  ntx.innerHTML = formatNumber(dayList[daysago].gemsEarned);
  upcontge.appendChild(ntx);
  upcontge.appendChild(up.cloneNode(true));
  gridGems.appendChild(upcontge);

  const dncontge = createDivision(["economy_delta"]);
  ntx = tx.cloneNode(true);
  ntx.innerHTML = formatNumber(dayList[daysago].gemsSpent);
  dncontge.appendChild(ntx);
  dncontge.appendChild(down.cloneNode(true));
  gridGems.appendChild(dncontge);

  // Vault
  const gridVault = cont.cloneNode(true);
  gridVault.style.gridArea = "1 / 5 / auto / 6";
  const icva = tx.cloneNode(true);
  icva.innerHTML = "Vault:";
  const vatx = tx.cloneNode(true);
  const rawDelta = dayList[daysago].vaultProgress;
  // Assume vault can only be redeemed once per day
  // Rely on modulo arithmetic to derive pure vault gain
  const delta = rawDelta < 0 ? rawDelta + 100 : rawDelta;
  const deltaPercent = delta / 100.0;
  vatx.innerHTML = formatPercent(deltaPercent);
  gridVault.appendChild(icva);
  const upcontva = createDivision(["economy_delta"]);
  upcontva.style.width = "auto";
  upcontva.appendChild(vatx);
  upcontva.appendChild(up.cloneNode(true));
  gridVault.appendChild(upcontva);

  headerGrid.appendChild(gridTitle);
  headerGrid.appendChild(gridCards);
  headerGrid.appendChild(gridGold);
  headerGrid.appendChild(gridGems);
  headerGrid.appendChild(gridVault);
  return headerGrid;
}

function createChangeRow(change, economyId) {
  // The next ~200 lines of code will add elements to these two containers
  var flexBottom = createDivision(["flex_bottom"]);
  var flexRight = createDivision(["tiny_scroll", "list_economy_awarded"]);
  flexRight.addEventListener("mousewheel", function(e) {
    this.scrollLeft += parseInt(e.deltaY / 2);
    e.preventDefault();
  });

  let checkGemsPaid = false;
  let checkGoldPaid = false;
  let checkCardsAdded = false;
  let checkBoosterAdded = false;
  let checkAetherized = false;
  let checkWildcardsAdded = false;
  let checkGemsEarnt = false;
  let checkGoldEarnt = false;
  let checkSkinsAdded = false;

  var bon, bos;

  const fullContext = getPrettyContext(change.originalContext);

  if (fullContext === "Booster Open") {
    change.delta.boosterDelta.forEach(function(booster) {
      var set = get_colation_set(booster.collationId);

      var bos = createDivision(["set_logo"]);
      bos.style.backgroundImage =
        "url(../images/sets/" + db.sets[set].code + ".png)";
      bos.title = set;

      var bon = createDivision();
      bon.style.lineHeight = "32px";
      bon.classList.add("economy_sub");

      bon.innerHTML = "x" + Math.abs(booster.count);

      flexBottom.appendChild(bos);
      flexBottom.appendChild(bon);
    });

    checkWildcardsAdded = true;
    checkCardsAdded = true;
    checkAetherized = true;
  } else if (fullContext === "Store") {
    checkGemsPaid = true;
    checkGoldPaid = true;
    checkBoosterAdded = true;
    checkCardsAdded = true;
    checkAetherized = true;
  } else if (fullContext === "Booster Redeem") {
    checkGemsPaid = true;
    checkGoldPaid = true;
    checkBoosterAdded = true;
  } else if (fullContext === "Pay Event Entry") {
    checkGemsPaid = true;
    checkGoldPaid = true;

    bos = createDivision(["economy_ticket_med"]);
    bos.title = "Event Entry";

    flexRight.appendChild(bos);
  } else if (fullContext === "Redeem Wildcard") {
    let imgUri = "";
    let title = "";
    let count = 0;

    const renderWild = count => {
      if (!count) return;
      count = Math.abs(count);
      bos = createDivision(["economy_wc"]);
      bos.title = title;
      bos.style.backgroundImage = "url(../images/" + imgUri + ".png)";

      bon = createDivision();
      bon.style.lineHeight = "32px";
      bon.classList.add("economy_sub");
      bon.innerHTML = "x" + count;

      flexBottom.appendChild(bos);
      flexBottom.appendChild(bon);
    };

    if (change.delta.wcCommonDelta !== undefined) {
      imgUri = "wc_common";
      title = "Common Wildcard";
      count = change.delta.wcCommonDelta;
      renderWild(count);
    }
    if (change.delta.wcUncommonDelta !== undefined) {
      imgUri = "wc_uncommon";
      title = "Uncommon Wildcard";
      count = change.delta.wcUncommonDelta;
      renderWild(count);
    }
    if (change.delta.wcRareDelta !== undefined) {
      imgUri = "wc_rare";
      title = "Rare Wildcard";
      count = change.delta.wcRareDelta;
      renderWild(count);
    }
    if (change.delta.wcMythicDelta !== undefined) {
      imgUri = "wc_mythic";
      title = "Mythic Wildcard";
      count = change.delta.wcMythicDelta;
      renderWild(count);
    }

    checkCardsAdded = true;
    checkAetherized = true;
  } else {
    checkGemsEarnt = true;
    checkGoldEarnt = true;
    checkBoosterAdded = true;
    checkCardsAdded = true;
    checkAetherized = true;
    checkWildcardsAdded = true;
    checkSkinsAdded = true;
  }

  if (checkGemsPaid && change.delta.gemsDelta != undefined) {
    bos = createDivision(["economy_gems"]);
    bos.title = "Gems";

    bon = createDivision();
    bon.style.lineHeight = "32px";
    bon.classList.add("economy_sub");
    bon.innerHTML = formatNumber(Math.abs(change.delta.gemsDelta));

    flexBottom.appendChild(bos);
    flexBottom.appendChild(bon);
  }

  if (checkGoldPaid && change.delta.goldDelta != undefined) {
    bos = createDivision(["economy_gold"]);
    bos.title = "Gold";

    bon = createDivision();
    bon.style.lineHeight = "32px";
    bon.classList.add("economy_sub");
    bon.innerHTML = formatNumber(Math.abs(change.delta.goldDelta));

    flexBottom.appendChild(bos);
    flexBottom.appendChild(bon);
  }

  if (checkGemsEarnt && change.delta.gemsDelta != undefined) {
    bos = createDivision(["economy_gems_med"]);
    bos.title = "Gems";

    bon = createDivision();
    bon.style.lineHeight = "64px";
    bon.classList.add("economy_sub");
    bon.innerHTML = formatNumber(Math.abs(change.delta.gemsDelta));

    flexRight.appendChild(bos);
    flexRight.appendChild(bon);
  }

  if (checkGoldEarnt && change.delta.goldDelta != undefined) {
    bos = createDivision(["economy_gold_med"]);
    bos.title = "Gold";

    bon = createDivision();
    bon.style.lineHeight = "64px";
    bon.classList.add("economy_sub");
    bon.innerHTML = formatNumber(Math.abs(change.delta.goldDelta));

    flexRight.appendChild(bos);
    flexRight.appendChild(bon);
  }

  if (checkBoosterAdded && change.delta.boosterDelta != undefined) {
    change.delta.boosterDelta.forEach(function(booster) {
      var set = get_colation_set(booster.collationId);

      var bos = createDivision(["set_logo_med"]);
      bos.style.backgroundImage =
        "url(../images/sets/" + db.sets[set].code + ".png)";
      bos.title = set;

      var bon = createDivision();
      bon.style.lineHeight = "64px";
      bon.classList.add("economy_sub");
      bon.innerHTML = "x" + Math.abs(booster.count);

      flexRight.appendChild(bos);
      flexRight.appendChild(bon);
    });
  }

  if (checkWildcardsAdded) {
    if (change.delta.wcCommonDelta != undefined) {
      bos = createDivision(["economy_wc"]);
      bos.title = "Common Wildcard";
      bos.style.backgroundImage = "url(../images/wc_common.png)";
      bon = createDivision();
      bon.style.lineHeight = "64px";
      bon.classList.add("economy_sub");
      bon.innerHTML = "x" + Math.abs(change.delta.wcCommonDelta);
      flexRight.appendChild(bos);
      flexRight.appendChild(bon);
    }

    if (change.delta.wcUncommonDelta != undefined) {
      bos = createDivision(["economy_wc"]);
      bos.title = "Uncommon Wildcard";
      bos.style.backgroundImage = "url(../images/wc_uncommon.png)";
      bon = createDivision();
      bon.style.lineHeight = "64px";
      bon.classList.add("economy_sub");
      bon.innerHTML = "x" + Math.abs(change.delta.wcUncommonDelta);
      flexRight.appendChild(bos);
      flexRight.appendChild(bon);
    }

    if (change.delta.wcRareDelta != undefined) {
      bos = createDivision(["economy_wc"]);
      bos.title = "Rare Wildcard";
      bos.style.backgroundImage = "url(../images/wc_rare.png)";
      bon = createDivision();
      bon.style.lineHeight = "64px";
      bon.classList.add("economy_sub");
      bon.innerHTML = "x" + Math.abs(change.delta.wcRareDelta);
      flexRight.appendChild(bos);
      flexRight.appendChild(bon);
    }
    if (change.delta.wcMythicDelta != undefined) {
      bos = createDivision(["economy_wc"]);
      bos.title = "Mythic Wildcard";
      bos.style.backgroundImage = "url(../images/wc_mythic.png)";
      bon = createDivision();
      bon.style.lineHeight = "64px";
      bon.classList.add("economy_sub");
      bon.innerHTML = "x" + Math.abs(change.delta.wcMythicDelta);
      flexRight.appendChild(bos);
      flexRight.appendChild(bon);
    }
  }

  if (checkCardsAdded && change.delta.cardsAdded != undefined) {
    change.delta.cardsAdded.sort(collectionSortRarity);
    change.delta.cardsAdded.forEach(function(grpId) {
      var card = db.card(grpId);

      var d = createDivision(["inventory_card"]);
      d.style.width = "39px";

      var img = document.createElement("img");
      img.classList.add("inventory_card_img");
      img.style.width = "39px";
      img.src = get_card_image(card);

      d.appendChild(img);

      flexRight.appendChild(d);
      addCardHover(img, card);

      img.addEventListener("click", () => {
        if (db.card(grpId).dfc == "SplitHalf") {
          card = db.card(card.dfcId);
        }
        //let newname = card.name.split(' ').join('-');
        shell.openExternal(
          "https://scryfall.com/card/" +
            get_set_scryfall(card.set) +
            "/" +
            card.cid +
            "/" +
            card.name
        );
      });
    });
  }

  if (checkAetherized && change.aetherizedCards != undefined) {
    change.aetherizedCards.forEach(function(obj) {
      var grpId = obj.grpId;
      var card = db.card(grpId);
      let draw = false;
      if (card) {
        if (change.delta.cardsAdded) {
          if (change.delta.cardsAdded.indexOf(grpId) == -1) {
            draw = true;
          }
        } else {
          draw = true;
        }
      }
      if (draw) {
        var d = createDivision(["inventory_card"]);
        d.style.width = "39px";

        var img = document.createElement("img");
        img.classList.add("inventory_card_img");
        img.classList.add("inventory_card_aetherized");
        img.style.width = "39px";
        img.src = get_card_image(card);

        if (card.rarity) {
          // only uncommons and commons go to vault
          let vaultProgressDelta =
            card.rarity === "uncommon" ? 1 / 300 : 1 / 900;
          img.title = "Vault:+" + formatPercent(vaultProgressDelta);
        }

        d.appendChild(img);
        flexRight.appendChild(d);

        addCardHover(img, card);

        img.addEventListener("click", () => {
          if (db.card(grpId).dfc == "SplitHalf") {
            card = db.card(card.dfcId);
          }
          //let newname = card.name.split(' ').join('-');
          shell.openExternal(
            "https://scryfall.com/card/" +
              get_set_scryfall(card.set) +
              "/" +
              card.cid +
              "/" +
              card.name
          );
        });
      }
    });
  }

  if (checkSkinsAdded && change.delta.artSkinsAdded != undefined) {
    change.delta.artSkinsAdded.forEach(obj => {
      let card = db.cardFromArt(obj.artId);

      bos = createDivision(["economy_skin_art"]);
      bos.title = card.name + " Skin";
      bos.style.backgroundImage = `url("${get_card_art(card)}")`;

      flexRight.appendChild(bos);
    });
  }

  // DOM hierarchy is:
  // changeRow
  //   flexLeft
  //      flexTop
  //      flexBottom
  //   flexRight

  var flexTop = createDivision(["flex_top", "economy_sub"]);
  flexTop.style.lineHeight = "32px";

  flexTop.appendChild(
    createDivision(
      [],
      `<span title="${change.originalContext}">${fullContext}</span>`
    )
  );

  var niceDate = localDateFormat(new Date(change.date));
  flexTop.appendChild(createDivision(["list_economy_time"], niceDate));

  var flexLeft = createDivision(["flex_item"]);
  flexLeft.style.flexDirection = "column";
  flexLeft.appendChild(flexTop);
  flexLeft.appendChild(flexBottom);

  var changeRow = createDivision([economyId, "list_economy"]);
  changeRow.appendChild(flexLeft);
  changeRow.appendChild(flexRight);

  var deleteButton = document.createElement("div");
  deleteButton.classList.add("flex_item");
  deleteButton.classList.add(economyId + "_del");
  const archiveClass = change.archived
    ? "list_item_unarchive"
    : "list_item_archive";
  deleteButton.title = change.archived
    ? "restore"
    : "archive (will not delete data)";
  deleteButton.classList.add(archiveClass);

  changeRow.appendChild(deleteButton);

  const archiveCallback = e => {
    e.stopPropagation();
    if (!change.archived) {
      changeRow.style.height = "0px";
      changeRow.style.overflow = "hidden";
    }
    toggleArchived(economyId);
  };
  deleteButton.addEventListener("click", archiveCallback);

  return changeRow;
}

function createEconomyUI(mainDiv) {
  daysago = -999;
  dayList = [];
  sortedChanges = [...pd.economy_index];
  sortedChanges.sort(compare_economy);

  var topSelectItems = ["All", "Day Summaries"];
  var selectItems = [];

  for (var n = 0; n < sortedChanges.length; n++) {
    const economyId = sortedChanges[n];
    const change = pd.change(economyId);
    if (change === undefined) continue;
    if (change.archived && !showArchived) continue;

    if (
      daysago != differenceInCalendarDays(new Date(), new Date(change.date))
    ) {
      daysago = differenceInCalendarDays(new Date(), new Date(change.date));
      dayList[daysago] = new economyDay();
      // console.log("new day", change.date);
    }

    const selectVal = getPrettyContext(change.context, false);
    if (!selectItems.includes(selectVal)) {
      selectItems.push(selectVal);
    }

    if (change.delta.gemsDelta != undefined) {
      if (change.delta.gemsDelta > 0)
        dayList[daysago].gemsEarned += change.delta.gemsDelta;
      else dayList[daysago].gemsSpent += Math.abs(change.delta.gemsDelta);
    }
    if (change.delta.goldDelta != undefined) {
      if (change.delta.goldDelta > 0)
        dayList[daysago].goldEarned += change.delta.goldDelta;
      else dayList[daysago].goldSpent += Math.abs(change.delta.goldDelta);

      // console.log(economyId, "> ", change.date, " > ", change.delta.goldDelta);
    }

    if (change.delta && change.delta.cardsAdded) {
      dayList[daysago].cardsEarned += change.delta.cardsAdded.length;
    }
    if (change.delta && change.delta.vaultProgressDelta) {
      dayList[daysago].vaultProgress += change.delta.vaultProgressDelta;
    }
  }

  mainDiv.classList.remove("flex_item");
  mainDiv.innerHTML = "";

  let div = createDivision(["list_economy_top", "flex_item"]);

  //
  var selectdiv = createDivision();
  selectdiv.style.margin = "auto 64px auto 0px";
  selectdiv.style.display = "flex";
  let options = [...topSelectItems, ...selectItems];

  // console.log("filterEconomy", filterEconomy);
  let select = createSelect(
    selectdiv,
    options,
    filterEconomy,
    res => {
      filterEconomy = res;
      openEconomyTab();
    },
    "query_select"
  );

  const archiveCont = document.createElement("label");
  archiveCont.style.marginTop = "4px";
  archiveCont.classList.add("check_container", "hover_label");
  archiveCont.innerHTML = "archived";
  const archiveCheckbox = document.createElement("input");
  archiveCheckbox.type = "checkbox";
  archiveCheckbox.id = "economy_query_archived";
  archiveCheckbox.addEventListener("click", () => {
    showArchived = archiveCheckbox.checked;
    openEconomyTab();
  });
  archiveCheckbox.checked = showArchived;
  archiveCont.appendChild(archiveCheckbox);
  const archiveSpan = document.createElement("span");
  archiveSpan.classList.add("checkmark");
  archiveCont.appendChild(archiveSpan);
  selectdiv.appendChild(archiveCont);

  //$$("#query_select.select_button")[0].innerHTML = filterEconomy;
  div.appendChild(selectdiv);

  //
  let icwcc = createDivision(["economy_wc_med", "wc_common"]);
  icwcc.title = "Common Wildcards";

  let icwcu = createDivision(["economy_wc_med", "wc_uncommon"]);
  icwcu.title = "Uncommon Wildcards";

  let icwcr = createDivision(["economy_wc_med", "wc_rare"]);
  icwcr.title = "Rare Wildcards";

  let icwcm = createDivision(["economy_wc_med", "wc_mythic"]);
  icwcm.title = "Mythic Wildcards";

  let icgo = createDivision(["economy_gold_med"]);
  icgo.title = "Gold";

  let icge = createDivision(["economy_gems_med"]);
  icge.style.marginLeft = "24px";
  icge.title = "Gems";

  let tx = createDivision();
  tx.style.lineHeight = "64px";
  tx.classList.add("economy_sub");

  div.appendChild(icwcc);
  let ntx = tx.cloneNode(true);
  ntx.innerHTML = formatNumber(pd.economy.wcCommon);
  div.appendChild(ntx);

  div.appendChild(icwcu);
  ntx = tx.cloneNode(true);
  ntx.innerHTML = formatNumber(pd.economy.wcUncommon);
  div.appendChild(ntx);

  div.appendChild(icwcr);
  ntx = tx.cloneNode(true);
  ntx.innerHTML = formatNumber(pd.economy.wcRare);
  div.appendChild(ntx);

  div.appendChild(icwcm);
  ntx = tx.cloneNode(true);
  ntx.innerHTML = formatNumber(pd.economy.wcMythic);
  div.appendChild(ntx);

  div.appendChild(icgo);
  ntx = tx.cloneNode(true);
  ntx.innerHTML = formatNumber(pd.economy.gold);
  div.appendChild(ntx);

  div.appendChild(icge);
  ntx = tx.cloneNode(true);
  ntx.innerHTML = formatNumber(pd.economy.gems);
  div.appendChild(ntx);

  ntx = tx.cloneNode(true);
  ntx.innerHTML = `Vault: ${pd.economy.vault}%`;
  ntx.style.marginLeft = "32px";
  div.appendChild(ntx);

  mainDiv.appendChild(div);
  daysago = -1;
}

// Compare two economy events OR the IDs of two economy events.
// If two IDs are specified then events are retrieved from `economyHistory`
function compare_economy(a, b) {
  if (a === undefined) return 0;
  if (b === undefined) return 0;

  a = pd.change(a);
  b = pd.change(b);

  if (a === undefined) return 0;
  if (b === undefined) return 0;

  return Date.parse(a.date) - Date.parse(b.date);
}

module.exports = {
  openEconomyTab: openEconomyTab
};
