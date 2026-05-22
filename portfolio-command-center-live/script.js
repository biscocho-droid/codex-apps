const STORAGE_KEY = "portfolio_command_center_v7";
const PRICE_DATA_URL = "../portfolio-command-center/data/portfolio-prices.json";
const ACCOUNT_VIEWS = {
  combined: { label: "Combined", chip: "Combined", chartClass: "chart-series-combined", gradient: ["rgba(244,201,106,0.34)", "rgba(244,201,106,0.02)"] },
  brokerage: { label: "Personal Brokerage", chip: "Brokerage", chartClass: "chart-series-brokerage", gradient: ["rgba(114,220,143,0.34)", "rgba(114,220,143,0.02)"] },
  retirement: { label: "401(k)", chip: "401(k)", chartClass: "chart-series-retirement", gradient: ["rgba(122,184,255,0.34)", "rgba(122,184,255,0.02)"] },
};

const defaultState = {
  profile: {
    operatingBase: "Austin, TX · US tax resident",
    northStar:
      "Compound aggressively while operator upside is still high, but never at the cost of sleep, liquidity, or strategic freedom.",
    rules: [
      "Protect the floor before chasing upside.",
      "Liquidity is optionality, not laziness.",
      "A position that hijacks attention is already too large.",
      "Public narratives do not get to rewrite private risk.",
    ],
  },
  holdings: [
    {
      ticker: "AMD",
      name: "AMD",
      assetClass: "Equity",
      sector: "Semis / AI",
      shares: 10.36349,
      avgCost: 192.52,
      price: 449.59,
      account: "brokerage",
      conviction: "Medium",
      thesis:
        "Semiconductor and AI compute exposure with upside tied to product cycles and share capture.",
      note:
        "Updated from Webull account positions screenshot shared on May 22, 2026.",
    },
    {
      ticker: "TSLA",
      name: "Tesla",
      assetClass: "Equity",
      sector: "Mobility / Energy",
      shares: 41.83529,
      avgCost: 267.59,
      price: 417.85,
      account: "brokerage",
      conviction: "Watch",
      thesis:
        "High-beta operator-led exposure where narrative, execution, and optionality all matter more than simple linear forecasting.",
      note:
        "Updated from Webull account positions screenshot shared on May 22, 2026.",
    },
    {
      ticker: "CRWV",
      name: "CoreWeave",
      assetClass: "Equity",
      sector: "AI Infrastructure",
      shares: 6.3782,
      avgCost: 107.21,
      price: 107.58,
      account: "brokerage",
      conviction: "Watch",
      thesis:
        "AI infrastructure exposure with high operating leverage and high valuation sensitivity.",
      note:
        "Updated from Webull account positions screenshot shared on May 22, 2026.",
    },
    {
      ticker: "CLSK",
      name: "CleanSpark",
      assetClass: "Equity",
      sector: "Bitcoin Mining",
      shares: 23.38667,
      avgCost: 15.12,
      price: 15.76,
      account: "brokerage",
      conviction: "Watch",
      thesis:
        "Bitcoin-mining equity exposure with high sensitivity to bitcoin price, hash economics, and operating execution.",
      note:
        "Added from Webull account positions screenshot shared on May 22, 2026.",
    },
    {
      ticker: "AMZN",
      name: "Amazon",
      assetClass: "Equity",
      sector: "Platform",
      shares: 8.33464,
      avgCost: 255.23,
      price: 268.46,
      account: "brokerage",
      conviction: "Medium",
      thesis:
        "Platform and cloud compounder exposure with durable cash-generation and AI leverage through AWS.",
      note:
        "Updated from Webull account positions screenshot shared on May 22, 2026.",
    },
    {
      ticker: "SOFI",
      name: "SoFi Technologies",
      assetClass: "Equity",
      sector: "Fintech",
      shares: 247.51393,
      avgCost: 20.02,
      price: 15.65,
      account: "brokerage",
      conviction: "Medium",
      thesis:
        "Fintech and consumer-platform exposure with upside tied to execution, member growth, and credit discipline.",
      note:
        "Updated from Webull account positions screenshot shared on May 22, 2026.",
    },
    {
      ticker: "COIN",
      name: "Coinbase Global",
      assetClass: "Equity",
      sector: "Crypto Platform",
      shares: 8,
      avgCost: 195.35,
      price: 193.56,
      account: "brokerage",
      conviction: "Medium",
      thesis:
        "Exchange and crypto-infrastructure exposure that benefits from volume, retail participation, and broader digital-asset adoption.",
      note:
        "Updated from Webull account positions screenshot shared on May 22, 2026.",
    },
    {
      ticker: "IBIT",
      name: "iShares Bitcoin Trust",
      assetClass: "ETF",
      sector: "Digital Asset",
      shares: 63.5,
      avgCost: 51.18,
      price: 44,
      account: "brokerage",
      conviction: "Medium",
      thesis:
        "Spot bitcoin ETF position for simple listed exposure without direct custody complexity.",
      note:
        "Updated from Webull account positions screenshot shared on May 22, 2026.",
    },
    {
      ticker: "SOL",
      name: "Solana",
      assetClass: "Digital Asset",
      sector: "Crypto / Layer 1",
      shares: 25.95,
      avgCost: 148.1390366088632,
      price: 86.885,
      account: "brokerage",
      conviction: "Medium",
      thesis:
        "Aggregated Solana exposure across two separate accounts, tracked as one combined digital-asset position for portfolio visibility.",
      note:
        "Combined lots: 4 SOL at $202.46 average cost and 21.95 SOL at $138.24 average cost. Price updates through Coinbase spot data.",
    },
    {
      ticker: "MU",
      name: "Micron Technology",
      assetClass: "Equity",
      sector: "Semis / Memory",
      shares: 4.47184,
      avgCost: 380.97,
      price: 762.1,
      account: "brokerage",
      conviction: "Medium",
      thesis:
        "Memory-cycle and AI infrastructure exposure with sharper cyclicality than the highest-quality semis.",
      note:
        "Updated from Webull account positions screenshot shared on May 22, 2026.",
    },
    {
      ticker: "FGRIX",
      name: "Fidelity Growth Company Fund",
      assetClass: "Retirement Fund",
      sector: "Growth Equity",
      shares: 17.2,
      avgCost: 773.78,
      price: 773.78,
      account: "retirement",
      conviction: "Retirement",
      thesis:
        "Long-duration retirement exposure held for broad growth participation inside a tax-advantaged account.",
      note:
        "401(k) holding updated from reported total gain of 17.37% on May 18, 2026.",
    },
    {
      ticker: "SP500",
      name: "S&P 500 Equity Index Fund",
      assetClass: "Retirement Fund",
      sector: "Index Fund",
      shares: 44.33,
      avgCost: 302,
      price: 302.01,
      account: "retirement",
      conviction: "Retirement",
      thesis:
        "Core passive retirement exposure intended to anchor long-term US equity compounding.",
      note:
        "401(k) holding updated from reported total gain of 13% on May 18, 2026.",
    },
    {
      ticker: "HON",
      name: "Honeywell",
      assetClass: "Retirement Equity",
      sector: "Industrial",
      shares: 166.65,
      avgCost: 134.15,
      price: 134.15,
      account: "retirement",
      conviction: "Retirement",
      thesis:
        "Individual-stock retirement exposure carried separately from the active taxable book.",
      note:
        "401(k) holding updated from reported total gain of 0.03% on May 18, 2026.",
    },
  ],
  cashAccounts: [
    { name: "Brokerage Cash", type: "Investment", balance: 0, account: "brokerage", note: "Cash balance not provided in screenshot yet." },
  ],
  history: {
    labels: [
      "Oct 2025", "Nov 2025", "Dec 2025", "Jan 2026", "Feb 2026", "Mar 2026",
      "Apr 2026", "May 2026",
    ],
    brokerage: [22850, 24100, 25640, 24980, 27250, 30140, 33220, 38751],
    retirement: [38620, 39210, 39840, 40460, 40980, 41390, 41870, 42234],
    combined: [61470, 63310, 65480, 65440, 68230, 71530, 75090, 80985],
  },
  planning: {
    k401: {
      currentBalance: null,
      monthlyContribution: 850,
      employerMatch: 250,
      annualRaisePct: 3,
      years: 25,
      baseReturnPct: 8,
      withdrawalRatePct: 4,
    },
    scenarioTargets: {},
  },
};

