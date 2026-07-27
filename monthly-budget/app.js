const BASE_DATA = {
  months: ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"],
  takeHome: 4808,
  bills: [
    { name: "Rent", category: "Home", day: 1, amount: 1641 },
    { name: "Rental Insurance", category: "Home", day: 2, amount: 15 },
    { name: "Electricity", category: "Home", day: 8, amount: 65 },
    { name: "Phone", category: "Home", day: 10, amount: 50 },
    { name: "Internet", category: "Home", day: 12, amount: 60 },
    { name: "Car Payment", category: "Savings", day: 15, amount: 500 },
    { name: "Auto Insurance", category: "Transportation", day: 16, amount: 111 },
    { name: "Spotify", category: "Entertainment", day: 18, amount: 12 },
    { name: "Amazon Prime", category: "Entertainment", day: 20, amount: 16 },
    { name: "Netflix", category: "Entertainment", day: 22, amount: 7 },
    { name: "Food/Litter", category: "Health / Luna", day: 24, amount: 60 },
    { name: "TradingView", category: "Misc", day: 26, amount: 10 },
  ],
  goals: [
    { id: "emergency", name: "Emergency Fund", target: 5000, current: 1200, monthly: 300 },
    { id: "investing", name: "Investing Cash", target: 3000, current: 500, monthly: 150 },
    { id: "travel", name: "Travel / Fun Fund", target: 1500, current: 250, monthly: 75 },
  ],
  categories: [
    cat("Savings", "#1f8a5b", [
      line("Trading Money", empty()),
      line("Retirement (401K)", empty()),
      line("Tax Withheld", empty()),
      line("Car Payment", [500, 500, 500, 500, 0, 0, 0, 0, 0, 0, 0, 0]),
    ]),
    cat("Home", "#3366cc", [
      line("Rent", filled(1641)),
      line("Rental Insurance", filled(15)),
      line("Electricity", filled(65)),
      line("Phone", filled(50)),
      line("Webull", filled(3)),
      line("Internet", filled(60)),
      line("Gym", filled(30)),
      line("Gym Yr Fee", filled(4)),
      line("Microsoft Storage", filled(2)),
      line("Water", filled(16)),
      line("Trash/sewer/pest", filled(45)),
    ]),
    cat("Transportation", "#bd862c", [
      line("Gas", filled(100)),
      line("Auto Insurance", filled(111)),
      line("Car Wash", filled(27)),
      line("Oil Change", filled(10)),
    ]),
    cat("Daily Living", "#1f7974", [line("Groceries", filled(280)), line("Higene", filled(25)), line("Barber", filled(75))]),
    cat("Entertainment", "#6d5bd0", [line("Spotify", filled(12)), line("Amazon Prime", filled(16)), line("HBO", filled(10)), line("Netflix", filled(7))]),
    cat("Health / Luna", "#c75243", [line("Health Insurance", empty()), line("Dental", empty()), line("Vision", empty()), line("Food/Litter", filled(60)), line("Toys/Prime Hyd", filled(20))]),
    cat("Misc", "#5b6778", [line("Random", empty()), line("Accommodations", empty()), line("Food", empty()), line("Trading", empty()), line("User intellect", filled(10)), line("TradingView", filled(10))]),
  ],
};

const state = {
  month: 0,
  view: localStorage.getItem("financeOS.view") || "overview",
  theme: localStorage.getItem("financeOS.theme") || "orbital",
  edits: JSON.parse(localStorage.getItem("financeOS.edits") || "{}"),
  goals: JSON.parse(localStorage.getItem("financeOS.goals") || "{}"),
  income: Number(localStorage.getItem("financeOS.income") || BASE_DATA.takeHome),
  paycheckAssignments: JSON.parse(localStorage.getItem("financeOS.paycheckAssignments") || "{}"),
  paycheckEditMode: false,
};

function empty() {
  return Array(12).fill(0);
}

