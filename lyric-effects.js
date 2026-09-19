/* Fixed sentence starts supplied by the page owner.
   Text is read from the page's lyricsData; no lyric/audio content is bundled.
   Optional window.LYRIC_WORD_TIMES supplies nine arrays of absolute word times.
   Otherwise only sentence starts are exact; word reveals are estimates. */
(() => {
'use strict';
if(window.__lyricEffectsV5)return;window.__lyricEffectsV5=true;
const audio=document.getElementById('bg-audio'),button=document.getElementById('play-music-btn'),status=document.getElementById('music-status');
if(!audio||!button||!status)return;
const STARTS=[4.3,7,9.6,12.9,15.6,18.5,21.7,24.3,27.9];
const input=typeof lyricsData!=='undefined'?lyricsData:[];
const cues=STARTS.map((start,i)=>({start,end:STARTS[i+1]??32.9,text:String(input[i]?.text||(i===8?window.LYRIC_FINALE_TEXT:'')||'').trim()}));
cues.forEach(c=>c.words=c.text?c.text.split(/\s+/):[]);
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const motion=()=>!reduced.matches&&!document.documentElement.classList.contains('motion-off');
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const suppliedTimes=window.LYRIC_WORD_TIMES;
function timings(i){const c=cues[i],r=suppliedTimes?.[i];if(Array.isArray(r)&&r.length===c.words.length&&r.every((v,j)=>Number.isFinite(v)&&v>=c.start&&v<c.end&&(!j||v>r[j-1])))return r;
return c.words.map((_,j)=>c.start+(c.end-c.start)*.76*j/Math.max(1,c.words.length-1));}
const style=document.createElement('style');style.textContent=`
#floating-music-widget{position:fixed!important;top:auto!important;right:auto!important;left:12px!important;bottom:calc(12px + env(safe-area-inset-bottom))!important;display:flex;gap:8px;align-items:center;max-width:calc(100vw - 80px);z-index:45!important;padding:8px 10px!important;border-radius:24px;background:#101c2bf2!important;border:1px solid #435970;box-shadow:0 8px 24px #0005;backdrop-filter:blur(14px)}
#floating-music-widget button{cursor:pointer;border:0;border-radius:18px;background:#79efd0;color:#09141c;padding:8px 12px;font:700 13px system-ui}
#music-status{font:12px system-ui;color:#bfd1e1;white-space:nowrap;max-width:120px;overflow:hidden;text-overflow:ellipsis}
#word-timing-open,#word-timing-dialog{display:none!important}
#lyric-stage-v5{position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:32;contain:layout style paint}
.lyric-card-v5{position:absolute;left:0;top:0;width:clamp(165px,18vw,235px);max-width:calc(100vw - 30px);min-height:130px;display:grid;place-items:center;padding:20px 17px;border-radius:3px;background:#faf9f5;color:#10151d;border:1px solid #fff8;box-shadow:0 14px 32px #0004;font:500 clamp(18px,1.7vw,23px)/1.45 system-ui,sans-serif;text-align:center;overflow-wrap:anywhere;transform-origin:center;will-change:transform,opacity;transition:background-color .28s,color .28s,border-color .28s;z-index:2}
.lyric-card-v5.past{background:#10141c;color:#fff;border-color:#d6e4fa29;box-shadow:0 10px 35px #0006}
.lyric-card-v5 .lyric-word{display:inline-block;white-space:pre;will-change:opacity,transform}
.math-float-v5{position:absolute;left:0;top:0;max-width:165px;color:#94ecd6;font:20px/1.3 'Cambria Math',Georgia,serif;text-shadow:0 2px 10px #0009;will-change:transform,opacity;z-index:1}.math-float-v5 math{font-size:inherit}
#lyric-finale-v5{position:absolute;left:50%;top:46%;width:min(410px,92vw);height:290px;transform:translate(-50%,-50%);display:grid;place-items:center;z-index:4}
.finale-heart-v5{position:absolute;color:#ff91bc;font:220px/1 Georgia,serif;text-shadow:0 0 25px #ff6fa750,0 0 80px #ff6fa725;will-change:transform,opacity}.finale-phrase-v5{position:relative;z-index:2;max-width:92%;padding:0 12px;text-align:center;color:#fff;font:600 clamp(30px,7vw,56px)/1.25 system-ui;letter-spacing:-.025em;text-shadow:0 3px 16px #220919aa;overflow-wrap:anywhere;will-change:transform,opacity}.finale-phrase-v5 span{display:inline-block;white-space:pre}
.finale-spark-v5{position:absolute;width:4px;height:4px;background:#ffe4ee;border-radius:50%;left:50%;top:50%;box-shadow:0 0 8px #ff8cba;will-change:transform,opacity}
@media(max-width:560px){.lyric-card-v5{width:168px;min-height:124px;padding:17px 13px;font-size:18px}.math-float-v5{font-size:17px;max-width:140px}.finale-heart-v5{font-size:180px}#lyric-finale-v5{height:230px}#music-status{max-width:102px}}
@media(prefers-reduced-motion:reduce){.lyric-card-v5{transition:none}}
@media print{#lyric-stage-v5,#floating-music-widget{display:none!important}}
`;document.head.append(style);
const stage=document.createElement('div');stage.id='lyric-stage-v5';stage.setAttribute('aria-hidden','true');document.body.append(stage);
const cards=new Map(),formulas=new Map();let finale=null,raf=0,waiting=false,serial=0,tail=false;
function clear(){cards.clear();formulas.clear();stage.replaceChildren();finale=null;document.querySelectorAll('.floating-lyric-box').forEach(el=>el.remove());}
function newCard(i){const node=document.createElement('div');node.className='lyric-card-v5';const line=document.createElement('span');const words=cues[i].words.map((t,j)=>{const w=document.createElement('span');w.className='lyric-word';w.textContent=t+(j<cues[i].words.length-1?' ':'');line.append(w);return w;});node.append(line);stage.append(node);const c={node,words,width:node.offsetWidth,height:node.offsetHeight};cards.set(i,c);return c;}
function drawCard(i,t){const cue=cues[i],c=cards.get(i)||newCard(i),elapsed=t-cue.start,span=cue.end-cue.start,p=clamp(elapsed/span,0,1),old=t>=cue.end,after=Math.max(0,t-cue.end);c.node.classList.toggle('past',old);
 const right=i%2===0,x=right?Math.max(15,innerWidth-c.width-15):15,bottom=Math.max(110,innerHeight-c.height-92);
 const travel=motion()?bottom-(bottom-94)*p-after*90:bottom;
 const entry=clamp(elapsed/.18,0,1),exit=clamp(1-after/1.65,0,1),scale=motion()?1-.045*(1-entry):1;
 c.node.style.transform=`translate3d(${x}px,${travel}px,0) rotate(${motion()?(right?2:-2):0}deg) scale(${scale})`;
 c.node.style.opacity=String(entry*exit);const times=timings(i);
 c.words.forEach((word,j)=>{const v=old?1:clamp((t-times[j])/.07,0,1);word.style.opacity=String(v);word.style.transform=motion()?`translateY(${(1-v)*5}px)`:'none';});}
const mm=b=>'<math xmlns="http://www.w3.org/1998/Math/MathML"><mrow>'+b+'</mrow></math>';
const symbols=[mm('<mfrac><mrow><mo>∂</mo><mi>f</mi></mrow><mrow><mo>∂</mo><mi>x</mi></mrow></mfrac>'),mm('<mi>z</mi><mo>=</mo><mi>f</mi><mo>(</mo><mi>x</mi><mo>;</mo><mi>y</mi><mo>)</mo>'),mm('<mi>Δ</mi><mo>=</mo><mi>A</mi><mi>C</mi><mo>−</mo><msup><mi>B</mi><mn>2</mn></msup>'),mm('<msup><mi>x</mi><mn>2</mn></msup><mo>+</mo><msup><mi>y</mi><mn>2</mn></msup><mo>=</mo><mn>1</mn>'),mm('<mo>∇</mo><mi>f</mi><mo>=</mo><mi>λ</mi><mo>∇</mo><mi>g</mi>'),mm('<msup><mi>e</mi><mrow><mi>x</mi><mo>+</mo><mi>y</mi></mrow></msup>')];
function drawMath(t){const interval=1.8,life=10.4,slot=Math.floor(t/interval);for(const [id,el]of formulas)if(t-id*interval>=life||id>slot){el.remove();formulas.delete(id);}
 if(!motion()){for(const el of formulas.values())el.remove();formulas.clear();return;}
 for(let id=Math.max(0,slot-5);id<=slot;id++){const p=(t-id*interval)/life;if(p<0||p>=1)continue;let el=formulas.get(id);if(!el){el=document.createElement('div');el.className='math-float-v5';el.innerHTML=symbols[id%symbols.length];stage.append(el);formulas.set(id,el);}const lane=innerWidth>=850?(id%3)*24:0;const base=id%2?14+lane:innerWidth-el.offsetWidth-18-lane,x=clamp(base+Math.sin(p*Math.PI*2+id)*9,8,Math.max(8,innerWidth-el.offsetWidth-8)),y=innerHeight-85-p*(innerHeight+20);el.style.transform=`translate3d(${x}px,${y}px,0) rotate(${Math.sin(p*3+id)*5}deg)`;el.style.opacity=String(.29*Math.sin(Math.PI*p));}}
function drawFinale(t){const elapsed=t-STARTS[8];if(elapsed<0||elapsed>=5){if(finale)finale.remove();finale=null;return;}
 if(!finale){finale=document.createElement('div');finale.id='lyric-finale-v5';const heart=document.createElement('span');heart.className='finale-heart-v5';heart.textContent='♥';const phrase=document.createElement('span');phrase.className='finale-phrase-v5';cues[8].words.forEach((text,j)=>{const el=document.createElement('span');el.textContent=text+(j<cues[8].words.length-1?' ':'');phrase.append(el);});finale.append(heart,phrase);for(let i=0;i<28;i++){const dot=document.createElement('span');dot.className='finale-spark-v5';finale.append(dot);}stage.append(finale);}
 const fade=clamp((5-elapsed)/1.1,0,1),enter=clamp(elapsed/.65,0,1),heart=finale.children[0],phrase=finale.children[1];heart.style.opacity=String(clamp((elapsed-.3)/.8,0,1)*fade*.85);heart.style.transform=motion()?`scale(${.72+.28*enter+.035*Math.sin(elapsed*4)})`:'none';phrase.style.opacity=String(enter*fade);phrase.style.transform=motion()?`translateY(${24*(1-enter)}px) scale(${.65+.35*enter+Math.min(elapsed,3)*.055})`:'none';
 const finalTimes=timings(8);Array.from(phrase.children).forEach((word,j)=>{const fallback=STARTS[8]+j*.35;const exact=suppliedTimes?.[8]?.length===cues[8].words.length;const reveal=clamp((t-(exact?finalTimes[j]:fallback))/.1,0,1);word.style.opacity=String(reveal);});
 for(let i=0;i<28;i++){const a=i/28*Math.PI*2,r=innerWidth<560?5:6.5,s=motion()?1+Math.max(0,elapsed-2.6)*.5:1,x=16*Math.pow(Math.sin(a),3)*r*s,y=-(13*Math.cos(a)-5*Math.cos(2*a)-2*Math.cos(3*a)-Math.cos(4*a))*r*s,el=finale.children[i+2];el.style.transform=`translate(${x}px,${y}px)`;el.style.opacity=String(motion()?clamp((elapsed-.6)/.8,0,1)*fade:0);}}
function render(t){const visible=[];for(let i=0;i<8;i++)if(cues[i].words.length&&t>=cues[i].start&&t<cues[i].end+1.65)visible.push(i);const keep=visible.slice(-2);for(const [i,c]of cards)if(!keep.includes(i)){c.node.remove();cards.delete(i);}keep.forEach(i=>drawCard(i,t));drawMath(t);drawFinale(t);}
function loop(){if(audio.paused||audio.ended||document.hidden)return;render(audio.currentTime);raf=requestAnimationFrame(loop);}
function reset(label){cancelAnimationFrame(raf);clear();button.textContent='▶ Phát nhạc';button.setAttribute('aria-pressed','false');status.textContent=label;}
function stop(){serial++;waiting=false;tail=false;audio.pause();reset('Đã dừng');}
button.onclick=async()=>{if(waiting||tail||!audio.paused){stop();return;}const token=++serial;waiting=true;button.textContent='■ Hủy';status.textContent='Đang tải…';try{if(audio.ended)audio.currentTime=0;await audio.play();if(token!==serial)return;waiting=false;}catch(error){if(token!==serial)return;waiting=false;reset(error.name==='NotAllowedError'?'Bấm để thử lại':'Lỗi nguồn nhạc');}};
audio.ontimeupdate=()=>{if(!audio.paused&&!audio.ended)render(audio.currentTime);};
audio.onended=()=>{cancelAnimationFrame(raf);const at=audio.currentTime;if(at>=27.9&&at<32.9){tail=true;let began=null;const finish=stamp=>{if(!tail)return;if(began===null)began=stamp;const t=at+(stamp-began)/1000;if(t>=32.9){tail=false;reset('Kết thúc');return;}render(t);raf=requestAnimationFrame(finish);};raf=requestAnimationFrame(finish);}else reset('Kết thúc');};
audio.addEventListener('playing',()=>{button.textContent='■ Tắt nhạc';button.setAttribute('aria-pressed','true');status.textContent='Đang phát';cancelAnimationFrame(raf);loop();});
audio.addEventListener('pause',()=>{if(!audio.ended)reset('Đã dừng');});
audio.addEventListener('seeking',()=>{clear();if(!audio.paused)render(audio.currentTime);});
audio.addEventListener('error',()=>{stop();status.textContent='Lỗi nguồn nhạc';status.title='Cần đường dẫn trực tiếp đến file âm thanh. Bạn có thể sửa src của bg-audio trong HTML.';});
addEventListener('resize',clear);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
reduced.addEventListener('change',clear);new MutationObserver(clear).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
clear();button.setAttribute('aria-pressed',String(!audio.paused));if(!audio.paused)loop();
})();
