const { MANA, RANKS } = require("../shared/constants");
const { createDiv, createLabel } = require("../shared/dom-fns");
const { createSelect } = require("../shared/select");
const { get_rank_index, toDDHHMMSS, toMMSS } = require("../shared/util");

const {
  compareWinrates,
  formatPercent,
  getTagColor,
  getWinrateClass
} = require("./renderer-util");

class StatsPanel {
  constructor(
    prefixId,
    aggregation,
    width,
    showCharts,
    rankedStats,
    isLimited
  ) {
    this.prefixId = prefixId;
    this.data = aggregation || {};
    this.showCharts = showCharts;
    this.rankedStats = rankedStats;
    this.isLimited = isLimited;
    this.container = createDiv([this.prefixId + "_winrate"]);
    this.handleResize = this.handleResize.bind(this);
    this.handleResize(width);
    return this;
  }

  handleResize(width) {
    this.width = width || 200;
    this.container.innerHTML = "";
    this.doRender();
  }

  render() {
    return this.container;
  }

  static getWinrateString(stats) {
    const colClass = getWinrateClass(stats.winrate);
    const title = `${stats.wins} matches won : ${stats.losses} matches lost`;
    return `<span class="${colClass}_bright" title="${title}">${formatPercent(
      stats.winrate
    )}</span>`;
  }

  doRender() {
    // Overall winrate
    const winrateContainer = createDiv([]);
    winrateContainer.style.display = "flex";
    winrateContainer.style.justifyContent = "space-between";
    const winrateLabel = createDiv(["list_deck_winrate"], "Overall:");
    winrateLabel.style.margin = "0 auto 0 0";
    winrateContainer.appendChild(winrateLabel);
    const wrString = StatsPanel.getWinrateString(this.data.stats);
    const winrateDiv = createDiv(
      ["list_deck_winrate"],
      `${this.data.stats.wins}:${this.data.stats.losses} (${wrString})`
    );
    winrateDiv.style.margin = "0 0 0 auto";
    winrateContainer.appendChild(winrateDiv);
    this.container.appendChild(winrateContainer);

    // Ranked Stats
    if (this.rankedStats) this.renderRanked();

    // On the play Winrate
    const playDrawContainer = createDiv([]);
    playDrawContainer.style.display = "flex";
    playDrawContainer.style.justifyContent = "space-between";
    const playDrawRateLabel = createDiv(["list_deck_winrate"], "Play/Draw:");
    playDrawRateLabel.style.margin = "0 auto 0 0";
    playDrawContainer.appendChild(playDrawRateLabel);
    const playWrString = StatsPanel.getWinrateString(this.data.playStats);
    const drawWrString = StatsPanel.getWinrateString(this.data.drawStats);
    const playDrawRateDiv = createDiv(
      ["list_deck_winrate"],
      `${playWrString}/${drawWrString}`
    );
    playDrawRateDiv.style.margin = "0 0 0 auto";
    playDrawContainer.appendChild(playDrawRateDiv);
    this.container.appendChild(playDrawContainer);

    const matchTimeContainer = createDiv();
    matchTimeContainer.style.display = "flex";
    matchTimeContainer.style.justifyContent = "space-between";
    const timeLabel = createDiv(["list_match_time"], "Duration:");
    timeLabel.style.margin = "0 auto 0 0";
    matchTimeContainer.appendChild(timeLabel);
    const timeDiv = createDiv(
      ["list_match_time"],
      toMMSS(this.data.stats.duration)
    );
    timeDiv.title = toDDHHMMSS(this.data.stats.duration);
    timeDiv.style.margin = "0 0 0 auto";
    matchTimeContainer.appendChild(timeDiv);
    this.container.appendChild(matchTimeContainer);

    // Frequent Matchups
    if (this.showCharts) this.renderCharts();
  }

