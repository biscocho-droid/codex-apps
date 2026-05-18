const state = {
  data: null,
  theme: "all",
  sourceGroup: "all",
  query: "",
  mode: "all",
  ticker: null,
  sourcePreference: "balanced",
  archiveDate: "latest",
  archives: [],
};

const els = {
  generatedAt: document.getElementById("generated-at"),
  itemCount: document.getElementById("item-count"),
  sourceCount: document.getElementById("source-count"),
  topTheme: document.getElementById("top-theme"),
  briefGrid: document.getElementById("brief-grid"),
  search: document.getElementById("search-input"),
  themeFilter: document.getElementById("theme-filter"),
  sourceFilter: document.getElementById("source-filter"),
  sourcePreference: document.getElementById("source-preference"),
  archiveSelect: document.getElementById("archive-select"),
  feedTitle: document.getElementById("feed-title"),
  tickerContext: document.getElementById("ticker-context"),
  feedList: document.getElementById("feed-list"),
  themeRadar: document.getElementById("theme-radar"),
  watchlist: document.getElementById("watchlist"),
  sourcePolicy: document.getElementById("source-policy"),
  sourceTiers: document.getElementById("source-tiers"),
  refresh: document.getElementById("refresh-button"),
  top10: document.getElementById("top10-button"),
  clearTicker: document.getElementById("clear-ticker-button"),
};

const prettyTheme = (value) => value.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const PERSONAL_WATCHLIST = [
  "NVDA",
  "AMD",
  "TSM",
  "AVGO",
  "SMCI",
  "MU",
  "MSFT",
  "GOOGL",
  "AMZN",
  "META",
  "ORCL",
  "CRM",
  "NOW",
  "PLTR",
  "TSLA",
  "QQQ",
  "SMH",
  "XLK",
];

const SOURCE_TIERS = {
  "AI infrastructure": { tier: 1, label: "Tier 1", quality: "Preferred", top10Weight: 20 },
  Cloud: { tier: 1, label: "Tier 1", quality: "Preferred", top10Weight: 16 },
  "Official labs": { tier: 1, label: "Tier 1", quality: "Preferred", top10Weight: 15 },
  "Free tech coverage": { tier: 2, label: "Tier 2", quality: "Market coverage", top10Weight: 10 },
  "Web discovery": { tier: 3, label: "Tier 3", quality: "Discovery", top10Weight: 4 },
  Research: { tier: 4, label: "Tier 4", quality: "Research context", top10Weight: -8 },
};

const MARKET_THEME_WEIGHTS = {
  chips: 28,
  cloud: 23,
  enterprise: 20,
  agents: 18,
  funding: 17,
  policy: 16,
  security: 14,
  robotics: 14,
  models: 12,
  healthcare: 12,
  research: 6,
};

const GROUP_WEIGHTS = {
  "AI infrastructure": SOURCE_TIERS["AI infrastructure"].top10Weight,
  Cloud: SOURCE_TIERS.Cloud.top10Weight,
  "Official labs": SOURCE_TIERS["Official labs"].top10Weight,
  "Free tech coverage": SOURCE_TIERS["Free tech coverage"].top10Weight,
  "Web discovery": SOURCE_TIERS["Web discovery"].top10Weight,
  Research: SOURCE_TIERS.Research.top10Weight,
};

const BULLISH_TERMS = [
  "demand",
  "launch",
  "release",
  "partnership",
  "partner",
  "revenue",
  "growth",
  "adoption",
  "enterprise",
  "customer",
  "contract",
  "wins",
  "funding",
  "raises",
  "chip",
  "gpu",
  "capacity",
  "orders",
  "beats",
  "upgrade",
];

const BEARISH_TERMS = [
  "regulation",
  "lawsuit",
  "ban",
  "probe",
  "investigation",
  "delay",
  "risk",
  "safety",
  "copyright",
  "export control",
  "restriction",
  "outage",
  "competition",
  "margin",
  "cost",
  "cut",
  "warning",
];

function formatDate(value) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function loadFeed(force = false) {
  const cacheBust = force ? `?t=${Date.now()}` : "";
  const feedPath = state.archiveDate === "latest" ? "data/ai-feed.json" : `archive/${state.archiveDate}.json`;
  const response = await fetch(`${feedPath}${cacheBust}`, { cache: force ? "reload" : "default" });
  if (!response.ok) throw new Error(`Feed request failed: ${response.status}`);
  state.data = await response.json();
  await loadArchiveManifest(force);
  buildControls();
  render();
}

async function loadArchiveManifest(force = false) {
  try {
    const cacheBust = force ? `?t=${Date.now()}` : "";
    const response = await fetch(`archive/manifest.json${cacheBust}`, { cache: force ? "reload" : "default" });
    if (!response.ok) return;
    const data = await response.json();
    state.archives = data.archives || [];
  } catch {
    state.archives = [];
  }
}

