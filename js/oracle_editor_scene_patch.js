(function(){
  'use strict';
  const OVERRIDE_KEY='sagaAtlasOracleTableOverridesV1';
  const $=id=>document.getElementById(id);
  const tables=()=>window.SCENE_TABLES||{};
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pathKey=path=>path.join(' > ');
  const displayNames={
    'Miscellaneous':'Clues & Complications',
    'Exploration':'Locations',
    '📚 Legacy / General':'📚 Story Beats'
  };
  const labelFor=name=>displayNames[name]||name;
  function getByPath(path){return path.reduce((a,k)=>a&&a[k],tables());}
  function setByPath(path,value){let o=tables(); for(let i=0;i<path.length-1;i++){o=o[path[i]]||(o[path[i]]={});} o[path[path.length-1]]=value;}
  function loadOverrides(){try{return JSON.parse(localStorage.getItem(OVERRIDE_KEY)||'{}')}catch(e){return{}}}
  function saveOverrides(o){localStorage.setItem(OVERRIDE_KEY,JSON.stringify(o));}
  function applyOverrides(){const o=loadOverrides(); Object.keys(o).forEach(k=>{const path=k.split(' > '); if(Array.isArray(o[k])) setByPath(path,o[k]);});}
  function isObj(v){return v&&typeof v==='object'&&!Array.isArray(v)}
  function matchesFilter(k,v,path,filter){const hay=path.concat(k,labelFor(k)).join(' ').toLowerCase(); if(!filter||hay.includes(filter))return true; if(Array.isArray(v)) return v.some(x=>String(x).toLowerCase().includes(filter)); return Object.entries(v||{}).some(([ck,cv])=>matchesFilter(ck,cv,path.concat(k),filter));}
  function ensureModal(){
    if($('oracleTableModal'))return;
    const div=document.createElement('div'); div.id='oracleTableModal'; div.className='oracle-table-modal-backdrop'; div.hidden=true;
    div.innerHTML=`<div class="oracle-table-modal" role="dialog" aria-modal="true" aria-labelledby="oracleTableModalTitle">
      <div class="modal-title-row"><h2 id="oracleTableModalTitle">Oracle Table</h2><button id="oracleTableClose" class="secondary" type="button">Close</button></div>
      <p id="oracleTablePath" class="small"></p>
      <div class="oracle-table-modal-actions button-row">
        <button id="oracleTableEdit" class="secondary" type="button">Edit List</button>
        <button id="oracleTableSave" type="button" hidden>Save List</button>
        <button id="oracleTableCancel" class="secondary" type="button" hidden>Cancel</button>
        <button id="oracleTableRoll" class="secondary" type="button">Roll This Table</button>
      </div>
      <div id="oracleTableReadOnly" class="oracle-table-list"></div>
      <textarea id="oracleTableEditor" class="oracle-table-editor" hidden spellcheck="true"></textarea>
      <p class="small">Edit one option per line. Changes are saved locally in this browser and applied over the built-in table on load. Export your campaign JSON after editing if you want to move these edits to another device.</p>
    </div>`;
    document.body.appendChild(div);
    $('oracleTableClose').onclick=closeModal; div.addEventListener('click',e=>{if(e.target===div) closeModal();});
    $('oracleTableEdit').onclick=()=>toggleEdit(true); $('oracleTableCancel').onclick=()=>toggleEdit(false); $('oracleTableSave').onclick=saveCurrentTable;
    $('oracleTableRoll').onclick=()=>{const p=(div.dataset.path||'').split(' > ').filter(Boolean); const vals=getByPath(p); if(Array.isArray(vals)&&typeof window.rollTable==='function') window.rollTable(p,vals); closeModal();};
  }
  function closeModal(){const m=$('oracleTableModal'); if(m)m.hidden=true;}
  function toggleEdit(on){$('oracleTableReadOnly').hidden=on; $('oracleTableEditor').hidden=!on; $('oracleTableSave').hidden=!on; $('oracleTableCancel').hidden=!on; $('oracleTableEdit').hidden=on; if(on) $('oracleTableEditor').focus();}
  function openTableModal(path){
    ensureModal(); const vals=getByPath(path)||[]; const m=$('oracleTableModal'); m.dataset.path=pathKey(path);
    $('oracleTableModalTitle').textContent=path[path.length-1]+' ('+vals.length+')'; $('oracleTablePath').textContent=pathKey(path).replace(/^Miscellaneous/, 'Clues & Complications').replace(/^Exploration/, 'Locations');
    $('oracleTableReadOnly').innerHTML='<ol>'+vals.map(v=>'<li>'+esc(v)+'</li>').join('')+'</ol>'; $('oracleTableEditor').value=vals.join('\n'); toggleEdit(false); m.hidden=false; $('oracleTableClose').focus();
  }
  function saveCurrentTable(){
    const m=$('oracleTableModal'); const key=m.dataset.path; const path=key.split(' > ').filter(Boolean);
    const vals=$('oracleTableEditor').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
    if(!vals.length){alert('The table needs at least one option.');return;}
    setByPath(path,vals); const o=loadOverrides(); o[key]=vals; saveOverrides(o); openTableModal(path);
    if(typeof window.buildOracleTree==='function') window.buildOracleTree();
    try{if(typeof window.setStatus==='function') window.setStatus('Saved oracle table edits locally');}catch(e){}
  }
  function makeTableRow(key,value,path){
    const fullPath=path.concat(key);
    const row=document.createElement('div'); row.className='table-row oracle-table-row';
    const label=document.createElement('span'); label.className='oracle-table-label'; label.textContent=`${key} (${value.length})`;
    const actions=document.createElement('span'); actions.className='oracle-table-actions';
    const edit=document.createElement('button'); edit.className='tiny secondary oracle-table-edit'; edit.type='button'; edit.textContent='✎'; edit.title='View/Edit list'; edit.setAttribute('aria-label','View/Edit list'); edit.onclick=()=>openTableModal(fullPath);
    const roll=document.createElement('button'); roll.className='tiny secondary'; roll.type='button'; roll.textContent='🎲'; roll.title='Roll'; roll.setAttribute('aria-label','Roll'); roll.onclick=()=>{try{if(typeof window.recordOracleUse==='function') window.recordOracleUse(path[0]||key); if(typeof window.rollTable==='function') window.rollTable(fullPath,value);}catch(e){console.error(e)}};
    actions.append(edit,roll); row.append(label,actions); return row;
  }
  const layout=[
    {label:'⭐ Core Solo',children:['Core Oracles','Core Solo Engine','Campaign Intelligence Engine']},
    {label:'☠ Threats & Conflict',children:['Conflict','Miscellaneous','Mysteries & Coverups','Danger Situations','Horror Escalation','Fear and Dread']},
    {label:'📚 Story Beats',children:['Story','Adventure','Exploration','Missions','Mission Aftermath']},
    {label:'👥 Characters & Society',children:['Characters','Crew & NPCs','Corporate Powers','Frontier Society','Law, Marshals & Crime','Marines & Security','Factions']},
    {label:'📖 Story Director',children:['Campaign','Plot Engine','Conflict Architecture']},
    {label:'👥 Encounters',children:['Creatures','Xeno-Biology','Androids & AI']},
    {label:'🌌 Locations',children:['Location Themes','Sector & System Creation','Worlds & Colonies','Planets','Settlements','Colonies and Expeditions','Districts','Vaults / Ruins']},
    {label:'🚀 Space Operations',children:['Space Encounters','Space Operations','Starships','Derelicts','Trade & Cargo','Industrial Hazards']}
  ];
  function buildNode(key,value,path,filter){
    if(!matchesFilter(key,value,path,filter))return null;
    if(Array.isArray(value))return makeTableRow(key,value,path);
    const details=document.createElement('details'); details.className='oracle-node'; if(filter)details.open=true;
    const summary=document.createElement('summary'); const label=document.createElement('span'); label.textContent=labelFor(key);
    const rollAll=document.createElement('button'); rollAll.className='tiny secondary'; rollAll.type='button'; rollAll.textContent='🎲🎲'; rollAll.title='Roll group'; rollAll.onclick=e=>{e.preventDefault(); e.stopPropagation(); if(typeof window.recordOracleUse==='function') window.recordOracleUse(path[0]||key); if(typeof window.rollGroup==='function') window.rollGroup(path.concat(key),value);};
    summary.append(label,rollAll); details.appendChild(summary);
    Object.entries(value||{}).forEach(([ck,cv])=>{const child=buildNode(ck,cv,path.concat(key),filter); if(child)details.appendChild(child);});
    return details.children.length>1?details:null;
  }
  function buildParent(parent,filter){
    const details=document.createElement('details'); details.className='oracle-node oracle-parent'; if(filter)details.open=true;
    const summary=document.createElement('summary'); summary.innerHTML='<span>'+esc(parent.label)+'</span>'; details.appendChild(summary);
    parent.children.forEach(group=>{const val=tables()[group]; if(!val)return; const node=buildNode(group,val,[],filter); if(node)details.appendChild(node);});
    return details.children.length>1?details:null;
  }
  function installOracleTreeOverride(){
    applyOverrides();
    window.buildOracleTree=function(){
      const root=$('oracleTree'); if(!root)return; root.innerHTML=''; const filter=($('oracleFilter')&&$('oracleFilter').value||'').trim().toLowerCase();
      layout.forEach(parent=>{const node=buildParent(parent,filter); if(node)root.appendChild(node);});
      if(!root.children.length){const empty=document.createElement('p'); empty.className='small'; empty.textContent='No oracle tables match the filter.'; root.appendChild(empty);}
    };
    window.buildOracleTree();
  }
  function addSceneContextUi(){
    if($('sceneOracleContextPanel'))return;
    const target=$('campaignIntelligencePanel')||($('currentThread')&&$('currentThread').closest('label')); if(!target)return;
    const d=document.createElement('details'); d.id='sceneOracleContextPanel'; d.className='cie-panel scene-oracle-context'; d.open=true;
    d.innerHTML=`<summary>Scene Builder Context <span class="small">— oracle-weighted factions, locations, districts, mysteries</span></summary>
      <div class="cie-grid">
        <label>Faction Pressure<select id="cieFaction"><option>Auto / Roll faction</option><option>Corporate employer</option><option>Colonial authority</option><option>Frontier marshal / law office</option><option>Labor bloc or union</option><option>Criminal syndicate</option><option>Rival crew</option><option>Military command</option><option>Unknown xeno influence</option></select></label>
        <label>District / Zone<select id="cieDistrict"><option>Auto / Roll district</option><option>Access</option><option>Community</option><option>Engineering</option><option>Living</option><option>Medical</option><option>Operations</option><option>Production</option><option>Research</option><option>Security</option><option>Commercial</option></select></label>
        <label>Location Detail<select id="cieLocation"><option>Auto / Roll location</option><option>Colony edge</option><option>Derelict compartment</option><option>Station maintenance corridor</option><option>Corporate office</option><option>Remote survey site</option><option>Worker barracks</option><option>Landing pad</option><option>Cold storage</option><option>Command center</option></select></label>
        <label>Mystery Focus<select id="cieMystery"><option>Auto / Roll mystery</option><option>Missing person</option><option>Altered records</option><option>Hidden cargo</option><option>Biological anomaly</option><option>Sabotage</option><option>False distress call</option><option>Illegal research</option><option>Ancient signal</option><option>Corporate coverup</option></select></label>
      </div>
      <p class="small">The Scene Builder uses these fields to bias next-step prompts toward factions, districts, locations, and mysteries instead of producing disconnected random results.</p>`;
    target.after(d);
  }
  function safePick(a){return Array.isArray(a)&&a.length?a[Math.floor(Math.random()*a.length)]:'';}
  function tableAny(paths){for(const p of paths){const v=getByPath(p); if(Array.isArray(v)&&v.length)return safePick(v);} return '';}
  function contextValues(){
    const val=id=>($(id)&&$(id).value)||'';
    const district= /^Auto/.test(val('cieDistrict')) ? tableAny([['Districts','District Type']]) : val('cieDistrict');
    const districtFirst = district && !/^Auto/.test(district) ? tableAny([['Districts',district,'First Look'],['Districts',district+' > First Look']]) : '';
    return {
      faction: /^Auto/.test(val('cieFaction')) ? tableAny([['Factions','Faction Type'],['Corporate Powers','Corporate Pressure'],['Frontier Society','Social Tension']]) : val('cieFaction'),
      district: district || 'Unclear zone',
      districtFirst: districtFirst,
      location: /^Auto/.test(val('cieLocation')) ? tableAny([['Settlements','Settlement Type'],['Derelicts','Location'],['Location Themes','Theme Detail'],['Space Operations','Dockside Complication']]) : val('cieLocation'),
      mystery: /^Auto/.test(val('cieMystery')) ? tableAny([['Mysteries & Coverups','Clue Type'],['Mysteries & Coverups','Coverup Move'],['Miscellaneous','Story Clue']]) : val('cieMystery'),
      roleplay: tableAny([['Campaign Intelligence Engine','Roleplay Option'],['Crew & NPCs','Relationship Spark'],['Characters','Disposition']]),
      next: tableAny([['Campaign Intelligence Engine','Recommended Next Step'],['Adventure','Complication'],['Missions','Twist']]),
      director: tableAny([['Campaign Intelligence Engine','Director Move'],['Plot Engine','Scene Driver']]),
      clue: tableAny([['Miscellaneous','Story Clue'],['Mysteries & Coverups','Clue Type']]),
      cost: tableAny([['Conflict','Meaningful Cost'],['Miscellaneous','Pay the Price']])
    };
  }
  function buildSceneGuidance(ctx){
    return `\n\nScene Builder Oracle Weave\nFaction Pressure: ${ctx.faction||'Unclear'}\nDistrict / Zone: ${ctx.district||'Unclear'}${ctx.districtFirst?' — '+ctx.districtFirst:''}\nLocation Detail: ${ctx.location||'Unclear'}\nMystery Focus: ${ctx.mystery||'Unclear'}\nClue Vector: ${ctx.clue||'Add one concrete clue'}\nDirector Move: ${ctx.director||'Put pressure on the current objective'}\n\nRoleplay Options\n1. Question or bargain with someone tied to ${ctx.faction||'the faction pressure'}; reveal what they need, fear, or are hiding.\n2. Investigate the ${ctx.location||'location'} physically; expose a clue but risk a cost.\n3. Use the ${ctx.district||'district'} as leverage, cover, or a hazard; let the environment matter.\n\nRecommended Next Steps\n- Secure leverage: protect a witness, log, cargo tag, sensor record, or access code.\n- Expose truth: connect the clue to the mystery before the faction can bury it.\n- Protect the crew: choose who gets put at risk and what gets left behind.\n- Create obligation: accept help, owe a debt, or give a rival a reason to return.\n\nLikely Cost if ignored: ${ctx.cost||'The opposition gains time, evidence vanishes, or a vulnerable ally pays the price.'}\nNext-step cue: ${ctx.next||'Advance toward a place where roleplay, exploration, and danger collide.'}`;
  }
  function installSceneDirectorAppend(){
    document.addEventListener('click',function(ev){
      const btn=ev.target&&ev.target.closest&&ev.target.closest('#cieSuggest,#cieGenerate,#generateScene'); if(!btn)return;
      setTimeout(()=>{
        const ctx=contextValues(); const extra=buildSceneGuidance(ctx); const out=$('oracleOutput'); const card=$('sceneCard');
        if(card && btn.id!=='cieSuggest' && card.textContent && !card.textContent.includes('Scene Builder Oracle Weave')) card.textContent += extra;
        if(out && btn.id==='cieSuggest'){ if(!out.dataset.hasRolls){out.textContent=''; out.dataset.hasRolls='true';} if(!out.textContent.includes('Scene Builder Oracle Weave')) out.textContent += (out.textContent?'\n\n---\n':'')+extra.trim(); }
      },100);
    },true);
  }
  function boot(){ensureModal(); addSceneContextUi(); installOracleTreeOverride(); installSceneDirectorAppend();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot); else boot();
})();
