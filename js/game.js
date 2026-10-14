(() => {
'use strict';
const $ = id => document.getElementById(id);
const canvas = $('surf-canvas');
const ctx = canvas.getContext('2d', {alpha:false});
const C = {deep:'#062f40',navy:'#031d2c',water:'#087e9d',teal:'#08b8bf',aqua:'#79f2df',foam:'#f5fff9',sky:'#b9e9f4',sun:'#ffd166',coral:'#ff6b78',white:'#fff'};
const CFG = {duration:30,maxCombo:4,fallPenalty:100};
const TRICKS = {
  carve:{name:'CARVE',base:180,minSpeed:.25,depth:[.35,.83],air:false},
  cutback:{name:'CUTBACK',base:260,minSpeed:.32,depth:[.25,.76],air:false},
  snap:{name:'SNAP',base:350,minSpeed:.42,depth:[.16,.57],air:false},
  aerial:{name:'AÉREO',base:600,minSpeed:.58,depth:[.08,.39],air:true}
};
let W=innerWidth,H=innerHeight,DPR=1,mode='menu',wave=0,waveTime=CFG.duration,score=0,total=0,combo=0,maxCombo=0,falls=0,landed=0;
let balance=86,speed=.58,lane=.48,depth=.58,targetLane=.48,targetDepth=.58,session=[],waveStats=null,record=0,tutorialSeen=false,soundOn=true,audioCtx=null;
let lastFrame=0,elapsed=0,particles=[],airTime=0,fallTimer=0,shake=0,lastTrick='',repeat=0,toastUntil=0,calloutUntil=0,steerPointer=null;
let wavePhase=0,crestPulse=0;
try { record=Number(localStorage.getItem('surfArcadeRecord'))||0; soundOn=localStorage.getItem('surfArcadeSound')!=='off'; tutorialSeen=localStorage.getItem('surfArcadeTutorial')==='yes'; } catch(_){}
$('sound-btn').textContent=soundOn?'♫':'♪';
function resize(){W=innerWidth;H=innerHeight;DPR=Math.min(devicePixelRatio||1,1.8);const lowScale=Math.max(.22,Math.min(.42,320/Math.max(W,H)));canvas.width=Math.max(1,Math.round(W*lowScale));canvas.height=Math.max(1,Math.round(H*lowScale));canvas.style.width=W+'px';canvas.style.height=H+'px';ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);draw();}
addEventListener('resize',resize);
addEventListener('orientationchange',()=>{if(mode==='playing')pauseGame();setTimeout(resize,180)});
const screens=['start-screen','tutorial-screen','pause-screen','wave-result','final-screen'];
function show(id){screens.forEach(s=>$(s).classList.add('hidden'));if(id)$(id).classList.remove('hidden')}
function playingUI(on){['hud','controls','game-footer','pause-btn'].forEach(id=>$(id).classList.toggle('hidden',!on))}
function initAudio(){if(!soundOn)return;try{if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume()}catch(_){}}
function tone(freq,duration,type='sine',gain=.03){if(!soundOn)return;try{initAudio();if(!audioCtx)return;const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.setValueAtTime(freq,audioCtx.currentTime);g.gain.setValueAtTime(gain,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+duration)}catch(_){}}
function begin(){initAudio();score=0;total=0;session=[];wave=0;startWave()}
function startWave(){wave++;waveTime=CFG.duration;score=0;combo=0;maxCombo=0;falls=0;landed=0;balance=86;speed=.58;lane=.48;depth=.58;targetLane=.48;targetDepth=.58;airTime=0;fallTimer=0;lastTrick='';repeat=0;particles=[];waveStats={score:0,landed:0,falls:0,maxCombo:0,best:'—',tricks:new Set()};mode='playing';show(null);playingUI(true);$('wave-label').textContent='OLA '+wave+' / 3';$('banner-number').textContent=String(wave).padStart(2,'0');$('wave-banner').classList.remove('hidden');$('status-message').textContent=wave===1?'BUSCA LA LÍNEA':'MANTÉN LA LÍNEA. SUBE PARA ATACAR.';setTimeout(()=>$('wave-banner').classList.add('hidden'),1300);updateHUD();lastFrame=performance.now();requestAnimationFrame(loop)}
function pauseGame(){if(mode!=='playing')return;mode='paused';show('pause-screen');playingUI(false);$('wave-banner').classList.add('hidden')}
function resumeGame(){if(mode!=='paused')return;mode='playing';show(null);playingUI(true);lastFrame=performance.now();requestAnimationFrame(loop)}
function updateHUD(){$('wave-score').textContent=Math.floor(score).toLocaleString('es-ES');$('total-score').textContent='TOTAL '+Math.floor(total+score).toLocaleString('es-ES');$('combo-label').textContent='×'+(combo?Math.min(CFG.maxCombo,1+(combo-1)*.4).toFixed(1):'1.0');$('balance-fill').style.width=Math.max(0,balance)+'%';$('balance-fill').style.background=balance<32?'#ff5c67':balance<58?'#ffd166':'#79f2df';$('timer-label').textContent=Math.max(0,waveTime).toFixed(1)+' s';$('wave-progress').style.transform='scaleX('+Math.max(0,waveTime/CFG.duration)+')'}
function burst(x,y,n=18,color=C.foam){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=30+Math.random()*170;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-45,life:.4+Math.random()*.65,max:1,size:1.5+Math.random()*4,color})}}
function trick(id){if(mode!=='playing'||fallTimer>0||airTime>0)return;const t=TRICKS[id];if(!t)return;initAudio();
 const inZone=depth>=t.depth[0]&&depth<=t.depth[1],ready=speed>=t.minSpeed&&balance>30&&inZone;
 if(ready){const repeated=id===lastTrick?repeat+1:0;repeat=repeated;lastTrick=id;combo++;maxCombo=Math.max(maxCombo,combo);waveStats.maxCombo=Math.max(waveStats.maxCombo,combo);waveStats.tricks.add(id);const quality=(.76+balance/390+speed*.12)*(inZone?1:.7);const points=Math.round(t.base*quality*Math.min(CFG.maxCombo,1+(combo-1)*.4)*Math.max(.42,1-repeated*.27));score+=points;landed++;waveStats.landed++;waveStats.score=score;if(t.base>(TRICKS[waveStats.best]||{base:0}).base)waveStats.best=id;
 burst(W*(.32+lane*.4),H*(.42+depth*.38),t.air?30:18,C.foam);tone(t.air?720:470,.14,'triangle',.04);if(t.air){airTime=.95;shake=.12;depth=Math.max(.12,depth-.13)}
 $('toast-name').textContent=t.name;$('toast-points').textContent='+'+points;$('trick-toast').classList.remove('hidden');toastUntil=performance.now()+900;$('callout').textContent=balance>70?'CLEAN LANDING':'NICE LINE';$('callout').classList.remove('hidden');calloutUntil=performance.now()+500;$('status-message').textContent=t.air?'AÉREO · ATERRIZA':'BUENA LÍNEA';}
 else{combo=0;falls++;waveStats.falls=falls;score=Math.max(0,score-CFG.fallPenalty);balance=Math.max(8,balance-28);fallTimer=1.3;airTime=0;shake=.3;burst(W*(.32+lane*.4),H*(.42+depth*.38),26,C.aqua);tone(105,.3,'sawtooth',.05);$('toast-name').textContent='WIPEOUT';$('toast-points').textContent='−'+CFG.fallPenalty;$('trick-toast').classList.remove('hidden');toastUntil=performance.now()+1000;$('callout').textContent=!inZone?'BUSCA LA ZONA':'¡CAÍDA!';$('callout').classList.remove('hidden');calloutUntil=performance.now()+700;$('status-message').textContent=!inZone?'SUBE O BAJA POR LA PARED':'RECUPERA EL EQUILIBRIO'}
 updateHUD()}
