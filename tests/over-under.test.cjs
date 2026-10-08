const test=require('node:test'),assert=require('node:assert/strict'),{calculate}=require('../over-under.js');
test('basketball, soccer and baseball use the selected whole-game or segment length',()=>{
 assert.equal(calculate({home:50,away:45,line:189.5,total:48,progress:24}).projected,190);
 assert.equal(calculate({home:1,away:1,line:2.5,total:90,progress:60}).projected,3);
 assert.equal(calculate({home:2,away:1,line:8.5,total:9,progress:3}).projected,9);
 assert.equal(calculate({home:10,away:9,line:36.5,total:12,progress:6}).projected,38);
});
test('remaining and elapsed inputs agree, and integer lines preserve an exact equality',()=>{
 const d={home:50,away:45,line:190,total:48};assert.deepEqual(calculate({...d,progress:24}),calculate({...d,progress:24,timeMode:'remaining'}));
 assert.equal(calculate({...d,progress:24}).comparison,'equal');assert.equal(calculate({home:4,away:4,line:8,total:9,progress:9}).comparison,'equal');assert.equal(calculate({home:4,away:4,line:8,total:9,progress:9}).pointsToOver,1);
 assert.equal(calculate({home:1,away:0,line:0.5,total:90,progress:90}).comparison,'over');
});
test('blank, non-finite, negative, unstarted and impossible progress cannot produce a result',()=>{
 const d={home:0,away:0,line:2.5,total:90,progress:30};for(const patch of [{home:''},{home:1.5},{away:-1},{line:NaN},{total:0},{progress:0},{progress:91},{progress:90,timeMode:'remaining'},{line:Infinity}])assert.throws(()=>calculate({...d,...patch}));assert.equal(calculate(d).projected,0);
});
