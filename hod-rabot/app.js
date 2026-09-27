const STORAGE_KEY = "stol-beatrice-v2";

const PEOPLE = [
  { name: "Алина", role: "заявки" },
  { name: "Игорь", role: "склад" },
  { name: "Марина", role: "сборка" },
  { name: "Олег", role: "отгрузка" },
  { name: "Света", role: "акции" },
  { name: "Настя", role: "обучение" },
];

const board = document.querySelector("#board");
const projectsNav = document.querySelector("#projects");
const overlay = document.querySelector("#overlay");
const resetButton = document.querySelector("#reset");
const titleInput = document.querySelector("#title-input");
const noteInput = document.querySelector("#note-input");
const remindButton = document.querySelector("#remind-btn");
const laterNote = document.querySelector("#later");
const deleteButton = document.querySelector("#delete-btn");
const panelKicker = document.querySelector("#panel-kicker");
const peopleList = document.querySelector("#people-list");

let state = loadState();
let openId = null;
let dragSession = null;
let resetTimer = 0;
let deleteTimer = 0;

function boardColumns(ids) {
  return [
    { id: "requests", title: "Заявки", cardIds: ids.requests || [] },
    { id: "stock", title: "Наличие", cardIds: ids.stock || [] },
    { id: "pick", title: "Сборка", cardIds: ids.pick || [] },
    { id: "ship", title: "Отгрузка", cardIds: ids.ship || [] },
    { id: "promo", title: "Акции", cardIds: ids.promo || [] },
  ];
}