const els = {
  totalValue: document.getElementById("total-value"),
  totalValueNote: document.getElementById("total-value-note"),
  unrealizedPl: document.getElementById("unrealized-pl"),
  unrealizedPlNote: document.getElementById("unrealized-pl-note"),
  costBasis: document.getElementById("cost-basis"),
  costBasisNote: document.getElementById("cost-basis-note"),
  cashReserve: document.getElementById("cash-reserve"),
  cashReserveNote: document.getElementById("cash-reserve-note"),
  appViews: [...document.querySelectorAll(".app-view")],
  viewButtons: [...document.querySelectorAll(".view-button")],
  holdingsCaption: document.getElementById("holdings-caption"),
  holdingsBody: document.getElementById("holdings-body"),
  sheetCount: document.getElementById("sheet-count"),
  sheetValue: document.getElementById("sheet-value"),
  sheetPl: document.getElementById("sheet-pl"),
  sheetBody: document.getElementById("sheet-body"),
  sheetTotalCost: document.getElementById("sheet-total-cost"),
  sheetTotalValue: document.getElementById("sheet-total-value"),
  sheetTotalPl: document.getElementById("sheet-total-pl"),
  sheetTotalPlPct: document.getElementById("sheet-total-pl-pct"),
  assetAllocation: document.getElementById("asset-allocation"),
  sectorAllocation: document.getElementById("sector-allocation"),
  cashAccounts: document.getElementById("cash-accounts"),
  largestPosition: document.getElementById("largest-position"),
  topWinner: document.getElementById("top-winner"),
  topLaggard: document.getElementById("top-laggard"),
  cashPercent: document.getElementById("cash-percent"),
  morningBrief: document.getElementById("morning-brief"),
  thesisCards: document.getElementById("thesis-cards"),
  profileOperatingBase: document.getElementById("profile-operating-base"),
  profileNorthStar: document.getElementById("profile-north-star"),
  profileRules: document.getElementById("profile-rules"),
  strategyInput: document.getElementById("strategy-input"),
  runOverlay: document.getElementById("run-overlay"),
  overlayResponse: document.getElementById("overlay-response"),
  marketStatus: document.getElementById("market-status"),
  pricingStamp: document.getElementById("pricing-stamp"),
  chartCaption: document.getElementById("chart-caption"),
  chart: document.getElementById("portfolio-chart"),
  k401StartingBalance: document.getElementById("k401-starting-balance"),
  k401ProjectedBalance: document.getElementById("k401-projected-balance"),
  k401GrowthShare: document.getElementById("k401-growth-share"),
  k401CurrentBalance: document.getElementById("k401-current-balance"),
  k401MonthlyContribution: document.getElementById("k401-monthly-contribution"),
  k401EmployerMatch: document.getElementById("k401-employer-match"),
  k401AnnualRaise: document.getElementById("k401-annual-raise"),
  k401Years: document.getElementById("k401-years"),
  k401BaseReturn: document.getElementById("k401-base-return"),
  k401Chart: document.getElementById("k401-chart"),
  k401ChartCaption: document.getElementById("k401-chart-caption"),
  k401Summary: document.getElementById("k401-summary"),
  scenarioCurrentValue: document.getElementById("scenario-current-value"),
  scenarioBaseValue: document.getElementById("scenario-base-value"),
  scenarioBullValue: document.getElementById("scenario-bull-value"),
  scenarioChart: document.getElementById("scenario-chart"),
  scenarioHorizonCaption: document.getElementById("scenario-horizon-caption"),
  scenarioReadout: document.getElementById("scenario-readout"),
  scenarioCards: document.getElementById("scenario-cards"),
  scenarioYearButtons: [...document.querySelectorAll(".scenario-year-button")],
  matrixBearTotal: document.getElementById("matrix-bear-total"),
  matrixBaseTotal: document.getElementById("matrix-base-total"),
  matrixBullTotal: document.getElementById("matrix-bull-total"),
  matrixHorizonCaption: document.getElementById("matrix-horizon-caption"),
  matrixBody: document.getElementById("matrix-body"),
  matrixCurrentTotal: document.getElementById("matrix-current-total"),
  matrixBearValue: document.getElementById("matrix-bear-value"),
  matrixBearPl: document.getElementById("matrix-bear-pl"),
  matrixBaseValue: document.getElementById("matrix-base-value"),
  matrixBasePl: document.getElementById("matrix-base-pl"),
  matrixBullValue: document.getElementById("matrix-bull-value"),
  matrixBullPl: document.getElementById("matrix-bull-pl"),
  accountPills: [...document.querySelectorAll(".account-pill")],
  rangePills: [...document.querySelectorAll(".range-pill")],
  promptPills: [...document.querySelectorAll(".prompt-pill")],
};

