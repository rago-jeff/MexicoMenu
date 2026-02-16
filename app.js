const MEAL_TYPES = ["breakfast", "lunch", "dinner"];
const STORAGE_KEY = "menu-picker-state-v1";
const DEFAULT_SESSION_ID = "punta-mita-2026";
const FIREBASE_CONFIG = window.MEXICO_MENU_FIREBASE_CONFIG || null;
const FIREBASE_SESSION_ID = sanitizeSessionId(
  window.MEXICO_MENU_SESSION_ID || DEFAULT_SESSION_ID
);
const DEFAULT_SCALE = [
  { points: -5, label: "I'm allergic or intolerant" },
  { points: 0, label: "Not my favorite" },
  { points: 1, label: "It's fine" },
  { points: 3, label: "I like this" },
  { points: 5, label: "My favorite for this meal" },
];
const PRESET_MENU_TEXT = `Breakfast
A. Scramble scrambled eggs with ham; Pancakes with maple syrup; Fruit (papaya, pineapple, watermelon, berries)
B. Ranchero eggs; French toast with maple syrup; Fruit (papaya, pineapple, watermelon, berries)
C. Mexican style eggs (scrambled with onion, tomato and pepper not spicy); Pancakes with maple syrup; Fruit (papaya, pineapple, watermelon, berries)
D. Red sauce chilaquiles with egg, fried or scrambled egg; Waffles with maple syrup; Fruit (papaya, pineapple, watermelon, berries)
E. Benedictine eggs with ham, cheese and avocado; Pancakes with maple syrup; Fruit (papaya, pineapple, watermelon, berries)
F. Vegetarian omelet (onion, tomato, mushrooms, spinach); French toast with maple syrup; Fruit (papaya, pineapple, watermelon, berries)
G. Machaca with refried beans (dried beef meat scrambled with eggs northern Mexican dish); Waffles with maple syrup; Fruit (papaya, pineapple, watermelon, berries)
H. Ranchero eggs; French toast with maple syrup; Fruit (papaya, pineapple, watermelon, berries)

Lunch
A. Pear & Cheese Salad; Coconut Shrimp with mango sauce; White Rice; Peache a la creme
B. Tropical Salad; Grilled Fish filet; Mexican (red) rice & pan seared vegetables; Flan
C. Tortilla Soup; Beef & Chicken Skewers; Cilantro Rice with vegetable cubes; Key lime Pie
D. Tarasca Soup; Flank Steak grilled when possible; Vegetable and potato wages; Guacamole with corn chips; Vanilla Ice Cream
E. Shrimp Ceviche; Mix Green Salad with lime vinaigrette; Zarandeado (grilled) Fish; Pan seared vegetable; White rice; Cheesecake
F. Fish Ceviche; Pan seared Tuna; White Rice; Asparragus & Cherry tomatoes; Caramel crepes
G. Mexican Salada; Cheese Quesadillas; Carne en su jugo (beef stew) with beans and bacon; Guacamole; Arroz con leche (rice pudding)
H. Sea food Grilled plater; Shrimp Empanadas; White rice & Asparagus; Churros
I. Burgers & Hot Dogs; French Fries; Classic burgers & hot dogs toppings; Guacamole; Chocolate Sunday
J. Caprese Salad; Pizzas (Peperoni, magherita, four cheese); Guacamole; Banana split

Dinner
A. Esquite (Mexican warm corn soup with cotija cheese); Shrimp & Fish tacos; Guacamole & Pico de Gallo; Strawberries a la creme
B. Pozole (Hominy soup wit pork or chicken); Taco TRIO (beef, chicken & chorizo) served with handmade corn tortillas; Guacamole & Pico de Gallo; Vanilla Sunday
C. Potato Soup; Grilled Plater (ribeye, chicken Brest, Chorizo); Grilled Vegetables; Guacamole & Pico de Gallo; Banana Split
D. Mixed Salad; Fajita night (Beef, chicken & shrimp); Cheese quesadillas; White rice with vegetables cubes; Guacamole & Pico de Gallo; Flan
E. Kreek Salad; Seafood Spaghetti with tomato sauce and parmesan cheese; Garlic bread; Crepes with apples and cinnamon
F. Tortilla Soup; Flank stake with Asparagus and potato wages; White Rice with vegetable cubes; Churros
G. Burrata Salad; Mahi Mahi & Roca Shrimp served with chipotle dressing; Saute Vegetables; Warm corn bread with vanilla ice cream
H. Creme of Asparagus; Filet Mignon; Mash potatoes & pan seared vegetables; Cheesecake with blackberry sauce
I. Sufi Salad; Surf & Turf (shrimp & ribeye); Potatoes & vegetables; Foccacia bread; Cheesecake
J. Shrimp Bisque; Surf & Turf ( Lobter & Filet Mignon); Potatoes gratinees; Asparagus; Brownie with vanilla ice cream`;
const PRESET_MENU = parseMenuText(PRESET_MENU_TEXT);