function filled(value) {
  return [value, value, value, value, 0, 0, 0, 0, 0, 0, 0, 0];
}

function cat(name, color, lines) {
  return { name, color, lines };
}

function line(name, values) {
  return { name, values };
}

function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: value % 1 ? 2 : 0 }).format(value);
}

function takeHome() {
  return state.income || BASE_DATA.takeHome;
}

function valueFor(categoryIndex, lineIndex, monthIndex = state.month) {
  const key = `${monthIndex}:${categoryIndex}:${lineIndex}`;
  return state.edits[key] ?? BASE_DATA.categories[categoryIndex].lines[lineIndex].values[monthIndex] ?? 0;
}

function setValue(categoryIndex, lineIndex, value) {
  const key = `${state.month}:${categoryIndex}:${lineIndex}`;
  state.edits[key] = Number(value) || 0;
  localStorage.setItem("financeOS.edits", JSON.stringify(state.edits));
}

function categoryTotal(categoryIndex, monthIndex = state.month) {
  return BASE_DATA.categories[categoryIndex].lines.reduce((sum, _, lineIndex) => sum + valueFor(categoryIndex, lineIndex, monthIndex), 0);
}

function spending(monthIndex = state.month) {
  return BASE_DATA.categories.reduce((sum, _, categoryIndex) => sum + categoryTotal(categoryIndex, monthIndex), 0);
}

function categoryNamesTotal(names, monthIndex = state.month) {
  return BASE_DATA.categories.reduce((sum, category, index) => (names.includes(category.name) ? sum + categoryTotal(index, monthIndex) : sum), 0);
}

function allocationSummary() {
  const bills = categoryNamesTotal(["Home", "Transportation", "Entertainment", "Health / Luna", "Misc"]);
  const goals = categoryTotal(0);
  const living = categoryNamesTotal(["Daily Living"]);
  const net = takeHome() - bills - living - goals;
  return { bills, goals, living, net };
}

function cashLeft(monthIndex = state.month) {
  return takeHome() - spending(monthIndex);
}

function budgetScore(monthIndex = state.month) {
  const left = cashLeft(monthIndex);
  const savings = categoryTotal(0, monthIndex);
  return Math.max(0, Math.min(100, Math.round((left / takeHome()) * 72 + (savings / takeHome()) * 28 + 28)));
}

function goalValue(goal, field) {
  return state.goals[goal.id]?.[field] ?? goal[field];
}

function setGoalValue(goalId, field, value) {
  state.goals[goalId] = { ...(state.goals[goalId] || {}), [field]: Number(value) || 0 };
  localStorage.setItem("financeOS.goals", JSON.stringify(state.goals));
}

function paycheckItems() {
  return [
    { id: "rent", label: "Rent", detail: "Home", amount: valueFor(1, 0), defaultPaycheck: 1 },
    { id: "rental-insurance", label: "Rental Insurance", detail: "Home", amount: valueFor(1, 1), defaultPaycheck: 1 },
    { id: "electricity", label: "Electricity", detail: "Home", amount: valueFor(1, 2), defaultPaycheck: 1 },
    { id: "phone", label: "Phone", detail: "Home", amount: valueFor(1, 3), defaultPaycheck: 1 },
    { id: "internet", label: "Internet", detail: "Home", amount: valueFor(1, 5), defaultPaycheck: 1 },
    { id: "water-trash", label: "Water / Trash", detail: "Home", amount: valueFor(1, 9) + valueFor(1, 10), defaultPaycheck: 1 },
    { id: "car-payment", label: "Car Payment", detail: "Savings", amount: valueFor(0, 3), defaultPaycheck: 2 },
    { id: "transportation", label: "Transportation", detail: "Gas, insurance, wash, oil", amount: categoryTotal(2), defaultPaycheck: 2 },
    { id: "daily-living", label: "Daily Living", detail: "Groceries, hygiene, barber", amount: categoryTotal(3), defaultPaycheck: 2 },
    { id: "entertainment", label: "Entertainment", detail: "Streaming / subscriptions", amount: categoryTotal(4), defaultPaycheck: 2 },
    { id: "health-luna", label: "Health / Luna", detail: "Pet and health items", amount: categoryTotal(5), defaultPaycheck: 2 },
    { id: "misc", label: "Misc", detail: "Learning / trading tools", amount: categoryTotal(6), defaultPaycheck: 2 },
  ];
}

