import React, {useSyncExternalStore} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {Theme} from '@astryxdesign/core/theme';
import {TextInput} from '@astryxdesign/core/TextInput';
import {IconButton} from '@astryxdesign/core/IconButton';
import {Button} from '@astryxdesign/core/Button';
import {Selector} from '@astryxdesign/core/Selector';
import {InternationalizationProvider} from '@astryxdesign/core/i18n';
import {neutralTheme} from '@astryxdesign/theme-neutral/built';
import korean from '@astryxdesign/core/locales/ko-KR.json';
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import '@astryxdesign/theme-neutral/theme.css';
import './astryx-theme.css';

// The score center owns product state; React owns only these three control islands.
// With the bundle unavailable, the existing HTML controls remain fully usable.
window.SportonAstryx = {
    mount(center, core, app) {
        let snapshot;
        const listeners = new Set();
        const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener); };
        const getSnapshot = () => snapshot;
        const sync = () => {
            const next = {query:center.query, league:center.leagueId, region:center.region, busy:center.busy};
            if (snapshot && Object.keys(next).every(key => next[key] === snapshot[key])) return;
            snapshot = next;
            listeners.forEach(listener => listener());
        };
        sync();
        const changeLeague = value => {
            const league = core.LEAGUES.find(item => item.id === value);
            center.leagueId = league?.id || '';
            center.activeTeam = '';
            center.region = league?.region || 'all';
            app.filterSport(league?.sport || 'all');
            center.saveLocation();
        };
        const groups = ['soccer','basketball','baseball','volleyball','hockey','football'].map(sport => ({
            type:'section', title:({soccer:'축구',basketball:'농구',baseball:'야구',volleyball:'배구',hockey:'하키',football:'미식축구'})[sport],
            options:core.LEAGUES.filter(league => league.sport === sport).map(league => ({value:league.id,label:league.name}))
        })).filter(group => group.options.length);
        const options = [{value:'',label:'모든 리그'}, ...groups];
        function Search() {
            const state = useSyncExternalStore(subscribe, getSnapshot);
            return <TextInput id="scoreSearch" label="팀 또는 리그 검색" isLabelHidden type="search" size="lg"
                value={state.query} placeholder="팀 또는 리그 검색" startIcon="search" hasClear maxLength={80}
                enterKeyHint="search" width="100%" onChange={value => {
                    center.query = value.slice(0,80); center.render(); center.saveLocation();
                }} />;
        }
        function Filters() {
            const state = useSyncExternalStore(subscribe, getSnapshot);
            return <div className="astryx-filter-fields">
                <Selector label="리그" value={state.league} options={options} onChange={changeLeague}
                    hasSearch searchPlaceholder="리그 이름 검색" emptySearchText="일치하는 리그가 없습니다"
                    size="lg" width="100%" presentation="adaptive" />
                <div className="astryx-region-field"><span className="astryx-field-label" id="regionFilterLabel">지역</span>
                    <div className="astryx-region-buttons" role="group" aria-labelledby="regionFilterLabel">
                        {[['all','전체'],['kr','국내'],['world','해외']].map(([value,label]) =>
                            <Button key={value} label={label} size="lg" variant={state.region===value?'primary':'secondary'}
                                aria-pressed={state.region===value} onClick={() => {
                                    center.region=value; center.leagueId=''; center.activeTeam=''; center.saveLocation(); center.load();
                                }} />)}
                    </div>
                </div>
                <Button label="초기화" size="lg" variant="ghost" className="astryx-filter-reset" onClick={() => changeLeague('')} />
            </div>;
        }
        const compact=window.matchMedia('(max-width: 768px)');
        const subscribeCompact=listener => {compact.addEventListener('change',listener);return () => compact.removeEventListener('change',listener);};
        const RefreshIcon=() => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5M6.1 6.1A8 8 0 0 1 19.7 12M4.3 12A8 8 0 0 0 17.9 17.9" /></svg>;
        function Refresh() {
            const state = useSyncExternalStore(subscribe, getSnapshot);
            const isCompact=useSyncExternalStore(subscribeCompact,() => compact.matches);
            const props={id:'scoreRefresh',label:'새로고침','aria-label':'경기 새로고침',size:'lg',variant:'secondary',className:'astryx-refresh-button',isLoading:state.busy,onClick:() => center.load(true)};
            return isCompact?<IconButton {...props} icon={<RefreshIcon/>}/>:<Button {...props} icon={<RefreshIcon/>}/>;
        }
        function Providers({children}) {
            return <Theme theme={neutralTheme} mode="dark"><InternationalizationProvider locale="ko-KR" messages={{'ko-KR':korean}}>{children}</InternationalizationProvider></Theme>;
        }
        const restoreSearchFocus=document.activeElement?.id==='scoreSearch';
        const toolbar = document.getElementById('scoreToolbar');
        const nodes = [toolbar.querySelector('.score-search'), toolbar.querySelector('.score-extra-content'), document.getElementById('scoreRefresh')];
        const components = [Search, Filters, Refresh];
        const classes = ['astryx-search-mount','score-extra-content astryx-filters-mount','astryx-refresh-mount'];
        nodes.forEach((node,index) => {
            const host=document.createElement('div'); host.className='astryx-sporton '+classes[index];
            node.replaceWith(host);
            flushSync(() => createRoot(host).render(<Providers>{React.createElement(components[index])}</Providers>));
        });
        if(restoreSearchFocus)document.getElementById('scoreSearch').focus({preventScroll:true});
        this.sync = sync;
        document.body.classList.add('astryx-controls-ready');
    }
};

window.dispatchEvent(new Event('sporton:astryx-ready'));
