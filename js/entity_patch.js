
// Entity Tracker extension
const ENTITY_TYPES = {
  npc: { label: 'NPCs', singular: 'NPC', icon: '👤' },
  location: { label: 'Locations', singular: 'Location', icon: '🧭' },
  faction: { label: 'Factions', singular: 'Faction', icon: '🚩' },
  asset: { label: 'Assets', singular: 'Asset', icon: '📦' }
};
const ENTITY_THUMBNAILS = {
  npc: ['👤','🧑‍🚀','🕵️','👩‍🔧','🧬','🤖'],
  location: ['🧭','🏚️','🏙️','🪐','🚪','⛏️'],
  faction: ['🚩','🏴','⚙️','🏢','🛡️','☣️'],
  asset: ['📦','🚀','🚚','🔑','💾','🧪']
};
function ensureEntityState(){
  if(!state.entities) state.entities={items:[], activeId:null, history:[]};
  if(!Array.isArray(state.entities.items)) state.entities.items=[];
  if(!Array.isArray(state.entities.history)) state.entities.history=[];
  return state.entities;
}
function entityId(){return 'ent_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7)}
function entityById(id){return ensureEntityState().items.find(e=>e.id===id)}
function defaultEntity(type){const meta=ENTITY_TYPES[type]||ENTITY_TYPES.asset;return {id:entityId(), type, thumbnail:meta.icon, name:'New '+meta.singular, relationshipDescription:'', overview:'', revealed:'', relationships:[]}}
function setActiveEntity(id, pushHistory=true){const es=ensureEntityState();if(!entityById(id))return;if(pushHistory && es.activeId && es.activeId!==id){es.history=[es.activeId,...es.history.filter(x=>x!==es.activeId)].slice(0,8)}es.activeId=id;saveState();renderEntityTracker()}
function addEntity(type){const es=ensureEntityState();const ent=defaultEntity(type);es.items.push(ent);setActiveEntity(ent.id,false);saveState();renderEntityTracker()}
function removeEntity(id){const es=ensureEntityState();if(!id)return;if(!confirm('Remove this entity and its relationships?'))return;es.items=es.items.filter(e=>e.id!==id);es.items.forEach(e=>e.relationships=(e.relationships||[]).filter(r=>r.id!==id));es.history=es.history.filter(x=>x!==id);if(es.activeId===id)es.activeId=es.items[0]?.id||null;saveState();renderEntityTracker()}
function updateActiveEntityField(field,value){const ent=entityById(ensureEntityState().activeId);if(!ent)return;ent[field]=value;saveState();renderEntityDirectoryOnly()}
function addRelationshipToActive(targetId){const es=ensureEntityState();const active=entityById(es.activeId);const target=entityById(targetId);if(!target)return;if(!active){setActiveEntity(targetId,false);return}if(active.id===target.id)return;if(!Array.isArray(active.relationships))active.relationships=[];let existing=active.relationships.find(r=>r.id===target.id);if(!existing){active.relationships.push({id:target.id, description:'Connected to this entity'});saveState();renderEntityTracker()} }
function removeRelationshipFromActive(targetId){const ent=entityById(ensureEntityState().activeId);if(!ent)return;ent.relationships=(ent.relationships||[]).filter(r=>r.id!==targetId);saveState();renderEntityTracker()}
function updateRelationshipDescription(targetId,value){const ent=entityById(ensureEntityState().activeId);if(!ent)return;const rel=(ent.relationships||[]).find(r=>r.id===targetId);if(rel){rel.description=value;saveState()}}
function initEntityTracker(){
  ensureEntityState();
  const bind=(id,type)=>{const b=$(id); if(b) b.addEventListener('click',()=>addEntity(type));};
  bind('entityAddNpc','npc'); bind('entityAddLocation','location'); bind('entityAddFaction','faction'); bind('entityAddAsset','asset');
  const mobile=$('openEntityTrackerPanel');
  if(mobile) mobile.addEventListener('click',()=>{showLeftTab('entity'); const p=$('entityTrackerPanel'); document.querySelectorAll('.side-panel').forEach(x=>x.classList.toggle('is-open',x===p)); const bd=$('panelBackdrop'); if(bd) bd.hidden=false; document.body.classList.add('side-panel-open');});
  renderEntityTracker();
}
function renderEntityTracker(){renderEntityActiveCard();renderEntityDirectoryOnly()}
function renderEntityActiveCard(){
  const card=$('entityActiveCard'); if(!card)return; const es=ensureEntityState();
  if(!es.activeId && es.items.length) es.activeId=es.items[0].id;
  const ent=entityById(es.activeId);
  if(!ent){card.innerHTML='<div class="entity-empty"><h3>No active entity</h3><p class="small">Add an NPC, location, faction, or asset to begin. You can also drag an entity from the directory here to make it active.</p></div>';card.ondragover=e=>e.preventDefault();card.ondrop=e=>{e.preventDefault();const id=e.dataTransfer.getData('text/entity-id');if(id)setActiveEntity(id,false)};return;}
  const typeOptions=Object.entries(ENTITY_TYPES).map(([k,v])=>`<option value="${k}" ${ent.type===k?'selected':''}>${v.singular}</option>`).join('');
  const thumbs=(ENTITY_THUMBNAILS[ent.type]||ENTITY_THUMBNAILS.asset).map(t=>`<button type="button" class="entity-thumb-choice ${ent.thumbnail===t?'active':''}" data-thumb="${t}" title="Use thumbnail ${t}">${t}</button>`).join('');
  const history=(es.history||[]).map(id=>entityById(id)).filter(Boolean).slice(0,6).map((h,i)=>`<button type="button" class="entity-history-tab" data-entity-id="${h.id}">${escapeHtml(h.name||ENTITY_TYPES[h.type]?.singular||'Entity')}</button>`).join('');
  const rels=(ent.relationships||[]).map(r=>{const target=entityById(r.id); if(!target)return ''; return `<li class="entity-rel-row"><button type="button" class="entity-rel-link" data-entity-id="${target.id}">${target.thumbnail||ENTITY_TYPES[target.type]?.icon||'⬢'} ${escapeHtml(target.name||'Unnamed')}</button><input class="entity-rel-desc" data-rel-id="${target.id}" value="${escapeHtml(r.description||'Connected to this entity')}" placeholder="Describe the relationship"><button type="button" class="danger entity-rel-remove" data-rel-id="${target.id}" title="Remove relationship">×</button></li>`}).join('');
  card.innerHTML=`<div class="entity-nav-row"><button id="entityBack" type="button" class="secondary entity-back" title="Back">←</button><div class="entity-history-tabs">${history}</div></div>
  <div class="entity-main-drop"><div class="entity-form-head"><div class="entity-thumb-large">${ent.thumbnail||ENTITY_TYPES[ent.type]?.icon||'⬢'}</div><div class="entity-head-fields"><label>Name<input id="entityName" value="${escapeHtml(ent.name||'')}"></label><label>Type<select id="entityType">${typeOptions}</select></label></div><button id="entityRemove" type="button" class="danger entity-delete">Remove</button></div>
  <div class="entity-thumb-picker" aria-label="Thumbnail choices">${thumbs}</div>
  <label>Relationship description<input id="entityRelationshipDescription" value="${escapeHtml(ent.relationshipDescription||'')}" placeholder="How this entity tends to connect to scenes or other entities"></label>
  <label>Overview description<textarea id="entityOverview" rows="4" placeholder="Who or what this is, what it wants, and how it appears in play.">${escapeHtml(ent.overview||'')}</textarea></label>
  <label>Revealed details<textarea id="entityRevealed" rows="4" placeholder="Facts the players have discovered or confirmed.">${escapeHtml(ent.revealed||'')}</textarea></label>
  <section class="entity-relationships"><div class="section-header"><h3>Relationship Outline</h3><button id="entityAddRelated" type="button" class="secondary compact-button">Add Existing</button></div><ul class="entity-rel-list">${rels||'<li class="small">No relationships yet. Drag an entity from the directory onto this card or use Add Existing.</li>'}</ul></section></div>`;
  const bindInput=(id,field)=>{const el=$(id); if(el) el.addEventListener('input',()=>updateActiveEntityField(field,el.value));};
  bindInput('entityName','name'); bindInput('entityRelationshipDescription','relationshipDescription'); bindInput('entityOverview','overview'); bindInput('entityRevealed','revealed');
  const type=$('entityType'); if(type) type.addEventListener('change',()=>{ent.type=type.value; ent.thumbnail=ENTITY_TYPES[type.value]?.icon||'⬢'; saveState(); renderEntityTracker()});
  const del=$('entityRemove'); if(del) del.addEventListener('click',()=>removeEntity(ent.id));
  const back=$('entityBack'); if(back) back.addEventListener('click',()=>{const prev=es.history.shift(); if(prev&&entityById(prev)){setActiveEntity(prev,false)}else renderEntityTracker()});
  document.querySelectorAll('.entity-history-tab,.entity-rel-link').forEach(btn=>btn.addEventListener('click',()=>setActiveEntity(btn.dataset.entityId,true)));
  document.querySelectorAll('.entity-thumb-choice').forEach(btn=>btn.addEventListener('click',()=>{ent.thumbnail=btn.dataset.thumb;saveState();renderEntityTracker()}));
  document.querySelectorAll('.entity-rel-desc').forEach(inp=>inp.addEventListener('input',()=>updateRelationshipDescription(inp.dataset.relId,inp.value)));
  document.querySelectorAll('.entity-rel-remove').forEach(btn=>btn.addEventListener('click',()=>removeRelationshipFromActive(btn.dataset.relId)));
  const addExisting=$('entityAddRelated'); if(addExisting) addExisting.addEventListener('click',()=>{const choices=es.items.filter(e=>e.id!==ent.id && !(ent.relationships||[]).some(r=>r.id===e.id)); if(!choices.length){alert('No unlinked entities available.');return} const pickName=prompt('Type the exact name of an existing entity to relate:\n\n'+choices.map(e=>e.name).join('\n')); const found=choices.find(e=>(e.name||'').toLowerCase() === (pickName||'').toLowerCase()); if(found)addRelationshipToActive(found.id);});
  card.ondragover=e=>{e.preventDefault();card.classList.add('drag-over')};
  card.ondragleave=()=>card.classList.remove('drag-over');
  card.ondrop=e=>{e.preventDefault();card.classList.remove('drag-over');const id=e.dataTransfer.getData('text/entity-id');if(id)addRelationshipToActive(id)};
}
function renderEntityDirectoryOnly(){
  const dir=$('entityDirectory'); if(!dir)return; const es=ensureEntityState();
  dir.innerHTML='';
  Object.entries(ENTITY_TYPES).forEach(([type,meta])=>{
    const details=document.createElement('details'); details.open=true; details.className='entity-dir-group';
    const summary=document.createElement('summary'); summary.textContent=meta.label; details.appendChild(summary);
    const list=document.createElement('div'); list.className='entity-dir-list';
    es.items.filter(e=>e.type===type).forEach(ent=>{
      const btn=document.createElement('button'); btn.type='button'; btn.className='entity-dir-item'+(es.activeId===ent.id?' active':''); btn.draggable=true; btn.dataset.entityId=ent.id; btn.innerHTML=`<span>${ent.thumbnail||meta.icon}</span><span>${escapeHtml(ent.name||meta.singular)}</span>`;
      btn.addEventListener('click',()=>setActiveEntity(ent.id,true));
      btn.addEventListener('dragstart',ev=>{ev.dataTransfer.setData('text/entity-id',ent.id);ev.dataTransfer.effectAllowed='copy'});
      list.appendChild(btn);
    });
    if(!list.children.length){const empty=document.createElement('p'); empty.className='small entity-dir-empty'; empty.textContent='None yet.'; list.appendChild(empty)}
    details.appendChild(list); dir.appendChild(details);
  });
}
const baseShowLeftTab = showLeftTab;
showLeftTab = function(tab,save=true){
  state.activeLeftTab=(tab==='crew'||tab==='living'||tab==='entity')?tab:'scene';
  const scene=$('controlsPanel'), crew=$('crewLinkPanel'), living=$('livingShipPanel'), entity=$('entityTrackerPanel');
  if(scene)scene.classList.toggle('active-left-view',state.activeLeftTab==='scene');
  if(crew)crew.classList.toggle('active-left-view',state.activeLeftTab==='crew');
  if(living)living.classList.toggle('active-left-view',state.activeLeftTab==='living');
  if(entity)entity.classList.toggle('active-left-view',state.activeLeftTab==='entity');
  document.querySelectorAll('[data-left-tab]').forEach(btn=>btn.classList.toggle('active',btn.dataset.leftTab===state.activeLeftTab));
  document.body.classList.toggle('left-crew-expanded',state.activeLeftTab==='crew'||state.activeLeftTab==='living'||state.activeLeftTab==='entity');
  if(document.body.classList.contains('side-panel-open')&&window.matchMedia('(max-width: 900px)').matches){[scene,crew,living,entity].filter(Boolean).forEach(p=>p.classList.toggle('is-open',p.classList.contains('active-left-view')))}
  if(state.activeLeftTab==='entity')renderEntityTracker();
  if(save)saveState();
};