function assignedPaycheck(item) {
  return Number(state.paycheckAssignments[item.id] || item.defaultPaycheck);
}

function setPaycheckAssignment(itemId, paycheck) {
  state.paycheckAssignments[itemId] = paycheck;
  localStorage.setItem("financeOS.paycheckAssignments", JSON.stringify(state.paycheckAssignments));
}

function switchView(view) {
  state.view = view;
  localStorage.setItem("financeOS.view", view);
  document.querySelectorAll(".view").forEach((el) => el.classList.toggle("active", el.id === view));
  document.querySelectorAll(".nav-btn").forEach((btn) => btn.classList.toggle("active", btn.dataset.view === view));
  const titles = {
    overview: "Orbital Treasury",
    paychecks: "Paycheck Split",
    categories: "Categories",
    calendar: "Bills Calendar",
    goals: "Savings Goals",
    planner: "Planner",
  };
  document.getElementById("viewTitle").textContent = titles[view] || view[0].toUpperCase() + view.slice(1);
  render();
}

function switchMonth(index) {
  state.month = 0;
  render();
}

function setTheme(theme) {
  const themes = ["orbital", "calm", "midnight", "editorial", "ocean", "plum"];
  state.theme = themes.includes(theme) ? theme : "orbital";
  document.documentElement.dataset.theme = state.theme;
  localStorage.setItem("financeOS.theme", state.theme);
  const selector = document.getElementById("themeSelect");
  if (selector) selector.value = state.theme;
  drawTrend();
  drawCategories();
}

function setupControls() {
  document.querySelectorAll(".nav-btn").forEach((btn) => btn.addEventListener("click", () => switchView(btn.dataset.view)));
  const themeSelect = document.getElementById("themeSelect");
  if (themeSelect) {
    themeSelect.value = state.theme;
    themeSelect.addEventListener("change", (event) => setTheme(event.target.value));
  }
  document.getElementById("resetBtn").addEventListener("click", () => {
    state.edits = {};
    state.income = BASE_DATA.takeHome;
    state.paycheckAssignments = {};
    localStorage.removeItem("financeOS.edits");
    localStorage.removeItem("financeOS.income");
    localStorage.removeItem("financeOS.paycheckAssignments");
    render();
  });
  document.getElementById("scenarioSpend").addEventListener("input", updateScenario);
  const paycheckEditBtn = document.getElementById("paycheckEditBtn");
  if (paycheckEditBtn) {
    paycheckEditBtn.addEventListener("click", () => {
      state.paycheckEditMode = !state.paycheckEditMode;
      renderPaychecks();
    });
  }
}

function renderMonthRail() {
  const a = allocationSummary();
  const tiles = [
    ["Bills", a.bills, "Fixed and recurring expenses"],
    ["Living", a.living, "Groceries, hygiene, barber"],
    ["Goals", a.goals, "Savings, car, investing goals"],
    ["Net Cash", a.net, "Unassigned monthly cash"],
  ];
  document.getElementById("monthRail").innerHTML = tiles
    .map(([label, value, helper]) => `<div class="allocation-tile"><span>${label}</span><strong>${money(value)}</strong><small>${helper}</small></div>`)
    .join("");
}

