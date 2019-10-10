const electron = require("electron");

exports.SCRYFALL_LANGUAGE = {
  DE: "DE",
  EN: "EN",
  ES: "ES",
  FR: "FR",
  IT: "IT",
  RU: "RU",
  BR: "PT",
  JP: "JA",
  "zh-CN": "ZHS",
  "ko-KR": "KO"
};

exports.EVENT_TO_NAME = {
  NPE: "New Player Experience",
  DirectGame: "Direct Game",
  Constructed_Event: "Constructed",
  Constructed_Event_2020: "Standard Event",
  Ladder: "Standard Ranked",
  Traditional_Cons_Event: "Traditional Constructed",
  Traditional_Cons_Event_2020: "Traditional Standard Event",
  Constructed_BestOf3: "Traditional Standard Play",
  Traditional_Ladder: "Traditional Standard Ranked",
  Future_Play_20190909: "Future Play",
  Future_Ranked_20190909: "Future Ranked",
  Historic_Play: "Historic Play",

  CompDraft_RNA_20190117: "Traditional Draft RNA",
  CompDraft_WAR_20190425: "Traditional Draft WAR",
  CompDraft_M20_20190708: "Traditional Draft M20",
  CompDraft_ELD_20190930: "Traditional Draft ELD",

  Sealed_M20_20190630: "Sealed M20",
  Sealed_Ravnica_20190816: "Sealed Ravnica",
  Sealed_WAR_20190909: "Sealed WAR",
  Sealed_ELD_20190923: "Sealed ELD",

  QuickDraft_RNA_20190426: "Ranked Draft RNA 04/19",
  QuickDraft_RNA_20190621: "Ranked Draft RNA 06/19",
  QuickDraft_WAR_20190510: "Ranked Draft WAR 05/19",
  QuickDraft_DOM_20190524: "Ranked Draft DOM 05/19",
  QuickDraft_WAR_20190607: "Ranked Draft WAR 06/19",
  QuickDraft_WAR_20190705: "Ranked Draft WAR 07/19",
  QuickDraft_M20_20190719: "Ranked Draft M20 07/19",
  QuickDraft_RNA_20190802: "Ranked Draft RNA 08/19",
  QuickDraft_WAR_20190816: "Ranked Draft WAR 08/19",
  QuickDraft_GRN_20190829: "Ranked Draft GRN 08/19",
  QuickDraft_RNA_20190913: "Ranked Draft RNA 09/19",
  Cascade_Constructed_20190516: "Cascade Constructed",
  Omniscience_Draft_20190830: "Omniscience Draft",

  Esports_Qualifier_20190525: "Mythic Qualifier Weekend 05/19",
  Esports_Qualifier_20190817: "Mythic Qualifier Weekend 08/19",
  CompCons_Metagame_Challenge_20190712: "Metagame Challenge",
  PlayAnyDeck_20190926: "Play Any Deck - Standard",
  WinEveryCard_20191005: "Win Every Card - Standard",

  Precon_Brawl_ELD: "Precon Brawl",
  Lore_WAR1_Momir: "Ravnica at War I - Momir",
  Lore_WAR2_Pauper: "Ravnica at War II - Pauper",
  Lore_WAR3_Singleton: "Ravnica at War III - Singleton",
  Lore_WAR4_OverflowingCounters: "Ravnica at War IV - Counters",
  Lore_WAR5_Ravnica: "Ravnica at war V - Ravnica",
  Planecation1_GuildBattle: "Planecation - Guild Battle",
  Planecation2_Treasure: "Planecation - Treasure",
  Planecation3_Singleton: "Planecation - Singleton",
  Planecation4_Shakeup: "Planecation - Shakeup",
  Planecation5_Landfall: "Planecation - Landfall",
  Giant_Monsters_20190719: "Giant Monsters"
};

