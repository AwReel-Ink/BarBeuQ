const Guide = (() => {
  // heat : 1 = moyenne … 4 = très chaude (pour l'indicateur visuel)
  const ITEMS = [
    { name:'🌭 Saucisses / Merguez', braise:'Moyenne-chaude', heat:2, time:'8-12 min',       tips:'Retourner souvent, piquer non recommandé.', mots:'saucisse merguez chipolata' },
    { name:'🥩 Steak (2-3 cm)',      braise:'Très chaude',    heat:4, time:'3-5 min / face', tips:'Saisir fort, laisser reposer 5 min après cuisson.', mots:'boeuf entrecote cote viande rouge' },
    { name:'🍖 Côtes de porc',       braise:'Moyenne',        heat:1, time:'6-8 min / face', tips:'Mariner avant. Vérifier que le jus est clair.', mots:'porc cote travers' },
    { name:'🍗 Cuisses de poulet',   braise:'Moyenne',        heat:1, time:'25-35 min',      tips:'Cuisson indirecte, retourner toutes les 8 min. Température à cœur 75°C.', mots:'poulet volaille pilon' },
    { name:'🍗 Ailes de poulet',     braise:'Moyenne',        heat:1, time:'15-20 min',      tips:'Retourner régulièrement, attention à la marinade sucrée qui brûle.', mots:'poulet volaille aile wings' },
    { name:'🍢 Brochettes',          braise:'Moyenne-chaude', heat:2, time:'10-15 min',      tips:'Tourner 4 fois (chaque face). Tremper les piques en bois avant.', mots:'brochette kebab' },
    { name:'🐟 Poisson entier',      braise:'Moyenne',        heat:1, time:'6-8 min / face', tips:'Dans une grille double, peau huilée pour éviter qu\'elle colle.', mots:'poisson dorade bar sardine maquereau' },
    { name:'🐟 Filets / pavés',      braise:'Moyenne',        heat:1, time:'3-5 min / face', tips:'Côté peau en premier, ne pas trop manipuler.', mots:'poisson saumon filet pave' },
    { name:'🦐 Crevettes / Gambas',  braise:'Chaude',         heat:3, time:'2-3 min / face', tips:'Rosées et opaques = cuites. Surveiller, ça va vite !', mots:'crevette gambas fruits de mer' },
    { name:'🥦 Légumes (courgettes, poivrons)', braise:'Moyenne', heat:1, time:'4-6 min / face', tips:'Huiler légèrement, saler en fin de cuisson.', mots:'legume courgette poivron aubergine oignon champignon vegetarien' },
    { name:'🌽 Épi de maïs',         braise:'Moyenne',        heat:1, time:'15-20 min',      tips:'En papillote ou directement avec feuilles, tourner souvent.', mots:'mais epi legume' },
    { name:'🍔 Burger maison',       braise:'Chaude',         heat:3, time:'3-4 min / face', tips:'Ne jamais écraser à la spatule, ça assèche.', mots:'burger steak hache boeuf' }
  ];

  function norm(s){ return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

  function render(q = ''){
    const box = document.getElementById('guideList');
    const words = norm(q).split(/\s+/).filter(Boolean);
    const list = ITEMS.filter(it => {
      const txt = norm(it.name + ' ' + it.mots + ' ' + it.tips);
      return words.every(w => txt.includes(w));
    });
    if (!list.length){
      box.innerHTML = '<div class="empty"><div class="empty-ico">🔎</div><h3>Rien trouvé</h3><p>Essaie « poulet », « poisson », « légumes »…</p></div>';
      return;
    }
    box.innerHTML = list.map(it => `
      <div class="guide-item">
        <h3>${it.name}</h3>
        <div class="guide-tags">
          <span class="tag tag-heat"><span class="heat">${'🔥'.repeat(it.heat)}</span> ${it.braise}</span>
          <span class="tag">⏱️ ${it.time}</span>
        </div>
        <p class="guide-tip">💡 ${it.tips}</p>
      </div>`).join('');
  }

  function init(){
    render();
    document.getElementById('guideSearch').addEventListener('input', e => render(e.target.value));
  }

  return { init };
})();
