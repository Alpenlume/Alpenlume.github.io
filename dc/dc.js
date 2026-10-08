
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],R=document.documentElement;
const RM=matchMedia('(prefers-reduced-motion:reduce)').matches;
const hx=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const mix=(a,b,t)=>'#'+hx(a).map((v,i)=>Math.round(v+(hx(b)[i]-v)*t).toString(16).padStart(2,'0')).join('');
const lerp=(a,b,t)=>a+(b-a)*t;
const rgba=(h,a)=>{const c=hx(h);return 'rgba('+c[0]+','+c[1]+','+c[2]+','+a+')'};
/* key moments of the day: p, top, bottom, m1..m4, mist, sun, n(stars), cn(cards), hour, temp, warm */
const K=[
[0,'#141B35','#8B5A52','#5B7092','#3D5073','#2E3F5C','#1C2740','#C9906E','#FFB74D',.3,0,5.5,3,.4],
[.13,'#5B8DE8','#FFD3A8','#8FA4D6','#6C86B8','#4C6A93','#2E4A66','#FFE6CF','#FFE3A3',0,0,7.75,8,.3],
[.3,'#2F80ED','#BDE3FF','#7FA6D8','#5B87BB','#3F6F9A','#285078','#E8F4FF','#FFF6D6',0,0,10.5,16,0],
[.46,'#1A74F0','#A5D8FF','#7BA3D6','#4F83BD','#2F6396','#1E4C77','#DDEEFF','#FFFFFF',0,0,13,22,0],
[.62,'#4D7BD8','#FFCB85','#A798C9','#7D78AD','#55608F','#34486D','#FFE0B0','#FFD08A',0,0,16.75,15,.4],
[.76,'#3A2A74','#FF7A4A','#B2527E','#7C3A78','#502C62','#2C2048','#FFA37A','#FF6A3D',.55,.35,19.1,7,.8],
[.88,'#1A1650','#7A3F8E','#4A3A80','#35296A','#251D52','#171340','#6B4A9A','#C0508A',.92,.9,21,0,.35],
[1,'#04061A','#14204F','#24305F','#1A2350','#121A40','#0B1030','#2A3A7A','#9AB0FF',1,1,24.5,-8,0]];
function sample(p){let i=0;while(i<K.length-2&&p>K[i+1][0])i++;const a=K[i],b=K[i+1],t=Math.min(1,Math.max(0,(p-a[0])/(b[0]-a[0])));const s=t*.65+t*t*(3-2*t)*.35;
 const c=k=>mix(a[k],b[k],s),n=k=>lerp(a[k],b[k],s);return{top:c(1),bot:c(2),m1:c(3),m2:c(4),m3:c(5),m4:c(6),mist:c(7),sun:c(8),n:n(9),cn:n(10),hour:n(11),temp:n(12),warm:n(13)}}
const maxS=()=>Math.max(1,R.scrollHeight-innerHeight);
/* ───────── the world: ONE canvas. No DOM layers, no CSS filters, nothing repainted by the page. ───────── */
const WD=JSON.parse($('#world-data').textContent);
const cv=$('#world'),cx=cv.getContext('2d',{alpha:false});
const PA={back:new Path2D(WD.back),lit:new Path2D(WD.lit),shd:new Path2D(WD.shd),cap:new Path2D(WD.cap),rim:new Path2D(WD.rim),l3:new Path2D(WD.l3),l4:new Path2D(WD.l4),l5:new Path2D(WD.l5)};
const CXD=+(document.body.dataset.cx||150);
let VW=innerWidth,VH=innerHeight,K_=1,quality=1,SC=1,CX=CXD,MH=.78,mv=1,calmAt=0;
function geom(){VW=innerWidth;VH=innerHeight;const wide=VW>1000;MH=wide?.78:.5;const span=wide?2800:800;CX=wide?CXD:CXD+(CXD-CXD)+0;
 // the picture is centred on the peak (x=487 in the drawing) on a phone and on the drawing's middle on a desktop
 CX=wide?CXD:487;SC=Math.max(VW/span,MH*VH/850);
 setK();
 mkStars();dirty=true}
