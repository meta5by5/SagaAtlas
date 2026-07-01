(function(){
  'use strict';
  const PATCH='inc38-attributes-oracles-safe';
  function $(id){return document.getElementById(id);}
  function qsa(sel,root){return Array.prototype.slice.call((root||document).querySelectorAll(sel));}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function rollDie(sides){return Math.floor(Math.random()*sides)+1;}
  function getEntityState(){try{return typeof ensureEntityState==='function'?ensureEntityState():(state.entities||{items:[]});}catch(e){return {items:[]};}}
  function activeEntity(){const es=getEntityState(); return (es.items||[]).find(e=>e.id===es.activeId)||null;}
  function save(){try{if(typeof saveState==='function')saveState();}catch(e){}}
  function defaults(){
    try{
      if(!state.entityAttributeDefaults || !Array.isArray(state.entityAttributeDefaults.rows)){
        state.entityAttributeDefaults={rows:[
          {id:'sf-edge',group:'Starforged',name:'Edge',method:'starforged',defaultValue:2},
          {id:'sf-heart',group:'Starforged',name:'Heart',method:'starforged',defaultValue:2},
          {id:'sf-iron',group:'Starforged',name:'Iron',method:'starforged',defaultValue:1},
          {id:'sf-shadow',group:'Starforged',name:'Shadow',method:'starforged',defaultValue:1},
          {id:'sf-wits',group:'Starforged',name:'Wits',method:'starforged',defaultValue:2},
          {id:'5pfh-combat',group:'5PFH',name:'Combat',method:'d6plus',defaultValue:0},
          {id:'5pfh-toughness',group:'5PFH',name:'Toughness',method:'d6plus',defaultValue:0},
          {id:'5pfh-speed',group:'5PFH',name:'Speed',method:'d6plus',defaultValue:0},
          {id:'5pfh-savvy',group:'5PFH',name:'Savvy',method:'d6plus',defaultValue:0},
          {id:'5pfh-luck',group:'5PFH',name:'Luck',method:'d6plus',defaultValue:0}
        ]};
      }
      return state.entityAttributeDefaults.rows;
    }catch(e){return [];}
  }
  function attrKey(row){return String(row.group||'General')+'.'+String(row.name||row.id||'Attribute');}
  function ensureEntAttrs(ent){if(!ent.attributeValues || typeof ent.attributeValues!=='object')ent.attributeValues={};defaults().forEach(r=>{const k=attrKey(r); if(ent.attributeValues[k]==null)ent.attributeValues[k]=Number(r.defaultValue||0);}); return ent.attributeValues;}
  function renderEntityAttributes(){
    const ent=activeEntity();
    const card=document.getElementById('entityCard');
    if(!card)return;
    const old=document.getElementById('entityAttributePanel');
    if(old)old.remove();
    if(!ent || String(ent.type||'').toLowerCase()!=='npc')return;
    ensureEntAttrs(ent);
    const groups={};
    defaults().forEach(r=>{const g=r.group||'General'; (groups[g]=groups[g]||[]).push(r);});
    const html=Object.entries(groups).map(([group,rows])=>`<div class="entity-attr-line"><span class="entity-attr-system">${esc(group)}</span>${rows.map(r=>{const k=attrKey(r);return `<label class="entity-attr-field" title="${esc(r.method==='starforged'?'Starforged action roll':'d6 + attribute roll')}"><span>${esc(r.name)}</span><input type="number" step="1" value="${Number(ent.attributeValues[k]||0)}" data-entity-attr-value="${esc(k)}"><button type="button" class="tiny secondary entity-attr-roll" data-entity-attr-roll="${esc(k)}" data-entity-attr-method="${esc(r.method||'d6plus')}" data-entity-attr-label="${esc(group+' '+r.name)}" title="Roll ${esc(group+' '+r.name)}">🎲</button></label>`;}).join('')}</div>`).join('');
    const panel=document.createElement('div');
    panel.id='entityAttributePanel';
    panel.className='entity-attribute-panel';
    panel.innerHTML=html;
    const head=card.querySelector('.entity-head-fields');
    if(head && head.parentNode)head.parentNode.insertBefore(panel, head.nextSibling);
  }
  function renderAttributeSettings(){
    const sec=document.querySelector('[data-settings-section="entity"]');
    if(!sec)return;
    const rows=defaults();
    sec.innerHTML=`<h3>Entity Defaults</h3><p class="small">NPC attribute rows shown under the Name field. Choose which dice roller each attribute uses.</p><div class="entity-attr-defaults"><div class="entity-attr-default-head"><span>System</span><span>Attribute</span><span>Roll Method</span><span>Default</span><span></span></div>${rows.map((r,i)=>`<div class="entity-attr-default-row" data-attr-default-index="${i}"><input data-attr-default-field="group" value="${esc(r.group||'')}"><input data-attr-default-field="name" value="${esc(r.name||'')}"><select data-attr-default-field="method"><option value="starforged" ${r.method==='starforged'?'selected':''}>Starforged method</option><option value="d6plus" ${r.method==='d6plus'?'selected':''}>d6 + attribute</option></select><input type="number" step="1" data-attr-default-field="defaultValue" value="${Number(r.defaultValue||0)}"><button type="button" class="secondary tiny" data-attr-default-delete="${i}">×</button></div>`).join('')}</div><div class="button-row"><button type="button" id="addEntityAttributeDefault" class="secondary">＋ Add Attribute</button></div>`;
  }
  function updateToast(leftLabel, formula, challenge, outcome, cls){
    const toast=$('sfRollToast'), statEl=$('sfToastStat'), formulaEl=$('sfToastActionFormula'), challengeEl=$('sfToastChallengeDice'), outcomeEl=$('sfToastOutcome');
    if(statEl)statEl.textContent=String(leftLabel||'ROLL').toUpperCase();
    if(formulaEl)formulaEl.textContent=formula;
    if(challengeEl)challengeEl.textContent=challenge;
    if(outcomeEl){outcomeEl.textContent=outcome; outcomeEl.className='sf-roll-outcome '+(cls||'');}
    if(toast){toast.classList.add('show');toast.setAttribute('aria-hidden','false');clearTimeout(updateToast._timer);updateToast._timer=setTimeout(()=>{toast.classList.remove('show');toast.setAttribute('aria-hidden','true');},9000);}
    try{if(typeof setStatus==='function')setStatus('Roll: '+outcome);}catch(e){}
  }
  function rollAttribute(ent,key,method,label){
    ensureEntAttrs(ent); const stat=Number(ent.attributeValues[key]||0);
    if(method==='starforged'){
      const action=rollDie(6), total=action+stat, c1=rollDie(10), c2=rollDie(10), hits=(total>c1?1:0)+(total>c2?1:0), match=c1===c2;
      const outcome=hits===2?'STRONG HIT':hits===1?'WEAK HIT':'MISS';
      updateToast(label,`${action} + ${stat} = ${total}`,`${c1}, ${c2}${match?' • MATCH':''}`,outcome,(hits===2?'strong-hit':hits===1?'weak-hit':'miss')+(match?' match':''));
    }else{
      const d=rollDie(6), total=d+stat;
      const outcome=total>=6?'SUCCESS':total>=4?'PARTIAL':'SETBACK';
      updateToast(label,`${d} + ${stat} = ${total}`,'d6 + attribute',outcome,total>=6?'strong-hit':total>=4?'weak-hit':'miss');
    }
  }
  function patchRenderEntityTracker(){
    if(typeof renderEntityTracker!=='function' || renderEntityTracker._inc38Wrapped)return;
    const original=renderEntityTracker;
    renderEntityTracker=function(){const r=original.apply(this,arguments); setTimeout(renderEntityAttributes,0); return r;};
    renderEntityTracker._inc38Wrapped=true;
  }
  function filterLifeforms(){
    const rows=qsa('.sd-lifeform-row');
    if(!rows.length)return;
    let visible=0;
    rows.forEach(row=>{const text=(row.textContent||'').toLowerCase(); const ok=text.includes('#lifeform')&&text.includes('#encountered'); row.style.display=ok?'':'none'; if(ok)visible++;});
    const list=document.querySelector('.sd-lifeform-list');
    if(list && !visible && !list.querySelector('.inc38-lifeform-empty')){
      const p=document.createElement('p');p.className='small inc38-lifeform-empty';p.textContent='No Encounter entities tagged both #Lifeform and #Encountered yet.';list.appendChild(p);
    }
    const note=document.querySelector('.sd-lifeform-list')?.parentElement?.querySelector('p.small');
    if(note)note.innerHTML='Shows Encounter entities tagged <strong>#Lifeform</strong> and <strong>#Encountered</strong>.';
  }
  function ensureAddedLifeformTags(){
    const es=getEntityState(); const ent=(es.items||[]).find(e=>e.id===es.activeId)||(es.items||[]).slice(-1)[0];
    if(!ent || String(ent.type||'').toLowerCase()!=='encounter')return;
    if(!Array.isArray(ent.tags))ent.tags=[];
    ['lifeform','encountered'].forEach(t=>{if(!ent.tags.some(x=>String(x).replace(/^#/,'').toLowerCase()===t))ent.tags.push(t);});
    save();
  }
  function makeActualOracleList(){
    const rows=[];
    function walk(obj,path){Object.entries(obj||{}).forEach(([k,v])=>{const p=path.concat(k); if(Array.isArray(v))rows.push({path:p,label:p.slice(-2).join(' > '),hay:p.join(' ').toLowerCase()}); else if(v&&typeof v==='object')walk(v,p);});}
    try{walk(TABLES,[]);}catch(e){}
    const ctx=[];
    ['sdWorkflow','sdStoryIntent','sdActiveFactionRole','sdDistrict','sdMystery','sdObjective','sdThread','sdStakes','sdOpportunity','planet','biome','locationType','surroundings','intent','pacing','phase'].forEach(id=>{const el=$(id); if(el&&el.value)ctx.push(String(el.value).toLowerCase());});
    const text=ctx.join(' ');
    const keywords=['mystery','clue','coverup','corporate','faction','district','settlement','colony','danger','hazard','conflict','security','marine','xeno','android','derelict','ship','space','trade','cargo','exploration','discovery','travel','npc','roleplay','relationship','horror','fear'];
    return rows.map(r=>{let score=0; keywords.forEach(k=>{if(text.includes(k)&&r.hay.includes(k))score+=3;}); if(/investigation|question|mystery|clue/.test(text)&&/mysteries|clue|coverup|story clue/.test(r.hay))score+=5; if(/combat|threat|danger/.test(text)&&/conflict|danger|security|tactical/.test(r.hay))score+=4; if(/station|district|location|surroundings/.test(text)&&/district|location|settlement/.test(r.hay))score+=3; if(/cargo|trade|goods|box/.test(text)&&/trade|cargo/.test(r.hay))score+=5; return {...r,score};}).sort((a,b)=>b.score-a.score||a.label.localeCompare(b.label)).slice(0,10);
  }
  function suggestActualOracles(){
    const rows=makeActualOracleList();
    const out=$('oracleOutput');
    if(out){out.dataset.hasRolls='true'; out.textContent='Recommended Oracles from Story Director\n'+rows.map(r=>'• '+r.path.join(' > ')).join('\n')+'\n\nThese are actual oracle tables currently available in the Oracle section.';}
    const chips=$('sdOracleAdvisor');
    if(chips){chips.innerHTML=rows.map(r=>`<button type="button" class="secondary sd-oracle-chip" data-sd-roll-oracle="${esc(r.path.join('|'))}">${esc(r.path.join(' > '))}</button>`).join('');}
    try{if(typeof window.showSagaAtlasRightTab==='function')window.showSagaAtlasRightTab('oracles');}catch(e){}
  }
  function adjustDirectorState(){
    const view=$('directorStateView'); if(!view)return;
    const camp=Array.from(view.querySelectorAll('.sd-card')).find(el=>/^\s*Campaign State\s*$/i.test((el.querySelector('h4,h3')||{}).textContent||''));
    if(camp && camp.tagName.toLowerCase()!=='details' && !camp.dataset.inc38Wrapped){
      const det=document.createElement('details'); det.className='sd-collapse sd-campaign-state-collapse'; det.open=false; det.innerHTML='<summary>Campaign State</summary>';
      Array.from(camp.childNodes).forEach(n=>{if(!(n.nodeType===1&&/^H[34]$/.test(n.tagName)))det.appendChild(n);});
      camp.replaceWith(det);
    }
    const scene=Array.from(view.querySelectorAll('details.sd-collapse')).find(d=>/Scene Inspiration/i.test((d.querySelector('summary')||{}).textContent||''));
    const trackers=Array.from(view.querySelectorAll('details.sd-collapse')).find(d=>/Trackers in Current Scene/i.test((d.querySelector('summary')||{}).textContent||''));
    if(scene && trackers && scene.previousElementSibling!==trackers){trackers.insertAdjacentElement('afterend',scene);}
  }
  let scheduled=false;
  function scheduleUiPatch(){if(scheduled)return; scheduled=true; setTimeout(()=>{scheduled=false; patchRenderEntityTracker(); renderEntityAttributes(); filterLifeforms(); adjustDirectorState();},60);}
  function boot(){
    patchRenderEntityTracker(); renderEntitySettingsOnce(); renderEntityAttributes(); filterLifeforms(); adjustDirectorState();
    document.addEventListener('input',function(ev){
      const t=ev.target;
      if(t.matches('[data-entity-attr-value]')){const ent=activeEntity(); if(!ent)return; ensureEntAttrs(ent); ent.attributeValues[t.dataset.entityAttrValue]=Number(t.value||0); save();}
      if(t.matches('[data-attr-default-field]')){const row=t.closest('[data-attr-default-index]'); if(!row)return; const idx=Number(row.dataset.attrDefaultIndex); const rows=defaults(); const r=rows[idx]; if(!r)return; r[t.dataset.attrDefaultField]=t.dataset.attrDefaultField==='defaultValue'?Number(t.value||0):t.value; if(!r.id)r.id='attr-'+Date.now()+'-'+idx; save(); renderEntityAttributes();}
    });
    document.addEventListener('change',function(ev){if(ev.target.matches('[data-attr-default-field]')){const row=ev.target.closest('[data-attr-default-index]'); if(!row)return; const idx=Number(row.dataset.attrDefaultIndex); const rows=defaults(); const r=rows[idx]; if(!r)return; r[ev.target.dataset.attrDefaultField]=ev.target.dataset.attrDefaultField==='defaultValue'?Number(ev.target.value||0):ev.target.value; save(); renderAttributeSettings(); renderEntityAttributes();}});
    document.addEventListener('click',function(ev){
      const roll=ev.target.closest('[data-entity-attr-roll]'); if(roll){ev.preventDefault(); const ent=activeEntity(); if(ent)rollAttribute(ent,roll.dataset.entityAttrRoll,roll.dataset.entityAttrMethod,roll.dataset.entityAttrLabel); return;}
      if(ev.target && ev.target.id==='addEntityAttributeDefault'){ev.preventDefault(); defaults().push({id:'attr-'+Date.now(),group:'5PFH',name:'New Attribute',method:'d6plus',defaultValue:0}); save(); renderAttributeSettings(); renderEntityAttributes(); return;}
      const del=ev.target.closest('[data-attr-default-delete]'); if(del){ev.preventDefault(); defaults().splice(Number(del.dataset.attrDefaultDelete),1); save(); renderAttributeSettings(); renderEntityAttributes(); return;}
      if(ev.target.closest('[data-sd-add-lifeform-encounter]')){setTimeout(()=>{ensureAddedLifeformTags(); filterLifeforms();},120); return;}
    });
    document.addEventListener('click',function(ev){const btn=ev.target.closest('#sdSuggestOracles'); if(!btn)return; ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); suggestActualOracles();},true);
    ['showDirectorStateTab','showJournalTab','showOutputTab','showCenterPartyTab','showCenterColonyTab'].forEach(id=>{const b=$(id); if(b)b.addEventListener('click',()=>setTimeout(adjustDirectorState,80));});
    setTimeout(scheduleUiPatch,300); setTimeout(scheduleUiPatch,1000); setTimeout(scheduleUiPatch,2000);
  }
  function renderEntitySettingsOnce(){renderAttributeSettings();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot); else boot();
  window.SagaAtlasInc38={renderEntityAttributes,renderAttributeSettings,suggestActualOracles,adjustDirectorState};
})();