function loop(now){if(mode!=='playing')return;const dt=Math.min(.032,Math.max(0,(now-lastFrame)/1000));lastFrame=now;elapsed+=dt;waveTime-=dt;wavePhase+=dt*(.7+speed*.9);crestPulse+=dt;update(dt,now);draw();if(waveTime<=0){finishWave();return}requestAnimationFrame(loop)}
function update(dt,now){
 lane+=(targetLane-lane)*Math.min(1,dt*4.5);depth+=(targetDepth-depth)*Math.min(1,dt*4.2);
 const movingUp=targetDepth<depth-.015,movingDown=targetDepth>depth+.015;
 if(movingUp){speed=Math.min(1.35,speed+dt*.23);balance=Math.max(25,balance-dt*1.8)}
 else if(movingDown){speed=Math.max(.25,speed-dt*.08);balance=Math.min(100,balance+dt*3.5)}
 else {speed+=(.58-speed)*dt*.045;balance=Math.min(100,balance+dt*4.8)}
 if(Math.abs(targetLane-lane)>.12){speed=Math.min(1.35,speed+dt*.1);balance=Math.max(20,balance-dt*.9)}
 if(fallTimer>0){fallTimer-=dt;speed=Math.max(.3,speed-dt*.22);depth=Math.min(.9,depth+dt*.12)}
 if(airTime>0){airTime=Math.max(0,airTime-dt);if(airTime===0)burst(W*(.32+lane*.4),H*(.42+depth*.38),12,C.foam)}
 shake=Math.max(0,shake-dt);particles=particles.filter(p=>p.life>0);particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=150*dt;p.life-=dt});
 if(now>toastUntil)$('trick-toast').classList.add('hidden');if(now>calloutUntil)$('callout').classList.add('hidden');updateHUD()
}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function pathWaveTop(t){ctx.beginPath();for(let x=0;x<=W+3;x+=4){const u=x/W;const swell=Math.exp(-Math.pow((u-.62)/.34,2));const y=H*(.53-.19*swell)+Math.sin(u*9-t*1.7)*H*.012+Math.sin(u*19+t*1.15)*H*.005;if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}}
function draw(){
  const t=elapsed, pxUnit=Math.max(3,Math.round(W/190));
  ctx.fillStyle='#f7b65a';ctx.fillRect(0,0,W,H);
  // Cielo de 8 bits, sol cuadrado y montañas escalonadas.
  ctx.fillStyle='#f7b65a';ctx.fillRect(0,0,W,H*.43);
  ctx.fillStyle='#ffdc7b';ctx.fillRect(0,H*.08,W,H*.06);
  ctx.fillStyle='#ffe8a0';ctx.fillRect(0,H*.16,W,H*.035);
  const sunX=W*.79,sunY=H*.16,ss=Math.max(8,W*.014);
  ctx.fillStyle='#fff0a8';ctx.fillRect(sunX-ss*2,sunY-ss*2,ss*4,ss*4);
  ctx.fillStyle='#fff7cf';ctx.fillRect(sunX-ss,sunY-ss,ss*2,ss*2);
  ctx.fillStyle='#db795d';ctx.beginPath();ctx.moveTo(0,H*.38);ctx.lineTo(W*.12,H*.28);ctx.lineTo(W*.2,H*.34);ctx.lineTo(W*.31,H*.24);ctx.lineTo(W*.43,H*.37);ctx.lineTo(W*.56,H*.29);ctx.lineTo(W*.7,H*.37);ctx.lineTo(W,H*.3);ctx.lineTo(W,H*.51);ctx.lineTo(0,H*.51);ctx.closePath();ctx.fill();
  ctx.fillStyle='#a94f58';ctx.beginPath();ctx.moveTo(0,H*.43);ctx.lineTo(W*.16,H*.35);ctx.lineTo(W*.27,H*.42);ctx.lineTo(W*.42,H*.34);ctx.lineTo(W*.58,H*.44);ctx.lineTo(W*.74,H*.36);ctx.lineTo(W,H*.43);ctx.lineTo(W,H*.56);ctx.lineTo(0,H*.56);ctx.closePath();ctx.fill();
  // Mar en bandas y horizonte pixelado.
  ctx.fillStyle='#2b8296';ctx.fillRect(0,H*.43,W,H*.57);
  ctx.fillStyle='#43a9a9';ctx.fillRect(0,H*.46,W,H*.09);
  ctx.fillStyle='#287b91';ctx.fillRect(0,H*.54,W,H*.46);
  for(let i=0;i<24;i++){const yy=H*(.47+(i%9)*.045),xx=((i*83-t*(25+i%4)*speed*8)%(W+70)+W+70)%(W+70)-35;ctx.fillStyle=i%3?'#72c6b0':'#c3e6b5';ctx.fillRect(xx,yy,pxUnit*(2+i%4),Math.max(2,pxUnit*.55))}
  // Cara de la ola: contorno escalonado que avanza hacia el surfista.
  const points=[];for(let x=0;x<=W+pxUnit;x+=pxUnit*2){const u=x/W;let y=H*(.55-.22*Math.exp(-Math.pow((u-.66)/.32,2)));y+=Math.sin(u*8-t*1.15)*H*.009;points.push([x,Math.round(y/pxUnit)*pxUnit])}
  ctx.beginPath();ctx.moveTo(0,H);points.forEach(p=>ctx.lineTo(p[0],p[1]));ctx.lineTo(W,H);ctx.closePath();ctx.fillStyle='#116d86';ctx.fill();
  // Bandas de luz y sombra en bloques para dar volumen retro.
  ctx.fillStyle='#24a9a5';ctx.beginPath();ctx.moveTo(0,H*.57);ctx.lineTo(W*.15,H*.48);ctx.lineTo(W*.3,H*.42);ctx.lineTo(W*.48,H*.4);ctx.lineTo(W*.61,H*.43);ctx.lineTo(W*.75,H*.5);ctx.lineTo(W*.88,H*.58);ctx.lineTo(W,H*.6);ctx.lineTo(W,H*.72);ctx.lineTo(0,H*.78);ctx.closePath();ctx.fill();
  ctx.fillStyle='#168b9a';ctx.beginPath();ctx.moveTo(0,H*.66);ctx.lineTo(W*.2,H*.57);ctx.lineTo(W*.4,H*.52);ctx.lineTo(W*.61,H*.54);ctx.lineTo(W*.8,H*.61);ctx.lineTo(W,H*.67);ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.closePath();ctx.fill();
  ctx.fillStyle='#0c506e';ctx.beginPath();ctx.moveTo(0,H*.79);ctx.lineTo(W*.25,H*.69);ctx.lineTo(W*.48,H*.66);ctx.lineTo(W*.72,H*.7);ctx.lineTo(W,H*.78);ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.closePath();ctx.fill();
  // Tubo oscuro y labio que rompe por encima del rider.
  const bx=W*(.68+.018*Math.sin(t*.8)),by=H*(.48+.006*Math.sin(t));
  ctx.fillStyle='#07344f';ctx.fillRect(bx-W*.13,by-W*.005,W*.24,H*.105);
  ctx.fillStyle='#092c48';ctx.fillRect(bx-W*.09,by+H*.015,W*.17,H*.055);
  ctx.fillStyle='#57cdb7';ctx.beginPath();ctx.moveTo(W*.12,H*.55);ctx.lineTo(W*.26,H*.46);ctx.lineTo(W*.4,H*.4);ctx.lineTo(bx-W*.015,H*.39);ctx.lineTo(bx+W*.08,H*.405);ctx.lineTo(bx+W*.105,H*.435);ctx.lineTo(bx+W*.055,H*.425);ctx.lineTo(bx+W*.01,H*.425);ctx.lineTo(W*.54,H*.47);ctx.lineTo(W*.36,H*.53);ctx.closePath();ctx.fill();
  ctx.fillStyle='#d8f2bc';ctx.fillRect(W*.12,H*.545,W*.14,pxUnit*2);
  ctx.fillStyle='#f5f3c3';ctx.fillRect(bx-W*.01,H*.39,W*.095,pxUnit*2);
  // Espuma cuadrada y estelas que corren por la pared.
  for(let i=0;i<48;i++){const u=(i*37%103)/103,x=W*(.12+u*.75)+Math.sin(t*1.7+i)*pxUnit*2,y=H*(.43+((i*17)%48)/100);ctx.fillStyle=i%4?'#d8f2bc':'#fff6d1';ctx.fillRect(Math.round(x/pxUnit)*pxUnit,Math.round(y/pxUnit)*pxUnit,pxUnit*(1+i%3),pxUnit*(1+i%2))}
  for(let i=0;i<16;i++){const u=(i*31%97)/97,x=W*u,y=H*(.63+(i%5)*.055)+Math.sin(t*1.5+i)*pxUnit;ctx.fillStyle=i%2?'#5cc4b4':'#d8f2bc';ctx.fillRect(Math.round(x/pxUnit)*pxUnit,Math.round(y/pxUnit)*pxUnit,pxUnit*(3+i%4),Math.max(2,pxUnit*.7))}
  const riderX=W*(.25+lane*.48),riderY=H*(.39+depth*.42)-(airTime>0?Math.sin((1-airTime/.95)*Math.PI)*H*.11:0)+(fallTimer>0?Math.sin(t*30)*8:0);
  if(mode==='playing'||mode==='paused'){drawSurfer(riderX,riderY,t);for(const p of particles){ctx.globalAlpha=clamp(p.life/(p.max||1),0,1);ctx.fillStyle=p.color;ctx.fillRect(Math.round(p.x/pxUnit)*pxUnit,Math.round(p.y/pxUnit)*pxUnit,pxUnit,pxUnit)}ctx.globalAlpha=1}
  else drawSurfer(W*.51,H*.69+Math.sin(t*2)*3,t);
  // Pixel-grid overlay is intentionally subtle.
  ctx.fillStyle='#062b3b18';for(let y=0;y<H;y+=pxUnit*3)ctx.fillRect(0,y,W,1);
}
function drawSurfer(x,y,t){
  ctx.save();const unit=Math.max(3,Math.round(W/190));ctx.translate(Math.round(x/unit)*unit,Math.round(y/unit)*unit);
  const lean=clamp((targetLane-lane)*1.5,-.35,.35)+(airTime>0?Math.sin(t*11)*.18:0);ctx.rotate(lean);
  const s=unit;
  // Spray trail, board and small readable pixel surfer sprite.
  ctx.fillStyle='#b8e7b5';ctx.fillRect(-s*10,s*3,s*5,s);ctx.fillRect(-s*7,s*5,s*3,s);ctx.fillRect(-s*13,s*1,s*3,s);
  ctx.fillStyle='#f5e7a2';ctx.fillRect(-s*12,s*2,s*23,s*2);ctx.fillRect(-s*10,s*1,s*18,s);ctx.fillStyle='#a94f58';ctx.fillRect(-s*7,s*2,s*9,Math.max(2,s*.5));
  // Legs / wetsuit
  ctx.fillStyle='#12384c';ctx.fillRect(-s*2,-s*2,s*2,s*4);ctx.fillRect(s*1,-s*1,s*2,s*3);ctx.fillRect(-s*5,s*1,s*4,s);ctx.fillRect(s*2,s*1,s*4,s);
  // Torso and arms, with pose change during aerial.
  ctx.fillStyle='#db795d';ctx.fillRect(-s*2,-s*8,s*5,s*6);
  ctx.fillStyle='#12384c';ctx.fillRect(-s*5,-s*7,s*3,s*2);ctx.fillRect(s*3,-s*7,s*4,s*2);ctx.fillRect(-s*7,-s*6,s*2,s*2);ctx.fillRect(s*7,-s*6,s*2,s*2);
  if(airTime>0){ctx.fillStyle='#fff6d1';ctx.fillRect(-s*12,-s*13,s*2,s);ctx.fillRect(-s*9,-s*15,s*2,s);ctx.fillRect(-s*6,-s*16,s*2,s)}
  // Head and hair
  ctx.fillStyle='#f0c18a';ctx.fillRect(-s,-s*11,s*4,s*3);ctx.fillStyle='#12384c';ctx.fillRect(-s*2,-s*12,s*5,s*2);ctx.fillRect(-s*2,-s*10,s,s);
  ctx.restore();
}
function finishWave(){mode='result';playingUI(false);total+=score;waveStats.score=score;waveStats.maxCombo=maxCombo;waveStats.falls=falls;session.push({...waveStats,tricks:waveStats.tricks.size});$('result-eyebrow').textContent='OLA '+wave+' COMPLETADA';$('result-title').innerHTML=wave===3?'ÚLTIMA<br><em>OLA.</em>':'BUENA<br><em>SESIÓN.</em>';$('result-score').textContent=score.toLocaleString('es-ES');$('result-tricks').textContent=landed;$('result-combo').textContent='×'+(maxCombo?Math.min(CFG.maxCombo,1+(maxCombo-1)*.4).toFixed(1):'1.0');$('result-falls').textContent=falls;$('next-wave-btn').innerHTML=wave===3?'VER RESULTADO FINAL <span>↗</span>':'SIGUIENTE OLA <span>↗</span>';show('wave-result');tone(620,.2,'triangle',.04)}
function finalScreen(){mode='final';show('final-screen');const newRecord=total>record;if(newRecord){record=total;try{localStorage.setItem('surfArcadeRecord',String(record))}catch(_){}}$('final-score').textContent=total.toLocaleString('es-ES');$('final-record').textContent=record.toLocaleString('es-ES')+(newRecord?' NUEVO':'');let best='—',base=0;session.forEach(s=>{const b=TRICKS[s.best]?.base||0;if(b>base){base=b;best=TRICKS[s.best].name}});$('final-best').textContent=best;const mc=Math.max(1,...session.map(s=>s.maxCombo));$('final-combo').textContent='×'+(mc>1?Math.min(CFG.maxCombo,1+(mc-1)*.4).toFixed(1):'1.0');$('rank-label').textContent=total>=9000?'LEGEND OF THE SEA':total>=6000?'WAVE MASTER':total>=3000?'WAVE RIDER':total>=1200?'LINE FINDER':'FIRST SWELL';$('wave-breakdown').innerHTML=session.map((s,i)=>'<span>OLA '+(i+1)+' · '+s.score.toLocaleString('es-ES')+'</span>').join('');if(newRecord)tone(880,.35,'triangle',.05)}
function startFromMenu(){if(!tutorialSeen){show('tutorial-screen');mode='tutorial'}else begin()}
$('start-btn').addEventListener('click',startFromMenu);
function tutorialDone(){tutorialSeen=true;try{localStorage.setItem('surfArcadeTutorial','yes')}catch(_){}begin()}
$('tutorial-go').addEventListener('click',tutorialDone);$('skip-tutorial').addEventListener('click',tutorialDone);$('pause-btn').addEventListener('click',pauseGame);$('resume-btn').addEventListener('click',resumeGame);
$('restart-btn').addEventListener('click',()=>{if(confirm('¿Reiniciar la partida? Perderás la puntuación actual.'))begin()});
$('home-btn').addEventListener('click',()=>{mode='menu';playingUI(false);show('start-screen')});
$('next-wave-btn').addEventListener('click',()=>{if(wave<3)startWave();else finalScreen()});$('play-again-btn').addEventListener('click',begin);
$('final-home-btn').addEventListener('click',()=>{mode='menu';playingUI(false);show('start-screen')});
$('sound-btn').addEventListener('click',()=>{soundOn=!soundOn;$('sound-btn').textContent=soundOn?'♫':'♪';try{localStorage.setItem('surfArcadeSound',soundOn?'on':'off')}catch(_){}if(soundOn){initAudio();tone(500,.08)}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='playing')pauseGame()});
document.querySelectorAll('.trick-btn').forEach(btn=>{const act=e=>{e.preventDefault();btn.classList.add('pressed');trick(btn.dataset.trick);setTimeout(()=>btn.classList.remove('pressed'),180)};btn.addEventListener('pointerdown',act);btn.addEventListener('contextmenu',e=>e.preventDefault())});
const steerArea=$('steer-area');
steerArea.addEventListener('pointerdown',e=>{if(mode!=='playing')return;e.preventDefault();steerPointer=e.pointerId;steerArea.setPointerCapture(e.pointerId);const r=steerArea.getBoundingClientRect();targetLane=clamp((e.clientX-r.left)/r.width,0,1);targetDepth=.08+clamp((e.clientY-r.top)/r.height,0,1)*.82;steerArea.classList.add('active')});
steerArea.addEventListener('pointermove',e=>{if(e.pointerId!==steerPointer)return;e.preventDefault();const r=steerArea.getBoundingClientRect();targetLane=clamp((e.clientX-r.left)/r.width,0,1);targetDepth=.08+clamp((e.clientY-r.top)/r.height,0,1)*.82});
function stopSteer(e){if(steerPointer===null||(e&&e.pointerId!==steerPointer))return;steerPointer=null;steerArea.classList.remove('active')}
steerArea.addEventListener('pointerup',stopSteer);steerArea.addEventListener('pointercancel',stopSteer);steerArea.addEventListener('lostpointercapture',stopSteer);
function orientationCheck(){const portrait=matchMedia('(orientation: portrait)').matches;$('orientation-screen').classList.toggle('hidden',!(portrait&&mode==='playing'))}
addEventListener('resize',orientationCheck);
function idleLoop(now){if(mode==='menu'||mode==='tutorial'||mode==='paused'){elapsed+=Math.min(.04,Math.max(0,(now-lastFrame)/1000||.016));lastFrame=now;draw();requestAnimationFrame(idleLoop)}}
resize();lastFrame=performance.now();requestAnimationFrame(idleLoop);
})();