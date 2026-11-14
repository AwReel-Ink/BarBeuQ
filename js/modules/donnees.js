// =========================================================
// Mes données : export / import fichier + serveur maison (mode simple)
// =========================================================
const Donnees = (() => {
  const APP = 'barbeuq';
  const VERSION = 1;
  const STORE = 'favorites';

  // ---------- Photos : Blob <-> { type, data (base64) } ----------
  function blobToBase64(blob){
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => {
        const s = String(r.result);
        resolve(s.slice(s.indexOf(',') + 1));
      };
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
  }
  function base64ToBlob(data, type){
    const bin = atob(data);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type });
  }

  function compareId(a, b){ return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; }

  // Tous les sacs, triés par id, photos en base64.
  // Aucun élément variable (date, appareil…) : même données → même contenu.
  async function lireSacs(){
    const all = await DB.all(STORE);
    all.sort(compareId);
    const out = [];
    for (const it of all){
      const o = { ...it };
      if (it.photo instanceof Blob){
        o.photo = { type: it.photo.type, data: await blobToBase64(it.photo) };
      }
      out.push(o);
    }
    return out;
  }

  // Contenu pour le serveur maison : identique à l'export, sans la date
  async function exporter(){
    return { app: APP, version: VERSION, favorites: await lireSacs() };
  }

  // ---------- Vérification complète d'un fichier (avant toute écriture) ----------
  function estObjet(v){ return v !== null && typeof v === 'object' && !Array.isArray(v); }
  function nombreOuVide(v){ return v === undefined || v === null || (typeof v === 'number' && isFinite(v)); }
  function texteOuVide(v){ return v === undefined || v === null || typeof v === 'string'; }

  // Renvoie la liste des enregistrements prêts à écrire (photos en Blob), ou lève une erreur lisible.
  function analyser(texte){
    let d;
    try { d = JSON.parse(texte); }
    catch (e){ throw new Error("Ce fichier n'est pas un fichier JSON valide."); }

    if (!estObjet(d) || d.app !== APP) throw new Error("Ce fichier n'est pas une sauvegarde BarBeuQ.");
    if (typeof d.version !== 'number' || !Number.isInteger(d.version) || d.version < 1){
      throw new Error('Version de sauvegarde inconnue.');
    }
    if (d.version > VERSION) throw new Error("Cette sauvegarde vient d'une version plus récente de BarBeuQ. Mets l'appli à jour.");
    if (!Array.isArray(d.favorites)) throw new Error('La liste des sacs est absente du fichier.');

    const ids = new Set();
    return d.favorites.map((src, i) => {
      const n = i + 1;
      if (!estObjet(src)) throw new Error(`Sac n°${n} : format invalide.`);
      if (!Number.isInteger(src.id) || src.id < 1) throw new Error(`Sac n°${n} : identifiant invalide.`);
      if (ids.has(src.id)) throw new Error(`Identifiant ${src.id} en double dans le fichier.`);
      ids.add(src.id);
      if (!texteOuVide(src.name) || !texteOuVide(src.note)) throw new Error(`Sac n°${n} : nom ou commentaire invalide.`);
      for (const k of ['qty', 'density', 'price', 'pricePerKg', 'rating', 'updatedAt']){
        if (!nombreOuVide(src[k])) throw new Error(`Sac n°${n} : valeur « ${k} » invalide.`);
      }
      if (src.unit !== undefined && src.unit !== null && src.unit !== 'L' && src.unit !== 'kg'){
        throw new Error(`Sac n°${n} : unité invalide.`);
      }
      if (src.stores !== undefined){
        if (!Array.isArray(src.stores)) throw new Error(`Sac n°${n} : liste des magasins invalide.`);
        src.stores.forEach(s => {
          if (!estObjet(s) || typeof s.price !== 'number' || !isFinite(s.price) || !texteOuVide(s.name) || !texteOuVide(s.city)){
            throw new Error(`Sac n°${n} : magasin invalide.`);
          }
        });
      }

      const rec = { ...src }; // garde l'id et l'ordre des champs
      if (src.photo !== undefined && src.photo !== null){
        const p = src.photo;
        if (!estObjet(p) || typeof p.type !== 'string' || typeof p.data !== 'string'){
          throw new Error(`Sac n°${n} : photo invalide.`);
        }
        try { rec.photo = base64ToBlob(p.data, p.type); }
        catch (e){ throw new Error(`Sac n°${n} : photo illisible.`); }
      }
      return rec;
    });
  }

  // Remplace tous les sacs (une seule transaction) puis recharge l'affichage
  async function remplacer(sacs){
    await DB.replaceAll(STORE, sacs);
    if (!document.getElementById('modal').hidden) UI.closeModal();
    await Comparator.reload();
    refreshCount();
  }

  // Serveur maison : restauration (la confirmation est déjà faite par le panneau)
  async function importer(texte){
    const sacs = analyser(typeof texte === 'string' ? texte : String(texte));
    await remplacer(sacs);
  }

  // ---------- Export fichier ----------
  function dateFichier(d = new Date()){
    const p = n => String(n).padStart(2, '0');
    return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}`;
  }

  async function exporterFichier(){
    try {
      const contenu = { app: APP, version: VERSION, date: new Date().toISOString(), favorites: await lireSacs() };
      const blob = new Blob([JSON.stringify(contenu, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `barbeuq-sauvegarde-${dateFichier()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      const n = contenu.favorites.length;
      UI.toast(`📤 ${n} sac${n > 1 ? 's' : ''} exporté${n > 1 ? 's' : ''}`);
    } catch (e){
      console.error('Export', e);
      UI.toast("L'export a échoué.");
    }
  }

  // ---------- Import fichier ----------
  async function importerFichier(file){
    let sacs;
    try {
      sacs = analyser(await file.text());
    } catch (e){
      UI.toast('❌ ' + e.message, 4500);
      return; // fichier invalide : rien n'est modifié
    }
    const n = sacs.length;
    const message = n === 0
      ? 'Ce fichier ne contient aucun sac. Vider tous les sacs de cet appareil ?'
      : n === 1
        ? 'Remplacer tous les sacs de cet appareil par le sac du fichier ?'
        : `Remplacer tous les sacs de cet appareil par les ${n} sacs du fichier ?`;
    const ok = await UI.confirm(message, { ok: 'Remplacer', danger: true });
    if (!ok) return;
    try {
      await remplacer(sacs);
      UI.toast(`📥 ${n} sac${n > 1 ? 's' : ''} importé${n > 1 ? 's' : ''}`);
    } catch (e){
      console.error('Import', e);
      UI.toast("❌ L'import a échoué, tes sacs n'ont pas été modifiés.", 4500);
    }
  }

  async function refreshCount(){
    const el = document.getElementById('dataCount');
    if (!el) return;
    try {
      const n = (await DB.all(STORE)).length;
      el.textContent = n
        ? `${n} sac${n > 1 ? 's' : ''} enregistré${n > 1 ? 's' : ''} sur cet appareil`
        : 'Aucun sac enregistré pour le moment';
    } catch (e) {}
  }

  // ---------- Branchement ----------
  function init(){
    const input = document.getElementById('importFile');
    document.getElementById('btnExport').addEventListener('click', exporterFichier);
    document.getElementById('btnImport').addEventListener('click', () => input.click());
    input.addEventListener('change', async () => {
      const f = input.files && input.files[0];
      input.value = '';
      if (f) await importerFichier(f);
    });
    document.getElementById('btnMaison').addEventListener('click', () => {
      if (window.SyncMaison && SyncMaison.instance) SyncMaison.ouvrirReglages();
      else UI.toast('Module « Serveur maison » indisponible.');
    });
    refreshCount();
  }

  function brancherServeurMaison(){
    if (!window.SyncMaison) return;
    try {
      SyncMaison.configurer({ app: 'barbeuq', nom: 'BarBeuQ', mode: 'simple', exporter, importer });
    } catch (e){
      console.error('[SyncMaison] configuration', e);
    }
  }

  return { init, brancherServeurMaison, refreshCount, exporter, importer, analyser };
})();
