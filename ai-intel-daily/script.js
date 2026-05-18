const state = {
  data: null,
  theme: "all",
  sourceGroup: "all",
  query: "",
  mode: "all",
};

const els = {
  generatedAt: document.getElementById("generated-at"),
  itemCount: document.getElementById("item-count"),
  sourceCount: document.getElementById("source-count"),
  topTheme: document.getElementById("top-theme"),
  search: document.getElementById("search-input"),
  themeFilter: document.getElementById("theme-filter"),
  sourceFilter: document.getElementById("source-filter"),
  feedTitle: document.getElementById("feed-title"),
  feedList: document.getElementById("feed-list"),
  themeRadar: document.getElementById("theme-radar"),
  watchlist: document.getElementById("watchlist"),
  sourcePolicy: document.getElementById("source-policy"),
  refresh: document.getElementById("refresh-button"),
  top10: document.getElementById("top10-button"),
};

const prettyTheme = (value) => value.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

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
  "AI infrastructure": 18,
  Cloud: 13,
  "Official labs": 12,
  "Free tech coverage": 9,
  "Web discovery": 8,
  Research: 3,
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
  const response = await fetch(`data/ai-feed.json${cacheBust}`, { cache: force ? "reload" : "default" });
  if (!response.ok) throw new Error(`Feed request failed: ${response.status}`);
  state.data = await response.json();
  buildControls();
  render();
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
  els.themeFilter.value = state.theme;
  els.sourceFilter.value = state.sourceGroup;
}

function filteredItems() {
  const query = state.query.trim().toLowerCase();
  const baseItems = state.mode === "top10" ? rankedMarketItems(state.data.items).slice(0, 10) : state.data.items;
  return baseItems.filter((item) => {
    const matchesTheme = state.theme === "all" || (item.tags || []).includes(state.theme);
    const matchesGroup = state.sourceGroup === "all" || item.sourceGroup === state.sourceGroup;
    const searchable = `${item.title} ${item.summary} ${item.source} ${(item.tags || []).join(" ")} ${(item.watchlist || []).join(" ")}`.toLowerCase();
    const matchesQuery = !query || searchable.includes(query);
    return matchesTheme && matchesGroup && matchesQuery;
  });
}

function render() {
  const data = state.data;
  const items = filteredItems();
  els.generatedAt.textContent = formatDate(data.generatedAt);
  els.itemCount.textContent = data.itemCount;
  els.sourceCount.textContent = data.sourceCount;
  els.topTheme.textContent = data.topThemes?.[0] ? prettyTheme(data.topThemes[0].tag) : "--";
  els.sourcePolicy.textContent = data.sourcePolicy;
  els.feedTitle.textContent = state.mode === "top10" ? "Top 10 AI + stock signals" : "Highest signal updates";
  els.top10.textContent = state.mode === "top10" ? "Show All Updates" : "AI + Stocks Top 10";
  els.top10.classList.toggle("active", state.mode === "top10");
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
  const sourceBonus = GROUP_WEIGHTS[item.sourceGroup] || 5;
  const score = Math.min(100, Math.round(item.signalScore * 0.38 + themeScore + bullish * 6 + bearish * 5 + watchlistBonus + sourceBonus));
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
  };
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
              <div class="watch-head"><strong>${ticker}</strong><span>${count} signals</span></div>
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
              </div>
              <p class="summary">${escapeHtml(item.summary)}</p>
              <div class="tag-row">${(item.tags || []).map((tag) => `<span class="tag">${prettyTheme(tag)}</span>`).join("")}</div>
              <p class="market-read">${escapeHtml(impact.read)}</p>
              <p class="angle">${escapeHtml(item.angle)}</p>
              <div class="watch-row">${(item.watchlist || []).map((ticker) => `<span class="ticker">${ticker}</span>`).join("")}</div>
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

els.refresh.addEventListener("click", () => {
  loadFeed(true).catch(showError);
});

els.top10.addEventListener("click", () => {
  state.mode = state.mode === "top10" ? "all" : "top10";
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