function setK(){const base=Math.min(devicePixelRatio||1,VW<800?1.25:1.35);K_=Math.max(.5,base*quality*mv);
 const area=VW*VH*K_*K_;if(area>3.2e6)K_*=Math.sqrt(3.2e6/area);
 cv.width=Math.round(VW*K_);cv.height=Math.round(VH*K_);dirty=true}
const px=vx=>VW/2+(vx-CX)*SC,py=vy=>VH-(1000-vy)*SC;
/* stars, flakes, clouds */
let stars=[],flakes=[],clouds=[],shoot=null,nextShoot=3,SA=0,SN=0;
function mkStars(){const n=Math.min(170,Math.round(VW*VH/6500));stars=Array.from({length:n},()=>({x:Math.random()*VW,y:Math.random()*VH*.7,r:Math.random()*1.2+.35,t:Math.random()*6.28,s:Math.random()*1.4+.4}));
 flakes=Array.from({length:VW<800?40:80},()=>({x:Math.random()*VW,y:Math.random()*VH,r:Math.random()*1.8+.8,v:Math.random()*.7+.3,d:Math.random()*6}));
 clouds=Array.from({length:VW<800?9:15},(_,i)=>({l:i%3,x:Math.random(),y:.05+((i*37)%100)/100*.42,s:.7+Math.random()*.9,sp:.4+Math.random()*.8,k:i%4}))}
