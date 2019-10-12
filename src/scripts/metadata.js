const { app } = require("electron");
const path = require("path");
const fs = require("fs");
var http = require("https");
const readline = require("readline");
const _ = require("lodash");

const manifestParser = require("./manifest-parser");
const { generateMetadata } = require("./metadata-generator");
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

const {
  APPDATA,
  RANKS_SHEETS,
  SET_NAMES,
  NO_DUPES_ART_SETS,
  ALLOWED_SCRYFALL
} = require("./metadata-constants");

let metagameData = {};
let ranksData = {};

const VERSION = 23;

const LANGUAGES = [
  "EN",
  "ES",
  "BR",
  "DE",
  "FR",
  "IT",
  "JP",
  "RU",
  "ko-KR",
  "zh-CN"
];
// "scryfall-all-cards.json" contains cards in all languages but is 800+mb
const SCRYFALL_FILE = "scryfall-all-cards.json";

app.on("ready", () => {
  console.log("Begin Metadata fetch.");
  // It would be nice if we could suppy the version manually or
  // obtain it from somewhere automatically, like a settings
  // file or the output log itself.
  manifestParser
    .getManifestFiles("1805.734606")
    .then(checkSetsAvailable)
    .then(getRanksData)
    .then(getScryfallCards)
    .then(getMetagameData)
    .then(generateScryfallDatabase)
    .then(data =>
      generateMetadata(data, ranksData, metagameData, VERSION, LANGUAGES)
    )
    .then(quit);
});

app.on("closed", function() {
  console.log("closed");
});

function quit() {
  console.log("Goodbye!");
  app.quit();
}

function checkSetsAvailable() {
  // We use this to check for new sets
  return new Promise(resolve => {
    let file = path.join(APPDATA, "external", "cards.json");
    let cards = JSON.parse(`{"value": ${fs.readFileSync(file)}}`);

    let sets = [];
    let setCards = {};
    cards.value.forEach(card => {
      if (!setCards[card.set]) setCards[card.set] = 1;
      else setCards[card.set] += 1;
      if (!sets.includes(card.set)) {
        sets.push(card.set);
      }
    });

    sets.forEach(setCode => {
      if (!SET_NAMES[setCode]) {
        console.log(`${setCode} - Not added. (${setCards[setCode]} cards)`);
      } else {
        console.log(`${setCode} - Ok! (${setCards[setCode]} cards)`);
      }
    });

    resolve();
  });
}

function getRanksData() {
  let requests = RANKS_SHEETS.map(rank => {
    return new Promise(resolve => {
      console.log(`Get ${rank.setCode.toUpperCase()} ranks data.`);
      httpGetFile(
        `https://docs.google.com/spreadsheets/d/${rank.sheet}/gviz/tq?sheet=${
          rank.page
        }`,
        rank.setCode + "_ranks"
      ).then(file => {
        fs.readFile(file, function read(err, data) {
          let str = data.toString();
          str = str
            .replace("/*O_o*/", "")
            .replace(`google.visualization.Query.setResponse(`, "")
            .replace(`);`, " ");

          console.log(`${rank.setCode.toUpperCase()} ok.`);
          resolve();
          try {
            ranksData[rank.setCode.toUpperCase()] = processRanksData(str);
          } catch (e) {
            console.log(e);
          }
        });
      });
    });
  });

  return Promise.all(requests);
}

function processRanksData(str) {
  let data = JSON.parse(str);
  let ret = {};
  data.table.rows.forEach(row => {
    let name = row.c[0].v;
    let rank = row.c[4].v;
    let cont = row.c[5].v;
    let values = [
      row.c[9].v,
      row.c[10].v,
      row.c[11].v,
      row.c[12].v,
      row.c[13].v,
      row.c[14].v,
      row.c[15].v,
      row.c[16].v,
      row.c[17].v,
      row.c[18].v,
      row.c[19].v,
      row.c[20].v,
      row.c[21].v
    ];
    ret[name] = { rank: rank, cont: cont, values: values };
  });

  return ret;
}

function getMetagameData() {
  return new Promise(resolve => {
    let req = httpGetText("https://mtgatool.com/database/metagame.php");
    console.log("Download metagame data.");
    req.addEventListener("load", function() {
      let json = JSON.parse(`{"metagame": ${req.responseText} }`);
      metagameData = json.metagame;
      resolve();
    });
  });
}

function getScryfallCards() {
  return new Promise(resolve => {
    let file = path.join(APPDATA, "external", SCRYFALL_FILE);
    if (!fs.existsSync(file)) {
      console.log("Downloading Scryfall cards data.");
      httpGetFile(
        "https://archive.scryfall.com/json/" + SCRYFALL_FILE,
        SCRYFALL_FILE
      ).then(file => {
        resolve();
      });
    } else {
      console.log("Skipping Scryfall cards data download.");
      resolve();
    }
  });
}

