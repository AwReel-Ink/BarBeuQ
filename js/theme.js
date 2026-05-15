const Theme = (() => {
  async function load(){
    const t = await DB.get('settings','theme');
    const m = await DB.get('settings','mode');
    if (t) document.body.dataset.theme = t.value;
    if (m) document.body.dataset.mode = m.value;
    refresh();
  }
  function refresh(){
    document.querySelectorAll('.theme-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.theme === document.body.dataset.theme));
    document.querySelectorAll('.mode-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.mode === document.body.dataset.mode));
    // update PWA theme-color
    const c = getComputedStyle(document.body).getPropertyValue('--header').trim();
    const meta = document.querySelector('meta[name=theme-color]');
    if (meta && c) meta.setAttribute('content', c);
  }
  function bind(){
    document.querySelectorAll('.theme-btn').forEach(b => b.addEventListener('click', async () => {
      document.body.dataset.theme = b.dataset.theme;
      await DB.put('settings',{key:'theme',value:b.dataset.theme});
      refresh();
    }));
    document.querySelectorAll('.mode-btn').forEach(b => b.addEventListener('click', async () => {
      document.body.dataset.mode = b.dataset.mode;
      await DB.put('settings',{key:'mode',value:b.dataset.mode});
      refresh();
    }));
  }
  return { load, bind, refresh };
})();
