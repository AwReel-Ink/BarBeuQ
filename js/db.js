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

  return {
    async add(store, data){
      const s = await tx(store,'readwrite');
      return new Promise((res,rej)=>{ const r=s.add(data); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); });
    },
    async put(store, data){
      const s = await tx(store,'readwrite');
      return new Promise((res,rej)=>{ const r=s.put(data); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); });
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
      return new Promise((res,rej)=>{ const r=s.delete(key); r.onsuccess=()=>res(); r.onerror=()=>rej(r.error); });
    }
  };
})();
