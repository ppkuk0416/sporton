/* Match comments: only activated after explicit Firebase configuration and rules deployment. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.SportonMatchComments=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const LIMIT=50, COOLDOWN_MS=5000;
  function matchKey(match,leagues){
    const league=leagues.find(l=>l.id===match?.leagueId);
    const id=String(match?.providerId||'');
    if(!league||!(league.region==='world'?/^\d{6,14}$/:/^[A-Za-z0-9_-]{8,48}$/).test(id))return null;
    return league.id+'__'+id;
  }
  function validateInput(nickname,text){
    nickname=String(nickname||'').trim();text=String(text||'').trim();
    if(nickname.length<1||nickname.length>20)return {error:'닉네임은 1~20자로 입력해 주세요.'};
    if(text.length<1||text.length>200)return {error:'댓글은 1~200자로 입력해 주세요.'};
    return {nickname,text};
  }
  function createElement(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
  let current=null,generation=0;
  function destroy(){
    generation++;
    if(current){current.unsubscribe?.();current.host.replaceChildren();current.host.hidden=true;current=null;}
  }
  async function mount(match,host){
    destroy();
    const config=window.SPORTON_CONFIG||{},key=matchKey(match,window.SportonCore?.LEAGUES||[]);
    if(!host||!config.firebase||config.matchComments?.enabled!==true||!key){if(host)host.hidden=true;return;}
    const token=generation,fb=window.firebase;
    host.hidden=false;
    const section=createElement('section','match-comments');
    section.append(createElement('h3',null,'경기 댓글'));
    const status=createElement('p','match-comments-status','댓글 연결 중…');status.setAttribute('role','status');status.setAttribute('aria-live','polite');section.append(status);
    const list=createElement('ol','match-comments-list');list.setAttribute('aria-label','최근 경기 댓글');section.append(list);
    const form=createElement('form','match-comments-form');
    const nick=createElement('input');nick.maxLength=20;nick.placeholder='닉네임';nick.setAttribute('aria-label','닉네임');nick.required=true;
    const input=createElement('textarea');input.maxLength=200;input.rows=2;input.placeholder='이 경기에 대한 댓글';input.setAttribute('aria-label','댓글');input.required=true;
    const send=createElement('button','match-comments-submit','댓글 등록');send.type='submit';send.disabled=true;
    form.append(nick,input,send);section.append(form);host.replaceChildren(section);
    current={host,unsubscribe:null};const alive=()=>token===generation;
    if(!fb?.apps||!fb.auth||!fb.firestore){status.textContent='댓글 연결을 준비하지 못했습니다. 잠시 후 다시 시도해 주세요.';return;}
    try {
      if(!fb.apps.length)fb.initializeApp(config.firebase);
      const auth=fb.auth(),db=fb.firestore();
      const authResult=auth.currentUser?{user:auth.currentUser}:await auth.signInAnonymously();
      if(!alive())return;
      const user=authResult.user;
      if(!user?.uid)throw Error('Authentication unavailable');
      const comments=db.collection('matches').doc(key).collection('comments');
      const lock=db.collection('commentLocks').doc(user.uid);
      let busy=false;
      current.unsubscribe=comments.orderBy('createdAt','desc').limit(LIMIT).onSnapshot(snapshot=>{
        if(!alive())return;
        list.replaceChildren();
        if(snapshot.empty)list.append(createElement('li',null,'첫 댓글을 남겨보세요.'));
        else for(const doc of [...snapshot.docs].reverse()){
          const entry=doc.data()||{},li=createElement('li'),meta=createElement('div','match-comments-meta');
          meta.append(createElement('strong',null,String(entry.nickname||'익명').slice(0,20)));
          if(entry.createdAt?.toDate){const d=entry.createdAt.toDate();if(Number.isFinite(d.getTime()))meta.append(createElement('time',null,d.toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})));}
          if(entry.uid===user.uid){
            const del=createElement('button','match-comments-delete','삭제');del.type='button';del.setAttribute('aria-label','내 댓글 삭제');
            del.addEventListener('click',async()=>{del.disabled=true;try{await doc.ref.delete();}catch{if(alive()){status.textContent='댓글을 삭제하지 못했습니다. 다시 시도해 주세요.';del.disabled=false;}}});
            meta.append(del);
          }
          li.append(meta,createElement('p','match-comments-text',String(entry.text||'').slice(0,200)));list.append(li);
        }
        status.textContent=snapshot.metadata?.fromCache?'마지막으로 받은 댓글입니다. 연결을 확인하고 있습니다.':'최근 댓글 '+Math.min(snapshot.size,LIMIT)+'개';
      },()=>{if(alive()){status.textContent='댓글 연결이 끊겼습니다. 페이지를 다시 열어주세요.';send.disabled=true;}});
      send.disabled=false;
      form.addEventListener('submit',async event=>{
        event.preventDefault();if(busy||!alive())return;
        const valid=validateInput(nick.value,input.value);
        if(valid.error){status.textContent=valid.error;return;}
        busy=true;send.disabled=true;
        try{
          const ref=comments.doc(),timestamp=fb.firestore.FieldValue.serverTimestamp();
          await db.runTransaction(async tx=>{
            const previous=await tx.get(lock),last=previous.exists?previous.data()?.lastPostedAt:null;
            if(last?.toMillis&&Date.now()-last.toMillis()<COOLDOWN_MS)throw Error('cooldown');
            tx.set(ref,{uid:user.uid,nickname:valid.nickname,text:valid.text,createdAt:timestamp});
            tx.set(lock,{lastPostedAt:timestamp,matchId:key,commentId:ref.id});
          });
          if(alive()){input.value='';status.textContent='댓글을 등록했습니다.';}
        }catch(error){if(alive())status.textContent=error?.message==='cooldown'?'댓글은 5초 간격으로 등록할 수 있습니다.':'댓글 등록에 실패했습니다. 잠시 후 다시 시도해 주세요.';}
        finally{busy=false;if(alive())send.disabled=false;}
      });
    }catch{if(alive()){status.textContent='댓글 연결을 준비하지 못했습니다. 잠시 후 다시 시도해 주세요.';send.disabled=true;}}
  }
  return {matchKey,validateInput,mount,destroy,LIMIT,COOLDOWN_MS};
});