function createDemo() {
  return {
    projectId: "cabinets",
    projects: [
      {
        id: "cabinets",
        title: "Кабинеты",
        columns: boardColumns({ requests: ["c2"], stock: ["c4"], ship: ["c8", "c9"] }),
      },
      {
        id: "wb",
        title: "Wildberries",
        columns: boardColumns({ requests: ["c1"], pick: ["c6"] }),
      },
      {
        id: "ozon",
        title: "Ozon",
        columns: boardColumns({ requests: ["c3"], stock: ["c12"] }),
      },
      {
        id: "phyris",
        title: "PHYRIS, сезон",
        columns: boardColumns({ stock: ["c5"], promo: ["c10"] }),
      },
      {
        id: "school",
        title: "Обучение",
        columns: boardColumns({ pick: ["c7"], promo: ["c11"] }),
      },
    ],
    cards: {
      c1: {
        id: "c1",
        title: "Новосибирск, Фрунзе — PHYRIS, фаза 2",
        note: "Косметолог спросила в чате Wildberries: шесть средств фазы 2. Хотят забрать на этой неделе.",
        remind: false,
        person: "Алина",
      },
      c2: {
        id: "c2",
        title: "Краснодар, снова FixDerma",
        note: "Тот же набор, что в августе. Салон на Коммунаров. Пока просто не потерять заявку.",
        remind: false,
        person: "Алина",
      },
      c3: {
        id: "c3",
        title: "Сочи, вопрос по Ceuticoz",
        note: "На Ozon косметолог спрашивает, есть ли сыворотка 30 мл. Ответ ещё не написали.",
        remind: false,
        person: "Алина",
      },
      c4: {
        id: "c4",
        title: "Ceuticoz, крем 50 мл — осталось мало",
        note: "В заявке восемь штук, на полке четыре. Решать: отдать что есть или подождать поставку.",
        remind: false,
        person: "Игорь",
      },
      c5: {
        id: "c5",
        title: "Тоник PHYRIS, фаза 1",
        note: "Коробка в пути. На неё уже две заявки, в том числе кабинет в Уфе.",
        remind: false,
        person: "Игорь",
      },
      c6: {
        id: "c6",
        title: "Пятигорск, коробка для Wildberries",
        note: "Почти собрана: сыворотка Magiray и два крема. Нет вкладыша с составом.",
        remind: false,
        person: "Марина",
      },
      c7: {
        id: "c7",
        title: "Пробники к вебинару",
        note: "Небольшой набор Magiray. Раздать в офисе на Долгоруковской, не отправлять.",
        remind: false,
        person: "Настя",
      },
      c8: {
        id: "c8",
        title: "Томск, отдать завтра",
        note: "Транспортная компания. Адрес: площадь Батенькова, 2, офис 214.",
        remind: false,
        person: "Олег",
      },
      c9: {
        id: "c9",
        title: "Самовывоз после четырёх",
        note: "Косметолог приедет на Долгоруковскую, 40с5. Коробка стоит у склада.",
        remind: false,
        person: "",
      },
      c10: {
        id: "c10",
        title: "Набор «Три фазы» на сентябрь",
        note: "Черновик текста для карточки на маркетплейсе. Цену ещё не сверили.",
        remind: false,
        person: "Света",
      },
      c11: {
        id: "c11",
        title: "Кому напомнить про семинар",
        note: "Бесплатный вебинар для косметологов. Список салонов есть, приглашение ещё не ушло.",
        remind: true,
        person: "Настя",
      },
      c12: {
        id: "c12",
        title: "Ceuticoz, сыворотка 30 мл",
        note: "Тот же вопрос из Сочи. На полке ещё не смотрели.",
        remind: false,
        person: "Игорь",
      },
    },
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDemo();
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.projects) || !data.cards || !data.projectId) return createDemo();
    if (!data.projects.some((project) => project.id === data.projectId)) return createDemo();
    return data;
  } catch {
    return createDemo();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function currentProject() {
  return state.projects.find((project) => project.id === state.projectId) || state.projects[0];
}

function columnOf(cardId) {
  return currentProject().columns.find((column) => column.cardIds.includes(cardId));
}

function projectCardCount(project) {
  return project.columns.reduce(
    (sum, column) => sum + column.cardIds.filter((id) => state.cards[id]).length,
    0,
  );
}

function render() {
  renderProjects();
  board.replaceChildren();
  for (const column of currentProject().columns) {
    board.append(renderColumn(column));
  }
}

function renderProjects() {
  projectsNav.replaceChildren();
  const activeId = currentProject().id;
  for (const project of state.projects) {
    const button = document.createElement("button");
    button.type = "button";
    if (project.id === activeId) button.className = "is-current";
    button.setAttribute("aria-pressed", project.id === activeId ? "true" : "false");
    button.append(document.createTextNode(project.title));
    const count = document.createElement("span");
    count.className = "count";
    count.textContent = String(projectCardCount(project));
    button.append(count);
    button.addEventListener("click", () => openProject(project.id));
    projectsNav.append(button);
  }
}

function openProject(projectId) {
  if (projectId === currentProject().id) return;
  state.projectId = projectId;
  saveState();
  closePanel();
  render();
}

function renderColumn(column) {
  const section = document.createElement("section");
  section.className = "column";
  section.dataset.column = column.id;

  const head = document.createElement("div");
  head.className = "column-head";
  const title = document.createElement("h2");
  title.textContent = column.title;
  const count = document.createElement("span");
  count.className = "count";
  const ids = column.cardIds.filter((id) => state.cards[id]);
  count.textContent = String(ids.length);
  head.append(title, count);

  const list = document.createElement("div");
  list.className = "cards";
  for (const id of ids) list.append(renderCard(state.cards[id]));

  const add = document.createElement("button");
  add.type = "button";
  add.className = "add";
  add.textContent = "Новая карточка";
  add.addEventListener("click", () => addCard(column.id));

  section.append(head, list, add);
  return section;
}

function renderCard(card) {
  const article = document.createElement("article");
  article.className = "card";
  article.dataset.card = card.id;
  article.draggable = false;

  const title = document.createElement("h3");
  title.className = "card-title";
  const cleanTitle = card.title.trim();
  if (!cleanTitle) title.classList.add("is-empty");
  title.textContent = cleanTitle || "Без названия";
  article.append(title);

  if (card.note.trim()) {
    const note = document.createElement("p");
    note.className = "card-note";
    note.textContent = card.note.trim();
    article.append(note);
  }

  if (card.person) {
    const who = document.createElement("p");
    who.className = "who";
    who.textContent = "ведёт " + card.person;
    article.append(who);
  }

  if (card.remind) {
    const mark = document.createElement("p");
    mark.className = "remind-mark";
    mark.textContent = "напомнить";
    article.append(mark);
  }

  bindDrag(article, card.id);
  return article;
}

function refreshCard(cardId) {
  const current = board.querySelector(`[data-card="${cardId}"]`);
  const card = state.cards[cardId];
  if (!current || !card) return;
  current.replaceWith(renderCard(card));
}

function addCard(columnId) {
  const id = "c" + Math.random().toString(36).slice(2, 10);
  state.cards[id] = { id, title: "", note: "", remind: false, person: "" };
  const column = currentProject().columns.find((item) => item.id === columnId);
  column.cardIds.push(id);
  saveState();
  render();
  openPanel(id);
  const fresh = board.querySelector(`[data-card="${id}"]`);
  if (fresh) fresh.scrollIntoView({ block: "nearest" });
}

function moveCard(cardId, toColumnId, toIndex) {
  const from = columnOf(cardId);
  if (!from) return;
  from.cardIds = from.cardIds.filter((id) => id !== cardId);
  const target = currentProject().columns.find((column) => column.id === toColumnId);
  const index = Math.max(0, Math.min(toIndex, target.cardIds.length));
  target.cardIds.splice(index, 0, cardId);
  saveState();
  render();
  if (openId === cardId) panelKicker.textContent = target.title;
}

function deleteCard(cardId) {
  const column = columnOf(cardId);
  if (column) column.cardIds = column.cardIds.filter((id) => id !== cardId);
  delete state.cards[cardId];
  saveState();
  closePanel();
  render();
}

function bindDrag(article, cardId) {
  article.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || dragSession) return;
    event.preventDefault();

    const pointerId = event.pointerId;
    const startX = event.clientX;
    const startY = event.clientY;
    const offsetX = event.clientX - article.getBoundingClientRect().left;
    const offsetY = event.clientY - article.getBoundingClientRect().top;
    let active = false;
    let placeholder = null;
    let ghost = null;
    let cancelled = false;
    let done = false;

    const beginDrag = () => {
      if (active) return;
      active = true;
      document.body.classList.add("is-dragging");
      placeholder = document.createElement("div");
      placeholder.className = "placeholder";
      placeholder.style.height = article.offsetHeight + "px";
      article.before(placeholder);
      ghost = article.cloneNode(true);
      ghost.removeAttribute("data-card");
      ghost.classList.add("ghost");
      ghost.style.width = article.offsetWidth + "px";
      document.body.append(ghost);
      article.style.display = "none";
    };

    const track = (clientX, clientY) => {
      ghost.style.left = clientX - offsetX + "px";
      ghost.style.top = clientY - offsetY + "px";
      placePlaceholder(clientX, clientY, placeholder);
    };

    const finish = () => {
      if (done) return;
      done = true;
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      document.body.classList.remove("is-dragging");
      document.querySelectorAll(".column.is-target").forEach((item) => {
        item.classList.remove("is-target");
      });
      dragSession = null;

      if (!active) {
        if (!cancelled) openPanel(cardId);
        return;
      }

      const columnEl = placeholder.closest(".column");
      const list = placeholder.parentElement;
      const index = slotIndex(list, placeholder);
      ghost.remove();
      placeholder.remove();
      article.style.display = "";

      if (!cancelled && columnEl) moveCard(cardId, columnEl.dataset.column, index);
    };

    const onMove = (ev) => {
      if (ev.pointerId !== pointerId) return;
      if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < 5) return;
      beginDrag();
      track(ev.clientX, ev.clientY);
    };

    const onUp = (ev) => {
      const moved = Math.hypot(ev.clientX - startX, ev.clientY - startY) >= 5;
      if (moved) {
        beginDrag();
        track(ev.clientX, ev.clientY);
      }
      finish();
    };

    dragSession = {
      cancel() {
        cancelled = true;
      },
      finish,
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
  });
}

