// ====== CẤU HÌNH BÀN CỜ + TRẠNG THÁI (không có ghế dự bị, không custom add) ======
const state = {
  rows: 2, cols: 5,                // 6 ô cố định
  slots: [],                        // 2D array of champion ids
  petSlots: Array(3).fill(null),    // 3 ô Pet chứa pet.id
  tab: 'champ'                      // 'champ' | 'pet'
};

// ====== TIỆN ÍCH DOM ======
function $(sel, root=document){ return root.querySelector(sel); }
function $all(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

// ====== DỮ LIỆU TOÀN CỤC (tải từ nhiều file) ======
let TRAIT_THRESHOLDS = {};
let CHAMPIONS = [];
let PETS = [];

// ====== TẢI DỮ LIỆU: manifest -> các file trait -> merge (không ghi localStorage) ======
async function loadData(){
  let files = [];
  // 1) Try to load manifest via fetch (relative to this page)
  try{
    const res = await fetch(new URL('traits_manifest.json', location.href), {cache:'no-cache'});
    if(res.ok){
      const man = await res.json();
      if(Array.isArray(man.files)) files = man.files;
    } else {
      console.warn('Manifest HTTP status:', res.status);
    }
  } catch(err){
    console.warn('Không thể tải traits_manifest.json:', err);
  }
  // 2) Fallback to window.MANIFEST_FILES if provided in HTML
  if(!files.length && Array.isArray(window.MANIFEST_FILES)){
    files = window.MANIFEST_FILES;
  }
  if(!files.length){
    throw new Error('Không tìm thấy danh sách file dữ liệu.');
  }

  // 3) Fetch all data files and merge
  const parts = [];
  for(const p of files){
    try{
      const r = await fetch(new URL(p, location.href), {cache:'no-cache'});
      if(!r.ok){ console.warn('Không tải được', p, r.status); continue; }
      const j = await r.json(); parts.push(j);
    }catch(e){
      console.warn('Lỗi khi đọc JSON', p, e);
    }
  }
  if(!parts.length) throw new Error('Không tải được bất cứ file dữ liệu nào.');

  // Merge thresholds
  TRAIT_THRESHOLDS = parts.reduce((acc, cur)=> ({...acc, ...(cur.trait_thresholds||{})}), {});

  // Merge champions by id
  const seenC = new Map();
  parts.forEach(cur => (cur.champions||[]).forEach(ch => { if(!seenC.has(ch.id)) seenC.set(ch.id, ch); }));
  CHAMPIONS = Array.from(seenC.values());

  // Merge pets by id
  const seenP = new Map();
  parts.forEach(cur => (cur.pets||[]).forEach(p => { if(!seenP.has(p.id)) seenP.set(p.id, p); }));
  PETS = Array.from(seenP.values());
}

// ====== RENDER CƠ BẢN ======
function createSlotEl(){
  const tpl = document.getElementById('tpl-slot');
  return tpl.content.firstElementChild.cloneNode(true);
}

function setupDropTarget(el, area){
  el.addEventListener('dragover', (e)=>{ e.preventDefault(); el.classList.add('drop-target'); });
  el.addEventListener('dragleave', ()=> el.classList.remove('drop-target'));
  el.addEventListener('drop', (e)=>{
    e.preventDefault(); el.classList.remove('drop-target');
    const payload = JSON.parse(e.dataTransfer.getData('application/json')||'{}');
    if(payload.kind === 'champ' && area==='board'){
      const to = {r:+el.dataset.row, c:+el.dataset.col};
      handleDropChampion(payload, to);
    } else if(payload.kind === 'pet' && area==='pet'){
      const idx = +el.dataset.pet;
      handleDropPet(payload, idx);
    }
  });

  // Chuột phải xoá
  el.addEventListener('contextmenu', (e)=>{
    e.preventDefault();
    if('row' in el.dataset){ const r=+el.dataset.row, c=+el.dataset.col; state.slots[r][c]=null; paintBoard(); }
    else if('pet' in el.dataset){ const i=+el.dataset.pet; state.petSlots[i]=null; paintPets(); }
    updateSynergies();
  });

  // Cho phép kéo từ slot
  el.setAttribute('draggable','true');
  el.addEventListener('dragstart', (e)=>{
    const hasImg = !el.querySelector('img').classList.contains('hidden');
    if(!hasImg) { e.preventDefault(); return; }
    if('row' in el.dataset){
      const r=+el.dataset.row, c=+el.dataset.col;
      const id = state.slots[r][c];
      e.dataTransfer.setData('application/json', JSON.stringify({kind:'champ', id, from:'board', r, c}));
      e.dataTransfer.effectAllowed='move';
    } else if('pet' in el.dataset){
      const idx=+el.dataset.pet, id = state.petSlots[idx];
      e.dataTransfer.setData('application/json', JSON.stringify({kind:'pet', id, from:'pet', idx}));
      e.dataTransfer.effectAllowed='move';
    }
    el.classList.add('dragging');
  });
  el.addEventListener('dragend', ()=> el.classList.remove('dragging'));
}

function renderBoard(){
  const board = document.getElementById('board');
  board.className = "grid gap-2 grid-cols-3";
  board.innerHTML='';
  state.slots = [];
  for(let r=0;r<state.rows;r++){
    const row = [];
    for(let c=0;c<state.cols;c++){
      const el = createSlotEl();
      el.dataset.row=r; el.dataset.col=c;
      setupDropTarget(el,'board');
      board.appendChild(el);
      row.push(null);
    }
    state.slots.push(row);
  }
}

function renderPets(){
  const wrap = document.getElementById('petSlots');
  wrap.innerHTML='';
  for(let i=0;i<state.petSlots.length;i++){
    const el = createSlotEl();
    el.dataset.pet = i;
    setupDropTarget(el,'pet');
    wrap.appendChild(el);
  }
}

function paintSlot(cell, data){
  const img = cell.querySelector('img');
  if(data){
    img.src = data.img; img.alt = data.title; img.classList.remove('hidden');
    cell.title = data.title;
  } else {
    img.src=''; img.alt=''; img.classList.add('hidden');
    cell.title = '';
  }
}

function paintBoard(){
  const cells = $all('#board .slot');
  cells.forEach(cell=>{
    const r = +cell.dataset.row, c = +cell.dataset.col;
    const id = state.slots[r][c];
    const ch = CHAMPIONS.find(x=>x.id===id);
    paintSlot(cell, id? {img: ch?.img||'', title: ch? `${ch.name}\n${ch.traits.join(' · ')}`: ''} : null);
  });
}

function paintPets(){
  const cells = $all('#petSlots .slot');
  cells.forEach((cell,i)=>{
    const id = state.petSlots[i];
    const pet = PETS.find(x=>x.id===id);
    paintSlot(cell, id? {img: pet?.img||'', title: pet? `${pet.name}\n+1 ${pet.trait}`: ''} : null);
  });
}

// ====== GALLERY ======
function makeCard(item, kind){
  const tpl = document.getElementById('tpl-card');
  const card = tpl.content.firstElementChild.cloneNode(true);
  const img = card.querySelector('img');
  img.src = item.img; img.alt = item.name;
  const dragger = card.querySelector('.dragger');
  dragger.addEventListener('dragstart', (e)=>{
    e.dataTransfer.setData('application/json', JSON.stringify({kind, id: item.id, from:'gallery'}));
    e.dataTransfer.effectAllowed='copyMove';
    dragger.classList.add('dragging');
  });
  dragger.addEventListener('dragend', ()=> dragger.classList.remove('dragging'));
  card.querySelector('.name').textContent = item.name;
  card.querySelector('.traits').textContent = kind==='champ' ? item.traits.join(' · ') : `+1 ${item.trait}`;
  card.title = kind==='champ' ? `${item.name}\n${item.traits.join(' · ')}` : `${item.name}\n+1 ${item.trait}`;
  return card;
}

function renderTraitChips(){
  const box = document.getElementById('traitFilters');
  const traits = new Set();
  CHAMPIONS.forEach(ch => ch.traits.forEach(t => traits.add(t)));
  PETS.forEach(p => traits.add(p.trait));
  box.innerHTML='';
  [...traits].sort().forEach(t => {
    const btn = document.createElement('button');
    btn.className = 'chip px-3 py-1 rounded-full border bg-white text-sm';
    btn.textContent = t; btn.dataset.trait = t;
    btn.addEventListener('click', ()=>{ btn.classList.toggle('active'); renderGallery(); });
    box.appendChild(btn);
  });
}

function renderGallery(){
  const gal = document.getElementById('gallery');
  gal.innerHTML='';
  const term = $('#searchInput').value.trim().toLowerCase();
  const actives = new Set([...$all('#traitFilters .chip.active')].map(x=>x.dataset.trait));
  const isChampTab = state.tab==='champ';

  const list = (isChampTab? CHAMPIONS: PETS).filter(it => {
    const hay = isChampTab ? (it.name + ' ' + it.traits.join(' ')).toLowerCase() : (it.name + ' ' + it.trait).toLowerCase();
    const termOk = !term || hay.includes(term);
    const traitOk = actives.size===0 || (isChampTab ? it.traits.some(t=>actives.has(t)) : actives.has(it.trait));
    return termOk && traitOk;
  });

  list.forEach(it => gal.appendChild(makeCard(it, isChampTab? 'champ':'pet')));
}

// ====== THAO TÁC GALLERY -> BOARD/PET ======
function placeChampionToFirstEmptyBoard(id){
  for(let r=0;r<state.rows;r++) for(let c=0;c<state.cols;c++){
    if(!state.slots[r][c]){ state.slots[r][c]=id; paintBoard(); updateSynergies(); return; }
  }
  alert('Bàn cờ đã đầy (6 ô).');
}

function addPetToFirstEmpty(id){
  const idx = state.petSlots.findIndex(x=>x===null);
  if(idx===-1){ alert('Ô Pet đã đầy.'); return; }
  state.petSlots[idx] = id; paintPets(); updateSynergies();
}

function handleDropChampion(payload, to){
  const id = payload.id;
  if(payload.from==='gallery'){
    state.slots[to.r][to.c] = id;
  } else if(payload.from==='board'){
    const swap = state.slots[to.r][to.c];
    state.slots[to.r][to.c]=id; state.slots[payload.r][payload.c]=swap;
  }
  paintBoard(); updateSynergies();
}

function handleDropPet(payload, petSlotIdx){
  const id = payload.id;
  if(payload.from==='gallery'){
    state.petSlots[petSlotIdx] = id;
  } else if(payload.from==='pet'){
    const swap = state.petSlots[petSlotIdx];
    state.petSlots[petSlotIdx] = id;
    state.petSlots[payload.idx] = swap;
  }
  paintPets(); updateSynergies();
}

// ====== TÍNH SYNERGY (CÓ TÍNH PET +1 TRAIT) ======
function countOnBoard(){
  const map = new Map();
  // champions
  for(let r=0;r<state.rows;r++) for(let c=0;c<state.cols;c++){
    const id = state.slots[r][c];
    if(!id) continue;
    const ch = CHAMPIONS.find(x=>x.id===id); if(!ch) continue;
    ch.traits.forEach(t => map.set(t, (map.get(t)||0)+1));
  }
  // pets (each +1 to its trait)
  state.petSlots.forEach(id => {
    if(!id) return;
    const pet = PETS.find(x=>x.id===id); if(!pet) return;
    const t = pet.trait;
    map.set(t, (map.get(t)||0)+1);
  });
  return map;
}

function updateSynergies(){
  const map = countOnBoard();
  const box = document.getElementById('synergyList');
  box.innerHTML='';

  const allTraits = new Set(Object.keys(TRAIT_THRESHOLDS));
  CHAMPIONS.forEach(ch => ch.traits.forEach(t => allTraits.add(t)));
  PETS.forEach(p => allTraits.add(p.trait));

  [...allTraits].sort().forEach(trait => {
    const cnt = map.get(trait)||0;
    const th = TRAIT_THRESHOLDS[trait] || [2,4,6];
    const wrap = document.createElement('div');
    wrap.className = 'px-3 py-2 rounded-xl border flex items-center justify-between gap-3 ' + (cnt>=th[0]? 'bg-emerald-50 border-emerald-200':'bg-slate-50');
    const left = document.createElement('div');
    left.innerHTML = `<div class="text-sm font-semibold">${trait}</div><div class="text-xs text-slate-500">${cnt} kích hoạt (bao gồm Pet)</div>`;
    const right = document.createElement('div');
    right.className = 'flex items-center gap-1';
    th.forEach(x=>{
      const b = document.createElement('div');
      b.className = 'px-2 py-1 rounded-lg text-xs border ' + (cnt>=x? 'bg-emerald-500 text-white border-emerald-600':'bg-white');
      b.textContent = x;
      right.appendChild(b);
    });
    wrap.append(left,right);
    box.appendChild(wrap);
  });
}

// ====== EXPORT / IMPORT (không ghi đè champions/pets) ======
function exportJSON(){
  const data = { board: state.slots, petSlots: state.petSlots };
  const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'doi-hinh.json'; a.click();
  URL.revokeObjectURL(url);
}

function importJSON(file){
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      const data = JSON.parse(reader.result);
      if(Array.isArray(data.board)){
        state.slots = data.board;
        state.petSlots = data.petSlots || state.petSlots;
        paintBoard(); paintPets(); updateSynergies();
      } else alert('JSON không đúng định dạng.');
    }catch(err){ alert('Không đọc được JSON.'); }
  };
  reader.readAsText(file);
}

