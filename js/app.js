const UI = {
  modal(html){
    document.getElementById('modalBody').innerHTML = html;
    document.getElementById('modal').hidden = false;
  },
  closeModal(){
    document.getElementById('modal').hidden = true;
    document.getElementById('modalBody').innerHTML = '';
  }
};

const App = (() => {
  function showPage(id){
    document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === 'page-'+id));
    document.getElementById('btnHome').hidden = (id === 'home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (id === 'carnet') Carnet.render();
  }

  function bindNav(){
    document.querySelectorAll('.tile').forEach(t =>
      t.addEventListener('click', () => showPage(t.dataset.page)));
    document.getElementById('btnHome').addEventListener('click', () => showPage('home'));
    document.getElementById('btnSettings').addEventListener('click', () => showPage('settings'));
    document.getElementById('appTitle').addEventListener('click', () => showPage('home'));
    document.getElementById('modalClose').addEventListener('click', UI.closeModal);
    document.getElementById('modal').addEventListener('click', e => {
      if (e.target.id === 'modal') UI.closeModal();
    });
  }

  // PWA install
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    const btn = document.getElementById('btnInstall');
    if (btn) btn.hidden = false;
  });

  function bindInstall(){
    const btn = document.getElementById('btnInstall');
    btn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      btn.hidden = true;
    });
  }

  async function init(){
    await Theme.load();
    Theme.bind();
    bindNav();
    bindInstall();
    Calculator.init();
    Comparator.init();
    Carnet.init();
    Wood.init();
    Meat.init();
    Guide.init();

    // Service Worker
    if ('serviceWorker' in navigator){
      navigator.serviceWorker.register('sw.js').catch(()=>{});
    }
  }

  document.addEventListener('DOMContentLoaded', init);
  return { showPage };
})();
