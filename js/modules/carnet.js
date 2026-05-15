const Carnet = (() => {

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

  async function render(){
    const list = document.getElementById('carnetList');
    const items = await DB.all('favorites');
    list.innerHTML = '';
    if (!items.length){ list.innerHTML = '<p class="hint">Aucun favori. Ajoute ton premier sac !</p>'; return; }
    items.sort((a,b)=>(a.pricePerKg||999)-(b.pricePerKg||999));
    items.forEach(it => {
      const div = document.createElement('div');
      div.className = 'list-item';
      const imgUrl = it.photo ? URL.createObjectURL(it.photo) : '';
      div.innerHTML = `
        ${imgUrl ? `<img src="${imgUrl}" alt="">` : '<div style="width:80px;height:80px;background:var(--input);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:2rem">📦</div>'}
        <div class="list-item-info">
          <div class="list-item-title">${escapeHtml(it.name||'Sans nom')}</div>
          <div class="list-item-meta">
            ${it.pricePerKg?.toFixed(2)||'?'} €/kg • ${it.price||'?'}€ / ${it.qty||'?'}${it.unit||''}<br>
            ${'⭐'.repeat(it.rating||0)}${'☆'.repeat(5-(it.rating||0))}
            ${it.note ? '<br><em style="font-size:.8rem;opacity:.75">'+escapeHtml(it.note).slice(0,80)+'</em>' : ''}
          </div>
        </div>
        <div class="list-item-actions">
          <button data-edit="${it.id}">✏️</button>
          <button class="danger" data-del="${it.id}">🗑️</button>
        </div>`;
      list.appendChild(div);
    });
    list.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', async () => {
      const f = await DB.get('favorites', +b.dataset.edit);
      openEditor(f);
    }));
        list.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
      if (confirm('Supprimer ce favori ?')){
        await DB.del('favorites', +b.dataset.del);
        render();
      }
    }));
  }

  function openEditor(item = {}){
    const isEdit = !!item.id;
    const html = `
      <h3>${isEdit ? '✏️ Modifier' : '➕ Ajouter'} un favori</h3>
      <label>Nom / Marque
        <input id="fName" type="text" value="${escapeAttr(item.name||'')}" placeholder="Ex: Charbon Weber">
      </label>
      <label>Prix (€)
        <input id="fPrice" type="number" inputmode="decimal" step="0.01" value="${item.price||''}">
      </label>
      <div class="toggle-unit">
        <button class="unit-btn ${(item.unit||'L')==='L'?'active':''}" data-u="L">Litres</button>
        <button class="unit-btn ${item.unit==='kg'?'active':''}" data-u="kg">Kilos</button>
      </div>
      <label>Quantité
        <input id="fQty" type="number" inputmode="decimal" step="0.1" value="${item.qty||''}">
      </label>
      <label>Densité (kg/L, si en litres)
        <input id="fDen" type="number" inputmode="decimal" step="0.01" value="${item.density||0.15}">
      </label>
      <label>Note ⭐
        <div class="stars" id="fStars" data-val="${item.rating||0}">
          ${[1,2,3,4,5].map(i=>`<span class="s ${i<=(item.rating||0)?'on':''}" data-v="${i}">★</span>`).join('')}
        </div>
      </label>
      <label>Commentaire
        <textarea id="fNote" rows="3" placeholder="Durée de combustion, qualité, odeur...">${escapeHtml(item.note||'')}</textarea>
      </label>
      <label>📷 Photo du sac
        <input id="fPhoto" type="file" accept="image/*" capture="environment">
      </label>
      <div id="fPhotoPreview" style="margin-top:8px">
        ${item.photo ? `<img src="${URL.createObjectURL(item.photo)}" style="max-width:100%;border-radius:10px">` : ''}
      </div>
      <button class="btn-primary" id="fSave">💾 Enregistrer</button>
      ${isEdit ? '<button class="btn-danger" id="fDel">🗑️ Supprimer</button>' : ''}
    `;
    UI.modal(html);

    let unit = item.unit || 'L';
    let rating = item.rating || 0;
    let photoBlob = item.photo || null;

    document.querySelectorAll('#modal .unit-btn').forEach(b => b.addEventListener('click', () => {
      unit = b.dataset.u;
      document.querySelectorAll('#modal .unit-btn').forEach(x => x.classList.toggle('active', x === b));
    }));

    document.querySelectorAll('#fStars .s').forEach(s => s.addEventListener('click', () => {
      rating = +s.dataset.v;
      document.querySelectorAll('#fStars .s').forEach(x => x.classList.toggle('on', +x.dataset.v <= rating));
    }));

    document.getElementById('fPhoto').addEventListener('change', async e => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        photoBlob = await compressImage(file, 600, 0.8);
        const preview = document.getElementById('fPhotoPreview');
        preview.innerHTML = `<img src="${URL.createObjectURL(photoBlob)}" style="max-width:100%;border-radius:10px">`;
      } catch(err){ alert('Impossible de traiter cette image.'); }
    });

    document.getElementById('fSave').addEventListener('click', async () => {
      const price = parseFloat(document.getElementById('fPrice').value);
      const qty = parseFloat(document.getElementById('fQty').value);
      const density = parseFloat(document.getElementById('fDen').value) || 0.15;
      if (!price || !qty){ alert('Prix et quantité requis.'); return; }
      const kg = unit === 'kg' ? qty : qty * density;
      const data = {
        name: document.getElementById('fName').value.trim() || 'Sans nom',
        price, qty, unit, density,
        pricePerKg: price / kg,
        rating,
        note: document.getElementById('fNote').value.trim(),
        photo: photoBlob,
        updatedAt: Date.now()
      };
      if (isEdit) data.id = item.id;
      await DB.put('favorites', data);
      UI.closeModal();
      render();
    });

    if (isEdit){
      document.getElementById('fDel').addEventListener('click', async () => {
        if (confirm('Supprimer ce favori ?')){
          await DB.del('favorites', item.id);
          UI.closeModal();
          render();
        }
      });
    }
  }

  function init(){
    document.getElementById('carnetAddBtn').addEventListener('click', () => openEditor());
    render();
  }

  function escapeHtml(s){ return (s||'').toString().replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function escapeAttr(s){ return escapeHtml(s); }

  return { init, render, openEditor };
})();
