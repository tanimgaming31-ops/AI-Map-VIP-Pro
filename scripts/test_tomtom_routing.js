/* Synthetic TomTom routing fixtures: no real API key, no network. */
'use strict';
const assert=require('node:assert/strict');
global.window={};
require('../tomtom-routing.js');
const m=window.VipTomTomMath;
const p0={latitude:25.2001,longitude:55.3001};
const p1={latitude:25.2002,longitude:55.3002};
const p2={latitude:25.2003,longitude:55.3003};
const response={routes:[{
 summary:{travelTimeInSeconds:230,lengthInMeters:800,trafficDelayInSeconds:70},
 legs:[{points:[p0,p1,p2]}],
 guidance:{instructions:[
  {point:p0,pointIndex:0,routeOffsetInMeters:0,maneuver:'DEPART',street:'First Street'},
  {point:p1,pointIndex:1,routeOffsetInMeters:450,maneuver:'TURN_RIGHT',street:'Second Street'},
  {point:p2,pointIndex:2,routeOffsetInMeters:800,maneuver:'ARRIVE',street:''}
 ]},
 sections:[{sectionType:'LANES',startPointIndex:1,endPointIndex:1,
 lanes:[{directions:['RIGHT'],follow:'RIGHT'}, {directions:['STRAIGHT']}]}]
}]};
const routes=m.convertTomTomResponse(response);
assert.equal(routes.length,1);
assert.equal(routes[0].duration,230);
assert.equal(routes[0].trafficDelay,70);
assert.equal(routes[0].geometry.coordinates.length,3);
assert.equal(routes[0].legs[0].steps.length,3);
assert.equal(routes[0].legs[0].steps[1].maneuver.modifier,'right');
assert.equal(routes[0].legs[0].steps[1].intersections[0].lanes[0].valid,true);
assert.equal(routes[0].legs[0].steps[1].intersections[0].lanes[1].valid,false);
assert.equal(m.convertTomTomResponse({routes:[{summary:{},legs:[]}]}).length,0);
assert.match(String(m.buildTomTomURL({lat:25.2,lon:55.2},{lat:25.3,lon:55.3},'dummykey000123')),/traffic=true/);
assert.throws(()=>m.buildTomTomURL({lat:999,lon:1},{lat:20,lon:1},'dummykey000123'));
console.log('PASS: TomTom traffic-aware ETA, geometry, instructions and lane sections');