function renderKpis() {
  const spend = spending();
  const left = cashLeft();
  const allocation = allocationSummary();
  const income = takeHome();
  const allocatedPct = income ? Math.round(((income - allocation.net) / income) * 100) : 0;

  document.getElementById("commandHeadline").textContent = money(allocation.net);
  document.getElementById("commandSubtext").textContent = allocation.net >= 0 ? "Available" : "Over plan";
  document.getElementById("commandAllocated").textContent = `${allocatedPct}%`;
  document.getElementById("orbitBills").textContent = money(allocation.bills);
  document.getElementById("orbitLiving").textContent = money(allocation.living);
  document.getElementById("orbitGoals").textContent = money(allocation.goals);
  document.getElementById("orbitIncome").textContent = money(income);
  document.getElementById("orbitProgressBar").style.width = `${Math.max(0, Math.min(100, allocatedPct))}%`;
  const score = budgetScore();
  document.getElementById("orbitStatusLabel").textContent = score >= 75 ? "Excellent" : score >= 50 ? "Stable" : "Needs attention";

  document.getElementById("takeHome").textContent = money(income);
  document.getElementById("plannedSpend").textContent = money(spend);
  document.getElementById("cashLeft").textContent = money(left);
  document.getElementById("budgetScore").textContent = score;
  document.getElementById("spendNote").textContent = spend ? "Budgeted lines for selected month" : "No expense rows filled for this month";
  document.getElementById("cashNote").textContent = left >= 0 ? "After planned spending" : "Over monthly take-home";
}

function renderInsights() {
  const totals = BASE_DATA.categories.map((category, index) => ({ name: category.name, value: categoryTotal(index) })).sort((a, b) => b.value - a.value);
  const filledMonths = BASE_DATA.months.filter((_, index) => spending(index) > 0).length;
  const a = allocationSummary();
  const allocated = takeHome() - a.net;
  const spendPct = (allocated / takeHome()) * 100;
  const recurringBills = BASE_DATA.bills.reduce((sum, bill) => sum + bill.amount, 0);
  const nextBigBill = [...BASE_DATA.bills].sort((a, b) => b.amount - a.amount)[0];
  const notes = [
    ["Net cash", a.net >= 0 ? `${money(a.net)} remains unassigned after bills, living, and savings goals.` : `${money(Math.abs(a.net))} over monthly take-home.`],
    ["Top category", `${totals[0].name} is currently the largest bucket at ${money(totals[0].value)}.`],
    ["Paycheck routing", `${Math.round(spendPct)}% of take-home pay is currently assigned in the monthly plan.`],
    ["Recurring bills", `${money(recurringBills)} is mapped into the bills calendar. Largest bill: ${nextBigBill.name} at ${money(nextBigBill.amount)}.`],
    ["Sheet coverage", `${filledMonths} of 12 months have filled budget rows in the 2026 sheet.`],
    ["Planning layer", Object.keys(state.edits).length ? `${Object.keys(state.edits).length} browser-side edits are active.` : "No dashboard edits are active."],
  ];
  document.getElementById("insights").innerHTML = notes.map(([title, body]) => `<div class="note"><strong>${title}</strong><span>${body}</span></div>`).join("");
}

function renderCategories() {
  const max = Math.max(...BASE_DATA.categories.map((_, i) => categoryTotal(i)), 1);
  document.getElementById("categoryTitle").textContent = `${BASE_DATA.months[state.month]} category totals`;
  document.getElementById("categoryCards").innerHTML = BASE_DATA.categories
    .map((category, index) => ({ category, index, total: categoryTotal(index) }))
    .sort((left, right) => right.total - left.total)
    .map(({ category, index, total }) => {
      return `
        <div class="category-card" style="--category-color:${category.color}">
          <div><strong>${category.name}</strong><span>${Math.round((total / Math.max(spending(), 1)) * 100)}% of spending</span></div>
          <b>${money(total)}</b>
          <div class="category-meter"><i style="width:${(total / max) * 100}%; background:${category.color}"></i></div>
        </div>
      `;
    })
    .join("");

  const rows = [];
  BASE_DATA.categories.forEach((category, ci) => {
    category.lines.forEach((item, li) => {
      const value = valueFor(ci, li);
      if (spending() && value === 0) return;
      rows.push(`<tr><td>${category.name}</td><td>${item.name}</td><td class="num">${money(value)}</td></tr>`);
    });
  });
  document.getElementById("lineItems").innerHTML = rows.join("") || `<tr><td colspan="3">No lines filled for this month.</td></tr>`;
}

