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
function resize(){W=innerWidth;H=innerHeight;DPR=Math.min(devicePixelRatio||1,1.8);canvas.width=Math.round(W*DPR);canvas.height=Math.round(H*DPR);canvas.style.width=W+'px';canvas.style.height=H+'px';ctx.setTransform(DPR,0,0,DPR,0,0);draw();}
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
 burst(W*(.32+lane*.4),H*(.42+depth*.38),C.foam,t.air?30:18);tone(t.air?720:470,.14,'triangle',.04);if(t.air){airTime=.95;shake=.12;depth=Math.max(.12,depth-.13)}
 $('toast-name').textContent=t.name;$('toast-points').textContent='+'+points;$('trick-toast').classList.remove('hidden');toastUntil=performance.now()+900;$('callout').textContent=balance>70?'CLEAN LANDING':'NICE LINE';$('callout').classList.remove('hidden');calloutUntil=performance.now()+500;$('status-message').textContent=t.air?'AÉREO · ATERRIZA':'BUENA LÍNEA';}
 else{combo=0;falls++;waveStats.falls=falls;score=Math.max(0,score-CFG.fallPenalty);balance=Math.max(8,balance-28);fallTimer=1.3;airTime=0;shake=.3;burst(W*(.32+lane*.4),H*(.42+depth*.38),C.aqua,26);tone(105,.3,'sawtooth',.05);$('toast-name').textContent='WIPEOUT';$('toast-points').textContent='−'+CFG.fallPenalty;$('trick-toast').classList.remove('hidden');toastUntil=performance.now()+1000;$('callout').textContent=!inZone?'BUSCA LA ZONA':'¡CAÍDA!';$('callout').classList.remove('hidden');calloutUntil=performance.now()+700;$('status-message').textContent=!inZone?'SUBE O BAJA POR LA PARED':'RECUPERA EL EQUILIBRIO'}
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
 if(airTime>0){airTime=Math.max(0,airTime-dt);if(airTime===0)burst(W*(.32+lane*.4),H*(.42+depth*.38),C.foam,12)}
 shake=Math.max(0,shake-dt);particles=particles.filter(p=>p.life>0);particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=150*dt;p.life-=dt});
 if(now>toastUntil)$('trick-toast').classList.add('hidden');if(now>calloutUntil)$('callout').classList.add('hidden');updateHUD()
}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function pathWaveTop(t){ctx.beginPath();for(let x=0;x<=W+3;x+=4){const u=x/W;const swell=Math.exp(-Math.pow((u-.62)/.34,2));const y=H*(.53-.19*swell)+Math.sin(u*9-t*1.7)*H*.012+Math.sin(u*19+t*1.15)*H*.005;if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}}
function draw(){
 ctx.setTransform(DPR,0,0,DPR,0,0);const t=elapsed;
 const sky=ctx.createLinearGradient(0,0,0,H*.65);sky.addColorStop(0,'#9dd9ed');sky.addColorStop(.48,'#d5f3f5');sky.addColorStop(1,'#f2fcf8');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
 // distant horizon, sun glint and low coastline
 ctx.fillStyle='#ffffff55';ctx.beginPath();ctx.ellipse(W*.18,H*.15,W*.075,H*.035,-.12,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#6ba8b8';ctx.beginPath();ctx.moveTo(0,H*.35);ctx.lineTo(W*.08,H*.31);ctx.lineTo(W*.16,H*.345);ctx.lineTo(W*.29,H*.325);ctx.lineTo(W*.4,H*.36);ctx.lineTo(W*.54,H*.34);ctx.lineTo(W*.67,H*.355);ctx.lineTo(W*.79,H*.33);ctx.lineTo(W,H*.35);ctx.lineTo(W,H*.5);ctx.lineTo(0,H*.5);ctx.closePath();ctx.fill();
 ctx.fillStyle='#c8e7e5';ctx.beginPath();ctx.moveTo(0,H*.39);for(let x=0;x<=W;x+=12)ctx.lineTo(x,H*.39+Math.sin(x*.014+t*.3)*4);ctx.lineTo(W,H*.55);ctx.lineTo(0,H*.55);ctx.closePath();ctx.fill();
 // near water behind the breaking face
 const ocean=ctx.createLinearGradient(0,H*.35,0,H);ocean.addColorStop(0,'#48c9d1');ocean.addColorStop(.38,'#087f9c');ocean.addColorStop(1,'#031e30');ctx.fillStyle=ocean;ctx.fillRect(0,H*.37,W,H*.63);
 for(let j=0;j<9;j++){const y=H*(.4+j*.026);ctx.beginPath();for(let x=0;x<=W;x+=14){const yy=y+Math.sin(x*.022+t*(.8+j*.08)+j)*2.5;if(x===0)ctx.moveTo(x,yy);else ctx.lineTo(x,yy)}ctx.strokeStyle=j%2?'#c9fff533':'#ffffff24';ctx.lineWidth=1+j*.08;ctx.stroke()}
 // towering wave face, viewed head-on
 pathWaveTop(t);ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.closePath();
 const face=ctx.createLinearGradient(0,H*.28,0,H);face.addColorStop(0,'#a6fff0');face.addColorStop(.12,'#23d1cc');face.addColorStop(.32,'#078ca8');face.addColorStop(.68,'#07506d');face.addColorStop(1,'#031d30');ctx.fillStyle=face;ctx.fill();
 // curved shoulder highlight
 ctx.save();ctx.globalAlpha=.72;ctx.beginPath();ctx.moveTo(W*.02,H*.55);ctx.bezierCurveTo(W*.18,H*.42,W*.27,H*.35,W*.43,H*.34);ctx.bezierCurveTo(W*.56,H*.32,W*.7,H*.37,W*.81,H*.47);ctx.strokeStyle='#c7fff3';ctx.lineWidth=Math.max(3,W*.006);ctx.stroke();ctx.restore();
 // curling lip sweeps over the hollow, making the wave visibly break toward the player
 const curlX=W*(.64+.035*Math.sin(t*.7)),curlY=H*(.365+.012*Math.sin(t*1.3));
 const lip=ctx.createLinearGradient(W*.38,H*.25,W*.83,H*.52);lip.addColorStop(0,'#e4fff4');lip.addColorStop(.36,'#a8fff0');lip.addColorStop(.72,'#30d9d0');lip.addColorStop(1,'#0c9eb5');
 ctx.beginPath();ctx.moveTo(W*.12,H*.46);ctx.bezierCurveTo(W*.28,H*.32,W*.43,H*.235,curlX,H*.27);ctx.bezierCurveTo(W*.78,H*.265,W*.83,H*.32,W*.77,H*.385);ctx.bezierCurveTo(W*.72,H*.35,W*.69,H*.315,W*.64,H*.325);ctx.bezierCurveTo(W*.53,H*.34,W*.49,H*.405,W*.43,H*.43);ctx.bezierCurveTo(W*.32,H*.48,W*.22,H*.49,W*.12,H*.46);ctx.closePath();ctx.fillStyle=lip;ctx.fill();
 // shadowed barrel hollow
 const barrel=ctx.createRadialGradient(W*.67,H*.405,2,W*.66,H*.43,W*.19);barrel.addColorStop(0,'#031a2b');barrel.addColorStop(.48,'#052f45');barrel.addColorStop(.75,'#075b73');barrel.addColorStop(1,'#14b8bd00');
 ctx.fillStyle=barrel;ctx.beginPath();ctx.ellipse(W*.665,H*.435,W*.17,H*.105,-.12,0,Math.PI*2);ctx.fill();
 // whitewater pouring off the lip
 ctx.beginPath();ctx.moveTo(W*.12,H*.46);ctx.bezierCurveTo(W*.29,H*.32,W*.43,H*.24,curlX,H*.27);ctx.bezierCurveTo(W*.79,H*.26,W*.84,H*.32,W*.77,H*.385);ctx.strokeStyle='#f7fff9';ctx.lineWidth=Math.max(4,W*.009);ctx.lineCap='round';ctx.stroke();
 for(let i=0;i<42;i++){const u=(i*37%101)/101;const x=W*(.16+u*.66)+Math.sin(t*2+i)*7;const crest=H*(.48-.18*Math.exp(-Math.pow((x/W-.62)/.34,2)));const y=crest+((i*19)%24)-8;ctx.globalAlpha=.25+((i*7)%7)/10;ctx.fillStyle=i%3?'#f5fff9':'#b8fff0';ctx.beginPath();ctx.ellipse(x,y,2+(i%4),1.5+(i%3),-.3,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;
 // foamy streaks rush down the face
 for(let i=0;i<26;i++){const u=((i*47)%97)/97;const x=W*(.05+u*.9);const y=H*(.48+((i*31/26)%1)*.42)+Math.sin(t*1.5+i)*4;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+Math.sin(t+i)*10,y+7,x+(i%2?1:-1)*(8+i%13),y+15+i%15);ctx.strokeStyle=i%3?'#d8fff555':'#ffffff45';ctx.lineWidth=1+(i%3);ctx.stroke()}
 // rider stays on the face; dragging vertically changes their line up and down the wave
 const px=W*(.25+lane*.48),baseY=H*(.39+depth*.42),py=baseY-(airTime>0?Math.sin((1-airTime/.95)*Math.PI)*H*.11:0)+(fallTimer>0?Math.sin(t*30)*8:0);
 if(mode==='playing'||mode==='paused'){drawSurfer(px,py,t);for(const p of particles){ctx.globalAlpha=clamp(p.life/(p.max||1),0,1);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1}
 else {drawSurfer(W*.51,H*.69+Math.sin(t*2)*3,t)}
 // edge vignette adds depth without obscuring gameplay
 const vignette=ctx.createLinearGradient(0,0,W,0);vignette.addColorStop(0,'#001b2b66');vignette.addColorStop(.14,'#001b2b00');vignette.addColorStop(.82,'#001b2b00');vignette.addColorStop(1,'#001b2b44');ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H)
}
function drawSurfer(x,y,t){
 ctx.save();ctx.translate(x,y);const tilt=clamp((targetLane-lane)*1.4,-.35,.35)+(airTime>0?Math.sin(t*11)*.3:0);ctx.rotate(tilt);
 const scale=clamp(W/900,.72,1.25);ctx.scale(scale,scale);
 // spray and shadow
 ctx.fillStyle='#001a2b45';ctx.beginPath();ctx.ellipse(0,21,42,7,0,0,Math.PI*2);ctx.fill();
 // surfboard with pointed nose and rails
 ctx.beginPath();ctx.moveTo(-47,10);ctx.quadraticCurveTo(-30,2,5,5);ctx.quadraticCurveTo(35,7,48,3);ctx.quadraticCurveTo(44,13,12,16);ctx.quadraticCurveTo(-24,18,-47,10);ctx.closePath();ctx.fillStyle=C.sun;ctx.fill();ctx.strokeStyle='#073449';ctx.lineWidth=2;ctx.stroke();ctx.beginPath();ctx.moveTo(-38,10);ctx.quadraticCurveTo(2,9,39,8);ctx.strokeStyle='#fff8';ctx.lineWidth=1;ctx.stroke();
 // body, wetsuit and limbs
 ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#102b40';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(-1,2);ctx.lineTo(0,-20);ctx.stroke();
 ctx.fillStyle=C.coral;ctx.beginPath();ctx.moveTo(-8,-19);ctx.lineTo(7,-22);ctx.lineTo(10,-5);ctx.lineTo(-6,-3);ctx.closePath();ctx.fill();
 ctx.strokeStyle='#102b40';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,-17);ctx.lineTo(-15,-10);ctx.lineTo(-22,-13);ctx.moveTo(1,-17);ctx.lineTo(14,-10);ctx.lineTo(21,-12);ctx.moveTo(-1,1);ctx.lineTo(-11,5);ctx.moveTo(1,1);ctx.lineTo(12,3);ctx.stroke();
 ctx.fillStyle='#dca985';ctx.beginPath();ctx.arc(1,-28,6,0,Math.PI*2);ctx.fill();ctx.fillStyle='#092b40';ctx.beginPath();ctx.arc(-1,-30,6,Math.PI,Math.PI*2);ctx.fill();
 if(airTime>0){ctx.strokeStyle='#f7fff9';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,2,52,-.5,1.8);ctx.stroke()}ctx.restore()
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