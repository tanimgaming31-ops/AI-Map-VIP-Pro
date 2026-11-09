/* AI MAP VIP PRO - key-free vector maps, tilt and navigation bridge.
   Base map: OpenFreeMap / OpenMapTiles / OpenStreetMap. */
(function () {
  'use strict';
  window.installVipNavigation = function ({ state, $, t, toast, renderExplore, setTab, renderRouteResult, fmtDist, fmtTime, geocode, setMode }) {
    const GL = window.maplibregl;
    const styleURL = () => 'https://tiles.openfreemap.org/styles/' + (state.theme === 'day' ? 'positron' : state.theme === 'rose' ? 'dark' : 'fiord');
    const validCoord = p => p && Number.isFinite(+p.lat) && Number.isFinite(+p.lon);
    state.mapPins = [];
    state.is3d = true;
    function credit() {
      $('mapcredit').innerHTML = '<a href="https://openfreemap.org/" target="_blank" rel="noopener">OpenFreeMap</a> · <a href="https://openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a>';
    }
    function markerElement(own) {
      const el = document.createElement('div');
      el.className = own ? 'vip-user-location' : 'vip-pin';
      if (!own) el.innerHTML = '<span><i>✦</i></span>';
      return el;
    }
    function addMarker(p, own = false) {
      return new GL.Marker({ element: markerElement(own), anchor: own ? 'center' : 'bottom' })
        .setLngLat([+p.lon, +p.lat]).addTo(state.map);
    }
    function clearPins() {
      (state.mapPins || []).forEach(pin => pin.remove());
      state.mapPins = [];
    }
    function paintRoute() {
      const map = state.map;
      if (!map || !map.getStyle()?.sources || !state.lastRoute?.route?.geometry) return;
      const geojson = { type:'Feature', properties:{}, geometry:state.lastRoute.route.geometry };
      try {
        if (map.getSource('vip-route')) {
          map.getSource('vip-route').setData(geojson);
        } else {
          map.addSource('vip-route', { type:'geojson', data:geojson });
          map.addLayer({ id:'vip-route-glow',type:'line',source:'vip-route',
            paint:{'line-color':'#f3a8cb','line-opacity':.32,'line-width':14,'line-blur':5} });
          map.addLayer({ id:'vip-route-main',type:'line',source:'vip-route',
            layout:{'line-join':'round','line-cap':'round'},
            paint:{'line-color':state.theme==='rose'?'#fb9bcc':'#ffd586','line-width':6,'line-opacity':.98} });
        }
      } catch (e) { console.info('Route layer pending:', e.message); }
    }
    function addBuildings() {
      const map=state.map;
      if(!map || !map.getStyle()?.sources || map.getLayer('vip-3d-buildings')) return;
      const style=map.getStyle()||{};
      const fromStyle=(style.layers||[]).find(layer=>layer['source-layer']==='building');
      const source=fromStyle?.source || Object.keys(style.sources||{}).find(key=>style.sources[key]?.type==='vector');
      if(!source)return;
      const firstLabel=(style.layers||[]).find(layer=>layer.type==='symbol')?.id;
      try {
        map.addLayer({
          id:'vip-3d-buildings',type:'fill-extrusion',source,
          'source-layer':'building', minzoom:14,
          paint:{
            'fill-extrusion-color':state.theme==='day'?'#d1c8d9':'#3b587a',
            'fill-extrusion-opacity':.66,
            'fill-extrusion-base':0,
            'fill-extrusion-height':['interpolate',['linear'],['zoom'],14,0,15,
              ['coalesce',['to-number',['get','render_height']],['to-number',['get','height']],12]]
          }
        },firstLabel);
      } catch(e){console.info('3D buildings unavailable for this style:',e.message);}
    }
    function updateTiles() {
      credit();
      if(!state.map)return;
      try{state.map.setStyle(styleURL(), {diff:false});}
      catch(e){toast('Map style unavailable. Check internet.');}
    }
    function initMap() {
      credit();
      if(!GL) {
        $('map').innerHTML='<div class="vip-map-error">Map engine could not load. Please connect to the internet and reopen the app.</div>';
        toast('Map engine unavailable');
        return;
      }
      const map=new GL.Map({
        container:'map', style:styleURL(),
        center:[55.2708,25.2048], zoom:12.8, pitch:49, bearing:-15,
        attributionControl:false, antialias:true, dragRotate:true,
        maxPitch:70, maxZoom:19
      });
      state.map=map;
      map.invalidateSize=()=>map.resize();
      map.on('style.load',()=>{addBuildings();paintRoute();});
      map.on('click',e=>{
        const lat=e.lngLat.lat,lon=e.lngLat.lng;
        selectPlace({lat,lon,name:t('pinHere'),address:lat.toFixed(5)+', '+lon.toFixed(5)},true);
      });
      map.on('error',error=>{
        const message=error?.error?.message||'';
        if(/401|403|unauthori[sz]ed|API key required/i.test(message)){
          console.warn('Map tile service rejected request:',message);
          toast('Map service failed. Check network or map provider.');
        }
      });
      setTimeout(()=>map.resize(),450);
    }
    function selectPlace(p,fromMap=false) {
      if(!validCoord(p))return;
      state.selected={name:String(p.name||t('pinHere')),address:String(p.address||''),lat:+p.lat,lon:+p.lon};
      state.selectedMarker?.remove();
      if(state.map){
        state.selectedMarker=addMarker(state.selected)
          .setPopup(new GL.Popup({offset:24,closeButton:true}).setText(state.selected.name));
        state.map.flyTo({center:[state.selected.lon,state.selected.lat],
          zoom:Math.max(state.map.getZoom(),15.3),
          pitch:state.is3d?52:0, duration:750,essential:true});
      }
      if(fromMap){state.results=[];clearPins();}
      renderExplore();
      setTab('explore');
    }
    function showResults(results) {
      state.results=results;
      state.selected=null;
      state.selectedMarker?.remove();
      state.selectedMarker=null;
      clearPins();
      const places=results.filter(validCoord);
      if(state.map && places.length){
        places.forEach(p=>{
          const pin=addMarker(p)
            .setPopup(new GL.Popup({offset:24}).setText(String(p.name||'Place')));
          pin.getElement().addEventListener('click',e=>{e.stopPropagation();selectPlace(p);});
          state.mapPins.push(pin);
        });
        const bounds=new GL.LngLatBounds();
        places.forEach(p=>bounds.extend([+p.lon,+p.lat]));
        state.map.fitBounds(bounds,{padding:{top:240,right:38,bottom:230,left:32},
          maxZoom:15.3,duration:850,pitch:state.is3d?48:0});
      }
      renderExplore();
      setTab('explore');
      if(!places.length){
        $('searchResults').innerHTML='<div class="empty">No places found. Try another search.</div>';
      }
    }
    async function locate(silent=false) {
      return new Promise(resolve=>{
        if(!navigator.geolocation){if(!silent)toast(t('locationUnavailable'));resolve(null);return;}
        navigator.geolocation.getCurrentPosition(pos=>{
          const lat=pos.coords.latitude,lon=pos.coords.longitude;
          state.me=[lat,lon];
          state.meMarker?.remove();
          if(state.map)state.meMarker=addMarker({lat,lon},true)
            .setPopup(new GL.Popup({offset:15}).setText(t('youAreHere')));
          if(!silent && state.map){
            state.map.flyTo({center:[lon,lat],zoom:16.5,pitch:state.is3d?54:0,
              duration:1000,essential:true});
            toast(t('locationFound'));
          }
          resolve(state.me);
        },()=>{if(!silent)toast(t('locationUnavailable'));resolve(null);},
        {enableHighAccuracy:true,timeout:12000,maximumAge:45000});
      });
    }
    async function calculateRoute(place,mode=state.mode) {
      if(!state.map||!validCoord(place))return;
      setMode(mode);
      const start=state.me||await locate(true)||[state.map.getCenter().lat,state.map.getCenter().lng];
      const origin=state.me?t('youAreHere'):t('centerStart');
      const svc={car:'routed-car',foot:'routed-foot',bike:'routed-bike'}[state.mode];
      const endpoint='https://routing.openstreetmap.de/'+svc+'/route/v1/driving/'
        +start[1]+','+start[0]+';'+place.lon+','+place.lat
        +'?overview=full&geometries=geojson&steps=true';
      toast(t('loadingRoute'));
      $('routeBtn').disabled=true;
      try {
        const response=await fetch(endpoint);
        if(!response.ok)throw new Error('Routing HTTP '+response.status);
        const data=await response.json(), route=data.routes?.[0];
        if(!route?.geometry?.coordinates?.length)throw new Error('No route geometry');
        state.lastRoute={route,name:place.name,origin};
        paintRoute();
        const bounds=new GL.LngLatBounds();
        route.geometry.coordinates.forEach(c=>bounds.extend(c));
        state.map.fitBounds(bounds,{padding:{top:240,right:45,bottom:230,left:45},
          maxZoom:16,pitch:state.is3d?49:0,duration:1000});
        renderRouteResult(state.lastRoute);
        setTab('route');
        toast(t('routeReady'));
      } catch(error) {
        console.warn('Routing unavailable:',error);
        $('routeResult').innerHTML='<div class="empty">'+t('routeFailed')+'</div>';
        toast(t('routeFailed'));
      } finally { $('routeBtn').disabled=false; }
    }
    const btn=$('tiltBtn');
    if(btn){
      btn.onclick=()=>{
        state.is3d=!state.is3d;
        btn.classList.toggle('on',state.is3d);
        btn.setAttribute('aria-pressed',String(state.is3d));
        state.map?.easeTo({pitch:state.is3d?54:0,bearing:state.is3d?-15:0,duration:650});
        toast(state.is3d?'3D navigation view':'2D map view');
      };
    }
    const north=$('northBtn');
    if(north)north.onclick=()=>{
      state.map?.easeTo({bearing:0,duration:550});
      toast('North up');
    };
    window.addEventListener('resize',()=>state.map?.resize());
    return {initMap,updateTiles,updateCredit:credit,selectPlace,showResults,
            clearResultPins:clearPins,locate,calculateRoute};
  };
})();