const defaultState = {
  menu: PRESET_MENU,
  scale: structuredClone(DEFAULT_SCALE),
  guests: [],
  scores: {},
};

let state = loadState();

const menuInput = document.getElementById("menuInput");
const menuStatus = document.getElementById("menuStatus");
const importMenuBtn = document.getElementById("importMenuBtn");
const resetMenuBtn = document.getElementById("resetMenuBtn");
const guestNameInput = document.getElementById("guestNameInput");
const addGuestBtn = document.getElementById("addGuestBtn");
const guestList = document.getElementById("guestList");
const votingArea = document.getElementById("votingArea");
const scaleInput = document.getElementById("scaleInput");
const scaleStatus = document.getElementById("scaleStatus");
const applyScaleBtn = document.getElementById("applyScaleBtn");
const resetScaleBtn = document.getElementById("resetScaleBtn");
const resultsArea = document.getElementById("resultsArea");
const syncStatus = document.getElementById("syncStatus");

const sync = {
  enabled: false,
  applyingRemoteState: false,
  initialized: false,
  docRef: null,
};

importMenuBtn.addEventListener("click", handleImportMenu);
resetMenuBtn.addEventListener("click", handleResetMenu);
addGuestBtn.addEventListener("click", handleAddGuest);
applyScaleBtn.addEventListener("click", handleApplyScale);
resetScaleBtn.addEventListener("click", handleResetScale);

guestNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    handleAddGuest();
  }
});

renderAll();
menuInput.value = PRESET_MENU_TEXT;
scaleInput.value = formatScaleText(state.scale);
initRemoteSync();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);
    const loaded = {
      menu: {
        breakfast: parsed.menu?.breakfast || [],
        lunch: parsed.menu?.lunch || [],
        dinner: parsed.menu?.dinner || [],
      },
      scale: normalizeScale(parsed.scale),
      guests: parsed.guests || [],
      scores: parsed.scores || {},
    };
    const hasAnyMenu =
      loaded.menu.breakfast.length > 0 ||
      loaded.menu.lunch.length > 0 ||
      loaded.menu.dinner.length > 0;
    if (!hasAnyMenu) {
      loaded.menu = structuredClone(PRESET_MENU);
    }
    return loaded;
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (sync.enabled && !sync.applyingRemoteState) {
    writeRemoteState();
  }
}

function renderAll() {
  renderGuests();
  renderVoting();
  renderResults();
}

function initRemoteSync() {
  if (!syncStatus) return;
  if (!FIREBASE_CONFIG || !window.firebase) {
    setSyncStatus("Local mode (not synced).");
    return;
  }
  if (sync.initialized) return;

  try {
    const app = window.firebase.apps?.length
      ? window.firebase.app()
      : window.firebase.initializeApp(FIREBASE_CONFIG);
    const db = window.firebase.firestore(app);
    sync.docRef = db.collection("menuSessions").doc(FIREBASE_SESSION_ID);
    sync.enabled = true;
    sync.initialized = true;
    setSyncStatus(`Connecting shared session: ${FIREBASE_SESSION_ID}...`);

    sync.docRef.onSnapshot(
      (snapshot) => {
        if (!snapshot.exists) {
          writeRemoteState();
          setSyncStatus(`Created shared session: ${FIREBASE_SESSION_ID}`);
          return;
        }

        const remoteState = parseRemoteState(snapshot.data());
        sync.applyingRemoteState = true;
        state = remoteState;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        renderAll();
        scaleInput.value = formatScaleText(state.scale);
        sync.applyingRemoteState = false;
        setSyncStatus(`Synced shared session: ${FIREBASE_SESSION_ID}`);
      },
      () => {
        setSyncStatus("Sync error. Using local mode.");
      }
    );
  } catch {
    setSyncStatus("Firebase setup issue. Using local mode.");
  }
}