function money(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function pct(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function compactMoney(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value || 0);
}

function formatPriceStamp(priceMeta) {
  if (!priceMeta?.asOf) return `Updated ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  const date = new Date(priceMeta.asOf);
  if (Number.isNaN(date.getTime())) return `Prices ${priceMeta.asOf}`;
  return `Prices ${date.toLocaleDateString([], { month: "short", day: "numeric" })} ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);
    const history = parsed.history || structuredClone(defaultState.history);
    const holdings = (parsed.holdings || structuredClone(defaultState.holdings)).map((holding) => ({
      ...holding,
      account: holding.account || (String(holding.assetClass).toLowerCase().includes("retirement") ? "retirement" : "brokerage"),
    }));
    const existingTickers = new Set(holdings.map((holding) => holding.ticker));
    const missingDefaultHoldings = defaultState.holdings
      .filter((holding) => !existingTickers.has(holding.ticker))
      .map((holding) => structuredClone(holding));
    return {
      profile: parsed.profile || structuredClone(defaultState.profile),
      holdings: [...holdings, ...missingDefaultHoldings],
      cashAccounts: (parsed.cashAccounts || structuredClone(defaultState.cashAccounts)).map((account) => ({
        ...account,
        account: account.account || "brokerage",
      })),
      planning: {
        ...structuredClone(defaultState.planning),
        ...(parsed.planning || {}),
        k401: {
          ...structuredClone(defaultState.planning.k401),
          ...((parsed.planning && parsed.planning.k401) || {}),
        },
        scenarioTargets: {
          ...structuredClone(defaultState.planning.scenarioTargets),
          ...((parsed.planning && parsed.planning.scenarioTargets) || {}),
        },
      },
      history: {
        labels: history.labels || structuredClone(defaultState.history.labels),
        brokerage: history.brokerage || history.values || structuredClone(defaultState.history.brokerage),
        retirement: history.retirement || structuredClone(defaultState.history.retirement),
        combined: history.combined || structuredClone(defaultState.history.combined),
      },
    };
  } catch (_error) {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function holdingMetrics(holding) {
  const costBasis = holding.shares * holding.avgCost;
  const value = holding.shares * holding.price;
  const pnl = value - costBasis;
  const pnlPct = costBasis > 0 ? pnl / costBasis : 0;
  return { costBasis, value, pnl, pnlPct };
}

function inActiveAccount(item) {
  return activeAccountView === "combined" || item.account === activeAccountView;
}

function inAccountView(item, accountView) {
  return accountView === "combined" || item.account === accountView;
}

function aggregateStateFor(accountView) {
  const holdings = state.holdings
    .filter((holding) => inAccountView(holding, accountView))
    .map((holding) => ({ ...holding, ...holdingMetrics(holding) }));
  const totalHoldingsValue = holdings.reduce((sum, holding) => sum + holding.value, 0);
  const totalCostBasis = holdings.reduce((sum, holding) => sum + holding.costBasis, 0);
  const cashAccounts = state.cashAccounts.filter((account) => inAccountView(account, accountView));
  const totalCash = cashAccounts.reduce((sum, account) => sum + account.balance, 0);
  const totalValue = totalHoldingsValue + totalCash;
  const totalPnl = totalHoldingsValue - totalCostBasis;
  const totalPnlPct = totalCostBasis > 0 ? totalPnl / totalCostBasis : 0;

  holdings.forEach((holding) => {
    holding.weight = totalValue > 0 ? holding.value / totalValue : 0;
  });

  const sortByValue = [...holdings].sort((a, b) => b.value - a.value);
  const sortByPnlPct = [...holdings].sort((a, b) => b.pnlPct - a.pnlPct);

  return {
    accountView,
    accountLabel: ACCOUNT_VIEWS[accountView].label,
    holdings,
    cashAccounts,
    totalHoldingsValue,
    totalCostBasis,
    totalCash,
    totalValue,
    totalPnl,
    totalPnlPct,
    largestPosition: sortByValue[0] || null,
    topWinner: sortByPnlPct[0] || null,
    topLaggard: sortByPnlPct[sortByPnlPct.length - 1] || null,
  };
}

function aggregateState() {
  return aggregateStateFor(activeAccountView);
}

function buildAllocation(items, key, total) {
  const map = new Map();
  items.forEach((item) => {
    map.set(item[key], (map.get(item[key]) || 0) + item.value);
  });
  return [...map.entries()]
    .map(([label, value]) => ({ label, value, share: total > 0 ? value / total : 0 }))
    .sort((a, b) => b.value - a.value);
}

function renderSummary(model) {
  els.totalValue.textContent = money(model.totalValue);
  els.totalValueNote.textContent = `${model.accountLabel} · ${compactMoney(model.totalHoldingsValue)} invested`;
  els.unrealizedPl.textContent = `${model.totalPnl >= 0 ? "+" : ""}${money(model.totalPnl)}`;
  els.unrealizedPl.className = model.totalPnl >= 0 ? "positive-text" : "negative-text";
  els.unrealizedPlNote.textContent = `${model.totalPnlPct >= 0 ? "+" : ""}${pct(model.totalPnlPct)} all time`;
  els.costBasis.textContent = money(model.totalCostBasis);
  els.costBasisNote.textContent = `${model.holdings.length} tracked positions`;
  els.cashReserve.textContent = money(model.totalCash);
  els.cashReserveNote.textContent = `${model.cashAccounts.length} cash accounts`;
}

function convictionClass(level) {
  if (level === "High") return "conviction-high";
  if (level === "Medium") return "conviction-medium";
  if (level === "Retirement") return "conviction-medium";
  return "conviction-watch";
}

function renderHoldings(model) {
  els.holdingsBody.innerHTML = "";
  els.holdingsCaption.textContent = `${model.accountLabel} positions, conviction, and live thesis context`;
  model.holdings
    .sort((a, b) => b.value - a.value)
    .forEach((holding) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td class="ticker-cell">
          <strong>${escapeHtml(holding.ticker)}</strong>
          <span>${escapeHtml(holding.assetClass)}</span>
        </td>
        <td class="name-cell">
          <strong>${escapeHtml(holding.name)}</strong>
          <span>${escapeHtml(holding.sector)}</span>
        </td>
        <td><span class="account-chip account-chip-${escapeHtml(holding.account)}">${escapeHtml(ACCOUNT_VIEWS[holding.account].chip)}</span></td>
        <td>${holding.shares}</td>
        <td>${money(holding.avgCost)}</td>
        <td>${money(holding.price)}</td>
        <td>${money(holding.value)}</td>
        <td class="${holding.pnl >= 0 ? "positive-text" : "negative-text"}">
          ${holding.pnl >= 0 ? "+" : ""}${money(holding.pnl)}
          <div class="small-note">${holding.pnlPct >= 0 ? "+" : ""}${pct(holding.pnlPct)}</div>
        </td>
        <td>${pct(holding.weight)}</td>
        <td><span class="conviction-pill ${convictionClass(holding.conviction)}">${escapeHtml(holding.conviction)}</span></td>
      `;
      els.holdingsBody.appendChild(row);
    });
}

function renderSheet(model) {
  els.sheetCount.textContent = `${model.holdings.length} positions`;
  els.sheetValue.textContent = `${money(model.totalValue)} value`;
  els.sheetPl.textContent = `${model.totalPnl >= 0 ? "+" : ""}${money(model.totalPnl)} P/L`;
  els.sheetPl.className = model.totalPnl >= 0 ? "positive-text" : "negative-text";
  els.sheetBody.innerHTML = "";

  model.holdings
    .sort((a, b) => {
      if (a.account !== b.account) return a.account.localeCompare(b.account);
      return b.value - a.value;
    })
    .forEach((holding) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><span class="account-chip account-chip-${escapeHtml(holding.account)}">${escapeHtml(ACCOUNT_VIEWS[holding.account].chip)}</span></td>
        <td class="ticker-cell"><strong>${escapeHtml(holding.ticker)}</strong></td>
        <td>${escapeHtml(holding.name)}</td>
        <td>${escapeHtml(holding.assetClass)}</td>
        <td>${escapeHtml(holding.sector)}</td>
        <td class="numeric-cell">${holding.shares.toLocaleString("en-US", { maximumFractionDigits: 5 })}</td>
        <td class="numeric-cell">${money(holding.avgCost)}</td>
        <td class="numeric-cell">${money(holding.price)}</td>
        <td class="numeric-cell">${money(holding.costBasis)}</td>
        <td class="numeric-cell">${money(holding.value)}</td>
        <td class="numeric-cell ${holding.pnl >= 0 ? "positive-text" : "negative-text"}">${holding.pnl >= 0 ? "+" : ""}${money(holding.pnl)}</td>
        <td class="numeric-cell ${holding.pnlPct >= 0 ? "positive-text" : "negative-text"}">${holding.pnlPct >= 0 ? "+" : ""}${pct(holding.pnlPct)}</td>
        <td class="numeric-cell">${pct(holding.weight)}</td>
        <td><span class="conviction-pill ${convictionClass(holding.conviction)}">${escapeHtml(holding.conviction)}</span></td>
        <td class="sheet-note">${escapeHtml(holding.thesis)} ${escapeHtml(holding.note)}</td>
      `;
      els.sheetBody.appendChild(row);
    });

  els.sheetTotalCost.textContent = money(model.totalCostBasis);
  els.sheetTotalValue.textContent = money(model.totalHoldingsValue);
  els.sheetTotalPl.textContent = `${model.totalPnl >= 0 ? "+" : ""}${money(model.totalPnl)}`;
  els.sheetTotalPl.className = model.totalPnl >= 0 ? "positive-text" : "negative-text";
  els.sheetTotalPlPct.textContent = `${model.totalPnlPct >= 0 ? "+" : ""}${pct(model.totalPnlPct)}`;
  els.sheetTotalPlPct.className = model.totalPnlPct >= 0 ? "positive-text" : "negative-text";
}