// ====== GẮN SỰ KIỆN UI ======
function attachEvents(){
  $('#btnClear').addEventListener('click', ()=>{
    for(let r=0;r<state.rows;r++) for(let c=0;c<state.cols;c++) state.slots[r][c]=null;
    state.petSlots = Array(3).fill(null);
    paintBoard(); paintPets(); updateSynergies();
  });
  $('#btnExport').addEventListener('click', exportJSON);
  $('#importFile').addEventListener('change', (e)=>{ if(e.target.files[0]) importJSON(e.target.files[0]); });
  $('#searchInput').addEventListener('input', renderGallery);
  $('#btnResetFilter').addEventListener('click', ()=>{ $all('#traitFilters .chip').forEach(c=>c.classList.remove('active')); $('#searchInput').value=''; renderGallery(); });
  $('#tabChamp').addEventListener('click', ()=>{ state.tab='champ'; $('#tabChamp').classList.add('bg-slate-900','text-white'); $('#tabPet').classList.remove('bg-slate-900','text-white'); renderGallery(); });
  $('#tabPet').addEventListener('click', ()=>{ state.tab='pet'; $('#tabPet').classList.add('bg-slate-900','text-white'); $('#tabChamp').classList.remove('bg-slate-900','text-white'); renderGallery(); });
}

// ====== KHỞI TẠO ======
async function boot(){
  await loadData();
  renderBoard(); renderPets();
  paintBoard(); paintPets();
  attachEvents();
  renderTraitChips(); renderGallery();
  updateSynergies();
}

boot();
