const state = {
  data: null,
  candidates: [],
  ticker: "all",
  minScore: 0,
};

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatMoney(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "--";
  return money.format(value);
}

function pct(value) {
  return `${(Number(value) * 100).toFixed(1)}%`;
}

function optionalPct(value) {
  if (value === null || value === undefined) return "--";
  return pct(value);
}

function formatDelta(value) {
  return Number(value).toFixed(2);
}

function formatNumber(value) {
  if (value === null || value === undefined) return "--";
  return Number(value).toLocaleString("en-US");
}

function compactSource(value) {
  if (!value) return "unknown";
  return value.replaceAll("_", " ");
}

function formatMaybeDelta(value) {
  if (value === null || value === undefined) return "--";
  return formatDelta(value);
}

function formatScanDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function byId(id) {
  return document.getElementById(id);
}

async function loadScan() {
  const response = await fetch("data/latest.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Latest scan failed: ${response.status}`);
  }
  state.data = await response.json();
  state.candidates = [...state.data.candidates].sort((a, b) => b.credit_to_risk - a.credit_to_risk);
  render();
}

function render() {
  renderSummary();
  renderFilters();
  renderCandidates();
}

function renderSummary() {
  const data = state.data;
  const status = data.scan.market_status ? ` | market ${data.scan.market_status}` : "";
  const scanDate = formatScanDate(data.scan.generated_at);
  const dateText = scanDate ? ` on ${scanDate}` : "";
  byId("scan-status").textContent = `Last scan ${data.scan.local_time} CT${dateText} | ${data.scan.mode}${status}`;
  byId("ticker-count").textContent = data.summary.ticker_count;
  byId("candidate-count").textContent = data.summary.candidate_count;
  byId("skipped-count").textContent = data.summary.skipped_for_earnings;
  byId("market-badge").textContent = `${data.rules.min_dte}-${data.rules.max_dte} DTE`;
  byId("universe-text").textContent = data.tickers.join(", ");
  renderWarnings(data.warnings || []);
}

function renderWarnings(warnings) {
  const panel = byId("warning-panel");
  const list = byId("warning-list");
  if (!warnings.length) {
    panel.hidden = true;
    list.innerHTML = "";
    return;
  }
  panel.hidden = false;
  list.innerHTML = warnings.slice(0, 5).map((warning) => `<li>${warning}</li>`).join("");
}

function renderFilters() {
  const select = byId("ticker-filter");
  const tickers = ["all", ...state.data.tickers];
  const currentOptions = Array.from(select.options).map((option) => option.value);
  if (currentOptions.join("|") !== tickers.join("|")) {
    select.innerHTML = tickers
      .map((ticker) => `<option value="${ticker}">${ticker === "all" ? "All tickers" : ticker}</option>`)
      .join("");
  }
  select.value = state.ticker;
}

function filteredCandidates() {
  return state.candidates.filter((candidate) => {
    const tickerPass = state.ticker === "all" || candidate.ticker === state.ticker;
    const scorePass = Number(candidate.credit_to_risk) >= state.minScore;
    return tickerPass && scorePass;
  });
}

function renderCandidates() {
  const list = byId("candidate-list");
  const rows = filteredCandidates();
  if (!rows.length) {
    list.innerHTML = `<div class="empty-state">No spreads match the current filters.</div>`;
    return;
  }

  list.innerHTML = rows.map((candidate, index) => candidateCard(candidate, index)).join("");
  list.querySelectorAll("[data-candidate-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const candidate = state.candidates.find((item) => item.id === button.dataset.candidateId);
      showDetail(candidate);
    });
  });
}

function candidateCard(candidate, index) {
  return `
    <button type="button" class="candidate-card" data-candidate-id="${candidate.id}">
      <div class="candidate-top">
        <div class="ticker">${candidate.ticker}</div>
        <div>
          <div class="spread-name">${candidate.short_put} / ${candidate.long_put} Put</div>
          <div class="spread-meta">${candidate.dte} DTE | delta ${formatDelta(candidate.short_delta)} | exp ${candidate.expiration}</div>
        </div>
        <div class="rank-pill">#${index + 1}</div>
      </div>
      <div class="quality-row">
        <span>${candidate.quality.bid_ask} quotes</span>
        <span>${candidate.quality.open_interest} OI</span>
        <span>limit ${formatMoney(candidate.suggested_limit_credit || candidate.credit)}</span>
      </div>
      <div class="candidate-metrics">
        <div>
          <span class="metric-label">credit</span>
          <strong class="metric-value positive">${formatMoney(candidate.credit)}</strong>
          <span class="metric-note">${formatMoney(candidate.max_profit_dollars)} max profit</span>
        </div>
        <div>
          <span class="metric-label">max risk</span>
          <strong class="metric-value">${formatMoney(candidate.max_risk)}</strong>
          <span class="metric-note">${formatMoney(candidate.max_loss_dollars)} max loss</span>
        </div>
        <div>
          <span class="metric-label">credit/risk</span>
          <strong class="metric-value positive">${pct(candidate.credit_to_risk)}</strong>
          <span class="metric-note">premium vs risk</span>
        </div>
      </div>
    </button>
  `;
}