function placePlaceholder(clientX, clientY, placeholder) {
  const under = document.elementFromPoint(clientX, clientY);
  let column = under && under.closest(".column");
  if (!column) {
    column = [...document.querySelectorAll(".column")].find((item) => {
      const rect = item.getBoundingClientRect();
      return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
    });
  }
  if (!column) return;

  document.querySelectorAll(".column").forEach((item) => {
    item.classList.toggle("is-target", item === column);
  });

  const list = column.querySelector(".cards");
  const cards = [...list.querySelectorAll(".card")].filter((card) => card.style.display !== "none");
  let next = null;
  for (const card of cards) {
    const rect = card.getBoundingClientRect();
    if (clientY < rect.top + rect.height / 2) {
      next = card;
      break;
    }
  }
  if (next) list.insertBefore(placeholder, next);
  else list.append(placeholder);
}

function slotIndex(list, placeholder) {
  let index = 0;
  for (const child of list.children) {
    if (child === placeholder) return index;
    if (child.classList.contains("card") && child.style.display !== "none") index += 1;
  }
  return index;
}

function openPanel(cardId) {
  const card = state.cards[cardId];
  const column = columnOf(cardId);
  if (!card || !column) return;
  openId = cardId;
  panelKicker.textContent = column.title;
  titleInput.value = card.title;
  noteInput.value = card.note;
  laterNote.hidden = !card.remind;
  renderPeople(card);
  disarmDelete();
  overlay.hidden = false;
  titleInput.focus();
}

