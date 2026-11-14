const Calculator = (() => {
  let unit = 'L';
  let type = 'bois';

  function el(id){ return document.getElementById(id); }

  function compute(){
    const price = UI.readNum(el('calcPrice'));
    const qty = UI.readNum(el('calcQty'));
    const d = UI.readNum(el('calcDensity')) || 0.15;
    const box = el('calcResult');
    const val = box.querySelector('.result-value');
    const sub = el('calcResultSub');
    el('calcDensityLabel').textContent = UI.num(d) + ' kg/L';

    const ok = price > 0 && qty > 0;
    el('calcSaveBtn').disabled = !ok;
    box.classList.toggle('ok', ok);
    if (!ok){
      val.textContent = '— €/kg';
      sub.textContent = 'Renseigne le prix et la contenance';
      return null;
    }
    const kg = unit === 'kg' ? qty : qty * d;
    const ppk = price / kg;
    val.textContent = UI.num(ppk) + ' €/kg';
    sub.textContent = unit === 'kg'
      ? `${UI.qty(qty)} kg pour ${UI.num(price)} €`
      : `≈ ${UI.num(kg, 1)} kg dans le sac de ${UI.qty(qty)} L`;
    return { price, qty, unit, density: d, type, kg, ppk };
  }

  function setUnit(u){
    unit = u;
    document.querySelectorAll('#calcUnit .seg-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.unit === u));
    el('calcQtySuffix').textContent = u === 'kg' ? 'kg' : 'L';
    el('lblQty').textContent = u === 'kg' ? 'Poids' : 'Contenance';
    el('calcAdvanced').hidden = (u === 'kg');
    compute();
  }

  function setType(t, d){
    type = t;
    document.querySelectorAll('#calcType .seg-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.type === t));
    el('calcDensity').value = d;
    compute();
  }

  function init(){
    document.querySelectorAll('#calcType .seg-btn').forEach(b =>
      b.addEventListener('click', () => setType(b.dataset.type, parseFloat(b.dataset.density))));
    document.querySelectorAll('#calcUnit .seg-btn').forEach(b =>
      b.addEventListener('click', () => setUnit(b.dataset.unit)));
    ['calcPrice','calcQty','calcDensity'].forEach(id =>
      el(id).addEventListener('input', compute));
    el('calcSaveBtn').addEventListener('click', () => {
      const r = compute();
      if (!r){ UI.toast('Renseigne le prix et la contenance.'); return; }
      App.showPage('comparator');
      Comparator.openSackModal(null, { qty: r.qty, unit: r.unit, density: r.density, price: r.price });
    });
    compute();
  }
  return { init, compute };
})();