function generateScryfallDatabase() {
  return new Promise(resolve => {
    console.log("Processing Scryfall database.");
    let file = path.join(APPDATA, "external", SCRYFALL_FILE);

    fs.stat(file, function(err, stats) {
      var fileSize = stats.size;
      var readSize = 0;
      var stream = fs.createReadStream(file, { flags: "r", encoding: "utf-8" });
      var buf = "";

      // We read the file as a stream, decoding line by line because decoding
      // such a huge file in JS causes the GC to go craz yand crash for me.
      // The only problem may be if Scryfall changes its files and stops
      // using the newline characters..

      let scryfallData = {};

      let scryfallDataAdd = function(obj, lang, set, name, cid = false) {
        if (scryfallData[lang] == undefined) scryfallData[lang] = {};
        if (scryfallData[lang][set] == undefined) scryfallData[lang][set] = {};
        if (scryfallData[lang][set][name] == undefined)
          scryfallData[lang][set][name] = {};

        if (NO_DUPES_ART_SETS.includes(set)) {
          scryfallData[lang][set][name] = obj;
        } else {
          scryfallData[lang][set][name][cid] = obj;
        }
      };

      let pump = function() {
        var pos;

        while ((pos = buf.indexOf("\n")) >= 0) {
          // keep going while there's a newline somewhere in the buffer
          if (pos == 0) {
            // if there's more than one newline in a row, the buffer will now start with a newline
            buf = buf.slice(1); // discard it
            continue; // so that the next iteration will start with data
          }
          processLine(buf.slice(0, pos)); // hand off the line
          buf = buf.slice(pos + 1); // and slice the processed data off the buffer
        }
      };

      let processLine = function(line) {
        // here's where we do something with a line

        if (line[line.length - 1] == "\r")
          line = line.substr(0, line.length - 1); // discard CR (0x0D)

        line = line.slice(0, -1);

        if (line.length > 0) {
          try {
            var obj = JSON.parse(line);
            /*if (obj.set == "eld" && obj.collector_number == 149) {
              console.log(line);
            }*/
            if (ALLOWED_SCRYFALL.includes(obj.set)) {
              obj.lang = obj.lang.toUpperCase();
              let name = obj.name;
              scryfallDataAdd(
                obj,
                obj.lang,
                obj.set,
                name,
                obj.collector_number
              );
              if (obj.layout == "adventure") {
                obj.card_faces.forEach(face => {
                  let name = face.name;
                  let newObj = Object.assign(_.cloneDeep(obj), face);
                  scryfallDataAdd(
                    newObj,
                    obj.lang,
                    obj.set,
                    name,
                    obj.collector_number
                  );
                });
              }
              if (obj.layout == "transform") {
                obj.card_faces.forEach(face => {
                  let name = face.name;
                  let newObj = Object.assign(_.cloneDeep(obj), face);
                  scryfallDataAdd(
                    newObj,
                    obj.lang,
                    obj.set,
                    name,
                    obj.collector_number
                  );
                });
              }
              if (obj.layout == "split") {
                obj.card_faces.forEach(face => {
                  let name = face.name;
                  let newObj = Object.assign(_.cloneDeep(obj), face);
                  scryfallDataAdd(
                    newObj,
                    obj.lang,
                    obj.set,
                    name,
                    obj.collector_number
                  );
                });
              }
            }
          } catch (e) {
            //console.log(e);
          }
        }
      };

      stream.on("data", function(d) {
        var dataLength = d.length;
        readSize += dataLength;
        readline.cursorTo(process.stdout, 0);
        process.stdout.write(
          `Progress:\t ${((readSize / fileSize) * 100).toFixed(2)}%`
        );

        buf += d.toString(); // when data is read, stash it in a string buffer
        pump(); // then process the buffer
      });

      stream.on("end", function() {
        readline.cursorTo(process.stdout, 0);
        process.stdout.write(`Progress:\t ${(100).toFixed(2)}%`);
        console.log("");
        resolve(scryfallData);
      });
    });
  });
}

function httpGetText(url) {
  let xmlHttp = new XMLHttpRequest();
  xmlHttp.open("GET", url);
  xmlHttp.send();
  return xmlHttp;
}

function httpGetFile(url, filename) {
  return new Promise(resolve => {
    let file = path.join(APPDATA, "external", filename);
    /*
    if (fs.existsSync(file)) {
      resolve(file);
      return;
    }*/

    let dir = path.join(APPDATA, "external");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    let stream = fs.createWriteStream(file);
    http.get(url, response => {
      response.pipe(stream);
      let data = "";

      response.on("data", function(chunk) {
        data += chunk;
        readline.cursorTo(process.stdout, 0);
        process.stdout.write(
          `Downloading ${filename}:\t ${(data.length / 1024 / 1024).toFixed(
            2
          )} mb`
        );
      });
      response.on("end", function() {
        console.log("");
        resolve(file);
      });
    });
  });
}
