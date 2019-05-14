/*
global
  cards
  decks
  shell
  settings
*/
const windowBackground = 0;
const windowRenderer = 1;
const windowOverlay = 2;

// Colour indices
const WHITE = 1;
const BLUE = 2;
const BLACK = 3;
const RED = 4;
const GREEN = 5;

// Magic constant to represent auth token in form
const HIDDEN_PW = "********";

const math = require("mathjs");
math.config({ precision: 2000 });

require("conic-gradient");

const Database = require("../shared/database.js");
const cardsDb = new Database();

const Deck = require("../shared/deck.js");
const CardsList = require("../shared/cards-list.js");
const Colors = require("../shared/colors.js");

const enums = {
  CounterType: {
    "1": "+1/+1",
    "2": "-1/-1",
    "3": "Poison",
    "4": "Wind",
    "5": "Time",
    "6": "Fade",
    "7": "Loyalty",
    "8": "Wish",
    "9": "Age",
    "10": "Aim",
    "11": "Arrow",
    "12": "Arrowhead",
    "13": "Awakening",
    "14": "Blaze",
    "15": "Blood",
    "16": "Bounty",
    "17": "Bribery",
    "18": "Carrion",
    "19": "Charge",
    "20": "Control",
    "21": "Corpse",
    "22": "Credit",
    "23": "Cube",
    "24": "Currency",
    "25": "Death",
    "26": "Delay",
    "27": "Depletion",
    "28": "Despair",
    "29": "Devotion",
    "30": "Divinity",
    "31": "Doom",
    "32": "Dream",
    "33": "Echo",
    "34": "Elixir",
    "35": "Energy",
    "36": "Eon",
    "37": "Eyeball",
    "38": "Fate",
    "39": "Feather",
    "40": "Filibuster",
    "41": "Flame",
    "42": "Flood",
    "43": "Fungus",
    "44": "Fuse",
    "45": "Glyph",
    "46": "Gold",
    "47": "Growth",
    "48": "Hatchling",
    "49": "Healing",
    "50": "Hoofprint",
    "51": "Hourglass",
    "52": "Hunger",
    "53": "Ice",
    "54": "Infection",
    "55": "Intervention",
    "56": "Javelin",
    "57": "Ki",
    "58": "Level",
    "59": "Luck",
    "60": "Magnet",
    "61": "Mannequin",
    "62": "Matrix",
    "63": "May",
    "64": "Mine",
    "65": "Mining",
    "66": "Mire",
    "67": "Muster",
    "68": "Net",
    "69": "Omen",
    "70": "Ore",
    "71": "Page",
    "72": "Pain",
    "73": "Paralyzation",
    "74": "Petal",
    "75": "Petrification",
    "76": "Phylactery",
    "77": "Pin",
    "78": "Plague",
    "79": "Polyp",
    "80": "Pressure",
    "81": "Pupa",
    "82": "Quest",
    "83": "Scream",
    "84": "Scroll",
    "85": "Shell",
    "86": "Shield",
    "87": "Shred",
    "88": "Sleep",
    "89": "Sleight",
    "90": "Slime",
    "91": "Soot",
    "92": "Spell",
    "93": "Spore",
    "94": "Storage",
    "95": "Strife",
    "96": "Study",
    "97": "Theft",
    "98": "Tide",
    "100": "Tower",
    "101": "Training",
    "102": "Trap",
    "103": "Treasure",
    "104": "Verse",
    "105": "Vitality",
    "106": "Wage",
    "107": "Winch",
    "108": "Lore",
    "109": "+1/+2",
    "110": "+0/+1",
    "111": "+0/+2",
    "112": "+1/+0",
    "113": "+2/+2",
    "114": "-0/-1",
    "115": "-0/-2",
    "116": "-1/-0",
    "117": "-2/-1",
    "118": "-2/-2",
    "119": "Manifestation",
    "120": "Gem",
    "121": "Crystal",
    "122": "Isolation",
    "123": "Hour",
    "124": "Unity",
    "125": "Velocity",
    "126": "Brick",
    "127": "Landmark",
    "128": "Prey",
    "129": "Silver",
    "130": "Egg",
    "131": "Hit",
    "132": "PlaceholderCounterType1",
    "133": "PlaceholderCounterType2",
    "134": "PlaceholderCounterType3",
    "135": "PlaceholderCounterType4",
    "136": "PlaceholderCounterType5"
  },
  SuperType: {
    "1": "Basic",
    "2": "Legendary",
    "3": "Ongoing",
    "4": "Snow",
    "5": "World"
  },
  ResultCode: {
    "0": "",
    "1": "Success",
    "2": "Failure",
    "3": "Creature cannot attack",
    "4": "Attacking costs not paid",
    "5": "Creature cannot block",
    "6": "Blocker cannot block attacker",
    "7": "Damage ordering contains omissions or additions",
    "8": "Damage sources contain omissions",
    "9": "Damage sources contain additions",
    "10":
      "Attempt to assign damage such that non-lethal damage is assigned to anything other than the last recipient in the order",
    "12": "Too many targets selected",
    "13": "Not enough targets selected",
    "14": "Selected target is not valid"
  },
  SubType: {
    "1": "Angel",
    "2": "Archer",
    "3": "Archon",
    "4": "Artificer",
    "5": "Assassin",
    "6": "Aura",
    "7": "Basilisk",
    "8": "Bat",
    "9": "Bear",
    "10": "Beast",
    "11": "Berserker",
    "12": "Bird",
    "13": "Boar",
    "14": "Cat",
    "15": "Chandra",
    "16": "Cleric",
    "17": "Construct",
    "18": "Crocodile",
    "19": "Demon",
    "20": "Djinn",
    "21": "Dragon",
    "22": "Drake",
    "23": "Druid",
    "24": "Fish",
    "25": "Elemental",
    "26": "Elephant",
    "27": "Elf",
    "28": "Equipment",
    "29": "Forest",
    "30": "Garruk",
    "31": "Gate",
    "32": "Giant",
    "33": "Gideon",
    "34": "Goblin",
    "35": "Golem",
    "36": "Griffin",
    "37": "Horse",
    "38": "Hound",
    "39": "Human",
    "40": "Hydra",
    "41": "Illusion",
    "42": "Insect",
    "43": "Island",
    "44": "Jace",
    "45": "Knight",
    "46": "Merfolk",
    "47": "Minotaur",
    "48": "Monk",
    "49": "Mountain",
    "50": "Ogre",
    "51": "Ooze",
    "52": "Pegasus",
    "53": "Phoenix",
    "54": "Plains",
    "55": "Rhino",
    "56": "Rogue",
    "57": "Salamander",
    "58": "Scout",
    "59": "Serpent",
    "60": "Shade",
    "61": "Shaman",
    "62": "Siren",
    "63": "Skeleton",
    "64": "Soldier",
    "65": "Sorin",
    "66": "Sphinx",
    "67": "Spider",
    "68": "Spirit",
    "69": "Swamp",
    "70": "Tower",
    "71": "Treefolk",
    "72": "Troll",
    "73": "Urza's",
    "74": "Vampire",
    "75": "Vedalken",
    "76": "Wall",
    "77": "Warrior",
    "78": "Wizard",
    "79": "Wolf",
    "80": "Wurm",
    "81": "Zombie",
    "82": "Mine",
    "83": "Power-Plant",
    "84": "Saproling",
    "85": "Avatar",
    "86": "Sliver",
    "87": "Samurai",
    "88": "Pest",
    "89": "Thalakos",
    "90": "Dauthi",
    "91": "Minion",
    "92": "Advisor",
    "93": "Ajani",
    "94": "Alara",
    "95": "Ally",
    "97": "Antelope",
    "98": "Ape",
    "99": "Arcane",
    "100": "Arkhos",
    "101": "Ashiok",
    "102": "Assembly-Worker",
    "103": "Atog",
    "104": "Aurochs",
    "105": "Azgol",
    "106": "Badger",
    "107": "Barbarian",
    "108": "Beeble",
    "109": "Belenon",
    "110": "Bolas",
    "111": "Bolass",
    "112": "Bringer",
    "113": "Brushwagg",
    "114": "Camel",
    "115": "Carrier",
    "116": "Centaur",
    "117": "Cephalid",
    "118": "Chimera",
    "119": "Cockatrice",
    "120": "Crab",
    "121": "Curse",
    "122": "Cyclops",
    "123": "Desert",
    "124": "Devil",
    "125": "Dominaria",
    "126": "Domri",
    "127": "Dreadnought",
    "128": "Drone",
    "129": "Dryad",
    "130": "Dwarf",
    "131": "Efreet",
    "132": "Elder",
    "133": "Eldrazi",
    "134": "Elk",
    "135": "Elspeth",
    "136": "Equilor",
    "137": "Ergamon",
    "138": "Eye",
    "139": "Fabacin",
    "140": "Faerie",
    "141": "Ferret",
    "142": "Flagbearer",
    "143": "Fortification",
    "144": "Fox",
    "145": "Frog",
    "146": "Fungus",
    "147": "Gargoyle",
    "148": "Gnome",
    "149": "Goat",
    "150": "God",
    "151": "Gorgon",
    "152": "Gremlin",
    "153": "Hag",
    "154": "Harpy",
    "155": "Hellion",
    "156": "Hippo",
    "157": "Hippogriff",
    "158": "Homarid",
    "159": "Homunculus",
    "160": "Horror",
    "161": "Hyena",
    "162": "Imp",
    "163": "Incarnation",
    "164": "Innistrad",
    "165": "Iquatana",
    "166": "Ir",
    "167": "Jellyfish",
    "168": "Juggernaut",
    "169": "Kaldheim",
    "170": "Kamigawa",
    "171": "Karn",
    "172": "Karsus",
    "173": "Kavu",
    "174": "Kephalai",
    "175": "Kirin",
    "176": "Kithkin",
    "177": "Kobold",
    "178": "Kolbahan",
    "179": "Kor",
    "180": "Koth",
    "181": "Kraken",
    "182": "Kyneth",
    "183": "Lair",
    "184": "Lammasu",
    "185": "Leech",
    "186": "Leviathan",
    "187": "Lhurgoyf",
    "188": "Licid",
    "189": "Liliana",
    "190": "Lizard",
    "191": "Locus",
    "192": "Lorwyn",
    "193": "Luvion",
    "194": "Manticore",
    "195": "Masticore",
    "196": "Meditation",
    "197": "Mercadia",
    "198": "Mercenary",
    "199": "Metathran",
    "200": "Mirrodin",
    "201": "Moag",
    "202": "Monger",
    "203": "Mongoose",
    "204": "Mongseng",
    "205": "Moonfolk",
    "206": "Muraganda",
    "207": "Mutant",
    "208": "Myr",
    "209": "Mystic",
    "210": "Nautilus",
    "211": "Nephilim",
    "212": "New",
    "213": "Nightmare",
    "214": "Nightstalker",
    "215": "Ninja",
    "216": "Nissa",
    "217": "Noggle",
    "218": "Nomad",
    "219": "Nymph",
    "220": "Octopus",
    "221": "Orc",
    "222": "Orgg",
    "223": "Ouphe",
    "224": "Ox",
    "225": "Oyster",
    "226": "Phelddagrif",
    "227": "Phyrexia",
    "228": "Pirate",
    "229": "Plant",
    "230": "Praetor",
    "231": "Pyrulea",
    "232": "Rabbit",
    "233": "Rabiah",
    "234": "Ral",
    "235": "Rat",
    "236": "Rath",
    "237": "Ravnica",
    "238": "Realm",
    "239": "Rebel",
    "240": "Regatha",
    "241": "Rigger",
    "242": "Sable",
    "243": "Sarkhan",
    "244": "Satyr",
    "245": "Scarecrow",
    "246": "Scorpion",
    "247": "Segovia",
    "248": "Serras",
    "249": "Shadowmoor",
    "250": "Shandalar",
    "251": "Shapeshifter",
    "252": "Sheep",
    "253": "Shrine",
    "254": "Slith",
    "255": "Slug",
    "256": "Snake",
    "257": "Soltari",
    "258": "Spawn",
    "259": "Specter",
    "260": "Spellshaper",
    "261": "Spike",
    "262": "Sponge",
    "263": "Squid",
    "264": "Squirrel",
    "265": "Starfish",
    "266": "Surrakar",
    "267": "Tamiyo",
    "268": "Tezzeret",
    "269": "Thopter",
    "270": "Thrull",
    "271": "Tibalt",
    "272": "Trap",
    "273": "Turtle",
    "274": "Ulgrotha",
    "275": "Unicorn",
    "276": "Valla",
    "277": "Venser",
    "278": "Viashino",
    "279": "Volver",
    "280": "Vraska",
    "281": "Vryn",
    "282": "Weird",
    "283": "Werewolf",
    "284": "Whale",
    "285": "Wildfire",
    "286": "Wolverine",
    "287": "Wombat",
    "288": "Worm",
    "289": "Wraith",
    "290": "Xenagos",
    "291": "Xerex",
    "292": "Yeti",
    "293": "Zendikar",
    "294": "Zubera",
    "295": "Germ",
    "296": "Contraption",
    "297": "Citizen",
    "298": "Coward",
    "299": "Deserter",
    "300": "Prism",
    "301": "Reflection",
    "302": "Sand",
    "303": "Serf",
    "304": "Dack",
    "305": "Kiora",
    "306": "AllCreatureTypes",
    "307": "Blinkmoth",
    "308": "Camarid",
    "309": "Caribou",
    "310": "Graveborn",
    "311": "Lamia",
    "312": "Orb",
    "313": "Pentavite",
    "314": "Pincher",
    "315": "Splinter",
    "316": "Survivor",
    "317": "Tetravite",
    "318": "Triskelavite",
    "319": "Scion",
    "320": "Processor",
    "321": "Arlinn",
    "322": "Mole",
    "323": "Nahiri",
    "324": "Clue",
    "325": "Teferi",
    "326": "Daretti",
    "327": "Freyalise",
    "328": "Nixilis",
    "329": "Narset",
    "330": "Ugin",
    "331": "Vehicle",
    "332": "Servo",
    "333": "Dovin",
    "334": "Saheeli",
    "335": "Monkey",
    "336": "Aetherborn",
    "337": "Pilot",
    "338": "Jackal",
    "339": "Naga",
    "340": "Cartouche",
    "341": "Samut",
    "342": "Dinosaur",
    "343": "Treasure",
    "344": "Huatli",
    "345": "Angrath",
    "346": "Trilobite",
    "347": "Saga",
    "348": "Jaya",
    "349": "Vivien",
    "350": "Egg",
    "351": "PlaceholderSubType1",
    "352": "PlaceholderSubType2",
    "353": "PlaceholderSubType3",
    "354": "PlaceholderSubType4",
    "355": "PlaceholderSubType5"
  },
  FailureReason: {
    "0": "",
    "1": "Request made with out of date game state.",
    "2": "Player has acted out of turn.",
    "3": "Response does not match the pending request.",
    "4": "Attempted to batch actions that must be performed one at at time.",
    "5":
      "Attempted to perform an action not currently on the list of legal actions.",
    "6":
      "An optional field in the message should have been supplied based on the contents of the required fields, but was not.",
    "7": "Selected an option that is not on the list of legal options.",
    "8": "Message contains a bad enum.",
    "9": "Targeted spell or ability does not have sufficient valid targets.",
    "10": "Target specified for out-of-range target index.",
    "11": "Specified target is not on the legal targets list.",
    "12": "Specified mana does not exist.",
    "13": "Specified option selection is not valid.",
    "14": "The message received was not expected by the GRE.",
    "15":
      "Player input is below a specified minimum or above a specified maximum."
  },
  Phase: {
    "0": "",
    "1": "Beginning",
    "2": "1st Main",
    "3": "Combat",
    "4": "2nd Main",
    "5": "Ending"
  },
  MatchState: {
    "0": "",
    "1": "Game In Progress",
    "2": "Game Complete, Match In Progress",
    "3": "Match Complete",
    "4": "Sideboarding"
  },
  Step: {
    "0": "",
    "1": "Untap",
    "2": "Upkeep",
    "3": "Draw",
    "4": "Begin Combat",
    "5": "Declare Attackers",
    "6": "Declare Blockers",
    "7": "Combat Damage",
    "8": "End Combat",
    "9": "End",
    "10": "Cleanup",
    "11": "First Strike Damage"
  },
  CardType: {
    "1": "Artifact",
    "2": "Creature",
    "3": "Enchantment",
    "4": "Instant",
    "5": "Land",
    "6": "Phenomenon",
    "7": "Plane",
    "8": "Planeswalker",
    "9": "Scheme",
    "10": "Sorcery",
    "11": "Tribal",
    "12": "Vanguard"
  },
  Color: { "1": "White", "2": "Blue", "3": "Black", "4": "Red", "5": "Green" }
};

