// =========================================================
// Outils d'interface partagés
// =========================================================
const UI = (() => {
  let onClose = null;

  function modal(html, opts = {}){
    document.getElementById('modalBody').innerHTML = html;
    document.getElementById('modal').hidden = false;
    document.body.style.overflow = 'hidden';
    onClose = opts.onClose || null;
    // focus sur le premier champ utile (sans faire sauter le clavier sur mobile si pas voulu)
    if (opts.focus){
      const el = document.querySelector(opts.focus);
      if (el) setTimeout(() => el.focus(), 120);
    }
  }
  function closeModal(){
    document.getElementById('modal').hidden = true;
    document.getElementById('modalBody').innerHTML = '';
    document.body.style.overflow = '';
    const f = onClose; onClose = null;
    if (f) f();
  }

  // Confirmation stylée → Promise<boolean>
  function confirm(message, { ok = 'OK', cancel = 'Annuler', danger = false } = {}){
    return new Promise(resolve => {
      const box = document.getElementById('dialog');
      const okBtn = document.getElementById('dialogOk');
      const cancelBtn = document.getElementById('dialogCancel');
      document.getElementById('dialogMsg').textContent = message;
      okBtn.textContent = ok;
      cancelBtn.textContent = cancel;
      okBtn.classList.toggle('danger', !!danger);
      box.hidden = false;
      const done = v => {
        box.hidden = true;
        okBtn.onclick = cancelBtn.onclick = box.onclick = null;
        document.removeEventListener('keydown', onKey, true);
        resolve(v);
      };
      const onKey = e => {
        if (e.key === 'Escape'){ e.stopPropagation(); done(false); }
        if (e.key === 'Enter'){ e.preventDefault(); e.stopPropagation(); done(true); }
      };
      okBtn.onclick = () => done(true);
      cancelBtn.onclick = () => done(false);
      box.onclick = e => { if (e.target === box) done(false); };
      document.addEventListener('keydown', onKey, true);
      setTimeout(() => okBtn.focus(), 50);
    });
  }

  let toastTimer = null;
  function toast(message, ms = 2600){
    const t = document.getElementById('toast');
    t.textContent = message;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, ms);
  }

  function esc(s){
    return (s == null ? '' : String(s)).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // Nombre au format français : 2,35
  function num(n, dec = 2){
    if (n == null || !isFinite(n)) return '—';
    return Number(n).toFixed(dec).replace('.', ',');
  }
  // Nombre « propre » : 40 → "40", 2.5 → "2,5"
  function qty(n){
    if (n == null || !isFinite(n)) return '?';
    return String(Math.round(n * 100) / 100).replace('.', ',');
  }
  // Lit un champ numérique en acceptant la virgule
  function readNum(el){
    if (!el) return NaN;
    const v = String(el.value || '').replace(',', '.').trim();
    return v === '' ? NaN : parseFloat(v);
  }

  // Réduit une photo (WebP, 600 px max)
  function compressImage(file, maxSize = 600, quality = 0.8){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > height && width > maxSize){ height = height * maxSize / width; width = maxSize; }
          else if (height > maxSize){ width = width * maxSize / height; height = maxSize; }
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(width); canvas.height = Math.round(height);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(b => b ? resolve(b) : reject(new Error('Conversion impossible')), 'image/webp', quality);
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  return { modal, closeModal, confirm, toast, esc, num, qty, readNum, compressImage };
})();

// =========================================================
// Application
// =========================================================
const App = (() => {
  const PAGES = ['calculator', 'comparator', 'meat', 'guide', 'settings'];
  const CLE_ONGLET = 'barbeuq.onglet'; // petit réglage d'interface (localStorage)

  function showPage(id){
    if (!PAGES.includes(id)) id = 'calculator';
    document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === 'page-' + id));
    document.querySelectorAll('.tab-btn').forEach(b => {
      const on = b.dataset.page === id;
      b.classList.toggle('active', on);
      if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    const page = document.getElementById('page-' + id);
    document.getElementById('headerPage').textContent = page ? page.dataset.title : '';
    window.scrollTo({ top: 0 });
    try { localStorage.setItem(CLE_ONGLET, id); } catch (e) {}
    if (id === 'settings') Donnees.refreshCount();
  }

  function bindNav(){
    document.querySelectorAll('.tab-btn').forEach(b =>
      b.addEventListener('click', () => showPage(b.dataset.page)));
    document.getElementById('modalClose').addEventListener('click', UI.closeModal);
    document.getElementById('modal').addEventListener('click', e => {
      if (e.target.id === 'modal') UI.closeModal();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !document.getElementById('modal').hidden && document.getElementById('dialog').hidden){
        UI.closeModal();
      }
    });
  }

  // Installation PWA
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    const card = document.getElementById('installCard');
    if (card) card.hidden = false;
  });

  function bindInstall(){
    const btn = document.getElementById('btnInstall');
    btn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      document.getElementById('installCard').hidden = true;
    });
  }

  async function init(){
    // Stockage persistant : le navigateur ne doit pas effacer les données en cas de manque de place
    try {
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    } catch (e) {}

    try { await Theme.load(); } catch (e) { console.warn('Thème', e); }
    Theme.bind();
    bindNav();
    bindInstall();
    Calculator.init();
    Wood.init();
    Meat.init();
    Guide.init();
    Donnees.init();

    let onglet = 'calculator';
    try { onglet = localStorage.getItem(CLE_ONGLET) || onglet; } catch (e) {}
    showPage(onglet);

    // Les sacs locaux s'affichent tout de suite, sans attendre le serveur
    await Comparator.init();

    // Serveur maison (sauvegarde complète)
    Donnees.brancherServeurMaison();

    // Service Worker
    if ('serviceWorker' in navigator){
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  document.addEventListener('DOMContentLoaded', init);
  return { showPage };
})();
