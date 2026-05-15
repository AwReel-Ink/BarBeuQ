const Calculator = (() => {
  let unit = 'L';
  let density = 0.15;
  let type = 'bois';

  function compute(){
    const price = parseFloat(document.getElementById('calcPrice').value);
    const qty = parseFloat(document.getElementById('calcQty').value);
    const d = parseFloat(document.getElementById('calcDensity').value) || 0.15;
    const box = document.querySelector('#calcResult .result-value');
    if (!price || !qty || price<=0 || qty<=0){ box.textContent='— €/kg'; return null; }
    const kg = unit === 'kg' ? qty : qty * d;
    const ppk = price / kg;
    box.textContent = ppk.toFixed(2).replace('.',',') + ' €/kg';
    return { price, qty, unit, density:d, type, kg, ppk };
  }

  function setUnit(u){
    unit = u;
    document.querySelectorAll('#page-calculator .unit-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.unit === u));
    document.getElementById('lblQty').childNodes[0].nodeValue =
      u === 'kg' ? 'Poids du sac (kg)' : 'Volume du sac (litres)';
    document.querySelector('#page-calculator .advanced').hidden = (u === 'kg');
    compute();
  }

  function setType(t, d){
    type = t; density = d;
    document.querySelectorAll('#page-calculator .tab').forEach(b =>
      b.classList.toggle('active', b.dataset.type === t));
    document.getElementById('calcDensity').value = d;
    compute();
  }

  function init(){
    document.querySelectorAll('#page-calculator .tab').forEach(b =>
      b.addEventListener('click', () => setType(b.dataset.type, parseFloat(b.dataset.density))));
    document.querySelectorAll('#page-calculator .unit-btn').forEach(b =>
      b.addEventListener('click', () => setUnit(b.dataset.unit)));
    ['calcPrice','calcQty','calcDensity'].forEach(id =>
      document.getElementById(id).addEventListener('input', compute));
    document.getElementById('calcSaveBtn').addEventListener('click', async () => {
      const r = compute();
      if (!r){ alert('Renseigne le prix et la quantité.'); return; }
      Carnet.openEditor({ pricePerKg: r.ppk, price: r.price, qty: r.qty, unit: r.unit, type: r.type });
    });
  }
  return { init, compute };
})();