function closePanel() {
  openId = null;
  overlay.hidden = true;
  disarmDelete();
}

function currentCard() {
  return openId ? state.cards[openId] : null;
}

function renderPeople(card) {
  peopleList.replaceChildren();
  for (const person of PEOPLE) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "person" + (card.person === person.name ? " is-current" : "");
    button.append(document.createTextNode(person.name));
    const role = document.createElement("small");
    role.textContent = person.role;
    button.append(role);
    button.addEventListener("click", () => {
      setPerson(card.id, card.person === person.name ? "" : person.name);
    });
    peopleList.append(button);
  }
}

function setPerson(cardId, name) {
  const card = state.cards[cardId];
  if (!card) return;
  card.person = name;
  saveState();
  refreshCard(cardId);
  renderPeople(card);
}

titleInput.addEventListener("input", () => {
  const card = currentCard();
  if (!card) return;
  card.title = titleInput.value;
  saveState();
  refreshCard(card.id);
});

noteInput.addEventListener("input", () => {
  const card = currentCard();
  if (!card) return;
  card.note = noteInput.value;
  saveState();
  refreshCard(card.id);
});

remindButton.addEventListener("click", () => {
  const card = currentCard();
  if (!card) return;
  card.remind = true;
  saveState();
  laterNote.hidden = false;
  refreshCard(card.id);
});

deleteButton.addEventListener("click", () => {
  if (!openId) return;
  if (!deleteButton.classList.contains("is-armed")) {
    deleteButton.classList.add("is-armed");
    deleteButton.textContent = "Точно убрать?";
    deleteTimer = window.setTimeout(disarmDelete, 6000);
    return;
  }
  deleteCard(openId);
});

function disarmDelete() {
  window.clearTimeout(deleteTimer);
  deleteButton.classList.remove("is-armed");
  deleteButton.textContent = "Убрать карточку";
}

overlay.addEventListener("click", (event) => {
  if (event.target.closest("[data-close]")) closePanel();
});

resetButton.addEventListener("click", () => {
  if (!resetButton.classList.contains("is-armed")) {
    resetButton.classList.add("is-armed");
    resetButton.textContent = "Точно вернуть пример";
    resetTimer = window.setTimeout(() => {
      resetButton.classList.remove("is-armed");
      resetButton.textContent = "Вернуть пример";
    }, 6000);
    return;
  }
  window.clearTimeout(resetTimer);
  resetButton.classList.remove("is-armed");
  resetButton.textContent = "Вернуть пример";
  state = createDemo();
  saveState();
  closePanel();
  render();
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (dragSession) {
    dragSession.cancel();
    dragSession.finish();
    return;
  }
  if (!overlay.hidden) closePanel();
});

render();