function renderAllocationList(target, rows) {
  target.innerHTML = "";
  rows.forEach((row) => {
    const item = document.createElement("div");
    item.className = "allocation-row";
    item.innerHTML = `
      <div class="allocation-meta">
        <strong>${escapeHtml(row.label)}</strong>
        <span>${money(row.value)} · ${pct(row.share)}</span>
      </div>
      <div class="allocation-track">
        <div class="allocation-fill" style="width:${Math.max(row.share * 100, 4)}%"></div>
      </div>
    `;
    target.appendChild(item);
  });
}

function renderCashAccounts(totalValue) {
  els.cashAccounts.innerHTML = "";
  const accounts = state.cashAccounts.filter(inActiveAccount);
  if (!accounts.length) {
    const item = document.createElement("div");
    item.className = "account-row";
    item.innerHTML = `
      <div class="account-head">
        <strong>No tracked cash accounts</strong>
        <span>${money(0)}</span>
      </div>
      <p>Add retirement cash later if you want liquidity reflected inside the 401(k) view.</p>
      <div class="small-note">${escapeHtml(ACCOUNT_VIEWS[activeAccountView].label)} scope</div>
    `;
    els.cashAccounts.appendChild(item);
    return;
  }
  accounts.forEach((account) => {
    const share = totalValue > 0 ? account.balance / totalValue : 0;
    const item = document.createElement("div");
    item.className = "account-row";
    item.innerHTML = `
      <div class="account-head">
        <strong>${escapeHtml(account.name)}</strong>
        <span>${money(account.balance)}</span>
      </div>
      <p>${escapeHtml(account.note)}</p>
      <div class="small-note">${escapeHtml(account.type)} · ${pct(share)} of total portfolio value</div>
    `;
    els.cashAccounts.appendChild(item);
  });
}

function renderPerformance(model) {
  if (!model.largestPosition || !model.topWinner || !model.topLaggard) {
    els.largestPosition.textContent = "--";
    els.topWinner.textContent = "--";
    els.topLaggard.textContent = "--";
    els.cashPercent.textContent = "--";
    return;
  }
  els.largestPosition.textContent = `${model.largestPosition.ticker} · ${pct(model.largestPosition.weight)}`;
  els.topWinner.textContent = `${model.topWinner.ticker} · +${pct(model.topWinner.pnlPct)}`;
  els.topLaggard.textContent = `${model.topLaggard.ticker} · ${pct(model.topLaggard.pnlPct)}`;
  els.cashPercent.textContent = pct(model.totalValue > 0 ? model.totalCash / model.totalValue : 0);
}

function renderBrief(model) {
  if (!model.largestPosition || !model.topWinner || !model.topLaggard) {
    els.morningBrief.textContent = "No holdings are loaded for this account view yet.";
    return;
  }
  const cashShare = model.totalValue > 0 ? model.totalCash / model.totalValue : 0;
  const brief = [
    `${model.accountLabel}: ${model.largestPosition.ticker} is the largest position at ${pct(model.largestPosition.weight)} of total value, so concentration discipline matters today.`,
    `Cash reserve is ${money(model.totalCash)} (${pct(cashShare)} of the book), which means dry powder is ${cashShare >= 0.15 ? "healthy" : "getting tighter"}.`,
    `${model.topWinner.ticker} is the strongest contributor, while ${model.topLaggard.ticker} is the holding most likely to need a thesis refresh.`,
    `North star: ${state.profile.northStar}`,
  ];
  els.morningBrief.textContent = brief.join("\n\n");
}

function renderTheses(model) {
  els.thesisCards.innerHTML = "";
  model.holdings
    .sort((a, b) => b.weight - a.weight)
    .forEach((holding) => {
      const item = document.createElement("article");
      item.className = "thesis-card";
      item.innerHTML = `
        <div class="thesis-head">
          <strong>${escapeHtml(holding.ticker)} · ${escapeHtml(holding.name)}</strong>
          <span>${pct(holding.weight)} weight</span>
        </div>
        <p>${escapeHtml(holding.thesis)}</p>
        <p class="small-note">${escapeHtml(holding.note)}</p>
      `;
      els.thesisCards.appendChild(item);
    });
}

function renderProfile() {
  els.profileOperatingBase.textContent = state.profile.operatingBase;
  els.profileNorthStar.textContent = state.profile.northStar;
  els.profileRules.innerHTML = "";
  state.profile.rules.forEach((rule) => {
    const item = document.createElement("li");
    item.textContent = rule;
    els.profileRules.appendChild(item);
  });
}

function linePath(points) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function areaPath(points, baseline) {
  if (!points.length) return "";
  const start = `M ${points[0].x} ${baseline}`;
  const lines = points.map((point) => `L ${point.x} ${point.y}`).join(" ");
  const end = `L ${points[points.length - 1].x} ${baseline} Z`;
  return `${start} ${lines} ${end}`;
}

function getSeriesForRange(range) {
  const labels = state.history.labels;
  const values = [...(state.history[activeAccountView] || state.history.combined)];
  values[values.length - 1] = Math.round(aggregateStateFor(activeAccountView).totalValue);
  if (range === "1M") return { labels: labels.slice(-4), values: values.slice(-4) };
  if (range === "3M") return { labels: labels.slice(-6), values: values.slice(-6) };
  if (range === "1Y") return { labels, values };
  return { labels, values };
}

