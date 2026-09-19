/* Lyric Effects v6
   Fixed sentence starts: 4.3, 7.0, 9.6, 12.9, 15.6, 18.5, 21.7, 24.3, 27.9.
   Reads text from window lyricsData declared in index.html.
*/
(() => {
'use strict';
if (window.__lyricEffectsV6) return;
window.__lyricEffectsV6 = true;

const audio = document.getElementById('bg-audio');
const button = document.getElementById('play-music-btn');
const status = document.getElementById('music-status');
if (!audio || !button || !status) return;

const STARTS = [4.3, 7.0, 9.6, 12.9, 15.6, 18.5, 21.7, 24.3, 27.9];
const data = typeof lyricsData !== 'undefined' ? lyricsData : [];
const cues = STARTS.map((start, i) => ({
  start,
  end: STARTS[i + 1] ?? 32.9,
  text: String(data[i]?.text || '').trim()
}));
cues.forEach(c => c.words = c.text ? c.text.split(/\s+/) : []);

const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const moving = () => !reduced.matches && !document.documentElement.classList.contains('motion-off');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const style = document.createElement('style');
style.textContent = `
#floating-music-widget{position:fixed!important;top:auto!important;right:auto!important;left:12px!important;bottom:calc(12px + env(safe-area-inset-bottom))!important;display:flex;gap:8px;align-items:center;z-index:60!important;max-width:calc(100vw - 80px);padding:8px 10px!important;border:1px solid #425a73;border-radius:999px;background:#0e1825ed!important;backdrop-filter:blur(18px);box-shadow:0 12px 34px #0007}
#floating-music-widget button{border:0;border-radius:999px;padding:8px 13px;background:#79efd0;color:#07131b;font:700 13px system-ui;box-shadow:0 0 18px #79efd033;transition:transform .2s,box-shadow .2s}
#floating-music-widget button:hover{transform:translateY(-1px) scale(1.03);box-shadow:0 0 25px #79efd05c}
#music-status{font:12px system-ui;color:#bfd1e1;white-space:nowrap;max-width:120px;overflow:hidden;text-overflow:ellipsis}
#lyric-stage-v6{position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:36;contain:layout style paint}
.lyric-card-v6{position:absolute;left:0;top:0;width:clamp(170px,19vw,245px);min-height:132px;display:grid;place-items:center;padding:20px 18px;border-radius:8px;background:linear-gradient(145deg,#fff,#f5f5f0);color:#10151d;border:1px solid #ffffffc7;box-shadow:0 20px 45px #0004,0 0 0 1px #ffffff22 inset;font:550 clamp(18px,1.7vw,23px)/1.45 system-ui,sans-serif;text-align:center;overflow-wrap:anywhere;transform-origin:center;will-change:transform,opacity,filter;transition:background .3s,color .3s,border-color .3s,box-shadow .3s;z-index:4}
.lyric-card-v6.current{box-shadow:0 20px 50px #0005,0 0 35px #79efd01f}
.lyric-card-v6.past{background:linear-gradient(145deg,#10131a,#151a22);color:#fff;border-color:#ffffff17;box-shadow:0 15px 42px #0008,0 0 25px #0005}
.lyric-card-v6 .lyric-word{display:inline-block;white-space:pre;will-change:opacity,transform,filter}
.math-float-v6{position:absolute;left:0;top:0;max-width:190px;color:#8ff1d4;font:clamp(16px,1.5vw,21px)/1.25 'Cambria Math',Georgia,serif;text-shadow:0 0 14px #79efd060,0 3px 12px #000a;will-change:transform,opacity,filter;z-index:1}
.math-float-v6 math{font-size:inherit}
.float-dot-v6{position:absolute;width:4px;height:4px;border-radius:50%;background:#a7f5df;box-shadow:0 0 10px #79efd0;will-change:transform,opacity;z-index:0}
.streak-v6{position:absolute;width:90px;height:1px;background:linear-gradient(90deg,transparent,#80e9cf,transparent);opacity:0;filter:blur(.2px);will-change:transform,opacity;z-index:0}
#lyric-finale-v6{position:absolute;left:50%;top:48%;width:min(760px,94vw);height:260px;transform:translate(-50%,-50%);display:grid;place-items:center;z-index:15;perspective:900px}
.finale-phrase-v6{position:relative;color:white;font:800 clamp(42px,10vw,92px)/1 system-ui,sans-serif;letter-spacing:-.05em;text-align:center;text-shadow:0 6px 28px #000d,0 0 30px #79efd055;will-change:transform,opacity,filter;white-space:nowrap}
.finale-ring-v6{position:absolute;width:90px;height:90px;border:1px solid #79efd07a;border-radius:50%;box-shadow:0 0 30px #79efd025;will-change:transform,opacity}
.finale-spark-v6{position:absolute;width:5px;height:5px;border-radius:50%;background:#d9fff4;box-shadow:0 0 13px #79efd0;will-change:transform,opacity}
@media(max-width:560px){.lyric-card-v6{width:172px;min-height:122px;padding:16px 13px;font-size:17px}.math-float-v6{max-width:130px;font-size:16px}.finale-phrase-v6{font-size:clamp(38px,14vw,66px)}#music-status{max-width:90px}}
@media(prefers-reduced-motion:reduce){.lyric-card-v6{transition:none}}
@media print{#lyric-stage-v6,#floating-music-widget{display:none!important}}
`;
document.head.append(style);

const stage = document.createElement('div');
stage.id = 'lyric-stage-v6';
stage.setAttribute('aria-hidden', 'true');
document.body.append(stage);

const cards = new Map();
const formulas = new Map();
const dots = new Map();
const streaks = new Map();
let finale = null;
let raf = 0;
let waiting = false;
let serial = 0;
let tail = false;

function clearStage() {
  cards.clear(); formulas.clear(); dots.clear(); streaks.clear();
  stage.replaceChildren(); finale = null;
}

function estimatedWordTimes(i) {
  const cue = cues[i];
  if (!cue.words.length) return [];
  const usable = Math.max(.2, (cue.end - cue.start) * .78);
  return cue.words.map((_, j) => cue.start + usable * j / Math.max(1, cue.words.length - 1));
}

function createCard(i) {
  const node = document.createElement('div');
  node.className = 'lyric-card-v6';
  const line = document.createElement('span');
  const words = cues[i].words.map((text, j) => {
    const word = document.createElement('span');
    word.className = 'lyric-word';
    word.textContent = text + (j < cues[i].words.length - 1 ? ' ' : '');
    line.append(word);
    return word;
  });
  node.append(line);
  stage.append(node);
  const card = { node, words, width: node.offsetWidth, height: node.offsetHeight };
  cards.set(i, card);
  return card;
}

function drawCard(i, t) {
  const cue = cues[i];
  const card = cards.get(i) || createCard(i);
  const elapsed = t - cue.start;
  const span = Math.max(.1, cue.end - cue.start);
  const p = clamp(elapsed / span, 0, 1);
  const isPast = t >= cue.end;
  const after = Math.max(0, t - cue.end);
  card.node.classList.toggle('past', isPast);
  card.node.classList.toggle('current', !isPast);

  const W = innerWidth, H = innerHeight;
  const right = i % 2 === 0;
  const x = right ? Math.max(15, W - card.width - 15) : 15;
  const bottom = Math.max(110, H - card.height - 88);
  const top = 86;
  const curve = Math.sin(p * Math.PI) * (right ? -24 : 24);
  const y = moving() ? bottom - (bottom - top) * p - after * 130 : bottom;
  const entry = clamp(elapsed / .22, 0, 1);
  const exit = clamp(1 - after / 1.45, 0, 1);
  const bob = moving() ? Math.sin(t * 4.2 + i) * 3 : 0;
  const scale = moving() ? .91 + .09 * entry + (isPast ? -.03 * after : 0) : 1;
  const rot = moving() ? (right ? 1.6 : -1.6) + Math.sin(t * 2.2 + i) * 1.2 : 0;
  card.node.style.transform = `translate3d(${x + curve}px,${y + bob}px,0) rotate(${rot}deg) scale(${scale})`;
  card.node.style.opacity = String(entry * exit);
  card.node.style.filter = moving() ? `blur(${Math.max(0, (1-entry)*2 + after*.6)}px)` : 'none';

  const times = estimatedWordTimes(i);
  card.words.forEach((word, j) => {
    const v = isPast ? 1 : clamp((t - times[j]) / .08, 0, 1);
    word.style.opacity = String(v);
    word.style.transform = moving() ? `translateY(${(1-v)*7}px) scale(${.94 + .06*v})` : 'none';
    word.style.filter = moving() ? `blur(${(1-v)*2}px)` : 'none';
  });
}

const mm = body => '<math xmlns="http://www.w3.org/1998/Math/MathML"><mrow>' + body + '</mrow></math>';
const symbols = [
  mm('<mfrac><mrow><mo>∂</mo><mi>f</mi></mrow><mrow><mo>∂</mo><mi>x</mi></mrow></mfrac>'),
  mm('<mi>z</mi><mo>=</mo><mi>f</mi><mo>(</mo><mi>x</mi><mo>;</mo><mi>y</mi><mo>)</mo>'),
  mm('<mi>Δ</mi><mo>=</mo><mi>A</mi><mi>C</mi><mo>−</mo><msup><mi>B</mi><mn>2</mn></msup>'),
  mm('<msup><mi>x</mi><mn>2</mn></msup><mo>+</mo><msup><mi>y</mi><mn>2</mn></msup><mo>=</mo><mn>1</mn>'),
  mm('<mo>∇</mo><mi>f</mi><mo>=</mo><mi>λ</mi><mo>∇</mo><mi>g</mi>'),
  mm('<msup><mi>e</mi><mrow><mi>x</mi><mo>+</mo><mi>y</mi></mrow></msup>'),
  mm('<mfrac><mrow><mo>∂</mo><mi>f</mi></mrow><mrow><mo>∂</mo><mi>y</mi></mrow></mfrac>'),
  mm('<mi>d</mi><mi>z</mi><mo>=</mo><msub><mi>f</mi><mi>x</mi></msub><mi>d</mi><mi>x</mi><mo>+</mo><msub><mi>f</mi><mi>y</mi></msub><mi>d</mi><mi>y</mi>')
];

function drawDecor(t) {
  if (!moving()) {
    for (const el of [...formulas.values(), ...dots.values(), ...streaks.values()]) el.remove();
    formulas.clear(); dots.clear(); streaks.clear(); return;
  }

  const interval = 1.15, life = 9.2, slot = Math.floor(t / interval);
  for (const [id, el] of formulas) if (t - id * interval >= life || id > slot) { el.remove(); formulas.delete(id); }
  for (let id = Math.max(0, slot - 7); id <= slot; id++) {
    const age = t - id * interval, p = age / life;
    if (p < 0 || p >= 1) continue;
    let el = formulas.get(id);
    if (!el) {
      el = document.createElement('div'); el.className = 'math-float-v6'; el.innerHTML = symbols[id % symbols.length]; stage.append(el); formulas.set(id, el);
    }
    const lane = innerWidth > 800 ? (id % 4) * 22 : (id % 2) * 14;
    const baseX = id % 2 ? 14 + lane : innerWidth - el.offsetWidth - 16 - lane;
    const x = clamp(baseX + Math.sin(p * Math.PI * 3 + id) * 18, 6, Math.max(6, innerWidth - el.offsetWidth - 6));
    const y = innerHeight + 20 - p * (innerHeight + 120);
    el.style.transform = `translate3d(${x}px,${y}px,0) rotate(${Math.sin(p*5+id)*8}deg) scale(${.86 + .15*Math.sin(Math.PI*p)})`;
    el.style.opacity = String(.34 * Math.sin(Math.PI * p));
    el.style.filter = `blur(${Math.abs(.5-p)*1.2}px)`;
  }

  const dotInterval = .6, dotLife = 5.8, dslot = Math.floor(t / dotInterval);
  for (const [id, el] of dots) if (t - id * dotInterval >= dotLife || id > dslot) { el.remove(); dots.delete(id); }
  for (let id = Math.max(0, dslot - 11); id <= dslot; id++) {
    const age = t - id * dotInterval, p = age / dotLife; if (p < 0 || p >= 1) continue;
    let el = dots.get(id);
    if (!el) { el = document.createElement('i'); el.className = 'float-dot-v6'; stage.append(el); dots.set(id, el); }
    const side = id % 2, x0 = side ? innerWidth - 28 - (id%5)*16 : 20 + (id%5)*16;
    const x = x0 + Math.sin(p * 9 + id) * 24;
    const y = innerHeight + 30 - p * (innerHeight + 70);
    el.style.transform = `translate3d(${x}px,${y}px,0) scale(${.6 + Math.sin(Math.PI*p)})`;
    el.style.opacity = String(.42 * Math.sin(Math.PI * p));
  }

  const streakInterval = 2.3, streakLife = 4.4, sslot = Math.floor(t / streakInterval);
  for (const [id, el] of streaks) if (t - id * streakInterval >= streakLife || id > sslot) { el.remove(); streaks.delete(id); }
  for (let id = Math.max(0, sslot - 2); id <= sslot; id++) {
    const age = t - id*streakInterval, p = age/streakLife; if (p<0 || p>=1) continue;
    let el=streaks.get(id); if(!el){el=document.createElement('span');el.className='streak-v6';stage.append(el);streaks.set(id,el);}
    const left = id%2 ? innerWidth*.68 : innerWidth*.12;
    const y = innerHeight - p*(innerHeight+80);
    el.style.transform=`translate3d(${left}px,${y}px,0) rotate(${id%2?-18:18}deg) scaleX(${.7+1.2*Math.sin(Math.PI*p)})`;
    el.style.opacity=String(.22*Math.sin(Math.PI*p));
  }
}

function drawFinale(t) {
  const start = STARTS[8];
  const elapsed = t - start;
  if (elapsed < 0 || elapsed >= 4.6) {
    if (finale) finale.remove();
    finale = null; return;
  }
  if (!finale) {
    finale = document.createElement('div'); finale.id = 'lyric-finale-v6';
    const ring = document.createElement('span'); ring.className = 'finale-ring-v6';
    const phrase = document.createElement('span'); phrase.className = 'finale-phrase-v6'; phrase.textContent = cues[8].text || 'from you!!';
    finale.append(ring, phrase);
    for (let i=0;i<34;i++){const dot=document.createElement('i');dot.className='finale-spark-v6';finale.append(dot);}
    stage.append(finale);
  }
  const enter = clamp(elapsed/.55,0,1);
  const hold = elapsed < 2.6 ? 1 : clamp((4.6-elapsed)/2,0,1);
  const phrase = finale.children[1], ring=finale.children[0];
  const punch = 1 + (1-enter)*.75 + Math.max(0,elapsed-1.4)*.07;
  phrase.style.opacity=String(enter*hold);
  phrase.style.transform = moving()?`scale(${punch}) translateY(${(1-enter)*28}px) rotateX(${(1-enter)*16}deg)`:'none';
  phrase.style.filter = moving()?`blur(${(1-enter)*5 + Math.max(0,elapsed-3.4)*4}px)`:'none';
  ring.style.opacity=String(clamp((elapsed-.2)/.5,0,1)*hold*.55);
  ring.style.transform=moving()?`scale(${.5+elapsed*1.15}) rotate(${elapsed*22}deg)`:'none';
  for(let i=0;i<34;i++){
    const a=i/34*Math.PI*2, dist=(45+elapsed*70)*(1+(i%4)*.08), el=finale.children[i+2];
    el.style.transform=`translate(${Math.cos(a)*dist}px,${Math.sin(a)*dist*.6}px) scale(${.5+Math.sin(Math.PI*clamp(elapsed/4.6,0,1))})`;
    el.style.opacity=String(moving()?clamp((elapsed-.35)/.5,0,1)*hold*(.35+(i%3)*.12):0);
  }
}

function render(t) {
  const visible=[];
  for(let i=0;i<8;i++) if(cues[i].words.length && t>=cues[i].start && t<cues[i].end+1.5) visible.push(i);
  const keep=visible.slice(-2);
  for(const [i,c] of cards) if(!keep.includes(i)){c.node.remove();cards.delete(i);}
  keep.forEach(i=>drawCard(i,t));
  drawDecor(t); drawFinale(t);
}

function loop(){if(audio.paused||audio.ended||document.hidden)return;render(audio.currentTime);raf=requestAnimationFrame(loop);}
function reset(label){cancelAnimationFrame(raf);clearStage();button.textContent='▶ Phát nhạc';button.setAttribute('aria-pressed','false');status.textContent=label;}
function stop(){serial++;waiting=false;tail=false;audio.pause();reset('Đã dừng');}

button.onclick=async()=>{
  if(waiting||tail||!audio.paused){stop();return;}
  const token=++serial; waiting=true; button.textContent='■ Hủy'; status.textContent='Đang tải…';
  try{if(audio.ended)audio.currentTime=0;await audio.play();if(token!==serial)return;waiting=false;}
  catch(error){if(token!==serial)return;waiting=false;reset(error.name==='NotAllowedError'?'Bấm để thử lại':'Lỗi nguồn nhạc');}
};
audio.ontimeupdate=()=>{if(!audio.paused&&!audio.ended)render(audio.currentTime);};
audio.onended=()=>{
  cancelAnimationFrame(raf); const at=audio.currentTime;
  if(at>=27.9&&at<32.5){tail=true;let began=null;const finish=stamp=>{if(!tail)return;if(began===null)began=stamp;const t=at+(stamp-began)/1000;if(t>=32.5){tail=false;reset('Kết thúc');return;}render(t);raf=requestAnimationFrame(finish);};raf=requestAnimationFrame(finish);}else reset('Kết thúc');
};
audio.addEventListener('playing',()=>{button.textContent='■ Tắt nhạc';button.setAttribute('aria-pressed','true');status.textContent='Đang phát';cancelAnimationFrame(raf);loop();});
audio.addEventListener('pause',()=>{if(!audio.ended)reset('Đã dừng');});
audio.addEventListener('seeking',()=>{clearStage();if(!audio.paused)render(audio.currentTime);});
audio.addEventListener('error',()=>{reset('Lỗi nguồn nhạc');});
addEventListener('resize',clearStage);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
reduced.addEventListener('change',clearStage);
new MutationObserver(clearStage).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
clearStage();
})();