function paycheckSplit() {
  const half = takeHome() / 2;
  const items = paycheckItems().filter((item) => item.amount > 0);
  const paycheckOneItems = items.filter((item) => assignedPaycheck(item) === 1);
  const paycheckTwoItems = items.filter((item) => assignedPaycheck(item) === 2);
  const p1Used = paycheckOneItems.reduce((sum, item) => sum + item.amount, 0);
  const p2Used = paycheckTwoItems.reduce((sum, item) => sum + item.amount, 0);
  return [
    { name: "Paycheck 1", focus: "Assigned bills and categories", income: half, used: p1Used, items: paycheckOneItems },
    { name: "Paycheck 2", focus: "Assigned bills and categories", income: half, used: p2Used, items: paycheckTwoItems },
  ];
}

function renderPaychecks() {
  const summary = document.getElementById("paycheckSummary");
  const cards = document.getElementById("paycheckCards");
  if (!summary || !cards) return;
  const paycheckEditBtn = document.getElementById("paycheckEditBtn");
  if (paycheckEditBtn) paycheckEditBtn.textContent = state.paycheckEditMode ? "Done" : "Edit Assignments";

  const split = paycheckSplit();
  const totalBuffer = split.reduce((sum, check) => sum + (check.income - check.used), 0);
  summary.innerHTML = `
    <div class="paycheck-total">
      <span>Monthly take-home</span>
      <strong>${money(takeHome())}</strong>
    </div>
    <div class="paycheck-line">
      <span>Estimated per paycheck</span>
      <strong>${money(takeHome() / 2)}</strong>
    </div>
    <div class="paycheck-line">
      <span>Combined paycheck buffer</span>
      <strong>${money(totalBuffer)}</strong>
    </div>
  `;

  cards.innerHTML = split
    .map((check) => {
      const buffer = check.income - check.used;
      return `
        <article class="paycheck-card">
          <div class="paycheck-card-head">
            <div><strong>${check.name}</strong><br><span>${check.focus}</span></div>
            <b>${money(check.income)}</b>
          </div>
          ${check.items
            .map(
              (item) => `
              <div class="paycheck-item ${state.paycheckEditMode ? "editing" : ""}">
                <div class="paycheck-item-main">
                  <strong>${item.label}</strong>
                  <span>${item.detail}</span>
                </div>
                ${
                  state.paycheckEditMode
                    ? `
                <label class="paycheck-item-assign">
                  <span>Paycheck</span>
                  <select data-paycheck-item="${item.id}" aria-label="${item.label} paycheck assignment">
                    <option value="1" ${assignedPaycheck(item) === 1 ? "selected" : ""}>1</option>
                    <option value="2" ${assignedPaycheck(item) === 2 ? "selected" : ""}>2</option>
                  </select>
                </label>
                `
                    : ""
                }
                <b>${money(item.amount)}</b>
              </div>
            `,
            )
            .join("")}
          <div class="paycheck-buffer">${money(buffer)} remaining from this paycheck</div>
        </article>
      `;
    })
    .join("");

  document.querySelectorAll("[data-paycheck-item]").forEach((input) => {
    input.addEventListener("change", () => {
      setPaycheckAssignment(input.dataset.paycheckItem, Number(input.value));
      renderPaychecks();
    });
  });
}

