const Comparator = (() => {
  let items = [];      // cache mémoire des sacs (chargé depuis DB)
  let editingId = null; // id du sac en cours d'édition (null = création)

  // ---------- Utilitaires ----------
  async function compressImage(file, maxSize=600, quality=0.8){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > height && width > maxSize){ height = height * maxSize / width; width = maxSize; }
          else if (height > maxSize){ width = width * maxSize / height; height = maxSize; }
          const canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          canvas.toBlob(b => resolve(b), 'image/webp', quality);
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Calcule le prix/kg minimum (meilleur magasin) d'un sac
  function bestPricePerKg(it){
    if (!it.stores || !it.stores.length) return Infinity;
    const kg = it.unit === 'kg' ? it.qty : it.qty * (it.density || 0.15);
    if (!kg) return Infinity;
    const minPrice = Math.min(...it.stores.map(s => s.price));
    return minPrice / kg;
  }

  function bestPrice(it){
    if (!it.stores || !it.stores.length) return 0;
    return Math.min(...it.stores.map(s => s.price));
  }

  // Migration douce : ancien format { price } -> nouveau { stores: [...] }
  function migrate(it){
    if (!it.stores){
      it.stores = [{ name: '?', city: '', price: it.price || 0 }];
    }
    if (typeof it.rating !== 'number') it.rating = 0;
    if (!it.note) it.note = '';
    return it;
  }

  // ---------- Chargement / sauvegarde ----------
  async function load(){
    const all = await DB.all('favorites');
    items = all.map(migrate);
  }

  async function save(it){
    it.updatedAt = Date.now();
    if (it.id){
      await DB.put('favorites', it);
    } else {
      const id = await DB.add('favorites', it);
      it.id = id;
    }
  }

  async function remove(id){
    await DB.del('favorites', id);
    items = items.filter(x => x.id !== id);
  }

  // ---------- Affichage ----------
  function sortItems(){
    return [...items].sort((a,b) => {
      const ra = a.rating || 0, rb = b.rating || 0;
      if (ra && rb && ra !== rb) return rb - ra;
      if (ra && !rb) return -1;
      if (!ra && rb) return 1;
      return bestPricePerKg(a) - bestPricePerKg(b);
    });
  }

  function renderStars(rating){
    let s = '';
    for (let i=1; i<=5; i++) s += i <= rating ? '⭐' : '☆';
    return s;
  }

  async function render(){
  const list = document.getElementById('compList');
  list.innerHTML = '';
  if (!items.length){
    list.innerHTML = '<p class="hint">Aucun sac ajouté. Clique sur ➕ pour commencer !</p>';
    return;
  }
  const sorted = sortItems();
  sorted.forEach((it, idx) => {
    const ppk = bestPricePerKg(it);
    const bp = bestPrice(it);
    const imgUrl = it.photo ? URL.createObjectURL(it.photo) : '';
    const storesSorted = [...it.stores].sort((a,b) => a.price - b.price);

    const div = document.createElement('div');
    div.className = 'comp-item';
    div.innerHTML = `
      <div class="comp-head">
        ${imgUrl
          ? `<img src="${imgUrl}" alt="" class="comp-photo">`
          : '<div class="comp-photo-ph">📦</div>'}
        <div class="comp-info">
          <div class="comp-title">
            <span class="rank-badge ${idx===0?'rank-best':''}">${idx+1}</span>
            ${escapeHtml(it.name||'Sans nom')}
            ${it.rating ? `<span class="comp-stars">${renderStars(it.rating)}</span>` : ''}
          </div>
          <div class="comp-meta">
            ${bp.toFixed(2)}€ • ${it.qty}${it.unit} • <strong>${ppk.toFixed(2)} €/kg</strong>
          </div>
          ${it.note ? `<div class="comp-note">💬 ${escapeHtml(it.note)}</div>` : ''}
        </div>
        <div class="comp-stores">
          ${storesSorted.map((s) => {
            const realIdx = it.stores.indexOf(s);
            const isBest = s.price === bp;
            return `
              <button class="store-tile ${isBest?'store-best':''}" data-act="editstore" data-id="${it.id}" data-sidx="${realIdx}">
                <div class="store-name">${escapeHtml(s.name||'?')}</div>
                ${s.city ? `<div class="store-city">${escapeHtml(s.city)}</div>` : '<div class="store-city">&nbsp;</div>'}
                <div class="store-price">${s.price.toFixed(2)}€</div>
              </button>`;
          }).join('')}
        </div>
        <div class="comp-actions">
          <button class="icon-btn" data-act="edit" data-id="${it.id}" title="Modifier">✏️</button>
          <button class="icon-btn" data-act="addstore" data-id="${it.id}" title="Ajouter un magasin">➕</button>
          <button class="icon-btn danger" data-act="del" data-id="${it.id}" title="Supprimer">🗑️</button>
        </div>
      </div>`;
    list.appendChild(div);
  });

    // Bind actions
    list.querySelectorAll('button[data-act]').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = +b.dataset.id;
        const it = items.find(x => x.id === id);
        if (!it) return;
        const act = b.dataset.act;
        if (act === 'edit') openSackModal(it);
        else if (act === 'addstore') openStoreModal(it);
        else if (act === 'del') confirmDelete(it);
        else if (act === 'editstore') openStoreModal(it, +b.dataset.sidx);
      });
    });
  }

  // ---------- Modale sac (ajout/modif) ----------
  function openSackModal(existing = null){
    const it = existing || { name:'', qty:'', unit:'L', density:0.15, rating:0, note:'', stores:[] };
    const isEdit = !!existing;

    const html = `
      <h3>${isEdit ? '✏️ Modifier le sac' : '➕ Ajouter un sac'}</h3>
      <label>Nom / Marque
        <input id="sName" type="text" value="${escapeAttr(it.name)}" placeholder="Ex: Difeudis">
      </label>
      <label>Quantité
        <input id="sQty" type="number" inputmode="decimal" step="0.1" value="${it.qty||''}">
      </label>
      <div class="toggle-unit">
        <button type="button" class="unit-btn ${it.unit==='L'?'active':''}" data-u="L">Litres</button>
        <button type="button" class="unit-btn ${it.unit==='kg'?'active':''}" data-u="kg">Kilos</button>
      </div>
      <label>Densité (kg/L, si en litres) (Charbon de bois 0.15 | Briquettes 0.35)
        <input id="sDen" type="number" inputmode="decimal" step="0.01" value="${it.density||0.15}">
      </label>
      <label>Note ⭐
        <select id="sRating">
          <option value="0" ${it.rating==0?'selected':''}>Aucune</option>
          <option value="1" ${it.rating==1?'selected':''}>⭐</option>
          <option value="2" ${it.rating==2?'selected':''}>⭐⭐</option>
          <option value="3" ${it.rating==3?'selected':''}>⭐⭐⭐</option>
          <option value="4" ${it.rating==4?'selected':''}>⭐⭐⭐⭐</option>
          <option value="5" ${it.rating==5?'selected':''}>⭐⭐⭐⭐⭐</option>
        </select>
      </label>
      <label>Commentaire
        <textarea id="sNote" rows="2" placeholder="Ex: Brûle longtemps, peu de fumée…">${escapeHtml(it.note||'')}</textarea>
      </label>
      <label>Photo (optionnelle)
        <input id="sPhoto" type="file" accept="image/*">
      </label>
      ${!isEdit ? `
        <hr>
        <p class="hint">📍 Premier magasin (obligatoire) :</p>
        <label>Enseigne <input id="sStoreName" type="text" placeholder="Ex: Intermarché"></label>
        <label>Ville (optionnel) <input id="sStoreCity" type="text" placeholder="Ex: Lille"></label>
        <label>Prix (€) <input id="sStorePrice" type="number" inputmode="decimal" step="0.01"></label>
      ` : ''}
      <button class="btn-primary" id="sSave">💾 ${isEdit ? 'Enregistrer' : 'Ajouter'}</button>
    `;
    UI.modal(html);

    let unit = it.unit || 'L';
    document.querySelectorAll('#modal .unit-btn').forEach(b => b.addEventListener('click', () => {
      unit = b.dataset.u;
      document.querySelectorAll('#modal .unit-btn').forEach(x => x.classList.toggle('active', x===b));
    }));

    document.getElementById('sSave').addEventListener('click', async () => {
      const name = document.getElementById('sName').value.trim();
      const qty = parseFloat(document.getElementById('sQty').value);
      const density = parseFloat(document.getElementById('sDen').value) || 0.15;
      const rating = parseInt(document.getElementById('sRating').value, 10) || 0;
      const note = document.getElementById('sNote').value.trim();
      const photoFile = document.getElementById('sPhoto').files[0];

      if (!qty){ alert('Quantité requise.'); return; }

      const target = existing ? existing : { stores: [] };
      target.name = name;
      target.qty = qty;
      target.unit = unit;
      target.density = density;
      target.rating = rating;
      target.note = note;

      if (photoFile){
        try { target.photo = await compressImage(photoFile); }
        catch(e){ console.warn('Compression photo échouée', e); }
      }

      if (!isEdit){
        const sName = document.getElementById('sStoreName').value.trim() || '?';
        const sCity = document.getElementById('sStoreCity').value.trim();
        const sPrice = parseFloat(document.getElementById('sStorePrice').value);
        if (!sPrice){ alert('Le prix du premier magasin est requis.'); return; }
        target.stores = [{ name: sName, city: sCity, price: sPrice }];
        await save(target);
        items.push(target);
      } else {
        await save(target);
      }

      UI.closeModal();
      render();
    });
  }

  // ---------- Modale magasin (ajout/modif/suppr) ----------
  function openStoreModal(it, storeIdx = -1){
    const isEdit = storeIdx >= 0;
    const s = isEdit ? it.stores[storeIdx] : { name:'', city:'', price:'' };

    const html = `
      <h3>${isEdit ? '✏️ Modifier le magasin' : '➕ Ajouter un magasin'}</h3>
      <label>Enseigne <input id="stName" type="text" value="${escapeAttr(s.name)}" placeholder="Ex: Intermarché"></label>
      <label>Ville (optionnel) <input id="stCity" type="text" value="${escapeAttr(s.city)}" placeholder="Ex: Lille"></label>
      <label>Prix (€) <input id="stPrice" type="number" inputmode="decimal" step="0.01" value="${s.price||''}"></label>
      <button class="btn-primary" id="stSave">💾 ${isEdit ? 'Enregistrer' : 'Ajouter'}</button>
      ${isEdit && it.stores.length > 1 ? `<button class="danger" id="stDel" style="margin-top:8px">🗑️ Supprimer ce magasin</button>` : ''}
      ${isEdit && it.stores.length === 1 ? `<p class="hint">⚠️ Impossible de supprimer : un sac doit avoir au moins 1 magasin.</p>` : ''}
    `;
    UI.modal(html);

    document.getElementById('stSave').addEventListener('click', async () => {
      const name = document.getElementById('stName').value.trim() || '?';
      const city = document.getElementById('stCity').value.trim();
      const price = parseFloat(document.getElementById('stPrice').value);
      if (!price){ alert('Prix requis.'); return; }
      if (isEdit){
        it.stores[storeIdx] = { name, city, price };
      } else {
        it.stores.push({ name, city, price });
      }
      await save(it);
      UI.closeModal();
      render();
    });

    const delBtn = document.getElementById('stDel');
    if (delBtn){
      delBtn.addEventListener('click', async () => {
        if (!confirm('Supprimer ce magasin ?')) return;
        it.stores.splice(storeIdx, 1);
        await save(it);
        UI.closeModal();
        render();
      });
    }
  }

  // ---------- Suppression du sac ----------
  function confirmDelete(it){
    if (!confirm(`Supprimer "${it.name||'ce sac'}" ?`)) return;
    remove(it.id).then(render);
  }

  // ---------- Init ----------
  async function init(){
    document.getElementById('compAddBtn').addEventListener('click', () => openSackModal());
    // Le bouton importBtn n'est plus utile : on le cache si présent
    const imp = document.getElementById('compImportBtn');
    if (imp) imp.style.display = 'none';
    await load();
    render();
  }

  function escapeHtml(s){ return (s||'').toString().replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function escapeAttr(s){ return escapeHtml(s); }

  return { init };
})();
