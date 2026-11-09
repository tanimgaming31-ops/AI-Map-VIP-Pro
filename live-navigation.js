/* AI MAP VIP PRO — active navigation controller.
 * Real GPS fixes, OSRM route alternatives, maneuver directions, local TTS.
 * No live traffic, traffic lights, cameras, police reports or speed limits.
 * Foreground only; never a substitute for checking actual road signs.
 */
(function () {
'use strict';
const RAD=Math.PI/180, EARTH=6371000;
function valid(p){return p&&Number.isFinite(+p.lat)&&Number.isFinite(+p.lon)&&Math.abs(+p.lat)<=90&&Math.abs(+p.lon)<=180}
function haversine(a,b){
  const dlat=(+b.lat- +a.lat)*RAD,dlon=(+b.lon- +a.lon)*RAD;
  const h=Math.sin(dlat/2)**2+Math.cos(+a.lat*RAD)*Math.cos(+b.lat*RAD)*Math.sin(dlon/2)**2;
  return 2*EARTH*Math.asin(Math.min(1,Math.sqrt(h)));
}
function projectOnLine(line,point){
  const coords=line?.coordinates||[];
  let best={lateral:Infinity,along:0},travel=0,total=0;
  if(coords.length<2)return best;
  const cos=Math.cos(point.lat*RAD);
  for(let i=1;i<coords.length;i++){
    const a={lat:coords[i-1][1],lon:coords[i-1][0]}, b={lat:coords[i][1],lon:coords[i][0]};
    const x1=(a.lon-point.lon)*RAD*EARTH*cos,y1=(a.lat-point.lat)*RAD*EARTH;
    const x2=(b.lon-point.lon)*RAD*EARTH*cos,y2=(b.lat-point.lat)*RAD*EARTH;
    const dx=x2-x1,dy=y2-y1,len2=dx*dx+dy*dy;
    const ratio=len2?Math.max(0,Math.min(1,-(x1*dx+y1*dy)/len2)):0;
    const distance=Math.hypot(x1+dx*ratio,y1+dy*ratio);
    const length=haversine(a,b);
    if(distance<best.lateral){best={lateral:distance,along:travel+length*ratio,index:i-1,ratio};}
    travel+=length;
  }
  best.total=travel;return best;
}
function formatDist(m,language){
  if(!Number.isFinite(m))return '—';
  if(m<950)return Math.max(0,Math.round(m/10)*10)+' m';
  return (m/1000).toFixed(m>=10000?0:1)+' km';
}
function formatDuration(seconds){
  if(!Number.isFinite(seconds))return '—';
  const min=Math.max(1,Math.round(seconds/60));
  return min>=60?Math.floor(min/60)+' h '+(min%60)+' min':min+' min';
}
function safeText(text){return String(text||'').replace(/[&<>"']/g,letter=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[letter]));}
const arrows={'left':'↰','slight left':'↖','sharp left':'⬅','right':'↱','slight right':'↗','sharp right':'➡','uturn':'⤺','straight':'↑'};
function nextInstruction(step,language='en'){
  if(!step)return language==='bn'?'সোজা চলুন':'Continue on your route';
  const m=step.maneuver||{},type=m.type||'turn',direction=m.modifier||'straight',road=String(step.name||'');
  if(type==='arrive')return language==='bn'?'গন্তব্যে পৌঁছে গেছেন':'You have arrived at your destination';
  if(type==='depart')return language==='bn'?'যাত্রা শুরু করুন':'Start driving';
  const bn={'left':'বামে ঘুরুন','right':'ডানে ঘুরুন','slight left':'সামান্য বামে যান','slight right':'সামান্য ডানে যান','straight':'সোজা চলুন','uturn':'ইউ-টার্ন নিন','sharp left':'তীব্র বামে ঘুরুন','sharp right':'তীব্র ডানে ঘুরুন'};
  const en={'left':'Turn left','right':'Turn right','slight left':'Keep left','slight right':'Keep right','straight':'Continue straight','uturn':'Make a U-turn','sharp left':'Make a sharp left','sharp right':'Make a sharp right'};
  if(type==='roundabout'||type==='rotary')return language==='bn'?'রাউন্ডঅ্যাবাউটে প্রবেশ করুন':'Enter the roundabout';
  if(type==='merge')return language==='bn'?'মূল রাস্তায় যুক্ত হন':'Merge onto the road';
  if(type==='on ramp'||type==='off ramp')return (language==='bn'?'র‍্যাম্প দিয়ে যান':'Take the ramp')+(road?' • '+road:'');
  const phrase=(language==='bn'?bn:en)[direction]||((language==='bn'?bn:en).straight);
  return phrase+(road?' · '+road:'');
}
function utterance(step,distance,lang){
  const action=nextInstruction(step,lang).replace(' · ',lang==='bn'?' , ':' onto ');
  const number=Math.round(distance/10)*10;
  if(distance>35)return lang==='bn'?number+' মিটার পরে '+action:'In '+number+' meters, '+action;
  return action;
}
function nowClock(seconds){
  return new Date(Date.now()+Math.max(0,seconds||0)*1000).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
}
function readSharedPlace(input){
  const raw=String(input||'').trim().slice(0,3000);
  if(!raw)return null;
  function coord(lat,lon){
    const p={lat:Number(lat),lon:Number(lon)};
    return valid(p)?p:null;
  }
  let match=raw.match(/(?:geo:|[?&](?:q|query|ll|destination)=|@)(-?\d{1,2}\.\d+|-?\d{1,2}),\s*(-?\d{1,3}\.\d+|-?\d{1,3})/i)
    ||raw.match(/(?:geo:|[?&](?:q|query|ll|destination)=|@)(-?\d{1,2}),\s*(-?\d{1,3})/i);
  if(match){const point=coord(match[1],match[2]);if(point)return {kind:'coordinates',point};}
  match=raw.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if(match){const point=coord(match[1],match[2]);if(point)return {kind:'coordinates',point};}
  if(/^[-+]?\d+(?:\.\d+)?\s*,\s*[-+]?\d+(?:\.\d+)?$/.test(raw)){
    const [lat,lon]=raw.split(','); const point=coord(lat,lon);
    if(point)return {kind:'coordinates',point};
  }
  const link=raw.match(/https?:\/\/[^\s]+/);
  if(link){
    try{
      const url=new URL(link[0]);
      if(/(^|\.)maps\.app\.goo\.gl$/.test(url.hostname)||/^(goo\.gl)$/.test(url.hostname))
        return {kind:'shortlink'};
      const query=url.searchParams.get('q')||url.searchParams.get('query')||
        url.searchParams.get('destination')||url.searchParams.get('daddr')||url.searchParams.get('ll');
      if(query){
        const co=query.match(/^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/);
        if(co){const p=coord(co[1],co[2]);if(p)return {kind:'coordinates',point:p};}
        return {kind:'query',query:query.slice(0,200)};
      }
    }catch(e){}
  }
  return {kind:'query',query:raw.replace(/https?:\/\/\S+/g,'').trim().slice(0,200)};
}
window.VipNavigationMath={haversine,projectOnLine,nextInstruction,readSharedPlace,formatDist,formatDuration};
window.installVipLiveNavigation=function({state,$,t,toast,setTab,setMode,locate,renderRouteResult}){
  const GL=window.maplibregl;
  const ui=$('vip-route-ui'),banner=$('vip-nav-banner'),top=$('vip-route-top');
  const list=$('vip-route-options'),summary=$('vip-route-summary');
  const bannerArrow=$('vip-maneuver-arrow'),bannerDistance=$('vip-maneuver-distance');
  const bannerStreet=$('vip-maneuver-street'),gpsInfo=$('vip-gps-note');
  const bottomTime=$('vip-bottom-time'),bottomDistance=$('vip-bottom-distance'),bottomArrival=$('vip-bottom-arrival');
  const goBtn=$('vip-go-now'),muteBtn=$('vip-voice-toggle');
  const reCenter=$('vip-recenter'),stopBtn=$('vip-stop-nav'),backBtn=$('vip-route-back');
  let routes=[],selected=0,destination=null,startPoint=null;
  let watchId=null,active=false,lastPos=null,lastReroute=0,badFixes=0;
  let spoken=new Set(),stepIndex=-1,cameraFollowing=true,startedAt=0,routeLoad=0;
  let muted=false;try{muted=localStorage.getItem('vip_nav_muted')==='1';}catch(e){}
  let mapListenersAttached=false,rerouting=false;
  const lang=()=>state.lang==='bn'?'bn':'en';
  const tr=(en,bn)=>lang()==='bn'?bn:en;
  const storageKey='vip-last-destination';
  function speak(message){
    if(muted||!message)return;
    const payload=JSON.stringify({type:'speak',text:message.slice(0,300),language:lang()==='bn'?'bn-BD':'en-US'});
    if(window.vipAndroid?.postMessage){
      try{window.vipAndroid.postMessage(payload);return;}catch(e){console.info('Native voice unavailable',e);}
    }
    if('speechSynthesis' in window){
      try{
        speechSynthesis.cancel();
        const speech=new SpeechSynthesisUtterance(message);
        speech.lang=lang()==='bn'?'bn-BD':'en-US';speech.rate=.96;speech.volume=1;
        speechSynthesis.speak(speech);
      }catch(e){console.info('Browser voice unavailable',e);}
    }
  }
  function stopSpeech(){
    if(window.vipAndroid?.postMessage)try{window.vipAndroid.postMessage(JSON.stringify({type:'stopSpeech'}));}catch(e){}
    if('speechSynthesis' in window)try{speechSynthesis.cancel();}catch(e){}
  }
  function keepAwake(enabled){
    if(window.vipAndroid?.postMessage)try{window.vipAndroid.postMessage(JSON.stringify({type:'screen',keepOn:enabled}));}catch(e){}
  }
  function modeUi(mode){
    document.body.classList.toggle('vip-nav-preview',mode==='preview');
    document.body.classList.toggle('vip-nav-active',mode==='running');
    ui.hidden=mode==='none';
    top.hidden=mode==='none';
    banner.hidden=mode!=='running';
    ui.classList.toggle('running',mode==='running');
    $('vip-route-choices').hidden=mode==='running';
    $('vip-active-controls').hidden=mode!=='running';
    goBtn.hidden=mode==='running';
    if(mode==='none')stopSpeech();
    setTimeout(()=>state.map?.resize(),160);
  }
  function lineLayerId(i){return 'vip-line-'+i;}
  function removeRouteLayers(){
    if(!state.map)return;
    for(let i=0;i<5;i++){
      for(const suffix of ['glow','main']){
        const id=lineLayerId(i)+'-'+suffix;
        try{if(state.map.getLayer(id))state.map.removeLayer(id);}catch(e){}
      }
      try{if(state.map.getSource(lineLayerId(i)))state.map.removeSource(lineLayerId(i));}catch(e){}
    }
  }
  function drawRoutes(){
    if(!state.map || !state.map.isStyleLoaded() || !routes.length)return;
    removeRouteLayers();
    const indices=routes.map((route,i)=>i).filter(i=>i!==selected).concat(selected);
    indices.forEach(i=>{
      const route=routes[i];
      if(!route?.geometry?.coordinates?.length)return;
      const id=lineLayerId(i),chosen=i===selected;
      state.map.addSource(id,{type:'geojson',data:{type:'Feature',properties:{},geometry:route.geometry}});
      state.map.addLayer({id:id+'-glow',type:'line',source:id,layout:{'line-join':'round','line-cap':'round'},
        paint:{'line-color':chosen?'#28d4ff':'#b8c5d5','line-opacity':chosen?.42:.14,'line-width':chosen?18:10,'line-blur':5}});
      state.map.addLayer({id:id+'-main',type:'line',source:id,layout:{'line-join':'round','line-cap':'round'},
        paint:{'line-color':chosen?'#28cafa':'#9aa9bb','line-opacity':chosen ? .98 : .5,'line-width':chosen?7:5}});
    });
  }
  function attachMap(){
    if(mapListenersAttached||!state.map)return;
    mapListenersAttached=true;
    state.map.on('style.load',()=>{if(routes.length)try{drawRoutes();}catch(e){console.info('Route redraw deferred',e);}});
    state.map.on('dragstart',()=>{if(active)cameraFollowing=false;});
    state.map.on('rotatestart',()=>{if(active)cameraFollowing=false;});
  }
  function routeBounds(route){
    if(!GL||!route?.geometry?.coordinates?.length||!state.map)return;
    const bounds=new GL.LngLatBounds();
    route.geometry.coordinates.forEach(c=>bounds.extend(c));
    state.map.fitBounds(bounds,{padding:{top:170,bottom:Math.min(innerHeight*.48,390),left:45,right:45},
      maxZoom:15.8,pitch:0,bearing:0,duration:700});
  }
  function previewCards(){
    list.innerHTML=routes.map((r,i)=>{
      const diff=(r.duration-routes[0].duration)/60;
      const label=i===0?tr('Recommended','প্রস্তাবিত'):tr('Alternative','বিকল্প')+' '+i;
      return '<button type="button" class="vip-route-choice '+(selected===i?'selected':'')+'" data-option="'+i+'">'
        +'<span class="vip-choice-dot"></span><span class="vip-choice-text"><strong>'
        +safeText(formatDuration(r.duration))+'</strong><small>'+safeText(label)
        +(diff>0?' · +'+Math.round(diff)+' min':'')+'</small></span><span class="vip-choice-distance">'
        +safeText(formatDist(r.distance))+'</span></button>';
    }).join('');
    list.querySelectorAll('[data-option]').forEach(button=>button.onclick=()=>{
      selected=Number(button.dataset.option);
      previewCards();
      drawRoutes();
      routeBounds(routes[selected]);
    });
    const route=routes[selected];
    summary.textContent=tr('Estimated time • No real-time traffic data',
      'আনুমানিক সময় • লাইভ ট্রাফিক তথ্য নেই');
    $('vip-preview-eta').textContent=nowClock(route.duration);
    $('vip-preview-distance').textContent=formatDist(route.distance);
  }
  function endpointFor(a,b,mode,alternatives){
    const svc={car:'routed-car',foot:'routed-foot',bike:'routed-bike'}[mode]||'routed-car';
    return 'https://routing.openstreetmap.de/'+svc+'/route/v1/driving/'
      +a.lon+','+a.lat+';'+b.lon+','+b.lat
      +'?overview=full&geometries=geojson&steps=true&alternatives='+(alternatives?'true':'false');
  }
  async function loadRoutes(from,to,mode){
    let error;
    for(const alt of [true,false]){
      if(!alt)await new Promise(resolve=>setTimeout(resolve,1200));
      try{
        const controller=new AbortController();
        const timer=setTimeout(()=>controller.abort(),18000);
        let response;
        try{response=await fetch(endpointFor(from,to,mode,alt),{signal:controller.signal,headers:{Accept:'application/json'}});}
        finally{clearTimeout(timer);}
        if(!response.ok)throw new Error('Routing HTTP '+response.status);
        const data=await response.json();
        const found=(data.routes||[]).filter(route=>route.geometry?.coordinates?.length&&Number.isFinite(route.duration));
        if(found.length)return found.sort((a,b)=>a.duration-b.duration).slice(0,3);
        throw new Error('No usable route');
      }catch(e){error=e;}
    }
    throw error||new Error('Routing service unavailable');
  }
  async function planRoute(place,mode=state.mode,options={}){
    if(!valid(place)){toast(tr('Choose a valid destination','সঠিক গন্তব্য নির্বাচন করুন'));return;}
    setMode(mode);
    const origin=options.from||(state.me?{lat:state.me[0],lon:state.me[1]}:null);
    let from=origin;
    if(!from){
      const gps=await locate(true);
      if(gps)from={lat:gps[0],lon:gps[1]};
    }
    if(!from){
      if(!state.map){toast(tr('Map is unavailable','ম্যাপ চালু হয়নি'));return;}
      const c=state.map.getCenter();from={lat:c.lat,lon:c.lng};
      toast(tr('Preview starts at map center; Go Now requires GPS','ম্যাপের কেন্দ্র থেকে রুট দেখা হচ্ছে; চালাতে GPS লাগবে'));
    }
    const seq=++routeLoad;
    if(!options.rerouting)toast(tr('Finding routes…','রাস্তা খোঁজা হচ্ছে…'));
    $('routeBtn').disabled=true;
    try{
      const found=await loadRoutes(from,place,state.mode);
      if(seq!==routeLoad)return;
      routes=found;selected=0;destination={lat:+place.lat,lon:+place.lon,name:String(place.name||'Destination')};startPoint=from;
      state.lastRoute={route:found[0],name:destination.name,origin:state.me?t('youAreHere'):t('centerStart')};
      attachMap();
      if(!options.rerouting){
        active=false;
        stopWatching();
        $('vip-route-name').textContent=destination.name;
        modeUi('preview');
        routeBounds(routes[selected]);
        previewCards();
        setTab('route'); // Keep legacy route result ready while custom preview is visible.
        renderRouteResult(state.lastRoute);
        try{localStorage.setItem(storageKey,JSON.stringify(destination));}catch(e){}
      }else{
        routeBounds(routes[selected]);
        drawRoutes();
        spoken.clear();stepIndex=-1;badFixes=0;
        toast(tr('New route ready','নতুন রুট তৈরি হয়েছে'));
        speak(tr('Route recalculated','নতুন রাস্তা দেখানো হচ্ছে'));
      }
      drawRoutes();
      return routes;
    }catch(err){
      console.warn('Route planning failed',err);
      toast(tr('Routing unavailable. Check connection and try again.','রুট পাওয়া যায়নি। ইন্টারনেট দেখে আবার চেষ্টা করুন।'));
      if(!options.rerouting)$('routeResult').textContent=tr('Unable to load directions.','রাস্তা দেখানো যাচ্ছে না।');
      return null;
    }finally{$('routeBtn').disabled=false;}
  }
  function activeStep(progress){
    const route=routes[selected],all=route?.legs?.flatMap(leg=>leg.steps||[])||[];
    if(!all.length)return {step:null,idx:-1,distance:0};
    const point={lat:0,lon:0};
    const maneuvers=all.map((step,i)=>{
      const xy=step.maneuver?.location;
      if(!xy)return null;
      point.lat=xy[1];point.lon=xy[0];
      return {step,i,along:projectOnLine(route.geometry,point).along};
    }).filter(Boolean);
    let next=maneuvers.find(item=>item.step.maneuver?.type!=='depart'&&item.along>=progress.along-18);
    if(!next)next=maneuvers[maneuvers.length-1];
    if(!next)return {step:null,idx:-1,distance:0};
    return {step:next.step,idx:next.i,distance:Math.max(0,next.along-progress.along)};
  }
  function setBanner(step,distance){
    const m=step?.maneuver||{},modifier=m.modifier||'straight';
    bannerArrow.textContent=m.type==='arrive'?'⚑':arrows[modifier]||'↑';
    bannerDistance.textContent=formatDist(distance);
    bannerStreet.textContent=nextInstruction(step,lang());
  }
  function updateNavigation(position){
    if(!active||!routes.length||!destination||!valid(position))return;
    lastPos={lat:position.lat,lon:position.lon,accuracy:position.accuracy||50,
      heading:Number.isFinite(position.heading)?position.heading:null, speed:position.speed||0};
    state.me=[lastPos.lat,lastPos.lon];
    if(state.meMarker){state.meMarker.setLngLat([lastPos.lon,lastPos.lat]);}
    else if(GL && state.map){
      const el=document.createElement('div');el.className='vip-user-location';
      state.meMarker=new GL.Marker({element:el,anchor:'center'}).setLngLat([lastPos.lon,lastPos.lat]).addTo(state.map);
    }
    const route=routes[selected],progress=projectOnLine(route.geometry,lastPos);
    const remaining=Math.max(0,route.distance*(1-progress.along/Math.max(progress.total,1)));
    const secs=route.duration*remaining/Math.max(route.distance,1);
    bottomDistance.textContent=formatDist(remaining);
    bottomTime.textContent=formatDuration(secs);
    bottomArrival.textContent=nowClock(secs);
    gpsInfo.textContent=position.accuracy>100?tr('Weak GPS accuracy','GPS নির্ভুল নয়'):tr('GPS active · Traffic not included','GPS চালু · ট্রাফিক নেই');
    const maneuver=activeStep(progress);
    setBanner(maneuver.step,maneuver.distance);
    if(maneuver.idx>=0){
      if(stepIndex!==maneuver.idx){stepIndex=maneuver.idx;spoken.clear();}
      const meter=maneuver.distance;
      const stage=meter<=30?2:meter<=90?1:meter<=350?0:-1;
      if(stage>=0&&!spoken.has(stage)){
        speak(utterance(maneuver.step,meter,lang()));
        spoken.add(stage);
      }
    }
    if(cameraFollowing&&state.map){
      state.map.easeTo({center:[lastPos.lon,lastPos.lat],zoom:Math.max(state.map.getZoom(),16.2),
        pitch:state.is3d?58:0,
        bearing:Number.isFinite(lastPos.heading)&&lastPos.speed>.6?lastPos.heading:state.map.getBearing(),
        duration:850,essential:true});
    }
    if(haversine(lastPos,destination)<Math.max(24,Math.min(55,lastPos.accuracy*1.2))&&lastPos.accuracy<70){
      stopNavigation(false);
      speak(tr('You have arrived at your destination.','আপনি গন্তব্যে পৌঁছে গেছেন।'));
      toast(tr('Destination reached!','গন্তব্যে পৌঁছে গেছেন!'));
      return;
    }
    if(progress.lateral>Math.max(65,lastPos.accuracy*1.7)&&lastPos.accuracy<65){
      badFixes++;
      if(badFixes>=3 && !rerouting && Date.now()-lastReroute>45000){
        lastReroute=Date.now();rerouting=true;
        planRoute(destination,state.mode,{rerouting:true,from:{lat:lastPos.lat,lon:lastPos.lon}})
          .finally(()=>{rerouting=false;});
      }
    }else badFixes=0;
  }
  function stopWatching(){
    if(watchId!==null&&navigator.geolocation)try{navigator.geolocation.clearWatch(watchId);}catch(e){}
    watchId=null;
  }
  function onGps(position){
    if(!position?.coords)return;
    updateNavigation({lat:position.coords.latitude,lon:position.coords.longitude,
      accuracy:position.coords.accuracy,heading:position.coords.heading,speed:position.coords.speed});
  }
  function failGps(err){
    gpsInfo.textContent=tr('GPS lost · check location permission','GPS পাওয়া যাচ্ছে না · অনুমতি দেখুন');
    if(err?.code===1){
      toast(tr('Location permission denied. Navigation stopped.','লোকেশন অনুমতি নেই। নেভিগেশন বন্ধ।'));
      stopNavigation(false);
    }
  }
  async function startNavigation(){
    if(!routes.length||!destination)return;
    if(!navigator.geolocation){
      toast(tr('GPS is unavailable on this device','এই ফোনে GPS পাওয়া যাচ্ছে না'));return;
    }
    goBtn.disabled=true;
    let position;
    try{
      position=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,
        {enableHighAccuracy:true,timeout:16000,maximumAge:3500}));
    }catch(err){
      goBtn.disabled=false;
      toast(tr('Allow location permission and enable GPS to start','GPS চালু করে লোকেশন অনুমতি দিন'));
      return;
    }
    goBtn.disabled=false;
    if(!valid({lat:position.coords.latitude,lon:position.coords.longitude}))return;
    const origin={lat:position.coords.latitude,lon:position.coords.longitude};
    if(startPoint&&haversine(origin,startPoint)>180){
      startPoint=origin;
      const fresh=await planRoute(destination,state.mode,{from:origin});
      if(!fresh)return;
    }
    active=true;cameraFollowing=true;badFixes=0;spoken.clear();stepIndex=-1;startedAt=Date.now();
    modeUi('running');
    keepAwake(true);
    stopWatching();
    watchId=navigator.geolocation.watchPosition(onGps,failGps,
      {enableHighAccuracy:true,maximumAge:2000,timeout:16000});
    setBanner(routes[selected].legs?.[0]?.steps?.[1],0);
    onGps(position);
    speak(tr('Navigation started. Follow the highlighted route.','নেভিগেশন শুরু হয়েছে। দেখানো রাস্তা অনুসরণ করুন।'));
  }
  function stopNavigation(backToPreview=true){
    const wasActive=active;active=false;stopWatching();keepAwake(false);badFixes=0;
    if(backToPreview && routes.length){
      modeUi('preview');previewCards();routeBounds(routes[selected]);drawRoutes();
    }else{
      modeUi('none');removeRouteLayers();routes=[];destination=null;
    }
    if(wasActive)toast(tr('Navigation stopped','নেভিগেশন বন্ধ হয়েছে'));
  }
  goBtn?.addEventListener('click',startNavigation);
  stopBtn?.addEventListener('click',()=>stopNavigation(true));
  backBtn?.addEventListener('click',()=>stopNavigation(false));
  muteBtn?.addEventListener('click',()=>{
    muted=!muted;
    muteBtn.textContent=muted?'🔇':'🔊';
    muteBtn.setAttribute('aria-label',muted?'Unmute directions':'Mute directions');
    try{localStorage.setItem('vip_nav_muted',muted?'1':'0');}catch(e){}
    if(muted)stopSpeech();else speak(tr('Voice guidance on','ভয়েস নির্দেশনা চালু হয়েছে'));
  });
  muteBtn.textContent=muted?'🔇':'🔊';
  reCenter?.addEventListener('click',()=>{
    cameraFollowing=true;
    if(lastPos)state.map?.easeTo({center:[lastPos.lon,lastPos.lat],
      pitch:state.is3d?58:0,zoom:16.6,duration:450});
  });
  document.addEventListener('visibilitychange',()=>{
    if(active&&document.hidden)gpsInfo.textContent=tr('Keep app open for navigation','নেভিগেশনের জন্য অ্যাপ খোলা রাখুন');
  });
  // Receive coordinates or plain-text destinations shared from messaging apps.
  window.vipImportSharedLocation=async function(text){
    const result=readSharedPlace(text);
    if(!result||result.kind==='shortlink'){
      toast(tr('Short map links need to be opened in a browser first','ছোট ম্যাপ লিংক আগে ব্রাউজারে খুলুন'));
      return;
    }
    if(result.kind==='coordinates'){
      const point=result.point;
      const dest={...point,name:'Shared location',address:point.lat.toFixed(5)+', '+point.lon.toFixed(5)};
      $('routeDestination').value=dest.address;
      state.selected=dest;
      await planRoute(dest,'car');
    }else if(result.query){
      $('routeDestination').value=result.query;
      // Reuse the app's geocoder. Do not silently navigate to uncertain coordinates.
      try{
        const results=await window.vipFindSharedPlace(result.query);
        if(results?.length)await planRoute(results[0],'car');
        else toast(tr('Shared address not found','পাঠানো ঠিকানা পাওয়া যায়নি'));
      }catch(e){toast(tr('Unable to resolve shared address','পাঠানো ঠিকানা খোঁজা যায়নি'));}
    }
  };
  window.vipFindSharedPlace=async query=>geocode(query);
  return {planRoute,stopNavigation,readSharedPlace,getStatus:()=>({active,routeCount:routes.length,watching:watchId!==null})};
};
})();