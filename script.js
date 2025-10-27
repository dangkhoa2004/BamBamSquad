// ====== STATE (2x3) ======
const state = {
  rows: 2,
  cols: 3,
  slots: [],
  petSlots: Array(3).fill(null),
  tab: "champ",
};
function $(sel, root = document) {
  return root.querySelector(sel);
}
function $all(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}
// Paths for GitHub Pages
function repoBase() {
  if (location.hostname.endsWith("github.io")) {
    const p = location.pathname.split("/").filter(Boolean);
    return p.length ? "/" + p[0] + "/" : "/";
  }
  return "/";
}
function toAsset(p) {
  if (!p || /^https?:|^data:/.test(p)) return p;
  return repoBase() + String(p).replace(/^\//, "");
}

// Data
let TRAIT_THRESHOLDS = {},
  CHAMPIONS = [],
  PETS = [];
// Load data
async function loadData() {
  let files = [];
  try {
    const res = await fetch(new URL("traits_manifest.json", location.href), {
      cache: "no-cache",
    });
    if (res.ok) {
      const man = await res.json();
      if (Array.isArray(man.files)) files = man.files;
    }
  } catch (e) {
    console.warn("manifest", e);
  }
  if (!files.length && Array.isArray(window.MANIFEST_FILES))
    files = window.MANIFEST_FILES;
  if (!files.length) throw new Error("Không có file dữ liệu.");
  const parts = [];
  for (const p of files) {
    try {
      const r = await fetch(new URL(p, location.href), { cache: "no-cache" });
      if (!r.ok) continue;
      parts.push(await r.json());
    } catch (e) {
      console.warn("json", p, e);
    }
  }
  if (!parts.length) throw new Error("Không tải được dữ liệu.");
  TRAIT_THRESHOLDS = parts.reduce(
    (a, c) => ({ ...a, ...(c.trait_thresholds || {}) }),
    {}
  );
  const sc = new Map();
  parts.forEach((cur) =>
    (cur.champions || []).forEach((ch) => {
      if (!sc.has(ch.id)) sc.set(ch.id, ch);
    })
  );
  CHAMPIONS = [...sc.values()];
  const sp = new Map();
  parts.forEach((cur) =>
    (cur.pets || []).forEach((pt) => {
      if (!sp.has(pt.id)) sp.set(pt.id, pt);
    })
  );
  PETS = [...sp.values()];
}
// Templates
function createSlotEl() {
  const el = document.createElement("div");
  el.className =
    "slot relative aspect-square rounded-xl bg-slate-100 border flex items-center justify-center";
  el.innerHTML = `<img class="w-full h-full object-cover rounded-xl pointer-events-none hidden"/><div class="absolute inset-0 rounded-xl"></div>`;
  return el;
}
function setupDropTarget(el, area) {
  el.addEventListener("dragover", (e) => {
    e.preventDefault();
    el.classList.add("drop-target");
  });
  el.addEventListener("dragleave", () => el.classList.remove("drop-target"));
  el.addEventListener("drop", (e) => {
    e.preventDefault();
    el.classList.remove("drop-target");
    const payload = JSON.parse(
      e.dataTransfer.getData("application/json") || "{}"
    );
    if (payload.kind === "champ" && area === "board") {
      handleDropChampion(payload, { r: +el.dataset.row, c: +el.dataset.col });
    } else if (payload.kind === "pet" && area === "pet") {
      handleDropPet(payload, +el.dataset.pet);
    }
  });
  el.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    if ("row" in el.dataset) {
      state.slots[+el.dataset.row][+el.dataset.col] = null;
      paintBoard();
    } else {
      state.petSlots[+el.dataset.pet] = null;
      paintPets();
    }
    updateSynergies();
  });
  el.setAttribute("draggable", "true");
  el.addEventListener("dragstart", (e) => {
    const hasImg = !el.querySelector("img").classList.contains("hidden");
    if (!hasImg) {
      e.preventDefault();
      return;
    }
    if ("row" in el.dataset) {
      const r = +el.dataset.row,
        c = +el.dataset.col,
        id = state.slots[r][c];
      e.dataTransfer.setData(
        "application/json",
        JSON.stringify({ kind: "champ", id, from: "board", r, c })
      );
      e.dataTransfer.effectAllowed = "move";
    } else {
      const idx = +el.dataset.pet,
        id = state.petSlots[idx];
      e.dataTransfer.setData(
        "application/json",
        JSON.stringify({ kind: "pet", id, from: "pet", idx })
      );
      e.dataTransfer.effectAllowed = "move";
    }
    el.classList.add("dragging");
  });
  el.addEventListener("dragend", () => el.classList.remove("dragging"));
}
function renderBoard() {
  const board = $("#board");
  board.className = "grid gap-2 grid-cols-3";
  board.innerHTML = "";
  state.slots = [];
  for (let r = 0; r < state.rows; r++) {
    const row = [];
    for (let c = 0; c < state.cols; c++) {
      const el = createSlotEl();
      el.dataset.row = r;
      el.dataset.col = c;
      setupDropTarget(el, "board");
      board.appendChild(el);
      row.push(null);
    }
    state.slots.push(row);
  }
}
function renderPets() {
  const wrap = $("#petSlots");
  wrap.innerHTML = "";
  for (let i = 0; i < state.petSlots.length; i++) {
    const el = createSlotEl();
    el.dataset.pet = i;
    setupDropTarget(el, "pet");
    wrap.appendChild(el);
  }
}
function paintSlot(cell, data) {
  const img = cell.querySelector("img");
  if (data) {
    img.src = toAsset(data.img);
    img.alt = data.title || "";
    img.classList.remove("hidden");
    cell.title = data.title || "";
  } else {
    img.src = "";
    img.alt = "";
    img.classList.add("hidden");
    cell.title = "";
  }
}
function paintBoard() {
  $all("#board .slot").forEach((cell) => {
    const r = +cell.dataset.row,
      c = +cell.dataset.col,
      id = state.slots[r][c];
    const ch = CHAMPIONS.find((x) => x.id === id);
    paintSlot(
      cell,
      id
        ? {
            img: ch?.img || "",
            title: ch ? `${ch.name}\n${ch.traits.join(" · ")}` : "",
          }
        : null
    );
  });
}
function paintPets() {
  $all("#petSlots .slot").forEach((cell, i) => {
    const id = state.petSlots[i];
    const pet = PETS.find((x) => x.id === id);
    paintSlot(
      cell,
      id
        ? {
            img: pet?.img || "",
            title: pet ? `${pet.name}\n+1 ${pet.trait}` : "",
          }
        : null
    );
  });
}
function makeCard(item, kind) {
  const card = document.createElement("div");
  card.className = "card group select-none";
  card.innerHTML = `<div draggable="true" class="dragger block rounded-xl overflow-hidden border hover:shadow transition"><img class="w-full aspect-square object-cover" alt=""/></div><div class="mt-1 flex items-center justify-between gap-2"><div class="min-w-0"><p class="text-sm font-semibold truncate name"></p><p class="text-[11px] text-slate-500 truncate traits"></p></div></div>`;
  const img = card.querySelector("img");
  img.src = toAsset(item.img);
  img.alt = item.name;
  const dragger = card.querySelector(".dragger");
  dragger.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({ kind, id: item.id, from: "gallery" })
    );
    e.dataTransfer.effectAllowed = "copyMove";
    dragger.classList.add("dragging");
  });
  dragger.addEventListener("dragend", () =>
    dragger.classList.remove("dragging")
  );
  card.querySelector(".name").textContent = item.name;
  card.querySelector(".traits").textContent =
    kind === "champ" ? item.traits.join(" · ") : `+1 ${item.trait}`;
  card.title =
    kind === "champ"
      ? `${item.name}\n${item.traits.join(" · ")}`
      : `${item.name}\n+1 ${item.trait}`;
  return card;
}
function renderTraitChips() {
  const box = $("#traitFilters");
  const traits = new Set();
  CHAMPIONS.forEach((ch) => ch.traits.forEach((t) => traits.add(t)));
  PETS.forEach((p) => traits.add(p.trait));
  box.innerHTML = "";
  [...traits].sort().forEach((t) => {
    const btn = document.createElement("button");
    btn.className = "chip px-3 py-1 rounded-full border bg-white text-sm";
    btn.textContent = t;
    btn.dataset.trait = t;
    btn.addEventListener("click", () => {
      btn.classList.toggle("active");
      renderGallery();
    });
    box.appendChild(btn);
  });
}
function renderGallery() {
  const gal = $("#gallery");
  gal.innerHTML = "";
  const term = $("#searchInput").value.trim().toLowerCase();
  const actives = new Set(
    [...$all("#traitFilters .chip.active")].map((x) => x.dataset.trait)
  );
  const isChamp = state.tab === "champ";
  const list = (isChamp ? CHAMPIONS : PETS).filter((it) => {
    const hay = isChamp
      ? (it.name + " " + it.traits.join(" ")).toLowerCase()
      : (it.name + " " + it.trait).toLowerCase();
    const termOk = !term || hay.includes(term);
    const traitOk =
      actives.size === 0 ||
      (isChamp ? it.traits.some((t) => actives.has(t)) : actives.has(it.trait));
    return termOk && traitOk;
  });
  list.forEach((it) =>
    gal.appendChild(makeCard(it, isChamp ? "champ" : "pet"))
  );
}
function handleDropChampion(payload, to) {
  const id = payload.id;
  if (payload.from === "gallery") {
    state.slots[to.r][to.c] = id;
  } else {
    const swap = state.slots[to.r][to.c];
    state.slots[to.r][to.c] = id;
    state.slots[payload.r][payload.c] = swap;
  }
  paintBoard();
  updateSynergies();
}
function handleDropPet(payload, idx) {
  const id = payload.id;
  if (payload.from === "gallery") {
    state.petSlots[idx] = id;
  } else {
    const swap = state.petSlots[idx];
    state.petSlots[idx] = id;
    state.petSlots[payload.idx] = swap;
  }
  paintPets();
  updateSynergies();
}
function countOnBoard() {
  const map = new Map();
  for (let r = 0; r < state.rows; r++)
    for (let c = 0; c < state.cols; c++) {
      const id = state.slots[r][c];
      if (!id) continue;
      const ch = CHAMPIONS.find((x) => x.id === id);
      if (!ch) continue;
      ch.traits.forEach((t) => map.set(t, (map.get(t) || 0) + 1));
    }
  state.petSlots.forEach((id) => {
    if (!id) return;
    const pet = PETS.find((x) => x.id === id);
    if (!pet) return;
    map.set(pet.trait, (map.get(pet.trait) || 0) + 1);
  });
  return map;
}
function updateSynergies() {
  const map = countOnBoard();
  const box = $("#synergyList");
  box.innerHTML = "";
  const all = new Set(Object.keys(TRAIT_THRESHOLDS));
  CHAMPIONS.forEach((ch) => ch.traits.forEach((t) => all.add(t)));
  PETS.forEach((p) => all.add(p.trait));
  [...all].sort().forEach((trait) => {
    const cnt = map.get(trait) || 0;
    const th = TRAIT_THRESHOLDS[trait] || [2, 4, 6];
    const wrap = document.createElement("div");
    wrap.className =
      "px-3 py-2 rounded-xl border flex items-center justify-between gap-3 " +
      (cnt >= th[0] ? "bg-emerald-50 border-emerald-200" : "bg-slate-50");
    const left = document.createElement("div");
    left.innerHTML = `<div class="text-sm font-semibold">${trait}</div><div class="text-xs text-slate-500">${cnt} kích hoạt (bao gồm Pet)</div>`;
    const right = document.createElement("div");
    right.className = "flex items-center gap-1";
    th.forEach((x) => {
      const b = document.createElement("div");
      b.className =
        "px-2 py-1 rounded-lg text-xs border " +
        (cnt >= x
          ? "bg-emerald-500 text-white border-emerald-600"
          : "bg-white");
      b.textContent = x;
      right.appendChild(b);
    });
    wrap.append(left, right);
    box.appendChild(wrap);
  });
}
function exportJSON() {
  const data = { board: state.slots, petSlots: state.petSlots };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "doi-hinh.json";
  a.click();
  URL.revokeObjectURL(url);
}
function importJSON(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (Array.isArray(data.board)) {
        state.slots = data.board;
        state.petSlots = data.petSlots || state.petSlots;
        paintBoard();
        paintPets();
        updateSynergies();
      } else alert("JSON không đúng định dạng.");
    } catch (e) {
      alert("Không đọc được JSON.");
    }
  };
  reader.readAsText(file);
}
function attachEvents() {
  $("#btnClear").addEventListener("click", () => {
    for (let r = 0; r < state.rows; r++)
      for (let c = 0; c < state.cols; c++) state.slots[r][c] = null;
    state.petSlots = Array(3).fill(null);
    paintBoard();
    paintPets();
    updateSynergies();
  });
  $("#btnExport").addEventListener("click", exportJSON);
  $("#importFile").addEventListener("change", (e) => {
    if (e.target.files[0]) importJSON(e.target.files[0]);
  });
  $("#searchInput").addEventListener("input", renderGallery);
  $("#btnResetFilter").addEventListener("click", () => {
    $all("#traitFilters .chip").forEach((c) => c.classList.remove("active"));
    $("#searchInput").value = "";
    renderGallery();
  });
  $("#tabChamp").addEventListener("click", () => {
    state.tab = "champ";
    $("#tabChamp").classList.add("bg-slate-900", "text-white");
    $("#tabPet").classList.remove("bg-slate-900", "text-white");
    renderGallery();
  });
  $("#tabPet").addEventListener("click", () => {
    state.tab = "pet";
    $("#tabPet").classList.add("bg-slate-900", "text-white");
    $("#tabChamp").classList.remove("bg-slate-900", "text-white");
    renderGallery();
  });
}
async function boot() {
  await loadData();
  renderBoard();
  renderPets();
  paintBoard();
  paintPets();
  attachEvents();
  renderTraitChips();
  renderGallery();
  updateSynergies();
}
boot();
