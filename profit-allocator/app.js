const COLORS = ["#19714d", "#2869a8", "#c08a2f", "#b94d43", "#6e5bbd", "#207f7a", "#5f6b7a", "#d26c3e"];

function uid() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `bucket-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function defaultState() {
  return {
    total: 2750,
    buckets: [
      { id: uid(), name: "Investing", amount: 1000, color: COLORS[0] },
      { id: uid(), name: "Savings", amount: 500, color: COLORS[1] },
      { id: uid(), name: "Flights", amount: 200, color: COLORS[2] },
      { id: uid(), name: "Taxes", amount: 400, color: COLORS[3] },
      { id: uid(), name: "Fun / Lifestyle", amount: 250, color: COLORS[4] },
    ],
  };
}

const PRESETS = {
  balanced: [
    ["Investing", 900],
    ["Savings", 650],
    ["Flights", 250],
    ["Taxes", 450],
    ["Fun / Lifestyle", 250],
  ],
  growth: [
    ["Investing", 1400],
    ["Savings", 450],
    ["Flights", 200],
    ["Taxes", 450],
    ["Fun / Lifestyle", 150],
  ],
  cash: [
    ["Investing", 600],
    ["Savings", 1100],
    ["Flights", 200],
    ["Taxes", 450],
    ["Fun / Lifestyle", 150],
  ],
};

const STORE_KEY = "profitAllocator.v1";
let state = loadState();

const els = {
  totalProfit: document.getElementById("totalProfit"),
  allocatedTotal: document.getElementById("allocatedTotal"),
  allocatedPercent: document.getElementById("allocatedPercent"),
  remainingTotal: document.getElementById("remainingTotal"),
  remainingNote: document.getElementById("remainingNote"),
  allocationCount: document.getElementById("allocationCount"),
  donutRemaining: document.getElementById("donutRemaining"),
  list: document.getElementById("allocationList"),
  legend: document.getElementById("legend"),
  insights: document.getElementById("insights"),
  donut: document.getElementById("donutChart"),
  bar: document.getElementById("barChart"),
  template: document.getElementById("bucketTemplate"),
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY));
    if (saved?.buckets?.length) {
      return {
        total: Number(saved.total) || 2750,
        buckets: saved.buckets.map((bucket, index) => ({
          id: bucket.id || uid(),
          name: bucket.name || `Bucket ${index + 1}`,
          amount: Number(bucket.amount) || 0,
          color: bucket.color || COLORS[index % COLORS.length],
        })),
      };
    }
  } catch {
    localStorage.removeItem(STORE_KEY);
  }
  return defaultState();
}

function saveState() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

function money(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value % 1 ? 2 : 0,
  }).format(value);
}

function parseAmount(value) {
  return Math.max(0, Number(String(value).replace(/[^0-9.]/g, "")) || 0);
}

function allocated() {
  return state.buckets.reduce((sum, bucket) => sum + bucket.amount, 0);
}

function remaining() {
  return state.total - allocated();
}

function percent(value) {
  if (!state.total) return "0%";
  return `${Math.round((value / state.total) * 100)}%`;
}

function setupControls() {
  els.totalProfit.addEventListener("input", (event) => {
    state.total = parseAmount(event.target.value);
    saveState();
    renderLiveEdit();
  });
  els.totalProfit.addEventListener("blur", () => render({ buckets: false }));
  els.totalProfit.addEventListener("change", () => render({ buckets: false }));

  document.getElementById("resetBtn").addEventListener("click", () => {
    localStorage.removeItem(STORE_KEY);
    state = defaultState();
    render();
  });

  document.getElementById("addBucketBtn").addEventListener("click", () => {
    const index = state.buckets.length;
    state.buckets.push({
      id: uid(),
      name: `Bucket ${index + 1}`,
      amount: 0,
      color: COLORS[index % COLORS.length],
    });
    saveState();
    render();
  });

  document.querySelectorAll("[data-total]").forEach((button) => {
    button.addEventListener("click", () => {
      state.total = Number(button.dataset.total);
      saveState();
      render();
    });
  });

  document.querySelectorAll("[data-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      const preset = PRESETS[button.dataset.preset];
      state.buckets = preset.map(([name, amount], index) => ({
        id: uid(),
        name,
        amount,
        color: COLORS[index % COLORS.length],
      }));
      saveState();
      render();
    });
  });
}

function render(options = {}) {
  const { buckets = true } = options;
  const totalAllocated = allocated();
  const left = remaining();
  if (document.activeElement !== els.totalProfit) {
    els.totalProfit.value = state.total;
  }
  els.allocatedTotal.textContent = money(totalAllocated);
  els.allocatedPercent.textContent = `${percent(totalAllocated)} of flex cash`;
  els.remainingTotal.textContent = money(left);
  els.remainingTotal.classList.toggle("over", left < 0);
  els.remainingNote.textContent = left < 0 ? "Overallocated" : "Available to route";
  els.allocationCount.textContent = `${state.buckets.length} bucket${state.buckets.length === 1 ? "" : "s"}`;
  els.donutRemaining.textContent = money(left);

  if (buckets) {
    renderBuckets();
  } else {
    updateVisibleBucketRows();
  }
  renderLegend();
  renderInsights();
  drawDonut();
  drawBars();
}

function renderLiveEdit() {
  const totalAllocated = allocated();
  const left = remaining();
  els.allocatedTotal.textContent = money(totalAllocated);
  els.allocatedPercent.textContent = `${percent(totalAllocated)} of flex cash`;
  els.remainingTotal.textContent = money(left);
  els.remainingTotal.classList.toggle("over", left < 0);
  els.remainingNote.textContent = left < 0 ? "Overallocated" : "Available to route";
  els.allocationCount.textContent = `${state.buckets.length} bucket${state.buckets.length === 1 ? "" : "s"}`;
  els.donutRemaining.textContent = money(left);
  updateVisibleBucketRows();
}

function renderBuckets() {
  els.list.innerHTML = "";
  state.buckets.forEach((bucket) => {
    const row = els.template.content.firstElementChild.cloneNode(true);
    row.style.setProperty("--swatch", bucket.color);
    const name = row.querySelector(".bucket-name");
    const amount = row.querySelector(".bucket-amount");
    const range = row.querySelector(".bucket-range");
    const percentEl = row.querySelector(".bucket-percent");
    const swatch = row.querySelector(".swatch");

    name.value = bucket.name;
    amount.value = bucket.amount;
    range.max = Math.max(state.total, allocated(), 1000);
    range.value = bucket.amount;
    percentEl.textContent = percent(bucket.amount);

    name.addEventListener("input", (event) => updateBucketLive(bucket.id, { name: event.target.value }));
    name.addEventListener("blur", () => render({ buckets: false }));
    name.addEventListener("change", () => render({ buckets: false }));
    amount.addEventListener("input", (event) => updateBucketLive(bucket.id, { amount: parseAmount(event.target.value) }));
    amount.addEventListener("blur", () => render({ buckets: false }));
    amount.addEventListener("change", () => render({ buckets: false }));
    range.addEventListener("input", (event) => updateBucket(bucket.id, { amount: Number(event.target.value) || 0 }, { buckets: false }));
    row.querySelector(".remove-btn").addEventListener("click", () => removeBucket(bucket.id));
    swatch.addEventListener("click", () => cycleColor(bucket.id));

    els.list.appendChild(row);
  });
}

function updateBucket(id, patch, renderOptions = {}) {
  state.buckets = state.buckets.map((bucket) => (bucket.id === id ? { ...bucket, ...patch } : bucket));
  saveState();
  render(renderOptions);
}

function updateBucketLive(id, patch) {
  state.buckets = state.buckets.map((bucket) => (bucket.id === id ? { ...bucket, ...patch } : bucket));
  saveState();
  renderLiveEdit();
}

function updateVisibleBucketRows() {
  els.list.querySelectorAll(".bucket-row").forEach((row, index) => {
    const bucket = state.buckets[index];
    if (!bucket) return;
    const name = row.querySelector(".bucket-name");
    const amount = row.querySelector(".bucket-amount");
    const range = row.querySelector(".bucket-range");
    const percentEl = row.querySelector(".bucket-percent");

    row.style.setProperty("--swatch", bucket.color);
    if (document.activeElement !== name) {
      name.value = bucket.name;
    }
    if (document.activeElement !== amount) {
      amount.value = bucket.amount;
    }
    if (document.activeElement !== range) {
      range.value = bucket.amount;
    }
    range.max = Math.max(state.total, allocated(), 1000);
    percentEl.textContent = percent(bucket.amount);
  });
}

function removeBucket(id) {
  state.buckets = state.buckets.filter((bucket) => bucket.id !== id);
  saveState();
  render();
}

function cycleColor(id) {
  state.buckets = state.buckets.map((bucket) => {
    if (bucket.id !== id) return bucket;
    const next = (COLORS.indexOf(bucket.color) + 1) % COLORS.length;
    return { ...bucket, color: COLORS[next] };
  });
  saveState();
  render();
}

function renderLegend() {
  const total = Math.max(state.total, allocated());
  els.legend.innerHTML = [...state.buckets, { name: "Unassigned", amount: Math.max(0, remaining()), color: "#9ba7a3" }]
    .filter((bucket) => bucket.amount > 0 || bucket.name !== "Unassigned")
    .map((bucket) => {
      const share = total ? Math.round((bucket.amount / total) * 100) : 0;
      return `
        <div class="legend-item">
          <span class="legend-label"><i class="legend-dot" style="--dot:${bucket.color}"></i>${bucket.name}</span>
          <strong>${money(bucket.amount)} · ${share}%</strong>
        </div>
      `;
    })
    .join("");
}

function renderInsights() {
  const totalAllocated = allocated();
  const left = remaining();
  const largest = [...state.buckets].sort((a, b) => b.amount - a.amount)[0];
  const investment = state.buckets.find((bucket) => /invest/i.test(bucket.name));
  const savings = state.buckets.find((bucket) => /saving|emergency|cash/i.test(bucket.name));

  const notes = [
    ["Allocation status", left < 0 ? `${money(Math.abs(left))} above your monthly leftover cash` : `${money(left)} still free to assign`],
    ["Largest bucket", largest ? `${largest.name} at ${money(largest.amount)}` : "No buckets yet"],
    ["Investing pace", investment ? `${percent(investment.amount)} routed to investing` : "Add an investing bucket"],
    ["Cash cushion", savings ? `${percent(savings.amount)} routed to savings` : "Add a savings bucket"],
  ];

  els.insights.innerHTML = notes
    .map(([label, value]) => `<div class="insight"><span>${label}</span><strong>${value}</strong></div>`)
    .join("");
}

function drawDonut() {
  const canvas = els.donut;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = 260 * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, rect.width, 260);

  const cx = rect.width / 2;
  const cy = 128;
  const radius = Math.min(100, rect.width * 0.32);
  const width = 24;
  const segments = [...state.buckets.map((bucket) => ({ ...bucket })), { name: "Unassigned", amount: Math.max(0, remaining()), color: "#c2cbc7" }].filter(
    (bucket) => bucket.amount > 0,
  );
  const total = segments.reduce((sum, item) => sum + item.amount, 0) || 1;
  let start = -Math.PI / 2;

  ctx.lineWidth = width;
  ctx.lineCap = "butt";
  segments.forEach((segment) => {
    const angle = (segment.amount / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.strokeStyle = segment.color;
    ctx.arc(cx, cy, radius, start, start + angle);
    ctx.stroke();
    start += angle;
  });
}

function drawBars() {
  const canvas = els.bar;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const height = 300;
  canvas.width = rect.width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, rect.width, height);

  const max = Math.max(...state.buckets.map((bucket) => bucket.amount), state.total, 1);
  const barHeight = 28;
  const gap = 18;
  const leftPad = 104;
  const top = 28;
  const width = Math.max(40, rect.width - leftPad - 24);

  ctx.font = "700 13px system-ui, sans-serif";
  ctx.textBaseline = "middle";
  state.buckets.forEach((bucket, index) => {
    const y = top + index * (barHeight + gap);
    const barWidth = Math.max(2, (bucket.amount / max) * width);
    ctx.fillStyle = "#66736f";
    ctx.textAlign = "right";
    ctx.fillText(bucket.name.slice(0, 13), leftPad - 12, y + barHeight / 2);
    ctx.fillStyle = "#e5ebe8";
    ctx.fillRect(leftPad, y, width, barHeight);
    ctx.fillStyle = bucket.color;
    ctx.fillRect(leftPad, y, barWidth, barHeight);
    ctx.fillStyle = "#111820";
    ctx.textAlign = "left";
    ctx.fillText(money(bucket.amount), leftPad + Math.min(barWidth + 8, width - 70), y + barHeight / 2);
  });
}

window.addEventListener("resize", () => render());
setupControls();
render();
