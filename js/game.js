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
 lane+=(targetLane-lane)*Math.min(1,dt*2.8);depth+=(targetDepth-depth)*Math.min(1,dt*2.5);\n // Wave energy naturally accelerates the board; steering only trims the line.\n const wavePush=(wave>=2?.19:.12)*(0.7+Math.sin(wavePhase*1.1)*.3);\n speed=clamp(speed+wavePush*dt-(Math.abs(targetLane-lane)>.2?dt*.05:0),.32,1.12);\n lane=clamp(lane+Math.sin(wavePhase*.65+depth*2)*dt*.018,.04,.96);\n depth=clamp(depth+Math.sin(wavePhase*.8+lane*3)*dt*.012,.1,.9);
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
  const t=elapsed, u=Math.max(1,W/700);
  // Cinematic ocean: layered gradients, curved water planes, foam and atmospheric spray.
  const sky=ctx.createLinearGradient(0,0,0,H*.65);
  sky.addColorStop(0,'#78c9e8');sky.addColorStop(.55,'#c5e9ee');sky.addColorStop(1,'#f8d6a0');
  ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  const sun=ctx.createRadialGradient(W*.78,H*.16,2,W*.78,H*.16,H*.24);
  sun.addColorStop(0,'rgba(255,244,194,.95)');sun.addColorStop(1,'rgba(255,244,194,0)');
  ctx.fillStyle=sun;ctx.fillRect(W*.5,0,W*.5,H*.5);
  ctx.fillStyle='rgba(255,255,255,.55)';
  for(let i=0;i<10;i++){let x=((i*173-t*8)%(W+180)+W+180)%(W+180)-90;ctx.beginPath();ctx.ellipse(x,H*(.18+(i%4)*.045),W*(.035+i%3*.012),H*.006,0,0,Math.PI*2);ctx.fill()}
  // Distant ocean horizon and swell.
  const horizon=H*.43;
  ctx.fillStyle='#3d9cae';ctx.fillRect(0,horizon,W,H-horizon);
  ctx.fillStyle='#277f98';ctx.beginPath();ctx.moveTo(0,horizon+H*.04);
  for(let x=0;x<=W+4;x+=4){const y=horizon+H*.045+Math.sin(x/W*8+t*.22)*H*.012+Math.sin(x/W*19-t*.3)*H*.004;ctx.lineTo(x,y)}
  ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.closePath();ctx.fill();
  // Main face: curved shoulder and a clearly hollow barrel on waves two and three.
  const tubeActive=wave>=2;
  const crestX=W*(tubeActive?.68:.82)+Math.sin(t*.3)*W*.012;
  const crestY=H*(.48+Math.sin(t*.42)*.008);
  const face=ctx.createLinearGradient(0,H*.38,W,H);
  face.addColorStop(0,'#b9f5e9');face.addColorStop(.18,'#35c8c2');face.addColorStop(.48,'#078ca8');face.addColorStop(1,'#063d61');
  ctx.beginPath();ctx.moveTo(0,H);
  ctx.bezierCurveTo(W*.08,H*.68,W*.12,H*.48,W*.34,H*.47);
  ctx.bezierCurveTo(W*.48,H*.45,W*.53,H*.33,crestX,H*.37);
  ctx.bezierCurveTo(W*.78,H*.37,W*.9,H*.5,W,H*.54);
  ctx.lineTo(W,H);ctx.closePath();ctx.fillStyle=face;ctx.fill();
  // Broad specular bands follow the flow of the water.
  for(let i=0;i<8;i++){
    const yy=H*(.51+i*.055), drift=Math.sin(t*.7+i)*W*.018;
    ctx.beginPath();ctx.moveTo(-W*.05,yy+H*.03);
    ctx.bezierCurveTo(W*.18,yy-H*.07+drift,W*.38,yy-H*.09,W*.57,yy+H*.005);
    ctx.bezierCurveTo(W*.73,yy+H*.07,W*.87,yy+H*.04,W*1.05,yy-H*.015);
    ctx.lineWidth=Math.max(1,H*.003);ctx.strokeStyle=i%2?'rgba(180,255,239,.18)':'rgba(230,255,248,.22)';ctx.stroke();
  }
  // The breaking lip rolls over a dark, open barrel on at least one full wave.
  if(tubeActive){
    const tx=crestX, ty=crestY;
    const tubeGrad=ctx.createRadialGradient(tx-W*.035,ty+H*.085,2,tx-W*.015,ty+H*.075,W*.16);
    tubeGrad.addColorStop(0,'#031e38');tubeGrad.addColorStop(.52,'#064c69');tubeGrad.addColorStop(1,'#0c8c9c');
    ctx.beginPath();ctx.moveTo(tx-W*.25,ty+H*.12);
    ctx.bezierCurveTo(tx-W*.18,ty-H*.045,tx-W*.035,ty-H*.13,tx+W*.075,ty-H*.035);
    ctx.bezierCurveTo(tx+W*.13,ty+H*.015,tx+W*.075,ty+H*.12,tx+W*.025,ty+H*.145);
    ctx.bezierCurveTo(tx+W*.005,ty+H*.07,tx+W*.045,ty+H*.025,tx+W*.005,ty-H*.002);
    ctx.bezierCurveTo(tx-W*.045,ty-H*.045,tx-W*.105,ty+H*.025,tx-W*.15,ty+H*.13);
    ctx.closePath();ctx.fillStyle=tubeGrad;ctx.fill();
    // Bright translucent lip and a white, aerated edge.
    ctx.beginPath();ctx.moveTo(tx-W*.28,ty+H*.13);
    ctx.bezierCurveTo(tx-W*.19,ty-H*.07,tx-W*.045,ty-H*.16,tx+W*.07,ty-H*.055);
    ctx.bezierCurveTo(tx+W*.11,ty-H*.005,tx+W*.08,ty+H*.035,tx+W*.035,ty+H*.045);
    ctx.bezierCurveTo(tx+W*.055,ty-H*.035,tx-W*.015,ty-H*.08,tx-W*.09,ty-H*.005);
    ctx.bezierCurveTo(tx-W*.17,ty+H*.055,tx-W*.19,ty+H*.14,tx-W*.28,ty+H*.13);
    ctx.closePath();ctx.fillStyle='#a8fff0';ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.95)';ctx.lineWidth=Math.max(2,H*.006);ctx.stroke();
  } else {
    ctx.beginPath();ctx.moveTo(W*.12,H*.53);ctx.bezierCurveTo(W*.35,H*.37,W*.56,H*.38,W*.77,H*.47);ctx.strokeStyle='#b9fff0';ctx.lineWidth=H*.025;ctx.stroke();
  }
  // Foam sheets and irregular spray, animated along the lip.
  for(let i=0;i<100;i++){
    const p=(i*47%101)/101, x=(p*W+Math.sin(t*1.2+i)*W*.008);
    const y=H*(tubeActive?.43:.46)+Math.sin(p*9+t*.9)*H*.045+(i%5)*H*.004;
    const r=u*(1+(i%4));
    ctx.fillStyle=i%4===0?'rgba(255,255,255,.95)':i%3===0?'rgba(224,255,247,.82)':'rgba(163,255,239,.45)';
    ctx.beginPath();ctx.ellipse(x,y,r*2,r*.6,Math.sin(i+t)*.18,0,Math.PI*2);ctx.fill();
  }
  for(let i=0;i<32;i++){
    const x=((i*67-t*(22+i%5)*speed*8)%(W+50)+W+50)%(W+50)-25;
    const y=H*(.62+(i%7)*.045)+Math.sin(t*1.3+i)*H*.009;
    ctx.strokeStyle=i%2?'rgba(202,255,247,.45)':'rgba(255,255,255,.35)';
    ctx.lineWidth=Math.max(1,u*1.2);ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+W*.025,y-H*.008,x+W*.05,y);ctx.stroke();
  }
  const riderX=W*(.24+lane*.49), riderY=H*(.43+depth*.38)-(airTime>0?Math.sin((1-airTime/.95)*Math.PI)*H*.11:0)+(fallTimer>0?Math.sin(t*30)*8:0);
  if(mode==='playing'||mode==='paused'){drawSurfer(riderX,riderY,t);for(const p of particles){ctx.globalAlpha=clamp(p.life/(p.max||1),0,1);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,Math.max(1,p.size),0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1}
  else drawSurfer(W*.51,H*.69+Math.sin(t*2)*3,t);
  // Atmospheric mist around the breaking section.
  const mist=ctx.createLinearGradient(0,H*.4,0,H*.57);mist.addColorStop(0,'rgba(255,255,255,.20)');mist.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=mist;ctx.fillRect(0,H*.39,W,H*.19);
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