function renderChart() {
  const range = activeRange;
  const series = getSeriesForRange(range);
  const accountView = ACCOUNT_VIEWS[activeAccountView];
  const width = 900;
  const height = 360;
  const pad = { top: 26, right: 26, bottom: 42, left: 58 };
  const chartWidth = width - pad.left - pad.right;
  const chartHeight = height - pad.top - pad.bottom;
  const min = Math.min(...series.values) * 0.96;
  const max = Math.max(...series.values) * 1.04;
  const points = series.values.map((value, index) => ({
    x: pad.left + (chartWidth * index) / Math.max(series.values.length - 1, 1),
    y: pad.top + ((max - value) / (max - min || 1)) * chartHeight,
    value,
    label: series.labels[index],
  }));

  const gridLines = Array.from({ length: 4 }, (_, index) => {
    const y = pad.top + (chartHeight / 3) * index;
    return `<line class="chart-grid-line" x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}"></line>`;
  }).join("");

  const yLabels = Array.from({ length: 4 }, (_, index) => {
    const value = max - ((max - min) / 3) * index;
    const y = pad.top + (chartHeight / 3) * index + 4;
    return `<text class="chart-axis-label" x="8" y="${y}">${compactMoney(value)}</text>`;
  }).join("");

  const xLabels = points.map((point, index) => {
    if (index !== 0 && index !== points.length - 1 && index !== Math.floor(points.length / 2)) return "";
    return `<text class="chart-axis-label" x="${point.x}" y="${height - 12}" text-anchor="middle">${point.label}</text>`;
  }).join("");

  els.chart.setAttribute("class", `portfolio-chart ${accountView.chartClass}`);
  els.chart.innerHTML = `
    <defs>
      <linearGradient id="chartAreaGradient" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="${accountView.gradient[0]}"></stop>
        <stop offset="100%" stop-color="${accountView.gradient[1]}"></stop>
      </linearGradient>
    </defs>
    ${gridLines}
    ${yLabels}
    ${xLabels}
    <path class="chart-area" d="${areaPath(points, height - pad.bottom)}"></path>
    <path class="chart-line" d="${linePath(points)}"></path>
    ${points.map((point) => `<circle class="chart-dot" cx="${point.x}" cy="${point.y}" r="3"></circle>`).join("")}
    <line id="chart-hover-line" class="chart-hover-line" x1="${points.at(-1).x}" y1="${pad.top}" x2="${points.at(-1).x}" y2="${height - pad.bottom}"></line>
    <circle id="chart-hover-dot" class="chart-hover-dot" cx="${points.at(-1).x}" cy="${points.at(-1).y}" r="6"></circle>
    <g id="chart-tooltip" class="chart-tooltip" transform="translate(${Math.max(points.at(-1).x - 84, pad.left)}, ${Math.max(points.at(-1).y - 84, pad.top)})">
      <rect class="chart-tooltip-bg" width="168" height="66" rx="8"></rect>
      <text id="chart-tooltip-label" class="chart-tooltip-label" x="12" y="23">${points.at(-1).label}</text>
      <text id="chart-tooltip-value" class="chart-tooltip-value" x="12" y="52">${money(points.at(-1).value)}</text>
    </g>
    <rect id="chart-hit-layer" class="chart-hit-layer" x="${pad.left}" y="${pad.top}" width="${chartWidth}" height="${chartHeight}"></rect>
  `;

  els.chartCaption.textContent = `${accountView.label} · ${range} range · ${series.labels[0]} to ${series.labels[series.labels.length - 1]}`;
  bindChartHover(points, { pad, width, height });
}

function bindChartHover(points, chartBox) {
  const hitLayer = document.getElementById("chart-hit-layer");
  const hoverLine = document.getElementById("chart-hover-line");
  const hoverDot = document.getElementById("chart-hover-dot");
  const tooltip = document.getElementById("chart-tooltip");
  const tooltipLabel = document.getElementById("chart-tooltip-label");
  const tooltipValue = document.getElementById("chart-tooltip-value");

  if (!hitLayer || !hoverLine || !hoverDot || !tooltip || !tooltipLabel || !tooltipValue) return;

  function moveTooltip(point) {
    const tooltipWidth = 168;
    const tooltipHeight = 66;
    const margin = 12;
    const minX = chartBox.pad.left;
    const maxX = chartBox.width - chartBox.pad.right - tooltipWidth;
    const minY = chartBox.pad.top;
    const maxY = chartBox.height - chartBox.pad.bottom - tooltipHeight;
    const tooltipX = Math.min(Math.max(point.x - tooltipWidth / 2, minX), maxX);
    const tooltipY = Math.min(Math.max(point.y - tooltipHeight - margin, minY), maxY);

    hoverLine.setAttribute("x1", point.x);
    hoverLine.setAttribute("x2", point.x);
    hoverDot.setAttribute("cx", point.x);
    hoverDot.setAttribute("cy", point.y);
    tooltip.setAttribute("transform", `translate(${tooltipX}, ${tooltipY})`);
    tooltipLabel.textContent = point.label;
    tooltipValue.textContent = money(point.value);
  }

  function nearestPoint(event) {
    const rect = els.chart.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * chartBox.width;
    return points.reduce((closest, point) => {
      return Math.abs(point.x - x) < Math.abs(closest.x - x) ? point : closest;
    }, points[0]);
  }

  hitLayer.addEventListener("pointerenter", (event) => {
    els.chart.classList.add("is-hovering");
    moveTooltip(nearestPoint(event));
  });

  hitLayer.addEventListener("pointermove", (event) => {
    moveTooltip(nearestPoint(event));
  });

  hitLayer.addEventListener("pointerleave", () => {
    els.chart.classList.remove("is-hovering");
  });
}

function runOverlayResponse(prompt, model) {
  const lower = prompt.toLowerCase();

  if (!prompt.trim()) {
    return "Ask about concentration, liquidity, thesis drift, or position-level review. The overlay reads the current portfolio state and investor rules.";
  }

  if (lower.includes("stress") || lower.includes("sleep")) {
    return [
      "Files consulted: holdings, cash tracker, investor profile.",
      `Scope: ${model.accountLabel}.`,
      `${model.largestPosition.ticker} is the stress-point position because it carries ${pct(model.largestPosition.weight)} of the book.`,
      `Cash at ${pct(model.totalCash / model.totalValue)} gives you room to avoid reactive selling, but only if you keep that reserve intact.`,
      "Relevant rule: a position that hijacks attention is already too large.",
      "Next question: if your largest position dropped 25% this month, would your intended action come from thesis change or from discomfort?",
    ].join("\n\n");
  }

  if (lower.includes("review") || lower.includes("thesis")) {
    return [
      "Files consulted: holdings, thesis tracker.",
      `Scope: ${model.accountLabel}.`,
      `${model.topLaggard.ticker} needs the cleanest thesis refresh because price is lagging and conviction is not high enough to ignore re-underwriting.`,
      `${model.topWinner.ticker} also deserves review, but for a different reason: size can outrun the original risk budget when winners keep compounding.`,
      `Medium-conviction names to revisit first: ${model.holdings.filter((holding) => holding.conviction !== "High").map((holding) => holding.ticker).join(", ")}.`,
    ].join("\n\n");
  }

  if (lower.includes("brief")) {
    return els.morningBrief.textContent;
  }

  return [
    "Files consulted: holdings, allocation view, investor profile.",
    `Scope: ${model.accountLabel}.`,
    `Total value is ${money(model.totalValue)} with ${money(model.totalCash)} held in cash.`,
    `Largest concentration is ${model.largestPosition.ticker} at ${pct(model.largestPosition.weight)}.`,
    "Clarify whether you want a position-level review, an allocation answer, or a portfolio-construction answer.",
  ].join("\n\n");
}

function readNumber(input, fallback) {
  const value = Number(input.value);
  return Number.isFinite(value) ? value : fallback;
}

