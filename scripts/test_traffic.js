/* Fixture-only tests; no key, GPS, network or driver required. */
'use strict';
const assert=require('node:assert/strict');
global.window={};
require('../traffic-intelligence.js');
const m=global.window.VipTrafficMath;
const incidents=m.parseTomtomIncidents({incidents:[
 {geometry:{type:'Point',coordinates:[55.3,25.2]},properties:{
   id:'t1',iconCategory:1,events:[{description:'Accident ahead'}],delay:300}},
 {geometry:{type:'LineString',coordinates:[[55.4,25.3],[55.41,25.31]]},
   properties:{iconCategory:9,events:[{description:'Worksite'}]}},
 {geometry:{coordinates:['oops']},properties:{iconCategory:1}}
]});
assert.equal(incidents.length,2);
assert.equal(incidents[0].description,'Accident ahead');
assert.equal(incidents[0].delay,300);
assert.equal(incidents[0].type,'accident');
assert.equal(incidents[1].type,'work');
const roads=m.parseOsmRoadFeatures({elements:[
 {lat:25.1,lon:55.1,tags:{highway:'traffic_signals'}},
 {lat:25.2,lon:55.2,tags:{highway:'speed_camera',maxspeed:'80'}},
 {lat:25.3,lon:55.3,tags:{highway:'residential'}}
]});
assert.equal(roads.length,2);
assert.equal(roads[0].type,'signal');
assert.equal(roads[1].type,'camera');
assert.equal(roads[1].maxspeed,'80');
assert.equal(m.parseFlowSegment({flowSegmentData:{currentSpeed:18,freeFlowSpeed:60,
 coordinates:{coordinate:[{latitude:25.2,longitude:55.2},{latitude:25.3,longitude:55.3}]}}}).ratio,.3);
assert.equal(m.parseFlowSegment({flowSegmentData:{currentSpeed:1,freeFlowSpeed:0}}),null);
const turn={intersections:[{lanes:[{indications:['left'],valid:true},
 {indications:['straight'],valid:false}]}]};
assert.deepEqual(m.lanesForManeuver(turn).map(x=>x.valid),[true,false]);
assert.deepEqual(m.lanesForManeuver({intersections:[]}),[]);
const bbox=m.bboxAround(25.2,55.2,4);
assert.equal(bbox.length,4);
assert.ok(bbox[0]<55.2&&bbox[1]<25.2&&bbox[2]>55.2&&bbox[3]>25.2);
assert.equal(m.parseTomtomIncidents(null).length,0);
console.log('PASS: TomTom traffic fixtures, OSM fixed POIs, OSRM lane metadata');