function buildControls() {
  const themes = [...new Set(state.data.items.flatMap((item) => item.tags || []))].sort();
  const groups = [...new Set(state.data.items.map((item) => item.sourceGroup))].sort();
  els.themeFilter.innerHTML = `<option value="all">All themes</option>${themes
    .map((theme) => `<option value="${escapeHtml(theme)}">${prettyTheme(theme)}</option>`)
    .join("")}`;
  els.sourceFilter.innerHTML = `<option value="all">All sources</option>${groups
    .map((group) => `<option value="${escapeHtml(group)}">${escapeHtml(group)}</option>`)
    .join("")}`;
  els.archiveSelect.innerHTML = `<option value="latest">Latest</option>${state.archives
    .map((archive) => `<option value="${escapeHtml(archive.date)}">${escapeHtml(archive.date)}</option>`)
    .join("")}`;
  els.themeFilter.value = state.theme;
  els.sourceFilter.value = state.sourceGroup;
  els.sourcePreference.value = state.sourcePreference;
  els.archiveSelect.value = state.archiveDate;
}

function filteredItems() {
  const query = state.query.trim().toLowerCase();
  const filterContextItems = state.data.items.filter((item) => {
    const matchesTheme = state.theme === "all" || (item.tags || []).includes(state.theme);
    const matchesGroup = state.sourceGroup === "all" || item.sourceGroup === state.sourceGroup;
    const matchesTicker = !state.ticker || (item.watchlist || []).includes(state.ticker);
    const matchesPreference = sourcePreferenceMatches(item);
    return matchesTheme && matchesGroup && matchesTicker && matchesPreference;
  });
  const baseItems =
    state.mode === "top10" && !state.ticker ? rankedMarketItems(filterContextItems).slice(0, 10) : filterContextItems;
  return baseItems.filter((item) => {
    const searchable = `${item.title} ${item.summary} ${item.source} ${(item.tags || []).join(" ")} ${(item.watchlist || []).join(" ")}`.toLowerCase();
    const matchesQuery = !query || searchable.includes(query);
    return matchesQuery;
  });
}

function sourcePreferenceMatches(item) {
  const tier = SOURCE_TIERS[item.sourceGroup]?.tier || 3;
  if (state.sourcePreference === "preferred") return tier === 1;
  if (state.sourcePreference === "market") return tier <= 2;
  if (state.sourcePreference === "no-research") return item.sourceGroup !== "Research";
  return true;
}

function render() {
  const data = state.data;
  const items = filteredItems();
  els.generatedAt.textContent = formatDate(data.generatedAt);
  els.itemCount.textContent = data.itemCount;
  els.sourceCount.textContent = data.sourceCount;
  els.topTheme.textContent = data.topThemes?.[0] ? prettyTheme(data.topThemes[0].tag) : "--";
  els.sourcePolicy.textContent = data.sourcePolicy;
  renderSourceTiers(data.items);
  els.feedTitle.textContent = state.ticker
    ? `${state.ticker} signal page`
    : state.mode === "top10"
      ? "Top 10 AI + stock signals"
      : "Highest signal updates";
  els.tickerContext.textContent = state.ticker ? tickerSummary(state.ticker, state.data.items) : "";
  els.clearTicker.hidden = !state.ticker;
  els.top10.textContent = state.mode === "top10" ? "Show All Updates" : "AI + Stocks Top 10";
  els.top10.classList.toggle("active", state.mode === "top10");
  renderMorningBrief(data.items);
  renderThemes(data.topThemes || []);
  renderWatchlist(items);
  renderFeed(items);
}

function rankedMarketItems(items) {
  return items
    .map((item) => ({ ...item, marketImpact: marketImpact(item) }))
    .filter((item) => item.watchlist?.length || item.marketImpact.score >= 78)
    .sort((a, b) => b.marketImpact.score - a.marketImpact.score || b.signalScore - a.signalScore);
}

function watchlistMatches(item) {
  return (item.watchlist || []).filter((ticker) => PERSONAL_WATCHLIST.includes(ticker));
}

function countTerms(text, terms) {
  return terms.reduce((count, term) => count + (text.includes(term) ? 1 : 0), 0);
}