/* cloud sprites: soft white clusters, drawn once, tinted when the hour changes */
const CS=[];(function(){for(let k=0;k<4;k++){const c=document.createElement('canvas');c.width=420;c.height=170;const g=c.getContext('2d');
 const r=(a,b)=>a+Math.random()*(b-a);const el=(x,y,rx,ry)=>{g.save();g.translate(x,y);g.scale(rx,ry);const gr=g.createRadialGradient(0,0,0,0,0,1);gr.addColorStop(0,'rgba(255,255,255,.95)');gr.addColorStop(.55,'rgba(255,255,255,.7)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.beginPath();g.arc(0,0,1,0,6.283);g.fill();g.restore()};
 for(let i=0;i<8;i++)el(210+r(-120,120),78+r(-18,14),r(55,92),r(26,44));el(210,112,170,28);CS.push(c)}})();
let tintKey='',tinted=[];
function tintSprites(color){if(color===tintKey)return;tintKey=color;tinted=CS.map(s=>{const c=document.createElement('canvas');c.width=s.width;c.height=s.height;const g=c.getContext('2d');g.drawImage(s,0,0);g.globalCompositeOperation='source-in';g.fillStyle=color;g.fillRect(0,0,c.width,c.height);return c})}
let last=0,tNow=0;
function drawWorld(t,p,s){const w=VW,h=VH;cx.setTransform(K_,0,0,K_,0,0);
 // sky
 let g=cx.createLinearGradient(0,0,0,h);g.addColorStop(0,s.top);g.addColorStop(.92,s.bot);g.addColorStop(1,s.bot);cx.fillStyle=g;cx.fillRect(0,0,w,h);
 // stars
 SA=Math.max(0,Math.min(1,(s.n-.4)/.55));SN=Math.max(0,Math.min(1,(p-.9)/.07));
 if(SA>.01){for(const st of stars){cx.globalAlpha=SA*(.55+.45*Math.sin(t/1000*st.s+st.t));cx.fillStyle='#fff';cx.beginPath();cx.arc(st.x,st.y,st.r,0,6.283);cx.fill()}cx.globalAlpha=1;
  if(!shoot&&nextShoot<=0&&SA>.6){shoot={x:Math.random()*w*.7+w*.15,y:Math.random()*h*.25,l:0};nextShoot=5+Math.random()*7}
  if(shoot){const a=shoot.x+shoot.l*.7,b=shoot.y+shoot.l*.35,c=shoot.x+(shoot.l-170)*.7,d=shoot.y+(shoot.l-170)*.35;const gr=cx.createLinearGradient(a,b,c,d);gr.addColorStop(0,'rgba(255,255,255,.95)');gr.addColorStop(1,'rgba(255,255,255,0)');cx.strokeStyle=gr;cx.lineWidth=2;cx.beginPath();cx.moveTo(a,b);cx.lineTo(c,d);cx.stroke()}}
 // aurora, only near the top of the climb
 const au=Math.max(0,Math.min(1,(p-.9)/.08))*.8;if(au>.02){cx.save();cx.globalCompositeOperation='lighter';for(let i=0;i<3;i++){const x0=w*(-.1+i*.2)+Math.sin(t/4000+i*2)*w*.06,gw=w*.7;const gr=cx.createLinearGradient(x0,0,x0+gw,0);gr.addColorStop(0,'rgba(60,255,170,0)');gr.addColorStop(.3,'rgba(60,255,170,'+.28*au+')');gr.addColorStop(.6,'rgba(80,200,255,'+.24*au+')');gr.addColorStop(.85,'rgba(170,90,255,'+.26*au+')');gr.addColorStop(1,'rgba(170,90,255,0)');
  const sk=Math.sin(t/3000+i)*w*.1,y0=h*(.02+i*.07);const vg=cx.createLinearGradient(0,y0,0,y0+h*.4);vg.addColorStop(0,'rgba(0,0,0,0)');cx.fillStyle=gr;cx.beginPath();cx.moveTo(x0,y0+h*.4);cx.lineTo(x0+sk,y0);cx.lineTo(x0+gw+sk,y0);cx.lineTo(x0+gw,y0+h*.4);cx.closePath();cx.globalAlpha=.9;cx.fill()}cx.restore()}
 // sun
 const ps=Math.min(1,p/.8),sx0=px(640),sy0=py(368),sx=sx0+(w*.1-sx0)*ps,yb=sy0+(h*.95-sy0)*ps,sy=yb-Math.pow(Math.sin(Math.PI*ps),.8)*(yb-h*.16),ss=SC*(1-.35*Math.sin(Math.PI*ps));
 const so=p>.73?Math.max(0,1-(p-.73)*11):1;
 if(so>.01){cx.save();cx.globalAlpha=so;cx.translate(sx,sy);cx.scale(ss,ss);
  g=cx.createRadialGradient(0,0,0,0,0,520);g.addColorStop(0,rgba(s.sun,.6));g.addColorStop(1,rgba(s.sun,0));cx.fillStyle=g;cx.fillRect(-520,-520,1040,1040);
  cx.fillStyle=rgba(s.sun,.3);cx.beginPath();cx.arc(0,0,215,0,6.283);cx.fill();
  cx.strokeStyle=rgba(mix(s.sun,'#B98A52',.55),.85);cx.lineWidth=24;cx.lineCap='round';const rot=t/140000*6.283;for(let i=0;i<8;i++){const a=rot+i*Math.PI/4,sn=Math.sin(a),cs=Math.cos(a);cx.beginPath();cx.moveTo(sn*253,-cs*253);cx.lineTo(sn*308,-cs*308);cx.stroke()}
  g=cx.createRadialGradient(-55,-46,0,-20,-10,150);g.addColorStop(0,'#FFF4D6');g.addColorStop(.5,s.sun);g.addColorStop(1,mix(s.sun,'#FF8A1F',.55));cx.fillStyle=g;cx.beginPath();cx.arc(0,0,145,0,6.283);cx.fill();cx.restore()}
 // moon
 const pm=Math.min(1,Math.max(0,(p-.72)/.28));
 if(pm>.01){const mx=w*(.82-pm*.68),my=h*(.5-Math.sin(Math.PI*pm)*.36);cx.save();cx.globalAlpha=Math.min(1,pm*5);cx.translate(mx,my);
  g=cx.createRadialGradient(0,0,20,0,0,120);g.addColorStop(0,'rgba(170,190,255,.4)');g.addColorStop(1,'rgba(170,190,255,0)');cx.fillStyle=g;cx.fillRect(-120,-120,240,240);
  g=cx.createRadialGradient(-15,-15,0,0,0,46);g.addColorStop(0,'#fff');g.addColorStop(.52,'#e3e8ff');g.addColorStop(1,'#a6b2e6');cx.fillStyle=g;cx.beginPath();cx.arc(0,0,44,0,6.283);cx.fill();
  cx.fillStyle='rgba(120,130,180,.3)';for(const[ax,ay,ar]of[[11,-12,6],[-14,12,7],[14,18,4]]){cx.beginPath();cx.arc(ax,ay,ar,0,6.283);cx.fill()}cx.restore()}
 // clouds
 const co=(.84-.66*s.n)*Math.min(1,.4+p*5);
 if(co>.02){tintSprites(mix(mix(s.bot,'#ffffff',.62),'#1b2457',s.cn));const L=[[.82,.9],[.6,.75],[.5,.6]];
  for(const c of clouds){const [al,sc0]=L[c.l];const wdt=420*sc0*c.s*(w/1440+.4),hgt=170*sc0*c.s*(w/1440+.4);const span=w+wdt*2;const x=((c.x*span+t/1000*(2+c.l*3)*c.sp)%span)-wdt;const y=h*c.y-p*h*[.06,.1,.16][c.l];cx.globalAlpha=co*al;cx.drawImage(tinted[c.k],x,y,wdt,hgt)}cx.globalAlpha=1}
 // birds, at the start of the climb only
 if(p<.28){cx.globalAlpha=Math.max(0,1-p/.28);cx.strokeStyle='#2a1f3a';cx.lineWidth=2;cx.lineCap='round';for(let i=0;i<5;i++){const per=(26+i*7)*1000;const x=(((t+i*per*.3)%per)/per)*(w*1.12)-w*.06,y=h*(.1+i*.06)-((t%per)/per)*h*.06,f=Math.sin(t/110+i)*3;cx.beginPath();cx.moveTo(x,y+4);cx.quadraticCurveTo(x+6,y-2-f,x+12,y+4);cx.quadraticCurveTo(x+18,y-2-f,x+24,y+4);cx.stroke()}cx.globalAlpha=1}
 // mountains: the company icon drawn wide, recoloured by the hour
 const dk=Math.max(0,(s.n-.4)/.6)*.8,fc=c=>mix(mix(c,s.sun,s.warm*.5),'#16204A',dk);
 const lay=(dy,sc)=>{cx.setTransform(K_,0,0,K_,0,0);cx.translate(w/2,h+dy);cx.scale(sc,sc);cx.translate(-w/2,-h);cx.translate(w/2-CX*SC,h-1000*SC);cx.scale(SC,SC)};
 lay(p*.04*h,1);g=cx.createLinearGradient(0,590,0,1000);g.addColorStop(0,fc('#6A7FA3'));g.addColorStop(1,fc('#3F5278'));cx.fillStyle=g;cx.fill(PA.back);
 lay(p*.09*h,1+p*.42);g=cx.createLinearGradient(0,215,0,943);g.addColorStop(0,fc('#B4C0D6'));g.addColorStop(1,fc('#8CA0BE'));cx.fillStyle=g;cx.fill(PA.shd);
 g=cx.createLinearGradient(0,215,0,943);g.addColorStop(0,fc('#F4F7FF'));g.addColorStop(1,fc('#BCCBE3'));cx.fillStyle=g;cx.fill(PA.lit);
 cx.fillStyle=fc('#FFFFFF');cx.fill(PA.cap);cx.strokeStyle='rgba(255,255,255,.28)';cx.lineWidth=3;cx.lineJoin='round';cx.stroke(PA.rim);
 const band=(path,hv,vb,dy,col)=>{const hp=hv*h;cx.setTransform(K_,0,0,K_,0,0);cx.translate(0,h+dy-hp);cx.scale(w/1440,hp/vb);cx.fillStyle=col;cx.fill(path)};
 band(PA.l3,.30,600,p*.16*h,s.m3);band(PA.l4,.21,600,p*.26*h,s.m4);band(PA.l5,.15,620,p*.40*h,mix(s.m4,'#000000',.3));
 // mist low in the valley, only while it is morning
 const fo=Math.max(0,.85-p*3);if(fo>.01){cx.setTransform(K_,0,0,K_,0,0);cx.globalAlpha=fo;for(const[fx,fw]of[[.3,.6],[.78,.5]]){cx.save();cx.translate(w*fx,h*(1+p*.3));cx.scale(1,.55);g=cx.createRadialGradient(0,0,0,0,0,w*fw);g.addColorStop(0,rgba(s.mist,.8));g.addColorStop(1,rgba(s.mist,0));cx.fillStyle=g;cx.fillRect(-w*fw,-w*fw,w*fw*2,w*fw*2);cx.restore()}cx.globalAlpha=1}
 // snow near the top
 cx.setTransform(K_,0,0,K_,0,0);
 if(SN>.01){cx.fillStyle='rgba(255,255,255,'+(.8*SN)+')';for(const f of flakes){cx.beginPath();cx.arc(f.x,f.y,f.r,0,6.283);cx.fill()}}
 // vignette
 g=cx.createRadialGradient(w/2,h*.4,Math.min(w,h)*.45,w/2,h*.4,Math.max(w,h)*.85);g.addColorStop(0,'rgba(5,5,20,0)');g.addColorStop(1,'rgba(5,5,20,.35)');cx.fillStyle=g;cx.fillRect(0,0,w,h)}
/* ───────── the loop: draws only when something moved ───────── */
let tgt=0,pp=0,dirty=true,raf=0,idle=0,theme='',lastAlt='',lastClk='',lastTmp='',slow=0,prevT=0;
const hud={alt:$('#alt'),clk:$('#clk'),tmp:$('#tmp')},prog=$('.prog'),you=$('.you'),ruler=$('.ruler');
function hudUpdate(p,s){const alt=(Math.round((1000+p*2800)/10)*10).toLocaleString('en-US')+' m';if(alt!==lastAlt){lastAlt=alt;hud.alt.textContent=alt}
 const hh=Math.floor(s.hour)%24,mm=Math.floor((s.hour%1)*60),clk=String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0');if(clk!==lastClk){lastClk=clk;hud.clk.textContent=clk}
 const tmp=Math.round(s.temp)+'°C';if(tmp!==lastTmp){lastTmp=tmp;hud.tmp.textContent=tmp}
 prog.style.transform='scaleX('+p.toFixed(4)+')';
 if(ruler&&ruler.offsetHeight){you.style.transform='translateY('+(-p*ruler.offsetHeight-5).toFixed(1)+'px)'}
 const th=s.cn<.33?'t-day':s.cn<.7?'t-dusk':'t-night';if(th!==theme){document.body.classList.remove('t-day','t-dusk','t-night');document.body.classList.add(th);theme=th}}
function frame(t){raf=0;const dt=Math.min(.05,(t-tNow)/1000||.016);tNow=t;
 if(!RM)pp+=(tgt-pp)*(1-Math.exp(-dt*6.5));else pp=tgt;const moving=Math.abs(tgt-pp)>.00006;if(!moving)pp=tgt;
 // while the picture is moving it is drawn a little smaller; it sharpens a moment after it stops
 if(moving){calmAt=0;if(mv===1&&!RM){mv=.8;setK()}}else if(mv<1){if(!calmAt)calmAt=t;if(t-calmAt>260){mv=1;setK();calmAt=0}}
 if(!RM){nextShoot-=dt;if(shoot){shoot.l+=dt*900;if(shoot.l>900)shoot=null}if(SN>.01){for(const f of flakes){f.y+=f.v*60*dt;f.d+=dt;f.x+=Math.sin(f.d)*.35;if(f.y>VH){f.y=-4;f.x=Math.random()*VW}}}}
 const s=sample(pp);drawWorld(t,pp,s);hudUpdate(pp,s);walk(pp);dirty=false;
 // adaptive resolution: if scrolling stutters, draw the world a little smaller
 if(moving&&prevT){const d=t-prevT;if(d>34){if(++slow>14&&quality>.55){quality=Math.max(.55,quality-.15);slow=0;geom()}}else if(slow>0)slow--}prevT=moving?t:0;
 if(moving||dirty||mv<1)raf=requestAnimationFrame(frame);else if(!RM&&!document.hidden){idle=setTimeout(()=>{idle=0;kick()},SA>.05||SN>.01?70:140)}}
function kick(){if(!raf){clearTimeout(idle);idle=0;raf=requestAnimationFrame(frame)}}
addEventListener('scroll',()=>{tgt=scrollY/maxS();kick()},{passive:true});
addEventListener('resize',()=>{geom();tgt=scrollY/maxS();layout();kick()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)kick()});
/* trail: the dashed path is drawn once; the part behind the hiker lights up segment by segment */
const trail=$('.trail'),svgp=$('.trail svg.path'),base=$('.trail .base'),hik=$('.hiker');let segs=[],segY=[],PX=[],PY=[],trH=1;
function layout(){if(!trail)return;const tr=trail.getBoundingClientRect(),cs=$$('.camp');const pts=[[tr.width/2,0]];
 cs.forEach((c,i)=>{const r=c.getBoundingClientRect();const pc=Math.min(1,Math.max(0,(r.top+scrollY+r.height/2-innerHeight/2)/maxS()));const sm=sample(pc),ea=c.querySelector('[data-alt]'),ec=c.querySelector('[data-clk]');if(ea){ea.textContent='▲ '+Math.round(1000+pc*2800).toLocaleString('en-US')+' m'}if(ec){const hh=Math.floor(sm.hour)%24,mm=Math.floor((sm.hour%1)*60);ec.textContent='· '+String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0')}const mobile=innerWidth<=1000;const x=mobile?Math.min(30,tr.width*.06):tr.width/2+(i%2?1:-1)*tr.width*.018;pts.push([x,r.top-tr.top+r.height/2]);const f=c.querySelector('.flag');if(f){f.style.left=x+'px';f.style.top=(r.top-tr.top+r.height/2-c.offsetTop)+'px'}});
 pts.push([tr.width/2,tr.height]);trH=tr.height;let d='M'+pts[0][0]+','+pts[0][1];const seg=[];for(let i=1;i<pts.length;i++){const [x0,y0]=pts[i-1],[x1,y1]=pts[i],my=(y0+y1)/2;const part='M'+x0+','+y0+' C'+x0+','+my+' '+x1+','+my+' '+x1+','+y1;d+=' C'+x0+','+my+' '+x1+','+my+' '+x1+','+y1;seg.push([part,y0,y1])}
 svgp.setAttribute('viewBox','0 0 '+tr.width+' '+tr.height);base.setAttribute('d',d);
 svgp.querySelectorAll('.seg').forEach(n=>n.remove());segs=seg.map(([part])=>{const n=document.createElementNS('http://www.w3.org/2000/svg','path');n.setAttribute('class','seg');n.setAttribute('d',part);svgp.appendChild(n);return n});segY=seg.map(x=>x[1]);
 // the hiker's road, sampled once: x for every y
 PX=[];PY=[];const L=base.getTotalLength(),N=Math.min(900,Math.round(L/8));for(let i=0;i<=N;i++){const q=base.getPointAtLength(L*i/N);PX.push(q.x);PY.push(q.y)}walk(pp)}
let litN=-1;
function walk(p){if(!trail||!PY.length)return;const tr=trail.getBoundingClientRect();const q=Math.max(0,Math.min(1,(innerHeight*.5-tr.top)/tr.height));const y=q*trH;
 let lo=0,hi=PY.length-1;while(lo<hi){const m=(lo+hi)>>1;if(PY[m]<y)lo=m+1;else hi=m}const i=Math.max(1,lo),a=PY[i-1],b=PY[i],u=b>a?(y-a)/(b-a):0,x=PX[i-1]+(PX[i]-PX[i-1])*Math.min(1,Math.max(0,u));
 hik.style.transform='translate3d('+x.toFixed(1)+'px,'+y.toFixed(1)+'px,0)';hik.style.opacity=q>.003&&q<.997?1:0;
 let n=0;for(let k=0;k<segY.length;k++)if(segY[k]<y)n=k+1;if(n!==litN){litN=n;segs.forEach((sg,k)=>sg.classList.toggle('lit',k<n))}}
/* camps + any phone that cycles its screens */
const camps=$$('.camp');const io=new IntersectionObserver(es=>es.forEach(e=>{const seen=e.isIntersecting||e.boundingClientRect.top<0;if(seen)e.target.classList.add('in');e.target.dataset.live=e.isIntersecting?1:0}),{threshold:.2});
camps.forEach(c=>io.observe(c));$$('[data-cycle]').forEach(c=>{io.observe(c);const im=[...c.querySelectorAll('.sc img.s')],ds=[...c.querySelectorAll('.dots button')];let i=0;if(im.length<2)return;
 const go=k=>{const n=(k+im.length)%im.length,nx=im[n];const sw=()=>{i=n;im.forEach((x,j)=>x.classList.toggle('on',j===i));ds.forEach((x,j)=>x.classList.toggle('on',j===i))};if(nx.complete&&nx.naturalWidth){sw()}else{nx.loading='eager';nx.addEventListener('load',sw,{once:true});nx.addEventListener('error',sw,{once:true})}};ds.forEach((d,k)=>d.addEventListener('click',()=>{go(k);c.dataset.hold=Date.now()}));
 if(!RM)setInterval(()=>{if(c.dataset.live==='1'&&Date.now()-(+c.dataset.hold||0)>6000)go(i+1)},3300)});
$$('.rv').forEach(x=>io.observe(x));
/* language + palette */
const lg=$('.lang');lg.querySelector('button').addEventListener('click',e=>{e.stopPropagation();lg.classList.toggle('on')});addEventListener('click',()=>lg.classList.remove('on'));
(function(){const pd=$('#pal-data');if(!pd)return;const P=JSON.parse(pd.textContent),pal=$('.pal'),inp=$('#pq'),ul=$('#pl');let sel=0,rows=[];
function build(){const s=inp.value.trim().toLowerCase();rows=P.filter(x=>!s||x.k.includes(s));if(sel>=rows.length)sel=Math.max(0,rows.length-1);ul.innerHTML=rows.map((r,i)=>'<li class="'+(i===sel?'sel':'')+'" data-i="'+i+'">'+(r.i?'<img src="'+r.i+'" alt="">':'<span style="margin:0 8px 0 0">→</span>')+'<b style="font-weight:500">'+r.n+'</b><span>'+r.t+'</span></li>').join('')||'<li><span>No match</span></li>';$$('#pl li[data-i]').forEach(li=>li.addEventListener('click',()=>go(+li.dataset.i)))}
function go(i){const r=rows[i];if(!r)return;close_();if(r.u.startsWith('#')){const el=document.querySelector(r.u);if(el)scrollTo({top:el.getBoundingClientRect().top+scrollY-60,behavior:'smooth'})}else location.href=r.u}
function open_(){pal.classList.add('on');inp.value='';sel=0;build();setTimeout(()=>inp.focus(),20)}function close_(){pal.classList.remove('on')}
$$('[data-open-pal]').forEach(b=>b.addEventListener('click',open_));pal.addEventListener('click',e=>{if(e.target===pal)close_()});inp.addEventListener('input',()=>{sel=0;build()});
addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();pal.classList.contains('on')?close_():open_();return}if(!pal.classList.contains('on'))return;if(e.key==='Escape')close_();if(e.key==='ArrowDown'){e.preventDefault();sel=Math.min(rows.length-1,sel+1);build()}if(e.key==='ArrowUp'){e.preventDefault();sel=Math.max(0,sel-1);build()}if(e.key==='Enter'){e.preventDefault();go(sel)}})})();
const tt=$('#totop');if(tt)tt.addEventListener('click',e=>{e.preventDefault();scrollTo({top:0,behavior:'smooth'})});
$$('.q button').forEach(b=>b.addEventListener('click',()=>{const q=b.parentElement,on=q.classList.contains('on');$$('.q').forEach(x=>{x.classList.remove('on');x.querySelector('button').setAttribute('aria-expanded','false')});if(!on){q.classList.add('on');b.setAttribute('aria-expanded','true')}}));
$$('.rail').forEach(r=>{let d=false,x0=0,s0=0;r.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'){d=true;x0=e.clientX;s0=r.scrollLeft}});addEventListener('pointerup',()=>d=false);r.addEventListener('pointermove',e=>{if(d){r.scrollLeft=s0-(e.clientX-x0)}})});
const co=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;co.unobserve(e.target);const n=+e.target.dataset.count,el=e.target;let v=0;if(!n||RM){el.textContent=n;return}const t=setInterval(()=>{v++;el.textContent=v;if(v>=n)clearInterval(t)},Math.max(24,900/n))}),{threshold:.6});$$('[data-count]').forEach(x=>co.observe(x));
geom();tgt=scrollY/maxS();pp=tgt;layout();addEventListener('load',()=>{layout();tgt=scrollY/maxS();kick()});if(document.fonts)document.fonts.ready.then(()=>{layout();kick()});kick();

