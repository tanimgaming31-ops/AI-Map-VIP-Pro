/* Optional traffic-aware routing using TomTom Routing v1.
 * Only enabled when the owner opts in with their own routing-enabled key.
 * If the response has no turn data, fall back to standard OSRM directions.
 */
(function(){
'use strict';
const moveCodes={
 DEPART:['depart','straight'], ARRIVE:['arrive','straight'],
 ARRIVE_LEFT:['arrive','left'],ARRIVE_RIGHT:['arrive','right'],
 STRAIGHT:['continue','straight'],FOLLOW:['continue','straight'],
 KEEP_RIGHT:['fork','slight right'],BEAR_RIGHT:['turn','slight right'],TURN_RIGHT:['turn','right'],
 SHARP_RIGHT:['turn','sharp right'],KEEP_LEFT:['fork','slight left'],
 BEAR_LEFT:['turn','slight left'],TURN_LEFT:['turn','left'],SHARP_LEFT:['turn','sharp left'],
 MAKE_UTURN:['turn','uturn'],TRY_MAKE_UTURN:['turn','uturn'],
 TAKE_EXIT:['off ramp','slight right'],MOTORWAY_EXIT_RIGHT:['off ramp','right'],
 MOTORWAY_EXIT_LEFT:['off ramp','left'],ENTRANCE_RAMP:['on ramp','straight'],
 ROUNDABOUT_CROSS:['roundabout','straight'],ROUNDABOUT_RIGHT:['roundabout','right'],
 ROUNDABOUT_LEFT:['roundabout','left'],ROUNDABOUT_BACK:['roundabout','uturn']
};
const laneCode={STRAIGHT:'straight',RIGHT:'right',SLIGHT_RIGHT:'slight right',
 SHARP_RIGHT:'sharp right',RIGHT_U_TURN:'uturn',LEFT:'left',SLIGHT_LEFT:'slight left',
 SHARP_LEFT:'sharp left',LEFT_U_TURN:'uturn'};
const valid=p=>p&&Number.isFinite(+p.latitude)&&Number.isFinite(+p.longitude)&&
 Math.abs(+p.latitude)<=90&&Math.abs(+p.longitude)<=180;
function convertTomTomRoute(route){
 const summary=route?.summary||{},legs=route?.legs||[];
 const points=legs.flatMap((leg,i)=>{
   const arr=Array.isArray(leg.points)?leg.points:[];
   return i===0?arr:arr.slice(1);
 });
 if(points.length<2||!points.every(valid)||!Number.isFinite(summary.travelTimeInSeconds)||
    !Number.isFinite(summary.lengthInMeters))return null;
 const coords=points.map(p=>[+p.longitude,+p.latitude]);
 const instructions=route?.guidance?.instructions||[];
 const laneSections=(route?.sections||[]).filter(section=>
   String(section.sectionType).toUpperCase()==='LANES'&&Array.isArray(section.lanes));
 const steps=instructions.map((item,i)=>{
   if(!valid(item.point))return null;
   const code=String(item.maneuver||'').toUpperCase();
   const [type,modifier]=moveCodes[code]||['turn','straight'];
   const section=laneSections.find(x=>Number.isInteger(item.pointIndex)&&
     item.pointIndex>=x.startPointIndex&&item.pointIndex<=x.endPointIndex);
   const mapped=(section?.lanes||[]).map(l=>({
     indications:(l.directions||[]).map(d=>laneCode[String(d).toUpperCase()]||'straight'),
     valid:!!l.follow
   }));
   const offset=Number(item.routeOffsetInMeters)||0;
   const next=Number(instructions[i+1]?.routeOffsetInMeters);
   return {
     maneuver:{type,modifier,location:[+item.point.longitude,+item.point.latitude]},
     name:String(item.street||item.signpostText||'').slice(0,150),
     distance:Number.isFinite(next)?Math.max(0,next-offset):0,
     intersections:mapped.length?[{lanes:mapped}]:[],
     providerMessage:String(item.message||'').slice(0,250)
   };
 }).filter(Boolean);
 if(steps.length<2)return null;
 const delay=Number(summary.trafficDelayInSeconds);
 return {geometry:{type:'LineString',coordinates:coords},
   distance:summary.lengthInMeters,duration:summary.travelTimeInSeconds,
   trafficDelay:Number.isFinite(delay)?Math.max(0,delay):null,
   source:'TomTom Traffic',legs:[{steps}]};
}
function convertTomTomResponse(json){
 return (json?.routes||[]).map(convertTomTomRoute).filter(Boolean)
   .sort((a,b)=>a.duration-b.duration).slice(0,3);
}
function buildTomTomURL(a,b,key){
 for(const p of [a,b]){
   if(!Number.isFinite(+p.lat)||!Number.isFinite(+p.lon)||Math.abs(+p.lat)>90||Math.abs(+p.lon)>180)
     throw Error('Invalid coordinates');
 }
 if(!key||key.length<10)throw Error('TomTom key missing');
 const coordinates=String(a.lat)+','+String(a.lon)+':'+String(b.lat)+','+String(b.lon);
 const url=new URL('https://api.tomtom.com/routing/1/calculateRoute/'+coordinates+'/json');
 url.searchParams.set('key',key);
 url.searchParams.set('travelMode','car');
 url.searchParams.set('routeType','fastest');
 url.searchParams.set('traffic','true');
 url.searchParams.set('computeTravelTimeFor','all');
 url.searchParams.set('maxAlternatives','2');
 url.searchParams.set('instructionsType','text');
 url.searchParams.set('sectionType','lanes');
 return url;
}
window.VipTomTomMath={convertTomTomRoute,convertTomTomResponse,buildTomTomURL};
window.vipTomTomRouting={
 enabled(){
   try{return localStorage.getItem('vip_tomtom_route_on')==='1' &&
    (localStorage.getItem('vip_tomtom_api_key')||'').length>=10;}
   catch(e){return false}
 },
 async route(origin,destination){
   if(!this.enabled())return null;
   const key=localStorage.getItem('vip_tomtom_api_key');
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),14000);
   try{
     const response=await fetch(buildTomTomURL(origin,destination,key),{signal:controller.signal,cache:'no-store'});
     if(!response.ok)throw Error('TomTom Routing API '+response.status);
     const result=convertTomTomResponse(await response.json());
     if(!result.length)throw Error('TomTom guidance or route geometry unavailable');
     return result;
   }finally{clearTimeout(timer);}
 }
};
})();