function marketImpact(item) {
  const text = `${item.title} ${item.summary} ${item.source}`.toLowerCase();
  const tags = item.tags || [];
  const themeScore = tags.reduce((total, tag) => total + (MARKET_THEME_WEIGHTS[tag] || 0), 0);
  const bullish = countTerms(text, BULLISH_TERMS);
  const bearish = countTerms(text, BEARISH_TERMS);
  const watchlistBonus = Math.min(20, (item.watchlist || []).length * 3);
  const personalWatchlistBonus = Math.min(18, watchlistMatches(item).length * 4);
  const sourceBonus = GROUP_WEIGHTS[item.sourceGroup] || 5;
  const score = Math.min(
    100,
    Math.round(item.signalScore * 0.34 + themeScore + bullish * 6 + bearish * 5 + watchlistBonus + personalWatchlistBonus + sourceBonus),
  );
  let direction = "mixed";
  let label = "Mixed / Watch";
  if (bullish >= bearish + 1 && !tags.includes("policy") && !text.includes("risk")) {
    direction = "bullish";
    label = "Likely Bullish";
  } else if (bearish >= bullish + 1 || tags.includes("policy")) {
    direction = "bearish";
    label = "Bearish Risk";
  }
  return {
    score,
    direction,
    label,
    read: marketRead(item, direction),
    horizon: impactHorizon(item),
  };
}

function sourceTier(item) {
  return SOURCE_TIERS[item.sourceGroup] || { tier: 3, label: "Tier 3", quality: "Discovery", top10Weight: 4 };
}

function impactHorizon(item) {
  const text = `${item.title} ${item.summary}`.toLowerCase();
  if (["earnings", "revenue", "guidance", "contract", "customer", "regulation", "lawsuit", "ban", "chip", "gpu", "capacity"].some((term) => text.includes(term))) {
    return "Immediate";
  }
  if (["launch", "release", "partnership", "funding", "raises", "adoption", "enterprise", "agent"].some((term) => text.includes(term))) {
    return "Near-term";
  }
  return "Long-term";
}

function marketRead(item, direction) {
  const tickers = (item.watchlist || []).slice(0, 5).join(", ") || "mapped AI baskets";
  const tags = item.tags || [];
  if (direction === "bullish") {
    return `Potential upside read for ${tickers}: this looks tied to AI demand, product adoption, or infrastructure spend.`;
  }
  if (direction === "bearish") {
    return `Risk read for ${tickers}: this could pressure sentiment through regulation, competition, costs, or execution concerns.`;
  }
  if (tags.includes("research")) {
    return `Watchlist read for ${tickers}: research signal first; market impact depends on whether it converts into products, compute demand, or platform advantage.`;
  }
  return `Mixed read for ${tickers}: relevant to AI exposure, but direction needs confirmation from follow-up coverage or price reaction.`;
}

function renderThemes(themes) {
  const max = Math.max(1, ...themes.map((theme) => theme.count));
  els.themeRadar.innerHTML = themes
    .map(
      (theme) => `
        <div class="radar-row">
          <div class="radar-head">
            <strong>${prettyTheme(theme.tag)}</strong>
            <span>${theme.count}</span>
          </div>
          <div class="bar"><span style="width: ${(theme.count / max) * 100}%"></span></div>
          <div class="watch-row">${(theme.tickers || []).map((ticker) => `<span class="ticker">${ticker}</span>`).join("")}</div>
        </div>
      `,
    )
    .join("");
}

function renderMorningBrief(items) {
  const ranked = rankedMarketItems(items);
  const bullish = ranked.find((item) => item.marketImpact.direction === "bullish") || ranked[0];
  const bearish = ranked.find((item) => item.marketImpact.direction === "bearish") || ranked.find((item) => item.marketImpact.direction === "mixed") || ranked[1];
  const tickerCounts = tickerLeaders(ranked, 5);
  const themeCounts = themeLeaders(ranked, 4);
  const topStory = ranked[0];
  els.briefGrid.innerHTML = [
    briefCard("Top market story", topStory?.title || "No story available", topStory ? `${topStory.marketImpact.label} for ${(topStory.watchlist || []).slice(0, 4).join(", ") || "AI watchlists"}.` : ""),
    briefCard("Bullish signal", bullish?.title || "No bullish story found", bullish ? bullish.marketImpact.read : ""),
    briefCard("Risk watch", bearish?.title || "No risk story found", bearish ? bearish.marketImpact.read : ""),
    briefCard(
      "Names to watch",
      tickerCounts.map(([ticker]) => ticker).join(", ") || "No mapped names",
      `Themes: ${themeCounts.map(([theme]) => prettyTheme(theme)).join(", ") || "No theme cluster"}.`,
    ),
  ].join("");
}