exports.EVENT_TO_FORMAT = {
  Play: "Standard",
  Historic_Play: "Historic",
  DirectGame: "Direct Game",
  Constructed_Event: "Standard",
  Constructed_Event_2020: "Standard",
  Ladder: "Standard",
  Traditional_Cons_Event: "Traditional Standard",
  Traditional_Cons_Event_2020: "Traditional Standard",
  Constructed_BestOf3: "Traditional Standard",
  Traditional_Ladder: "Traditional Standard",
  Future_Play_20190909: "Future",
  Future_Ranked_20190909: "Traditional Future",

  CompDraft_RNA_20190117: "Draft RNA",
  CompDraft_WAR_20190425: "Draft WAR",
  CompDraft_M20_20190708: "Draft M20",
  CompDraft_ELD_20190930: "Draft ELD",

  Sealed_M20_20190630: "Sealed M20",
  Sealed_Ravnica_20190816: "Sealed Ravnica",
  Sealed_WAR_20190909: "Sealed WAR",
  Sealed_ELD_20190923: "Sealed ELD",

  QuickDraft_RNA_20190426: "Draft RNA",
  QuickDraft_RNA_20190621: "Draft RNA",
  QuickDraft_WAR_20190510: "Draft WAR",
  QuickDraft_DOM_20190524: "Draft DOM",
  QuickDraft_WAR_20190607: "Draft WAR",
  QuickDraft_WAR_20190705: "Draft WAR",
  QuickDraft_M20_20190719: "Draft M20",
  QuickDraft_RNA_20190802: "Draft RNA",
  QuickDraft_WAR_20190816: "Draft WAR",
  QuickDraft_GRN_20190829: "Draft GRN",
  QuickDraft_RNA_20190913: "Draft RNA",

  Cascade_Constructed_20190516: "Cascade Constructed",
  Omniscience_Draft_20190830: "Draft M20",

  Esports_Qualifier_20190525: "Traditional Standard",
  Esports_Qualifier_20190817: "Traditional Standard",
  CompCons_Metagame_Challenge_20190712: "Traditional Standard",
  PlayAnyDeck_20190926: "Standard",
  WinEveryCard_20191005: "Standard",

  Precon_Brawl_ELD: "Brawl",
  Lore_WAR1_Momir: "Momir",
  Lore_WAR2_Pauper: "Pauper",
  Lore_WAR3_Singleton: "Singleton",
  Lore_WAR4_OverflowingCounters: "Counters",
  Lore_WAR5_Ravnica: "Ravnica Constructed",
  Planecation1_GuildBattle: "Precon",
  Planecation2_Treasure: "Treasure",
  Planecation3_Singleton: "Singleton",
  Planecation4_Shakeup: "Shakeup",
  Planecation5_Landfall: "Landfall",
  Giant_Monsters_20190719: "Giant Monsters"
};

// These are the current events in the ranked ladder
exports.LIMITED_RANKED_EVENTS = [
  "QuickDraft_M20_20190719",
  "QuickDraft_GRN_20190829",
  "QuickDraft_RNA_20190913"
];

exports.STANDARD_RANKED_EVENTS = ["Ladder", "Traditional_Ladder"];

exports.SINGLE_MATCH_EVENTS = [
  "AIBotMatch",
  "NPE",
  "DirectGame",
  "Ladder",
  "Constructed_BestOf3",
  "Traditional_Ladder"
];

