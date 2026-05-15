const Guide = (() => {
  const ITEMS = [
    { name:'🌭 Saucisses / Merguez', braise:'Moyenne-chaude', time:'8-12 min', tips:'Retourner souvent, piquer non recommandé.' },
    { name:'🥩 Steak (2-3 cm)',      braise:'Très chaude',    time:'3-5 min / face', tips:'Saisir fort, laisser reposer 5 min après cuisson.' },
    { name:'🍖 Côtes de porc',       braise:'Moyenne',        time:'6-8 min / face', tips:'Mariner avant. Vérifier que le jus est clair.' },
    { name:'🍗 Cuisses de poulet',   braise:'Moyenne',        time:'25-35 min',      tips:'Cuisson indirecte, retourner toutes les 8 min. Température à cœur 75°C.' },
    { name:'🍗 Ailes de poulet',     braise:'Moyenne',        time:'15-20 min',      tips:'Retourner régulièrement, attention à la marinade sucrée qui brûle.' },
    { name:'🍢 Brochettes',          braise:'Moyenne-chaude', time:'10-15 min',      tips:'Tourner 4 fois (chaque face). Tremper les piques en bois avant.' },
    { name:'🐟 Poisson entier',      braise:'Moyenne',        time:'6-8 min / face', tips:'Dans une grille double, peau huilée pour éviter qu\'elle colle.' },
    { name:'🐟 Filets/pavés',        braise:'Moyenne',        time:'3-5 min / face', tips:'Côté peau en premier, ne pas trop manipuler.' },
    { name:'🦐 Crevettes/Gambas',    braise:'Chaude',         time:'2-3 min / face', tips:'Rosées et opaques = cuites. Surveiller, ça va vite !' },
    { name:'🥦 Légumes (courgettes, poivrons)', braise:'Moyenne', time:'4-6 min / face', tips:'Huiler légèrement, saler en fin de cuisson.' },
    { name:'🌽 Épi de maïs',         braise:'Moyenne',        time:'15-20 min',      tips:'En papillote ou directement avec feuilles, tourner souvent.' },
    { name:'🍔 Burger maison',       braise:'Chaude',         time:'3-4 min / face', tips:'Ne jamais écraser au spatule, ça assèche.' }
  ];

  function init(){
    const box = document.getElementById('guideList');
    box.innerHTML = ITEMS.map(it => `
      <div class="guide-item">
        <h4>${it.name}</h4>
        <div class="gi-row"><span>🔥 Braise</span><strong>${it.braise}</strong></div>
        <div class="gi-row"><span>⏱️ Temps</span><strong>${it.time}</strong></div>
        <div class="gi-row"><span>💡 Astuce</span><span style="text-align:right;max-width:60%;font-size:.88rem">${it.tips}</span></div>
      </div>`).join('');
  }

  return { init };
})();