function renderCalendar() {
  const daysInMonth = 31;
  document.getElementById("calendarTitle").textContent = "Monthly bills calendar";
  document.getElementById("billCalendar").innerHTML = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const bills = BASE_DATA.bills.filter((bill) => bill.day === day);
    return `
      <div class="calendar-day">
        <b>${day}</b>
        ${bills
          .map((bill) => `<span class="bill-chip ${bill.amount >= 500 ? "high" : ""}">${bill.name} · ${money(bill.amount)}</span>`)
          .join("")}
      </div>
    `;
  }).join("");

  document.getElementById("billList").innerHTML = [...BASE_DATA.bills]
    .sort((a, b) => a.day - b.day)
    .map(
      (bill) => `
      <div class="bill-item">
        <div><strong>${bill.name}</strong><span>Day ${bill.day} · ${bill.category}</span></div>
        <b>${money(bill.amount)}</b>
      </div>
    `,
    )
    .join("");
}

function renderGoals() {
  const available = Math.max(0, cashLeft());
  const monthlyGoalTotal = BASE_DATA.goals.reduce((sum, goal) => sum + goalValue(goal, "monthly"), 0);
  document.getElementById("goalCards").innerHTML = BASE_DATA.goals
    .map((goal) => {
      const current = goalValue(goal, "current");
      const target = goalValue(goal, "target");
      const monthly = goalValue(goal, "monthly");
      const pct = target ? Math.min(100, (current / target) * 100) : 0;
      const remaining = Math.max(0, target - current);
      const monthsLeft = monthly ? Math.ceil(remaining / monthly) : 0;
      return `
        <div class="goal-card">
          <div class="goal-card-head">
            <div><strong>${goal.name}</strong><span>${Math.round(pct)}% funded · ${monthsLeft || "No"} months at current pace</span></div>
            <b>${money(current)} / ${money(target)}</b>
          </div>
          <div class="goal-meter"><i style="width:${pct}%"></i></div>
          <div class="goal-inputs">
            <label>Current<input type="number" min="0" step="25" value="${current}" data-goal="${goal.id}" data-field="current" /></label>
            <label>Monthly<input type="number" min="0" step="25" value="${monthly}" data-goal="${goal.id}" data-field="monthly" /></label>
          </div>
        </div>
      `;
    })
    .join("");

  document.getElementById("goalPlan").innerHTML = [
    ["Available cash", `${money(available)} is available after planned spending for ${BASE_DATA.months[state.month]}.`],
    ["Goal funding", `${money(monthlyGoalTotal)} is assigned to savings goals each month.`],
    ["Remaining buffer", `${money(available - monthlyGoalTotal)} remains after goal funding.`],
  ]
    .map(([title, body]) => `<div class="note"><strong>${title}</strong><span>${body}</span></div>`)
    .join("");

  document.querySelectorAll(".goal-inputs input").forEach((input) => {
    input.addEventListener("input", () => {
      setGoalValue(input.dataset.goal, input.dataset.field, input.value);
      render();
    });
  });
}

function refreshPlannerSummary() {
  const totalSpendEl = document.querySelector("[data-planner-total-spend]");
  const cashLeftEl = document.querySelector("[data-planner-cash-left]");
  if (totalSpendEl) totalSpendEl.textContent = money(spending());
  if (cashLeftEl) cashLeftEl.textContent = money(cashLeft());
}

function refreshPlannerCategoryTotals() {
  document.querySelectorAll("[data-category-total]").forEach((node) => {
    const categoryIndex = Number(node.dataset.categoryTotal);
    node.textContent = money(categoryTotal(categoryIndex));
  });
}

