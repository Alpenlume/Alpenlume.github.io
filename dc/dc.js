
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],R=document.documentElement;
const RM=matchMedia('(prefers-reduced-motion:reduce)').matches;
const hx=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const mix=(a,b,t)=>'#'+hx(a).map((v,i)=>Math.round(v+(hx(b)[i]-v)*t).toString(16).padStart(2,'0')).join('');
const lerp=(a,b,t)=>a+(b-a)*t;
/* key moments of the day: p, top, bottom, m1..m4, mist, sun, n(stars), cn(cards), hour, temp, snow */
const K=[
[0,'#141B35','#8B5A52','#5B7092','#3D5073','#2E3F5C','#1C2740','#C9906E','#FFB74D',.3,0,5.5,3,.4],
[.13,'#5B8DE8','#FFD3A8','#8FA4D6','#6C86B8','#4C6A93','#2E4A66','#FFE6CF','#FFE3A3',0,0,7.75,8,.3],
[.3,'#2F80ED','#BDE3FF','#7FA6D8','#5B87BB','#3F6F9A','#285078','#E8F4FF','#FFF6D6',0,0,10.5,16,0],
[.46,'#1A74F0','#A5D8FF','#7BA3D6','#4F83BD','#2F6396','#1E4C77','#DDEEFF','#FFFFFF',0,0,13,22,0],
[.62,'#4D7BD8','#FFCB85','#A798C9','#7D78AD','#55608F','#34486D','#FFE0B0','#FFD08A',0,0,16.75,15,.4],
[.76,'#3A2A74','#FF7A4A','#B2527E','#7C3A78','#502C62','#2C2048','#FFA37A','#FF6A3D',.55,.35,19.1,7,.8],
[.88,'#1A1650','#7A3F8E','#4A3A80','#35296A','#251D52','#171340','#6B4A9A','#C0508A',.92,.9,21,0,.35],
[1,'#04061A','#14204F','#24305F','#1A2350','#121A40','#0B1030','#2A3A7A','#9AB0FF',1,1,24.5,-8,0]];
function sample(p){let i=0;while(i<K.length-2&&p>K[i+1][0])i++;const a=K[i],b=K[i+1],t=Math.min(1,Math.max(0,(p-a[0])/(b[0]-a[0])));const s=t*t*(3-2*t);
 const c=k=>mix(a[k],b[k],s),n=k=>lerp(a[k],b[k],s);return{top:c(1),bot:c(2),m1:c(3),m2:c(4),m3:c(5),m4:c(6),mist:c(7),sun:c(8),n:n(9),cn:n(10),hour:n(11),temp:n(12),warm:n(13)}}