//
var setsList = cardsDb.get("sets");
var eventsList = cardsDb.get("events");
var eventsToFormat = cardsDb.get("events_format");
const formats = {
  Standard: "Standard",
  TraditionalStandard: "Traditional Standard",
  Draft: "Draft",
  Sealed: "Sealed",
  Pauper: "Pauper",
  Singleton: "Singleton",
  Cascade: "Cascade",
  Pandemonium: "Pandemonium",
  NoInstants: "No Instants",
  DirectGame: "Direct Game",
  precon: "Preconstructed",
  Ravnica: "Ravnica Block",
  Ixalan: "Ixalan Block",
  GRN: "Ravnica Constructed",
  XLN: "Ixalan Constructed"
};
var rankedEvents = cardsDb.get("ranked_events");
var renderer = 0;
var rarities = ["common", "uncommon", "rare", "mythic"];
const orderedColorCodes = ["w", "u", "b", "r", "g", "c"];
const orderedColorCodesCommon = ["w", "u", "b", "r", "g"];

var draftRanks = [];
draftRanks[12] = "A+";
draftRanks[11] = "A";
draftRanks[10] = "A-";
draftRanks[9] = "B+";
draftRanks[8] = "B";
draftRanks[7] = "B-";
draftRanks[6] = "C+";
draftRanks[5] = "C";
draftRanks[4] = "C-";
draftRanks[3] = "D+";
draftRanks[2] = "D";
draftRanks[1] = "D-";
draftRanks[0] = "F";