function showDetail(candidate) {
  if (!candidate) return;
  const shortLeg = candidate.legs?.short || {};
  const longLeg = candidate.legs?.long || {};
  const source = state.data?.scan?.data_source || "Yahoo Finance via yfinance";
  byId("detail-title").textContent = `${candidate.ticker} ${candidate.short_put} / ${candidate.long_put} Put`;
  byId("detail-body").innerHTML = `
    <div class="broker-check">
      <div>
        <span>Try limit</span>
        <strong>${formatMoney(candidate.suggested_limit_credit || candidate.credit)}</strong>
      </div>
      <div>
        <span>Do not chase below</span>
        <strong>${formatMoney(candidate.minimum_acceptable_credit || candidate.credit)}</strong>
      </div>
    </div>
    <div class="detail-grid">
      <div class="detail-item">
        <span>Credit</span>
        <strong>${formatMoney(candidate.credit)}</strong>
      </div>
      <div class="detail-item">
        <span>Max risk</span>
        <strong>${formatMoney(candidate.max_risk)}</strong>
      </div>
      <div class="detail-item">
        <span>Short delta</span>
        <strong>${formatDelta(candidate.short_delta)}</strong>
      </div>
      <div class="detail-item">
        <span>Score</span>
        <strong>${pct(candidate.credit_to_risk)}</strong>
      </div>
      <div class="detail-item">
        <span>Breakeven</span>
        <strong>${formatMoney(candidate.breakeven)}</strong>
      </div>
      <div class="detail-item">
        <span>Underlying</span>
        <strong>${formatMoney(candidate.underlying_price)}</strong>
      </div>
      <div class="detail-item">
        <span>Max profit / loss</span>
        <strong>${formatMoney(candidate.max_profit_dollars)} / ${formatMoney(candidate.max_loss_dollars)}</strong>
      </div>
      <div class="detail-item">
        <span>Delta source</span>
        <strong>${compactSource(candidate.delta_source)}</strong>
      </div>
    </div>
    <div class="leg-table-wrap">
      <table class="leg-table">
        <thead>
          <tr>
            <th>Leg</th>
            <th>Bid</th>
            <th>Ask</th>
            <th>Mid</th>
            <th>OI</th>
            <th>Vol</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Sell ${candidate.short_put}P</td>
            <td>${formatMoney(shortLeg.bid)}</td>
            <td>${formatMoney(shortLeg.ask)}</td>
            <td>${formatMoney(shortLeg.mid)}</td>
            <td>${formatNumber(shortLeg.open_interest)}</td>
            <td>${formatNumber(shortLeg.volume)}</td>
          </tr>
          <tr>
            <td>Buy ${candidate.long_put}P</td>
            <td>${formatMoney(longLeg.bid)}</td>
            <td>${formatMoney(longLeg.ask)}</td>
            <td>${formatMoney(longLeg.mid)}</td>
            <td>${formatNumber(longLeg.open_interest)}</td>
            <td>${formatNumber(longLeg.volume)}</td>
          </tr>
        </tbody>
      </table>
    </div>
    ${nearbySpreadsTable(candidate)}
    <ul class="quality-list">
      <li><span>Bid/ask quality</span><strong>${candidate.quality.bid_ask}</strong></li>
      <li><span>Short bid/ask width</span><strong>${optionalPct(shortLeg.bid_ask_width_pct)}</strong></li>
      <li><span>Long bid/ask width</span><strong>${optionalPct(longLeg.bid_ask_width_pct)}</strong></li>
      <li><span>Minimum open interest</span><strong>${formatNumber(candidate.liquidity?.min_open_interest)}</strong></li>
      <li><span>Minimum volume</span><strong>${formatNumber(candidate.liquidity?.min_volume)}</strong></li>
      <li><span>Earnings</span><strong>${candidate.quality.earnings}</strong></li>
      <li><span>Data source</span><strong>${source}</strong></li>
    </ul>
  `;
  byId("detail-panel").hidden = false;
}

function nearbySpreadsTable(candidate) {
  const rows = candidate.nearby_spreads || [];
  if (!rows.length) return "";
  return `
    <section class="nearby-section">
      <div class="nearby-head">
        <h3>Nearby $5-Wide Spreads</h3>
        <span>same expiration</span>
      </div>
      <div class="nearby-table-wrap">
        <table class="nearby-table">
          <thead>
            <tr>
              <th>Sell / Buy</th>
              <th>Delta</th>
              <th>Credit</th>
              <th>Risk</th>
              <th>Score</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(nearbyRow).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function nearbyRow(row) {
  const classes = ["nearby-status"];
  if (row.selected) classes.push("selected");
  else if (row.rules_pass) classes.push("valid");
  else classes.push("outside");
  return `
    <tr class="${row.selected ? "selected-row" : ""}">
      <td>${row.short_put} / ${row.long_put}</td>
      <td>${formatMaybeDelta(row.short_delta)}</td>
      <td>${formatMoney(row.credit)}</td>
      <td>${formatMoney(row.max_risk)}</td>
      <td>${pct(row.credit_to_risk)}</td>
      <td><span class="${classes.join(" ")}">${row.status}</span></td>
    </tr>
  `;
}

function closeDetail() {
  byId("detail-panel").hidden = true;
}

function bindEvents() {
  byId("ticker-filter").addEventListener("change", (event) => {
    state.ticker = event.target.value;
    renderCandidates();
  });

  byId("min-score").addEventListener("change", (event) => {
    state.minScore = Number(event.target.value);
    renderCandidates();
  });

  byId("refresh-button").addEventListener("click", () => {
    loadScan().catch(showError);
  });

  byId("close-detail").addEventListener("click", closeDetail);
}

function showError(error) {
  byId("scan-status").textContent = "Could not load latest scan";
  byId("candidate-list").innerHTML = `<div class="empty-state">${error.message}</div>`;
}

bindEvents();
loadScan().catch(showError);