function writeRemoteState() {
  if (!sync.enabled || !sync.docRef) return;

  sync.docRef
    .set({
      ...state,
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
    })
    .catch(() => {
      setSyncStatus("Sync write failed. Changes kept locally.");
    });
}

function handleImportMenu() {
  const text = menuInput.value.trim();
  if (!text) {
    setMenuStatus("Paste your menu text first.", true);
    return;
  }

  const parsed = parseMenuText(text);
  const totalOptions =
    parsed.breakfast.length + parsed.lunch.length + parsed.dinner.length;

  if (totalOptions === 0) {
    setMenuStatus("No menu options found. Check formatting and try again.", true);
    return;
  }

  state.menu = parsed;
  pruneInvalidScores();
  saveState();
  renderAll();
  setMenuStatus(`Imported ${totalOptions} menu options.`, false);
}

function handleResetMenu() {
  state.menu = { breakfast: [], lunch: [], dinner: [] };
  state.scores = {};
  saveState();
  renderAll();
  setMenuStatus("Menu and scores were reset.", false);
}

function handleAddGuest() {
  const name = guestNameInput.value.trim();
  if (!name) return;

  const exists = state.guests.some(
    (guest) => guest.name.toLowerCase() === name.toLowerCase()
  );
  if (exists) {
    guestNameInput.value = "";
    return;
  }

  state.guests.push({
    id: createId(),
    name,
  });
  guestNameInput.value = "";
  saveState();
  renderAll();
}

function handleApplyScale() {
  const parsed = parseScaleText(scaleInput.value);
  if (!parsed.ok) {
    setScaleStatus(parsed.error, true);
    return;
  }

  state.scale = parsed.scale;
  pruneScoresByScale();
  saveState();
  renderAll();
  scaleInput.value = formatScaleText(state.scale);
  setScaleStatus(`Applied ${state.scale.length} scoring choices.`, false);
}

function handleResetScale() {
  state.scale = structuredClone(DEFAULT_SCALE);
  pruneScoresByScale();
  saveState();
  renderAll();
  scaleInput.value = formatScaleText(state.scale);
  setScaleStatus("Score scale reset to default (0 to 5).", false);
}

function removeGuest(guestId) {
  state.guests = state.guests.filter((guest) => guest.id !== guestId);
  delete state.scores[guestId];
  saveState();
  renderAll();
}

function renderGuests() {
  guestList.innerHTML = "";

  if (state.guests.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No guests added yet.";
    li.className = "empty";
    guestList.appendChild(li);
    return;
  }

  state.guests.forEach((guest) => {
    const li = document.createElement("li");
    li.className = "guest-item";

    const nameSpan = document.createElement("span");
    nameSpan.textContent = guest.name;

    const removeBtn = document.createElement("button");
    removeBtn.className = "danger";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => removeGuest(guest.id));

    li.append(nameSpan, removeBtn);
    guestList.appendChild(li);
  });
}