function renderPlanner() {
  const plannerRows = document.getElementById("plannerRows");
  const totalSpend = spending();
  plannerRows.innerHTML = `
    <section class="planner-summary">
      <label class="planner-income">
        <span>Monthly take-home</span>
        <input id="incomeInput" type="number" min="0" step="1" value="${takeHome()}" />
      </label>
      <div>
        <span>Total planned expenses</span>
        <strong data-planner-total-spend>${money(totalSpend)}</strong>
      </div>
      <div>
        <span>Cash left</span>
        <strong data-planner-cash-left>${money(cashLeft())}</strong>
      </div>
    </section>
  `;
  plannerRows.innerHTML += BASE_DATA.categories
    .map((category, ci) => {
      const rows = category.lines
        .map((item, li) => {
          const current = valueFor(ci, li);
          if (spending() && current === 0) return "";
          return `
          <div class="planner-row">
            <div><strong>${item.name}</strong></div>
            <input type="number" min="0" step="1" value="${current}" data-ci="${ci}" data-li="${li}" aria-label="${item.name} amount" />
            <b>${money(current)}</b>
          </div>
        `;
        })
        .join("");
      if (!rows) return "";
      return `
        <section class="planner-group">
          <div class="planner-group-head">
            <strong>${category.name}</strong>
            <span data-category-total="${ci}">${money(categoryTotal(ci))}</span>
          </div>
          ${rows}
        </section>
      `;
    })
    .join("");

  document.querySelectorAll(".planner-row input").forEach((input) => {
    input.addEventListener("input", () => {
      const categoryIndex = Number(input.dataset.ci);
      const lineIndex = Number(input.dataset.li);
      setValue(categoryIndex, lineIndex, input.value);
      const valueCell = input.parentElement.querySelector("b");
      if (valueCell) valueCell.textContent = money(valueFor(categoryIndex, lineIndex));
      refreshPlannerSummary();
      refreshPlannerCategoryTotals();
    });
    input.addEventListener("change", render);
    input.addEventListener("blur", render);
  });

  const incomeInput = document.getElementById("incomeInput");
  if (incomeInput) {
    incomeInput.addEventListener("input", () => {
      state.income = Number(incomeInput.value) || 0;
      localStorage.setItem("financeOS.income", String(state.income));
      refreshPlannerSummary();
    });
    incomeInput.addEventListener("change", render);
    incomeInput.addEventListener("blur", render);
  }
}

function updateScenario() {
  const extra = Number(document.getElementById("scenarioSpend").value);
  document.getElementById("scenarioLabel").textContent = `${money(extra)} extra`;
  document.getElementById("scenarioCash").textContent = `${money(cashLeft() - extra)} left`;
}

function setupCanvas(canvas, height = 300) {
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);
  return { ctx, width, height };
}

