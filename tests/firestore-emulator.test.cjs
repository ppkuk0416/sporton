'use strict';
const test=require('node:test'), fs=require('node:fs'), path=require('node:path');
test('Firestore emulator: match isolation, cooldown, ownership, forged writes and bounded reads', {skip:!process.env.FIRESTORE_EMULATOR_HOST}, async()=>{
  const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
  const {doc,collection,getDocs,query,limit,setDoc,deleteDoc,writeBatch,serverTimestamp,Timestamp}=require('firebase/firestore');
  const env=await initializeTestEnvironment({projectId:'demo-sporton',firestore:{rules:fs.readFileSync(path.resolve('firestore.rules'),'utf8')}});
  try {
    await env.clearFirestore();
    const alice=env.authenticatedContext('alice').firestore(), bob=env.authenticatedContext('bob').firestore(), anon=env.unauthenticatedContext().firestore();
    const c=(db,room,id)=>doc(db,'matches',room,'comments',id), l=(db,uid)=>doc(db,'commentLocks',uid);
    const paired=(db,uid,room,id,patch={})=>{const b=writeBatch(db);b.set(c(db,room,id),{uid,nickname:'팬',text:'안녕하세요',createdAt:serverTimestamp(),...patch});b.set(l(db,uid),{lastPostedAt:serverTimestamp(),matchId:room,commentId:id});return b.commit();};
    await assertFails(setDoc(c(anon,'nba__123456','unauth'),{uid:'alice',nickname:'x',text:'x',createdAt:serverTimestamp()}));
    await assertFails(setDoc(c(alice,'nba__123456','alone'),{uid:'alice',nickname:'x',text:'x',createdAt:serverTimestamp()}));
    await assertFails(setDoc(l(alice,'alice'),{lastPostedAt:serverTimestamp(),matchId:'nba__123456',commentId:'missing'}));
    await assertFails(paired(alice,'alice','nba__123456','forged',{uid:'bob'}));
    await assertFails(paired(alice,'alice','nba__123456','future',{createdAt:Timestamp.fromMillis(0)}));
    await assertFails(paired(alice,'alice','nba__123456','long',{text:'x'.repeat(201)}));
    await assertSucceeds(paired(alice,'alice','nba__123456','a'));
    await assertFails(paired(alice,'alice','kleague__20261027','tooSoon'));
    await assertSucceeds(getDocs(query(collection(anon,'matches','nba__123456','comments'),limit(50))));
    await assertFails(getDocs(collection(anon,'matches','nba__123456','comments')));
    await assertFails(getDocs(query(collection(anon,'matches','nba__123456','comments'),limit(51))));
    await assertFails(deleteDoc(c(bob,'nba__123456','a')));
    await assertSucceeds(deleteDoc(c(alice,'nba__123456','a')));
    await env.withSecurityRulesDisabled(async ctx=>{await setDoc(l(ctx.firestore(),'alice'),{lastPostedAt:Timestamp.fromMillis(Date.now()-10000),matchId:'nba__123456',commentId:'a'});});
    const batch=writeBatch(alice);batch.set(c(alice,'nba__123456','b'),{uid:'alice',nickname:'팬',text:'하나',createdAt:serverTimestamp()});batch.set(c(alice,'nba__123456','c'),{uid:'alice',nickname:'팬',text:'둘',createdAt:serverTimestamp()});batch.set(l(alice,'alice'),{lastPostedAt:serverTimestamp(),matchId:'nba__123456',commentId:'b'});await assertFails(batch.commit());
    await assertSucceeds(paired(alice,'alice','kleague__20261027','later'));
    await assertFails(setDoc(doc(alice,'other','anything'),{x:1}));
  } finally { await env.cleanup(); }
});
