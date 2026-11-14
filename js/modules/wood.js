const Wood = (() => {
  const RATIO = 2.5; // 1 kg charbon ≈ 2,5 kg bois sec
  let mode = 'c2w';

  function compute(){
    const v = UI.readNum(document.getElementById('convInput'));
    const box = document.querySelector('#convResult .result-value');
    const lbl = document.querySelector('#convResult .result-label');
    lbl.textContent = mode === 'c2w' ? 'Bois sec' : 'Charbon';
    if (!(v > 0)){ box.textContent = '— kg'; return; }
    box.textContent = UI.num(mode === 'c2w' ? v * RATIO : v / RATIO) + ' kg';
  }

  function setMode(m){
    mode = m;
    document.querySelectorAll('#convMode .seg-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.conv === m));
    document.getElementById('lblConv').textContent = m === 'c2w' ? 'Charbon' : 'Bois sec';
    compute();
  }

  function init(){
    document.querySelectorAll('#convMode .seg-btn').forEach(b =>
      b.addEventListener('click', () => setMode(b.dataset.conv)));
    document.getElementById('convInput').addEventListener('input', compute);
    compute();
  }

  return { init };
})();
