const Comparator = (() => {
  let items = []; // {name, price, qty, unit, density, ppk}

  function recalc(it){
    const kg = it.unit === 'kg' ? it.qty : it.qty * (it.density || 0.15);
    it.ppk = it.price / kg;
    return it;
  }

  function render(){
    const list = document.getElementById('compList');
    list.innerHTML = '';
    if (!items.length){ list.innerHTML = '<p class="hint">Aucun sac ajouté pour le moment.</p>'; return; }
    const sorted = [...items].sort((a,b)=>a.ppk-b.ppk);
    sorted.forEach((it, idx) => {
      const div = document.createElement('div');
      div.className = 'list-item';
      div.innerHTML = `
        <div class="list-item-info">
          <div class="list-item-title">
            <span class="rank-badge ${idx===0?'rank-best':''}">${idx+1}</span>
            ${escapeHtml(it.name || 'Sans nom')}
          </div>
          <div class="list-item-meta">
            ${it.price.toFixed(2)}€ • ${it.qty}${it.unit} • <strong>${it.ppk.toFixed(2)} €/kg</strong>
          </div>
        </div>
        <div class="list-item-actions">
          <button class="danger" data-i="${items.indexOf(it)}">🗑️</button>
        </div>`;
      list.appendChild(div);
    });
    list.querySelectorAll('button.danger').forEach(b =>
      b.addEventListener('click', () => { items.splice(+b.dataset.i,1); render(); }));
  }

  function openAdd(prefill = {}){
    const html = `
      <h3>Ajouter un sac</h3>
      <label>Nom / Marque <input id="cmpName" type="text" value="${escapeAttr(prefill.name||'')}"></label>
      <label>Prix (€) <input id="cmpPrice" type="number" inputmode="decimal" step="0.01" value="${prefill.price||''}"></label>
      <div class="toggle-unit">
        <button class="unit-btn ${(prefill.unit||'L')==='L'?'active':''}" data-u="L">Litres</button>
        <button class="unit-btn ${prefill.unit==='kg'?'active':''}" data-u="kg">Kilos</button>
      </div>
      <label>Quantité <input id="cmpQty" type="number" inputmode="decimal" step="0.1" value="${prefill.qty||''}"></label>
      <label>Densité (kg/L, si en litres) <input id="cmpDen" type="number" inputmode="decimal" step="0.01" value="${prefill.density||0.15}"></label>
      <button class="btn-primary" id="cmpAdd">✅ Ajouter</button>`;
    UI.modal(html);
    let unit = prefill.unit || 'L';
    document.querySelectorAll('#modal .unit-btn').forEach(b => b.addEventListener('click',()=>{
      unit=b.dataset.u; document.querySelectorAll('#modal .unit-btn').forEach(x=>x.classList.toggle('active',x===b));
    }));
    document.getElementById('cmpAdd').addEventListener('click', () => {
      const it = {
        name: document.getElementById('cmpName').value.trim(),
        price: parseFloat(document.getElementById('cmpPrice').value),
        qty: parseFloat(document.getElementById('cmpQty').value),
        unit,
        density: parseFloat(document.getElementById('cmpDen').value) || 0.15
      };
      if (!it.price || !it.qty){ alert('Prix et quantité requis.'); return; }
      items.push(recalc(it));
      UI.closeModal(); render();
    });
  }

  async function openImport(){
    const favs = await DB.all('favorites');
    if (!favs.length){ alert('Aucun favori enregistré. Ajoute-en depuis le carnet.'); return; }
    const html = `<h3>Importer un favori</h3>
      <div class="checks">
        ${favs.map(f=>`<button class="check-item" data-id="${f.id}">${escapeHtml(f.name||'Sans nom')}<br><small>${f.pricePerKg?.toFixed(2)||'?'} €/kg</small></button>`).join('')}
      </div>`;
    UI.modal(html);
    document.querySelectorAll('#modal .check-item').forEach(b => b.addEventListener('click', async () => {
      const f = await DB.get('favorites', +b.dataset.id);
      if (f){
        items.push(recalc({
          name: f.name, price: f.price, qty: f.qty, unit: f.unit||'L', density: f.density||0.15
        }));
        UI.closeModal(); render();
      }
    }));
  }

  function init(){
    document.getElementById('compAddBtn').addEventListener('click', ()=>openAdd());
    document.getElementById('compImportBtn').addEventListener('click', openImport);
    render();
  }

  function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function escapeAttr(s){ return escapeHtml(s); }

  return { init };
})();
