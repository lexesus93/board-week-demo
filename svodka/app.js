const STORAGE_KEY = "hod-rabot-v1";
const PEOPLE = [
  { id: "alina", name: "Алина" },
  { id: "igor", name: "Игорь" },
  { id: "marina", name: "Марина" },
  { id: "oleg", name: "Олег" },
  { id: "sveta", name: "Света" },
];
const BOSS = "Руководитель";
const MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
const WEEKDAYS = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

const peopleNav = document.querySelector("#people");
const overdueBox = document.querySelector("#overdue");
const weekLabel = document.querySelector("#week-label");
const weekGrid = document.querySelector("#week");
const laterBox = document.querySelector("#later");
const overlay = document.querySelector("#overlay");
const panelKicker = document.querySelector("#panel-kicker");
const linksBox = document.querySelector("#links");
const titleInput = document.querySelector("#title-input");
const assigneesBox = document.querySelector("#assignees");
const dueInput = document.querySelector("#due-input");
const noteInput = document.querySelector("#note-input");
const threadBox = document.querySelector("#thread");
const authorsBox = document.querySelector("#authors");
const entryInput = document.querySelector("#entry-input");
const nextBox = document.querySelector("#next-box");
const nextTitle = document.querySelector("#next-title");
const nextPeople = document.querySelector("#next-people");
const nextDue = document.querySelector("#next-due");
const startNextButton = document.querySelector("#start-next");
const closeOnlyButton = document.querySelector("#close-only");
const reopenButton = document.querySelector("#reopen");
const deleteButton = document.querySelector("#delete-btn");
const weekendsButton = document.querySelector("#weekends");
const thisWeekButton = document.querySelector("#this-week");

let state = loadState();
let openId = null;
let draftAuthor = BOSS;
let nextPerson = "";
let resetTimer = 0;
let deleteTimer = 0;
let closeTimer = 0;

function iso(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseISO(value) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(date, count) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + count);
  return next;
}

function todayDate() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function startOfWeek(date) {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(date, diff);
}

function dayDiff(fromIso, toIso) {
  const ms = parseISO(toIso) - parseISO(fromIso);
  return Math.round(ms / 86400000);
}