function defaultScenarioTargets(holding, targetYear) {
  const yearsOut = Math.max(Number(targetYear) - 2026, 1);
  if (holding.ticker === "SP500") {
    return {
      bear: Number((holding.price * (1.05 ** yearsOut)).toFixed(2)),
      base: Number((holding.price * (1.08 ** yearsOut)).toFixed(2)),
      bull: Number((holding.price * (1.12 ** yearsOut)).toFixed(2)),
    };
  }

  const multipliers = targetYear === "2035"
    ? { bear: 1 + yearsOut * 0.005, base: 1 + yearsOut * 0.11, bull: 1 + yearsOut * 0.22 }
    : { bear: 1 - yearsOut * 0.025, base: 1 + yearsOut * 0.13, bull: 1 + yearsOut * 0.28 };

  return {
    bear: Number((holding.price * Math.max(multipliers.bear, 0.45)).toFixed(2)),
    base: Number((holding.price * multipliers.base).toFixed(2)),
    bull: Number((holding.price * multipliers.bull).toFixed(2)),
  };
}

function normalizeScenarioTargets() {
  const targets = state.planning.scenarioTargets || {};
  const looksLikeLegacyTargets = Object.values(targets).some((target) => {
    return target && typeof target === "object" && ["bear", "base", "bull"].some((key) => key in target);
  });

  if (looksLikeLegacyTargets) {
    state.planning.scenarioTargets = {
      2030: targets,
      2035: {},
    };
    return;
  }

  state.planning.scenarioTargets = {
    2030: targets["2030"] || {},
    2035: targets["2035"] || {},
  };
}

function ensureScenarioTargets() {
  normalizeScenarioTargets();
  ["2030", "2035"].forEach((targetYear) => {
    state.holdings.forEach((holding) => {
      if (!state.planning.scenarioTargets[targetYear][holding.ticker]) {
        state.planning.scenarioTargets[targetYear][holding.ticker] = defaultScenarioTargets(holding, targetYear);
      }
    });
  });
}

function scenarioRows() {
  ensureScenarioTargets();
  const current = aggregateStateFor("combined");
  return current.holdings.map((holding) => {
    const targets = state.planning.scenarioTargets[activeScenarioYear][holding.ticker];
    const bearValue = holding.shares * targets.bear;
    const baseValue = holding.shares * targets.base;
    const bullValue = holding.shares * targets.bull;
    return {
      ...holding,
      targets,
      bearValue,
      baseValue,
      bullValue,
      bearPnl: bearValue - holding.value,
      basePnl: baseValue - holding.value,
      bullPnl: bullValue - holding.value,
    };
  });
}

function scenarioTotals(rows) {
  const cash = aggregateStateFor("combined").totalCash;
  const currentValue = rows.reduce((sum, row) => sum + row.value, cash);
  const bearValue = rows.reduce((sum, row) => sum + row.bearValue, cash);
  const baseValue = rows.reduce((sum, row) => sum + row.baseValue, cash);
  const bullValue = rows.reduce((sum, row) => sum + row.bullValue, cash);
  return {
    currentValue,
    bearValue,
    baseValue,
    bullValue,
    bearPnl: bearValue - currentValue,
    basePnl: baseValue - currentValue,
    bullPnl: bullValue - currentValue,
  };
}

function buildK401Projection(start, monthlyContribution, employerMatch, annualRaisePct, years, annualReturnPct) {
  const monthlyReturn = annualReturnPct / 100 / 12;
  const raise = annualRaisePct / 100;
  let balance = start;
  let contribution = monthlyContribution + employerMatch;
  let contributed = 0;
  const points = [{ year: 0, balance, contributed: 0 }];

  for (let month = 1; month <= years * 12; month += 1) {
    if (month > 1 && month % 12 === 1) contribution *= 1 + raise;
    balance = balance * (1 + monthlyReturn) + contribution;
    contributed += contribution;
    if (month % 12 === 0) {
      points.push({ year: month / 12, balance, contributed });
    }
  }

  return points;
}

function renderLineChart(target, series) {
  const width = 900;
  const height = 360;
  const pad = { top: 28, right: 34, bottom: 44, left: 72 };
  const chartWidth = width - pad.left - pad.right;
  const chartHeight = height - pad.top - pad.bottom;
  const allPoints = series.flatMap((item) => item.points);
  const maxYear = Math.max(...allPoints.map((point) => point.year), 1);
  const min = 0;
  const max = Math.max(...allPoints.map((point) => point.balance), 1) * 1.08;

  const toPoint = (point) => ({
    x: pad.left + (point.year / maxYear) * chartWidth,
    y: pad.top + ((max - point.balance) / (max - min)) * chartHeight,
    value: point.balance,
    year: point.year,
  });

  const gridLines = Array.from({ length: 4 }, (_, index) => {
    const y = pad.top + (chartHeight / 3) * index;
    const value = max - (max / 3) * index;
    return `
      <line class="chart-grid-line" x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}"></line>
      <text class="chart-axis-label" x="10" y="${y + 4}">${compactMoney(value)}</text>
    `;
  }).join("");

  const yearLabels = [0, Math.round(maxYear / 2), maxYear].map((year) => {
    const x = pad.left + (year / maxYear) * chartWidth;
    return `<text class="chart-axis-label" x="${x}" y="${height - 14}" text-anchor="middle">Year ${year}</text>`;
  }).join("");

  const paths = series.map((item, index) => {
    const points = item.points.map(toPoint);
    return `
      <path class="projection-line projection-line-${item.key}" d="${linePath(points)}"></path>
      <text class="chart-legend" x="${width - 180}" y="${30 + index * 18}">${item.label}: ${compactMoney(points.at(-1).value)}</text>
    `;
  }).join("");

  target.innerHTML = `${gridLines}${yearLabels}${paths}`;
}

function renderBarChart(target, totals) {
  const width = 900;
  const height = 320;
  const pad = { top: 26, right: 34, bottom: 54, left: 72 };
  const chartWidth = width - pad.left - pad.right;
  const chartHeight = height - pad.top - pad.bottom;
  const rows = [
    { key: "bear", label: `${activeScenarioYear} Bear`, value: totals.bearValue, pnl: totals.bearPnl },
    { key: "base", label: `${activeScenarioYear} Base`, value: totals.baseValue, pnl: totals.basePnl },
    { key: "bull", label: `${activeScenarioYear} Bull`, value: totals.bullValue, pnl: totals.bullPnl },
  ];
  const max = Math.max(...rows.map((row) => row.value), totals.currentValue) * 1.12;
  const barWidth = chartWidth / rows.length * 0.54;
  const gridLines = Array.from({ length: 4 }, (_, index) => {
    const y = pad.top + (chartHeight / 3) * index;
    const value = max - (max / 3) * index;
    return `
      <line class="chart-grid-line" x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}"></line>
      <text class="chart-axis-label" x="10" y="${y + 4}">${compactMoney(value)}</text>
    `;
  }).join("");

  const bars = rows.map((row, index) => {
    const x = pad.left + index * (chartWidth / rows.length) + (chartWidth / rows.length - barWidth) / 2;
    const barHeight = (row.value / max) * chartHeight;
    const y = pad.top + chartHeight - barHeight;
    return `
      <rect class="bar-${row.key}" x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="8"></rect>
      <text class="bar-label" x="${x + barWidth / 2}" y="${Math.max(y - 22, 18)}" text-anchor="middle">${compactMoney(row.value)}</text>
      <text class="bar-sublabel" x="${x + barWidth / 2}" y="${Math.max(y - 6, 34)}" text-anchor="middle">${row.pnl >= 0 ? "+" : ""}${compactMoney(row.pnl)}</text>
      <text class="chart-axis-label" x="${x + barWidth / 2}" y="${height - 18}" text-anchor="middle">${row.label}</text>
    `;
  }).join("");

  target.innerHTML = `${gridLines}${bars}`;
}