function renderSourceTiers(items) {
  const counts = new Map();
  for (const item of items) {
    const tier = sourceTier(item);
    const key = `${tier.label}: ${tier.quality}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  els.sourceTiers.innerHTML = [...counts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([label, count]) => `<div class="tier-row"><strong>${escapeHtml(label)}</strong><span>${count} items</span></div>`)
    .join("");
}

function briefCard(label, title, body) {
  return `
    <article class="brief-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(body)}</p>
    </article>
  `;
}

function tickerLeaders(items, limit = 12) {
  const counts = new Map();
  for (const item of items) {
    for (const ticker of item.watchlist || []) counts.set(ticker, (counts.get(ticker) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit);
}

function themeLeaders(items, limit = 6) {
  const counts = new Map();
  for (const item of items) {
    for (const tag of item.tags || []) counts.set(tag, (counts.get(tag) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit);
}

function tickerSummary(ticker, items) {
  const tickerItems = rankedMarketItems(items).filter((item) => (item.watchlist || []).includes(ticker));
  const bullish = tickerItems.filter((item) => item.marketImpact.direction === "bullish").length;
  const bearish = tickerItems.filter((item) => item.marketImpact.direction === "bearish").length;
  const mixed = tickerItems.filter((item) => item.marketImpact.direction === "mixed").length;
  return `${tickerItems.length} related signals. ${bullish} bullish, ${bearish} bearish risk, ${mixed} mixed/watch.`;
}

function renderWatchlist(items) {
  const counts = new Map();
  for (const item of items) {
    for (const ticker of item.watchlist || []) {
      counts.set(ticker, (counts.get(ticker) || 0) + 1);
    }
  }
  const leaders = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  els.watchlist.innerHTML = leaders.length
    ? leaders
        .map(
          ([ticker, count]) => `
            <div class="watch-row-item">
              <div class="watch-head">
                <button class="ticker ticker-button" type="button" data-ticker="${ticker}">${ticker}</button>
                <span>${count} signals</span>
              </div>
            </div>
          `,
        )
        .join("")
    : `<div class="empty-state">No matching watchlist names.</div>`;
}

function renderFeed(items) {
  els.feedList.innerHTML = items.length
    ? items
        .map((item, index) => {
          const impact = item.marketImpact || marketImpact(item);
          const rank = state.mode === "top10" ? `<span class="rank">#${index + 1}</span>` : "";
          return `
            <article class="feed-card">
              <header>
                <h3><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a></h3>
                <div class="rank-stack">
                  ${rank}
                  <span class="score">${state.mode === "top10" ? impact.score : item.signalScore}</span>
                </div>
              </header>
              <div class="meta-row">
                <span>${escapeHtml(item.source)}</span>
                <span>${escapeHtml(item.sourceGroup)}</span>
                <span>${formatDate(item.publishedAt)}</span>
              </div>
              <div class="impact-row">
                <span class="impact-badge ${impact.direction}">${impact.label}</span>
                <span class="market-score">Market relevance ${impact.score}/100</span>
                <span class="horizon-chip">${impact.horizon}</span>
              </div>
              <p class="summary">${escapeHtml(item.summary)}</p>
              <div class="tag-row">${(item.tags || []).map((tag) => `<span class="tag">${prettyTheme(tag)}</span>`).join("")}</div>
              <p class="market-read">${escapeHtml(impact.read)}</p>
              <p class="angle">${escapeHtml(item.angle)}</p>
              <div class="watch-row">${(item.watchlist || []).map((ticker) => `<button class="ticker ticker-button" type="button" data-ticker="${ticker}">${ticker}</button>`).join("")}</div>
            </article>
          `;
        })
        .join("")
    : `<div class="empty-state">No items match the current filters.</div>`;
}

els.search.addEventListener("input", (event) => {
  state.query = event.target.value;
  render();
});

els.themeFilter.addEventListener("change", (event) => {
  state.theme = event.target.value;
  render();
});

els.sourceFilter.addEventListener("change", (event) => {
  state.sourceGroup = event.target.value;
  render();
});

els.sourcePreference.addEventListener("change", (event) => {
  state.sourcePreference = event.target.value;
  render();
});

els.archiveSelect.addEventListener("change", (event) => {
  state.archiveDate = event.target.value;
  state.ticker = null;
  state.mode = "all";
  loadFeed(true).catch(showError);
});

document.addEventListener("click", (event) => {
  const tickerButton = event.target.closest(".ticker-button");
  if (!tickerButton) return;
  state.ticker = tickerButton.dataset.ticker;
  state.mode = "all";
  window.scrollTo({ top: 0, behavior: "smooth" });
  render();
});

els.refresh.addEventListener("click", () => {
  loadFeed(true).catch(showError);
});

els.top10.addEventListener("click", () => {
  state.mode = state.mode === "top10" ? "all" : "top10";
  state.ticker = null;
  render();
});

els.clearTicker.addEventListener("click", () => {
  state.ticker = null;
  render();
});

function showError(error) {
  els.generatedAt.textContent = "Feed unavailable";
  els.feedList.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}. Run the feed generator locally to create data/ai-feed.json.</div>`;
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

loadFeed().catch(showError);
