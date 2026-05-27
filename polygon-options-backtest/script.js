const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const pct = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
});

const byId = (id) => document.getElementById(id);

function pnlClass(value) {
  return Number(value) >= 0 ? "positive" : "negative";
}

function setMetric(id, value, className = "") {
  const el = byId(id);
  el.textContent = value;
  el.className = className;
}

function formatStrategy(trade) {
  return trade.strategy === "put_credit_spread" ? "Put Credit Spread" : "Call Credit Spread";
}

function drawChart(trades) {
  const canvas = byId("pnl-chart");
  const ctx = canvas.getContext("2d");
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth * ratio;
  const height = canvas.clientHeight * ratio;
  canvas.width = width;
  canvas.height = height;
  ctx.clearRect(0, 0, width, height);

  const pad = 34 * ratio;
  const values = trades.map((trade) => Number(trade.pnl_dollars || 0));
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const span = Math.max(1, max - min);
  const chartW = width - pad * 2;
  const chartH = height - pad * 2;
  const zeroY = pad + ((max - 0) / span) * chartH;

  ctx.strokeStyle = "rgba(255,255,255,.16)";
  ctx.lineWidth = 1 * ratio;
  ctx.beginPath();
  ctx.moveTo(pad, zeroY);
  ctx.lineTo(width - pad, zeroY);
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,.7)";
  ctx.font = `${12 * ratio}px Avenir Next, Segoe UI, sans-serif`;
  ctx.fillText("$0", 8 * ratio, zeroY + 4 * ratio);

  const barGap = 12 * ratio;
  const barW = Math.max(26 * ratio, (chartW - barGap * (trades.length - 1)) / Math.max(1, trades.length));

  trades.forEach((trade, index) => {
    const value = Number(trade.pnl_dollars || 0);
    const x = pad + index * (barW + barGap);
    const y = pad + ((max - value) / span) * chartH;
    const top = Math.min(y, zeroY);
    const h = Math.max(2 * ratio, Math.abs(zeroY - y));

    ctx.fillStyle = value >= 0 ? "#4fd17a" : "#ff6678";
    ctx.fillRect(x, top, barW, h);

    ctx.fillStyle = "rgba(255,255,255,.78)";
    ctx.font = `${11 * ratio}px Avenir Next, Segoe UI, sans-serif`;
    ctx.fillText(trade.option_type.toUpperCase(), x, height - 10 * ratio);
  });
}

function renderTrades(trades) {
  byId("trade-list").innerHTML = trades
    .map((trade) => {
      const pnl = Number(trade.pnl_dollars || 0);
      return `
        <article class="trade-row">
          <div class="trade-main">
            <strong>${trade.ticker} ${trade.short_strike}/${trade.long_strike}</strong>
            <span>${formatStrategy(trade)} | exp ${trade.expiration}</span>
          </div>
          <div class="trade-cell">
            <span>Entry Credit</span>
            <strong>${money.format(trade.entry_credit * 100)}</strong>
          </div>
          <div class="trade-cell">
            <span>Exit</span>
            <strong>${trade.exit_reason.replaceAll("_", " ")}</strong>
          </div>
          <div class="trade-cell">
            <span>P/L</span>
            <strong class="${pnlClass(pnl)}">${money.format(pnl)}</strong>
          </div>
        </article>
      `;
    })
    .join("");
}

function render(data) {
  const { summary, rules, trades, run, tickers } = data;

  byId("source-pill").textContent = "Polygon";
  byId("entry-date").textContent = run.entry_date;
  byId("universe").textContent = tickers.join(", ");
  byId("rules").textContent = `${rules.min_dte}-${rules.max_dte} DTE, $${rules.spread_width} wide, min $${rules.min_credit.toFixed(2)} credit`;
  byId("fill-model").textContent = `$${rules.fill_haircut.toFixed(2)} per-spread haircut, ${pct.format(rules.profit_target_pct)} profit target, ${rules.stop_loss_multiple}x credit stop`;
  byId("limitations").textContent = run.limitations.join(" ");

  setMetric("trade-count", summary.trade_count ?? 0);
  setMetric("win-rate", summary.win_rate === undefined ? "--" : pct.format(summary.win_rate));
  setMetric("total-pnl", money.format(summary.total_pnl_dollars || 0), pnlClass(summary.total_pnl_dollars || 0));
  setMetric("avg-ror", summary.avg_return_on_risk === undefined ? "--" : pct.format(summary.avg_return_on_risk), pnlClass(summary.avg_return_on_risk || 0));

  byId("best-worst").textContent =
    summary.trade_count > 0
      ? `Best ${money.format(summary.best_trade_dollars)} | Worst ${money.format(summary.worst_trade_dollars)}`
      : "No trades";

  drawChart(trades);
  renderTrades(trades);
}

fetch("data/polygon_backtest.json")
  .then((response) => {
    if (!response.ok) {
      throw new Error(`Could not load data: ${response.status}`);
    }
    return response.json();
  })
  .then(render)
  .catch((error) => {
    byId("source-pill").textContent = "Error";
    byId("limitations").textContent = error.message;
  });

window.addEventListener("resize", () => {
  fetch("data/polygon_backtest.json")
    .then((response) => response.json())
    .then((data) => drawChart(data.trades));
});
