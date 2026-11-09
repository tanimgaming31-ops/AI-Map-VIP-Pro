/* AI MAP VIP PRO : external traffic sources and road safety POIs.
 * TomTom traffic requires a key configured ON DEVICE; public OSM POIs are
 * historic/mapped infrastructure, never live light/camera status.
 * No fake police reports, signal phase predictions or congestion figures.
 */
(function(){
'use strict';
const icons={
 accident:'⚠',fog:'☁',danger:'⚠',rain:'☂',ice:'❄',jam:'🚙',lane:'↗',
 closed:'⛔',work:'🚧',wind:'≋',flood:'🌊',breakdown:'⚙',camera:'📷',signal:'🚦'
};
const iconTypes={1:'accident',2:'fog',3:'danger',4:'rain',5:'ice',6:'jam',
 7:'lane',8:'closed',9:'work',10:'wind',11:'flood',14:'breakdown'};
const eventNames={accident:'Accident',fog:'Fog',danger:'Hazard',rain:'Heavy rain',
 ice:'Ice',jam:'Traffic congestion',lane:'Lane closure',closed:'Road closed',
 work:'Road works',wind:'Wind',flood:'Flooding',breakdown:'Broken vehicle'};
function point(coordinates){
  if(!Array.isArray(coordinates))return null;
  const c=typeof coordinates[0]==='number'?coordinates:Array.isArray(coordinates[0])?coordinates[0]:[];
  const lon=+c[0],lat=+c[1];
  return Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180?{lat,lon}:null;
}
function parseTomtomIncidents(body){
  const incidents=Array.isArray(body?.incidents)?body.incidents:[];
  return incidents.map(item=>{
    const p=point(item.geometry?.coordinates);
    if(!p)return null;
    const pr=item.properties||{},kind=iconTypes[pr.iconCategory]||'danger';
    return {...p,type:kind,id:String(pr.id||''),description:
      String(pr.events?.[0]?.description||eventNames[kind]||'Traffic event').slice(0,160),
      delay:Number.isFinite(pr.delay)?pr.delay:null,confidence:pr.aci?.probabilityOfOccurrence||'',
      source:'TomTom',lastReportTime:pr.aci?.lastReportTime||null};
  }).filter(Boolean);
}
function parseOsmRoadFeatures(body){
  return (body?.elements||[]).map(el=>{
    if(!el?.tags||!Number.isFinite(el.lat)||!Number.isFinite(el.lon))return null;
    const type=el.tags.highway==='speed_camera'?'camera':
      el.tags.highway==='traffic_signals'?'signal':null;
    if(!type)return null;
    return {type,lat:el.lat,lon:el.lon,source:'OpenStreetMap',
      description:type==='camera'?'Mapped fixed speed camera':'Mapped traffic signal',
      maxspeed:el.tags.maxspeed||null};
  }).filter(Boolean);
}
function parseFlowSegment(body){
  const flow=body?.flowSegmentData;
  if(!flow)return null;
  const currentSpeed=Number(flow.currentSpeed),freeFlowSpeed=Number(flow.freeFlowSpeed);
  if(!Number.isFinite(currentSpeed)||!Number.isFinite(freeFlowSpeed)||freeFlowSpeed<=0)return null;
  return {currentSpeed,freeFlowSpeed,ratio:currentSpeed/freeFlowSpeed,
    confidence:flow.confidence??null,roadClosure:!!flow.roadClosure,
    coords:(flow.coordinates?.coordinate||[]).map(c=>[Number(c.longitude),Number(c.latitude)]).filter(c=>c.every(Number.isFinite))};
}
function lanesForManeuver(step){
  const intersections=step?.intersections||[];
  const laneInfo=intersections.find(x=>Array.isArray(x.lanes)&&x.lanes.length)?.lanes||[];
  return laneInfo.map(lane=>({
    valid:!!lane.valid,
    indications:(lane.indications||[]).filter(i=>typeof i==='string').slice(0,3)
  })).slice(0,8);
}
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function bboxAround(lat,lon,km){
  const latD=km/111.2,lonD=km/(111.2*Math.max(.2,Math.cos(lat*Math.PI/180)));
  return [clamp(lon-lonD,-180,180),clamp(lat-latD,-90,90),
    clamp(lon+lonD,-180,180),clamp(lat+latD,-90,90)];
}
function escaped(value){return String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
window.VipTrafficMath={parseTomtomIncidents,parseOsmRoadFeatures,parseFlowSegment,
 lanesForManeuver,bboxAround};

window.installVipTraffic=function({state,$,toast}){
 const GL=window.maplibregl;
 const storage={
  get(k){try{return localStorage.getItem(k)||'';}catch(e){return '';}},
  set(k,v){try{localStorage.setItem(k,String(v));}catch(e){}}
 };
 const keyInput=$('tomtomKey'),status=$('trafficDataStatus');
 const trafficToggle=$('vipTrafficToggle'),poiToggle=$('vipRoadSafetyToggle');
 const rasterToggle=$('vipFlowRasterToggle'),routingToggle=$('vipRouteTrafficToggle');
 const refresh=$('vipRefreshTraffic');
 const panels=$('vipRoadDataPanel'),incidentsList=$('vipIncidentList');
 let key=storage.get('vip_tomtom_api_key'),keyEnabled=false;
 let trafficOn=storage.get('vip_traffic_on')!=='0',poiOn=storage.get('vip_poi_on')!=='0';
 let rasterOn=storage.get('vip_tomtom_tiles_on')==='1',lastRaster=0;
 let lastTraffic=0,lastFlow=0,lastPOI=0,trafficEvents=[],staticPOI=[],flow=null;
 let incidentPins=[],safetyPins=[],flowDrawn=false,inFlight=false,poiInflight=false;
 let timer=null,viewTimer=null;
 const CYCLE=2*60*1000, OSM_CYCLE=15*60*1000;
 const language=()=>state.lang==='bn'?'bn':'en';
 const translate=(en,bn)=>language()==='bn'?bn:en;
 const hasProvider=()=>key.trim().length>=10;
 const center=()=>{const pos=state.me;const c=state.map?.getCenter();return pos?
   {lat:+pos[0],lon:+pos[1]}:c?{lat:c.lat,lon:c.lng}:null};
 const updateStatus=(message,good=false)=>{
   if(status){status.textContent=message;status.dataset.ready=good?'yes':'no';}
 };
 const marker=(p,kind,description,cssClass)=>{
   if(!GL||!state.map)return null;
   const el=document.createElement('div');
   el.className='vip-data-marker '+cssClass;el.textContent=icons[kind]||'!';
   return new GL.Marker({element:el,anchor:'center'}).setLngLat([p.lon,p.lat])
    .setPopup(new GL.Popup({offset:20}).setText(description)).addTo(state.map);
 };
 function clearPins(collection){collection.forEach(p=>p.remove());collection.length=0;}
 function paintIncidents(){
   clearPins(incidentPins);
   if(!state.map||!trafficOn)return;
   trafficEvents.slice(0,70).forEach(event=>{
     const p=marker(event,event.type,event.description+
       (event.delay?' · Delay '+Math.round(event.delay/60)+' min':''),
       'vip-live-event');
     if(p)incidentPins.push(p);
   });
 }
 function paintPOI(){
   clearPins(safetyPins);
   if(!state.map||!poiOn)return;
   staticPOI.slice(0,95).forEach(item=>{
     const detail=item.description+
       (item.maxspeed?' · Tagged speed: '+item.maxspeed:'')+
       ' · OSM mapped only; may be outdated';
     const p=marker(item,item.type,detail,'vip-osm-poi');
     if(p)safetyPins.push(p);
   });
 }
 function paintTrafficRaster(){
   const map=state.map;
   if(!map?.getStyle()?.sources||!map.isStyleLoaded())return;
   try{
     if(map.getLayer('vip-traffic-raster'))map.removeLayer('vip-traffic-raster');
     if(map.getSource('vip-traffic-raster'))map.removeSource('vip-traffic-raster');
     if(!rasterOn||!trafficOn||!hasProvider())return;
     // Transparent flow tiles from TomTom. Opt-in because each displayed tile
     // counts against the user's quota and embeds their key in tile requests.
     const url='https://api.tomtom.com/traffic/map/4/tile/flow/relative0-dark/{z}/{x}/{y}.png?key='+
       encodeURIComponent(key)+'&cacheId='+Math.floor(Date.now()/300000);
     map.addSource('vip-traffic-raster',{type:'raster',tiles:[url],tileSize:256,minzoom:10,maxzoom:17});
     const labels=(map.getStyle()?.layers||[]).find(layer=>layer.type==='symbol')?.id;
     map.addLayer({id:'vip-traffic-raster',type:'raster',source:'vip-traffic-raster',
       paint:{'raster-opacity':.77,'raster-fade-duration':0}},labels);
     lastRaster=Date.now();
   }catch(e){console.info('Traffic raster overlay unavailable',e.message);}
 }
 function paintFlow(){
   if(!state.map?.getStyle()?.sources)return;
   for(const id of ['vip-flow-line']){
     try{if(state.map.getLayer(id))state.map.removeLayer(id);}catch(e){}
     try{if(state.map.getSource(id))state.map.removeSource(id);}catch(e){}
   }
   flowDrawn=false;
   if(!flow||!trafficOn||flow.coords.length<2)return;
   try{
     state.map.addSource('vip-flow-line',{type:'geojson',data:
       {type:'Feature',properties:{},geometry:{type:'LineString',coordinates:flow.coords}}});
     state.map.addLayer({id:'vip-flow-line',type:'line',source:'vip-flow-line',
       layout:{'line-cap':'round','line-join':'round'},
       paint:{'line-color':flow.roadClosure?'#c24a58':flow.ratio<.5?'#d94055':
           flow.ratio<.8?'#f4ac31':'#41c984','line-width':5,'line-opacity':.86}});
     flowDrawn=true;
   }catch(e){console.info('Flow layer pending',e.message);}
 }
 function updatePanel(){
   if(!panels)return;
   const summary=hasProvider()?
     (lastTraffic?'Last TomTom check: '+new Date(lastTraffic).toLocaleTimeString():'TomTom not checked yet'):
     'TomTom API key required for live traffic and incidents';
   const road=lastPOI?' · OSM last checked '+new Date(lastPOI).toLocaleTimeString():'';
   panels.querySelector('#vipRoadDataSummary').textContent=summary+road;
   if(!incidentsList)return;
   let list=[];
   if(trafficOn&&trafficEvents.length){
     list=trafficEvents.slice(0,8).map(x=>'<div class="vip-event-item"><b>'+icons[x.type]+
       ' '+escaped(x.description)+'</b><small>TomTom · '+(x.delay?
       Math.round(x.delay/60)+' min delay':'No delay estimate')+'</small></div>');
   }
   if(flow&&trafficOn){
     list.unshift('<div class="vip-event-item"><b>🚗 Closest traffic segment: '+
       Math.round(flow.currentSpeed)+' km/h</b><small>Free flow '+
       Math.round(flow.freeFlowSpeed)+' km/h · TomTom</small></div>');
   }
   if(poiOn&&staticPOI.length){
     list.push('<div class="vip-event-item"><b>🚦 '+staticPOI.filter(x=>x.type==='signal').length+
       ' mapped signals · 📷 '+staticPOI.filter(x=>x.type==='camera').length+
       ' mapped cameras</b><small>OpenStreetMap, not live camera or signal status</small></div>');
   }
   incidentsList.innerHTML=list.length?list.join(''):'<div class="vip-event-item">No verified events loaded. Do not assume roads are clear.</div>';
 }
 function settingsStatus(){
   if(keyInput)keyInput.value=key;
   if(trafficToggle)trafficToggle.checked=trafficOn;
   if(poiToggle)poiToggle.checked=poiOn;
   if(rasterToggle)rasterToggle.checked=rasterOn;
   if(routingToggle)routingToggle.checked=storage.get('vip_tomtom_route_on')==='1';
   updateStatus(hasProvider()?'Traffic data source ready. Press Refresh to test.':
     'Live traffic unavailable until a TomTom key is added.',hasProvider());
 }
 async function fetchJSON(url,options={}){
   const controller=new AbortController();
   const timeout=setTimeout(()=>controller.abort(),12000);
   try{
     const res=await fetch(url,{...options,signal:controller.signal,cache:'no-store'});
     if(!res.ok)throw Error(res.status===401||res.status===403?'Invalid API key or access denied':'HTTP '+res.status);
     return await res.json();
   }finally{clearTimeout(timeout);}
 }
 function tomtomIncidentsURL(p){
   const bbox=bboxAround(p.lat,p.lon,4);
   const url=new URL('https://api.tomtom.com/traffic/services/5/incidentDetails');
   url.searchParams.set('key',key);
   url.searchParams.set('bbox',bbox.join(','));
   url.searchParams.set('fields','{incidents{type,geometry{type,coordinates},properties{id,iconCategory,magnitudeOfDelay,events{description},delay,aci{probabilityOfOccurrence,numberOfReports,lastReportTime}}}}');
   url.searchParams.set('language','en-GB');
   url.searchParams.set('timeValidityFilter','present');
   return url;
 }
 function tomtomFlowURL(p){
   const url=new URL('https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/16/json');
   url.searchParams.set('key',key);
   url.searchParams.set('point',p.lat+','+p.lon);
   url.searchParams.set('unit','kmph');
   return url;
 }
 async function loadTraffic(force=false){
   if(!trafficOn||!hasProvider()||inFlight||!navigator.onLine)return;
   const now=Date.now();if(!force&&now-lastTraffic<CYCLE)return;
   const p=center();if(!p)return;
   inFlight=true;
   lastTraffic=now; // even failures count toward rate limits
   updateStatus('Checking TomTom traffic…',true);
   let successful=0,issues=[];
   try{
     try{
       const result=await fetchJSON(tomtomIncidentsURL(p));
       trafficEvents=parseTomtomIncidents(result);paintIncidents();successful++;
     }catch(e){issues.push('Incident API: '+e.message);}
     if(force||now-lastFlow>5*60*1000){
       lastFlow=Date.now();
       try{
         flow=parseFlowSegment(await fetchJSON(tomtomFlowURL(p)));
         paintFlow();successful++;
       }catch(e){issues.push('Flow API: '+e.message);}
     }
     if(successful)updateStatus('Traffic updated '+new Date().toLocaleTimeString()+
       (issues.length?' · Partial data':'') ,true);
     else updateStatus('Traffic unavailable. '+issues.join(' | '));
   }finally{inFlight=false;updatePanel();}
 }
 async function loadOsm(force=false){
   if(!poiOn||poiInflight||!navigator.onLine)return;
   const now=Date.now();if(!force&&now-lastPOI<OSM_CYCLE)return;
   const p=center();if(!p)return;
   poiInflight=true;lastPOI=now;
   // Limit Overpass to two well-defined infrastructure tags and a small radius.
   const query='[out:json][timeout:20];(node(around:2200,'+
     p.lat.toFixed(5)+','+p.lon.toFixed(5)+')['+
     '"highway"="traffic_signals"];node(around:2200,'+
     p.lat.toFixed(5)+','+p.lon.toFixed(5)+
     ')["highway"="speed_camera"];);out body 120;';
   try{
     const result=await fetchJSON('https://overpass.kumi.systems/api/interpreter',
       {method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
         body:new URLSearchParams({data:query})});
     staticPOI=parseOsmRoadFeatures(result);paintPOI();
   }catch(e){console.info('OSM infrastructure data unavailable:',e.message);}
   finally{poiInflight=false;updatePanel();}
 }
 function saveKey(){
   const value=(keyInput?.value||'').trim();
   if(value&&!/^[a-zA-Z0-9_-]{10,128}$/.test(value)){
     updateStatus('Invalid key format. Nothing saved.');return;
   }
   key=value;storage.set('vip_tomtom_api_key',value);
   lastTraffic=0;lastFlow=0;
   settingsStatus();
   paintTrafficRaster();
   if(key)loadTraffic(true);else{
     trafficEvents=[];flow=null;clearPins(incidentPins);paintFlow();updatePanel();
   }
 }
 $('vipSaveTrafficKey')?.addEventListener('click',saveKey);
 trafficToggle?.addEventListener('change',()=>{
   trafficOn=trafficToggle.checked;storage.set('vip_traffic_on',trafficOn?'1':'0');
   paintIncidents();paintFlow();paintTrafficRaster();if(trafficOn)loadTraffic(true);updatePanel();
 });
 rasterToggle?.addEventListener('change',()=>{
   rasterOn=rasterToggle.checked;storage.set('vip_tomtom_tiles_on',rasterOn?'1':'0');
   paintTrafficRaster();updatePanel();
 });
 routingToggle?.addEventListener('change',()=>{
   storage.set('vip_tomtom_route_on',routingToggle.checked?'1':'0');
   updateStatus(routingToggle.checked?'Traffic-aware routes enabled when Routing API access is available.':
     'Standard OSRM routes selected.',!!key);
 });
 poiToggle?.addEventListener('change',()=>{
   poiOn=poiToggle.checked;storage.set('vip_poi_on',poiOn?'1':'0');
   paintPOI();if(poiOn)loadOsm(true);updatePanel();
 });
 refresh?.addEventListener('click',()=>{loadTraffic(false);loadOsm(false);});
 $('vipRoadDataBtn')?.addEventListener('click',()=>{
   if(panels){panels.hidden=!panels.hidden;if(!panels.hidden){loadTraffic();loadOsm();updatePanel();}}
 });
 const mapReady=()=>{paintIncidents();paintPOI();paintFlow();paintTrafficRaster();};
 if(state.map){
   state.map.on('style.load',mapReady);
   state.map.on('moveend',()=>{
     clearTimeout(viewTimer);
     viewTimer=setTimeout(()=>{loadTraffic();loadOsm();},3000);
   });
 }
 // Only poll while the map is visible and in the foreground.
 timer=setInterval(()=>{
   if(!document.hidden){loadTraffic();loadOsm();
     if(rasterOn&&Date.now()-lastRaster>5*60*1000)paintTrafficRaster();
   }
 },CYCLE);
 document.addEventListener('visibilitychange',()=>{
   if(!document.hidden){loadTraffic();loadOsm();}
 });
 settingsStatus();
 setTimeout(()=>{loadOsm();if(hasProvider())loadTraffic();},2500);
 function nearRoadFeature(pos,maxMeters=500){
   const d=window.VipNavigationMath?.haversine;
   if(!d||!pos)return null;
   return staticPOI.filter(x=>x.type==='camera'||x.type==='signal')
     .map(x=>({...x,distance:d(pos,x)})).sort((a,b)=>a.distance-b.distance)
     .find(x=>x.distance<maxMeters)||null;
 }
 return {refresh:()=>{loadTraffic();loadOsm();},nearRoadFeature,getSnapshot:()=>({
   providerReady:hasProvider(),events:trafficEvents.slice(),flow,osm:staticPOI.slice(),
   incidentUpdated:lastTraffic,osmUpdated:lastPOI}),parseOsmRoadFeatures};
};
})();