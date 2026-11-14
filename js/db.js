const DB = (() => {
  const NAME = 'barbeuq';
  const VERSION = 1;
  let _db;

  function open(){
    return new Promise((res, rej) => {
      if (_db) return res(_db);
      const req = indexedDB.open(NAME, VERSION);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('favorites')) {
          const s = db.createObjectStore('favorites', { keyPath:'id', autoIncrement:true });
          s.createIndex('name','name');
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath:'key' });
        }
      };
      req.onsuccess = e => { _db = e.target.result; res(_db); };
      req.onerror = e => rej(e.target.error);
    });
  }

  function tx(store, mode='readonly'){
    return open().then(db => db.transaction(store, mode).objectStore(store));
  }

  // Serveur maison (mode simple) : signale que les données ont changé.
  // Seul le store « favorites » contient des données à sauvegarder (pas « settings »).
  function signaler(store){
    if (store !== 'favorites' || !window.SyncMaison) return;
    try { Promise.resolve(SyncMaison.modifie()).catch(err => console.error('[SyncMaison] modifie', err)); }
    catch (err) { console.error('[SyncMaison] modifie', err); }
  }

  return {
    async add(store, data){
      const s = await tx(store,'readwrite');
      const id = await new Promise((res,rej)=>{ const r=s.add(data); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); });
      signaler(store);
      return id;
    },
    async put(store, data){
      const s = await tx(store,'readwrite');
      const id = await new Promise((res,rej)=>{ const r=s.put(data); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); });
      signaler(store);
      return id;
    },
    async get(store, key){
      const s = await tx(store);
      return new Promise((res,rej)=>{ const r=s.get(key); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); });
    },
    async all(store){
      const s = await tx(store);
      return new Promise((res,rej)=>{ const r=s.getAll(); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); });
    },
    async del(store, key){
      const s = await tx(store,'readwrite');
      await new Promise((res,rej)=>{ const r=s.delete(key); r.onsuccess=()=>res(); r.onerror=()=>rej(r.error); });
      signaler(store);
    },
    // Vide le store puis écrit tous les enregistrements, dans UNE seule transaction :
    // en cas d'erreur, rien n'est modifié.
    async replaceAll(store, items){
      const db = await open();
      await new Promise((res, rej) => {
        const t = db.transaction(store, 'readwrite');
        const s = t.objectStore(store);
        s.clear();
        items.forEach(it => s.put(it));
        t.oncomplete = () => res();
        t.onerror = () => rej(t.error);
        t.onabort = () => rej(t.error || new Error('Transaction annulée'));
      });
      signaler(store);
    }
  };
})();
