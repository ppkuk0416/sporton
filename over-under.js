/* Shared arithmetic for any sport or scoring interval. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SportonOverUnderCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
    'use strict';
    function calculate({home,away,line,total,progress,timeMode='elapsed'}){
        const values=[home,away,line,total,progress];
        if(values.some(v=>v===null||v===undefined||String(v).trim()===''))throw Error('점수, 기준점, 전체 진행량, 현재 진행량을 모두 입력하세요.');
        [home,away,line,total,progress]=values.map(Number);
        if([home,away,line,total,progress].some(v=>!Number.isFinite(v)))throw Error('숫자를 확인하세요.');
        if(!Number.isSafeInteger(home)||!Number.isSafeInteger(away)||home<0||away<0)throw Error('팀 점수는 0 이상의 정수로 입력하세요.');
        if(line<0||total<=0||progress<0||progress>total)throw Error('기준점은 0 이상, 진행량은 전체 범위 안에서 입력하세요.');
        if(!['elapsed','remaining'].includes(timeMode))throw Error('진행 방식이 올바르지 않습니다.');
        const elapsed=timeMode==='remaining'?total-progress:progress,current=home+away;
        if(elapsed<=0)throw Error('진행된 구간이 있어야 계산할 수 있습니다.');
        const remaining=total-elapsed,rate=current/elapsed,projected=remaining===0?current:rate*total,difference=projected-line;
        if(!Number.isFinite(projected))throw Error('진행량을 확인하세요.');
        return {current,line,total,elapsed,remaining,rate,projected,difference,comparison:Math.abs(difference)<1e-9?'equal':difference>0?'over':'under',pointsToOver:Math.max(0,Math.floor(line-current)+1),complete:remaining===0};
    }
    return {calculate};
});