var playerDataDefault = {
  name: null,
  userName: null,
  arenaId: "",
  arenaVersion: "",
  patreon: false,
  patreon_tier: 0,
  decks_last_used: [],
  rank: {
    constructed: {
      rank: "",
      tier: 0,
      step: 0,
      steps: 4,
      won: 0,
      lost: 0,
      drawn: 0
    },
    limited: {
      rank: "",
      tier: 0,
      step: 0,
      steps: 4,
      won: 0,
      lost: 0,
      drawn: 0
    }
  }
};

// Mostly an alias to document.querySelectorAll but
// allows second argument to specify an alternative parent
// Also returns an array.
// Usage:
// queryElements(".classname").forEach(el => do_something(el))
// queryElements("#elementId")
// queryElements("#elementId", otherElement)
function queryElements(selectors, parentNode = document) {
  return [...parentNode.querySelectorAll(selectors)];
}

function queryElementsByClass(selectors, parentNode = document) {
  return [...parentNode.getElementsByClassName(selectors)];
}

// useful alias
window.$$ = queryElements;

// several utility functions to replace useful jQuery methods
function show(element, mode) {
  if (!mode) {
    mode = "block";
  }
  element.style.display = mode;
  return element;
}

function hide(element) {
  element.style.display = "none";
  return element;
}

function wrap(element, wrapper) {
  element.parentNode.insertBefore(wrapper, element);
  wrapper.appendChild(element);
  return element;
}

function addCardTile(
  grpId,
  indent,
  quantity,
  element,
  showWildcards = false,
  deck = null,
  isSideboard = false
) {
  // if element is a jquery object convert to bare DOM element
  // TODO: Remove this once jQuery is removed.
  if (element instanceof jQuery) {
    element = element[0];
  }

  if (quantity !== 0) {
    var cont = createDivision(["card_tile_container", "click-on"]);

    cont.dataset["grpId"] = grpId;
    cont.dataset["id"] = indent;
    cont.dataset["quantity"] = quantity;

    var ww, ll;
    if (!isNumber(quantity)) {
      ww = 64;
      ll = 48;
      let col = get_rank_class(quantity);
      cont.appendChild(
        createDivision(["card_tile_odds", col], `<span>${quantity}</span>`)
      );
    } else if (quantity == 9999) {
      quantity = 1;
      ww = 32;
      ll = 17;

      var quantityDiv = createDivision(
        ["card_tile_quantity"],
        `<span>${quantity}</span>`
      );
      quantityDiv.style.cssText =
        "color: rgba(255, 255, 255, 0); min-width: 0px; width: 0px;";
      cont.appendChild(quantityDiv);
    } else {
      ww = 64;
      ll = 49;
      var quantityDiv = createDivision(
        ["card_tile_quantity"],
        `<span>${quantity}</span>`
      );
      cont.appendChild(quantityDiv);
    }
    element.appendChild(cont);
    var card = cardsDb.get(grpId);
    var cardTile = createDivision([
      "card_tile",
      get_frame_class(card ? card.frame : [])
    ]);
    cardTile.id = `t${grpId + indent}`;
    cardTile.style.cssText = `min-width: calc(100% - ${ww}px);`;
    // cardTile.style.minWidth = `calc(100% - ${ww}px)`;
    cont.appendChild(cardTile);

    // Glow hover
    var glow = createDivision(["card_tile_glow"]);
    glow.id = `t${grpId + indent}`;
    glow.style.cssText = `min-width: calc(100% - ${ww}px); left: calc(0px - 100% + ${ll}px)`;
    cont.appendChild(glow);

    if (card) {
      addCardHover(glow, card);
      glow.addEventListener("mouseenter", evt => {
        cardTile.style.marginTop = "0";
      });
      glow.addEventListener("mouseleave", evt => {
        cardTile.style.marginTop = "3px";
      });

      glow.addEventListener("click", evt => {
        if (card.dfc == "SplitHalf") {
          card = cardsDb.get(card.dfcId);
        }
        shell.openExternal(
          `https://scryfall.com/card/${get_set_scryfall(card.set)}/${
            card.cid
          }/${card.name}`
        );
      });
    }

    //
    var fl = createDivision(["flex_item"]);
    fl.appendChild(
      createDivision(["card_tile_name"], card ? card.name : "Unknown")
    );
    cardTile.appendChild(fl);

    var fl2 = createDivision(["flex_item"]);
    fl2.style.lineHeight = "26px";
    cardTile.appendChild(fl2);

    if (!card) return cont;

    var prevc = true;
    card.cost.forEach(function(cost) {
      if (/^(x|\d)+$/.test(cost) && prevc == false) {
        fl2.innerHTML += "//";
      }
      fl2.appendChild(createDivision(["mana_s16", "flex_end", `mana_${cost}`]));

      prevc = /^\d+$/.test(cost);
    });

    if (showWildcards && renderer == 0) {
      if (card.type.indexOf("Basic Land") == -1) {
        let missing = 0;
        if (deck) {
          missing = get_wc_missing(deck, grpId, isSideboard);
        }

        let xoff = rarities.indexOf(card.rarity) * -24;

        //if (cards[grpId] == undefined) {
        if (missing > 0) {
          let yoff = missing * -24;

          var asasdf = createDivision(["not_owned_sprite"]);
          asasdf.style.cssText = `background-position: ${xoff}px ${yoff}px; left: calc(0px - 100% + ${ww -
            14}px);`;
          asasdf.title = `${missing} missing`;
          cont.appendChild(asasdf);
        }
        /*}
        else if (missing > cards[grpId]) {
          let yoff = (missing - cards[grpId]) * -24;
          cont.append(`<div style="background-position: ${xoff}px ${yoff}px; left: calc(0px - 100% + ${(ww-14)}px);" class="not_owned_sprite" title="${(missing-cards[grpId])} missing"></div>`);
        }
        */
      }
    }

    return cont;
  }
  return false;
}

/**
 * Creates a select box
 * This is a "fixed" version of SelectAdd and should replace it.
 **/
function createSelect(
  parent,
  options,
  current,
  callback,
  divClass,
  optionFormatter
) {
  let selectContainer = createDivision(["select_container", divClass]);
  selectContainer.id = divClass;
  if (!options.includes(current)) current = options[0];
  selectContainer.value = current;
  let currentDisplay = current;
  if (typeof optionFormatter === "function") {
    currentDisplay = optionFormatter(current);
  }
  let selectButton = createDivision(["select_button"], currentDisplay);
  let selectOptions = createDivision(["select_options_container"]);

  selectContainer.appendChild(selectButton);
  selectContainer.appendChild(selectOptions);

  selectButton.addEventListener("click", () => {
    if (!selectButton.classList.contains("active")) {
      current = selectContainer.value;

      selectButton.classList.add("active");
      selectOptions.style.display = "block";
      for (let i = 0; i < options.length; i++) {
        if (options[i] !== current) {
          let optionDisplay = options[i];
          if (typeof optionFormatter === "function") {
            optionDisplay = optionFormatter(optionDisplay);
          }

          let option = createDivision(["select_option"], optionDisplay);
          selectOptions.appendChild(option);

          option.addEventListener("click", () => {
            selectButton.classList.remove("active");
            selectButton.innerHTML = optionDisplay;
            selectContainer.value = options[i];
            selectOptions.style.display = "none";
            selectOptions.innerHTML = "";
            callback(options[i]);
          });
        }
      }
    } else {
      selectButton.classList.remove("active");
      selectOptions.innerHTML = "";
      selectOptions.style.display = "none";
    }
  });

  parent.appendChild(selectContainer);

  return selectContainer;
}

// When given a <select> element will convert to
// list format to allow more style options
function selectAdd(selectElement, callback) {
  if (selectElement instanceof jQuery) {
    selectElement = selectElement[0];
  }

  selectElement.classList.add("select-hidden");

  // dom structure is
  // container
  //   selectElement
  //   styledSelect
  //   list

  var container = createDivision(["select"]);
  wrap(selectElement, container);

  var styledSelect = createDivision(
    ["select-styled"],
    selectElement.options[0].textContent
  );
  container.appendChild(styledSelect);

  var list = document.createElement("ul");
  list.className = "select-options";
  container.appendChild(list);

  // insert list entries
  [...selectElement.options].forEach(option => {
    var li = document.createElement("li");
    li.innerHTML = option.textContent;
    li.rel = option.value;
    list.appendChild(li);
  });

  // Open and close the dropdown
  styledSelect.addEventListener("click", evt => {
    evt.stopPropagation();

    // toggle current select
    if (styledSelect.classList.contains("active")) {
      styledSelect.classList.remove("active");
    } else {
      styledSelect.classList.add("active");
    }

    // disable other selects on the page
    $$("div.select-styled")
      .filter(select => select !== styledSelect)
      .forEach(select => select.remove("active"));
  });

  // var listItems = list.childNodes;
  list.addEventListener("click", evt => {
    evt.stopPropagation();
    var option = evt.target;
    console.log("option", option, evt);

    styledSelect.innerHTML = option.textContent;
    styledSelect.classList.remove("active");

    selectElement.value = option.rel;

    callback(selectElement.value);
  });

  // hide the select if the document is clicked.
  document.addEventListener("click", evt => {
    styledSelect.classList.remove("active");
  });
}

