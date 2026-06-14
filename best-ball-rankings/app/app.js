const state = {
  position: "ALL",
  search: "",
  sort: "overall",
  tiers: false
};

const positionCounts = {};
const data = (window.RANKINGS_DATA?.players || []).map((player, index) => {
  positionCounts[player.position] = (positionCounts[player.position] || 0) + 1;
  return {
    ...player,
    overallRank: index + 1,
    positionRank: positionCounts[player.position]
  };
});

const elements = {
  rankings: document.querySelector("#rankings"),
  searchInput: document.querySelector("#searchInput"),
  visibleCount: document.querySelector("#visibleCount"),
  emptyState: document.querySelector("#emptyState"),
  topRb: document.querySelector("#topRb"),
  topWr: document.querySelector("#topWr"),
  avgRank: document.querySelector("#avgRank"),
  positionButtons: [...document.querySelectorAll("[data-position]")],
  sortButtons: [...document.querySelectorAll("[data-sort]")],
  tierToggle: document.querySelector("#tierToggle")
};

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join("")
    .toUpperCase();
}

function tierFor(rank) {
  if (rank <= 12) return "Tier 1";
  if (rank <= 24) return "Tier 2";
  if (rank <= 48) return "Tier 3";
  if (rank <= 72) return "Tier 4";
  if (rank <= 120) return "Tier 5";
  return "Deep Board";
}

function filteredPlayers() {
  const query = state.search.trim().toLowerCase();
  const shown = data.filter(player => {
    const positionMatch = state.position === "ALL" || player.position === state.position;
    const queryMatch = !query || [player.name, player.team, player.position].join(" ").toLowerCase().includes(query);
    return positionMatch && queryMatch;
  });

  return shown.sort((a, b) => {
    if (state.sort === "position") {
      return a.position.localeCompare(b.position) || a.positionRank - b.positionRank || a.expertRank - b.expertRank;
    }
    return a.expertRank - b.expertRank || a.name.localeCompare(b.name);
  });
}

function photoMarkup(player) {
  if (!player.photoUrl) {
    return `<div class="headshot fallback-photo" aria-hidden="true">${initials(player.name)}</div>`;
  }

  return `<img class="headshot" src="${player.photoUrl}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'), {className: 'headshot fallback-photo', textContent: '${initials(player.name)}'}))">`;
}

function playerMarkup(player) {
  return `
    <article class="player-card">
      <div class="rank-block">
        <span class="overall-rank">${player.overallRank}</span>
        <span class="rank-label">OVR</span>
      </div>
      ${photoMarkup(player)}
      <div class="player-main">
        <div class="player-name">${player.name}</div>
        <div class="player-meta">
          <span class="badge ${player.position.toLowerCase()}">${player.position}${player.positionRank}</span>
          <span>${player.team}</span>
          <span>${tierFor(player.expertRank)}</span>
        </div>
      </div>
      <div class="rank-score">
        <strong>${player.expertRank.toFixed(2)}</strong>
        <span>Rank</span>
      </div>
    </article>
  `;
}

function renderSummary(players) {
  elements.visibleCount.textContent = players.length;
  const topRb = data.find(player => player.position === "RB");
  const topWr = data.find(player => player.position === "WR");
  const avg = players.length
    ? players.reduce((sum, player) => sum + player.expertRank, 0) / players.length
    : 0;

  elements.topRb.textContent = topRb ? `${topRb.name} (${topRb.team})` : "-";
  elements.topWr.textContent = topWr ? `${topWr.name} (${topWr.team})` : "-";
  elements.avgRank.textContent = players.length ? avg.toFixed(1) : "-";
}

function render() {
  const players = filteredPlayers();
  let lastTier = "";
  const parts = [];

  for (const player of players) {
    const tier = tierFor(player.expertRank);
    if (state.tiers && tier !== lastTier) {
      parts.push(`<h2 class="tier-heading">${tier}</h2>`);
      lastTier = tier;
    }
    parts.push(playerMarkup(player));
  }

  elements.rankings.innerHTML = parts.join("");
  elements.emptyState.hidden = players.length > 0;
  renderSummary(players);
}

elements.searchInput.addEventListener("input", event => {
  state.search = event.target.value;
  render();
});

for (const button of elements.positionButtons) {
  button.addEventListener("click", () => {
    state.position = button.dataset.position;
    elements.positionButtons.forEach(item => item.classList.toggle("active", item === button));
    render();
  });
}

for (const button of elements.sortButtons) {
  button.addEventListener("click", () => {
    state.sort = button.dataset.sort;
    elements.sortButtons.forEach(item => item.classList.toggle("active", item === button));
    render();
  });
}

elements.tierToggle.addEventListener("click", () => {
  state.tiers = !state.tiers;
  elements.tierToggle.classList.toggle("active", state.tiers);
  render();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

render();