function formatDay(value) {
  const date = parseISO(value);
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

function formatRange(start, end) {
  if (start.getMonth() === end.getMonth()) return `${start.getDate()}–${end.getDate()} ${MONTHS[end.getMonth()]}`;
  return `${start.getDate()} ${MONTHS[start.getMonth()]} – ${end.getDate()} ${MONTHS[end.getMonth()]}`;
}

function formatStamp(value) {
  const date = new Date(value);
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${date.getDate()} ${MONTHS[date.getMonth()]}, ${hh}:${mm}`;
}

function personName(id) {
  return PEOPLE.find((person) => person.id === id)?.name || "";
}

function taskById(id) {
  return state.tasks.find((task) => task.id === id);
}

function tone(task) {
  if (task.done) return "done";
  const diff = dayDiff(iso(todayDate()), task.due);
  if (diff < 0) return "late";
  if (diff <= 2) return "soon";
  return "open";
}

function toneLabel(kind) {
  if (kind === "late") return "срок прошёл";
  if (kind === "soon") return "скоро";
  if (kind === "done") return "сделано";
  return "";
}

function visibleTasks() {
  if (state.filter === "all") return state.tasks;
  return state.tasks.filter((task) => task.person === state.filter);
}

function stamp(dayOffset, time) {
  return `${iso(addDays(todayDate(), dayOffset))}T${time}:00`;
}

function makeTask(fields) {
  return {
    done: false,
    note: "",
    thread: [],
    fromId: "",
    nextId: "",
    ...fields,
  };
}

function createDemo() {
  const day = (offset) => iso(addDays(todayDate(), offset));
  const weekday = todayDate().getDay();
  const saturday = (6 - weekday + 7) % 7;
  return {
    filter: "all",
    weekStart: iso(startOfWeek(todayDate())),
    weekends: false,
    tasks: [
      makeTask({
        id: "addr",
        title: "Томск — уточнить адрес",
        person: "oleg",
        due: day(-3),
        done: true,
        nextId: "ship",
        note: "Нужен офис, не просто город.",
        thread: [{ author: "Олег", text: "Офис 214, площадь Батенькова, 2.", at: stamp(-3, "11:20") }],
      }),
      makeTask({
        id: "ship",
        title: "Томск, отдать отправление",
        person: "oleg",
        due: day(-1),
        fromId: "addr",
        note: "Транспортная компания. Адрес уже есть.",
        thread: [
          { author: "Олег", text: "Офис 214, площадь Батенькова, 2.", at: stamp(-3, "11:20") },
          { author: "Руководитель", text: "Адрес есть. Само отправление ещё не ушло.", at: stamp(-1, "09:05") },
        ],
      }),
      makeTask({
        id: "krasnodar",
        title: "Краснодар, FixDerma — подтвердить состав",
        person: "alina",
        due: day(-2),
        note: "Салон на Коммунаров просит тот же набор, что в августе.",
        thread: [
          { author: "Руководитель", text: "Салон написал с утра, лучше не откладывать.", at: stamp(-2, "09:10") },
          { author: "Алина", text: "Состав сверила. Цену ещё не назвала.", at: stamp(-2, "15:40") },
        ],
      }),
      makeTask({
        id: "shelf",
        title: "Ceuticoz, крем 50 мл — сверить полку",
        person: "igor",
        due: day(0),
        note: "В прошлой заявке просили восемь, на полке было четыре.",
      }),
      makeTask({
        id: "box",
        title: "Пятигорск, дособрать коробку",
        person: "marina",
        due: day(1),
        note: "Сыворотка Magiray и два крема. Нет вкладыша с составом.",
        thread: [{ author: "Марина", text: "Вкладыша на складе не нашла.", at: stamp(0, "16:10") }],
      }),
      makeTask({
        id: "sochi",
        title: "Сочи, Ceuticoz — ответить про 30 мл",
        person: "alina",
        due: day(2),
        note: "Вопрос с Ozon. Косметолог ждёт, есть ли сыворотка.",
      }),
      makeTask({
        id: "pickup",
        title: "Самовывоз на Долгоруковской",
        person: "oleg",
        due: day(3),
        note: "Косметолог приедет после четырёх. Коробка у склада.",
      }),
      makeTask({
        id: "phases",
        title: "Набор «Три фазы» — сверить цену",
        person: "sveta",
        due: day(4),
        note: "Текст для карточки на маркетплейсе ещё черновой.",
      }),
      makeTask({
        id: "saturday",
        title: "Карточка акции, если успеем в субботу",
        person: "sveta",
        due: iso(addDays(todayDate(), saturday)),
        note: "Можно спрятать вместе с выходными.",
      }),
      makeTask({
        id: "toner",
        title: "Тоник PHYRIS, фаза 1 — принять коробку",
        person: "igor",
        due: day(7),
        note: "На неё уже две заявки, в том числе кабинет в Уфе.",
      }),
      makeTask({
        id: "ufa",
        title: "Уфа, повтор по PHYRIS",
        person: "alina",
        due: day(8),
        note: "Кабинет просит фазу 1, как только тоник будет на полке.",
      }),
      makeTask({
        id: "inserts",
        title: "Вкладыши с составом — допечатать",
        person: "marina",
        due: day(10),
        note: "Нужны к коробкам на следующую неделю.",
      }),
      makeTask({
        id: "salons",
        title: "Список салонов на вебинар",
        person: "alina",
        due: day(12),
        note: "Бесплатный вебинар. Приглашение ещё не собирали.",
      }),
      makeTask({
        id: "carrier",
        title: "Машина на следующую отгрузку",
        person: "oleg",
        due: day(14),
        note: "Состав рейса ещё не закрыт.",
      }),
      makeTask({
        id: "wb",
        title: "Текст карточки Wildberries",
        person: "sveta",
        due: day(16),
        note: "Короткое описание набора, без новой цены.",
      }),
      makeTask({
        id: "supplier",
        title: "Заявка поставщику Ceuticoz",
        person: "igor",
        due: day(19),
        note: "Крем 50 мл и сыворотка 30 мл.",
      }),
      makeTask({
        id: "samples",
        title: "Пробники Magiray к встрече в офисе",
        person: "marina",
        due: day(23),
        note: "Раздать на Долгоруковской, не отправлять.",
      }),
      makeTask({
        id: "seminar",
        title: "Кого звать на семинар",
        person: "alina",
        due: day(25),
        note: "Пока только список, без рассылки.",
      }),
      makeTask({
        id: "october",
        title: "Октябрьский набор — черновик",
        person: "sveta",
        due: day(28),
        note: "Дальше месяца обычно не заглядываем.",
      }),
    ],
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDemo();
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.tasks) || !data.weekStart) return createDemo();
    return data;
  } catch {
    return createDemo();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function render() {
  renderPeople();
  renderWeek();
  renderOverdue();
  renderLater();
}

function renderPeople() {
  peopleNav.replaceChildren();
  const items = [{ id: "all", name: "Все" }, ...PEOPLE];
  for (const item of items) {
    const button = document.createElement("button");
    button.type = "button";
    if (state.filter === item.id) button.className = "is-current";
    button.append(document.createTextNode(item.name));
    const count = document.createElement("span");
    count.className = "count";
    const openCount = state.tasks.filter((task) => !task.done && (item.id === "all" || task.person === item.id)).length;
    count.textContent = String(openCount);
    button.append(count);
    button.addEventListener("click", () => {
      state.filter = item.id;
      saveState();
      closePanel();
      render();
    });
    peopleNav.append(button);
  }
}

function renderWeek() {
  const start = parseISO(state.weekStart);
  const length = state.weekends ? 7 : 5;
  const end = addDays(start, length - 1);
  weekLabel.textContent = formatRange(start, end);
  thisWeekButton.hidden = state.weekStart === iso(startOfWeek(todayDate()));
  weekendsButton.textContent = state.weekends ? "Скрыть выходные" : "Показать выходные";
  weekendsButton.classList.toggle("is-on", state.weekends);
  weekGrid.style.gridTemplateColumns = `repeat(${length}, minmax(0, 1fr))`;
  weekGrid.replaceChildren();
  const today = iso(todayDate());
  for (let index = 0; index < length; index += 1) {
    const date = addDays(start, index);
    const value = iso(date);
    const column = document.createElement("section");
    column.className = "day" + (value === today ? " is-today" : "") + (index > 4 ? " is-weekend" : "");
    const head = document.createElement("div");
    head.className = "day-head";
    const title = document.createElement("h3");
    title.textContent = WEEKDAYS[index];
    const num = document.createElement("span");
    num.className = "day-num";
    num.textContent = String(date.getDate());
    head.append(title, num);
    const list = document.createElement("div");
    list.className = "day-cards";
    for (const task of visibleTasks().filter((item) => item.due === value)) list.append(cardButton(task));
    const add = document.createElement("button");
    add.type = "button";
    add.className = "add-day";
    add.textContent = "Задача";
    add.addEventListener("click", () => addTask(value));
    column.append(head, list, add);
    weekGrid.append(column);
  }
}

function renderOverdue() {
  const tasks = visibleTasks().filter((task) => !task.done && task.due < state.weekStart);
  overdueBox.hidden = tasks.length === 0;
  overdueBox.replaceChildren();
  if (!tasks.length) return;
  const title = document.createElement("h2");
  title.textContent = "Не закрыты раньше";
  const row = document.createElement("div");
  row.className = "card-row";
  for (const task of tasks.sort((a, b) => a.due.localeCompare(b.due))) row.append(cardButton(task, true));
  overdueBox.append(title, row);
}

function renderLater() {
  const horizon = iso(addDays(todayDate(), 31));
  const weekEnd = iso(addDays(parseISO(state.weekStart), state.weekends ? 6 : 4));
  const tasks = visibleTasks()
    .filter((task) => !task.done && task.due > weekEnd && task.due <= horizon)
    .sort((a, b) => a.due.localeCompare(b.due));
  laterBox.replaceChildren();
  const title = document.createElement("h2");
  title.textContent = "Дальше";
  const note = document.createElement("p");
  note.className = "empty-note";
  note.textContent = "Открытые задачи после этой недели, примерно на месяц вперёд.";
  laterBox.append(title, note);
  if (!tasks.length) {
    const empty = document.createElement("p");
    empty.className = "empty-note";
    empty.textContent = "Дальше месяца здесь пусто.";
    laterBox.append(empty);
    return;
  }
  let groupKey = "";
  let group = null;
  for (const task of tasks) {
    const start = startOfWeek(parseISO(task.due));
    const key = iso(start);
    if (key !== groupKey) {
      groupKey = key;
      group = document.createElement("div");
      group.className = "week-group";
      const heading = document.createElement("h3");
      heading.textContent = formatRange(start, addDays(start, 6));
      const row = document.createElement("div");
      row.className = "later-list";
      group.append(heading, row);
      laterBox.append(group);
    }
    group.querySelector(".later-list").append(cardButton(task, true));
  }
}

function cardButton(task, withDate) {
  const button = document.createElement("button");
  button.type = "button";
  const kind = tone(task);
  button.className = "card" + (withDate ? " later-card" : "") + (kind === "open" ? "" : ` is-${kind}`);
  const title = document.createElement("span");
  title.className = "card-title";
  title.textContent = task.title || "Без названия";
  const meta = document.createElement("span");
  meta.className = "card-meta";
  meta.textContent = withDate ? `${formatDay(task.due)} · ${personName(task.person)}` : personName(task.person);
  button.append(title, meta);
  const flag = toneLabel(kind);
  if (flag) {
    const mark = document.createElement("span");
    mark.className = "card-flag";
    mark.textContent = flag;
    button.append(mark);
  }
  button.addEventListener("click", () => openPanel(task.id));
  return button;
}

function addTask(due) {
  const id = "t" + Math.random().toString(36).slice(2, 10);
  const person = state.filter === "all" ? PEOPLE[0].id : state.filter;
  state.tasks.push(makeTask({ id, title: "", note: "", person, due }));
  saveState();
  render();
  openPanel(id);
}

function shiftWeek(count) {
  state.weekStart = iso(addDays(parseISO(state.weekStart), count * 7));
  saveState();
  closePanel();
  render();
}

function openPanel(id) {
  const task = taskById(id);
  if (!task) return;
  openId = id;
  draftAuthor = state.filter === "all" ? BOSS : personName(state.filter);
  panelKicker.textContent = personName(task.person);
  titleInput.value = task.title;
  dueInput.value = task.due;
  noteInput.value = task.note;
  entryInput.value = "";
  nextBox.hidden = true;
  disarmDelete();
  disarmClose();
  renderLinks(task);
  const pickAssignee = (personId) => {
    task.person = personId;
    panelKicker.textContent = personName(personId);
    saveState();
    render();
    renderAssigneeChips(assigneesBox, task.person, pickAssignee);
  };
  renderAssigneeChips(assigneesBox, task.person, pickAssignee);
  renderThread(task);
  renderAuthors();
  const finished = task.done;
  startNextButton.hidden = finished;
  closeOnlyButton.hidden = finished;
  reopenButton.hidden = !(finished && !task.nextId);
  overlay.hidden = false;
  titleInput.focus();
}

function renderLinks(task) {
  linksBox.replaceChildren();
  if (task.fromId && taskById(task.fromId)) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "quiet";
    button.textContent = `Из задачи «${taskById(task.fromId).title || "без названия"}»`;
    button.addEventListener("click", () => openPanel(task.fromId));
    linksBox.append(button);
  }
  if (task.nextId && taskById(task.nextId)) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "quiet";
    button.textContent = `Дальше: «${taskById(task.nextId).title || "без названия"}»`;
    button.addEventListener("click", () => openPanel(task.nextId));
    linksBox.append(button);
  }
}

function renderAssigneeChips(box, current, onPick) {
  box.replaceChildren();
  for (const person of PEOPLE) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = person.name;
    if (person.id === current) button.className = "is-current";
    button.addEventListener("click", () => onPick(person.id));
    box.append(button);
  }
}

function renderThread(task) {
  threadBox.replaceChildren();
  if (!task.thread.length) {
    const empty = document.createElement("p");
    empty.className = "empty-note";
    empty.textContent = "Пока никто ничего не записал.";
    threadBox.append(empty);
    return;
  }
  for (const entry of task.thread) {
    const block = document.createElement("article");
    block.className = "entry";
    const who = document.createElement("b");
    who.textContent = entry.author;
    const time = document.createElement("time");
    time.textContent = formatStamp(entry.at);
    const text = document.createElement("p");
    text.textContent = entry.text;
    block.append(who, time, text);
    threadBox.append(block);
  }
}

function renderAuthors() {
  authorsBox.replaceChildren();
  const names = [BOSS, ...PEOPLE.map((person) => person.name)];
  for (const name of names) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = name;
    if (name === draftAuthor) button.className = "is-current";
    button.addEventListener("click", () => {
      draftAuthor = name;
      renderAuthors();
    });
    authorsBox.append(button);
  }
}

function currentTask() {
  return openId ? taskById(openId) : null;
}

titleInput.addEventListener("input", () => {
  const task = currentTask();
  if (!task) return;
  task.title = titleInput.value;
  saveState();
  render();
});

noteInput.addEventListener("input", () => {
  const task = currentTask();
  if (!task) return;
  task.note = noteInput.value;
  saveState();
  render();
});

dueInput.addEventListener("change", () => {
  const task = currentTask();
  if (!task || !dueInput.value) return;
  task.due = dueInput.value;
  saveState();
  render();
});

document.querySelector("#add-entry").addEventListener("click", () => {
  const task = currentTask();
  const text = entryInput.value.trim();
  if (!task || !text) return;
  task.thread.push({ author: draftAuthor, text, at: new Date().toISOString() });
  entryInput.value = "";
  saveState();
  renderThread(task);
  render();
});

startNextButton.addEventListener("click", () => {
  const task = currentTask();
  if (!task || task.done) return;
  nextBox.hidden = false;
  nextTitle.value = task.title;
  nextPerson = task.person;
  const suggested = addDays(parseISO(task.due), 7);
  const soon = addDays(todayDate(), 2);
  nextDue.value = iso(task.due < iso(todayDate()) ? soon : suggested);
  const pickNext = (personId) => {
    nextPerson = personId;
    renderAssigneeChips(nextPeople, nextPerson, pickNext);
  };
  renderAssigneeChips(nextPeople, nextPerson, pickNext);
  nextTitle.focus();
});

document.querySelector("#spawn").addEventListener("click", () => {
  const task = currentTask();
  if (!task || task.done) return;
  const id = "t" + Math.random().toString(36).slice(2, 10);
  const created = makeTask({
    id,
    title: nextTitle.value.trim() || "Следующий этап",
    person: nextPerson || task.person,
    due: nextDue.value || iso(addDays(todayDate(), 7)),
    note: task.note,
    fromId: task.id,
    thread: task.thread.map((entry) => ({ ...entry })),
  });
  created.thread.push({
    author: draftAuthor,
    text: `Этап «${task.title || "без названия"}» закрыт. Это продолжение.`,
    at: new Date().toISOString(),
  });
  task.done = true;
  task.nextId = id;
  state.tasks.push(created);
  saveState();
  render();
  openPanel(id);
});

closeOnlyButton.addEventListener("click", () => {
  const task = currentTask();
  if (!task || task.done) return;
  if (!closeOnlyButton.classList.contains("is-armed")) {
    closeOnlyButton.classList.add("is-armed");
    closeOnlyButton.textContent = "Точно закрыть?";
    closeTimer = window.setTimeout(disarmClose, 6000);
    return;
  }
  task.done = true;
  saveState();
  render();
  openPanel(task.id);
});

reopenButton.addEventListener("click", () => {
  const task = currentTask();
  if (!task || task.nextId) return;
  task.done = false;
  saveState();
  render();
  openPanel(task.id);
});

deleteButton.addEventListener("click", () => {
  const task = currentTask();
  if (!task) return;
  if (!deleteButton.classList.contains("is-armed")) {
    deleteButton.classList.add("is-armed");
    deleteButton.textContent = "Точно убрать?";
    deleteTimer = window.setTimeout(disarmDelete, 6000);
    return;
  }
  state.tasks = state.tasks.filter((item) => item.id !== task.id);
  for (const item of state.tasks) {
    if (item.nextId === task.id) item.nextId = "";
    if (item.fromId === task.id) item.fromId = "";
  }
  saveState();
  closePanel();
  render();
});

function disarmDelete() {
  window.clearTimeout(deleteTimer);
  deleteButton.classList.remove("is-armed");
  deleteButton.textContent = "Убрать задачу";
}

function disarmClose() {
  window.clearTimeout(closeTimer);
  closeOnlyButton.classList.remove("is-armed");
  closeOnlyButton.textContent = "Закрыть без следующего этапа";
}

function closePanel() {
  openId = null;
  overlay.hidden = true;
  disarmDelete();
  disarmClose();
}

overlay.addEventListener("click", (event) => {
  if (event.target.closest("[data-close]")) closePanel();
});

document.querySelector("#prev-week").addEventListener("click", () => shiftWeek(-1));
document.querySelector("#next-week").addEventListener("click", () => shiftWeek(1));
thisWeekButton.addEventListener("click", () => {
  state.weekStart = iso(startOfWeek(todayDate()));
  saveState();
  render();
});
weekendsButton.addEventListener("click", () => {
  state.weekends = !state.weekends;
  saveState();
  render();
});

document.querySelector("#reset").addEventListener("click", (event) => {
  const button = event.currentTarget;
  if (!button.classList.contains("is-armed")) {
    button.classList.add("is-armed");
    button.textContent = "Точно вернуть пример";
    resetTimer = window.setTimeout(() => {
      button.classList.remove("is-armed");
      button.textContent = "Вернуть пример";
    }, 6000);
    return;
  }
  window.clearTimeout(resetTimer);
  button.classList.remove("is-armed");
  button.textContent = "Вернуть пример";
  state = createDemo();
  saveState();
  closePanel();
  render();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !overlay.hidden) closePanel();
});

render();
