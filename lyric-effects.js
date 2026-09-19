/* Load after the existing page script. No audio or lyric content is bundled.
   Optional: window.LYRIC_OFFSET = 0.2 delays every cue by 0.2 seconds.
   Optional: each existing cue may have an `end` time in seconds. */
(() => {
  'use strict';
  const media = document.getElementById('bg-audio');
  const button = document.getElementById('play-music-btn');
  const status = document.getElementById('music-status');
  const source = typeof lyricsData !== 'undefined' ? lyricsData : [];
  if (!media || !button || !status) return;
  const cues = source.filter(c => Number.isFinite(c.time) && typeof c.text === 'string')
    .slice().sort((a,b) => a.time-b.time);
  const style = document.createElement('style');
  style.textContent = `
    #floating-music-widget{top:auto!important;right:auto!important;left:16px;bottom:calc(16px + env(safe-area-inset-bottom));z-index:40;max-width:calc(100vw - 86px);padding:8px 10px;gap:8px}
    #music-status{max-width:130px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #lyric-stage{position:fixed;inset:0;pointer-events:none;z-index:35;overflow:hidden}
    .lyric-card-v2{position:absolute;width:clamp(150px,19vw,230px);max-width:calc(100vw - 32px);padding:24px 18px;background:#fafafa;color:#151515;border-radius:2px;box-shadow:0 14px 38px #0003;font:500 clamp(17px,1.6vw,22px)/1.4 system-ui,sans-serif;text-align:center;overflow-wrap:anywhere;white-space:pre-line;transform-origin:50% 65%;will-change:transform,opacity}
    .lyric-card-v2.dark{background:#111318;color:#fff;border:1px solid #ffffff18}
    @media(max-width:560px){.lyric-card-v2{width:164px;padding:17px 14px;font-size:17px}#music-status{max-width:88px;font-size:12px}}
    @media print{#floating-music-widget,#lyric-stage{display:none!important}}
  `;
  document.head.append(style);
  const stage = document.createElement('div');
  stage.id = 'lyric-stage'; stage.setAttribute('aria-hidden','true');
  document.body.append(stage);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let card=null, animation=null, active=-1, raf=0, pending=false, generation=0;
  function clean(){
    if(animation) animation.cancel();
    animation=null; card=null; active=-1; stage.replaceChildren();
    document.querySelectorAll('.floating-lyric-box').forEach(el=>el.remove());
  }
  function cancelFrame(){cancelAnimationFrame(raf);raf=0;}
  function locate(el,index){
    // Controlled positions: alternate corners, leaving the middle of the lesson clear.
    const margin=16, r=el.getBoundingClientRect(), mobile=innerWidth<700;
    const right=index%2===0;
    const x=right?innerWidth-r.width-margin:margin;
    const target=mobile?innerHeight-r.height-100:innerHeight*(index%3===0?.30:.55);
    const y=Math.max(86,Math.min(target,innerHeight-r.height-92));
    el.style.left=Math.max(margin,x)+'px';el.style.top=y+'px';
  }
  function show(index,duration){
    clean(); active=index;
    card=document.createElement('div');
    card.className='lyric-card-v2'+(index%2?' dark':'');
    card.textContent=cues[index].text;
    stage.append(card);locate(card,index);
    const still=reduce.matches||document.documentElement.classList.contains('motion-off');
    const tilt=index%2?-3:3;
    const frames=still?[
      {opacity:0,offset:0},{opacity:1,offset:.08},{opacity:1,offset:.86},{opacity:0,offset:1}
    ]:[
      {opacity:0,transform:`translateY(26px) scale(.86) rotate(${tilt-3}deg)`,offset:0},
      {opacity:1,transform:`translateY(0) scale(1.035) rotate(${tilt}deg)`,offset:.10},
      {opacity:1,transform:`translateY(-3px) scale(1) rotate(${tilt}deg)`,offset:.18},
      {opacity:1,transform:`translateY(-14px) scale(1) rotate(${tilt}deg)`,offset:.82},
      {opacity:0,transform:`translateY(-36px) scale(.98) rotate(${tilt+1}deg)`,offset:1}
    ];
    animation=card.animate(frames,{duration:duration*1000,fill:'both',easing:'linear'});
    animation.pause();
  }
  function sync(){
    if(media.paused||media.ended){clean();return;}
    const offset=Number(window.LYRIC_OFFSET)||0, time=media.currentTime-offset;
    let index=-1;
    for(let i=0;i<cues.length&&cues[i].time<=time;i++)index=i;
    if(index<0){if(card)clean();return;}
    const start=cues[index].time;
    const end=Math.min(Number.isFinite(cues[index].end)?cues[index].end:start+4.2,
      index+1<cues.length?cues[index+1].time:Infinity);
    if(time>=end||end<=start){if(card)clean();return;}
    if(index!==active)show(index,end-start);
    if(animation)animation.currentTime=(time-start)*1000;
  }
  function tick(){sync();if(!media.paused&&!media.ended)raf=requestAnimationFrame(tick);}
  function startTick(){cancelFrame();tick();}
  function stopped(label){cancelFrame();clean();button.textContent='▶ Phát nhạc';button.setAttribute('aria-pressed','false');status.textContent=label;}
  // Replace original handlers so the two effects engines do not run together.
  media.ontimeupdate=sync;
  media.onended=()=>stopped('Kết thúc');
  media.addEventListener('pause',()=>stopped('Đã dừng'));
  media.addEventListener('playing',()=>{
    button.textContent='■ Tắt nhạc';button.setAttribute('aria-pressed','true');
    status.textContent='Đang phát';startTick();
  });
  media.addEventListener('seeking',()=>{clean();sync();});
  media.addEventListener('error',()=>{
    generation++;pending=false;media.pause();stopped('Lỗi nguồn nhạc');
    status.title='Kiểm tra đường dẫn trực tiếp đến file âm thanh và định dạng của file.';
  });
  button.onclick=async()=>{
    if(pending||!media.paused){generation++;pending=false;media.pause();stopped('Đã dừng');return;}
    const token=++generation;pending=true;status.textContent='Đang tải…';
    button.textContent='■ Hủy phát';
    try{
      if(media.ended)media.currentTime=0;
      await media.play();
      if(token!==generation)return;
      pending=false;
    }catch(error){
      if(token!==generation)return;
      pending=false;stopped(error.name==='NotAllowedError'?'Bấm để thử lại':'Lỗi nguồn nhạc');
    }
  };
  addEventListener('resize',()=>{if(card)locate(card,active);});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){generation++;pending=false;media.pause();stopped('Đã dừng');}
  });
  new MutationObserver(()=>{if(card){clean();sync();}}).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  reduce.addEventListener('change',()=>{clean();sync();});
  clean();button.setAttribute('aria-pressed',String(!media.paused));
  if(!media.paused)startTick();
})();