/*
  "Kaladesh": {
    collation: 62242,
    scryfall: "kld",
    code: "KLD",
    arenacode: "KLD",
    tile: 63859
  },
  "Aether Revolt": {
    collation: 62979,
    scryfall: "aer",
    code: "AER",
    arenacode: "AER",
    tile: 64647
  },
  "Welcome Deck 2017": {
    collation: false,
    scryfall: "w17",
    code: "W17",
    arenacode: "W17",
    tile: 67106
  },
  "Amonkhet": {
    collation: 100003,
    scryfall: "akh",
    code: "AKH",
    arenacode: "AKH",
    tile: 64827
  },
  "Hour of Devastation": {
    collation: 100004,
    scryfall: "hou",
    code: "HOU",
    arenacode: "HOU",
    tile: 65759
  },
  "Oath of the Gatewatch": {
    collation: false,
    scryfall: "ogw",
    code: "OGW",
    arenacode: "OGW",
    tile: 67106
  },
*/
exports.SETS_DATA = {
  Ixalan: {
    collation: 100005,
    scryfall: "xln",
    code: "XLN",
    arenacode: "XLN",
    tile: 66433,
    release: "2017-09-29"
  },
  "Rivals of Ixalan": {
    collation: 100006,
    scryfall: "rix",
    code: "RIX",
    arenacode: "RIX",
    tile: 66937,
    release: "2018-01-19"
  },
  Dominaria: {
    collation: 100007,
    scryfall: "dom",
    code: "DOM",
    arenacode: "DAR",
    tile: 67106,
    release: "2018-04-27"
  },
  "Core Set 2019": {
    collation: 100008,
    scryfall: "m19",
    code: "M19",
    arenacode: "M19",
    tile: 68116,
    release: "2018-07-13"
  },
  Arena: {
    collation: false,
    scryfall: "ana",
    code: "ANA",
    arenacode: "ANA",
    tile: 67106,
    release: "2018-07-14"
  },
  "Guilds of Ravnica": {
    collation: 100009,
    scryfall: "grn",
    code: "GRN",
    arenacode: "GRN",
    tile: 68674,
    release: "2018-10-05"
  },
  "M19 Gift Pack": {
    collation: false,
    scryfall: "g18",
    code: "G18",
    arenacode: "G18",
    tile: 68116,
    release: "2018-07-13"
  },
  "Ravnica Allegiance": {
    collation: 100010,
    scryfall: "rna",
    code: "RNA",
    arenacode: "RNA",
    tile: 69294,
    release: "2019-01-25"
  },
  "War of the Spark": {
    collation: 100013,
    scryfall: "war",
    code: "WAR",
    arenacode: "WAR",
    tile: 69656,
    release: "2019-05-03"
  },
  "Core Set 2020": {
    collation: 100014,
    scryfall: "m20",
    code: "M20",
    arenacode: "M20",
    tile: 69912,
    release: "2019-07-12"
  },
  "Throne of Eldraine": {
    collation: 100015,
    scryfall: "eld",
    code: "ELD",
    arenacode: "ELD",
    tile: 70338,
    release: "2019-10-04"
  },
  // Other sets below
  "Mythic Edition": {
    collation: -1,
    scryfall: "med",
    code: "MED",
    arenacode: "MED",
    tile: 68674,
    release: "2018-10-06"
  },
  Mirage: {
    collation: -1,
    scryfall: "mir",
    code: "MI",
    arenacode: "MI",
    tile: 67003,
    release: "1996-10-08"
  },
  "Battle for Zendikar": {
    collation: -1,
    scryfall: "bfz",
    code: "BFZ",
    arenacode: "BFZ",
    tile: 67003,
    release: "2015-10-02"
  },
  "Return to Ravnica": {
    collation: -1,
    scryfall: "rtr",
    code: "RTR",
    arenacode: "RTR",
    tile: 67003,
    release: "2012-10-05"
  },
  "Rise of Eldrazi": {
    collation: -1,
    scryfall: "roe",
    code: "ROE",
    arenacode: "ROE",
    tile: 67003,
    release: "2010-04-23"
  },
  Amonkhet: {
    collation: -1,
    scryfall: "akh",
    code: "AKH",
    arenacode: "AKH",
    tile: 64827,
    release: "2017-04-28"
  },
  Planeshift: {
    collation: -1,
    scryfall: "pls",
    code: "PS",
    arenacode: "PS",
    tile: 64827,
    release: "2001-02-05"
  },
  Scourge: {
    collation: -1,
    scryfall: "scg",
    code: "SCG",
    arenacode: "SCG",
    tile: 64827,
    release: "2003-05-26"
  },
  Darksteel: {
    collation: -1,
    scryfall: "dst",
    code: "DST",
    arenacode: "DST",
    tile: 64827,
    release: "2004-02-06"
  },
  "Fifth Dawn": {
    collation: -1,
    scryfall: "5dn",
    code: "5DN",
    arenacode: "5DN",
    tile: 64827,
    release: "2004-06-04"
  },
  "Ninth Edition": {
    collation: -1,
    scryfall: "9ed",
    code: "9ED",
    arenacode: "9ED",
    tile: 64827,
    release: "2005-07-29"
  },
  "Ravnica: City of Guilds": {
    collation: -1,
    scryfall: "rav",
    code: "RAV",
    arenacode: "RAV",
    tile: 64827,
    release: "2005-10-07 "
  },
  Dissension: {
    collation: -1,
    scryfall: "dis",
    code: "DIS",
    arenacode: "DIS",
    tile: 64827,
    release: "2006-05-05 "
  },
  "Tenth Edition": {
    collation: -1,
    scryfall: "10e",
    code: "10E",
    arenacode: "10E",
    tile: 64827,
    release: "2007-07-13"
  },
  "Masters Edition II": {
    collation: -1,
    scryfall: "me2",
    code: "ME2",
    arenacode: "ME2",
    tile: 64827,
    release: "2008-09-22"
  },
  "Magic 2011": {
    collation: -1,
    scryfall: "m11",
    code: "M11",
    arenacode: "M11",
    tile: 64827,
    release: "2010-07-16"
  },
  "Masters Edition IV": {
    collation: -1,
    scryfall: "me4",
    code: "ME4",
    arenacode: "ME4",
    tile: 64827,
    release: "2011-01-10"
  },
  "Commander 2011": {
    collation: -1,
    scryfall: "cmd",
    code: "CMD",
    arenacode: "CMD",
    tile: 64827,
    release: "Released 2011-06-17"
  },
  "Avacyn Restored": {
    collation: -1,
    scryfall: "avr",
    code: "AVR",
    arenacode: "AVR",
    tile: 64827,
    release: "2012-05-04"
  },
  "Champions of Kamigawa": {
    collation: -1,
    scryfall: "chk",
    code: "CHK",
    arenacode: "CHK",
    tile: 64827,
    release: "2004-10-01"
  },
  "New Phyrexia": {
    collation: -1,
    scryfall: "nph",
    code: "NPH",
    arenacode: "NPH",
    tile: 64827,
    release: "2011-05-13"
  },
  Zendikar: {
    collation: -1,
    scryfall: "zen",
    code: "ZEN",
    arenacode: "ZEN",
    tile: 64827,
    release: "2009-10-02"
  },
  Gatecrash: {
    collation: -1,
    scryfall: "gtc",
    code: "GTC",
    arenacode: "GTC",
    tile: 64827,
    release: "2013-02-01"
  },
  "Commander 2013": {
    collation: -1,
    scryfall: "c13",
    code: "C13",
    arenacode: "C13",
    tile: 64827,
    release: "2013-11-01"
  },
  "Eldritch Moon": {
    collation: -1,
    scryfall: "emn",
    code: "EMN",
    arenacode: "EMN",
    tile: 64827,
    release: "2016-07-22"
  },
  "": {
    collation: -1,
    scryfall: "",
    code: "",
    arenacode: "",
    tile: 67003,
    release: "2000-00-00"
  }
};

