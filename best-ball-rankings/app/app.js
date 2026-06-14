const state = {
  positions: new Set(),
  search: "",
  sort: "overall"
};

const positionOrder = ["QB", "RB", "WR", "TE", "K", "DEF"];
const positions = [...new Set((window.RANKINGS_DATA?.players || []).map(player => player.position))]
  .sort((a, b) => {
    const aIndex = positionOrder.indexOf(a);
    const bIndex = positionOrder.indexOf(b);
    return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex) || a.localeCompare(b);
  });

state.positions = new Set(positions);

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
  positionFilters: document.querySelector("#positionFilters"),
  positionsShown: document.querySelector("#positionsShown"),
  topPlayer: document.querySelector("#topPlayer"),
  avgRank: document.querySelector("#avgRank"),
  sortButtons: [...document.querySelectorAll("[data-sort]")]
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
    const positionMatch = state.positions.has(player.position);
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
  const topPlayer = players[0];
  const allSelected = state.positions.size === positions.length;
  const positionText = allSelected ? "All" : positions.filter(position => state.positions.has(position)).join(" + ");
  const avg = players.length
    ? players.reduce((sum, player) => sum + player.expertRank, 0) / players.length
    : 0;

  elements.positionsShown.textContent = positionText || "-";
  elements.topPlayer.textContent = topPlayer ? `${topPlayer.name} (${topPlayer.team})` : "-";
  elements.avgRank.textContent = players.length ? avg.toFixed(1) : "-";
}

function renderPositionFilters() {
  const allSelected = state.positions.size === positions.length;
  const buttons = [
    `<button class="${allSelected ? "active" : ""}" type="button" data-position="ALL" aria-pressed="${allSelected}">All</button>`,
    ...positions.map(position => {
      const active = state.positions.has(position);
      return `<button class="${active ? "active" : ""}" type="button" data-position="${position}" aria-pressed="${active}">${position}</button>`;
    })
  ];

  elements.positionFilters.innerHTML = buttons.join("");
}

function render() {
  const players = filteredPlayers();
  let lastTier = "";
  const parts = [];

  for (const player of players) {
    const tier = tierFor(player.expertRank);
    if (tier !== lastTier) {
      parts.push(`<h2 class="tier-heading">${tier}</h2>`);
      lastTier = tier;
    }
    parts.push(playerMarkup(player));
  }

  elements.rankings.innerHTML = parts.join("");
  elements.emptyState.hidden = players.length > 0;
  renderPositionFilters();
  renderSummary(players);
}

elements.searchInput.addEventListener("input", event => {
  state.search = event.target.value;
  render();
});

elements.positionFilters.addEventListener("click", event => {
  const button = event.target.closest("[data-position]");
  if (!button) return;

  const position = button.dataset.position;
  if (position === "ALL") {
    state.positions = new Set(positions);
  } else if (state.positions.size === positions.length) {
    state.positions = new Set([position]);
  } else if (state.positions.has(position)) {
    state.positions.delete(position);
    if (state.positions.size === 0) state.positions.add(position);
  } else {
    state.positions.add(position);
  }

  render();
});

for (const button of elements.sortButtons) {
  button.addEventListener("click", () => {
    state.sort = button.dataset.sort;
    elements.sortButtons.forEach(item => item.classList.toggle("active", item === button));
    render();
  });
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

render();
