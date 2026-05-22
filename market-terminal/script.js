const state = {
  universe: [],
  quotes: [],
  active: null,
  activeView: "DES",
  commandHistory: [],
};

const WATCHLIST_STORAGE_KEY = "aurora-terminal-watchlist-open";

const sectorAliases = {
  TECH: "Information Technology",
  TECHNOLOGY: "Information Technology",
  HEALTH: "Health Care",
  FIN: "Financials",
  FINANCE: "Financials",
  COMM: "Communication Services",
  CONSUMER: "Consumer Discretionary",
  ENERGY: "Energy",
  INDUSTRIAL: "Industrials",
  MATERIALS: "Materials",
  REAL: "Real Estate",
  UTIL: "Utilities",
};

const watchSymbols = ["NVDA", "AAPL", "MSFT", "AMZN", "GOOGL", "META", "TSLA", "JPM", "LLY", "AVGO", "XOM", "BRK-B"];
const macro = [
  ["SPX", 6812.44, 0.38],
  ["NDX", 24190.28, 0.74],
  ["DJI", 45642.11, -0.12],
  ["RUS2K", 2346.85, 0.21],
  ["US10Y", 4.38, 0.03],
  ["VIX", 15.62, -2.44],
  ["WTI", 78.41, 1.04],
  ["DXY", 101.88, -0.18],
];

const commandInput = document.querySelector("#commandInput");
const commandForm = document.querySelector("#commandForm");
const mainView = document.querySelector("#mainView");
const watchPanel = document.querySelector("#watchPanel");
const watchToggle = document.querySelector("#watchToggle");
const watchList = document.querySelector("#watchList");
const searchResults = document.querySelector("#searchResults");
const newsFeed = document.querySelector("#newsFeed");
const macroStack = document.querySelector("#macroStack");
const terminalStatus = document.querySelector("#terminalStatus");
const universeCount = document.querySelector("#universeCount");
const newsScope = document.querySelector("#newsScope");
const clock = document.querySelector("#clock");

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seeded(symbol, min, max, precision = 2) {
  const ratio = (hashString(symbol) % 10000) / 10000;
  return Number((min + ratio * (max - min)).toFixed(precision));
}

