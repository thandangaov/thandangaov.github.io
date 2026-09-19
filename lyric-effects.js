/* LYRIC EFFECTS v3 — reads the page's existing lyricsData, bundles no lyrics/audio.
   Load this script AFTER the page script. Optional window.LYRIC_WORD_TIMES is
   an array of arrays of absolute audio times (seconds), one time per word.
   Without saved/explicit word times, line cues yield clearly labeled estimates. */
(() => {
'use strict';
if(window.__lyricEffectsV3)return;window.__lyricEffectsV3=true;
const media=document.getElementById('bg-audio'),button=document.getElementById('play-music-btn'),status=document.getElementById('music-status');
if(!media||!button||!status)return;
const source=typeof lyricsData!=='undefined'?lyricsData:[];
const cues=source.filter(c=>Number.isFinite(c.time)&&typeof c.text==='string').slice().sort((a,b)=>a.time-b.time).map(c=>({...c,tokens:c.text.trim().split(/\s+/).filter(Boolean)})).filter(c=>c.tokens.length);
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const animationsOn=()=>!reduced.matches&&!document.documentElement.classList.contains('motion-off');
let signature=2166136261;
for(const ch of cues.map(c=>c.time+'|'+c.text).join('\n'))signature=Math.imul(signature^ch.charCodeAt(0),16777619)>>>0;
const key='lyric-words-v3-'+signature.toString(16);
const style=document.createElement('style');
style.textContent=`
#floating-music-widget{position:fixed!important;top:auto!important;right:auto!important;left:12px!important;bottom:calc(12px + env(safe-area-inset-bottom))!important;display:flex;gap:7px;align-items:center;z-index:45!important;max-width:calc(100vw - 78px);padding:8px 10px!important;background:#101c2bf2!important;border:1px solid #435970;border-radius:24px;box-shadow:0 8px 24px #0005;backdrop-filter:blur(15px)}
#floating-music-widget button{cursor:pointer;border:0;border-radius:18px;background:#79efd0;color:#09141c;padding:7px 10px;font:700 12px system-ui;white-space:nowrap}
#music-status{font:12px system-ui;color:#b6c8da;max-width:88px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
#word-timing-open{background:#293d52!important;color:white!important}
#lyric-stage-v3{position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:32;contain:layout style paint}
.lyric-card-v3{position:absolute;left:0;top:0;width:clamp(164px,18vw,226px);max-width:calc(100vw - 30px);min-height:130px;display:grid;place-items:center;padding:20px 17px;border-radius:3px;background:#f9f8f3;color:#11141b;box-shadow:0 14px 32px #0004;font:500 clamp(17px,1.7vw,23px)/1.45 system-ui,sans-serif;text-align:center;will-change:transform,opacity;overflow-wrap:anywhere}
.lyric-card-v3.dark{background:#121923;color:#fff;border:1px solid #788ca533}.lyric-card-v3 .lyric-word{display:inline-block;white-space:pre;opacity:0;will-change:opacity,transform}.lyric-card-v3 .lyric-line{display:block;max-width:100%}
.math-float-v3{position:absolute;top:0;left:0;max-width:180px;opacity:0;color:#94ecd6;font:20px/1.4 'Cambria Math',Georgia,serif;text-shadow:0 2px 10px #0009;will-change:transform,opacity}
#word-timing-dialog{width:min(500px,calc(100vw - 24px));max-height:88dvh;overflow:auto;border:1px solid #587088;border-radius:16px;padding:22px;background:#101b29;color:#ecf2fa;font:15px/1.65 system-ui;box-shadow:0 20px 80px #0008}
#word-timing-dialog::backdrop{background:#0009;backdrop-filter:blur(5px)}#word-timing-dialog h2{font-size:22px;margin:0 0 12px}#word-timing-dialog p{color:#b9cadd;font-size:14px;margin:10px 0}#word-timing-dialog button{background:#253a50;color:white;border:1px solid #50677f;border-radius:9px;padding:10px 12px;font:600 14px system-ui;cursor:pointer}#word-timing-dialog button:disabled{opacity:.4;cursor:default}#word-timing-dialog .timing-actions{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}#word-timing-dialog input{width:90px;background:#0a1320;border:1px solid #526b84;border-radius:6px;color:white;padding:7px}#word-timing-dialog #timing-tap{width:100%;background:#79efd0;color:#0b141b;padding:18px;font-size:18px;touch-action:manipulation}#timing-next{display:block;font-size:25px;line-height:1.5;min-height:42px;overflow-wrap:anywhere;color:#fff}#timing-clock{font-variant-numeric:tabular-nums;color:#79efd0}#word-timing-dialog label{display:block}#word-timing-dialog button:focus-visible{outline:3px solid #ffdc94;outline-offset:3px}
@media(max-width:560px){.lyric-card-v3{width:168px;min-height:124px;padding:17px 13px;font-size:18px}.math-float-v3{font-size:17px;max-width:130px}#music-status{display:none}#floating-music-widget{max-width:calc(100vw - 75px)}}
@media print{#lyric-stage-v3,#floating-music-widget,#word-timing-dialog{display:none!important}}
`;
document.head.append(style);
const stage=document.createElement('div');stage.id='lyric-stage-v3';stage.setAttribute('aria-hidden','true');document.body.append(stage);
const timingButton=document.createElement('button');timingButton.id='word-timing-open';timingButton.textContent='Căn chữ';timingButton.title='Ghi mốc thời gian cho từng từ';document.getElementById('floating-music-widget')?.append(timingButton);
const dialog=document.createElement('dialog');dialog.id='word-timing-dialog';dialog.setAttribute('aria-labelledby','timing-title');dialog.innerHTML=`<h2 id="timing-title">Căn từng chữ theo nhạc</h2><p id="timing-quality"></p><p>Bấm “Ghi từ đầu”, rồi bấm nút lớn đúng lúc nghe từng từ được hát. Có thể dùng phím Space khi nút lớn đang được chọn. Các mốc được lưu trên trình duyệt này; không sửa lời trong HTML.</p><div class="timing-actions"><button id="timing-start">Ghi từ đầu</button><button id="timing-undo">Lùi 1 từ</button><button id="timing-preview">Nghe thử</button></div><div><span id="timing-count"></span> · <span id="timing-clock">0,00 s</span></div><strong id="timing-next"></strong><button id="timing-tap" disabled>Ghi mốc từ đang hát</button><div class="timing-actions"><button id="timing-save" disabled>Lưu mốc</button><button id="timing-clear">Xóa mốc đã lưu</button><button id="timing-close">Đóng</button></div><label>Độ trễ toàn bộ chữ (giây) <input id="timing-offset" type="number" step="0.05" min="-60" max="60" value="0"></label><p>Số dương làm chữ xuất hiện muộn hơn. Chưa có mốc từng từ thì chỉ là ước lượng từ mốc câu.</p><p id="timing-message" role="status"></p>`;
document.body.append(dialog);
const q=id=>dialog.querySelector('#'+id),cards=new Map(),maths=new Map();
let wordTimes=null,offset=Number(window.LYRIC_OFFSET)||0,frame=0,wantsPlay=false,serial=0,recording=false,draft=[],clockFrame=0;
const flat=cues.flatMap((c,line)=>c.tokens.map((text,word)=>({text,line,word})));
function validTimes(rows){let prev=-Infinity;return Array.isArray(rows)&&rows.length===cues.length&&rows.every((row,i)=>Array.isArray(row)&&row.length===cues[i].tokens.length&&row.every(t=>{const ok=Number.isFinite(t)&&t>=0&&t>prev;prev=t;return ok;}));}
if(validTimes(window.LYRIC_WORD_TIMES))wordTimes=window.LYRIC_WORD_TIMES.map(r=>r.slice());
try{const saved=JSON.parse(localStorage.getItem(key));if(saved&&validTimes(saved.times)){wordTimes=saved.times;offset=Number(saved.offset)||0;}}catch{}
q('timing-offset').value=String(offset);
function quality(){q('timing-quality').textContent=wordTimes?'Đang dùng mốc từng từ đã nhập hoặc đã ghi.':'Chưa có mốc từng từ: hiệu ứng đang dùng thời gian ước lượng.';}
quality();
function clearVisuals(){cards.clear();maths.clear();stage.replaceChildren();document.querySelectorAll('.floating-lyric-box,#lyric-stage').forEach(e=>{if(e.id==='lyric-stage')e.replaceChildren();else e.remove();});}
function endOfLine(i){const start=wordTimes?wordTimes[i][0]:cues[i].time;const next=i+1<cues.length?(wordTimes?wordTimes[i+1][0]:cues[i+1].time):Infinity;const natural=wordTimes?wordTimes[i].at(-1)+1.0:start+4.2;const explicit=Number.isFinite(cues[i].end)?cues[i].end:Infinity;return Math.max(start+.05,Math.min(next,natural,explicit));}
function timeline(i){if(wordTimes)return wordTimes[i];const start=cues[i].time,span=Math.max(.1,endOfLine(i)-start)*.72;return cues[i].tokens.map((_,j)=>start+span*j/cues[i].tokens.length);}
function makeCard(i){const el=document.createElement('div');el.className='lyric-card-v3'+(i%2?' dark':'');const line=document.createElement('span');line.className='lyric-line';const words=cues[i].tokens.map((t,j)=>{const w=document.createElement('span');w.className='lyric-word';w.textContent=t+(j<cues[i].tokens.length-1?' ':'');line.append(w);return w;});el.append(line);stage.append(el);const entry={el,words,width:el.offsetWidth,height:el.offsetHeight};cards.set(i,entry);return entry;}
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function drawCard(i,time){const start=wordTimes?wordTimes[i][0]:cues[i].time,end=endOfLine(i),entry=cards.get(i)||makeCard(i),elapsed=time-start,span=Math.max(.1,end-start),progress=clamp(elapsed/span,0,1),fade=clamp((end+.65-time)/.65,0,1);const w=innerWidth,h=innerHeight,margin=15;const right=i%2===0;const x=right?w-entry.width-margin:margin;const bottom=Math.max(100,h-entry.height-92),top=90;const y=animationsOn()?bottom-(bottom-top)*progress:bottom;const pop=clamp(elapsed/.20,0,1);const scale=animationsOn()?1-.06*(1-pop):1;entry.el.style.transform=`translate3d(${Math.max(margin,x)}px,${Math.max(top,y)}px,0) rotate(${animationsOn()?(right?2:-2):0}deg) scale(${scale})`;entry.el.style.opacity=String(Math.min(pop,fade));const times=timeline(i);entry.words.forEach((word,j)=>{const reveal=clamp((time-times[j])/.10,0,1);word.style.opacity=String(reveal);word.style.transform=animationsOn()?`translateY(${(1-reveal)*5}px)`:'none';});}
const formulaTexts=['∂f/∂x = f′ₓ','dz = f′ₓ dx + f′ᵧ dy','∇f = (f′ₓ; f′ᵧ)','Δ = AC − B²','z = f(x; y)'];
function drawMath(time){const slot=Math.floor(time/4.8);for(const [id,el]of maths){if(time-id*4.8>=8||id>slot){el.remove();maths.delete(id);}}
if(!animationsOn()){for(const el of maths.values())el.remove();maths.clear();return;}
for(let i=Math.max(0,slot-1);i<=slot;i++){const age=time-i*4.8;if(age<0||age>=8)continue;let el=maths.get(i);if(!el){el=document.createElement('div');el.className='math-float-v3';el.textContent=formulaTexts[i%formulaTexts.length];stage.append(el);maths.set(i,el);}const p=age/8;const x=i%2?14:Math.max(14,innerWidth-el.offsetWidth-16);const y=innerHeight-110-p*(innerHeight-180);el.style.transform=`translate3d(${x}px,${y}px,0)`;el.style.opacity=String(.25*Math.sin(Math.PI*p));}}
function sync(){if(media.paused||media.ended||document.hidden){clearVisuals();return;}const time=media.currentTime-offset;const visible=[];for(let i=0;i<cues.length;i++){const start=wordTimes?wordTimes[i][0]:cues[i].time;if(time>=start&&time<endOfLine(i)+.65)visible.push(i);}const chosen=visible.slice(-2);for(const [i,c]of cards)if(!chosen.includes(i)){c.el.remove();cards.delete(i);}chosen.forEach(i=>drawCard(i,time));drawMath(Math.max(0,media.currentTime));}
function loop(){sync();if(!media.paused&&!media.ended)frame=requestAnimationFrame(loop);}
function launch(){cancelAnimationFrame(frame);loop();}
function stopped(label){cancelAnimationFrame(frame);clearVisuals();button.textContent='▶ Phát nhạc';button.setAttribute('aria-pressed','false');status.textContent=label;}
function stop(label='Đã dừng'){serial++;wantsPlay=false;media.pause();stopped(label);}
async function start(){const token=++serial;wantsPlay=true;status.textContent='Đang tải…';button.textContent='■ Hủy';try{if(media.ended)media.currentTime=0;await media.play();if(token!==serial)return;wantsPlay=false;}catch(e){if(token!==serial)return;wantsPlay=false;recording=false;stopped(e.name==='NotAllowedError'?'Bấm để thử lại':'Lỗi nguồn nhạc');q('timing-message').textContent='Không phát được âm thanh. Kiểm tra đường dẫn trực tiếp đến file nhạc.';updateRecording();}}
button.onclick=()=>{if(wantsPlay||!media.paused)stop();else start();};
media.ontimeupdate=sync;media.onended=()=>{recording=false;stopped('Kết thúc');updateRecording();};
media.addEventListener('playing',()=>{button.textContent='■ Tắt nhạc';button.setAttribute('aria-pressed','true');status.textContent=wordTimes?'Đang phát':'Mốc chữ tạm';launch();});
media.addEventListener('pause',()=>stopped('Đã dừng'));
media.addEventListener('seeking',()=>{clearVisuals();sync();});
media.addEventListener('error',()=>{recording=false;stop('Lỗi nguồn nhạc');updateRecording();});
addEventListener('resize',()=>clearVisuals());
document.addEventListener('visibilitychange',()=>{if(document.hidden){recording=false;stop();updateRecording();}});
function clock(){q('timing-clock').textContent=media.currentTime.toFixed(2).replace('.',',')+' s';if(dialog.open)clockFrame=requestAnimationFrame(clock);}
function updateRecording(){q('timing-count').textContent=draft.length+' / '+flat.length+' từ';q('timing-next').textContent=flat[draft.length]?.text||(flat.length?'Đã ghi đủ các từ':'HTML chưa có dữ liệu lời');q('timing-tap').disabled=!recording||draft.length>=flat.length;q('timing-save').disabled=draft.length!==flat.length||!flat.length;q('timing-undo').disabled=!draft.length;}
timingButton.onclick=()=>{dialog.showModal();quality();updateRecording();cancelAnimationFrame(clockFrame);clock();};
q('timing-start').onclick=async()=>{stop();draft=[];recording=true;media.currentTime=0;q('timing-message').textContent='Bấm đúng thời điểm bắt đầu từng từ. Chữ trên nút là từ tiếp theo cần ghi.';updateRecording();q('timing-tap').focus();await start();};
q('timing-tap').onclick=()=>{if(!recording||media.paused||media.ended||draft.length>=flat.length)return;const time=media.currentTime;if(draft.length&&time<=draft.at(-1)+.03)return;draft.push(time);if(draft.length===flat.length){recording=false;q('timing-message').textContent='Đã ghi đủ. Bấm Lưu mốc, rồi Nghe thử.';}updateRecording();};
q('timing-undo').onclick=()=>{if(!draft.length)return;draft.pop();recording=true;media.currentTime=Math.max(0,(draft.at(-1)||0)-.4);updateRecording();q('timing-tap').focus();start();};
q('timing-save').onclick=()=>{if(draft.length!==flat.length||!flat.length)return;const rows=cues.map(()=>[]);flat.forEach((t,i)=>rows[t.line].push(draft[i]));if(!validTimes(rows)){q('timing-message').textContent='Các mốc cần tăng dần. Hãy ghi lại.';return;}wordTimes=rows;offset=0;q('timing-offset').value='0';persist();quality();clearVisuals();};
function persist(){try{localStorage.setItem(key,JSON.stringify({times:wordTimes,offset}));q('timing-message').textContent='Đã lưu trên trình duyệt này.';}catch{q('timing-message').textContent='Đã áp dụng cho phiên này; trình duyệt không cho lưu lâu dài.';}}
q('timing-preview').onclick=()=>{recording=false;updateRecording();media.currentTime=0;start();};
q('timing-clear').onclick=()=>{wordTimes=null;draft=[];offset=0;q('timing-offset').value='0';try{localStorage.removeItem(key);}catch{}quality();updateRecording();clearVisuals();q('timing-message').textContent='Đã trở về mốc ước lượng từ HTML.';};
q('timing-offset').onchange=()=>{offset=clamp(Number(q('timing-offset').value)||0,-60,60);q('timing-offset').value=String(offset);persist();clearVisuals();};
q('timing-close').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{recording=false;cancelAnimationFrame(clockFrame);updateRecording();});
new MutationObserver(()=>clearVisuals()).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
reduced.addEventListener('change',clearVisuals);
clearVisuals();button.setAttribute('aria-pressed',String(!media.paused));updateRecording();if(!media.paused)launch();
})();
