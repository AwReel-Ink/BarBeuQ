const Meat = (() => {
  // Grammes par personne selon profil
  const RATES = {
    bone:    { kid: 100, adult: 250, big: 400 }, // viande avec os
    boneless:{ kid:  80, adult: 180, big: 300 }, // viande sans os
    fish:    { kid:  80, adult: 180, big: 280 },
    veg:     { kid: 100, adult: 200, big: 250 }
  };

  const FOODS = [
    { id:'sausage',  label:'🌭 Saucisses/Merguez', cat:'boneless' },
    { id:'brochette',label:'🍢 Brochettes',         cat:'boneless' },
    { id:'steak',    label:'🥩 Steaks/Entrecôtes',  cat:'boneless' },
    { id:'porkrib',  label:'🍖 Côtes (porc/agneau)',cat:'bone' },
    { id:'chicken',  label:'🍗 Poulet (cuisses/ailes)', cat:'bone' },
    { id:'fish',     label:'🐟 Poisson',            cat:'fish' },
    { id:'veg',      label:'🥦 Légumes grillés',    cat:'veg' }
  ];

  const selected = new Set();

  function renderChoices(){
    const box = document.getElementById('meatChoices');
    box.innerHTML = FOODS.map(f =>
      `<div class="check-item ${selected.has(f.id)?'active':''}" data-id="${f.id}">${f.label}</div>`
    ).join('');
    box.querySelectorAll('.check-item').forEach(el => el.addEventListener('click', () => {
      const id = el.dataset.id;
      if (selected.has(id)) selected.delete(id); else selected.add(id);
      el.classList.toggle('active');
      compute();
    }));
  }

  function compute(){
    const k = parseInt(document.getElementById('nbKids').value)||0;
    const a = parseInt(document.getElementById('nbAdults').value)||0;
    const b = parseInt(document.getElementById('nbBig').value)||0;
    const totalPeople = k+a+b;
    const res = document.getElementById('meatResult');

    if (!totalPeople || !selected.size){
      res.innerHTML = '<span class="result-label">Sélectionne des invités et des aliments</span>';
      return;
    }

    // Répartition équitable entre les aliments choisis dans la même catégorie
    // Stratégie : pour chaque aliment, on prend la ration complète divisée par le nb d'aliments de SA catégorie
    const catCounts = {};
    selected.forEach(id => {
      const f = FOODS.find(x => x.id===id);
      catCounts[f.cat] = (catCounts[f.cat]||0)+1;
    });

    let html = '<span class="result-label">Quantités estimées</span>';
    let totalGrams = 0;
    selected.forEach(id => {
      const f = FOODS.find(x => x.id===id);
      const r = RATES[f.cat];
      const share = 1 / catCounts[f.cat];
      const g = (k*r.kid + a*r.adult + b*r.big) * share;
      totalGrams += g;
      html += `<div class="result-line"><span>${f.label}</span><strong>${formatWeight(g)}</strong></div>`;
    });

    const charbonShort = totalPeople * 0.5;
    const charbonLong  = totalPeople * 0.8;
    html += `<div class="result-line" style="margin-top:8px"><span>👥 Total invités</span><strong>${totalPeople}</strong></div>`;
    html += `<div class="result-line"><span>🍖 Total viande/aliments</span><strong>${formatWeight(totalGrams)}</strong></div>`;
    html += `<div class="result-line"><span>🔥 Charbon (BBQ ~30 min)</span><strong>${charbonShort.toFixed(1)} kg</strong></div>`;
    html += `<div class="result-line"><span>🔥 Charbon (BBQ ~1h+)</span><strong>${charbonLong.toFixed(1)} kg</strong></div>`;

    res.innerHTML = html;
  }

  function formatWeight(g){
    if (g >= 1000) return (g/1000).toFixed(2).replace('.',',') + ' kg';
    return Math.round(g) + ' g';
  }

  function init(){
    renderChoices();
    document.querySelectorAll('#page-meat .btn-step').forEach(b => b.addEventListener('click', () => {
      const inp = document.getElementById(b.dataset.target);
      const v = Math.max(0, (parseInt(inp.value)||0) + parseInt(b.dataset.step));
      inp.value = v;
      compute();
    }));
    ['nbKids','nbAdults','nbBig'].forEach(id =>
      document.getElementById(id).addEventListener('input', compute));
    compute();
  }

  return { init };
})();