// Attaches a hover event to any DOM element.
// Howver over the element with the mouse pops up
// card info for `card`
function addCardHover(element, card) {
  if (!card || !card.images) return;

  if (element instanceof jQuery) {
    element = element[0];
  }

  element.addEventListener("mouseover", evt => {
    $$(".loader, .main_hover").forEach(element => (element.style.opacity = 1));

    // Split cards are readable both halves, no problem
    if (card.dfc != "None" && card.dfc != "SplitHalf" && renderer == 0) {
      $$(".loader_dfc, .main_hover_dfc").forEach(el => {
        show(el);
        el.style.opacity = 1;
      });

      var dfcCard = cardsDb.get(card.dfcId);
      var dfcCardImage = get_card_image(dfcCard);

      var dfcImageElement = $$(".main_hover_dfc")[0];
      dfcImageElement.src = dfcCardImage;
      dfcImageElement.addEventListener("load", evt => {
        $$(".loader_dfc").forEach(el => (el.style.opacity = 0));
      });
    } else {
      $$(".main_hover_dfc, .loader_dfc").forEach(hide);
    }

    var mainImageElement = $$(".main_hover")[0];
    mainImageElement.src = get_card_image(card);
    mainImageElement.addEventListener("load", evt => {
      $$(".loader").forEach(el => (el.style.opacity = 0));
    });

    // show card quantity
    if (renderer == 0) {
      attachOwnerhipStars(card, $$(".hover_card_quantity")[0]);
    }
  });

  element.addEventListener("mouseleave", () => {
    $$(
      ".hover_card_quantity, .main_hover, .main_hover_dfc, .loader, .loader_dfc"
    ).forEach(element => (element.style.opacity = 0));
  });
}

function attachOwnerhipStars(card, starContainer) {
  starContainer.innerHTML = "";
  starContainer.style.opacity = 1;

  let owned = cards[card.id];
  let aquired = cardsNew[card.id];
  for (let i = 0; i < 4; i++) {
    let color = "gray";

    if (i < owned) color = "green";
    if (aquired && i >= owned - aquired && i < owned) color = "orange";

    starContainer.appendChild(
      createDivision([`inventory_card_quantity_${color}`])
    );
  }
}

//
function get_card_image(cardObj) {
  if (typeof cardObj !== "object") {
    cardObj = cardsDb.get(cardObj);
  }

  if (!cardObj) {
    return "../images/notfound.png";
  } else {
    return "https://img.scryfall.com/cards" + cardObj.images[cardQuality];
  }
}

//
function get_card_art(cardObj) {
  if (typeof cardObj !== "object") {
    cardObj = cardsDb.get(cardObj);
  }

  if (!cardObj) {
    return "../images/notfound.png";
  } else {
    return "https://img.scryfall.com/cards" + cardObj.images.art_crop;
  }
}

//
function get_rank_index(_rank, _tier) {
  var ii = 0;
  if (_rank == "Unranked") ii = 0;
  if (_rank == "Bronze") ii = 1 + (_tier - 1); //1 2 3 4
  if (_rank == "Silver") ii = 5 + (_tier - 1); //5 6 7 8
  if (_rank == "Gold") ii = 9 + (_tier - 1); //9 0 1 2
  if (_rank == "Platinum") ii = 13 + (_tier - 1); //3 4 5 6
  if (_rank == "Diamond") ii = 17 + (_tier - 1); //7 8 9 0
  if (_rank == "Mythic") ii = 21 + (_tier - 1); //1 2 3 4
  return ii;
}

//
function get_rank_index_16(_rank) {
  var ii = 0;
  if (_rank == "Unranked") ii = 0;
  if (_rank == "Bronze") ii = 1;
  if (_rank == "Silver") ii = 2;
  if (_rank == "Gold") ii = 3;
  if (_rank == "Platinum") ii = 4;
  if (_rank == "Diamond") ii = 5;
  if (_rank == "Mythic") ii = 6;
  return ii;
}

//
function addCardSeparator(i, element, number = 0) {
  if (element instanceof jQuery) {
    element = element[0];
  }

  var str = "";
  switch (i) {
    case 1:
      str = "Creature";
      break;
    case 2:
      str = "Planeswalker";
      break;
    case 3:
      str = "Instant";
      break;
    case 4:
      str = "Sorcery";
      break;
    case 5:
      str = "Artifact";
      break;
    case 6:
      str = "Enchantment";
      break;
    case 7:
      str = "Land";
      break;
    case 98:
      str = "Mainboard";
      break;
    case 99:
      str = "Sideboard";
      break;
    default:
      str = i;
      break;
  }

  if (number > 0) {
    str += ` (${number})`;
  }

  element.appendChild(createDivision(["card_tile_separator"], str));
}

