const colorPool = ["#1f6f78", "#c85050", "#4f7d3a", "#7b5ea7", "#b7791f", "#2f6db3", "#b64f8a", "#55706d"];
const weekdayNames = ["日", "一", "二", "三", "四", "五", "六"];

const defaultState = () => {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return {
    month,
    weekdayNeed: 2,
    weekendNeed: 2,
    constraints: { maxConsecutive: 5, minFulltime: 2, preferWeekdayOff: true },
    people: [
      { id: uid(), name: "小安", role: "fulltime", color: "#1f6f78", quota: 8, requests: [6, 20] },
      { id: uid(), name: "佳蓉", role: "fulltime", color: "#c85050", quota: 8, requests: [11] },
      { id: uid(), name: "阿哲", role: "fulltime", color: "#4f7d3a", quota: 8, requests: [18, 25] },
      { id: uid(), name: "Mina", role: "parttime", color: "#7b5ea7", quota: 0, requests: [] },
      { id: uid(), name: "Leo", role: "parttime", color: "#b7791f", quota: 0, requests: [] }
    ],
    days: {},
    selectedDate: null
  };
};

let state = loadState();

const els = {
  monthInput: document.getElementById("monthInput"), prevMonth: document.getElementById("prevMonth"), nextMonth: document.getElementById("nextMonth"), todayBtn: document.getElementById("todayBtn"),
  weekdayNeed: document.getElementById("weekdayNeed"), weekendNeed: document.getElementById("weekendNeed"), maxConsecutive: document.getElementById("maxConsecutive"), minFulltime: document.getElementById("minFulltime"), preferWeekdayOff: document.getElementById("preferWeekdayOff"),
  peopleList: document.getElementById("peopleList"), addPerson: document.getElementById("addPerson"), resetDemo: document.getElementById("resetDemo"), calendarTitle: document.getElementById("calendarTitle"), summaryText: document.getElementById("summaryText"), warnings: document.getElementById("warnings"), calendarGrid: document.getElementById("calendarGrid"),
  autoSchedule: document.getElementById("autoSchedule"), exportCsv: document.getElementById("exportCsv"), drawerTitle: document.getElementById("drawerTitle"), drawerNeed: document.getElementById("drawerNeed"), drawerClosed: document.getElementById("drawerClosed"), drawerFulltime: document.getElementById("drawerFulltime"), drawerParttime: document.getElementById("drawerParttime"), closeDrawer: document.getElementById("closeDrawer"), personTemplate: document.getElementById("personTemplate")
};

bindControls();
render();

