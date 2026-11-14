// =========================================================
// Mes sacs : carnet + comparateur (store IndexedDB « favorites »)
// =========================================================
const Comparator = (() => {
  const DENSITES = [
    { id: 'bois',      label: '🪨 Charbon de bois', d: 0.15 },
    { id: 'briquette', label: '🧱 Briquettes',      d: 0.35 },
  ];
  const CLE_TRI = 'barbeuq.tri'; // petit réglage d'interface (localStorage)

  let items = [];     // liste en mémoire (chargée depuis la base)
  let urls = [];      // URL d'images de la liste, libérées à chaque affichage
  let sortMode = 'prix';
  let query = '';

  // ---------- Calculs ----------
  function kgOf(it){
    const q = +it.qty || 0;
    return it.unit === 'kg' ? q : q * (+it.density || 0.15);
  }
  function bestPrice(it){
    if (!it.stores || !it.stores.length) return 0;
    return Math.min(...it.stores.map(s => +s.price || Infinity));
  }
  function bestPricePerKg(it){
    const kg = kgOf(it);
    if (!kg || !it.stores || !it.stores.length) return Infinity;
    return bestPrice(it) / kg;
  }

  // Ancien format { price } → { stores: [...] } (en mémoire ; écrit au prochain enregistrement)
  function migrate(it){
    if (!Array.isArray(it.stores)){
      it.stores = [{ name: '?', city: '', price: +it.price || 0 }];
    }
    if (typeof it.rating !== 'number') it.rating = 0;
    if (!it.note) it.note = '';
    return it;
  }

  // ---------- Base ----------
  async function load(){
    const all = await DB.all('favorites');
    items = all.map(migrate);
  }

  async function save(it){
    it.updatedAt = Date.now();
    if (it.id){
      await DB.put('favorites', it);
    } else {
      it.id = await DB.add('favorites', it);
    }
  }

  async function remove(id){
    await DB.del('favorites', id);
    items = items.filter(x => x.id !== id);
  }

  // ---------- Tri / recherche ----------
  function norm(s){
    return (s || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
  function matches(it){
    if (!query) return true;
    const q = norm(query);
    const txt = [it.name, it.note, ...(it.stores || []).flatMap(s => [s.name, s.city])].map(norm).join(' ');
    return q.split(/\s+/).every(w => txt.includes(w));
  }
  function sortItems(list){
    return [...list].sort((a, b) => {
      if (sortMode === 'note'){
        const ra = a.rating || 0, rb = b.rating || 0;
        if (ra !== rb) return rb - ra;
      }
      const d = bestPricePerKg(a) - bestPricePerKg(b);
      if (d) return isNaN(d) ? 0 : d;
      return (b.rating || 0) - (a.rating || 0);
    });
  }

  // ---------- Affichage ----------
  function stars(n){
    let s = '';
    for (let i = 1; i <= 5; i++) s += i <= n ? '★' : '<span class="off">★</span>';
    return s;
  }
  function storeLabel(s){ return (!s.name || s.name === '?') ? 'Magasin' : s.name; }

  function render(){
    const list = document.getElementById('compList');
    urls.forEach(u => URL.revokeObjectURL(u));
    urls = [];

    document.getElementById('compTools').hidden = items.length < 2;

    if (!items.length){
      list.innerHTML = `
        <div class="empty">
          <div class="empty-ico">🛒</div>
          <h3>Aucun sac pour l'instant</h3>
          <p>Ajoute les sacs que tu croises en magasin : BarBeuQ te dira lequel est le moins cher au kilo.</p>
        </div>`;
      return;
    }

    const minPpk = Math.min(...items.map(bestPricePerKg));
    const shown = sortItems(items.filter(matches));

    if (!shown.length){
      list.innerHTML = `<div class="empty"><div class="empty-ico">🔎</div><h3>Aucun résultat</h3><p>Essaie un autre mot.</p></div>`;
      return;
    }

    list.innerHTML = shown.map(it => {
      const ppk = bestPricePerKg(it);
      const bp = bestPrice(it);
      const isBest = isFinite(ppk) && ppk === minPpk && items.length > 1;
      const diff = isFinite(ppk) && isFinite(minPpk) && minPpk > 0 ? (ppk / minPpk - 1) * 100 : 0;
      let img = '<div class="sack-photo-ph">📦</div>';
      if (it.photo instanceof Blob){
        const u = URL.createObjectURL(it.photo);
        urls.push(u);
        img = `<img class="sack-photo" src="${u}" alt="">`;
      }
      const storesSorted = [...it.stores].map((s, i) => ({ s, i })).sort((a, b) => a.s.price - b.s.price);
      const best = storesSorted[0] && storesSorted[0].s;
      return `
      <article class="sack ${isBest ? 'best' : ''}">
        <button class="sack-main" data-act="edit" data-id="${it.id}" aria-label="Modifier ${UI.esc(it.name || 'ce sac')}">
          ${img}
          <div class="sack-info">
            <div class="sack-top">
              <span class="sack-name">${UI.esc(it.name || 'Sans nom')}</span>
              ${isBest ? '<span class="badge badge-best">🏆 Le moins cher</span>'
                : (diff >= 0.5 ? `<span class="badge badge-diff">+${Math.round(diff)} %</span>` : '')}
            </div>
            ${it.rating ? `<div class="sack-stars">${stars(it.rating)}</div>` : ''}
            <div class="sack-ppk">${UI.num(ppk)} <small>€/kg</small></div>
            <div class="sack-meta">${UI.qty(it.qty)} ${it.unit === 'kg' ? 'kg' : 'L'} · ${UI.num(bp)} €${best && storesSorted.length > 1 ? ' chez ' + UI.esc(storeLabel(best)) : ''}</div>
            ${it.note ? `<div class="sack-note">💬 ${UI.esc(it.note)}</div>` : ''}
          </div>
          <span class="sack-edit" aria-hidden="true">✏️</span>
        </button>
        <div class="stores">
          ${storesSorted.map(({ s, i }) => `
            <button class="store-chip ${storesSorted.length > 1 && s.price === bp ? 'cheapest' : ''}" data-act="store" data-id="${it.id}" data-sidx="${i}">
              <span class="s-name">${UI.esc(storeLabel(s))}</span>
              ${s.city ? `<span class="s-city">${UI.esc(s.city)}</span>` : ''}
              <span class="s-price">${UI.num(s.price)} €</span>
            </button>`).join('')}
          <button class="store-chip store-add" data-act="addstore" data-id="${it.id}">＋ Magasin</button>
        </div>
      </article>`;
    }).join('');
  }

  function onListClick(e){
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    const it = items.find(x => x.id === +b.dataset.id);
    if (!it) return;
    const act = b.dataset.act;
    if (act === 'edit') openSackModal(it);
    else if (act === 'addstore') openStoreModal(it);
    else if (act === 'store') openStoreModal(it, +b.dataset.sidx);
  }

  // Suggestions d'enseignes / villes déjà saisies
  function datalists(){
    const names = new Set(), cities = new Set();
    items.forEach(it => (it.stores || []).forEach(s => {
      if (s.name && s.name !== '?') names.add(s.name);
      if (s.city) cities.add(s.city);
    }));
    const opts = set => [...set].sort((a, b) => a.localeCompare(b, 'fr')).map(v => `<option value="${UI.esc(v)}">`).join('');
    return `<datalist id="dlStores">${opts(names)}</datalist><datalist id="dlCities">${opts(cities)}</datalist>`;
  }

  // ---------- Feuille « sac » (ajout / modification) ----------
  function openSackModal(existing = null, prefill = {}){
    const isEdit = !!existing;
    const it = existing || {
      name: '', qty: prefill.qty || '', unit: prefill.unit || 'L',
      density: prefill.density || 0.15, rating: 0, note: '', stores: []
    };
    let unit = it.unit === 'kg' ? 'kg' : 'L';
    let rating = it.rating || 0;
    let photo = it.photo instanceof Blob ? it.photo : null;
    let photoChanged = false;
    let previewUrl = null;
    const density = +it.density || 0.15;

    const html = `
      <h3>${isEdit ? '✏️ Modifier le sac' : '➕ Nouveau sac'}</h3>
      <label class="field">
        <span class="field-label">Nom / marque</span>
        <input id="sName" type="text" value="${UI.esc(it.name)}" placeholder="Ex : Weber, Difeudis…" autocomplete="off">
      </label>

      <div class="seg seg-small" id="sType">
        ${DENSITES.map(t => `<button type="button" class="seg-btn ${Math.abs(density - t.d) < 1e-9 ? 'active' : ''}" data-d="${t.d}">${t.label}</button>`).join('')}
      </div>

      <div class="field-row">
        <label class="field">
          <span class="field-label">Contenance</span>
          <span class="input-suffix">
            <input id="sQty" type="number" inputmode="decimal" step="0.1" min="0" value="${it.qty || ''}" placeholder="40">
            <span class="suffix" id="sQtySuffix">${unit}</span>
          </span>
        </label>
        <div class="field">
          <span class="field-label">Unité</span>
          <div class="seg seg-small" id="sUnit" style="margin:0">
            <button type="button" class="seg-btn ${unit === 'L' ? 'active' : ''}" data-u="L">Litres</button>
            <button type="button" class="seg-btn ${unit === 'kg' ? 'active' : ''}" data-u="kg">Kilos</button>
          </div>
        </div>
      </div>

      <details class="advanced" id="sDenBox" ${unit === 'kg' ? 'hidden' : ''}>
        <summary>Densité : <strong id="sDenLabel">${UI.num(density)} kg/L</strong> <span class="muted">· modifier</span></summary>
        <label class="field">
          <span class="field-label">Densité (kg par litre)</span>
          <input id="sDen" type="number" inputmode="decimal" step="0.01" min="0" value="${density}">
        </label>
      </details>

      ${!isEdit ? `
      <div class="sub-block">
        <p class="sub-title">📍 Où l'as-tu vu ?</p>
        <div class="field-row">
          <label class="field"><span class="field-label">Magasin</span>
            <input id="sStoreName" type="text" list="dlStores" placeholder="Ex : Leclerc" autocomplete="off"></label>
          <label class="field"><span class="field-label">Ville</span>
            <input id="sStoreCity" type="text" list="dlCities" placeholder="Facultatif" autocomplete="off"></label>
        </div>
        <label class="field" style="margin:0"><span class="field-label">Prix du sac</span>
          <span class="input-suffix">
            <input id="sStorePrice" type="number" inputmode="decimal" step="0.01" min="0" value="${prefill.price || ''}" placeholder="15,00">
            <span class="suffix">€</span>
          </span>
        </label>
      </div>` : ''}

      <div class="preview-ppk" id="sPreview"><span>Prix au kilo</span><strong>— €/kg</strong></div>

      <div class="field">
        <span class="field-label">Ma note</span>
        <div class="stars-input" id="sStars">
          ${[1,2,3,4,5].map(i => `<button type="button" data-v="${i}" class="${i <= rating ? 'on' : ''}" aria-label="${i} étoile${i > 1 ? 's' : ''}">★</button>`).join('')}
        </div>
      </div>

      <label class="field">
        <span class="field-label">Commentaire</span>
        <textarea id="sNote" rows="2" placeholder="Brûle longtemps, peu de fumée…">${UI.esc(it.note || '')}</textarea>
      </label>

      <div class="field">
        <span class="field-label">Photo</span>
        <div class="photo-pick" id="sPhotoBox"></div>
        <input id="sPhoto" type="file" accept="image/*" hidden>
      </div>

      <button class="btn btn-primary" id="sSave">💾 ${isEdit ? 'Enregistrer' : 'Ajouter ce sac'}</button>
      ${isEdit ? '<button class="btn btn-danger" id="sDel">🗑️ Supprimer ce sac</button>' : ''}
      ${datalists()}
    `;
    UI.modal(html, {
      focus: isEdit ? null : '#sName',
      onClose: () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }
    });

    const $ = id => document.getElementById(id);

    function currentKg(){
      const q = UI.readNum($('sQty'));
      const d = UI.readNum($('sDen')) || 0.15;
      return q > 0 ? (unit === 'kg' ? q : q * d) : 0;
    }
    function updatePreview(){
      const d = UI.readNum($('sDen')) || 0.15;
      $('sDenLabel').textContent = UI.num(d) + ' kg/L';
      document.querySelectorAll('#sType .seg-btn').forEach(b =>
        b.classList.toggle('active', Math.abs(+b.dataset.d - d) < 1e-9));
      const price = isEdit ? bestPrice(it) : UI.readNum($('sStorePrice'));
      const kg = currentKg();
      $('sPreview').querySelector('strong').textContent =
        (price > 0 && kg > 0) ? UI.num(price / kg) + ' €/kg' : '— €/kg';
    }
    function renderPhoto(){
      if (previewUrl){ URL.revokeObjectURL(previewUrl); previewUrl = null; }
      const box = $('sPhotoBox');
      if (photo){
        previewUrl = URL.createObjectURL(photo);
        box.innerHTML = `<img src="${previewUrl}" alt="">
          <button type="button" class="btn btn-secondary" id="sPhotoPick">📷 Changer</button>
          <button type="button" class="btn btn-secondary btn-mini" id="sPhotoDel" aria-label="Retirer la photo">✕</button>`;
        $('sPhotoDel').onclick = () => { photo = null; photoChanged = true; renderPhoto(); };
      } else {
        box.innerHTML = `<button type="button" class="btn btn-secondary" id="sPhotoPick">📷 Ajouter une photo</button>`;
      }
      $('sPhotoPick').onclick = () => $('sPhoto').click();
    }

    document.querySelectorAll('#sUnit .seg-btn').forEach(b => b.addEventListener('click', () => {
      unit = b.dataset.u;
      document.querySelectorAll('#sUnit .seg-btn').forEach(x => x.classList.toggle('active', x === b));
      $('sQtySuffix').textContent = unit;
      $('sDenBox').hidden = unit === 'kg';
      $('sType').hidden = unit === 'kg';
      updatePreview();
    }));
    $('sType').hidden = unit === 'kg';
    document.querySelectorAll('#sType .seg-btn').forEach(b => b.addEventListener('click', () => {
      $('sDen').value = b.dataset.d;
      updatePreview();
    }));
    ['sQty', 'sDen', 'sStorePrice'].forEach(id => { const e = $(id); if (e) e.addEventListener('input', updatePreview); });

    document.querySelectorAll('#sStars button').forEach(s => s.addEventListener('click', () => {
      const v = +s.dataset.v;
      rating = (rating === v) ? 0 : v; // toucher à nouveau la même étoile = retirer la note
      document.querySelectorAll('#sStars button').forEach(x => x.classList.toggle('on', +x.dataset.v <= rating));
    }));

    $('sPhoto').addEventListener('change', async e => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        photo = await UI.compressImage(file);
        photoChanged = true;
        renderPhoto();
      } catch (err){ UI.toast('Impossible de lire cette image.'); }
    });

    renderPhoto();
    updatePreview();

    $('sSave').addEventListener('click', async () => {
      const qty = UI.readNum($('sQty'));
      const den = UI.readNum($('sDen')) || 0.15;
      if (!(qty > 0)){ UI.toast('Indique la contenance du sac.'); $('sQty').focus(); return; }

      let firstStore = null;
      if (!isEdit){
        const price = UI.readNum($('sStorePrice'));
        if (!(price > 0)){ UI.toast('Indique le prix du sac.'); $('sStorePrice').focus(); return; }
        firstStore = { name: $('sStoreName').value.trim() || '?', city: $('sStoreCity').value.trim(), price };
      }

      const target = existing || { stores: [] };
      target.name = $('sName').value.trim();
      target.qty = qty;
      target.unit = unit;
      target.density = den;
      target.rating = rating;
      target.note = $('sNote').value.trim();
      if (photoChanged) target.photo = photo;
      if (firstStore) target.stores = [firstStore];

      try {
        await save(target);
      } catch (err){
        console.error(err);
        UI.toast('Enregistrement impossible.');
        return;
      }
      if (!isEdit) items.push(target);
      UI.closeModal();
      render();
      UI.toast(isEdit ? '✅ Sac enregistré' : '✅ Sac ajouté');
    });

    if (isEdit){
      $('sDel').addEventListener('click', async () => {
        const ok = await UI.confirm(`Supprimer « ${it.name || 'ce sac'} » et tous ses magasins ?`, { ok: 'Supprimer', danger: true });
        if (!ok) return;
        await remove(it.id);
        UI.closeModal();
        render();
        UI.toast('🗑️ Sac supprimé');
      });
    }
  }

  // ---------- Feuille « magasin » (ajout / modif / suppression) ----------
  function openStoreModal(it, storeIdx = -1){
    const isEdit = storeIdx >= 0;
    const s = isEdit ? it.stores[storeIdx] : { name: '', city: '', price: '' };
    const kg = kgOf(it);

    const html = `
      <h3>${isEdit ? '✏️ Magasin' : '➕ Nouveau magasin'}</h3>
      <p class="hint" style="margin-top:-8px">${UI.esc(it.name || 'Sans nom')} · ${UI.qty(it.qty)} ${it.unit === 'kg' ? 'kg' : 'L'}</p>
      <div class="field-row">
        <label class="field"><span class="field-label">Magasin</span>
          <input id="stName" type="text" list="dlStores" value="${UI.esc(s.name === '?' ? '' : s.name)}" placeholder="Ex : Intermarché" autocomplete="off"></label>
        <label class="field"><span class="field-label">Ville</span>
          <input id="stCity" type="text" list="dlCities" value="${UI.esc(s.city)}" placeholder="Facultatif" autocomplete="off"></label>
      </div>
      <label class="field"><span class="field-label">Prix du sac</span>
        <span class="input-suffix">
          <input id="stPrice" type="number" inputmode="decimal" step="0.01" min="0" value="${s.price || ''}" placeholder="15,00">
          <span class="suffix">€</span>
        </span>
      </label>
      <div class="preview-ppk" id="stPreview"><span>Prix au kilo</span><strong>— €/kg</strong></div>
      <button class="btn btn-primary" id="stSave">💾 ${isEdit ? 'Enregistrer' : 'Ajouter ce magasin'}</button>
      ${isEdit && it.stores.length > 1 ? '<button class="btn btn-danger" id="stDel">🗑️ Retirer ce magasin</button>' : ''}
      ${isEdit && it.stores.length === 1 ? '<p class="hint center">Un sac garde toujours au moins un magasin.</p>' : ''}
      ${datalists()}
    `;
    UI.modal(html, { focus: isEdit ? '#stPrice' : '#stName' });

    const $ = id => document.getElementById(id);
    const upd = () => {
      const p = UI.readNum($('stPrice'));
      $('stPreview').querySelector('strong').textContent = (p > 0 && kg > 0) ? UI.num(p / kg) + ' €/kg' : '— €/kg';
    };
    $('stPrice').addEventListener('input', upd);
    upd();

    $('stSave').addEventListener('click', async () => {
      const name = $('stName').value.trim() || '?';
      const city = $('stCity').value.trim();
      const price = UI.readNum($('stPrice'));
      if (!(price > 0)){ UI.toast('Indique le prix.'); $('stPrice').focus(); return; }
      if (isEdit) it.stores[storeIdx] = { name, city, price };
      else it.stores.push({ name, city, price });
      await save(it);
      UI.closeModal();
      render();
      UI.toast('✅ Magasin enregistré');
    });

    const delBtn = $('stDel');
    if (delBtn){
      delBtn.addEventListener('click', async () => {
        const ok = await UI.confirm(`Retirer le magasin « ${storeLabel(s)} » de ce sac ?`, { ok: 'Retirer', danger: true });
        if (!ok) return;
        it.stores.splice(storeIdx, 1);
        await save(it);
        UI.closeModal();
        render();
      });
    }
  }

  // ---------- Init ----------
  async function init(){
    document.getElementById('compAddBtn').addEventListener('click', () => openSackModal());
    document.getElementById('compList').addEventListener('click', onListClick);
    try { sortMode = localStorage.getItem(CLE_TRI) === 'note' ? 'note' : 'prix'; } catch (e) {}
    document.querySelectorAll('#compSort .seg-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.sort === sortMode);
      b.addEventListener('click', () => {
        sortMode = b.dataset.sort;
        try { localStorage.setItem(CLE_TRI, sortMode); } catch (e) {}
        document.querySelectorAll('#compSort .seg-btn').forEach(x => x.classList.toggle('active', x === b));
        render();
      });
    });
    document.getElementById('compSearch').addEventListener('input', e => { query = e.target.value.trim(); render(); });
    await reload();
  }

  // Recharge la liste en mémoire depuis la base (après un import / une restauration)
  async function reload(){
    try { await load(); }
    catch (e){ console.error('Chargement des sacs', e); items = []; }
    render();
  }

  return { init, reload, openSackModal, count: () => items.length };
})();