//
function isNumber(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

function getDeck(deckId) {
  const matches = decks.filter(deck => deck.id === deckId);
  if (!matches.length) return null;
  return matches[0];
}

function doesDeckStillExist(deckId) {
  return decks.filter(deck => deck.id === deckId).length > 0;
}

function getRecentDeckName(deckId) {
  if (doesDeckStillExist(deckId)) {
    return getDeck(deckId).name;
  }
  return deckId;
}

//
function getReadableEvent(arg) {
  if (eventsList[arg] != undefined) {
    return eventsList[arg];
  }

  return arg;
}

//
function getReadableFormat(format) {
  if (format in formats) {
    return formats[format];
  }
  return format || "Unknown";
}

function getReadableQuest(questCode) {
  // FIXME: Can we get a human readable quest name?
  // For now lets just use a small portion of the ID.
  return `#${questCode.substring(0, 6)}`;
}

//
function getEventId(arg) {
  var ret = arg;
  Object.keys(eventsList).forEach(function(key) {
    if (eventsList[key] == arg) {
      ret = key;
    }
  });

  return ret;
}

//
function removeDuplicates(decklist) {
  var newList = [];
  try {
    decklist.forEach(function(card) {
      var cname = cardsDb.get(card.id).name;
      var added = false;
      newList.forEach(function(c) {
        var cn = cardsDb.get(c.id).name;
        if (cn == cname) {
          if (c.quantity !== 9999) {
            c.quantity += card.quantity;
          }
          if (c.chance != undefined) {
            c.chance += card.chance;
          }
          added = true;
        }
      });

      if (!added) {
        newList.push(card);
      }
    });
    return newList;
  } catch (e) {
    return [];
  }
}

//
function get_card_type_sort(a) {
  if (a == undefined) return 0;
  if (a.includes("Creature", 0)) return 1;
  if (a.includes("Planeswalker", 0)) return 2;
  if (a.includes("Instant", 0)) return 3;
  if (a.includes("Sorcery", 0)) return 4;
  if (a.includes("Artifact", 0)) return 5;
  if (a.includes("Enchantment", 0)) return 6;
  if (a.includes("Land", 0)) return 7;
  return 0;
}

//
function deck_count_types(deck, type, side) {
  if (type.includes("Land", 0)) type = "Land";
  else if (type.includes("Creature", 0)) type = "Creature";
  else if (type.includes("Artifact", 0)) type = "Artifact";
  else if (type.includes("Enchantment", 0)) type = "Enchantment";
  else if (type.includes("Instant", 0)) type = "Instant";
  else if (type.includes("Sorcery", 0)) type = "Sorcery";
  else if (type.includes("Planeswalker", 0)) type = "Planeswalker";

  let count = 0;
  deck.mainDeck.forEach(card => {
    let c = cardsDb.get(card.id);
    if (c.type.includes(type, 0)) {
      if (card.quantity == 9999) count += 1;
      else count += card.quantity;
    }
  });

  if (side) {
    deck.sideboard.forEach(card => {
      let c = cardsDb.get(card.id);
      if (c.type.includes(type, 0)) {
        if (card.quantity == 9999) count += 1;
        else count += card.quantity;
      }
    });
  }

  return count;
}

//
function deck_count(deck) {
  let count = 0;
  deck.mainDeck.forEach(card => {
    if (card.quantity == 9999) count += 1;
    else count += card.quantity;
  });
  return count;
}

//
function compare_cards(a, b) {
  // Yeah this is lazy.. I know
  a = cardsDb.get(a.id);
  b = cardsDb.get(b.id);
  var as = get_card_type_sort(a.type);
  var bs = get_card_type_sort(b.type);

  // Order by type?
  if (as < bs) {
    return -1;
  }
  if (as > bs) {
    return 1;
  }

  // by cmc
  if (a.cmc < b.cmc) {
    return -1;
  }
  if (a.cmc > b.cmc) {
    return 1;
  }

  // then by name
  if (a.name < b.name) {
    return -1;
  }
  if (a.name > b.name) {
    return 1;
  }

  return 0;
}

//
function compare_chances(a, b) {
  // Yeah this is lazy.. I know
  a = a.chance;
  b = b.chance;

  if (a > b) {
    return -1;
  }
  if (a < b) {
    return 1;
  }

  return 0;
}

function compare_decks(a, b) {
  const aName = getRecentDeckName(a.id);
  const aExists = doesDeckStillExist(a.id) ? 1 : 0;
  const bName = getRecentDeckName(b.id);
  const bExists = doesDeckStillExist(b.id) ? 1 : 0;
  // sort by existence, then name
  return bExists - aExists || aName.localeCompare(bName);
}

//
function compare_draft_cards(a, b) {
  // Yeah this is lazy.. I know
  a = cardsDb.get(a);
  b = cardsDb.get(b);
  var as = get_card_type_sort(a.type);
  var bs = get_card_type_sort(b.type);

  // Order by type?
  if (as < bs) {
    return -1;
  }
  if (as > bs) {
    return 1;
  }

  // by cmc
  if (a.cmc < b.cmc) {
    return -1;
  }
  if (a.cmc > b.cmc) {
    return 1;
  }

  // then by name
  if (a.name < b.name) {
    return -1;
  }
  if (a.name > b.name) {
    return 1;
  }

  return 0;
}

//
function compare_archetypes(a, b) {
  if (a.average > b.average) return -1;
  if (a.average < b.average) return 1;
  return 0;
}

//
function get_set_scryfall(set) {
  if (set == undefined) return "";
  let s = setsList[set].scryfall;
  if (s == undefined) s = set;
  return s;
}

//
function get_colation_set(collationid) {
  var ret = "";
  Object.keys(setsList).forEach(function(setName) {
    if (setsList[setName].collation == collationid) {
      ret = setName;
    }
  });

  return ret;
}

//
function get_set_code(set) {
  if (set == undefined) return "";
  let s = setsList[set].code;
  if (s == undefined) s = set;
  return s;
}

//
class CountStats {
  constructor(
    owned = 0,
    total = 0,
    unique = 0,
    complete = 0,
    wanted = 0,
    uniqueWanted = 0,
    uniqueOwned = 0
  ) {
    this.owned = owned;
    this.total = total;
    this.unique = unique;
    this.complete = complete; // all 4 copies of a card
    this.wanted = wanted;
    this.uniqueWanted = uniqueWanted;
    this.uniqueOwned = uniqueOwned;
  }

  get percentage() {
    if (this.total) {
      return (this.owned / this.total) * 100;
    } else {
      return 100;
    }
  }
}

//
class SetStats {
  constructor(set) {
    this.set = set;
    this.common = new CountStats();
    this.uncommon = new CountStats();
    this.rare = new CountStats();
    this.mythic = new CountStats();
  }

  get all() {
    return [
      new CountStats(),
      this.common,
      this.uncommon,
      this.rare,
      this.mythic
    ].reduce((acc, c) => {
      acc.owned += c.owned;
      acc.total += c.total;
      acc.unique += c.unique;
      acc.complete += c.complete;
      acc.wanted += c.wanted;
      acc.uniqueOwned += c.uniqueOwned;
      return acc;
    });
  }
}

//
function get_collection_stats() {
  const stats = {
    complete: new SetStats("complete")
  };

  for (var set in setsList) {
    stats[set] = new SetStats(set);
  }

  Object.keys(cardsDb.cards).forEach(function(grpId) {
    if (
      grpId != "ok" &&
      grpId != "abilities" &&
      grpId != "events" &&
      grpId != "sets"
    ) {
      const card = cardsDb.get(grpId);
      //var split = card.dfc == "SplitCard" && card.dfcId != 0;
      //if (card.rarity !== "token" && card.rarity !== "land" && card.set !== "Oath of the Gatewatch" && card.dfc != "DFC_Front" && !split) {
      if (card.collectible && card.rarity !== "land") {
        // add to totals
        stats[card.set][card.rarity].total += 4;
        stats.complete[card.rarity].total += 4;
        stats[card.set][card.rarity].unique += 1;
        stats.complete[card.rarity].unique += 1;

        // add cards we own
        if (cards[grpId] !== undefined) {
          var owned = cards[grpId];
          stats[card.set][card.rarity].owned += owned;
          stats.complete[card.rarity].owned += owned;
          stats[card.set][card.rarity].uniqueOwned += 1;
          stats.complete[card.rarity].uniqueOwned += 1;

          // count complete sets we own
          if (owned == 4) {
            stats[card.set][card.rarity].complete += 1;
            stats.complete[card.rarity].complete += 1;
          }
        }

        // count cards we know we want across decks
        let deckWantedCounts = decks.map(deck =>
          getCardsMissingCount(deck, grpId)
        );
        let wanted = Math.max(...deckWantedCounts);
        stats[card.set][card.rarity].wanted += wanted;
        stats.complete[card.rarity].wanted += wanted;

        // count unique cards we know we want across decks
        stats[card.set][card.rarity].uniqueWanted += Math.min(1, wanted);
        stats.complete[card.rarity].uniqueWanted += Math.min(1, wanted);
      }
    }
  });

  return stats;
}

//
function collectionSortName(a, b) {
  a = cardsDb.get(a);
  b = cardsDb.get(b);
  if (a.name < b.name) return -1;
  if (a.name > b.name) return 1;
  return 0;
}

//
function collectionSortSet(a, b) {
  a = cardsDb.get(a);
  b = cardsDb.get(b);
  if (a.set < b.set) return -1;
  if (a.set > b.set) return 1;

  if (parseInt(a.cid) < parseInt(b.cid)) return -1;
  if (parseInt(a.cid) > parseInt(b.cid)) return 1;
  return 0;
}

function getRaritySortValue(rarity) {
  rarity = rarity.toLowerCase();
  switch (rarity) {
    case "land":
      return 5;
      break;
    case "common":
      return 4;
      break;
    case "uncommon":
      return 3;
      break;
    case "rare":
      return 2;
      break;
    case "mythic":
      return 1;
      break;
    default:
      return 0;
      break;
  }
}
//
function collectionSortRarity(a, b) {
  a = cardsDb.get(a);
  b = cardsDb.get(b);
  if (getRaritySortValue(a.rarity) < getRaritySortValue(b.rarity)) return -1;
  if (getRaritySortValue(a.rarity) > getRaritySortValue(b.rarity)) return 1;

  if (a.set < b.set) return -1;
  if (a.set > b.set) return 1;

  if (parseInt(a.cid) < parseInt(b.cid)) return -1;
  if (parseInt(a.cid) > parseInt(b.cid)) return 1;
  return 0;
}

//
function collectionSortCmc(a, b) {
  a = cardsDb.get(a);
  b = cardsDb.get(b);
  if (parseInt(a.cmc) < parseInt(b.cmc)) return -1;
  if (parseInt(a.cmc) > parseInt(b.cmc)) return 1;

  if (a.set < b.set) return -1;
  if (a.set > b.set) return 1;

  if (parseInt(a.cid) < parseInt(b.cid)) return -1;
  if (parseInt(a.cid) > parseInt(b.cid)) return 1;
  return 0;
}

//
function get_collection_export() {
  var list = "";
  Object.keys(cards).forEach(function(key) {
    var add = settings.export_format + "";
    var card = cardsDb.get(key);
    if (card) {
      let name = card.name;
      name = replaceAll(name, "///", "//");
      add = add.replace("$Name", '"' + name + '"');

      add = add.replace("$Count", cards[key] == 9999 ? 1 : cards[key]);

      add = add.replace("$SetName", card.set);
      add = add.replace("$SetCode", setsList[card.set].code);
      add = add.replace("$Collector", card.cid);
      add = add.replace("$Rarity", card.rarity);
      add = add.replace("$Type", card.type);
      add = add.replace("$Cmc", card.cmc);
      list += add + "\r\n";
    }
  });

  return list;
}

// When passed a `deck` object sets `deck.colors` to a sorted array
// of deck colour indices and returns the array.
//
// FIXME: Consider renaming to `set_deck_colors` or removing side
//        effects. `get*` functions should not have side effects.
// FIXME: Rename to camelCase to match javsascript function naming.

function get_deck_colors(deck) {
  var colorIndices = [];
  try {
    deck.mainDeck.forEach(card => {
      if (card.quantity < 1) {
        return;
      }

      let cardData = cardsDb.get(card.id);

      if (!cardData) {
        return;
      }

      let isLand = cardData.type.indexOf("Land") !== -1;
      let frame = cardData.frame;
      if (isLand && frame.length < 3) {
        colorIndices = colorIndices.concat(frame);
      }

      cardData.cost.forEach(cost => {
        if (cost === "w") {
          colorIndices.push(WHITE);
        } else if (cost === "u") {
          colorIndices.push(BLUE);
        } else if (cost === "b") {
          colorIndices.push(BLACK);
        } else if (cost === "r") {
          colorIndices.push(RED);
        } else if (cost === "g") {
          colorIndices.push(GREEN);
        }
      });
    });

    colorIndices = Array.from(new Set(colorIndices));
    colorIndices.sort((a, b) => {
      return a - b;
    });
  } catch (e) {
    // FIXME: Errors shouldn't be caught silently. If this is an
    //        expected error then there should be a test to catch only that error.
    colorIndices = [];
  }

  deck.colors = colorIndices;
  return colorIndices;
}

//
function get_ids_colors(list) {
  var colors = [];
  list.forEach(function(grpid) {
    var cdb = cardsDb.get(grpid);
    if (cdb) {
      //var card_name = cdb.name;
      var card_cost = cdb.cost;
      card_cost.forEach(function(c) {
        if (c.indexOf("w") !== -1 && !colors.includes(1)) colors.push(1);
        if (c.indexOf("u") !== -1 && !colors.includes(2)) colors.push(2);
        if (c.indexOf("b") !== -1 && !colors.includes(3)) colors.push(3);
        if (c.indexOf("r") !== -1 && !colors.includes(4)) colors.push(4);
        if (c.indexOf("g") !== -1 && !colors.includes(5)) colors.push(5);
      });
    }
  });

  return colors;
}

//
function add_deck_colors(colors, deck) {
  var cols = [0, 0, 0, 0, 0, 0];
  deck.forEach(function(card) {
    var grpid = card.id;
    card = cardsDb.get(grpid);
    if (card) {
      //var card_name = card.name;
      var card_cost = card.cost;

      card_cost.forEach(function(c) {
        if (c.indexOf("w") !== -1) cols[1] += 1;
        if (c.indexOf("u") !== -1) cols[2] += 1;
        if (c.indexOf("b") !== -1) cols[3] += 1;
        if (c.indexOf("r") !== -1) cols[4] += 1;
        if (c.indexOf("g") !== -1) cols[5] += 1;
      });
    }
  });

  colors.w += cols[1];
  colors.u += cols[2];
  colors.b += cols[3];
  colors.r += cols[4];
  colors.g += cols[5];

  return colors;
}

//
function compare_colors(color_a, color_b) {
  if (color_a.length != color_b.length) return false;

  for (var i = color_a.length; i--; ) {
    if (color_a[i] !== color_b[i]) {
      return false;
    }
  }

  return true;
}

function get_rank_class(ranking) {
  switch (ranking) {
    case "A+":
      return "blue";
    case "A":
      return "blue";

    case "A-":
      return "green";
    case "B+":
      return "green";
    case "B":
      return "green";

    case "C-":
      return "orange";
    case "D+":
      return "orange";

    case "D":
      return "orange";
    case "D-":
      return "red";
    case "F":
      return "red";

    default:
      return "white";
  }
}

//
function get_wc_missing(deck, grpid, isSideboard) {
  let mainQuantity = 0;
  let mainMatches = deck.mainDeck.filter(card => card.id == grpid);
  if (mainMatches.length) {
    mainQuantity = mainMatches[0].quantity;
  }

  let sideboardQuantity = 0;
  let sideboardMatches = deck.sideboard.filter(card => card.id == grpid);
  if (sideboardMatches.length) {
    sideboardQuantity = sideboardMatches[0].quantity;
  }

  let needed = mainQuantity;
  if (isSideboard) {
    needed = sideboardQuantity;
  }
  // cap at 4 copies to handle petitioners, rat colony, etc
  needed = Math.min(4, needed);

  let card = cardsDb.get(grpid);
  let arr = card.reprints;
  if (!arr) arr = [grpid];
  else arr.push(grpid);

  let have = 0;
  arr.forEach(id => {
    let n = cards[id];
    if (n !== undefined) {
      have += n;
    }
  });

  let copiesLeft = have;
  if (isSideboard) {
    copiesLeft = Math.max(0, copiesLeft - mainQuantity);

    let infiniteCards = [67306, 69172]; // petitioners, rat colony, etc
    if (have >= 4 && infiniteCards.indexOf(grpid) >= 0) {
      copiesLeft = 4;
    }
  }

  return Math.max(0, needed - copiesLeft);
}

//
function get_deck_missing(deck) {
  let missing = { rare: 0, common: 0, uncommon: 0, mythic: 0 };
  let alreadySeenIds = new Set(); // prevents double counting cards across main/sideboard
  let entireDeck = [...deck.mainDeck, ...deck.sideboard];

  entireDeck.forEach(card => {
    let grpid = card.id;
    // process each card at most once
    if (alreadySeenIds.has(grpid)) {
      return;
    }
    let rarity = cardsDb.get(grpid).rarity;
    missing[rarity] += getCardsMissingCount(deck, grpid);
    alreadySeenIds.add(grpid); // remember this card
  });

  return missing;
}

//
function getCardsMissingCount(deck, grpid) {
  let mainMissing = get_wc_missing(deck, grpid, false);
  let sideboardMissing = get_wc_missing(deck, grpid, true);
  return mainMissing + sideboardMissing;
}

//
function getBoosterCountEstimate(wildcards) {
  let boosterCost = 0;
  let boosterEstimates = {
    common: 3.36,
    uncommon: 2.6,
    rare: 5.72,
    mythic: 13.24
  };
  for (let rarity in boosterEstimates) {
    // accept either short or long form of keys in argument
    let shortForm = rarity[0]; // grab first letter
    let missing = wildcards[rarity] || wildcards[shortForm] || 0;
    boosterCost = Math.max(boosterCost, boosterEstimates[rarity] * missing);
  }
  return Math.round(boosterCost);
}

//
function get_deck_uniquestring(deck, side = true) {
  if (!deck) return "";
  deck.mainDeck.sort(compare_cards);

  let str = "";
  deck.mainDeck.forEach(card => {
    str += card.id + "," + card.quantity + ",";
  });

  if (side) {
    deck.sideboard.forEach(card => {
      str += card.id + "," + card.quantity + ",";
    });
  }

  return str;
}

//
function get_deck_sideboarded(deck_a, deck_b) {
  let _in = [];
  let _out = [];

  deck_b.mainDeck.forEach(function(card_b) {
    let found = false;
    deck_a.mainDeck.forEach(function(card_a) {
      if (card_a.id == card_b.id) {
        found = true;
      }
    });
    if (!found) {
      let c = {
        id: card_b.id,
        quantity: card_b.quantity
      };
      _in.push(c);
    }
  });

  deck_b.sideboard.forEach(function(card_b) {
    let found = false;
    deck_a.sideboard.forEach(function(card_a) {
      if (card_a.id == card_b.id) {
        found = true;
      }
    });
    if (!found) {
      let c = {
        id: card_b.id,
        quantity: card_b.quantity
      };
      _out.push(c);
    }
  });

  return { in: _in, out: _out };
}

//
function get_deck_cost(deck) {
  var cost = { rare: 0, common: 0, uncommon: 0, mythic: 0 };

  deck.mainDeck.forEach(function(card) {
    var grpid = card.id;
    var rarity = cardsDb.get(grpid).rarity;

    if (rarity == "common") {
      cost.common += card.quantity;
    }
    if (rarity == "uncommon") {
      cost.uncommon += card.quantity;
    }
    if (rarity == "rare") {
      cost.rare += card.quantity;
    }
    if (rarity == "mythic") {
      cost.mythic += card.quantity;
    }
  });

  deck.sideboard.forEach(function(card) {
    var grpid = card.id;
    var rarity = cardsDb.get(grpid).rarity;

    if (rarity == "common") {
      cost.common += card.quantity;
    }
    if (rarity == "uncommon") {
      cost.uncommon += card.quantity;
    }
    if (rarity == "rare") {
      cost.rare += card.quantity;
    }
    if (rarity == "mythic") {
      cost.mythic += card.quantity;
    }
  });

  return cost;
}

//
function get_deck_curve(deck) {
  var curve = [];

  deck.mainDeck.forEach(function(card) {
    var grpid = card.id;
    var cmc = cardsDb.get(grpid).cmc;
    if (curve[cmc] == undefined) curve[cmc] = [0, 0, 0, 0, 0, 0];

    let card_cost = cardsDb.get(grpid).cost;

    if (cardsDb.get(grpid).type.indexOf("Land") == -1) {
      card_cost.forEach(function(c) {
        if (c.indexOf("w") !== -1) curve[cmc][1] += card.quantity;
        if (c.indexOf("u") !== -1) curve[cmc][2] += card.quantity;
        if (c.indexOf("b") !== -1) curve[cmc][3] += card.quantity;
        if (c.indexOf("r") !== -1) curve[cmc][4] += card.quantity;
        if (c.indexOf("g") !== -1) curve[cmc][5] += card.quantity;
      });

      curve[cmc][0] += card.quantity;
    }
  });
  /*
  // Do not account sideboard?
  deck.sideboard.forEach(function(card) {
    var grpid = card.id;
    var cmc = cardsDb.get(grpid).cmc;
    if (curve[cmc] == undefined)  curve[cmc] = 0;
    curve[cmc] += card.quantity

    if (cardsDb.get(grpid).rarity !== 'land') {
      curve[cmc] += card.quantity
    }
  });
  */
  //console.log(curve);
  return curve;
}

//
function get_deck_types_ammount(deck) {
  var types = { art: 0, cre: 0, enc: 0, ins: 0, lan: 0, pla: 0, sor: 0 };

  deck.mainDeck.forEach(function(card) {
    var c = cardsDb.get(card.id);
    if (c) {
      if (c.type.includes("Land", 0)) types.lan += card.quantity;
      else if (c.type.includes("Creature", 0)) types.cre += card.quantity;
      else if (c.type.includes("Artifact", 0)) types.art += card.quantity;
      else if (c.type.includes("Enchantment", 0)) types.enc += card.quantity;
      else if (c.type.includes("Instant", 0)) types.ins += card.quantity;
      else if (c.type.includes("Sorcery", 0)) types.sor += card.quantity;
      else if (c.type.includes("Planeswalker", 0)) types.pla += card.quantity;
    }
  });

  return types;
}

//
function get_deck_colors_ammount(deck) {
  var colors = { total: 0, w: 0, u: 0, b: 0, r: 0, g: 0, c: 0 };

  //var mana = {0: "", 1: "white", 2: "blue", 3: "black", 4: "red", 5: "green", 6: "colorless", 7: "", 8: "x"}
  deck.mainDeck.forEach(function(card) {
    if (card.quantity > 0) {
      cardsDb.get(card.id).cost.forEach(function(c) {
        if (c.indexOf("w") !== -1) {
          colors.w += card.quantity;
          colors.total += card.quantity;
        }
        if (c.indexOf("u") !== -1) {
          colors.u += card.quantity;
          colors.total += card.quantity;
        }
        if (c.indexOf("b") !== -1) {
          colors.b += card.quantity;
          colors.total += card.quantity;
        }
        if (c.indexOf("r") !== -1) {
          colors.r += card.quantity;
          colors.total += card.quantity;
        }
        if (c.indexOf("g") !== -1) {
          colors.g += card.quantity;
          colors.total += card.quantity;
        }
        if (c.indexOf("c") !== -1) {
          colors.c += card.quantity;
          colors.total += card.quantity;
        }
      });
    }
  });

  return colors;
}

//
function get_deck_lands_ammount(deck) {
  var colors = { total: 0, w: 0, u: 0, b: 0, r: 0, g: 0, c: 0 };

  //var mana = {0: "", 1: "white", 2: "blue", 3: "black", 4: "red", 5: "green", 6: "colorless", 7: "", 8: "x"}
  deck.mainDeck.forEach(function(card) {
    var quantity = card.quantity;
    card = cardsDb.get(card.id);
    if (quantity > 0) {
      if (card.type.indexOf("Land") != -1 || card.type.indexOf("land") != -1) {
        if (card.frame.length < 5) {
          card.frame.forEach(function(c) {
            if (c == 1) {
              colors.w += quantity;
              colors.total += quantity;
            }
            if (c == 2) {
              colors.u += quantity;
              colors.total += quantity;
            }
            if (c == 3) {
              colors.b += quantity;
              colors.total += quantity;
            }
            if (c == 4) {
              colors.r += quantity;
              colors.total += quantity;
            }
            if (c == 5) {
              colors.g += quantity;
              colors.total += quantity;
            }
            if (c == 6) {
              colors.c += quantity;
              colors.total += quantity;
            }
          });
        }
      }
    }
  });

  return colors;
}

//
function get_deck_export(deck) {
  let str = "";
  deck.mainDeck = removeDuplicates(deck.mainDeck);
  deck.mainDeck.forEach(function(card) {
    let grpid = card.id;
    let cardObj = cardsDb.get(grpid);

    if (cardObj.set == "Mythic Edition") {
      grpid = cardObj.reprints[0];
      cardObj = cardsDb.get(grpid);
    }

    let card_name = cardObj.name;
    let card_set = cardObj.set;
    let card_cn = cardObj.cid;
    let card_q = card.quantity;
    if (card_q == 9999) card_q = 1;

    try {
      card_set = setsList[card_set].arenacode;
      str +=
        card_q + " " + card_name + " (" + card_set + ") " + card_cn + "\r\n";
    } catch (e) {
      str +=
        card_q +
        " " +
        card_name +
        " (" +
        get_set_code(card_set) +
        ") " +
        card_cn +
        "\r\n";
    }
  });

  str += "\r\n";

  deck.sideboard = removeDuplicates(deck.sideboard);
  deck.sideboard.forEach(function(card) {
    let grpid = card.id;
    let cardObj = cardsDb.get(grpid);

    if (cardObj.set == "Mythic Edition") {
      grpid = cardObj.reprints[0];
      cardObj = cardsDb.get(grpid);
    }

    let card_name = cardObj.name;
    let card_set = cardObj.set;
    let card_cn = cardObj.cid;
    let card_q = card.quantity;
    if (card_q == 9999) card_q = 1;

    try {
      card_set = setsList[card_set].arenacode;
      str +=
        card_q + " " + card_name + " (" + card_set + ") " + card_cn + "\r\n";
    } catch (e) {
      str +=
        card_q +
        " " +
        card_name +
        " (" +
        get_set_code(card_set) +
        ") " +
        card_cn +
        "\r\n";
    }
  });

  return str;
}

//
function get_deck_export_txt(deck) {
  var str = "";
  deck.mainDeck = removeDuplicates(deck.mainDeck);
  deck.mainDeck.forEach(function(card) {
    var grpid = card.id;
    var card_name = cardsDb.get(grpid).name;
    //var card_set = cardsDb.get(grpid).set;
    //var card_cn = cardsDb.get(grpid).cid;

    str +=
      (card.quantity == 9999 ? 1 : card.quantity) + " " + card_name + "\r\n";
  });

  str += "\r\n";

  deck.sideboard = removeDuplicates(deck.sideboard);
  deck.sideboard.forEach(function(card) {
    var grpid = card.id;
    var card_name = cardsDb.get(grpid).name;
    //var card_set = cardsDb.get(grpid).set;
    //var card_cn = cardsDb.get(grpid).cid;

    str +=
      (card.quantity == 9999 ? 1 : card.quantity) + " " + card_name + "\r\n";
  });

  return str;
}

//
function convert_deck_from_v3(deck) {
  return JSON.parse(JSON.stringify(deck), (key, value) => {
    if (key === "mainDeck" || key === "sideboard") {
      let ret = [];
      for (let i = 0; i < value.length; i += 2) {
        if (value[i + 1] > 0) {
          ret.push({ id: value[i], quantity: value[i + 1] });
        }
      }
      return ret;
    }
    return value;
  });
}

//
function get_frame_class(frame) {
  if (frame.length == 0) {
    return "tile_c";
  }
  if (frame.length == 1) {
    if (frame.includes(1)) {
      return "tile_w";
    }
    if (frame.includes(2)) {
      return "tile_u";
    }
    if (frame.includes(3)) {
      return "tile_b";
    }
    if (frame.includes(4)) {
      return "tile_r";
    }
    if (frame.includes(5)) {
      return "tile_g";
    }
  }
  if (frame.length == 2) {
    if (frame.includes(4) && frame.includes(1)) {
      return "tile_wr";
    }
    if (frame.includes(1) && frame.includes(3)) {
      return "tile_wb";
    }
    if (frame.includes(1) && frame.includes(2)) {
      return "tile_uw";
    }
    if (frame.includes(2) && frame.includes(4)) {
      return "tile_ur";
    }
    if (frame.includes(2) && frame.includes(5)) {
      return "tile_ug";
    }
    if (frame.includes(2) && frame.includes(3)) {
      return "tile_ub";
    }
    if (frame.includes(4) && frame.includes(5)) {
      return "tile_rg";
    }
    if (frame.includes(5) && frame.includes(1)) {
      return "tile_gw";
    }
    if (frame.includes(3) && frame.includes(4)) {
      return "tile_br";
    }
    if (frame.includes(3) && frame.includes(5)) {
      return "tile_bg";
    }
  }
  if (frame.length > 2) {
    return "tile_multi";
  }
}

//
function timeSince(_date) {
  var seconds = Math.floor((new Date() - _date) / 1000);

  var interval = Math.floor(seconds / 31536000);
  if (interval == 1) return interval + " year";
  if (interval > 0) return interval + " years";
  interval = Math.floor(seconds / 2592000);
  if (interval == 1) return interval + " month";
  if (interval > 0) return interval + " months";
  interval = Math.floor(seconds / 86400);
  if (interval == 1) return interval + " day";
  if (interval > 0) return interval + " days";
  interval = Math.floor(seconds / 3600);
  if (interval == 1) return interval + " hour";
  if (interval > 0) return interval + " hours";
  interval = Math.floor(seconds / 60);
  if (interval == 1) return interval + " minute";
  if (interval > 0) return interval + " minutes";
  return Math.floor(seconds) + " seconds";
}

//
function daysPast(_date) {
  var firstDate = new Date();
  var secondDate = new Date(_date);
  return Math.round(
    Math.abs(
      (firstDate.getTime() - secondDate.getTime()) / (24 * 60 * 60 * 1000)
    )
  );
}

function relativeDateFormat(date) {
  return `<relative-time datetime="${date.toISOString()}">${date.toString()}</relative-time>`;
}

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

//
function replaceAll(str, find, replace) {
  return str.replace(new RegExp(find, "g"), replace);
}

//
function stripTags(html) {
  var tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

//
function urlDecode(url) {
  return decodeURIComponent(url.replace(/\+/g, " "));
}

//
function makeId(length) {
  var ret = "";
  var possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (var i = 0; i < length; i++)
    ret += possible.charAt(Math.floor(Math.random() * possible.length));

  return ret;
}

//
function debugDeck(deck) {
  deck.forEach(function(card) {
    var c = cardsDb.get(card.id);
    ipc_send("ipc_log", card.quantity + "x " + c.name + " (" + card.id + ")");
  });
}

//
function timestamp() {
  return Math.floor(Date.now() / 1000);
}

// Converts an integer number of seconds into a string of either:
// HH:MM:SS or MM:SS depending on if the duration
// is longer than an hour
function toMMSS(sec_num) {
  var hours = Math.floor(sec_num / 3600);
  var minutes = Math.floor((sec_num - hours * 3600) / 60);
  var seconds = sec_num - hours * 3600 - minutes * 60;

  if (minutes < 10) {
    minutes = "0" + minutes;
  }
  if (seconds < 10) {
    seconds = "0" + seconds;
  }
  if (hours > 0) {
    return hours + ":" + minutes + ":" + seconds;
  } else {
    return minutes + ":" + seconds;
  }
}

//
function toDDHHMMSS(sec_num) {
  let dd = Math.floor(sec_num / 86400);
  let hh = Math.floor((sec_num - dd * 86400) / 3600);
  let mm = Math.floor((sec_num - dd * 86400 - hh * 3600) / 60);
  let ss = sec_num - dd * 86400 - hh * 3600 - mm * 60;

  let days = dd + (dd > 1 ? " days" : " day");
  let hours = hh + (hh > 1 ? " hours" : " hour");
  let minutes = mm + (mm > 1 ? " minutes" : " minute");
  let seconds = ss + (ss > 1 ? " seconds" : " second");

  return `${dd > 0 ? days + ", " : ""}
${hh > 0 ? hours + ", " : ""}
${minutes}, 
${seconds}`;
}

//
function toHHMMSS(sec_num) {
  var hours = Math.floor(sec_num / 3600);
  var minutes = Math.floor((sec_num - hours * 3600) / 60);
  var seconds = sec_num - hours * 3600 - minutes * 60;

  if (hours < 10) {
    hours = "0" + hours;
  }
  if (minutes < 10) {
    minutes = "0" + minutes;
  }
  if (seconds < 10) {
    seconds = "0" + seconds;
  }
  return hours + ":" + minutes + ":" + seconds;
}

//
function toHHMM(sec_num) {
  var hours = Math.floor(sec_num / 3600);
  var minutes = Math.floor((sec_num - hours * 3600) / 60);
  if (hours < 10) {
    hours = "0" + hours;
  }
  if (minutes < 10) {
    minutes = "0" + minutes;
  }
  return hours + ":" + minutes;
}

//
String.prototype.capitalize = function() {
  return this.charAt(0).toUpperCase() + this.slice(1);
};

//
function add(a, b) {
  return a + b;
}

//
Array.prototype.sum = function(prop) {
  var total = 0;
  for (var i = 0, _len = this.length; i < _len; i++) {
    total += this[i][prop];
  }
  return total;
};

//
function createDivision(classNames, innerHTML) {
  // Utility function. Create a <div> element with specified class names and content
  let div = document.createElement("div");

  if (classNames !== undefined) {
    classNames.forEach(className => div.classList.add(className));
  }
  if (innerHTML !== undefined) {
    div.innerHTML = innerHTML;
  }
  return div;
}

//
function objectClone(originalObject) {
  return JSON.parse(JSON.stringify(originalObject));
}

//
function hypergeometric(
  exact,
  population,
  sample,
  hitsInPop,
  returnBig = false
) {
  return hypergeometricRange(
    exact,
    exact,
    population,
    sample,
    hitsInPop,
    returnBig
  );
}

//
function hypergeometricRange(
  lowerBound,
  upperBound,
  population,
  sample,
  hitsInPop,
  returnBig = false
) {
  if (lowerBound > upperBound || lowerBound > hitsInPop) {
    return returnBig ? math.bignumber(0) : 0;
  }

  let _population = math.bignumber(population);
  let _sample = math.bignumber(sample);
  let _hitsInPop = math.bignumber(hitsInPop);
  let matchingCombos = math.bignumber(0);
  // Can't have more non-hits in the sample than exist in the population
  for (
    let i = math.max(lowerBound, sample - (population - hitsInPop));
    i <= upperBound && i <= sample;
    i++
  ) {
    let _hitsInSample = math.bignumber(i);
    let _hitCombos = math.combinations(_hitsInPop, _hitsInSample);
    let _missCombos = math.combinations(
      math.max(0, math.subtract(_population, _hitsInPop)),
      math.max(0, math.subtract(_sample, _hitsInSample))
    );
    matchingCombos = math.add(
      matchingCombos,
      math.multiply(_hitCombos, _missCombos)
    );
  }

  let totalCombos = math.combinations(_population, _sample);
  let probability = math.divide(matchingCombos, totalCombos);
  return returnBig ? probability : math.number(probability);
}

// This function is designed to assess the "significance" of a particular result by calculating an alternative to
// percentile designed to measure deviation from median in both directions the same way and ensure the average returned
// value (assuming true random) is always 50%. This is done by treating the given result as a range of values
// distributed evenly throughout the percentile range covered by the result. For example, a result of 0 that has a 20%
// chance of happening is treated as a composite distributed evenly by percentile through the 0% to 20% percentile
// range. The returned value is the probability that a result is at least as far from median as the given value. Return
// values close to 1 indicate the passed in value was very close to average, return values close to 0 indicate it was
// very far from average.
function hypergeometricSignificance(
  value,
  population,
  sample,
  hitsInPop,
  returnBig = false
) {
  let percentile = hypergeometricRange(
    0,
    value,
    population,
    sample,
    hitsInPop,
    true
  );
  let chance = hypergeometric(value, population, sample, hitsInPop, true);
  if (math.smallerEq(percentile, 0.5)) {
    let midpoint = math.subtract(percentile, math.divide(chance, 2));
    let retVal = math.multiply(midpoint, 2);
    return returnBig ? retVal : math.number(retVal);
  }
  let reversePercentile = hypergeometricRange(
    value,
    math.min(hitsInPop, sample),
    population,
    sample,
    hitsInPop,
    true
  );
  if (math.smallerEq(reversePercentile, 0.5)) {
    let midpoint = math.subtract(reversePercentile, math.divide(chance, 2));
    let retVal = math.multiply(midpoint, 2);
    return returnBig ? retVal : math.number(retVal);
  }
  // If we get here, then value is the median and we need to weight things for how off-center its percentile range is.
  let smaller, larger;
  if (math.smallerEq(percentile, reversePercentile)) {
    smaller = percentile;
    larger = reversePercentile;
  } else {
    smaller = reversePercentile;
    larger = percentile;
  }
  // Divide the range into a symmetric portion centered on .5, and another portion for the rest. Calculate the average
  // distance from center for each, and use the average of that weighted by each portion's size.
  let centeredSize = math.multiply(math.subtract(smaller, 0.5), 2);
  let otherSize = math.subtract(larger, smaller);
  let centeredAverage = math.divide(centeredSize, 4); // half for being centered, half again for average
  // Average of the farther bound (otherSize + centeredSize/2) and the closer bound (centeredSize/2). Works out to
  // ((otherSize + centeredSize/2) + (centeredSize/2)) / 2, simplified to (otherSize + centeredSize) / 2.
  let otherAverage = math.divide(math.add(centeredSize, otherSize), 2);
  let weightedAverage = math.divide(
    math.add(
      math.multiply(centeredSize, centeredAverage),
      math.multiply(otherSize, otherAverage)
    ),
    chance
  );
  let retVal = math.subtract(1, math.multiply(weightedAverage, 2));
  return returnBig ? retVal : math.number(retVal);
}