exports.COLORS = ["{?}", "{W}", "{U}", "{B}", "{R}", "{G}", "{C}", "", "{X}"];

exports.RARITY = ["token", "land", "common", "uncommon", "rare", "mythic"];

exports.SET_NAMES = {
  W17: "Welcome Deck 2017",
  KLD: "Kaladesh",
  AER: "Aether Revolt",
  AKH: "Amonkhet",
  HOU: "Hour of Devastation",
  XLN: "Ixalan",
  RIX: "Rivals of Ixalan",
  DAR: "Dominaria",
  OGW: "Oath of the Gatewatch",
  M19: "Core Set 2019",
  ANA: "Arena",
  GRN: "Guilds of Ravnica",
  G18: "M19 Gift Pack",
  RNA: "Ravnica Allegiance",
  WAR: "War of the Spark",
  M20: "Core Set 2020",
  MI: "Mirage",
  ROE: "Rise of Eldrazi",
  RTR: "Return to Ravnica",
  BFZ: "Battle for Zendikar",
  ELD: "Throne of Eldraine",
  PS: "Planeshift",
  SCG: "Scourge",
  DST: "Darksteel",
  "5DN": "Fifth Dawn",
  "9ED": "Ninth Edition",
  RAV: "Ravnica: City of Guilds",
  DIS: "Dissension",
  "10E": "Tenth Edition",
  ME2: "Masters Edition II",
  M11: "Magic 2011",
  ME4: "Masters Edition IV",
  CMD: "Commander 2011",
  AVR: "Avacyn Restored",
  CHK: "Champions of Kamigawa",
  NPH: "New Phyrexia",
  ZEN: "Zendikar",
  GTC: "Gatecrash",
  C13: "Commander 2013",
  EMN: "Eldritch Moon"
};