function formatCurrency(value) {
  return `$${Number(value).toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
}

function formatLarge(value) {
  if (value >= 1_000_000_000_000) return `$${(value / 1_000_000_000_000).toFixed(2)}T`;
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  return value.toLocaleString();
}

function signClass(value) {
  if (value > 0.03) return "up";
  if (value < -0.03) return "down";
  return "flat";
}

function changeLabel(value) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function enrich(row, index) {
  const symbol = row.symbol;
  const base = seeded(`${symbol}:price`, 28, 680);
  const changePct = seeded(`${symbol}:change`, -3.8, 4.4);
  const volume = Math.round(seeded(`${symbol}:volume`, 850000, 82000000, 0));
  const marketCap = Math.round(seeded(`${symbol}:cap`, 9_000_000_000, 3_200_000_000_000, 0));
  const pe = seeded(`${symbol}:pe`, 8, 58);
  const beta = seeded(`${symbol}:beta`, 0.58, 1.84);
  const dividend = seeded(`${symbol}:dividend`, 0, 4.2);
  const margin = seeded(`${symbol}:margin`, 7, 41);
  const revenueGrowth = seeded(`${symbol}:growth`, -4, 28);
  const momentum = seeded(`${symbol}:momentum`, -16, 22);
  const ratingScore = seeded(`${symbol}:rating`, 1.4, 4.9, 1);
  const high = base * (1 + seeded(`${symbol}:high`, 0.08, 0.62));
  const low = base * (1 - seeded(`${symbol}:low`, 0.08, 0.48));
  return {
    ...row,
    index,
    price: base * (1 + changePct / 100),
    previousClose: base,
    changePct,
    volume,
    marketCap,
    pe,
    beta,
    dividend,
    margin,
    revenueGrowth,
    momentum,
    ratingScore,
    week52High: high,
    week52Low: Math.max(1, low),
    shortInterest: seeded(`${symbol}:short`, 0.2, 11),
    debtToEbitda: seeded(`${symbol}:debt`, 0.1, 4.6),
  };
}

function chartPoints(symbol, count = 78) {
  const start = seeded(`${symbol}:start`, 40, 520);
  let current = start;
  const points = [];
  for (let index = 0; index < count; index += 1) {
    const drift = seeded(`${symbol}:${index}:drift`, -1.8, 2.1) / 100;
    const wave = Math.sin((index + seeded(symbol, 0, 15)) / 6) * 0.007;
    current = Math.max(3, current * (1 + drift + wave));
    points.push(Number(current.toFixed(2)));
  }
  return points;
}

function renderLineChart(symbol) {
  const points = chartPoints(symbol);
  const width = 760;
  const height = 280;
  const pad = 16;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const coords = points.map((point, index) => {
    const x = pad + (index / (points.length - 1)) * (width - pad * 2);
    const y = height - pad - ((point - min) / range) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const color = points.at(-1) >= points[0] ? "var(--green)" : "var(--red)";
  return `
    <svg class="chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${symbol} simulated price chart">
      <defs>
        <linearGradient id="fill-${symbol}" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="${points.at(-1) >= points[0] ? "#39d98a" : "#ff5570"}" stop-opacity="0.32" />
          <stop offset="100%" stop-color="${points.at(-1) >= points[0] ? "#39d98a" : "#ff5570"}" stop-opacity="0" />
        </linearGradient>
      </defs>
      ${[0.25, 0.5, 0.75].map((line) => `<line x1="${pad}" y1="${height * line}" x2="${width - pad}" y2="${height * line}" stroke="rgba(255,255,255,.08)" />`).join("")}
      <polygon points="${pad},${height - pad} ${coords.join(" ")} ${width - pad},${height - pad}" fill="url(#fill-${symbol})"></polygon>
      <polyline points="${coords.join(" ")}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></polyline>
    </svg>
  `;
}

function getQuote(symbol) {
  const normalized = symbol.toUpperCase().replace(".", "-");
  return state.quotes.find((item) => item.symbol === normalized || item.displaySymbol === symbol.toUpperCase());
}

function setStatus(primary, secondary = "") {
  terminalStatus.innerHTML = `<span>${primary}</span><span>${secondary}</span>`;
}

function companyNews(quote, count = 5) {
  const subjects = quote ? [quote] : state.quotes.slice(0, 25);
  const templates = [
    (q) => `${q.name} trading desk notes ${q.sector.toLowerCase()} flows as volume runs ${formatLarge(q.volume)} shares.`,
    (q) => `Analyst channel flags ${q.displaySymbol} margin profile at ${q.margin.toFixed(1)}% with valuation debate around ${q.pe.toFixed(1)}x earnings.`,
    (q) => `${q.displaySymbol} options screen shows ${q.shortInterest.toFixed(1)}% short interest and beta of ${q.beta.toFixed(2)}.`,
    (q) => `${q.name} peer basket moves ${changeLabel(q.changePct)} as investors rotate across ${q.industry.toLowerCase()}.`,
    (q) => `Portfolio monitors lift ${q.displaySymbol} risk score after simulated momentum prints ${changeLabel(q.momentum)}.`,
  ];
  return Array.from({ length: count }, (_, index) => {
    const picked = subjects[(index * 7 + (quote?.index || 0)) % subjects.length];
    return {
      time: `${String(8 + index).padStart(2, "0")}:${String((index * 11 + 7) % 60).padStart(2, "0")}`,
      text: templates[index % templates.length](picked),
      tag: picked.displaySymbol,
    };
  });
}

function renderNews(quote = null) {
  newsScope.textContent = quote ? quote.displaySymbol : "market";
  newsFeed.innerHTML = companyNews(quote, 8).map((item) => `
    <article class="news-item">
      <time>${item.time} CT</time>
      <span>${item.tag}</span>
      <p>${item.text}</p>
    </article>
  `).join("");
}

function renderWatchlist() {
  watchList.innerHTML = watchSymbols.map((symbol) => getQuote(symbol)).filter(Boolean).map((quote) => `
    <div class="quote-row" data-symbol="${quote.symbol}">
      <div>
        <span class="ticker">${quote.displaySymbol}</span>
        <span class="name">${quote.name}</span>
      </div>
      <div class="price ${signClass(quote.changePct)}">
        <strong>${formatCurrency(quote.price)}</strong><br />
        <span>${changeLabel(quote.changePct)}</span>
      </div>
    </div>
  `).join("");
}

function setWatchlistOpen(isOpen, persist = true) {
  watchPanel.classList.toggle("collapsed", !isOpen);
  watchToggle.textContent = isOpen ? "Hide" : "Show";
  watchToggle.setAttribute("aria-expanded", String(isOpen));
  if (!persist) return;
  try {
    localStorage.setItem(WATCHLIST_STORAGE_KEY, isOpen ? "true" : "false");
  } catch (_error) {
    // Local storage is optional; the control still works for the current session.
  }
}

function hydrateWatchlistPreference() {
  let saved = "false";
  try {
    saved = localStorage.getItem(WATCHLIST_STORAGE_KEY) || "false";
  } catch (_error) {
    saved = "false";
  }
  setWatchlistOpen(saved === "true", false);
}

function renderSearch(query = "") {
  const q = query.trim().toUpperCase();
  const results = state.quotes
    .filter((item) => !q || item.symbol.includes(q) || item.name.toUpperCase().includes(q) || item.sector.toUpperCase().includes(q))
    .slice(0, 28);
  searchResults.innerHTML = results.map((quote) => `
    <div class="search-row" data-symbol="${quote.symbol}">
      <div>
        <span class="ticker">${quote.displaySymbol}</span>
        <span class="name">${quote.name}</span>
      </div>
      <div class="${signClass(quote.changePct)}">${changeLabel(quote.changePct)}</div>
    </div>
  `).join("");
}

function renderMacro() {
  macroStack.innerHTML = macro.map(([label, value, change]) => `
    <div class="macro-row">
      <div>
        <span class="ticker">${label}</span>
        <span class="name">Cross-asset monitor</span>
      </div>
      <div class="price ${signClass(change)}">
        <strong>${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}</strong><br />
        <span>${changeLabel(change)}</span>
      </div>
    </div>
  `).join("");
}

function renderSecurity(symbol, view = "DES") {
  const quote = getQuote(symbol) || state.quotes[0];
  state.active = quote;
  state.activeView = view;
  setStatus(`${quote.displaySymbol} ${view}`, `${quote.name} | ${quote.sector} | simulated market data`);
  renderNews(quote);
  const sideTitle = view === "FA" ? "Fundamental Analysis" : view === "GP" ? "Graph Profile" : "Security Description";
  mainView.innerHTML = `
    <div class="main-layout">
      <section class="security-hero">
        <div class="security-title">
          <div>
            <h2>${quote.displaySymbol}</h2>
            <p>${quote.name} | ${quote.industry}</p>
          </div>
          <div class="big-price ${signClass(quote.changePct)}">
            <strong>${formatCurrency(quote.price)}</strong>
            <span>${changeLabel(quote.changePct)} today</span>
          </div>
        </div>
        <div class="stats-grid">
          ${stat("Market Cap", formatLarge(quote.marketCap))}
          ${stat("Volume", formatLarge(quote.volume))}
          ${stat("P/E", `${quote.pe.toFixed(1)}x`)}
          ${stat("Beta", quote.beta.toFixed(2))}
          ${stat("52W High", formatCurrency(quote.week52High))}
          ${stat("52W Low", formatCurrency(quote.week52Low))}
          ${stat("Revenue Growth", changeLabel(quote.revenueGrowth))}
          ${stat("Momentum", changeLabel(quote.momentum))}
        </div>
        <div class="chart-card">
          <div class="chart-head">
            <span>${quote.displaySymbol} price action | 1Y simulated</span>
            <span>open ${formatCurrency(quote.previousClose)} | last ${formatCurrency(quote.price)}</span>
          </div>
          ${renderLineChart(quote.symbol)}
        </div>
      </section>
      <aside class="side-stack">
        <div class="data-card">
          <h3>${sideTitle}</h3>
          ${kv("Sector", quote.sector)}
          ${kv("Industry", quote.industry)}
          ${kv("Headquarters", quote.headquarters || "N/A")}
          ${kv("Index Added", quote.dateAdded || "N/A")}
          ${kv("Founded", quote.founded || "N/A")}
        </div>
        <div class="data-card">
          <h3>Risk And Quality</h3>
          ${kv("Operating Margin", `${quote.margin.toFixed(1)}%`)}
          ${kv("Dividend Yield", `${quote.dividend.toFixed(2)}%`)}
          ${kv("Short Interest", `${quote.shortInterest.toFixed(1)}%`)}
          ${kv("Debt / EBITDA", `${quote.debtToEbitda.toFixed(2)}x`)}
          ${kv("Terminal Rating", `${quote.ratingScore.toFixed(1)} / 5`)}
        </div>
        <div class="data-card">
          <h3>Command Stack</h3>
          ${kv("Chart", `${quote.displaySymbol} GP`)}
          ${kv("Financials", `${quote.displaySymbol} FA`)}
          ${kv("News", `${quote.displaySymbol} NEWS`)}
          ${kv("Peers", `SECTOR ${quote.sector.split(" ")[0].toUpperCase()}`)}
        </div>
      </aside>
    </div>
  `;
}

function stat(label, value) {
  return `<div class="stat-card"><span>${label}</span><strong>${value}</strong></div>`;
}

function kv(label, value) {
  return `<div class="kv"><span>${label}</span><strong>${value}</strong></div>`;
}

function renderMarket() {
  setStatus("MARKET", "Index, sector, and factor overview");
  renderNews();
  const sectors = [...new Set(state.quotes.map((item) => item.sector))].map((sector) => {
    const members = state.quotes.filter((item) => item.sector === sector);
    const avg = members.reduce((sum, item) => sum + item.changePct, 0) / members.length;
    return { sector, members, avg };
  }).sort((a, b) => b.avg - a.avg);
  mainView.innerHTML = `
    <div class="market-grid">
      ${macro.map(([label, value, change]) => `
        <div class="data-card">
          <h3>${label}</h3>
          ${kv("Last", value.toLocaleString("en-US", { maximumFractionDigits: 2 }))}
          ${kv("Change", `<span class="${signClass(change)}">${changeLabel(change)}</span>`)}
          ${kv("Session", change >= 0 ? "Risk-on" : "Defensive")}
        </div>
      `).join("")}
      ${sectors.map((item) => `
        <div class="data-card">
          <h3>${item.sector}</h3>
          ${kv("Breadth", `${item.members.filter((m) => m.changePct > 0).length}/${item.members.length} up`)}
          ${kv("Average Move", `<span class="${signClass(item.avg)}">${changeLabel(item.avg)}</span>`)}
          ${kv("Top Ticker", item.members.sort((a, b) => b.changePct - a.changePct)[0].displaySymbol)}
        </div>
      `).join("")}
    </div>
  `;
}

function renderMovers() {
  setStatus("MOVERS", "Top gainers and losers across the bundled S&P 500 universe");
  const gainers = [...state.quotes].sort((a, b) => b.changePct - a.changePct).slice(0, 15);
  const losers = [...state.quotes].sort((a, b) => a.changePct - b.changePct).slice(0, 15);
  renderScreen([...gainers, ...losers], "MOVERS");
}

function renderScreen(rows = null, label = "SCREEN") {
  const data = rows || [...state.quotes]
    .filter((item) => item.pe < 22 && item.revenueGrowth > 3 && item.marketCap > 40_000_000_000)
    .sort((a, b) => b.ratingScore - a.ratingScore)
    .slice(0, 48);
  setStatus(label, `${data.length} securities shown`);
  mainView.innerHTML = `
    <div class="screen-table">
      <div class="screen-row header">
        <span>Ticker</span><span>Name</span><span>Sector</span><span>Last</span><span>Chg</span><span>P/E</span><span>Mkt Cap</span><span>Rating</span>
      </div>
      ${data.map((item) => `
        <div class="screen-row" data-symbol="${item.symbol}">
          <span class="ticker">${item.displaySymbol}</span>
          <span>${item.name}</span>
          <span>${item.sector}</span>
          <span>${formatCurrency(item.price)}</span>
          <span class="${signClass(item.changePct)}">${changeLabel(item.changePct)}</span>
          <span>${item.pe.toFixed(1)}x</span>
          <span>${formatLarge(item.marketCap)}</span>
          <span>${item.ratingScore.toFixed(1)}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function renderHeatmap() {
  setStatus("HEATMAP", "Sector heatmap by average simulated daily return");
  const tiles = [...new Set(state.quotes.map((item) => item.sector))].map((sector) => {
    const members = state.quotes.filter((item) => item.sector === sector);
    const avg = members.reduce((sum, item) => sum + item.changePct, 0) / members.length;
    return { sector, avg, members };
  }).sort((a, b) => b.avg - a.avg);
  mainView.innerHTML = `
    <div class="heatmap">
      ${tiles.map((tile) => `
        <div class="heat-tile ${tile.avg < 0 ? "negative" : ""}">
          <strong>${tile.sector}</strong>
          <span class="${signClass(tile.avg)}">${changeLabel(tile.avg)}</span>
          <span>${tile.members.length} constituents</span>
          <span>leader ${tile.members.sort((a, b) => b.changePct - a.changePct)[0].displaySymbol}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function renderPortfolio() {
  setStatus("PORT", "Model portfolio, allocation, and P/L monitor");
  const holdings = ["NVDA", "MSFT", "JPM", "LLY", "XOM", "COST", "AVGO", "META"].map((symbol, index) => {
    const quote = getQuote(symbol);
    return { quote, shares: [42, 35, 80, 24, 95, 18, 20, 38][index] };
  });
  const total = holdings.reduce((sum, item) => sum + item.quote.price * item.shares, 0);
  const rows = holdings.map((item) => ({
    ...item.quote,
    position: item.quote.price * item.shares,
    shares: item.shares,
    pnl: item.quote.price * item.shares * item.quote.changePct / 100,
  }));
  mainView.innerHTML = `
    <div class="main-layout portfolio-layout">
      <section class="security-hero">
        <div class="security-title">
          <div>
            <h2>PORT</h2>
            <p>Institutional-style model book with simulated live marks</p>
          </div>
          <div class="big-price up">
            <strong>${formatCurrency(total)}</strong>
            <span>${changeLabel(rows.reduce((sum, row) => sum + row.pnl, 0) / total * 100)} today</span>
          </div>
        </div>
        <div class="portfolio-metrics">
          ${stat("Gross Value", formatCurrency(total))}
          ${stat("Daily P/L", formatCurrency(rows.reduce((sum, row) => sum + row.pnl, 0)))}
          ${stat("Avg Beta", (rows.reduce((sum, row) => sum + row.beta, 0) / rows.length).toFixed(2))}
          ${stat("Largest Weight", rows.sort((a, b) => b.position - a.position)[0].displaySymbol)}
        </div>
        <div class="screen-table">
          <div class="screen-row header"><span>Ticker</span><span>Name</span><span>Sector</span><span>Shares</span><span>Price</span><span>Weight</span><span>P/L</span><span>Risk</span></div>
          ${rows.map((row) => `
            <div class="screen-row" data-symbol="${row.symbol}">
              <span class="ticker">${row.displaySymbol}</span><span>${row.name}</span><span>${row.sector}</span><span>${row.shares}</span>
              <span>${formatCurrency(row.price)}</span><span>${(row.position / total * 100).toFixed(1)}%</span>
              <span class="${signClass(row.pnl)}">${formatCurrency(row.pnl)}</span><span>${row.beta.toFixed(2)}</span>
            </div>
          `).join("")}
        </div>
      </section>
    </div>
  `;
}

function renderHelp() {
  setStatus("HELP", "Keyboard-first market workstation commands");
  const commands = [
    ["Security description", "AAPL or AAPL DES"],
    ["Graph profile", "NVDA GP"],
    ["Fundamental analysis", "MSFT FA"],
    ["Company news", "JPM NEWS"],
    ["Market overview", "MARKET"],
    ["Top gainers and losers", "MOVERS"],
    ["Sector heatmap", "HEATMAP"],
    ["Value screen", "SCREEN or SCREEN PE<20"],
    ["Sector screen", "SECTOR TECH or SECTOR HEALTH"],
    ["Portfolio monitor", "PORT"],
  ];
  mainView.innerHTML = `<div class="help-grid">${commands.map(([title, code]) => `<div class="help-card"><h3>${title}</h3><code>${code}</code></div>`).join("")}</div>`;
}

function renderSector(alias) {
  const sector = sectorAliases[alias] || state.quotes.find((item) => item.sector.toUpperCase().includes(alias))?.sector;
  if (!sector) {
    setStatus("SECTOR", `No sector matched ${alias}`);
    renderScreen(state.quotes.slice(0, 30), "SECTOR");
    return;
  }
  const rows = state.quotes.filter((item) => item.sector === sector).sort((a, b) => b.changePct - a.changePct);
  renderScreen(rows, `SECTOR ${sector.toUpperCase()}`);
}

function runCommand(raw) {
  const command = raw.trim().toUpperCase();
  if (!command) return;
  state.commandHistory.unshift(command);
  const parts = command.split(/\s+/);
  const first = parts[0];
  const second = parts[1] || "DES";
  commandInput.value = command;
  renderSearch(first);

  if (["MARKET", "MON", "INDEX"].includes(first)) return renderMarket();
  if (["MOVERS", "MOST"].includes(first)) return renderMovers();
  if (["HEATMAP", "MAP"].includes(first)) return renderHeatmap();
  if (["SCREEN", "SRCH"].includes(first)) return renderScreen();
  if (["PORT", "PORTFOLIO"].includes(first)) return renderPortfolio();
  if (["HELP", "?"].includes(first)) return renderHelp();
  if (first === "SECTOR") return renderSector(second || "");
  if (first === "NEWS") {
    setStatus("NEWS", "Market-wide simulated news wire");
    renderNews();
    mainView.innerHTML = `<div class="market-grid">${companyNews(null, 18).map((item) => `<article class="news-item"><time>${item.time} CT</time><span>${item.tag}</span><p>${item.text}</p></article>`).join("")}</div>`;
    return;
  }

  const quote = getQuote(first);
  if (quote) {
    if (second === "NEWS") {
      renderSecurity(first, "NEWS");
      return;
    }
    renderSecurity(first, ["GP", "FA", "DES"].includes(second) ? second : "DES");
    return;
  }
  setStatus("Command not found", `${command} did not match a security or function`);
  renderHelp();
}

function wireEvents() {
  commandForm.addEventListener("submit", (event) => {
    event.preventDefault();
    runCommand(commandInput.value);
  });

  commandInput.addEventListener("input", () => renderSearch(commandInput.value));

  document.querySelector(".function-bar").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-command]");
    if (button) runCommand(button.dataset.command);
  });

  watchToggle.addEventListener("click", () => {
    setWatchlistOpen(watchPanel.classList.contains("collapsed"));
  });

  document.body.addEventListener("click", (event) => {
    const row = event.target.closest("[data-symbol]");
    if (row) runCommand(`${row.dataset.symbol} DES`);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "/" && document.activeElement !== commandInput) {
      event.preventDefault();
      commandInput.focus();
      commandInput.select();
    }
  });
}

function startClock() {
  const tick = () => {
    clock.textContent = new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short",
    }).format(new Date());
  };
  tick();
  setInterval(tick, 1000);
}

async function init() {
  const response = await fetch("data/sp500.json");
  const data = await response.json();
  state.universe = data.constituents;
  state.quotes = state.universe.map(enrich);
  universeCount.textContent = `${data.count} S&P names`;
  hydrateWatchlistPreference();
  renderWatchlist();
  renderSearch("");
  renderMacro();
  renderNews();
  wireEvents();
  startClock();
  runCommand("NVDA DES");
}

init().catch((error) => {
  setStatus("Load failure", error.message);
  mainView.innerHTML = `<div class="help-grid"><div class="help-card"><h3>Data failed to load</h3><code>${error.message}</code></div></div>`;
});
