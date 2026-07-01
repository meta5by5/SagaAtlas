(function(){
  'use strict';
  const STORE='sagaAtlasCieSettingsV1';
  const $=id=>document.getElementById(id);
  const tables=()=>window.SCENE_TABLES||{};
  const pick=a=>Array.isArray(a)&&a.length?a[Math.floor(Math.random()*a.length)] : '';
  const table=(group,name)=>{const g=tables()[group]||{}; return g[name]||[];};
  const settingDefaults={genre:'Hostile-compatible frontier sci-fi',mode:'Exploration mystery',tone:'Gritty professional survival',roleplay:'Guided',stakes:'Personal + mission + colony',clock:'Balanced'};
  function loadSettings(){try{return Object.assign({},settingDefaults,JSON.parse(localStorage.getItem(STORE)||'{}'));}catch(e){return {...settingDefaults};}}
  function saveSettings(s){localStorage.setItem(STORE,JSON.stringify(s));}
  function injectDirectorUi(){
    if($('cieGenre')) return;
    const current=$('currentThread'); if(!current) return;
    const wrap=document.createElement('details'); wrap.id='campaignIntelligencePanel'; wrap.open=true; wrap.className='cie-panel';
    wrap.innerHTML=`<summary>Campaign Intelligence Engine <span class="small">— advisor layer used by Story Director</span></summary>
      <p class="small">Normal workflow: use <b>Story Director</b>. Open this advanced CIE panel only to tune the underlying genre lens, scene mode, stakes, pacing, or to request raw recommendations without the full Director package.</p>
      <div class="cie-grid">
        <label>Genre Lens<select id="cieGenre"><option>Hostile-compatible frontier sci-fi</option><option>Corporate space horror</option><option>Frontier law and trade</option><option>Exploration and first contact</option><option>Military rescue operation</option><option>Derelict salvage mystery</option></select></label>
        <label>Scene Mode<select id="cieMode"><option>Exploration mystery</option><option>Investigation</option><option>Social pressure</option><option>Survival hazard</option><option>Action / security operation</option><option>Trade and logistics</option><option>Horror escalation</option></select></label>
        <label>Tone<select id="cieTone"><option>Gritty professional survival</option><option>Quiet dread</option><option>Industrial realism</option><option>Hard moral choices</option><option>Adventure pulp with consequences</option></select></label>
        <label>Guidance<select id="cieRoleplay"><option>Guided</option><option>Light touch</option><option>Strong recommendations</option></select></label>
        <label>Stakes Focus<select id="cieStakes"><option>Personal + mission + colony</option><option>Crew survival</option><option>Corporate leverage</option><option>Colonial community</option><option>Alien unknown</option><option>Law and reputation</option></select></label>
        <label>Pacing Bias<select id="cieClock"><option>Balanced</option><option>Build tension slowly</option><option>Escalate quickly</option><option>Recovery / aftermath</option></select></label>
      </div>
      <div class="cie-actions button-row"><button id="cieSuggest" type="button" class="secondary">Suggest Options</button><button id="cieGenerate" type="button">Scene Director</button></div>
      <p class="small">Uses campaign state, recent scene rhythm, and genre-weighted oracles to recommend playable choices and next steps.</p>`;
    current.closest('label').after(wrap);
    const settings=loadSettings();
    ['Genre','Mode','Tone','Roleplay','Stakes','Clock'].forEach(k=>{const el=$('cie'+k); if(el){el.value=settings[k.toLowerCase()]; el.addEventListener('change',()=>{const s=loadSettings(); s[k.toLowerCase()]=el.value; saveSettings(s);});}});
    $('cieSuggest').addEventListener('click',ev=>{ev.preventDefault(); ev.stopPropagation(); generateCieScene(true);});
    $('cieGenerate').addEventListener('click',ev=>{ev.preventDefault(); ev.stopPropagation(); generateCieScene(false);});
  }
  function v(id){return ($(id)&&$(id).value)||'';}
  function n(id){return Number(v(id)||0);}
  function recentSummary(){
    try{const saved=JSON.parse(localStorage.getItem('sagaAtlasSceneOracleV1')||'{}'); const log=saved.sceneLog||[]; return log.slice(-3).map(x=>`#${x.number} ${x.summary||x.phase||''}`).join('; ') || 'No recent scenes yet.';}catch(e){return 'No recent scenes yet.';}
  }
  function weightedSituation(mode){
    if(/Trade/.test(mode)) return [pick(table('Trade & Cargo','Cargo Problem')),pick(table('Trade & Cargo','Trade Opportunity')),pick(table('Corporate Powers','Corporate Pressure'))].filter(Boolean).join(' / ');
    if(/Action|security/.test(mode)) return [pick(table('Marines & Security','Security Operation')),pick(table('Marines & Security','Tactical Twist')),pick(table('Conflict','Opposition Tactic'))].filter(Boolean).join(' / ');
    if(/Horror/.test(mode)) return [pick(table('Horror Escalation','Escalation Beat')),pick(table('Horror Escalation','Fear Without Gore')),pick(table('Xeno-Biology','Xeno Clue'))].filter(Boolean).join(' / ');
    if(/Social/.test(mode)) return [pick(table('Frontier Society','Social Tension')),pick(table('Frontier Society','Public Reaction')),pick(table('Crew & NPCs','NPC Drive'))].filter(Boolean).join(' / ');
    if(/Survival/.test(mode)) return [pick(table('Industrial Hazards','Worksite Failure')),pick(table('Industrial Hazards','Survival Resource')),pick(table('Worlds & Colonies','Colony Problem'))].filter(Boolean).join(' / ');
    if(/Investigation/.test(mode)) return [pick(table('Mysteries & Coverups','Clue Type')),pick(table('Mysteries & Coverups','Coverup Move')),pick(table('Campaign Intelligence Engine','Recommended Next Step'))].filter(Boolean).join(' / ');
    return [pick(table('Exploration','Discovery')),pick(table('Exploration','Route Hazard')),pick(table('Worlds & Colonies','Colony Problem'))].filter(Boolean).join(' / ');
  }
  function pressureRead(threat,mystery,clock){
    let out=[];
    if(threat>=7) out.push('Threat is high: open with visible danger or a hard deadline.');
    else if(threat>=4) out.push('Threat is moderate: show risk before impact.');
    else out.push('Threat is low: let curiosity and procedure lead.');
    if(mystery>=6) out.push('Mystery is high: answer one question and raise a better one.');
    if(/Escalate/.test(clock)) out.push('Pacing bias: skip a comfort beat and force a decision.');
    if(/slowly/.test(clock)) out.push('Pacing bias: reveal through sensory detail and social pressure.');
    if(/Recovery/.test(clock)) out.push('Pacing bias: aftermath should create the next obligation.');
    return out.join(' ');
  }
  function buildOptions(guidance){
    const opts=[pick(table('Campaign Intelligence Engine','Roleplay Option')),pick(table('Campaign Intelligence Engine','Recommended Next Step')),pick(table('Campaign Intelligence Engine','Director Move')),pick(table('Conflict','Meaningful Cost'))].filter(Boolean);
    if(guidance==='Light touch') return opts.slice(0,3).map((o,i)=>`${i+1}. ${o}`).join('\n');
    if(guidance==='Strong recommendations') return opts.concat([pick(table('Mission Aftermath','Aftermath Result')),pick(table('Story','Ending Hook'))]).filter(Boolean).map((o,i)=>`${i+1}. ${o}`).join('\n');
    return opts.map((o,i)=>`${i+1}. ${o}`).join('\n');
  }
  function generateCieScene(optionsOnly){
    try{ if(typeof window.readFormAndSave==='function') window.readFormAndSave(); }catch(e){}
    const settings=loadSettings();
    const action=pick((tables()['Core Oracles']||{}).Action); const theme=pick((tables()['Core Oracles']||{}).Theme); const desc=pick((tables()['Core Oracles']||{}).Descriptor); const focus=pick((tables()['Core Oracles']||{}).Focus);
    const mode=settings.mode, threat=n('threatLevel'), mystery=n('mysteryLevel');
    const situation=weightedSituation(mode);
    const director=pick(table('Campaign Intelligence Engine','Director Move'));
    const momentum=pick(table('Campaign Intelligence Engine','Momentum Adjustment'));
    const clue=pick(table('Mysteries & Coverups','Clue Type'))||pick((tables().Miscellaneous||{})['Story Clue']);
    const consequence=pick((tables().Miscellaneous||{})['Pay the Price'])||pick(table('Conflict','Meaningful Cost'));
    const next=pick(table('Story','Ending Hook'))||pick(table('Campaign Intelligence Engine','Recommended Next Step'));
    const options=buildOptions(settings.roleplay);
    const sceneNo=(JSON.parse(localStorage.getItem('sagaAtlasSceneOracleV1')||'{}').sceneLog||[]).length+1;
    const header=optionsOnly?'Campaign Intelligence Suggestions':`Scene ${sceneNo}: ${v('phase')} — ${v('intent')} / ${mode}`;
    const text=`${header}\n\nGenre Lens: ${settings.genre}\nTone: ${settings.tone}\nStakes Focus: ${settings.stakes}\nCampaign / Region: ${v('campaignName')||'Unspecified frontier'}\nPlanet / Biome: ${v('planet')}; ${v('biome')}\nLocation: ${v('locationType')}; ${v('surroundings')}\nThreat ${threat}/10, Mystery ${mystery}/10\n\nOracle Spine:\nAction ${action} / Theme ${theme} / Descriptor ${desc} / Focus ${focus}\n\nCampaign State Read:\n${pressureRead(threat,mystery,settings.clock)}\nRecent continuity: ${recentSummary()}\nCurrent thread: ${v('currentThread')||'No active thread set.'}\n\nScene Situation:\n${situation}.\n\nDirector Move:\n${director}.\n\nClue / Leverage:\n${clue}. Use this to connect the scene to an existing entity, document, guide note, or unresolved thread.\n\nRoleplay Options and Next Steps:\n${options}\n\nDecision Design:\nFrame the choice around mission progress, crew safety, and leverage. A good result should solve one immediate problem while creating a new obligation.\n\nLikely Consequence / Clock Change:\n${consequence}. ${momentum}.\n\nRecommended Follow-up:\n${next}.`;
    if(typeof window.addOutput==='function' && !optionsOnly){
      window.addOutput(sceneNo,text,`${mode} / ${v('locationType')}`,next);
      if(typeof window.applyConsequence==='function') window.applyConsequence(String(consequence||'threat'));
      if(typeof window.advancePhase==='function') window.advancePhase(true);
      if(typeof window.saveState==='function') window.saveState();
      if(typeof window.render==='function') window.render();
    } else {
      const out=$('oracleOutput'); if(out){ if(!out.dataset.hasRolls){out.textContent='';out.dataset.hasRolls='true';} out.textContent+=(out.textContent?'\n\n---\n':'')+text; }
      if(typeof window.setStatus==='function') window.setStatus('Generated campaign intelligence suggestions');
    }
  }
  function interceptTopButtons(){
    document.addEventListener('click',function(ev){
      const btn=ev.target&&ev.target.closest&&ev.target.closest('#generateScene');
      if(!btn) return;
      ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); generateCieScene(false); return false;
    },true);
  }
  function enhanceOracleHeader(){
    const h=document.querySelector('.oracle-tree-header h2'); if(h) h.textContent='Campaign Intelligence Oracles';
    const f=$('oracleFilter'); if(f) f.placeholder='Search categories, genre modules, and tables...';
    const p=document.querySelector('#oracleLibraryTab .section-header p.small'); if(p) p.textContent='Oracles are grouped by decision purpose. Use Scene Director for context-aware adventure guidance.';
  }
  function boot(){
    injectDirectorUi(); enhanceOracleHeader(); interceptTopButtons();
    try{ if(typeof window.buildOracleTree==='function') window.buildOracleTree(); }catch(e){}
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