function uid() { return Math.random().toString(36).slice(2, 10); }
function loadState() { try { return JSON.parse(localStorage.getItem("scheduleAppState")) || defaultState(); } catch { return defaultState(); } }
function saveState() { localStorage.setItem("scheduleAppState", JSON.stringify(state)); }
function persistRender() { saveState(); render(); }
function numberValue(value) { return Math.max(0, Number(value || 0)); }
function parseMonth(value) { const [year, month] = value.split("-").map(Number); return { year, monthIndex: month - 1 }; }
function daysInMonth(year, monthIndex) { return new Date(year, monthIndex + 1, 0).getDate(); }
function toIso(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function parseDays(value) { return [...new Set(String(value).split(/[,\s，、]+/).map(Number).filter((n) => n >= 1 && n <= 31))].sort((a, b) => a - b); }
function demandFor(date) { return date.getDay() === 0 || date.getDay() === 6 ? Number(state.weekendNeed || 0) : Number(state.weekdayNeed || 0); }
function dayData(iso, create = true) { if (!state.days[iso] && create) state.days[iso] = { closed: false, fulltimeOff: {}, parttime: {} }; return state.days[iso]; }
function parttimeCount(iso) { return Object.values(dayData(iso, false)?.parttime || {}).filter(Boolean).length; }
function isFulltimeOff(person, iso) { if (!iso.startsWith(state.month)) return false; const day = Number(iso.slice(-2)); return Boolean(dayData(iso, false)?.fulltimeOff?.[person.id]) || (person.requests || []).includes(day); }
function offReason(person, iso) { const value = dayData(iso, false)?.fulltimeOff?.[person.id]; const day = Number(iso.slice(-2)); if (value === "requested" || (person.requests || []).includes(day)) return "指定休"; if (value === "auto" || value === "probe") return "休"; return ""; }

function bindControls() {
  els.monthInput.addEventListener("change", () => { state.month = els.monthInput.value; state.selectedDate = null; persistRender(); });
  els.prevMonth.addEventListener("click", () => shiftMonth(-1));
  els.nextMonth.addEventListener("click", () => shiftMonth(1));
  els.todayBtn.addEventListener("click", () => { const now = new Date(); state.month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`; persistRender(); });
  els.weekdayNeed.addEventListener("input", () => { state.weekdayNeed = numberValue(els.weekdayNeed.value); persistRender(); });
  els.weekendNeed.addEventListener("input", () => { state.weekendNeed = numberValue(els.weekendNeed.value); persistRender(); });
  els.maxConsecutive.addEventListener("input", () => { state.constraints.maxConsecutive = Math.max(1, numberValue(els.maxConsecutive.value)); persistRender(); });
  els.minFulltime.addEventListener("input", () => { state.constraints.minFulltime = numberValue(els.minFulltime.value); persistRender(); });
  els.preferWeekdayOff.addEventListener("change", () => { state.constraints.preferWeekdayOff = els.preferWeekdayOff.checked; persistRender(); });
  els.addPerson.addEventListener("click", addPerson);
  els.resetDemo.addEventListener("click", () => { if (confirm("載入範例資料會覆蓋目前資料，確定嗎？")) { state = defaultState(); persistRender(); } });
  els.autoSchedule.addEventListener("click", autoSchedule);
  els.exportCsv.addEventListener("click", exportCsv);
  els.closeDrawer.addEventListener("click", () => { state.selectedDate = null; persistRender(); });
  els.drawerClosed.addEventListener("change", () => { if (!state.selectedDate) return; dayData(state.selectedDate).closed = els.drawerClosed.checked; persistRender(); });
}

function render() {
  els.monthInput.value = state.month;
  els.weekdayNeed.value = state.weekdayNeed;
  els.weekendNeed.value = state.weekendNeed;
  els.maxConsecutive.value = state.constraints.maxConsecutive;
  els.minFulltime.value = state.constraints.minFulltime;
  els.preferWeekdayOff.checked = state.constraints.preferWeekdayOff;
  renderPeople();
  renderCalendar();
  renderDrawer();
  renderWarnings();
}

function renderPeople() {
  els.peopleList.innerHTML = "";
  state.people.forEach((person) => {
    const node = els.personTemplate.content.firstElementChild.cloneNode(true);
    const name = node.querySelector(".person-name");
    const color = node.querySelector(".person-color");
    const role = node.querySelector(".person-role");
    const quota = node.querySelector(".person-quota");
    const requests = node.querySelector(".person-requests");
    name.value = person.name; color.value = person.color; role.value = person.role; quota.value = person.quota || 0; requests.value = (person.requests || []).join(", ");
    quota.disabled = person.role !== "fulltime"; requests.disabled = person.role !== "fulltime";
    name.addEventListener("input", () => updatePerson(person.id, { name: name.value }));
    color.addEventListener("input", () => updatePerson(person.id, { color: color.value }));
    role.addEventListener("change", () => updatePerson(person.id, { role: role.value }, true));
    quota.addEventListener("input", () => updatePerson(person.id, { quota: numberValue(quota.value) }));
    requests.addEventListener("input", () => updatePerson(person.id, { requests: parseDays(requests.value) }));
    node.querySelector(".person-remove").addEventListener("click", () => removePerson(person.id));
    els.peopleList.appendChild(node);
  });
}

function renderCalendar() {
  const { year, monthIndex } = parseMonth(state.month);
  els.calendarTitle.textContent = `${year} 年 ${monthIndex + 1} 月`;
  els.calendarGrid.innerHTML = "";
  const first = new Date(year, monthIndex, 1);
  const start = new Date(year, monthIndex, 1 - first.getDay());
  const fulltime = state.people.filter((p) => p.role === "fulltime");
  const parttime = state.people.filter((p) => p.role === "parttime");
  let shortageDays = 0, closedDays = 0;
  for (let i = 0; i < 42; i += 1) {
    const date = new Date(start); date.setDate(start.getDate() + i);
    const iso = toIso(date); const inMonth = date.getMonth() === monthIndex; const data = dayData(iso, false);
    const demand = demandFor(date);
    const workingFulltime = fulltime.filter((p) => !isFulltimeOff(p, iso) && !data?.closed).length;
    const staffed = data?.closed ? 0 : workingFulltime + parttime.filter((p) => data?.parttime?.[p.id]).length;
    const short = inMonth && !data?.closed && staffed < demand;
    if (short) shortageDays += 1; if (inMonth && data?.closed) closedDays += 1;
    const cell = document.createElement("button");
    cell.type = "button"; cell.className = "day-cell";
    if (!inMonth) cell.classList.add("outside"); if (data?.closed) cell.classList.add("closed"); if (state.selectedDate === iso) cell.classList.add("selected");
    cell.innerHTML = `<div class="day-head"><span class="day-number">${date.getDate()}</span><span class="need-badge ${short ? "short" : "ok"}">${data?.closed ? "店休" : `${staffed}/${demand}`}</span></div><div class="chips"></div>`;
    const chips = cell.querySelector(".chips");
    if (data?.closed) chips.append(chip("店休", "#d94b45", false));
    fulltime.forEach((person) => { const reason = offReason(person, iso); if (reason) chips.append(chip(`${person.name} ${reason}`, person.color, false)); });
    parttime.forEach((person) => { const time = data?.parttime?.[person.id]; if (time) chips.append(chip(`${person.name} ${time}`, person.color, true)); });
    cell.addEventListener("click", () => { state.selectedDate = iso; persistRender(); });
    els.calendarGrid.appendChild(cell);
  }
  els.summaryText.textContent = `${daysInMonth(year, monthIndex)} 天，店休 ${closedDays} 天，缺員 ${shortageDays} 天`;
}

function renderDrawer() {
  const iso = state.selectedDate || `${state.month}-01`;
  const date = new Date(`${iso}T00:00:00`);
  const data = dayData(iso);
  els.drawerTitle.textContent = `${date.getMonth() + 1}/${date.getDate()}（${weekdayNames[date.getDay()]}）`;
  els.drawerNeed.textContent = `需求 ${demandFor(date)} 人`;
  els.drawerClosed.checked = Boolean(data.closed);
  els.drawerFulltime.innerHTML = ""; els.drawerParttime.innerHTML = "";
  state.people.filter((p) => p.role === "fulltime").forEach((person) => {
    const row = document.createElement("label"); row.className = "drawer-row"; row.innerHTML = `<input type="checkbox"><span>${person.name}</span>`; row.style.color = person.color;
    const input = row.querySelector("input"); input.checked = isFulltimeOff(person, iso);
    input.addEventListener("change", () => { toggleRequestedOff(person.id, date.getDate(), input.checked); persistRender(); });
    els.drawerFulltime.append(row);
  });
  state.people.filter((p) => p.role === "parttime").forEach((person) => {
    const row = document.createElement("label"); row.className = "drawer-row time-row"; row.innerHTML = `<span class="color-dot"></span><span>${person.name}</span><input placeholder="18:00-22:00">`; row.querySelector(".color-dot").style.background = person.color;
    const input = row.querySelector("input"); input.value = data.parttime?.[person.id] || "";
    input.addEventListener("input", () => { if (!data.parttime) data.parttime = {}; if (input.value.trim()) data.parttime[person.id] = input.value.trim(); else delete data.parttime[person.id]; persistRender(); });
    els.drawerParttime.append(row);
  });
}

function autoSchedule() {
  const { year, monthIndex } = parseMonth(state.month);
  const dates = Array.from({ length: daysInMonth(year, monthIndex) }, (_, i) => toIso(new Date(year, monthIndex, i + 1)));
  const fulltime = state.people.filter((p) => p.role === "fulltime");
  dates.forEach((iso) => { const data = dayData(iso); data.fulltimeOff = Object.fromEntries(Object.entries(data.fulltimeOff || {}).filter(([, value]) => value === "requested")); });
  fulltime.forEach((person) => {
    (person.requests || []).forEach((d) => { const iso = `${state.month}-${String(d).padStart(2, "0")}`; dayData(iso).fulltimeOff[person.id] = "requested"; });
    let current = dates.filter((iso) => isFulltimeOff(person, iso)).length;
    const candidates = dates.filter((iso) => !isFulltimeOff(person, iso) && !dayData(iso).closed).sort((a, b) => scoreDayForOff(person, b) - scoreDayForOff(person, a));
    for (const iso of candidates) { if (current >= Number(person.quota || 0)) break; if (!canTakeOff(person, iso, dates)) continue; dayData(iso).fulltimeOff[person.id] = "auto"; current += 1; }
  });
  persistRender();
}

function canTakeOff(person, iso, dates) {
  const fulltime = state.people.filter((p) => p.role === "fulltime");
  const data = dayData(iso); if (data.closed) return false;
  const workingAfter = fulltime.filter((p) => p.id !== person.id && !isFulltimeOff(p, iso)).length;
  if (workingAfter < state.constraints.minFulltime) return false;
  if (workingAfter + parttimeCount(iso) < demandFor(new Date(`${iso}T00:00:00`))) return false;
  data.fulltimeOff[person.id] = "probe"; const maxRun = maxConsecutiveWork(person, dates); delete data.fulltimeOff[person.id];
  return maxRun <= state.constraints.maxConsecutive;
}

function scoreDayForOff(person, iso) { const day = new Date(`${iso}T00:00:00`).getDay(); return 10 + (state.constraints.preferWeekdayOff && day !== 0 && day !== 6 ? 8 : 0) + Math.random(); }
function maxConsecutiveWork(person, dates) { let current = 0, max = 0; dates.forEach((iso) => { if (dayData(iso, false)?.closed || isFulltimeOff(person, iso)) current = 0; else current += 1; max = Math.max(max, current); }); return max; }
function renderWarnings() { const warnings = getWarnings(); els.warnings.classList.toggle("hidden", warnings.length === 0); els.warnings.innerHTML = warnings.map((w) => `<div>${w}</div>`).join(""); }
function getWarnings() { const { year, monthIndex } = parseMonth(state.month); const dates = Array.from({ length: daysInMonth(year, monthIndex) }, (_, i) => toIso(new Date(year, monthIndex, i + 1))); const fulltime = state.people.filter((p) => p.role === "fulltime"); const warnings = []; dates.forEach((iso) => { const data = dayData(iso, false); if (data?.closed) return; const demand = demandFor(new Date(`${iso}T00:00:00`)); const staffed = fulltime.filter((p) => !isFulltimeOff(p, iso)).length + parttimeCount(iso); if (staffed < demand) warnings.push(`${Number(iso.slice(-2))} 日缺 ${demand - staffed} 人`); }); return warnings.slice(0, 12); }
function addPerson() { state.people.push({ id: uid(), name: `人員 ${state.people.length + 1}`, role: "fulltime", color: colorPool[state.people.length % colorPool.length], quota: 8, requests: [] }); persistRender(); }
function updatePerson(id, patch, rerenderPeople = false) { state.people = state.people.map((person) => person.id === id ? { ...person, ...patch } : person); saveState(); if (rerenderPeople) renderPeople(); renderCalendar(); renderDrawer(); renderWarnings(); }
function removePerson(id) { if (!confirm("刪除此人員？")) return; state.people = state.people.filter((person) => person.id !== id); Object.values(state.days).forEach((data) => { delete data.fulltimeOff?.[id]; delete data.parttime?.[id]; }); persistRender(); }
function toggleRequestedOff(personId, day, checked) { state.people = state.people.map((person) => { if (person.id !== personId) return person; const requests = new Set(person.requests || []); if (checked) requests.add(day); else requests.delete(day); return { ...person, requests: [...requests].sort((a, b) => a - b) }; }); const iso = `${state.month}-${String(day).padStart(2, "0")}`; if (checked) dayData(iso).fulltimeOff[personId] = "requested"; else delete dayData(iso).fulltimeOff[personId]; }
function shiftMonth(delta) { const { year, monthIndex } = parseMonth(state.month); const date = new Date(year, monthIndex + delta, 1); state.month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; state.selectedDate = null; persistRender(); }
function chip(text, color, isTime) { const span = document.createElement("span"); span.className = `chip${isTime ? " time" : ""}`; span.style.setProperty("--chip-color", color); span.textContent = text; return span; }
function exportCsv() { const { year, monthIndex } = parseMonth(state.month); const rows = [["日期", "星期", "店休", "需求", "正職休假", "兼職時段"]]; for (let day = 1; day <= daysInMonth(year, monthIndex); day += 1) { const date = new Date(year, monthIndex, day); const iso = toIso(date); const data = dayData(iso, false) || {}; const ftOff = state.people.filter((p) => p.role === "fulltime" && isFulltimeOff(p, iso)).map((p) => `${p.name}${offReason(p, iso)}`).join(" / "); const pt = state.people.filter((p) => p.role === "parttime" && data.parttime?.[p.id]).map((p) => `${p.name} ${data.parttime[p.id]}`).join(" / "); rows.push([iso, weekdayNames[date.getDay()], data.closed ? "是" : "", demandFor(date), ftOff, pt]); } const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")).join("\n"); const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `schedule-${state.month}.csv`; link.click(); URL.revokeObjectURL(url); }