function renderK401Modeler() {
  const retirement = aggregateStateFor("retirement");
  const settings = state.planning.k401;
  const defaultBalance = Math.round(retirement.totalValue);
  if (settings.currentBalance === null) settings.currentBalance = defaultBalance;

  els.k401CurrentBalance.value = Math.round(settings.currentBalance);
  els.k401MonthlyContribution.value = settings.monthlyContribution;
  els.k401EmployerMatch.value = settings.employerMatch;
  els.k401AnnualRaise.value = settings.annualRaisePct;
  els.k401Years.value = settings.years;
  els.k401BaseReturn.value = settings.baseReturnPct;

  const start = Number(settings.currentBalance) || defaultBalance;
  const bearReturn = 5;
  const baseReturn = 8;
  const bullReturn = 12;
  const series = [
    { key: "bear", label: `Bear ${bearReturn.toFixed(1)}%`, points: buildK401Projection(start, settings.monthlyContribution, settings.employerMatch, settings.annualRaisePct, settings.years, bearReturn) },
    { key: "base", label: `Base ${baseReturn.toFixed(1)}%`, points: buildK401Projection(start, settings.monthlyContribution, settings.employerMatch, settings.annualRaisePct, settings.years, baseReturn) },
    { key: "bull", label: `Bull ${bullReturn.toFixed(1)}%`, points: buildK401Projection(start, settings.monthlyContribution, settings.employerMatch, settings.annualRaisePct, settings.years, bullReturn) },
  ];
  const baseFinal = series[1].points.at(-1);
  const growth = baseFinal.balance - start - baseFinal.contributed;
  const growthShare = baseFinal.balance > 0 ? growth / baseFinal.balance : 0;

  els.k401StartingBalance.textContent = `${money(start)} starting`;
  els.k401ProjectedBalance.textContent = `${money(baseFinal.balance)} projected`;
  els.k401GrowthShare.textContent = `${pct(growthShare)} growth`;
  els.k401ChartCaption.textContent = `${settings.years} years · contributions rise ${settings.annualRaisePct}% annually`;
  renderLineChart(els.k401Chart, series);

  els.k401Summary.innerHTML = `
    <div class="mini-metric"><span>Projected balance</span><strong>${money(baseFinal.balance)}</strong></div>
    <div class="mini-metric"><span>Total contributions</span><strong>${money(baseFinal.contributed)}</strong></div>
    <div class="mini-metric"><span>Estimated growth</span><strong>${money(growth)}</strong></div>
    <div class="mini-metric"><span>4% income estimate</span><strong>${money(baseFinal.balance * (settings.withdrawalRatePct / 100))} / yr</strong></div>
  `;
}

function renderScenarioLab() {
  const rows = scenarioRows().sort((a, b) => b.value - a.value);
  const totals = scenarioTotals(rows);
  els.scenarioCurrentValue.textContent = `${money(totals.currentValue)} current`;
  els.scenarioBaseValue.textContent = `${money(totals.baseValue)} ${activeScenarioYear} base`;
  els.scenarioBullValue.textContent = `${money(totals.bullValue)} ${activeScenarioYear} bull`;
  els.scenarioHorizonCaption.textContent = `${activeScenarioYear} bear/base/bull price targets against today's share counts`;
  renderBarChart(els.scenarioChart, totals);

  const upside = [...rows].sort((a, b) => b.bullPnl - a.bullPnl)[0];
  const downside = [...rows].sort((a, b) => a.bearPnl - b.bearPnl)[0];
  const asymmetric = [...rows].sort((a, b) => (b.bullPnl / Math.max(Math.abs(b.bearPnl), 1)) - (a.bullPnl / Math.max(Math.abs(a.bearPnl), 1)))[0];
  els.scenarioReadout.innerHTML = `
    <div class="mini-metric"><span>${activeScenarioYear} bear case</span><strong class="${totals.bearPnl >= 0 ? "positive-text" : "negative-text"}">${totals.bearPnl >= 0 ? "+" : ""}${money(totals.bearPnl)}</strong></div>
    <div class="mini-metric"><span>${activeScenarioYear} base case</span><strong class="${totals.basePnl >= 0 ? "positive-text" : "negative-text"}">${totals.basePnl >= 0 ? "+" : ""}${money(totals.basePnl)}</strong></div>
    <div class="mini-metric"><span>Biggest upside driver</span><strong>${escapeHtml(upside.ticker)} · ${money(upside.bullPnl)}</strong></div>
    <div class="mini-metric"><span>Most downside risk</span><strong>${escapeHtml(downside.ticker)} · ${money(downside.bearPnl)}</strong></div>
    <div class="mini-metric"><span>Best asymmetry</span><strong>${escapeHtml(asymmetric.ticker)}</strong></div>
  `;

  els.scenarioCards.innerHTML = "";
  rows.forEach((holding) => {
    const card = document.createElement("article");
    card.className = "scenario-card";
    card.innerHTML = `
      <div class="scenario-card-head">
        <div>
          <strong>${escapeHtml(holding.ticker)} · ${escapeHtml(holding.name)}</strong>
          <div class="small-note">${escapeHtml(holding.sector)} · ${money(holding.value)} current</div>
        </div>
        <span class="conviction-pill ${convictionClass(holding.conviction)}">${escapeHtml(holding.conviction)}</span>
      </div>
      <div class="scenario-targets">
        <label>${activeScenarioYear} Bear <input type="number" min="0" step="0.01" data-ticker="${escapeHtml(holding.ticker)}" data-case="bear" value="${holding.targets.bear}"></label>
        <label>${activeScenarioYear} Base <input type="number" min="0" step="0.01" data-ticker="${escapeHtml(holding.ticker)}" data-case="base" value="${holding.targets.base}"></label>
        <label>${activeScenarioYear} Bull <input type="number" min="0" step="0.01" data-ticker="${escapeHtml(holding.ticker)}" data-case="bull" value="${holding.targets.bull}"></label>
      </div>
      <div class="scenario-results">
        <div class="scenario-result-row"><span>Bear impact</span><strong class="${holding.bearPnl >= 0 ? "positive-text" : "negative-text"}">${holding.bearPnl >= 0 ? "+" : ""}${money(holding.bearPnl)}</strong></div>
        <div class="scenario-result-row"><span>Base impact</span><strong class="${holding.basePnl >= 0 ? "positive-text" : "negative-text"}">${holding.basePnl >= 0 ? "+" : ""}${money(holding.basePnl)}</strong></div>
        <div class="scenario-result-row"><span>Bull impact</span><strong class="${holding.bullPnl >= 0 ? "positive-text" : "negative-text"}">${holding.bullPnl >= 0 ? "+" : ""}${money(holding.bullPnl)}</strong></div>
      </div>
    `;
    els.scenarioCards.appendChild(card);
  });
}

