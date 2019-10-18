/*
global
  am4core,
  am4charts,
  am4themes_dark,
  am4themes_animated
*/
//const db = require("../shared/database");
const playerData = require("../shared/player-data");
const _ = require("lodash");

const { hideLoadingBars, resetMainContainer } = require("./renderer-util");
const { get_rank_index } = require("../shared/util");
const { createSelect } = require("../shared/select");
const { createDiv } = require("../shared/dom-fns");

function getRankY(rank, tier, steps) {
  let value = 0;
  switch (rank) {
    case "Bronze":
      value = 0;
      break;
    case "Silver":
      value = 4 * 6;
      break;
    case "Gold":
      value = 4 * 6 * 2;
      break;
    case "Platinum":
      value = 4 * 6 * 3;
      break;
    case "Diamond":
      value = 4 * 6 * 4;
      break;
    case "Mythic":
      value = 4 * 6 * 5;
  }

  return value + 6 * (4 - tier) + steps;
}

const CONSTRUCTED = "Constructed";
const LIMITED = "Limited";

let seasonType = CONSTRUCTED;

function openTimelineTab() {
  hideLoadingBars();
  const mainDiv = resetMainContainer();
  mainDiv.classList.add("flex_item");
  mainDiv.style.flexDirection = "column";

  let topButtons = createDiv(["timeline_top"]);

  let onlyBoostersLabel = document.createElement("label");
  onlyBoostersLabel.innerHTML = "Season: ";
  topButtons.appendChild(onlyBoostersLabel);

  // Season mode
  const displayModeDiv = createDiv(["stats_count_div"]);
  const displayModeSelect = createSelect(
    displayModeDiv,
    [CONSTRUCTED, LIMITED],
    seasonType,
    selectedMode => {
      seasonType = selectedMode;
      openTimelineTab();
    },
    "stats_mode_select"
  );
  displayModeSelect.style.textAlign = "left";
  topButtons.appendChild(displayModeSelect);

  mainDiv.appendChild(topButtons);

  let chartDiv = createDiv(["chartdiv"]);

  // Draw chart
  let seasonOrdinal = playerData.rank.constructed.seasonOrdinal;
  let seasonTag = seasonOrdinal + "_" + seasonType.toLowerCase();

  let chartData = playerData.seasonal_rank[seasonTag];
  if (!chartData) {
    chartData = [];
  }

  chartData = _.orderBy(
    chartData
      .map(_id => playerData.seasonal[_id])
      .map(obj => {
        let yPos = getRankY(obj.newClass, obj.newLevel, obj.newStep);
        obj.date = new Date(obj.timestamp);

        let match = playerData[obj.lastMatchId];
        obj.deck = false;
        obj.deckId = match.playerDeck.id;
        obj.deckName = match.playerDeck.name;
        obj.deckColors = match.playerDeck.colors;

        if (obj.oldLevel !== obj.newLevel) {
          obj.bullet = `../images/rank_${seasonType.toLowerCase()}/${
            obj.newClass
          }_${obj.newLevel}.png`;
        } else {
          obj.bullet = "";
        }
        return { ...obj, yPos };
      }),
    ["date"],
    ["asc"]
  );

  am4core.useTheme(am4themes_dark);
  am4core.useTheme(am4themes_animated);
  var chart = am4core.create(chartDiv, am4charts.XYChart);

  // Give each deck a new color
  let deckIds = Object.keys(_.groupBy(chartData, "deckId"));
  let deckColors = {};
  deckIds.forEach(id => {
    deckColors[id] = chart.colors.next();
    chart.colors.next();
  });

  chartData = chartData.map((obj, index) => {
    let color = deckColors[obj.deckId];
    return { ...obj, color, index };
  });

  chart.data = chartData;

  // Create axes
  var dateAxis = chart.xAxes.push(new am4charts.DateAxis());
  //dateAxis.skipEmptyPeriods = true;
  dateAxis.renderer.minGridDistance = 40;
  dateAxis.tooltipDateFormat = "dd/MM/yyyy, HH:mm";

  var valueAxis = chart.yAxes.push(new am4charts.ValueAxis());
  valueAxis.title.text = "Rank";
  valueAxis.numberFormatter = new am4core.NumberFormatter();
  valueAxis.numberFormatter.numberFormat = "";

  // Create series
  var series = chart.series.push(new am4charts.LineSeries());
  series.tooltipText = "{deckName}";
  series.tooltip.pointerOrientation = "vertical";
  series.dataFields.valueY = "yPos";
  series.dataFields.dateX = "date";
  //series.sequencedInterpolation = true;
  series.strokeWidth = 3;
  series.fillOpacity = 0.5;
  series.minBulletDistance = 1;
  series.propertyFields.stroke = "color";
  series.propertyFields.fill = "color";

  // Add simple bullet
  var bullet = series.bullets.push(new am4charts.Bullet());
  var image = bullet.createChild(am4core.Image);
  image.propertyFields.href = "bullet";
  image.width = 48;
  image.height = 48;
  image.horizontalCenter = "middle";
  image.verticalCenter = "middle";
  image.filters.push(new am4core.DropShadowFilter());

  // Add scrollbar
  chart.scrollbarX = new am4charts.XYChartScrollbar();
  chart.scrollbarX.series.push(series);

  // Add cursor
  chart.cursor = new am4charts.XYCursor();
  chart.cursor.xAxis = dateAxis;
  chart.cursor.snapToSeries = series;

  mainDiv.appendChild(chartDiv);
}

module.exports = { openTimelineTab: openTimelineTab, getRankY: getRankY };