function renderVoting() {
  const openGuestIds = new Set(
    Array.from(votingArea.querySelectorAll("details.guest-card[open]"))
      .map((el) => el.dataset.guestId)
      .filter(Boolean)
  );
  votingArea.innerHTML = "";
  const orderedScale = getScaleBestToWorst();

  const totalOptions = getAllOptions().length;
  if (totalOptions === 0) {
    votingArea.innerHTML = '<p class="empty">Import a menu to begin voting.</p>';
    return;
  }
  if (state.guests.length === 0) {
    votingArea.innerHTML = '<p class="empty">Add at least one guest.</p>';
    return;
  }

  state.guests.forEach((guest) => {
    const guestCard = document.createElement("details");
    guestCard.className = "guest-card";
    guestCard.dataset.guestId = guest.id;
    if (openGuestIds.has(guest.id)) {
      guestCard.open = true;
    }

    const title = document.createElement("summary");
    title.className = "guest-toggle";

    const nameWrap = document.createElement("span");
    nameWrap.className = "guest-name-wrap";

    const clickIcon = document.createElement("span");
    clickIcon.className = "guest-click-icon";
    clickIcon.textContent = "▶";

    const nameSpan = document.createElement("span");
    nameSpan.textContent = guest.name;
    nameSpan.className = "guest-name";
    nameWrap.append(clickIcon, nameSpan);

    const statusWrap = document.createElement("span");
    statusWrap.className = "guest-vote-status";

    const statusIcon = document.createElement("span");
    statusIcon.className = "vote-icon";
    statusIcon.dataset.guestIcon = guest.id;

    const statusText = document.createElement("span");
    statusText.className = "vote-text";
    statusText.dataset.guestText = guest.id;

    statusWrap.append(statusIcon, statusText);
    title.append(nameWrap, statusWrap);
    guestCard.appendChild(title);

    MEAL_TYPES.forEach((mealType) => {
      const options = state.menu[mealType];
      if (options.length === 0) return;

      const section = document.createElement("section");
      section.className = "meal-section";

      const heading = document.createElement("h4");
      heading.textContent = capitalize(mealType);
      section.appendChild(heading);

      options.forEach((option) => {
        const row = document.createElement("div");
        row.className = "option-row";

        const text = document.createElement("p");
        text.innerHTML = `<strong>${option.letter}</strong> ${escapeHtml(
          option.description
        )}`;

        const controls = document.createElement("div");
        controls.className = "score-buttons";

        orderedScale.forEach((choice) => {
          const id = `${guest.id}-${mealType}-${option.id}-${choice.points}`;
          const label = document.createElement("label");
          label.setAttribute("for", id);

          const input = document.createElement("input");
          input.type = "radio";
          input.name = `${guest.id}-${mealType}-${option.id}`;
          input.id = id;
          input.value = String(choice.points);
          input.dataset.guestId = guest.id;
          input.dataset.mealType = mealType;
          input.dataset.optionId = option.id;
          input.dataset.score = String(choice.points);
          input.checked =
            getScore(guest.id, mealType, option.id) === String(choice.points);
          input.addEventListener("change", () => {
            setScore(guest.id, mealType, option.id, String(choice.points));
          });

          label.append(
            input,
            document.createTextNode(`${choice.label} (${choice.points})`)
          );
          controls.appendChild(label);
        });

        row.append(text, controls);
        section.appendChild(row);
      });

      guestCard.appendChild(section);
    });

    votingArea.appendChild(guestCard);
    updateGuestVoteStatus(guest.id);
  });
}

function getScaleBestToWorst() {
  return [...state.scale].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return a.label.localeCompare(b.label);
  });
}

function renderResults() {
  resultsArea.innerHTML = "";

  const options = getAllOptions();
  if (options.length === 0) {
    resultsArea.innerHTML = '<p class="empty">No results yet.</p>';
    return;
  }

  MEAL_TYPES.forEach((mealType) => {
    const mealOptions = state.menu[mealType];
    if (mealOptions.length === 0) return;

    const wrapper = document.createElement("section");
    wrapper.className = "result-section";

    const heading = document.createElement("h3");
    heading.textContent = capitalize(mealType);
    wrapper.appendChild(heading);

    const ranking = mealOptions
      .map((option) => {
        let total = 0;
        let votes = 0;

        state.guests.forEach((guest) => {
          const score = getScore(guest.id, mealType, option.id);
          if (score !== undefined) {
            total += Number(score);
            votes += 1;
          }
        });

        return {
          option,
          total,
          votes,
          average: votes > 0 ? total / votes : 0,
        };
      })
      .sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        if (b.average !== a.average) return b.average - a.average;
        return a.option.letter.localeCompare(b.option.letter);
      });

    const table = document.createElement("table");
    table.innerHTML = `
      <thead>
        <tr>
          <th>Rank</th>
          <th>Option</th>
          <th>Points</th>
          <th>Avg</th>
          <th>Votes</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector("tbody");
    ranking.forEach((item, index) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td><strong>${item.option.letter}</strong> ${escapeHtml(
        item.option.description
      )}</td>
        <td>${item.total}</td>
        <td>${item.average.toFixed(2)}</td>
        <td>${item.votes}</td>
      `;
      tbody.appendChild(tr);
    });

    wrapper.appendChild(table);
    resultsArea.appendChild(wrapper);
  });
}

