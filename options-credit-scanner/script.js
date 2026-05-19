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

function pct(value) {
  return `${(Number(value) * 100).toFixed(1)}%`;
}

function formatDelta(value) {
  return Number(value).toFixed(2);
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
  byId("scan-status").textContent = `Last scan ${data.scan.local_time} CT | ${data.scan.mode}`;
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
      <div class="candidate-metrics">
        <div>
          <span class="metric-label">credit</span>
          <strong class="metric-value positive">${money.format(candidate.credit)}</strong>
        </div>
        <div>
          <span class="metric-label">max risk</span>
          <strong class="metric-value">${money.format(candidate.max_risk)}</strong>
        </div>
        <div>
          <span class="metric-label">credit/risk</span>
          <strong class="metric-value positive">${pct(candidate.credit_to_risk)}</strong>
        </div>
      </div>
    </button>
  `;
}

function showDetail(candidate) {
  if (!candidate) return;
  byId("detail-title").textContent = `${candidate.ticker} ${candidate.short_put} / ${candidate.long_put} Put`;
  byId("detail-body").innerHTML = `
    <div class="detail-grid">
      <div class="detail-item">
        <span>Credit</span>
        <strong>${money.format(candidate.credit)}</strong>
      </div>
      <div class="detail-item">
        <span>Max risk</span>
        <strong>${money.format(candidate.max_risk)}</strong>
      </div>
      <div class="detail-item">
        <span>Short delta</span>
        <strong>${formatDelta(candidate.short_delta)}</strong>
      </div>
      <div class="detail-item">
        <span>Score</span>
        <strong>${pct(candidate.credit_to_risk)}</strong>
      </div>
    </div>
    <ul class="quality-list">
      <li><span>Bid/ask quality</span><strong>${candidate.quality.bid_ask}</strong></li>
      <li><span>Open interest</span><strong>${candidate.quality.open_interest}</strong></li>
      <li><span>Volume</span><strong>${candidate.quality.volume}</strong></li>
      <li><span>Earnings</span><strong>${candidate.quality.earnings}</strong></li>
    </ul>
  `;
  byId("detail-panel").hidden = false;
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