const sunw=$('.sunw'),moonw=$('.moonw'),mb=$('.mt.mb'),mp=$('.mt.mp'),mts=$$('.mt.l3,.mt.l4,.mt.l5'),fog=$('.fog'),aur=$('.aur'),birds=$('.birds'),clouds=$$('.clouds svg'),svgs=$$('.mt.mb svg,.mt.mp svg');
const wide=()=>innerWidth>1000;const CXD=+(document.body.dataset.cx||150);let VB=[CXD-1400,150,2800,850],MH=.78,SC=1,CX=CXD;
function geom(){const W=innerWidth,H=innerHeight;MH=wide()?.78:.5;VB=wide()?[CXD-1400,150,2800,850]:[100,150,800,850];CX=VB[0]+VB[2]/2;SC=Math.max(W/VB[2],MH*H/VB[3]);R.style.setProperty('--mh',MH);svgs.forEach(s=>s.setAttribute('viewBox',VB.join(' ')))}
const px=vx=>innerWidth/2+(vx-CX)*SC,py=vy=>innerHeight-(1000-vy)*SC;
let tgt=0,pp=0;const maxS=()=>Math.max(1,R.scrollHeight-innerHeight);
addEventListener('scroll',()=>{tgt=scrollY/maxS()},{passive:true});addEventListener('resize',()=>{geom();tgt=scrollY/maxS();layout()});
function apply(p){const s=sample(p);const st=R.style;
 st.setProperty('--top',s.top);st.setProperty('--bot',s.bot);['m1','m2','m3','m4'].forEach(k=>st.setProperty('--'+k,s[k]));st.setProperty('--mist',s.mist);st.setProperty('--sun',s.sun);st.setProperty('--sun2',mix(s.sun,'#FF8A1F',.55));st.setProperty('--ray',mix(s.sun,'#B98A52',.55));st.setProperty('--n',s.n);st.setProperty('--cn',s.cn);st.setProperty('--pp',p);
 st.setProperty('--cloud',mix(mix(s.bot,'#ffffff',.62),'#1b2457',s.cn));
 const dk=Math.max(0,(s.n-.4)/.6)*.8,fc=c=>mix(mix(c,s.sun,s.warm*.5),'#16204A',dk);
 st.setProperty('--lit1',fc('#F4F7FF'));st.setProperty('--lit2',fc('#BCCBE3'));st.setProperty('--shd1',fc('#B4C0D6'));st.setProperty('--shd2',fc('#8CA0BE'));st.setProperty('--bk1',fc('#6A7FA3'));st.setProperty('--bk2',fc('#3F5278'));st.setProperty('--snow',fc('#FFFFFF'));
 const W=innerWidth,H=innerHeight,ps=Math.min(1,p/.8),sx0=px(640),sy0=py(368);
 const sx=sx0+(W*.1-sx0)*ps,yb=sy0+(H*.95-sy0)*ps,sy=yb-Math.pow(Math.sin(Math.PI*ps),.8)*(yb-H*.16),ss=SC*(1-.35*Math.sin(Math.PI*ps));
 sunw.style.transform='translate('+sx+'px,'+sy+'px) scale('+ss+')';sunw.style.opacity=p>.73?Math.max(0,1-(p-.73)*11):1;st.setProperty('--co',(.84-.66*s.n)*Math.min(1,.4+p*5));
 const pm=Math.min(1,Math.max(0,(p-.72)/.28));moonw.style.transform='translate('+(W*(.82-pm*.68))+'px,'+(H*(.5-Math.sin(Math.PI*pm)*.36))+'px)';moonw.style.opacity=Math.min(1,pm*5);
 mb.style.transform='translateY('+(p*4)+'vh)';mp.style.transform='translateY('+(p*9)+'vh) scale('+(1+p*.42)+')';
 mts.forEach((m,k)=>m.style.transform='translateY('+(p*[16,26,40][k])+'vh)');
 fog.style.opacity=Math.max(.0,.85-p*3);fog.style.transform='translateY('+(p*30)+'vh)';
 aur.style.opacity=Math.max(0,Math.min(1,(p-.9)/.08))*.85;birds.style.opacity=Math.max(0,1-p/.28);
 clouds.forEach((c,k)=>c.style.marginTop=(-p*[6,10,16][k])+'vh');
 const alt=Math.round(1000+p*2800),h=Math.floor(s.hour)%24,m=Math.floor((s.hour%1)*60);
 $('#alt').textContent=alt.toLocaleString('en-US')+' m';$('#clk').textContent=String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');$('#tmp').textContent=Math.round(s.temp)+'°C';
 const y=(1-p)*100;$('.you').style.top=y+'%';
 SA=Math.max(0,Math.min(1,(s.n-.4)/.55));SN=Math.max(0,Math.min(1,(p-.9)/.07))}
/* sky canvas: stars, a shooting star, snow */
let SA=0,SN=0;const cv=$('#sky'),cx=cv.getContext('2d');let stars=[],flakes=[],shoot=null,nextShoot=3;
function sizeCv(){const d=Math.min(devicePixelRatio,1.5);cv.width=innerWidth*d;cv.height=innerHeight*d;cx.setTransform(d,0,0,d,0,0);
 stars=Array.from({length:Math.round(innerWidth*innerHeight/5200)},()=>({x:Math.random()*innerWidth,y:Math.random()*innerHeight*.7,r:Math.random()*1.3+.3,t:Math.random()*6.28,s:Math.random()*1.4+.4}));
 flakes=Array.from({length:90},()=>({x:Math.random()*innerWidth,y:Math.random()*innerHeight,r:Math.random()*2+.8,v:Math.random()*.8+.3,d:Math.random()*6}))}