function setScore(guestId, mealType, optionId, score) {
  if (!state.scores[guestId]) state.scores[guestId] = {};
  if (!state.scores[guestId][mealType]) state.scores[guestId][mealType] = {};
  state.scores[guestId][mealType][optionId] = score;

  const favoriteChoice = getHighestPointChoice();
  if (
    favoriteChoice &&
    String(favoriteChoice.points) === String(score)
  ) {
    clearOtherFavoriteForMeal(
      guestId,
      mealType,
      optionId,
      String(favoriteChoice.points)
    );
  }

  saveState();
  updateGuestVoteStatus(guestId);
  renderResults();
}

function getScore(guestId, mealType, optionId) {
  return state.scores?.[guestId]?.[mealType]?.[optionId];
}

function pruneInvalidScores() {
  const valid = new Set(
    getAllOptions().map((option) => `${option.mealType}:${option.id}`)
  );

  Object.keys(state.scores).forEach((guestId) => {
    Object.keys(state.scores[guestId] || {}).forEach((mealType) => {
      Object.keys(state.scores[guestId][mealType] || {}).forEach((optionId) => {
        if (!valid.has(`${mealType}:${optionId}`)) {
          delete state.scores[guestId][mealType][optionId];
        }
      });
    });
  });

  pruneScoresByScale();
}

function pruneScoresByScale() {
  const validPoints = new Set(state.scale.map((choice) => String(choice.points)));
  Object.keys(state.scores).forEach((guestId) => {
    Object.keys(state.scores[guestId] || {}).forEach((mealType) => {
      Object.keys(state.scores[guestId][mealType] || {}).forEach((optionId) => {
        const score = state.scores[guestId][mealType][optionId];
        if (!validPoints.has(String(score))) {
          delete state.scores[guestId][mealType][optionId];
        }
      });
    });
  });
}

function getAllOptions() {
  return MEAL_TYPES.flatMap((mealType) =>
    state.menu[mealType].map((option) => ({ ...option, mealType }))
  );
}

function getHighestPointChoice() {
  if (!Array.isArray(state.scale) || state.scale.length === 0) return null;
  return state.scale.reduce((highest, choice) =>
    choice.points > highest.points ? choice : highest
  );
}

function clearOtherFavoriteForMeal(
  guestId,
  mealType,
  selectedOptionId,
  favoritePoints
) {
  const mealScores = state.scores?.[guestId]?.[mealType];
  if (!mealScores) return;

  Object.keys(mealScores).forEach((optionId) => {
    if (
      optionId !== selectedOptionId &&
      String(mealScores[optionId]) === String(favoritePoints)
    ) {
      delete mealScores[optionId];
    }
  });

  const favoriteInputs = document.querySelectorAll(
    `input[data-guest-id="${guestId}"][data-meal-type="${mealType}"][data-score="${favoritePoints}"]`
  );
  favoriteInputs.forEach((input) => {
    if (input.dataset.optionId !== selectedOptionId) {
      input.checked = false;
    }
  });
}

function getGuestVoteProgress(guestId) {
  const total = getAllOptions().length;
  let filled = 0;

  MEAL_TYPES.forEach((mealType) => {
    state.menu[mealType].forEach((option) => {
      if (getScore(guestId, mealType, option.id) !== undefined) {
        filled += 1;
      }
    });
  });

  return {
    filled,
    total,
    isComplete: total > 0 && filled === total,
  };
}

function updateGuestVoteStatus(guestId) {
  const iconEl = document.querySelector(`[data-guest-icon="${guestId}"]`);
  const textEl = document.querySelector(`[data-guest-text="${guestId}"]`);
  if (!iconEl || !textEl) return;

  const progress = getGuestVoteProgress(guestId);
  iconEl.textContent = progress.isComplete ? "✓" : "!";
  iconEl.className = `vote-icon ${progress.isComplete ? "complete" : "pending"}`;
  textEl.textContent = progress.isComplete
    ? `Complete (${progress.filled}/${progress.total})`
    : `Needs votes (${progress.filled}/${progress.total})`;
}

