(function(){
  'use strict';
  const APP_STORE='sagaAtlasSceneOracleV1';
  const SD_STORE='sagaAtlasStoryDirectorV2';
  const TPL_STORE='sagaAtlasEntityTemplatesV1';
  const $=id=>document.getElementById(id);
  const qsa=(sel,root=document)=>Array.from((root||document).querySelectorAll(sel));
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=s=>String(s||'').replace(/^#/,'').trim().toLowerCase();
  function loadJson(key, fallback){try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch(e){return fallback;}}
  function saveJson(key,val){try{localStorage.setItem(key,JSON.stringify(val));}catch(e){console.warn('Saga v0.40 save failed',key,e);}}
  function appState(){return loadJson(APP_STORE,{});}
  function sdState(){return loadJson(SD_STORE,{});}
  function saveSD(sd){saveJson(SD_STORE,sd);}
  function entityState(){try{if(typeof window.ensureEntityState==='function')return window.ensureEntityState();}catch(e){} const st=appState(); st.entities=st.entities||{items:[],activeId:null}; return st.entities;}
  function saveBaseState(){try{if(typeof window.saveState==='function')window.saveState();else saveJson(APP_STORE,appState());}catch(e){}}
  function entities(){const es=entityState();return Array.isArray(es.items)?es.items:[];}
  function activeEntity(){const es=entityState();return entities().find(e=>e.id===es.activeId)||null;}
  function hasTag(ent,tag){return (Array.isArray(ent&&ent.tags)?ent.tags:[]).some(t=>norm(t)===norm(tag));}
  function typeIs(ent,type){return norm(ent&&ent.type)===norm(type);}
  function npcCharacters(){return entities().filter(e=>typeIs(e,'npc')&&hasTag(e,'character')).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||'')));}
  function starshipAssets(){return entities().filter(e=>typeIs(e,'asset')&&(hasTag(e,'starship')||hasTag(e,'ship')||norm(e.thumbnail).includes('ship'))).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||'')));}
  function getEntity(id){return entities().find(e=>e.id===id)||null;}
  function slug(s){return String(s||'field').trim().toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'')||'field';}

  function defaultTemplates(){
    return {
      version:'0.40.4',
      templates:[
        {system:'Starforged', enabled:true, fields:[
          {key:'edge',label:'Edge',defaultValue:1,rollMethod:'starforged',side:'left',row:1,order:1,visible:true,editable:true,visibleInCrew:true},
          {key:'heart',label:'Heart',defaultValue:1,rollMethod:'starforged',side:'left',row:1,order:2,visible:true,editable:true,visibleInCrew:true},
          {key:'iron',label:'Iron',defaultValue:1,rollMethod:'starforged',side:'left',row:2,order:1,visible:true,editable:true,visibleInCrew:true},
          {key:'shadow',label:'Shadow',defaultValue:1,rollMethod:'starforged',side:'left',row:2,order:2,visible:true,editable:true,visibleInCrew:true},
          {key:'wits',label:'Wits',defaultValue:1,rollMethod:'starforged',side:'left',row:2,order:3,visible:true,editable:true,visibleInCrew:true},
          {key:'health',label:'Health',defaultValue:5,rollMethod:'none',side:'right',row:1,order:1,visible:true,editable:true,visibleInCrew:true},
          {key:'spirit',label:'Spirit',defaultValue:5,rollMethod:'none',side:'right',row:1,order:2,visible:true,editable:true,visibleInCrew:true},
          {key:'supply',label:'Supply',defaultValue:5,rollMethod:'none',side:'right',row:2,order:1,visible:true,editable:true,visibleInCrew:true},
          {key:'momentum',label:'Momentum',defaultValue:2,rollMethod:'none',side:'right',row:2,order:2,visible:true,editable:true,visibleInCrew:true}
        ]},
        {system:'5PFH', enabled:true, fields:[
          {key:'combat',label:'Combat',defaultValue:0,rollMethod:'d6+attribute',side:'left',row:1,order:1,visible:true,editable:true,visibleInCrew:true},
          {key:'speed',label:'Speed',defaultValue:4,rollMethod:'d6+attribute',side:'left',row:1,order:2,visible:true,editable:true,visibleInCrew:true},
          {key:'toughness',label:'Tough.',defaultValue:3,rollMethod:'d6+attribute',side:'left',row:2,order:1,visible:true,editable:true,visibleInCrew:true},
          {key:'savvy',label:'Savvy',defaultValue:0,rollMethod:'d6+attribute',side:'left',row:2,order:2,visible:true,editable:true,visibleInCrew:true},
          {key:'xp',label:'XP',defaultValue:0,rollMethod:'none',side:'right',row:1,order:1,visible:true,editable:true,visibleInCrew:true},
          {key:'luck',label:'Luck',defaultValue:0,rollMethod:'none',side:'right',row:1,order:2,visible:true,editable:true,visibleInCrew:true},
          {key:'stress',label:'Stress',defaultValue:0,rollMethod:'none',side:'right',row:2,order:1,visible:true,editable:true,visibleInCrew:true},
          {key:'injuries',label:'Inj.',defaultValue:0,rollMethod:'none',side:'right',row:2,order:2,visible:true,editable:true,visibleInCrew:true}
        ]}
      ],
      crewFields:[
        {key:'role',label:'Role/Class',source:'crew',side:'left',row:1,order:1,visible:true,editable:true},
        {key:'status',label:'Status',source:'crew',side:'left',row:1,order:2,visible:true,editable:true},
        {key:'assetId',label:'Associated Asset / Ship',source:'asset-starship',side:'right',row:1,order:1,visible:true,editable:true},
        {key:'assignment',label:'Assignment',source:'crew',side:'right',row:2,order:1,visible:true,editable:true}
      ],
      milestones:[
        {version:'0.40',name:'Entity Template Engine',status:'in progress'},
        {version:'0.50',name:'Context Graph Complete',status:'planned'},
        {version:'0.60',name:'Story Engine / Consequences',status:'planned'},
        {version:'0.70',name:'Journal 2.0 Reflection',status:'planned'},
        {version:'1.0',name:'Connected Campaign Platform',status:'planned'}
      ]
    };
  }
  function templates(){const t=loadJson(TPL_STORE,null); if(t&&Array.isArray(t.templates)&&Array.isArray(t.crewFields))return t; const d=defaultTemplates(); saveJson(TPL_STORE,d); return d;}
  function saveTemplates(t){t.version='0.40.4'; window.SagaV40TemplateRenderTick=Date.now(); saveJson(TPL_STORE,t); qsa('.saga-v40-crew-snapshot,.saga-v40-party-members').forEach(x=>x.remove()); const c=$('sagaV40CharacterTemplates'); if(c)c.remove(); const a=$('sagaV40CrewAssignment'); if(a)a.remove(); schedule();}
  function enabledTemplates(){return templates().templates.filter(t=>t.enabled!==false);}
  function fieldsFor(t,crewOnly=false){return (t.fields||[]).filter(f=>f.visible!==false && (!crewOnly || f.visibleInCrew!==false)).sort((a,b)=>(String(a.side||'left').localeCompare(String(b.side||'left')))||(Number(a.row||1)-Number(b.row||1))||(Number(a.order||0)-Number(b.order||0)));}
  function getStat(ent,system,key,def){ent.systemStats=ent.systemStats||{}; ent.systemStats[system]=ent.systemStats[system]||{}; if(ent.systemStats[system][key]===undefined||ent.systemStats[system][key]===null||ent.systemStats[system][key]==='')ent.systemStats[system][key]=def; return ent.systemStats[system][key];}
  function setStat(ent,system,key,val){ent.systemStats=ent.systemStats||{}; ent.systemStats[system]=ent.systemStats[system]||{}; ent.systemStats[system][key]=val; saveBaseState();}
  function isCharacter(ent){return ent&&typeIs(ent,'npc')&&hasTag(ent,'character');}
  function crewRows(){const sd=sdState(); sd.colony=sd.colony||{}; if(!Array.isArray(sd.colony.crewRows))sd.colony.crewRows=[]; return sd.colony.crewRows;}
  function saveCrewRows(rows){const sd=sdState(); sd.colony=sd.colony||{}; sd.colony.crewRows=rows; saveSD(sd);}
  function crewRowsForEntity(ent){if(!ent)return[]; return crewRows().map((r,i)=>({...r,index:i})).filter(r=>r.characterId===ent.id || (!r.characterId && r.name && ent.name && String(r.name).trim().toLowerCase()===String(ent.name).trim().toLowerCase()));}
  function selectedCharacter(row){return getEntity(row.characterId)||null;}
  function entityName(ent){return ent?(ent.name||'Unnamed Entity'):'—';}

  function injectStyles(){
    if($('sagaV40Styles'))return;
    const css=document.createElement('style');css.id='sagaV40Styles';css.textContent=`
      .saga-v40-panel{margin:.45rem 0 .75rem;padding:.55rem .65rem;border:1px solid rgba(255,255,255,.16);border-radius:10px;background:rgba(255,255,255,.035)}
      .saga-v40-panel h4{margin:.15rem 0 .45rem;font-size:.98rem}.saga-v40-system{border-top:1px solid rgba(255,255,255,.1);padding-top:.35rem;margin-top:.4rem}.saga-v40-system:first-of-type{border-top:0;margin-top:0;padding-top:0}
      .saga-v40-two-col{display:grid;grid-template-columns:1fr 1fr;gap:.55rem}.saga-v40-stat-row{display:flex;gap:.35rem;flex-wrap:wrap;align-items:center;margin:.18rem 0}.saga-v40-stat{display:inline-flex;align-items:center;gap:.22rem;min-width:4.9rem;white-space:nowrap}.saga-v40-stat label{margin:0;font-size:.75rem}.saga-v40-stat input{width:3rem!important;min-width:3rem;padding:.16rem .2rem!important;font-size:.82rem}.saga-v40-stat button{height:1.45rem;min-height:1.45rem;padding:.05rem .28rem!important;font-size:.72rem!important;line-height:1!important}
      .saga-v40-crew-card{padding:.45rem .5rem;border:1px solid rgba(255,255,255,.12);border-radius:10px;margin:.45rem 0;background:rgba(255,255,255,.03)}.saga-v40-crew-head{display:flex;align-items:center;gap:.45rem;justify-content:space-between;margin-bottom:.35rem}.saga-v40-crew-head select{min-width:12rem;max-width:100%}.saga-v40-crew-grid{display:grid;grid-template-columns:1fr 1fr;gap:.55rem}.saga-v40-crew-row{display:flex;gap:.35rem;flex-wrap:wrap;align-items:end}.saga-v40-field{display:inline-flex;flex-direction:column;gap:.12rem;min-width:6.5rem}.saga-v40-field span{font-size:.72rem;color:var(--muted,#aaa)}.saga-v40-field input,.saga-v40-field select{width:100%;min-width:6.5rem;padding:.18rem .25rem!important;font-size:.82rem}.saga-v40-assignment-row{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.35rem;border-top:1px solid rgba(255,255,255,.08);padding:.35rem 0;font-size:.82rem}.saga-v40-settings-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:.35rem;align-items:end}.saga-v40-settings-grid input,.saga-v40-settings-grid select{width:100%;font-size:.8rem;padding:.18rem}.saga-v40-template-row{border-top:1px solid rgba(255,255,255,.12);padding:.35rem 0}.saga-v40-milestones li{margin:.15rem 0}.saga-v40-roll-card{position:fixed;right:.8rem;bottom:.8rem;z-index:9999;max-width:18rem;padding:.55rem .65rem;border:1px solid rgba(255,255,255,.2);border-radius:12px;background:rgba(12,15,22,.96);box-shadow:0 4px 18px rgba(0,0,0,.35);font-size:.84rem}.saga-v40-roll-card strong{font-size:.78rem;float:right;margin-left:.45rem;max-width:7rem;overflow-wrap:anywhere;text-align:right}.saga-r39-crew-snapshot{display:none!important}.sd-small-actions button.secondary,.sd-small-actions button,#storyDirectorDashboard .sd-small-actions button,#centerPartyView .sd-small-actions button,#directorStateView .sd-small-actions button{min-height:2.05rem!important;height:2.05rem!important;padding:.34rem .65rem!important;font-size:.86rem!important;line-height:1.1!important;flex:0 1 auto!important;min-width:8.5rem!important}.saga-v40-system strong,.saga-v40-system h4{display:block;margin:.08rem 0 .18rem;font-size:.72rem!important;line-height:1.05!important;font-weight:700;color:var(--muted,#aeb8c8);letter-spacing:.02em;text-transform:uppercase}.saga-v40-party-members{margin:.45rem 0}.saga-v40-party-member{padding:.42rem .5rem;border:1px solid rgba(255,255,255,.12);border-radius:10px;margin:.42rem 0;background:rgba(255,255,255,.025)}.saga-v40-party-name{font-weight:700;margin-bottom:.12rem;font-size:.92rem}@media(max-width:900px){.saga-v40-two-col,.saga-v40-crew-grid,.saga-v40-assignment-row{grid-template-columns:1fr}.saga-v40-settings-grid{grid-template-columns:1fr 1fr}}
    `;document.head.appendChild(css);
  }

  function renderSystemStats(ent,crewOnly=false){
    return enabledTemplates().map(t=>{
      const groups={left:{1:[],2:[]},right:{1:[],2:[]}};
      fieldsFor(t,crewOnly).forEach(f=>{const side=(f.side==='right')?'right':'left';const row=Number(f.row||1);(groups[side][row]||(groups[side][row]=[])).push(f);});
      const sideHtml=side=>[1,2].map(r=>`<div class="saga-v40-stat-row">${(groups[side][r]||[]).map(f=>{
        const val=getStat(ent,t.system,f.key,f.defaultValue??0); const roll=f.rollMethod&&f.rollMethod!=='none';
        return `<span class="saga-v40-stat"><label>${esc(f.label||f.key)}</label><input data-v40-stat data-v40-system="${esc(t.system)}" data-v40-field="${esc(f.key)}" value="${esc(val)}" ${f.editable===false?'readonly':''}>${roll?`<button type="button" class="secondary" title="Roll ${esc(f.label)}" data-v40-roll data-v40-system="${esc(t.system)}" data-v40-field="${esc(f.key)}" data-v40-method="${esc(f.rollMethod)}">🎲</button>`:''}</span>`;}).join('')}</div>`).join('');
      return `<div class="saga-v40-system"><h4>${esc(t.system)}</h4><div class="saga-v40-two-col"><div>${sideHtml('left')}</div><div>${sideHtml('right')}</div></div></div>`;
    }).join('');
  }

  function renderCharacterPanel(){
    const ent=activeEntity(); const name=$('entityName'); if(!name)return;
    let existing=$('sagaV40CharacterTemplates');
    if(!isCharacter(ent)){ if(existing)existing.remove(); return; }
    const tplTick=String(window.SagaV40TemplateRenderTick||'0');
    if(existing && existing.dataset.entityId===ent.id && existing.dataset.tplTick===tplTick)return;
    if(existing)existing.remove();
    const panel=document.createElement('div'); panel.id='sagaV40CharacterTemplates'; panel.className='saga-v40-panel'; panel.dataset.entityId=ent.id; panel.dataset.tplTick=tplTick;
    panel.innerHTML=renderSystemStats(ent,false);
    const head=name.closest('.entity-form-head')||name.closest('.entity-head-fields')||name.parentElement;
    if(head)head.insertAdjacentElement('afterend',panel);
  }

  function characterSelect(row,i){
    const chars=npcCharacters(); const current=row.characterId||'';
    const opts=['<option value="">Select NPC #character</option>'].concat(chars.map(c=>`<option value="${esc(c.id)}" ${c.id===current?'selected':''}>${esc(c.name||'Unnamed NPC')}</option>`));
    if(!chars.length)opts.push('<option disabled>No NPC entities tagged #character</option>');
    return `<select data-v40-crew="${i}:characterId">${opts.join('')}</select>`;
  }
  function assetSelect(row,i){
    const assets=starshipAssets(); const current=row.assetId||'';
    const opts=['<option value="">No associated starship asset</option>'].concat(assets.map(a=>`<option value="${esc(a.id)}" ${a.id===current?'selected':''}>${esc(a.name||'Unnamed Asset')}</option>`));
    if(!assets.length)opts.push('<option disabled>Create an Asset tagged #starship to link a ship</option>');
    return `<select data-v40-crew="${i}:assetId">${opts.join('')}</select>`;
  }
  function crewAssignmentFields(row,i){
    const t=templates(); const bySide={left:{1:[],2:[]},right:{1:[],2:[]}};
    (t.crewFields||[]).filter(f=>f.visible!==false).sort((a,b)=>(String(a.side||'left').localeCompare(String(b.side||'left')))||(Number(a.row||1)-Number(b.row||1))||(Number(a.order||0)-Number(b.order||0))).forEach(f=>{const side=f.side==='right'?'right':'left';const rw=Number(f.row||1);(bySide[side][rw]||(bySide[side][rw]=[])).push(f);});
    const fieldHtml=f=>{
      if(f.source==='asset-starship')return `<label class="saga-v40-field"><span>${esc(f.label||'Asset')}</span>${assetSelect(row,i)}</label>`;
      return `<label class="saga-v40-field"><span>${esc(f.label||f.key)}</span><input data-v40-crew="${i}:${esc(f.key)}" value="${esc(row[f.key]||'')}"></label>`;
    };
    const sideHtml=side=>[1,2].map(r=>`<div class="saga-v40-crew-row">${(bySide[side][r]||[]).sort((a,b)=>Number(a.order||0)-Number(b.order||0)).map(fieldHtml).join('')}</div>`).join('');
    return `<div class="saga-v40-crew-grid"><div>${sideHtml('left')}</div><div>${sideHtml('right')}</div></div>`;
  }
  function crewCard(row,i){
    const ent=selectedCharacter(row);
    return `<div class="saga-v40-crew-card" data-v40-crew-card="${i}"><div class="saga-v40-crew-head"><div><b>Crew ${i+1}</b><br>${characterSelect(row,i)}</div><button type="button" class="secondary" data-v40-delete-crew="${i}" title="Remove this crew row and entity link">Unassign</button></div>${crewAssignmentFields(row,i)}${ent?renderSystemStats(ent,true):'<p class="small">Select a #character NPC to show template stats here.</p>'}</div>`;
  }
  function crewSnapshotMarkup(){const rows=crewRows(); return `<details class="sd-collapse saga-v40-crew-snapshot" open><summary>Colony Crew Snapshot</summary>${rows.length?rows.map(crewCard).join(''):'<p class="small">No crew rows yet.</p>'}<div class="button-row sd-small-actions"><button type="button" class="secondary" data-v40-add-crew>Add Crew Row</button></div></details>`;}
  function partyMembersMarkup(){
    const chars=npcCharacters();
    return `<details class="sd-collapse saga-v40-party-members" open><summary>Party Members</summary>${chars.length?chars.map(ent=>`<div class="saga-v40-party-member" data-v40-party-member="${esc(ent.id)}"><div class="saga-v40-party-name">${esc(ent.name||'Unnamed Character')}</div>${renderSystemStats(ent,true)}</div>`).join(''):'<p class="small">No NPC entities tagged #character yet.</p>'}</details>`;
  }
  function ensurePartyMembers(){
    const party=$('centerPartyView')||document.querySelector('.sd-view[data-sd-view="party"]');
    if(!party)return;
    const old=party.querySelector('.saga-v40-party-members'); if(old)old.remove();
    const div=document.createElement('div'); div.innerHTML=partyMembersMarkup(); const node=div.firstElementChild;
    const anchor=party.querySelector('.saga-v40-crew-snapshot') || party.querySelector('.sd-card') || party.firstElementChild;
    if(anchor && anchor.parentNode) anchor.parentNode.insertBefore(node, anchor.nextSibling); else party.insertBefore(node, party.firstChild);
  }
  function removeOldCrewSnapshots(root=document){qsa('.saga-r39-crew-snapshot',root).forEach(x=>x.remove()); qsa('details',root).forEach(d=>{if(d.querySelector('.sd-colony-table'))d.style.display='none';});}
  function ensureCrewSnapshots(){
    removeOldCrewSnapshots();
    const party=$('centerPartyView')||document.querySelector('.sd-view[data-sd-view="party"]');
    if(party&&!party.querySelector('.saga-v40-crew-snapshot')){
      const res=$('sdPartyResources'); const before=res?(res.closest('details')||res):party.querySelector('.sd-card')?.nextSibling;
      const div=document.createElement('div'); div.innerHTML=crewSnapshotMarkup(); const node=div.firstElementChild;
      if(before&&before.parentNode)before.parentNode.insertBefore(node,before); else party.appendChild(node);
    }
    const colony=document.querySelector('.sd-view[data-sd-view="colony"]')||$('sdColonySheet')?.parentElement;
    if(colony&&!colony.querySelector('.saga-v40-crew-snapshot')){
      const sheet=$('sdColonySheet'); const div=document.createElement('div'); div.innerHTML=crewSnapshotMarkup(); const node=div.firstElementChild;
      if(sheet&&sheet.parentNode)sheet.parentNode.insertBefore(node,sheet.nextSibling); else colony.appendChild(node);
    }
  }
  function handleCrew(target){
    const key=target.getAttribute('data-v40-crew'); if(!key)return; const [idx,field]=key.split(':'); const rows=crewRows(); const i=Number(idx); if(!rows[i])return;
    if(field==='characterId'){ rows[i].characterId=target.value; const ent=getEntity(target.value); rows[i].name=ent?ent.name:''; }
    else rows[i][field]=target.value;
    saveCrewRows(rows); schedule();
  }
  function addCrew(){const rows=crewRows(); rows.push({characterId:'',name:'',role:'',status:'Active',assignment:'',assetId:''}); saveCrewRows(rows); schedule();}
  function deleteCrew(i){const rows=crewRows(); if(!rows[i])return; if(!confirm('Remove this crew row and its link to the entity? The NPC entity will remain.'))return; rows.splice(i,1); saveCrewRows(rows); schedule();}

  function renderCrewAssignmentPanel(){ const old=$('sagaR39CrewAssignment'); if(old)old.remove(); const panel=$('sagaV40CrewAssignment'); if(panel)panel.remove(); }


  function showRollCard(html){let c=$('sagaV40RollCard'); if(!c){c=document.createElement('div');c.id='sagaV40RollCard';c.className='saga-v40-roll-card';document.body.appendChild(c);} c.innerHTML=html; clearTimeout(c._t); c._t=setTimeout(()=>{if(c)c.remove();},9000);}
  function rollDie(n){return Math.floor(Math.random()*n)+1;}
  function rollField(btn){
    const ent=activeEntity(); if(!ent)return; const system=btn.dataset.v40System, field=btn.dataset.v40Field, method=(btn.dataset.v40Method||'').toLowerCase();
    const val=Number((ent.systemStats&&ent.systemStats[system]&&ent.systemStats[system][field])||0);
    const label=btn.closest('.saga-v40-stat')?.querySelector('label')?.textContent||field;
    if(method.includes('starforged')){const action=rollDie(6)+val,c1=rollDie(10),c2=rollDie(10); const hits=(action>c1?1:0)+(action>c2?1:0); const result=hits===2?'Strong hit':hits===1?'Weak hit':'Miss'; showRollCard(`<strong>${esc(result)}</strong><b>${esc(system)} ${esc(label)}</b><br>Action ${action} (${val>=0?'+':''}${val}) vs ${c1}, ${c2}`);}
    else if(method.includes('d6')){const d=rollDie(6),total=d+val; showRollCard(`<strong>${esc(total>=6?'Success / Advantage':'Check result')}</strong><b>${esc(system)} ${esc(label)}</b><br>d6 ${d} ${val>=0?'+':''}${val} = ${total}`);}
  }

  function settingsMarkup(){
    const t=templates();
    const tplRows=t.templates.map((tpl,ti)=>`<details class="saga-v40-panel" open><summary><b>${esc(tpl.system)}</b> template</summary>${(tpl.fields||[]).map((f,fi)=>({f,fi})).sort((a,b)=>(Number(a.f.row||1)-Number(b.f.row||1))||(Number(a.f.order||0)-Number(b.f.order||0))||String(a.f.side||'left').localeCompare(String(b.f.side||'left'))).map(({f,fi})=>`<div class="saga-v40-template-row"><div class="saga-v40-settings-grid"><label>Field<input data-v40-tpl="${ti}:${fi}:label" value="${esc(f.label||'')}"></label><label>Default<input data-v40-tpl="${ti}:${fi}:defaultValue" value="${esc(f.defaultValue??'')}"></label><label>Roll<select data-v40-tpl="${ti}:${fi}:rollMethod"><option ${f.rollMethod==='none'?'selected':''}>none</option><option ${f.rollMethod==='starforged'?'selected':''}>starforged</option><option ${f.rollMethod==='d6+attribute'?'selected':''}>d6+attribute</option></select></label><label>Side<select data-v40-tpl="${ti}:${fi}:side"><option ${f.side==='left'?'selected':''}>left</option><option ${f.side==='right'?'selected':''}>right</option></select></label><label>Row<select data-v40-tpl="${ti}:${fi}:row"><option ${Number(f.row)===1?'selected':''}>1</option><option ${Number(f.row)===2?'selected':''}>2</option></select></label><label>Order<input type="number" data-v40-tpl="${ti}:${fi}:order" value="${esc(f.order??1)}"></label></div><label class="small"><input type="checkbox" data-v40-tpl="${ti}:${fi}:visibleInCrew" ${f.visibleInCrew!==false?'checked':''}> Show in crew snapshot</label></div>`).join('')}<div class="button-row"><button type="button" class="secondary" data-v40-add-template-field="${ti}">Add ${esc(tpl.system)} Field</button></div></details>`).join('');
    const crewRows=(t.crewFields||[]).map((f,fi)=>({f,fi})).sort((a,b)=>(Number(a.f.row||1)-Number(b.f.row||1))||(Number(a.f.order||0)-Number(b.f.order||0))||String(a.f.side||'left').localeCompare(String(b.f.side||'left'))).map(({f,fi})=>`<div class="saga-v40-template-row"><div class="saga-v40-settings-grid"><label>Label<input data-v40-crewfield="${fi}:label" value="${esc(f.label||'')}"></label><label>Key<input data-v40-crewfield="${fi}:key" value="${esc(f.key||'')}"></label><label>Source<select data-v40-crewfield="${fi}:source"><option ${f.source==='crew'?'selected':''}>crew</option><option ${f.source==='asset-starship'?'selected':''}>asset-starship</option></select></label><label>Side<select data-v40-crewfield="${fi}:side"><option ${f.side==='left'?'selected':''}>left</option><option ${f.side==='right'?'selected':''}>right</option></select></label><label>Row<select data-v40-crewfield="${fi}:row"><option ${Number(f.row)===1?'selected':''}>1</option><option ${Number(f.row)===2?'selected':''}>2</option></select></label><label>Order<input type="number" data-v40-crewfield="${fi}:order" value="${esc(f.order??1)}"></label></div></div>`).join('');
    return `<div id="sagaV40Settings" class="saga-v40-panel"><h4>Entity Template Engine <span class="small">v0.40.4</span></h4><p class="small">Templates control compact left/right, row 1/2 character stat blocks, crew snapshot layout, and roll methods. Current Ship is handled as an associated Asset tagged <b>#starship</b>, not a fixed field.</p><details open><summary>Character Templates</summary>${tplRows}</details><details open><summary>Crew Snapshot Layout</summary>${crewRows}<div class="button-row"><button type="button" class="secondary" data-v40-add-crewfield>Add Crew Field</button></div></details><details><summary>Milestones</summary><ul class="saga-v40-milestones">${(t.milestones||[]).map(m=>`<li><b>${esc(m.version)}</b> — ${esc(m.name)} <span class="small">${esc(m.status)}</span></li>`).join('')}</ul></details><div class="button-row"><button type="button" class="secondary" data-v40-reset-templates>Reset Templates</button></div></div>`;
  }
  function ensureSettings(){
    const sec=document.querySelector('[data-settings-section="entity"]'); if(!sec)return;
    let old=$('sagaV40Settings'); if(old)return;
    sec.insertAdjacentHTML('beforeend',settingsMarkup());
  }
  function editTemplate(target){
    let t=templates();
    const key=target.getAttribute('data-v40-tpl'); if(key){const [ti,fi,prop]=key.split(':'); const f=t.templates[+ti].fields[+fi]; if(!f)return; f[prop]=(target.type==='checkbox')?target.checked:target.value; if(prop==='key')f.key=slug(f.key); if(prop==='row'||prop==='order')f[prop]=Number(f[prop]||0); saveTemplates(t); return;}
    const ck=target.getAttribute('data-v40-crewfield'); if(ck){const [fi,prop]=ck.split(':'); const f=t.crewFields[+fi]; if(!f)return; f[prop]=(target.type==='checkbox')?target.checked:target.value; if(prop==='key')f.key=slug(f.key); if(prop==='row'||prop==='order')f[prop]=Number(f[prop]||0); saveTemplates(t);}
  }
  function addTemplateField(ti){const t=templates(); const tpl=t.templates[+ti]; if(!tpl)return; const label=prompt('New field name?'); if(!label)return; tpl.fields.push({key:slug(label),label,defaultValue:0,rollMethod:'none',side:'left',row:1,order:(tpl.fields.length+1),visible:true,editable:true,visibleInCrew:true}); saveTemplates(t); const s=$('sagaV40Settings'); if(s){s.remove(); ensureSettings();}}
  function addCrewField(){const t=templates(); const label=prompt('New crew field label?'); if(!label)return; t.crewFields.push({key:slug(label),label,source:'crew',side:'left',row:1,order:t.crewFields.length+1,visible:true,editable:true}); saveTemplates(t); const s=$('sagaV40Settings'); if(s){s.remove(); ensureSettings();}}
  function resetTemplates(){if(!confirm('Reset Entity Template defaults? Existing character values remain, but template layout returns to defaults.'))return; saveTemplates(defaultTemplates()); const s=$('sagaV40Settings'); if(s){s.remove(); ensureSettings();} schedule();}

  const mo=new MutationObserver(muts=>{
    if(patching)return;
    // Only respond when the host app creates a new major panel/form, not when this patch mutates its own DOM.
    const meaningful=muts.some(m=>Array.from(m.addedNodes||[]).some(n=>{
      if(!n || n.nodeType!==1)return false;
      if(n.id && String(n.id).startsWith('sagaV40'))return false;
      if(n.classList && Array.from(n.classList).some(c=>String(c).startsWith('saga-v40')))return false;
      return n.querySelector && (n.querySelector('#entityName') || n.querySelector('[data-settings-section="entity"]') || n.querySelector('#centerPartyView') || n.querySelector('[data-sd-view="party"]') || n.querySelector('[data-sd-view="colony"]'));
    }));
    if(meaningful)schedule();
  });
  let queued=false, patching=false;
  function patchAll(){
    if(patching)return;
    patching=true;
    try{
      try{mo.disconnect();}catch(e){}
      injectStyles();
      ensureSettings();
      renderCharacterPanel();
      renderCrewAssignmentPanel();
      ensureCrewSnapshots();
      ensurePartyMembers();
    }catch(e){
      console.warn('Saga v0.40.3 patch error',e);
    }finally{
      try{mo.observe(document.body,{childList:true,subtree:true});}catch(e){}
      patching=false;
    }
  }
  function schedule(){if(queued||patching)return; queued=true; requestAnimationFrame(()=>{queued=false; patchAll();});}
  document.addEventListener('input',ev=>{const t=ev.target; if(t.matches('[data-v40-stat]')){const ent=activeEntity(); if(ent)setStat(ent,t.dataset.v40System,t.dataset.v40Field,t.value); return;} if(t.matches('[data-v40-crew]'))handleCrew(t); if(t.matches('[data-v40-tpl],[data-v40-crewfield]'))editTemplate(t);},true);
  document.addEventListener('change',ev=>{const t=ev.target; if(t.matches('[data-v40-stat]')){const ent=activeEntity(); if(ent)setStat(ent,t.dataset.v40System,t.dataset.v40Field,t.value); return;} if(t.matches('[data-v40-crew]'))handleCrew(t); if(t.matches('[data-v40-tpl],[data-v40-crewfield]'))editTemplate(t);},true);
  document.addEventListener('click',ev=>{const roll=ev.target.closest('[data-v40-roll]'); if(roll){ev.preventDefault(); rollField(roll); return;} const add=ev.target.closest('[data-v40-add-crew]'); if(add){ev.preventDefault(); addCrew(); return;} const del=ev.target.closest('[data-v40-delete-crew]'); if(del){ev.preventDefault(); deleteCrew(Number(del.dataset.v40DeleteCrew)); return;} const reset=ev.target.closest('[data-v40-reset-templates]'); if(reset){ev.preventDefault(); resetTemplates(); return;} const atf=ev.target.closest('[data-v40-add-template-field]'); if(atf){ev.preventDefault(); addTemplateField(atf.dataset.v40AddTemplateField); return;} const acf=ev.target.closest('[data-v40-add-crewfield]'); if(acf){ev.preventDefault(); addCrewField(); return;}},true);
  function bindTabRefresh(){
    ['showCenterPartyTab','showCenterColonyTab','showDirectorStateTab','showJournalTab','showOutputTab','openPartyPanel'].forEach(id=>{
      const b=$(id); if(b&&!b.dataset.v40RefreshBound){b.dataset.v40RefreshBound='1'; b.addEventListener('click',()=>{ if(id==='openPartyPanel'){ const p=$('showCenterPartyTab'); if(p) p.click(); else { try{ if(typeof window.showCenterTab==='function') window.showCenterTab('party'); }catch(e){} } } setTimeout(schedule,0);},true);}
    });
  }
  function boot(){injectStyles(); bindTabRefresh(); patchAll(); try{mo.observe(document.body,{childList:true,subtree:true});}catch(e){} setTimeout(schedule,250); setTimeout(schedule,900); }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot); else boot();
  window.SagaEntityTemplates={templates,enabledTemplates,schedule,renderSystemStats};
})();
