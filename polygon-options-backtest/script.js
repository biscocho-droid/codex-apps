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
  let running = 0;
  const values = trades.map((trade) => {
    running += Number(trade.pnl_dollars || 0);
    return running;
  });
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

  if (!values.length) return;

  ctx.strokeStyle = values.at(-1) >= 0 ? "#4fd17a" : "#ff6678";
  ctx.lineWidth = 2.5 * ratio;
  ctx.beginPath();
  values.forEach((value, index) => {
    const x = pad + (index / Math.max(1, values.length - 1)) * chartW;
    const y = pad + ((max - value) / span) * chartH;
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.stroke();

  const lastValue = values.at(-1);
  ctx.fillStyle = lastValue >= 0 ? "#4fd17a" : "#ff6678";
  ctx.font = `${13 * ratio}px Avenir Next, Segoe UI, sans-serif`;
  ctx.fillText(`Final ${money.format(lastValue)}`, pad, pad - 10 * ratio);
}

function renderTrades(trades) {
  const sample = trades.slice(0, 80);
  byId("trade-sample-note").textContent = trades.length > sample.length ? `Showing first ${sample.length} of ${trades.length}` : `${trades.length} trades`;
  byId("trade-list").innerHTML = sample
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

function renderExperiments(experiments = []) {
  byId("experiment-list").innerHTML = experiments
    .slice(0, 8)
    .map((row) => {
      const summary = row.summary || {};
      const totalPnl = Number(summary.total_pnl_dollars || 0);
      const ror = Number(summary.avg_return_on_risk || 0);
      return `
        <article class="experiment-row">
          <div>
            <strong>${row.name.replaceAll("_", " ")}</strong>
            <span>${row.description}</span>
          </div>
          <div class="experiment-metric">
            <span>Trades</span>
            <strong>${summary.trade_count || 0}</strong>
          </div>
          <div class="experiment-metric">
            <span>Win Rate</span>
            <strong>${summary.win_rate === undefined ? "--" : pct.format(summary.win_rate)}</strong>
          </div>
          <div class="experiment-metric">
            <span>Total P/L</span>
            <strong class="${pnlClass(totalPnl)}">${money.format(totalPnl)}</strong>
          </div>
          <div class="experiment-metric">
            <span>Avg R/R</span>
            <strong class="${pnlClass(ror)}">${summary.avg_return_on_risk === undefined ? "--" : pct.format(ror)}</strong>
          </div>
        </article>
      `;
    })
    .join("");
}

function render(data) {
  const { summary, rules, trades, run, tickers, experiments } = data;

  byId("source-pill").textContent = "Polygon";
  const entryDates = run.entry_dates || [run.entry_date].filter(Boolean);
  byId("entry-date").textContent =
    entryDates.length > 1 ? `${entryDates[0]} to ${entryDates.at(-1)} (${entryDates.length} entries)` : entryDates[0];
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
  renderExperiments(experiments);
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