let last=0;function draw(t){const dt=Math.min(.05,(t-last)/1000||.016);last=t;cx.clearRect(0,0,innerWidth,innerHeight);
 if(SA>.01){stars.forEach(s=>{const a=SA*(.55+.45*Math.sin(t/1000*s.s+s.t));cx.fillStyle='rgba(255,255,255,'+a+')';cx.beginPath();cx.arc(s.x,s.y,s.r,0,6.283);cx.fill()});
  nextShoot-=dt;if(!shoot&&nextShoot<=0&&SA>.6){shoot={x:Math.random()*innerWidth*.7+innerWidth*.15,y:Math.random()*innerHeight*.25,l:0};nextShoot=5+Math.random()*7}
  if(shoot){shoot.l+=dt*900;const g=cx.createLinearGradient(shoot.x+shoot.l*.7,shoot.y+shoot.l*.35,shoot.x+(shoot.l-170)*.7,shoot.y+(shoot.l-170)*.35);g.addColorStop(0,'rgba(255,255,255,.95)');g.addColorStop(1,'rgba(255,255,255,0)');cx.strokeStyle=g;cx.lineWidth=2;cx.beginPath();cx.moveTo(shoot.x+shoot.l*.7,shoot.y+shoot.l*.35);cx.lineTo(shoot.x+(shoot.l-170)*.7,shoot.y+(shoot.l-170)*.35);cx.stroke();if(shoot.l>900)shoot=null}}
 if(SN>.01){cx.fillStyle='rgba(255,255,255,'+(.8*SN)+')';flakes.forEach(f=>{f.y+=f.v*60*dt;f.d+=dt;f.x+=Math.sin(f.d)*.35;if(f.y>innerHeight){f.y=-4;f.x=Math.random()*innerWidth}cx.beginPath();cx.arc(f.x,f.y,f.r,0,6.283);cx.fill()})}}
function frame(t){pp+=(tgt-pp)*(RM?1:.085);if(Math.abs(tgt-pp)<.00005)pp=tgt;apply(pp);walk();if(!RM)draw(t);requestAnimationFrame(frame)}
/* trail */
const trail=$('.trail'),svgp=$('.trail svg.path'),base=$('.trail .base'),walkP=$('.trail .walk'),hik=$('.hiker');let L=1;
function layout(){if(!trail)return;const tr=trail.getBoundingClientRect(),camps=$$('.camp');const pts=[[tr.width/2,0]];
 camps.forEach((c,i)=>{const r=c.getBoundingClientRect();const pc=Math.min(1,Math.max(0,(r.top+scrollY+r.height/2-innerHeight/2)/maxS()));const sm=sample(pc),ea=c.querySelector('[data-alt]'),ec=c.querySelector('[data-clk]');if(ea){ea.textContent='▲ '+Math.round(1000+pc*2800).toLocaleString('en-US')+' m'}if(ec){const hh=Math.floor(sm.hour)%24,mm=Math.floor((sm.hour%1)*60);ec.textContent='· '+String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0')}const mobile=innerWidth<=1000;const x=mobile?Math.min(30,tr.width*.06):tr.width/2+(i%2?1:-1)*tr.width*.018;pts.push([x,r.top-tr.top+r.height/2]);const f=c.querySelector('.flag');if(f){f.style.left=x+'px';f.style.top=(r.top-tr.top+r.height/2-c.offsetTop)+'px'}});
 pts.push([tr.width/2,tr.height]);let d='M'+pts[0][0]+','+pts[0][1];for(let i=1;i<pts.length;i++){const [x0,y0]=pts[i-1],[x1,y1]=pts[i],my=(y0+y1)/2;d+=' C'+x0+','+my+' '+x1+','+my+' '+x1+','+y1}
 svgp.setAttribute('viewBox','0 0 '+tr.width+' '+tr.height);base.setAttribute('d',d);walkP.setAttribute('d',d);L=walkP.getTotalLength();walkP.style.strokeDasharray=L;walk()}
function walk(){if(!trail)return;const tr=trail.getBoundingClientRect();const q=Math.max(0,Math.min(1,(innerHeight*.5-tr.top)/tr.height));walkP.style.strokeDashoffset=L*(1-q);const pt=walkP.getPointAtLength(q*L);hik.style.transform='translate('+pt.x+'px,'+pt.y+'px)';hik.style.opacity=q>.003&&q<.997?1:0}
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
geom();sizeCv();addEventListener('resize',sizeCv);tgt=scrollY/maxS();pp=tgt;layout();addEventListener('load',()=>{layout();tgt=scrollY/maxS()});if(document.fonts)document.fonts.ready.then(layout);requestAnimationFrame(frame);