function drawTrend() {
  const trendCanvas = document.getElementById("trendChart");
  const { ctx, width, height } = setupCanvas(trendCanvas, 260);
  if (width < 200) return;
  const a = allocationSummary();
  trendCanvas.setAttribute(
    "aria-label",
    `Cash-flow chart: ${money(takeHome())} take-home, ${money(a.bills)} bills, ${money(a.living)} living expenses, ${money(a.goals)} goals, and ${money(a.net)} net cash.`,
  );
  const steps = [
    { label: "Take-home", value: takeHome(), delta: takeHome(), type: "start" },
    { label: "Bills", value: takeHome() - a.bills, delta: -a.bills, type: "outflow" },
    { label: "Living", value: takeHome() - a.bills - a.living, delta: -a.living, type: "outflow" },
    { label: "Goals", value: a.net, delta: -a.goals, type: "outflow" },
    { label: "Net Cash", value: a.net, delta: a.net, type: "end" },
  ];
  const pad = { left: 36, right: 24, top: 24, bottom: 46 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const max = takeHome();
  const gap = 14;
  const barW = (chartW - gap * (steps.length - 1)) / steps.length;
  const y = (value) => pad.top + chartH - (Math.max(0, value) / max) * chartH;

  ctx.font = "12px Inter, system-ui";
  ctx.strokeStyle = cssColor("--chart-line", "#dbe4df");
  ctx.lineWidth = 1;
  [0, 0.5, 1].forEach((ratio) => {
    const yy = pad.top + chartH - ratio * chartH;
    ctx.beginPath();
    ctx.moveTo(pad.left, yy);
    ctx.lineTo(width - pad.right, yy);
    ctx.stroke();
  });

  steps.forEach((step, index) => {
    const x = pad.left + index * (barW + gap);
    const prev = index === 0 ? 0 : steps[index - 1].value;
    const startValue = step.type === "outflow" ? prev : 0;
    const endValue = step.type === "outflow" ? step.value : step.value;
    const top = y(Math.max(startValue, endValue));
    const bottom = y(Math.min(startValue, endValue));
    const h = Math.max(4, bottom - top);
    const color =
      step.type === "start"
        ? cssColor("--green", "#16784f")
        : step.type === "end"
          ? cssColor("--gold", "#b3832f")
          : cssColor("--red", "#be4d3f");

    ctx.fillStyle = color;
    roundRect(ctx, x, top, barW, h, 8);
    ctx.fill();

    if (step.type === "outflow") {
      ctx.strokeStyle = cssColor("--chart-guide", "#9fb2aa");
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x - gap, y(prev));
      ctx.lineTo(x, y(prev));
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.fillStyle = cssColor("--ink", "#10201d");
    ctx.textAlign = "center";
    ctx.fillText(step.label, x + barW / 2, height - 24);
    ctx.fillStyle = cssColor("--muted", "#62716d");
    const label = step.type === "outflow" ? `-${money(Math.abs(step.delta))}` : money(step.delta);
    ctx.fillText(label, x + barW / 2, Math.max(14, top - 8));
    ctx.textAlign = "left";
  });
}

function drawLine(ctx, values, x, y, color) {
  ctx.beginPath();
  values.forEach((value, i) => (i ? ctx.lineTo(x(i), y(value)) : ctx.moveTo(x(i), y(value))));
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
  values.forEach((value, i) => {
    ctx.beginPath();
    ctx.arc(x(i), y(value), i === state.month ? 5 : 3.5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = cssColor("--panel", "#fff");
    ctx.lineWidth = 2;
    ctx.stroke();
  });
}

function drawCategories() {
  const categoryCanvas = document.getElementById("categoryChart");
  const { ctx, width, height } = setupCanvas(categoryCanvas, 300);
  if (width < 220) return;
  const totals = BASE_DATA.categories
    .map((category, index) => ({ ...category, value: categoryTotal(index) }))
    .sort((left, right) => right.value - left.value);
  categoryCanvas.setAttribute(
    "aria-label",
    `Category breakdown: ${totals.map((item) => `${item.name} ${money(item.value)}`).join(", ")}.`,
  );
  const max = Math.max(...totals.map((item) => item.value), 1);
  const left = 132;
  const rowH = height / totals.length;
  ctx.font = "12px Inter, system-ui";
  totals.forEach((item, index) => {
    const y = index * rowH + 12;
    ctx.fillStyle = cssColor("--ink", "#13202b");
    ctx.fillText(item.name, 0, y + 12);
    ctx.fillStyle = cssColor("--chart-track", "#e5ebef");
    roundRect(ctx, left, y, width - left - 72, 12, 6);
    ctx.fill();
    ctx.fillStyle = item.color;
    roundRect(ctx, left, y, ((width - left - 72) * item.value) / max, 12, 6);
    ctx.fill();
    ctx.fillStyle = cssColor("--muted", "#607080");
    ctx.textAlign = "right";
    ctx.fillText(money(item.value), width - 4, y + 12);
    ctx.textAlign = "left";
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (w <= 0 || h <= 0) return;
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function cssColor(name, fallback) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function render() {
  renderMonthRail();
  renderKpis();
  renderInsights();
  renderPaychecks();
  renderCategories();
  renderCalendar();
  renderGoals();
  renderPlanner();
  drawTrend();
  drawCategories();
  updateScenario();
}

setupControls();
setTheme(state.theme);
switchView(state.view);
window.addEventListener("resize", render);