exports.NO_DUPES_ART_SETS = [
  "pm20",
  "g18",
  "pgrn",
  "pdom",
  "prix",
  "f05",
  "unh",
  "c16",
  "mir"
];

exports.ALLOWED_SCRYFALL = [
  "eld",
  "m20",
  "war",
  "rna",
  "grn",
  "med",
  "m19",
  "ana",
  "dom",
  "rix",
  "xln",
  "teld",
  "tm20",
  "twar",
  "trna",
  "tgrn",
  "tm19",
  "tdom",
  "trix",
  "txln",
  "pm20",
  "g18",
  "pgrn",
  "pdom",
  "prix",
  "f05",
  "roe",
  "rtr",
  "bfz",
  "mir",
  "akh",
  "unh",
  "c16",
  "pls",
  "scg",
  "dst",
  "5dn",
  "9ed",
  "rav",
  "dis",
  "10e",
  "me2",
  "m11",
  "me4",
  "cmd",
  "avr",
  "chk",
  "nph",
  "zen",
  "gtc",
  "c13",
  "emn"
];

exports.RANKS_SHEETS = [
  {
    setCode: "war",
    sheet: "1pk3a1YKGas-NI4ze_8hbwOtVRdYAbzCDIBS9MKjcQ7M",
    page: "Staging%20Sheet"
  },
  {
    setCode: "rna",
    sheet: "1DfcITmtWaBHtiDYLYWHzizw-AOrB3GUQaapc_BqfeH4",
    page: "Staging%20Sheet"
  },
  {
    setCode: "grn",
    sheet: "1FPN3hgl6x_ePq-8On7Ebr8L6WHSU2IznoWSBoGaC_RQ",
    page: "Staging%20Sheet"
  },
  {
    setCode: "m19",
    sheet: "1aZlqE-8mGdfQ50NXUaP-9dRk3w_hp9XmcBqZ_4x3_jk",
    page: "Staging%20Sheet"
  },
  {
    setCode: "dom",
    sheet: "1cc-AOmpQZ7vKqxDTSSvhmRBVOCy_569kT0S-j-Rpbj8",
    page: "Staging%20Sheet"
  },
  {
    setCode: "rix",
    sheet: "1CNg-FDp-pOtQ14Qj-rIBO-yfyr5YcPA6n6ztrEe4ATg",
    page: "Staging%20Sheet"
  },
  {
    setCode: "xln",
    sheet: "1KDtLJd6Nkrv_DDpFs84soBZcWPG1tg79TnVEh-enPz8",
    page: "Staging%20Sheet"
  },
  {
    setCode: "m20",
    sheet: "1BAPtQv4U9KUAtVzkccJlPS8cb0s_uOcGEDORip5uaQg",
    page: "Staging%20Sheet"
  },
  {
    setCode: "eld",
    sheet: "1B-bEUGANnGFPB4zW-vAV8zHjUZINwLU8Qq1sVlgIdpU",
    page: "Staging%20Sheet"
  }
];

exports.APPDATA = (electron.app || electron.remote.app).getPath("userData");