/* ───────── Meterlume: a spot on the photograph, read from its own pixels (see meterlume_scene.py) ───────── */
(()=>{const fig=$('.ms-ph[data-ev]'),ring=fig&&fig.querySelector('.ms-ring'),dj=$('#ms-ev');if(!ring||!dj)return;
const D=JSON.parse(dj.textContent),B=atob(D.data),C=D.columns,Rw=D.rows;
const cell=(x,y)=>D.lowest+D.step*B.charCodeAt(Math.min(Rw-1,Math.max(0,y))*C+Math.min(C-1,Math.max(0,x)));
const evAt=(u,v)=>{const x=u*C-.5,y=v*Rw-.5,x0=Math.floor(x),y0=Math.floor(y),tx=x-x0,ty=y-y0;
 return lerp(lerp(cell(x0,y0),cell(x0+1,y0),tx),lerp(cell(x0,y0+1),cell(x0+1,y0+1),tx),ty)};
/* the 35 mm dial of the app, in seconds */
const DIAL=[1/8000,1/4000,1/2000,1/1000,1/500,1/250,1/125,1/60,1/30,1/15,1/8,1/4,1/2,1,2,4,8,15,30,60];
const near=t=>{let b=0;DIAL.forEach((d,i)=>{if(Math.abs(Math.log2(d/t))<Math.abs(Math.log2(DIAL[b]/t)))b=i});return b};
const fmt=t=>t>=1?Math.round(t)+' s':'1/'+Math.round(1/t);
const st={u:.62,v:.55,iso:400,f:11};
const evEl=$('.ms-ev'),tEl=$('.ms-t'),tagEv=fig.querySelector('.ms-tag em'),dial=$$('.ms-dial span');
function show(){const ev=evAt(st.u,st.v),t=st.f*st.f/(Math.pow(2,ev)*st.iso/100),i=near(t);
 ring.style.left=st.u*100+'%';ring.style.top=st.v*100+'%';
 const e1='EV '+ev.toFixed(1);evEl.textContent=e1;tagEv.textContent=e1;tEl.textContent=fmt(DIAL[i]);
 [i-1,i,i+1].forEach((k,n)=>{dial[n].textContent=DIAL[k]?fmt(DIAL[k]):'—'})}
function put(cx,cy){const r=fig.getBoundingClientRect();st.u=Math.min(.985,Math.max(.015,(cx-r.left)/r.width));st.v=Math.min(.985,Math.max(.015,(cy-r.top)/r.height));ring.classList.add('moved');show()}
let down=false;
ring.addEventListener('pointerdown',e=>{down=true;ring.classList.add('drag');ring.setPointerCapture(e.pointerId);e.preventDefault()});
ring.addEventListener('pointermove',e=>{if(down)put(e.clientX,e.clientY)});
const up=()=>{down=false;ring.classList.remove('drag')};ring.addEventListener('pointerup',up);ring.addEventListener('pointercancel',up);
fig.addEventListener('click',e=>{if(e.target===ring||ring.contains(e.target))return;put(e.clientX,e.clientY)});
ring.addEventListener('keydown',e=>{const d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(!d)return;e.preventDefault();const s=e.shiftKey?.08:.02;st.u=Math.min(.985,Math.max(.015,st.u+d[0]*s));st.v=Math.min(.985,Math.max(.015,st.v+d[1]*s));ring.classList.add('moved');show()});
$$('.ms-ch').forEach(g=>g.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;g.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b)});
 if(b.dataset.iso)st.iso=+b.dataset.iso;if(b.dataset.f)st.f=+b.dataset.f;show()}));
show()})();
