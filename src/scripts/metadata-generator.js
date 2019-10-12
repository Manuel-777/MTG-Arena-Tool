const path = require("path");
const fs = require("fs");
const {
  APPDATA,
  SETS_DATA,
  SET_NAMES,
  RARITY,
  NO_DUPES_ART_SETS,
  EVENT_TO_NAME,
  EVENT_TO_FORMAT,
  LIMITED_RANKED_EVENTS,
  STANDARD_RANKED_EVENTS,
  SINGLE_MATCH_EVENTS,
  SCRYFALL_LANGUAGE
} = require("./metadata-constants");

exports.generateMetadata = function(
  ScryfallCards,
  ranksData,
  metagameData,
  version,
  languages
) {
  return new Promise(resolve => {
    console.log("Reading JSON files");
    let cards = readExternalJson("cards.json");
    let abilitiesRead = readExternalJson("abilities.json");
    let locRead = readExternalJson("loc.json");
    let enumsRead = readExternalJson("enums.json");

    // Write scryfall cards to a file. Its good for debugging.
    let str = JSON.stringify(ScryfallCards);
    let jsonOut = path.join(APPDATA, "external", `scryfall-cards.json`);
    fs.writeFile(jsonOut, str, () => {});
    // Same for ranks
    str = JSON.stringify(ranksData);
    jsonOut = path.join(APPDATA, "external", `ranks-data.json`);
    fs.writeFile(jsonOut, str, () => {});

    // Read locales for all languages and clean up mana costs in the texts
    const regex = new RegExp("/o(?=[^{]*})/");
    // Clean up kanji descriptions for JP
    const JpRegex = new RegExp(/ *（[^）]*） */g);
    let loc = {};
    locRead.forEach(lang => {
      loc[lang.langkey] = {};
      lang.keys.forEach(item => {
        loc[lang.langkey][item.id] = item.text
          .replace(regex, "")
          .replace(JpRegex, "");
      });
    });
    locRead = null;

    var getText = function(id, language) {
      return loc[language] == undefined ? loc["EN"][id] : loc[language][id];
    };

    // Altrough enums must be in other languages ill write them in english
    // This is because Tool currently relies and expects data to be in english
    // for things like creature types. And it would break.
    let enums = {};
    enumsRead.forEach(_enum => {
      enums[_enum.name] = {};
      _enum.values.forEach(value => {
        enums[_enum.name][value.id] = getText(value.text, "EN");
      });
    });
    enumsRead = null;

    let finalized = 0;
    languages.forEach(lang => {
      // Read abilities for this language
      let abilities = {};
      abilitiesRead.forEach(ab => {
        let abid = ab.id;
        abilities[abid] = getText(ab.text, lang);
      });

      // main loop
      console.log("Generating " + lang);
      let cardsFinal = {};
      cards.forEach(card => {
        if (card.set == "ArenaSUP") return;

        // Get types line based on enums
        let typeLine = "";
        card.supertypes.forEach(type => {
          typeLine += enums["SuperType"][type] + " ";
        });
        card.types.forEach(type => {
          typeLine += enums["CardType"][type] + " ";
        });
        card.subtypes.forEach(type => {
          typeLine += enums["SubType"][type] + " ";
        });
        // Doing this throws an error in tool :(
        //typeLine = typeLine.slice(0, -1);

        // Clean up mana cost
        let manaCost = [];
        card.castingcost.split("o").forEach(mana => {
          if (mana !== "" && mana !== "0") {
            mana = mana
              .toLowerCase()
              .replace("(", "")
              .replace("/", "")
              .replace(")", "");
            manaCost.push(mana);
          }
        });

        let set = SET_NAMES[card.set];

        let colllector = card.CollectorNumber;
        // Special collectors numbers that define Mythic edition and Gift pack cards
        if (colllector.includes("GR")) {
          set = "Mythic Edition";
        }
        if (colllector.includes("GP")) {
          set = "M19 Gift Pack";
        }

        let cardObj = {};
        let cardId = card.grpid;
        let cardName = getText(card.titleId, lang);
        let englishName = getText(card.titleId, "EN");
        cardObj.id = cardId;
        cardObj.name = cardName;
        cardObj.set = set;
        cardObj.artid = card.artId;
        cardObj.type = typeLine;
        cardObj.cost = manaCost;
        cardObj.cmc = card.cmc;
        cardObj.rarity = RARITY[card.rarity];
        cardObj.cid = colllector;
        cardObj.frame = card.frameColors;
        cardObj.artist = card.artistCredit;
        cardObj.dfc = card.linkedFaceType;
        cardObj.collectible = card.isCollectible;
        cardObj.craftable = card.isCraftable;
        cardObj.booster = false;

        let scryfallObject = undefined;
        let scryfallSet = SETS_DATA[set].scryfall;
        if (!card.isToken) {
          // Unhingued lands
          if (cardId == 70501) scryfallSet = "unh";
          if (cardId == 70502) scryfallSet = "unh";
          if (cardId == 70503) scryfallSet = "unh";
          if (cardId == 70504) scryfallSet = "unh";
          if (cardId == 70505) scryfallSet = "unh";
          // Commander 2016 lands
          if (cardId == 70506) scryfallSet = "c16";
          if (cardId == 70507) scryfallSet = "c16";
          if (cardId == 70508) scryfallSet = "c16";
          if (cardId == 70509) scryfallSet = "c16";
          if (cardId == 70510) scryfallSet = "c16";
          // Promo Llanowar Elves
          if (cardId == 69781) scryfallSet = "pdom";
          // Promo Firemind's Research
          if (cardId == 69780) scryfallSet = "pgrn";
          // Promo Ghalta
          if (cardId == 70140) scryfallSet = "prix";
          // Promo Duress
          if (cardId == 70141) scryfallSet = "f05";
        } else {
          // If the card is a token the scryfall set name begins with "t"
          scryfallSet = "t" + scryfallSet;
        }

        // Get scryfall object
        scryfallObject = getScryfallCard(
          ScryfallCards,
          lang,
          scryfallSet,
          englishName,
          colllector
        );

        if (card.linkedFaces.length > 0) {
          cardObj.dfcId = card.linkedFaces[0];
        } else {
          cardObj.dfcId = false;
        }

        // Add ranks data
        let setCode = SETS_DATA[set].code;
        if (ranksData[setCode] && ranksData[setCode][englishName]) {
          cardObj.rank = Math.round(ranksData[setCode][englishName].rank);
          cardObj.rank_values = ranksData[setCode][englishName].values;
          cardObj.rank_controversy = ranksData[setCode][
            englishName
          ].cont.toFixed(3);
        } else {
          cardObj.rank = 0;
          cardObj.rank_values = 0;
          cardObj.rank_controversy = 0;
        }

        // Use the name if available
        if (scryfallObject && scryfallObject.printed_name) {
          cardObj.name = scryfallObject.printed_name;
        }
        // We did not find any image data on scryfall for this card!
        if (
          scryfallObject == undefined ||
          scryfallObject.image_uris == undefined
        ) {
          // Try default to english
          scryfallObject = getScryfallCard(
            ScryfallCards,
            "en",
            scryfallSet,
            englishName,
            colllector
          );
        }

        if (
          scryfallObject == undefined ||
          scryfallObject.image_uris == undefined
        ) {
          // English failed..
          console.log(
            `No scryfall data for [${lang}] ${
              cardObj.name
            } (${englishName}) - ${scryfallSet} (${cardObj.cid}) grpId: ${
              cardObj.id
            }`
          );
          cardObj.images = {};
        } else {
          // Remove the first part of the URLs and some
          // links that are not used by tool.
          // This reduces the file size subtantially
          delete scryfallObject.image_uris.png;
          delete scryfallObject.image_uris.border_crop;
          if (scryfallObject.image_uris) {
            let rep = "https://img.scryfall.com/cards";
            Object.keys(scryfallObject.image_uris).forEach(key => {
              scryfallObject.image_uris[key] = scryfallObject.image_uris[
                key
              ].replace(rep, "");
            });
          }
          cardObj.booster = scryfallObject.booster;
          cardObj.images = scryfallObject.image_uris;
        }

        cardsFinal[cardObj.id] = cardObj;
      });

      // Add reprints and split cards references
      Object.keys(cardsFinal).forEach(key => {
        let card = cardsFinal[key];

        if (card.frame) {
          if (card.dfc == 5 && card.frame.length == 0) {
            let did = card.dfcId;
            card.frame = cardsFinal[did].frame;
            card.dfcId = did;
          }
        }

        card.reprints = false;
        if (card.rarity !== "token" && card.rarity !== "land") {
          let arr = [];

          Object.keys(cardsFinal).forEach(key => {
            let cardLoop = cardsFinal[key];
            if (cardLoop.name == card.name && cardLoop.id !== card.id) {
              arr.push(cardLoop.id);
            }
          });

          if (arr.length > 0) {
            card.reprints = arr;
          }
        }
      });

      // Make the final JSON structure
      let date = new Date();
      let jsonOutput = {
        cards: cardsFinal,
        ok: true,
        version: version,
        language: lang,
        updated: date.getTime(),
        events: EVENT_TO_NAME,
        events_format: EVENT_TO_FORMAT,
        sets: SETS_DATA,
        abilities: abilities,
        limited_ranked_events: LIMITED_RANKED_EVENTS,
        standard_ranked_events: STANDARD_RANKED_EVENTS,
        single_match_events: SINGLE_MATCH_EVENTS,
        archetypes: metagameData
      };

      // Write to a file
      let str = JSON.stringify(jsonOutput);
      let jsonOut = path.join(
        APPDATA,
        "external",
        `v${version}-${lang.toLowerCase()}-database.json`
      );
      fs.writeFile(jsonOut, str, function(err) {
        if (err) {
          return console.log(err);
        }

        console.log(`${jsonOut} generated.`);
        finalized++;
        if (finalized == languages.length) {
          resolve();
        }
      });
      //
    });
  });
};

function getScryfallCard(
  ScryfallCards,
  lang,
  scryfallSet,
  cardName,
  colllector
) {
  let ret = undefined;

  try {
    lang = SCRYFALL_LANGUAGE[lang];
  } catch (e) {
    // no need to catch
  }

  try {
    if (NO_DUPES_ART_SETS.includes(scryfallSet)) {
      ret = ScryfallCards[lang][scryfallSet][cardName];
    } else {
      ret = ScryfallCards[lang][scryfallSet][cardName][colllector];
    }
  } catch (e) {
    ret = undefined;
  }

  if (ret == undefined && lang !== "EN") {
    try {
      if (NO_DUPES_ART_SETS.includes(scryfallSet)) {
        ret = ScryfallCards["EN"][scryfallSet][cardName];
      } else {
        ret = ScryfallCards["EN"][scryfallSet][cardName][colllector];
      }
    } catch (e) {
      ret = undefined;
    }
  }

  return ret;
}

function readExternalJson(filename) {
  let file = path.join(APPDATA, "external", filename);
  //JSON.parse(fs.readFileSync(file));
  let json = JSON.parse(`{"value": ${fs.readFileSync(file)}}`);
  return json.value;
}
