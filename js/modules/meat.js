const Meat = (() => {
  // Grammes par personne selon profil
  const RATES = {
    bone:    { kid: 100, adult: 250, big: 400 }, // viande avec os
    boneless:{ kid:  80, adult: 180, big: 300 }, // viande sans os
    fish:    { kid:  80, adult: 180, big: 280 },
    veg:     { kid: 100, adult: 200, big: 250 }
  };

  const FOODS = [
    { id:'sausage',  label:'🌭 Saucisses / Merguez', cat:'boneless' },
    { id:'brochette',label:'🍢 Brochettes',          cat:'boneless' },
    { id:'steak',    label:'🥩 Steaks / Entrecôtes', cat:'boneless' },
    { id:'porkrib',  label:'🍖 Côtes (porc, agneau)',cat:'bone' },
    { id:'chicken',  label:'🍗 Poulet',              cat:'bone' },
    { id:'fish',     label:'🐟 Poisson',             cat:'fish' },
    { id:'veg',      label:'🥦 Légumes grillés',     cat:'veg' }
  ];

  // Sélection de départ : le grand classique, pour voir un résultat tout de suite
  const selected = new Set(['sausage', 'brochette']);

  function renderChoices(){
    const box = document.getElementById('meatChoices');
    box.innerHTML = FOODS.map(f =>
      `<button type="button" class="chip ${selected.has(f.id) ? 'active' : ''}" data-id="${f.id}" aria-pressed="${selected.has(f.id)}">${f.label}</button>`
    ).join('');
    box.querySelectorAll('.chip').forEach(el => el.addEventListener('click', () => {
      const id = el.dataset.id;
      if (selected.has(id)) selected.delete(id); else selected.add(id);
      el.classList.toggle('active', selected.has(id));
      el.setAttribute('aria-pressed', selected.has(id));
      compute();
    }));
  }

  function val(id){ return Math.max(0, parseInt(document.getElementById(id).value, 10) || 0); }

  function compute(){
    const k = val('nbKids'), a = val('nbAdults'), b = val('nbBig');
    const totalPeople = k + a + b;
    const res = document.getElementById('meatResult');

    if (!totalPeople || !selected.size){
      res.innerHTML = `<div class="big-total"><span class="result-label">Ta liste de courses</span>
        <span class="result-sub">${!totalPeople ? 'Ajoute au moins un invité' : 'Choisis au moins un aliment'}</span></div>`;
      return;
    }

    // Répartition : chaque aliment prend une part de la ration de SA catégorie
    const catCounts = {};
    selected.forEach(id => {
      const f = FOODS.find(x => x.id === id);
      catCounts[f.cat] = (catCounts[f.cat] || 0) + 1;
    });

    let lines = '';
    let totalGrams = 0;
    FOODS.filter(f => selected.has(f.id)).forEach(f => {
      const r = RATES[f.cat];
      const g = (k * r.kid + a * r.adult + b * r.big) / catCounts[f.cat];
      totalGrams += g;
      lines += `<div class="result-line"><span>${f.label}</span><strong>${formatWeight(g)}</strong></div>`;
    });

    res.innerHTML = `
      <div class="big-total">
        <span class="result-label">À acheter pour ${totalPeople} personne${totalPeople > 1 ? 's' : ''}</span>
        <span class="result-value">${formatWeight(totalGrams)}</span>
      </div>
      ${lines}
      <div class="section-mini">🔥 Charbon</div>
      <div class="result-line"><span>BBQ rapide (~30 min)</span><strong>${UI.num(totalPeople * 0.5, 1)} kg</strong></div>
      <div class="result-line"><span>BBQ long (1 h et +)</span><strong>${UI.num(totalPeople * 0.8, 1)} kg</strong></div>`;
  }

  function formatWeight(g){
    if (g >= 1000) return UI.num(g / 1000) + ' kg';
    return Math.round(g) + ' g';
  }

  function init(){
    renderChoices();
    document.querySelectorAll('#page-meat .btn-step').forEach(b => b.addEventListener('click', () => {
      const inp = document.getElementById(b.dataset.target);
      inp.value = Math.max(0, (parseInt(inp.value, 10) || 0) + parseInt(b.dataset.step, 10));
      compute();
    }));
    ['nbKids','nbAdults','nbBig'].forEach(id =>
      document.getElementById(id).addEventListener('input', compute));
    compute();
  }

  return { init };
})();
