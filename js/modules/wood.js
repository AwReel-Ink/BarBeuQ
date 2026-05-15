const Wood = (() => {
  const RATIO = 2.5; // 1 kg charbon ≈ 2,5 kg bois sec
  let mode = 'c2w';

  function compute(){
    const v = parseFloat(document.getElementById('convInput').value);
    const box = document.querySelector('#convResult .result-value');
    const lbl = document.querySelector('#convResult .result-label');
    if (!v || v<=0){ box.textContent = '— kg'; return; }
    if (mode === 'c2w'){
      lbl.textContent = 'Équivalent en bois sec';
      box.textContent = (v * RATIO).toFixed(2).replace('.',',') + ' kg';
    } else {
      lbl.textContent = 'Équivalent en charbon';
      box.textContent = (v / RATIO).toFixed(2).replace('.',',') + ' kg';
    }
  }

  function setMode(m){
    mode = m;
    document.querySelectorAll('#page-wood .conv-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.conv === m));
    document.getElementById('lblConv').childNodes[0].nodeValue =
      m === 'c2w' ? 'Quantité de charbon (kg)' : 'Quantité de bois sec (kg)';
    compute();
  }

  function init(){
    document.querySelectorAll('#page-wood .conv-btn').forEach(b =>
      b.addEventListener('click', () => setMode(b.dataset.conv)));
    document.getElementById('convInput').addEventListener('input', compute);
  }

  return { init };
})();