function parseMenuText(text) {
  const parsed = {
    breakfast: [],
    lunch: [],
    dinner: [],
  };

  let currentMeal = null;
  const lines = text.split(/\r?\n/);

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) return;

    const mealMatch = line.match(/^(breakfast|lunch|dinner)\s*:?\s*$/i);
    if (mealMatch) {
      currentMeal = mealMatch[1].toLowerCase();
      return;
    }

    if (!currentMeal) return;

    const optionMatch = line.match(/^([A-Z])[\.\)\-\:]\s*(.+)$/i);
    if (!optionMatch) return;

    parsed[currentMeal].push({
      id: createId(),
      letter: optionMatch[1].toUpperCase(),
      description: optionMatch[2].trim(),
    });
  });

  return parsed;
}

function setMenuStatus(message, isError) {
  menuStatus.textContent = message;
  menuStatus.className = `status ${isError ? "error" : "ok"}`;
}

function setScaleStatus(message, isError) {
  scaleStatus.textContent = message;
  scaleStatus.className = `status ${isError ? "error" : "ok"}`;
}

function setSyncStatus(message) {
  if (!syncStatus) return;
  syncStatus.textContent = message;
}

function parseRemoteState(raw) {
  const menu = {
    breakfast: Array.isArray(raw?.menu?.breakfast) ? raw.menu.breakfast : [],
    lunch: Array.isArray(raw?.menu?.lunch) ? raw.menu.lunch : [],
    dinner: Array.isArray(raw?.menu?.dinner) ? raw.menu.dinner : [],
  };

  const hasAnyMenu =
    menu.breakfast.length > 0 || menu.lunch.length > 0 || menu.dinner.length > 0;

  return {
    menu: hasAnyMenu ? menu : structuredClone(PRESET_MENU),
    scale: normalizeScale(raw?.scale),
    guests: Array.isArray(raw?.guests) ? raw.guests : [],
    scores: raw?.scores && typeof raw.scores === "object" ? raw.scores : {},
  };
}

function normalizeScale(scale) {
  if (!Array.isArray(scale) || scale.length === 0) {
    return structuredClone(DEFAULT_SCALE);
  }

  const normalized = scale
    .map((item) => ({
      points: Number(item?.points),
      label: String(item?.label ?? "").trim(),
    }))
    .filter(
      (item) =>
        Number.isFinite(item.points) &&
        item.label &&
        !Number.isNaN(item.points)
    );

  if (normalized.length === 0) {
    return structuredClone(DEFAULT_SCALE);
  }

  const uniquePoints = new Set(normalized.map((item) => String(item.points)));
  if (uniquePoints.size !== normalized.length) {
    return structuredClone(DEFAULT_SCALE);
  }

  return normalized;
}

function parseScaleText(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  const scale = [];
  const seen = new Set();

  for (const line of lines) {
    if (!line) continue;

    const parts = line.split("=");
    if (parts.length < 2) {
      return { ok: false, error: `Invalid line "${line}". Use points=label.` };
    }

    const points = Number(parts[0].trim());
    const label = parts.slice(1).join("=").trim();

    if (!Number.isFinite(points)) {
      return { ok: false, error: `Invalid points value in "${line}".` };
    }
    if (!label) {
      return { ok: false, error: `Missing label in "${line}".` };
    }
    if (seen.has(String(points))) {
      return { ok: false, error: `Duplicate points value "${points}".` };
    }

    seen.add(String(points));
    scale.push({ points, label });
  }

  if (scale.length === 0) {
    return { ok: false, error: "Add at least one scoring choice." };
  }

  return { ok: true, scale };
}

function formatScaleText(scale) {
  return scale.map((choice) => `${choice.points}=${choice.label}`).join("\n");
}

function sanitizeSessionId(value) {
  const cleaned = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || DEFAULT_SESSION_ID;
}

function createId() {
  return Math.random().toString(36).slice(2, 10);
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
