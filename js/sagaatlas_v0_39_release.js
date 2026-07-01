(function(){
  'use strict';
  const APP_STORE='sagaAtlasSceneOracleV1';
  const SD_STORE='sagaAtlasStoryDirectorV2';
  const $=(id)=>document.getElementById(id);
  const qsa=(sel,root=document)=>Array.from(root.querySelectorAll(sel));
  const esc=(s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normTag=(t)=>String(t||'').replace(/^#/,'').trim().toLowerCase();
  function loadApp(){try{return JSON.parse(localStorage.getItem(APP_STORE)||'{}')||{};}catch(e){return {};}}
  function saveApp(app){try{localStorage.setItem(APP_STORE,JSON.stringify(app));}catch(e){}}
  function loadSD(){try{return JSON.parse(localStorage.getItem(SD_STORE)||'{}')||{};}catch(e){return {};}}
  function saveSD(sd){try{localStorage.setItem(SD_STORE,JSON.stringify(sd));}catch(e){}}
  function entities(){const app=loadApp();return (((app.entities||{}).items)||[]).filter(Boolean);}
  function hasTag(ent,tag){return (Array.isArray(ent.tags)?ent.tags:[]).some(t=>normTag(t)===normTag(tag));}
  function isNPCCharacter(ent){return normTag(ent.type)==='npc' && hasTag(ent,'character');}
  function characterOptions(){return entities().filter(isNPCCharacter).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||'')));}
  function currentEntity(){try{const app=loadApp();const es=app.entities||{};return (es.items||[]).find(e=>e.id===es.activeId)||null;}catch(e){return null;}}
  function activeEntityCrewAssignments(ent){if(!ent)return[];const sd=loadSD();const rows=((((sd||{}).colony||{}).crewRows)||[]);return rows.map((r,i)=>({...r,index:i})).filter(r=>r.characterId===ent.id || (!r.characterId && r.name && ent.name && String(r.name).trim().toLowerCase()===String(ent.name).trim().toLowerCase()));}

  function styleOnce(){
    if($('sagaRelease39Styles'))return;
    const css=document.createElement('style');css.id='sagaRelease39Styles';css.textContent=`
      .saga-r39-lifeform-filters{display:flex;gap:.75rem;align-items:center;flex-wrap:wrap;margin:.4rem 0 .5rem;padding:.35rem .5rem;border:1px solid rgba(255,255,255,.12);border-radius:8px;background:rgba(255,255,255,.03)}
      .saga-r39-lifeform-filters label{display:inline-flex;gap:.35rem;align-items:center;font-size:.85rem;margin:0}.saga-r39-lifeform-empty{margin:.5rem 0!important}.saga-r39-autogrow{resize:none;overflow:hidden;min-height:2.1em;line-height:1.35;max-height:4.8em}.saga-r39-crew-select{width:100%;min-width:11rem}.saga-r39-crew-snapshot table{width:100%;border-collapse:collapse}.saga-r39-crew-snapshot th,.saga-r39-crew-snapshot td{padding:.25rem;border-bottom:1px solid rgba(255,255,255,.1);vertical-align:top}.saga-r39-crew-snapshot input,.saga-r39-crew-snapshot select{width:100%;box-sizing:border-box}.saga-r39-entity-assignment{margin:.4rem 0 .75rem;padding:.55rem .65rem;border:1px solid rgba(255,255,255,.14);border-radius:10px;background:rgba(255,255,255,.035)}.saga-r39-entity-assignment h4{margin:.1rem 0 .35rem;font-size:.95rem}.saga-r39-assignment-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:.35rem;font-size:.82rem;padding:.2rem 0;border-top:1px solid rgba(255,255,255,.08)}.saga-r39-assignment-row:first-of-type{border-top:none}.result-card .result-message,.roll-result .result-message,#diceResultToast strong,#diceResultCard strong{font-size:.82rem!important;line-height:1.05!important;white-space:normal!important;overflow-wrap:anywhere!important}`;
    document.head.appendChild(css);
  }

  function ensureLifeformControls(){
    const list=document.querySelector('.sd-lifeform-list'); if(!list)return;
    const details=list.closest('details')||list.parentElement; if(!details)return;
    let controls=details.querySelector('.saga-r39-lifeform-filters');
    if(!controls){
      controls=document.createElement('div');controls.className='saga-r39-lifeform-filters';
      controls.innerHTML='<span class="small"><b>Filter tags:</b></span><label><input type="checkbox" data-r39-lifeform-tag="lifeform" checked> #Lifeform</label><label><input type="checkbox" data-r39-lifeform-tag="encountered" checked> #Encountered</label>';
      list.parentNode.insertBefore(controls,list);
      controls.addEventListener('change',applyLifeformFilter);
    }
    applyLifeformFilter();
  }
  function applyLifeformFilter(){
    const list=document.querySelector('.sd-lifeform-list'); if(!list)return;
    const details=list.closest('details')||list.parentElement;
    const checked=qsa('[data-r39-lifeform-tag]',details).filter(cb=>cb.checked).map(cb=>normTag(cb.dataset.r39LifeformTag));
    let visible=0;
    qsa('.sd-lifeform-row',list).forEach(row=>{
      const text=(row.textContent||'').toLowerCase();
      const ok=checked.every(t=>text.includes('#'+t));
      row.style.display=ok?'':'none'; if(ok)visible++;
    });
    let empty=list.querySelector('.saga-r39-lifeform-empty');
    if(!visible){if(!empty){empty=document.createElement('p');empty.className='small saga-r39-lifeform-empty';list.appendChild(empty);}empty.textContent='No Encounter entities match the selected tag filter.';} else if(empty) empty.remove();
  }

  function patchMissionTextareas(){
    const ids=['missionSeed','worldSeed','paMissionSeed','paWorldSeed'];
    ids.map($).filter(Boolean).forEach(t=>{
      if(t.dataset.r39Grow==='1')return;t.dataset.r39Grow='1';t.classList.add('saga-r39-autogrow');t.rows=Math.min(3,Math.max(1,t.rows||1));
      const grow=()=>{t.style.height='auto'; const lh=parseFloat(getComputedStyle(t).lineHeight)||18; t.style.height=Math.min(t.scrollHeight,lh*3+14)+'px';};
      t.addEventListener('input',grow);setTimeout(grow,0);
    });
  }

  function crewRows(){const sd=loadSD(); if(!sd.colony)sd.colony={}; if(!Array.isArray(sd.colony.crewRows))sd.colony.crewRows=[{name:'',role:'',reactions:'',combat:'',loyalty:'',speed:'',toughness:'',savvy:'',xp:'',upgrades:''}]; return sd.colony.crewRows;}
  function saveCrewRows(rows){const sd=loadSD(); sd.colony=sd.colony||{}; sd.colony.crewRows=rows; saveSD(sd);}
  function characterSelect(row,i){
    const chars=characterOptions();
    const current=row.characterId || (chars.find(c=>row.name&&String(c.name||'').toLowerCase()===String(row.name).toLowerCase())||{}).id || '';
    const opts=['<option value="">Select NPC #character</option>'].concat(chars.map(c=>`<option value="${esc(c.id)}" ${c.id===current?'selected':''}>${esc(c.name||'Unnamed NPC')}</option>`));
    if(!chars.length)opts.push('<option value="" disabled>No NPC entities tagged #character</option>');
    return `<select class="saga-r39-crew-select" data-r39-crew="${i}:characterId">${opts.join('')}</select>`;
  }
  function crewSnapshotMarkup(){
    const rows=crewRows();
    const fields=['role','reactions','combat','loyalty','speed','toughness','savvy','xp','upgrades'];
    const heads=['Name','Role/Class','Reactions','Combat','Loyalty','Speed','Tough.','Savvy','XP','Upgrades'];
    const body=rows.map((r,i)=>`<tr><td>${characterSelect(r,i)}</td>${fields.map(k=>`<td><input data-r39-crew="${i}:${k}" value="${esc(r[k]||'')}"></td>`).join('')}</tr>`).join('');
    return `<details class="sd-collapse saga-r39-crew-snapshot" open><summary>Colony Crew Snapshot</summary><p class="small">Shared with the Colony worksheet. Name maps a crew row to an NPC entity tagged <b>#character</b>.</p><table><thead><tr>${heads.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table><div class="button-row sd-small-actions"><button type="button" class="secondary" data-r39-add-crew>Add Crew Row</button></div></details>`;
  }
  function ensurePartyCrewSnapshot(){ /* v0.40+ owns Crew Snapshot rendering. */ }
  function handleCrewInput(target){
    const key=target.getAttribute('data-r39-crew'); if(!key)return;
    const [idx,field]=key.split(':'); const rows=crewRows(); const i=Number(idx); if(!rows[i])return;
    if(field==='characterId'){
      rows[i].characterId=target.value;
      const ent=characterOptions().find(c=>c.id===target.value);
      rows[i].name=ent?ent.name:'';
    } else rows[i][field]=target.value;
    saveCrewRows(rows);
    patchEntityAssignmentPanel();
  }
  function addCrewRow(){const rows=crewRows(); rows.push({name:'',role:'',reactions:'',combat:'',loyalty:'',speed:'',toughness:'',savvy:'',xp:'',upgrades:''}); saveCrewRows(rows); const old=document.querySelector('#centerPartyView .saga-r39-crew-snapshot'); if(old)old.outerHTML=crewSnapshotMarkup();}

  function patchEntityAssignmentPanel(){ const existing=$('sagaR39CrewAssignment'); if(existing) existing.remove(); /* v0.40+ owns Crew Assignment rendering. */ }

  function actualOraclePaths(){
    const tables=window.SCENE_TABLES||{}; const out=[];
    function walk(obj,path=[]){Object.entries(obj||{}).forEach(([k,v])=>{if(Array.isArray(v))out.push(path.concat(k)); else if(v&&typeof v==='object')walk(v,path.concat(k));});}
    walk(tables); return out;
  }
  function patchSuggestOracles(){
    const btn=$('sdSuggestOracles'); if(!btn||btn.dataset.r39OracleBound==='1')return; btn.dataset.r39OracleBound='1';
    btn.addEventListener('click',()=>{
      setTimeout(()=>{
        const out=$('oracleOutput'); if(!out)return;
        const paths=actualOraclePaths();
        const preferred=['Location Themes > Sensory Detail','Districts > District Type','Mysteries & Coverups > Clue Type','Corporate Powers > Corporate Pressure','Danger Situations > Industrial Hazards','Story > Story Beat','Adventure > Complication'];
        const selected=[];
        preferred.forEach(p=>{const hit=paths.find(path=>path.join(' > ')===p); if(hit)selected.push(hit);});
        paths.forEach(p=>{if(selected.length<7 && !selected.some(s=>s.join('>')===p.join('>')))selected.push(p);});
        out.textContent='Recommended Oracles from Story Director\n'+selected.slice(0,7).map(p=>'• '+p.join(' > ')).join('\n')+'\n\nAll recommendations above exist in the Oracle tree. Use the 🎲 buttons in Oracles to roll them.';
      },30);
    },true);
  }

  let scheduled=false;
  function patchAll(){
    scheduled=false; styleOnce(); ensureLifeformControls(); patchMissionTextareas(); ensurePartyCrewSnapshot(); patchEntityAssignmentPanel(); patchSuggestOracles();
  }
  function schedule(){if(scheduled)return; scheduled=true; requestAnimationFrame(()=>setTimeout(patchAll,0));}
  document.addEventListener('input',ev=>{if(ev.target.matches('[data-r39-crew]'))handleCrewInput(ev.target); if(ev.target.matches('textarea'))setTimeout(patchMissionTextareas,0);},true);
  document.addEventListener('change',ev=>{if(ev.target.matches('[data-r39-crew]')){handleCrewInput(ev.target); schedule();} if(ev.target.matches('[data-r39-lifeform-tag]'))applyLifeformFilter();},true);
  document.addEventListener('click',ev=>{if(ev.target.closest('[data-r39-add-crew]')){ev.preventDefault();addCrewRow();} setTimeout(schedule,80);},true);
  const mo=new MutationObserver(schedule);
  function boot(){styleOnce(); patchAll(); mo.observe(document.body,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot); else boot();
})();