function renderOutcomeMatrix() {
  const rows = scenarioRows().sort((a, b) => b.baseValue - a.baseValue);
  const totals = scenarioTotals(rows);
  els.matrixBearTotal.textContent = `${money(totals.bearValue)} ${activeScenarioYear} bear`;
  els.matrixBaseTotal.textContent = `${money(totals.baseValue)} ${activeScenarioYear} base`;
  els.matrixBullTotal.textContent = `${money(totals.bullValue)} ${activeScenarioYear} bull`;
  els.matrixHorizonCaption.textContent = `${activeScenarioYear} outcome matrix using static long-range bear/base/bull targets.`;
  els.matrixBody.innerHTML = "";
  rows.forEach((holding) => {
    const baseWeight = totals.baseValue > 0 ? holding.baseValue / totals.baseValue : 0;
    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="ticker-cell"><strong>${escapeHtml(holding.ticker)}</strong><span>${escapeHtml(holding.name)}</span></td>
      <td class="numeric-cell">${money(holding.value)}</td>
      <td class="numeric-cell">${money(holding.bearValue)}</td>
      <td class="numeric-cell ${holding.bearPnl >= 0 ? "positive-text" : "negative-text"}">${holding.bearPnl >= 0 ? "+" : ""}${money(holding.bearPnl)}</td>
      <td class="numeric-cell">${money(holding.baseValue)}</td>
      <td class="numeric-cell ${holding.basePnl >= 0 ? "positive-text" : "negative-text"}">${holding.basePnl >= 0 ? "+" : ""}${money(holding.basePnl)}</td>
      <td class="numeric-cell">${money(holding.bullValue)}</td>
      <td class="numeric-cell ${holding.bullPnl >= 0 ? "positive-text" : "negative-text"}">${holding.bullPnl >= 0 ? "+" : ""}${money(holding.bullPnl)}</td>
      <td class="numeric-cell">${pct(baseWeight)}</td>
    `;
    els.matrixBody.appendChild(row);
  });

  els.matrixCurrentTotal.textContent = money(totals.currentValue);
  els.matrixBearValue.textContent = money(totals.bearValue);
  els.matrixBearPl.textContent = `${totals.bearPnl >= 0 ? "+" : ""}${money(totals.bearPnl)}`;
  els.matrixBearPl.className = totals.bearPnl >= 0 ? "positive-text" : "negative-text";
  els.matrixBaseValue.textContent = money(totals.baseValue);
  els.matrixBasePl.textContent = `${totals.basePnl >= 0 ? "+" : ""}${money(totals.basePnl)}`;
  els.matrixBasePl.className = totals.basePnl >= 0 ? "positive-text" : "negative-text";
  els.matrixBullValue.textContent = money(totals.bullValue);
  els.matrixBullPl.textContent = `${totals.bullPnl >= 0 ? "+" : ""}${money(totals.bullPnl)}`;
  els.matrixBullPl.className = totals.bullPnl >= 0 ? "positive-text" : "negative-text";
}

function renderAll() {
  const model = aggregateState();
  renderSummary(model);
  renderHoldings(model);
  renderSheet(model);
  renderAllocationList(els.assetAllocation, buildAllocation(model.holdings, "assetClass", model.totalHoldingsValue));
  renderAllocationList(els.sectorAllocation, buildAllocation(model.holdings, "sector", model.totalHoldingsValue));
  renderCashAccounts(model.totalValue);
  renderPerformance(model);
  renderBrief(model);
  renderTheses(model);
  renderProfile();
  renderChart();
  renderK401Modeler();
  renderScenarioLab();
  renderOutcomeMatrix();
  els.marketStatus.textContent = `${model.accountLabel} · ${model.totalPnl >= 0 ? "+" : ""}${pct(model.totalPnlPct)} gain`;
  els.pricingStamp.textContent = formatPriceStamp(priceMeta);
}

async function hydratePrices() {
  try {
    const response = await fetch(`${PRICE_DATA_URL}?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    const prices = data.prices || {};
    let updated = false;
    state.holdings = state.holdings.map((holding) => {
      const quote = prices[holding.ticker];
      if (!quote || !Number.isFinite(Number(quote.price))) return holding;
      updated = true;
      return { ...holding, price: Number(quote.price) };
    });
    if (updated) {
      priceMeta = { asOf: data.asOf, source: data.source };
      renderAll();
    }
  } catch (_error) {
    // Keep seeded prices if the daily static price feed is unavailable.
  }
}

function setActiveRange(range) {
  activeRange = range;
  els.rangePills.forEach((pill) => {
    pill.classList.toggle("active", pill.dataset.range === range);
  });
  renderChart();
}

function setActiveAccountView(accountView) {
  activeAccountView = accountView;
  els.accountPills.forEach((pill) => {
    pill.classList.toggle("active", pill.dataset.accountView === accountView);
  });
  renderAll();
}

function setActiveView(view) {
  activeView = view;
  els.viewButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  els.appViews.forEach((section) => {
    const isActive = section.classList.contains(`${view}-view`);
    section.classList.toggle("active", isActive);
    section.hidden = !isActive;
  });
}

function setActiveScenarioYear(targetYear) {
  activeScenarioYear = targetYear;
  els.scenarioYearButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.scenarioYear === targetYear);
  });
  renderScenarioLab();
  renderOutcomeMatrix();
}

const state = loadState();
let activeRange = "1Y";
let activeAccountView = "combined";
let activeView = "dashboard";
let activeScenarioYear = "2030";
let priceMeta = null;

els.rangePills.forEach((pill) => {
  pill.addEventListener("click", () => setActiveRange(pill.dataset.range));
});

els.accountPills.forEach((pill) => {
  pill.addEventListener("click", () => setActiveAccountView(pill.dataset.accountView));
});

els.viewButtons.forEach((button) => {
  button.addEventListener("click", () => setActiveView(button.dataset.view));
});

els.scenarioYearButtons.forEach((button) => {
  button.addEventListener("click", () => setActiveScenarioYear(button.dataset.scenarioYear));
});

els.promptPills.forEach((pill) => {
  pill.addEventListener("click", () => {
    els.strategyInput.value = pill.dataset.prompt || "";
    els.strategyInput.focus();
  });
});

[
  [els.k401CurrentBalance, "currentBalance"],
  [els.k401MonthlyContribution, "monthlyContribution"],
  [els.k401EmployerMatch, "employerMatch"],
  [els.k401AnnualRaise, "annualRaisePct"],
  [els.k401Years, "years"],
  [els.k401BaseReturn, "baseReturnPct"],
].forEach(([input, key]) => {
  input.addEventListener("input", () => {
    const fallback = state.planning.k401[key] || 0;
    state.planning.k401[key] = readNumber(input, fallback);
    if (key === "years") state.planning.k401[key] = Math.max(1, Math.round(state.planning.k401[key]));
    saveState();
    renderK401Modeler();
  });
});

els.scenarioCards.addEventListener("change", (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;
  const ticker = input.dataset.ticker;
  const scenarioCase = input.dataset.case;
  if (!ticker || !scenarioCase) return;
  ensureScenarioTargets();
  state.planning.scenarioTargets[activeScenarioYear][ticker][scenarioCase] = readNumber(
    input,
    state.planning.scenarioTargets[activeScenarioYear][ticker][scenarioCase]
  );
  saveState();
  renderScenarioLab();
  renderOutcomeMatrix();
});

els.runOverlay.addEventListener("click", () => {
  const model = aggregateState();
  els.overlayResponse.textContent = runOverlayResponse(els.strategyInput.value, model);
});

renderAll();
setActiveScenarioYear(activeScenarioYear);
setActiveView(activeView);
hydratePrices();