  renderRanked() {
    RANKS.forEach(rank => {
      const stats = this.rankedStats[rank.toLowerCase()];
      if (!stats || !stats.total) return;

      const winrateContainer = createDiv([]);
      winrateContainer.style.display = "flex";
      winrateContainer.style.justifyContent = "space-between";
      winrateContainer.style.alignItems = "center";
      const rankClass = this.isLimited
        ? "top_limited_rank"
        : "top_constructed_rank";
      const rankBadge = createDiv([rankClass]);
      rankBadge.style.margin = "0 auto 0 0";
      rankBadge.title = rank;
      rankBadge.style.backgroundPosition = `${get_rank_index(rank, 1) *
        -48}px 0px`;
      winrateContainer.appendChild(rankBadge);
      const wrString = StatsPanel.getWinrateString(stats);
      const winrateDiv = createDiv(
        ["list_deck_winrate"],
        `${stats.wins}:${stats.losses} (${wrString})`
      );
      winrateDiv.style.margin = "0 0 0 auto";
      winrateContainer.appendChild(winrateDiv);
      this.container.appendChild(winrateContainer);
    });
  }

  renderCharts() {
    const barsToShow = Math.max(3, Math.round(this.width / 40));
    const frequencySort = (a, b) => b.total - a.total;

    // Archetypes
    let tagsWinrates = [...Object.values(this.data.tagStats)];
    // frequent matchups
    tagsWinrates.sort(frequencySort);
    const freqTagStats = tagsWinrates.slice(0, barsToShow);
    const freqCurveMaxTags = Math.max(...tagsWinrates.map(cwr => cwr.total));
    // wins vs losses
    tagsWinrates = [...freqTagStats];
    const curveMaxTags = Math.max(
      ...tagsWinrates.map(cwr => Math.max(cwr.wins || 0, cwr.losses || 0)),
      0
    );
    tagsWinrates.sort(compareWinrates);

    // Colors
    let colorsWinrates = [...Object.values(this.data.colorStats)];
    // frequent matchups
    colorsWinrates.sort(frequencySort);
    const freqCurveMax = Math.max(...colorsWinrates.map(cwr => cwr.total));
    const freqColorStats = colorsWinrates.slice(0, barsToShow);
    // wins vs losses
    colorsWinrates = [...freqColorStats];
    const curveMax = Math.max(
      ...colorsWinrates.map(cwr => Math.max(cwr.wins || 0, cwr.losses || 0)),
      0
    );
    colorsWinrates.sort(compareWinrates);

    if (!curveMaxTags && !curveMax) {
      // no charts to show
      return;
    }

    const getStyleHeight = frac => Math.round(frac * 100) + "%";

    const appendWinrateChart = (container, winrates, _curveMax, showTags) => {
      const curve = createDiv(["mana_curve"]);
      const numbers = createDiv(["mana_curve_costs"]);

      winrates.forEach(cwr => {
        const winCol = createDiv(["mana_curve_column", "back_green"]);
        winCol.style.height = getStyleHeight(cwr.wins / _curveMax);
        winCol.title = `${cwr.wins} matches won`;
        curve.appendChild(winCol);

        const lossCol = createDiv(["mana_curve_column", "back_red"]);
        lossCol.style.height = getStyleHeight(cwr.losses / _curveMax);
        lossCol.title = `${cwr.losses} matches lost`;
        curve.appendChild(lossCol);

        const curveNumber = createDiv(["mana_curve_column_number"]);
        let winRate = 0;
        if (cwr.wins) {
          winRate = cwr.wins / (cwr.wins + cwr.losses);
        }
        const colClass = getWinrateClass(winRate);
        curveNumber.innerHTML = `<span class="${colClass}_bright">${formatPercent(
          winRate
        )}</span>`;
        curveNumber.title = `${cwr.wins} matches won : ${
          cwr.losses
        } matches lost`;

        if (showTags) {
          const curveTag = createDiv(["mana_curve_tag"], cwr.tag);
          curveTag.style.backgroundColor = getTagColor(cwr.tag);
          curveNumber.appendChild(curveTag);
        }

        cwr.colors.forEach(color => {
          const tagColor = createDiv(["mana_s16", "mana_" + MANA[color]]);
          tagColor.style.margin = "3px auto 3px auto";
          curveNumber.appendChild(tagColor);
        });
        numbers.append(curveNumber);
      });

      container.appendChild(curve);
      container.appendChild(numbers);
    };

    const appendFreqChart = (container, winrates, _curveMax, showTags) => {
      const curve = createDiv(["mana_curve"]);
      const numbers = createDiv(["mana_curve_costs"]);

      winrates.forEach(cwr => {
        const totalCol = createDiv(["mana_curve_column", "back_blue"]);
        totalCol.style.height = getStyleHeight(cwr.total / _curveMax);
        totalCol.title = `${cwr.total} matches`;
        curve.appendChild(totalCol);

        const curveNumber = createDiv(["mana_curve_column_number"]);
        let frequency = 0;
        if (cwr.total) {
          frequency = cwr.total / this.data.stats.total;
        }
        curveNumber.innerHTML = `<span class="white_bright">${formatPercent(
          frequency
        )}</span>`;
        curveNumber.title = `${cwr.total} matches`;

        if (showTags) {
          const curveTag = createDiv(["mana_curve_tag"], cwr.tag);
          curveTag.style.backgroundColor = getTagColor(cwr.tag);
          curveNumber.appendChild(curveTag);
        }

        cwr.colors.forEach(color => {
          const tagColor = createDiv(["mana_s16", "mana_" + MANA[color]]);
          tagColor.style.margin = "3px auto 3px auto";
          curveNumber.appendChild(tagColor);
        });
        numbers.append(curveNumber);
      });

      container.appendChild(curve);
      container.appendChild(numbers);
    };

    const archContainer = createDiv(["stats_panel_arch_charts"]);
    const colorContainer = createDiv(["stats_panel_color_charts"]);

    // Toggle
    if (curveMaxTags && curveMax) {
      archContainer.style.display = "block";
      colorContainer.style.display = "none";
      let label = createLabel(["but_container_label"], "Group by:");
      const langSelect = createSelect(
        label,
        ["Archetype", "Color"],
        "Archetype",
        filter => {
          if (filter === "Archetype") {
            archContainer.style.display = "block";
            colorContainer.style.display = "none";
          } else {
            archContainer.style.display = "none";
            colorContainer.style.display = "block";
          }
        }
      );
      langSelect.style.width = "120px";
      this.container.appendChild(label);
    }

    // Archetypes
    if (curveMaxTags) {
      const chartTitle = createDiv(
        ["ranks_history_title"],
        "Frequent Matchups"
      );
      chartTitle.style.marginTop = "24px";
      archContainer.appendChild(chartTitle);
      appendFreqChart(archContainer, freqTagStats, freqCurveMaxTags, true);
      const chartTitle2 = createDiv(["ranks_history_title"], "Wins vs Losses");
      chartTitle2.style.marginTop = "24px";
      archContainer.appendChild(chartTitle2);
      appendWinrateChart(archContainer, tagsWinrates, curveMaxTags, true);
      this.container.appendChild(archContainer);
    }

    // Colors
    if (curveMax) {
      const chartTitle = createDiv(
        ["ranks_history_title"],
        "Frequent Matchups"
      );
      chartTitle.style.marginTop = "24px";
      colorContainer.appendChild(chartTitle);
      appendFreqChart(colorContainer, freqColorStats, freqCurveMax, false);
      const chartTitle2 = createDiv(["ranks_history_title"], "Wins vs Losses");
      chartTitle2.style.marginTop = "24px";
      colorContainer.appendChild(chartTitle2);
      appendWinrateChart(colorContainer, colorsWinrates, curveMax, false);
      this.container.appendChild(colorContainer);
    }
  }
}

module.exports = StatsPanel;
