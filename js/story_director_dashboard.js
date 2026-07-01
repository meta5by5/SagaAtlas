(function(){
  'use strict';
  const STORE='sagaAtlasStoryDirectorV2';
  const APP_STORE='sagaAtlasSceneOracleV1';
  const $=id=>document.getElementById(id);
  const qs=(s,r=document)=>r.querySelector(s);
  const qsa=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const tables=()=>window.SCENE_TABLES||{};
  const pick=a=>Array.isArray(a)&&a.length?a[Math.floor(Math.random()*a.length)]:'';
  function byPath(path){return path.reduce((a,k)=>a&&a[k],tables());}
  function roll(path){return pick(byPath(path)||[]);}
  function loadApp(){try{return JSON.parse(localStorage.getItem(APP_STORE)||'{}')||{};}catch(e){return {};}}
  function saveApp(app){try{localStorage.setItem(APP_STORE,JSON.stringify(app));}catch(e){}}
  function defaults(){return {
    act:'Act I — Opening Situation',
    beatScale:'Scene',
    workflow:'Continue Current Story',
    storyIntent:'Let oracles decide',
    currentLocation:'',
    currentDistrict:'Auto / current district',
    objective:'',
    activeFactionRole:'Auto / current faction role',
    activeFaction:'Auto / no specific faction',
    activeMystery:'Auto / current mystery',
    currentBeat:'Discovery',
    state:{heat:3,hope:6,mystery:4,resources:5,momentum:5,threat:3},
    sectionsOpen:{current:true,scene:true,threads:true,threats:true,mysteries:false,factions:false,resources:false,relationships:false,timers:false},
    currentSceneTrackerIds:[],
    sceneSnapshot:null,
    pendingReview:null,
    suggestedTrackers:[],
    party:{
      resources:[
        {id:'supply',name:'Supply',value:5,max:5,type:'Resources',note:'Starforged-style party supply, 0–5.'},
        {id:'fuel',name:'Fuel',value:5,max:5,type:'Resources',note:'Optional Starforged-style 1–5 resource track for ship/vehicle fuel. Use only if you want granular fuel pressure separate from Supply.'},
        {id:'medical',name:'Medical Supplies',value:5,max:5,type:'Resources',note:'Optional Starforged-style 1–5 resource track for medkits, treatment access, or trauma supplies.'},
        {id:'ammo',name:'Ammo / Loadout',value:5,max:5,type:'Resources',note:'Optional Starforged-style 1–5 readiness track for ammunition, charges, or mission loadout.'},
        {id:'credits',name:'Credits',value:0,type:'Currency',note:'Currency count; not a tracker.'}
      ],
      tracks:[
        {id:'party-main-goal',name:'Party Objective',value:1,max:10,type:'Manual',note:'Manual progress track for the active crew goal.'},
        {id:'ship-readiness',name:'Ship Readiness',value:6,max:10,type:'Manual',note:'Manual party/vehicle condition tracker.'}
      ],
      timers:[
        {id:'party-deadline',name:'Mission Deadline',value:6,max:6,type:'Manual Timer',mode:'down',note:'Manual countdown timer.'}
      ],
      conditions:[]
    },
    colony:{
      name:'',campaignTurn:1,campaignMilestones:0,rosterSize:8,colonyMorale:5,buildPointsPerTurn:1,buildPoints:0,storyPoints:0,researchPointsPerTurn:1,researchPoints:0,ancientSigns:0,repairCapacity:1,augmentationPoints:0,enemyInformation:0,colonyDefenses:0,rawMaterials:0,missionData:0,colonyIntegrity:10,calamityPoints:0,grunts:12,conditionNotes:'',lifeformNotes:'',notes:'',crewRows:[{name:'',role:'',reactions:'',combat:'',loyalty:'',speed:'',toughness:'',savvy:'',xp:'',upgrades:''}]
    },
    trackers:[
      {id:'corp-heat',name:'Corporate Heat',type:'Threats',value:3,max:8,trigger:'At 6+, corporate security starts controlling access.'},
      {id:'crew-morale',name:'Crew Morale',type:'Relationships',value:5,max:10,trigger:'At 3 or less, crew conflict complicates scenes.'},
      {id:'mission-progress',name:'Current Mission Progress',type:'Mysteries',value:1,max:10,trigger:'At 10, the core objective can be resolved.'},
      {id:'supply-pressure',name:'Supplies and Leverage',type:'Resources',value:5,max:10,trigger:'At 2 or less, every scene should force a resource choice.'}
    ],
    timers:[
      {id:'timer-next-pressure',name:'Next Pressure Event',type:'Timers',value:4,max:6,mode:'down',trigger:'At 0, introduce a hard move, arrival, system failure, or faction demand.'}
    ],
    threads:[
      {id:'thread-main',name:'Main Campaign Question',value:1,max:10,status:'Open',note:'Define through the next generated campaign or adventure seed.'}
    ],
    lastPackage:null,
    narrativeDraft:''
  };}
  function load(){try{return merge(defaults(),JSON.parse(localStorage.getItem(STORE)||'{}')||{});}catch(e){return defaults();}}
  function merge(base,extra){
    const out={...base,...extra};
    out.state={...base.state,...(extra&&extra.state||{})};
    out.sectionsOpen={...base.sectionsOpen,...(extra&&extra.sectionsOpen||{})};
    out.trackers=Array.isArray(out.trackers)?out.trackers:base.trackers;
    out.timers=Array.isArray(out.timers)?out.timers:base.timers;
    out.threads=Array.isArray(out.threads)?out.threads:base.threads;
    out.party={...base.party,...(extra&&extra.party||{})};
    out.party.resources=Array.isArray(out.party.resources)?out.party.resources:base.party.resources;
    out.party.resources=normalizePartyResources(out.party.resources);
    out.party.tracks=Array.isArray(out.party.tracks)?out.party.tracks:base.party.tracks;
    out.party.timers=Array.isArray(out.party.timers)?out.party.timers:base.party.timers;
    out.party.conditions=Array.isArray(out.party.conditions)?out.party.conditions:base.party.conditions;
    out.colony={...base.colony,...(extra&&extra.colony||{})};
    out.colony.crewRows=Array.isArray(out.colony.crewRows)?out.colony.crewRows:base.colony.crewRows;
    if(!extra || !Object.prototype.hasOwnProperty.call(extra,'activeFactionRole')){
      const old=extra&&extra.activeFaction;
      if(old && !String(old).startsWith('entity:') && !/^Auto \/ no specific faction/.test(String(old))){
        out.activeFactionRole=old;
        out.activeFaction='Auto / no specific faction';
      }
    }
    return out;
  }
  function normalizePartyResources(list){
    const seen=new Set();
    const normalized=(list||[]).map(r=>{
      const item={...r};
      if(String(item.id||'').toLowerCase()==='credits' || /credit/i.test(item.name||'')){
        item.id='credits'; item.name='Credits'; item.type='Currency'; delete item.max; item.value=Number(item.value)||0;
      } else {
        item.type=item.type||'Resources';
        item.max=5;
        item.value=Math.max(0,Math.min(5,Number(item.value)||0));
        if(!item.note) item.note='Optional Starforged-style party resource, 1–5 during play; 0 means depleted.';
      }
      return item;
    }).filter(item=>{const id=item.id||item.name; if(seen.has(id)) return false; seen.add(id); return true;});
    if(!normalized.some(r=>r.id==='supply')) normalized.unshift({id:'supply',name:'Supply',value:5,max:5,type:'Resources',note:'Starforged-style party supply, 0–5.'});
    if(!normalized.some(r=>r.id==='credits')) normalized.push({id:'credits',name:'Credits',value:0,type:'Currency',note:'Currency count; not a tracker.'});
    return normalized;
  }
  let sd=load();
  function save(){try{localStorage.setItem(STORE,JSON.stringify(sd));}catch(e){}}
  function setLegacy(id,val){const el=$(id); if(!el)return; el.value=val; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true}));}
  function syncFromLegacy(){
    const app=loadApp();
    if(!sd.currentLocation) sd.currentLocation=[app.locationType,app.surroundings].filter(Boolean).join(' — ');
    if(!sd.objective) sd.objective=app.currentThread||'';
    if(typeof app.threatLevel==='number') sd.state.threat=app.threatLevel;
    if(typeof app.mysteryLevel==='number') sd.state.mystery=app.mysteryLevel;
  }
  function syncToLegacy(){
    const obj=$('sdObjective')&&$('sdObjective').value || sd.objective;
    sd.objective=obj;
    if(obj) setLegacy('currentThread',obj);
    const loc=$('sdLocation')&&$('sdLocation').value || sd.currentLocation;
    sd.currentLocation=loc;
    if(loc){
      const parts=loc.split(/ — | - |, /);
      if(parts[0]) setLegacy('locationType',closestOption('locationType',parts[0])||$('locationType')?.value||parts[0]);
      if(parts[1]) setLegacy('surroundings',closestOption('surroundings',parts.slice(1).join(' '))||$('surroundings')?.value||parts[1]);
    }
    setLegacy('intent',mapIntent(sd.workflow,sd.storyIntent));
    setLegacy('phase',mapPhase(sd.currentBeat));
    if($('threatLevel')) setLegacy('threatLevel',String(sd.state.threat));
    if($('mysteryLevel')) setLegacy('mysteryLevel',String(sd.state.mystery));
  }
  function closestOption(id,needle){const el=$(id); if(!el)return ''; const n=String(needle||'').toLowerCase(); const opts=Array.from(el.options||[]); return (opts.find(o=>o.value.toLowerCase()===n)||opts.find(o=>o.value.toLowerCase().includes(n)||n.includes(o.value.toLowerCase()))||{}).value||'';}
  function mapIntent(workflow,intent){
    if(/Encounter/.test(workflow)) return 'Combat pressure';
    if(/Investigation/.test(workflow)||/Mystery/.test(intent)) return 'Investigation';
    if(/District|Travel|Explore/.test(workflow)) return 'Discovery';
    if(/World/.test(workflow)) return 'Faction complication';
    if(/Social|NPC|Roleplay/.test(intent)) return 'Social encounter';
    if(/Resource|Supply/.test(intent)) return 'Resource pressure';
    return 'Discovery';
  }
  function mapPhase(beat){
    if(/Opening|Setup|Hook/.test(beat)) return 'Setup';
    if(/Approach|Travel/.test(beat)) return 'Approach';
    if(/Discovery|Reveal|Clue/.test(beat)) return 'Discovery';
    if(/Complication|Twist|Setback/.test(beat)) return 'Complication';
    if(/Confrontation|Clash|Encounter/.test(beat)) return 'Confrontation';
    if(/Choice|Decision/.test(beat)) return 'Choice';
    if(/Aftermath|Consequence|Resolution/.test(beat)) return 'Consequence';
    return 'Transition';
  }
  function installUi(){
    const panel=$('controlsPanel'); if(!panel || $('storyDirectorDashboard'))return;
    syncFromLegacy();
    const after=qs('.panel-title-row',panel);
    const director=document.createElement('div'); director.id='storyDirectorDashboard'; director.className='story-director-dashboard';
    director.innerHTML=markup();
    after.after(director);
    wrapLegacy(panel,director);
    bindUi();
    renderAll();
  }
  function wrapLegacy(panel,director){
    if($('advancedLegacyBuilder'))return;
    const wrap=document.createElement('details'); wrap.id='advancedLegacyBuilder'; wrap.className='legacy-builder-wrap';
    wrap.innerHTML='<summary>Hidden Legacy Generator Sync <span class="small">— synced from Shaping the Situation</span></summary><p class="small sd-advanced-note">Legacy fields are now merged into Shaping the Situation. This hidden compatibility area is retained only so the original generator can still read the synced values.</p>';
    wrap.hidden=true;
    const nodes=[];
    let n=director.nextSibling;
    while(n){ const next=n.nextSibling; if(n.nodeType===1 || n.nodeType===3) nodes.push(n); n=next; }
    nodes.forEach(x=>wrap.appendChild(x));
    panel.appendChild(wrap);
  }
  function markup(){return `
    <div class="sd-hero">
      <div><h3>Scene Editor</h3><p class="small">Jump-start campaigns, acts, scenes, encounters, investigations, districts, and world evolution while preserving continuity.</p></div>
      <div class="sd-hero-state"><span>Threat <b id="sdThreatMini">—</b></span><span>Heat <b id="sdHeatMini">—</b></span><span>Hope <b id="sdHopeMini">—</b></span></div>
    </div>
    <div class="button-row sd-main-actions sd-director-actions"><button id="sdContinueStory" type="button">What Happens Next?</button><button id="sdStartScene" type="button" class="secondary">Start Scene</button><button id="sdCompleteScene" type="button" class="secondary">Complete Scene</button><button id="sdSuggestOracles" type="button" class="secondary">Suggest Oracles</button></div>
    <div class="sd-continuity-strip" id="sdContinuityStrip"></div>
    <div class="sd-tabs" role="tablist" aria-label="Story Director sections">
      <button type="button" class="sd-tab active" data-sd-tab="current">Current Story</button>
      <button type="button" class="sd-tab" data-sd-tab="generate">Generate</button>
      <button type="button" class="sd-tab" data-sd-tab="party">Party Dashboard</button>
      <button type="button" class="sd-tab" data-sd-tab="trackers">Trackers</button>
      <button type="button" class="sd-tab" data-sd-tab="colony">Colony</button>
      <button type="button" class="sd-tab" data-sd-tab="review">Scene Review</button>
    </div>
    <details class="sd-collapse sd-director-guide"><summary>How to use Story Director, CIE, and legacy controls</summary>
      <div class="sd-guide-grid">
        <div><b>Story Director</b><p class="small">Use this first. It is the friendly campaign workflow: set current story context, generate scenes or encounters, review effects, and carry master trackers forward.</p></div>
        <div><b>Story Engine</b><p class="small">The underlying oracle/advisor layer. Story Director calls it automatically; open only for raw suggestions or troubleshooting.</p></div>
        <div><b>Advanced Legacy Controls</b><p class="small">Compatibility area for the original generator inputs. Use only for manual troubleshooting or if you want to bypass the Director workflow.</p></div>
      </div>
    </details>
    <section class="sd-view active" data-sd-view="current">
      <div class="sd-card sd-current-card">
        <h4>Where are we now?</h4>
        <div class="sd-grid">
          <label>Current Location<input id="sdLocation" placeholder="Operations District — maintenance tunnel"></label>
          <label>Current Objective<input id="sdObjective" placeholder="Find the missing survey team before corporate security locks down the site"></label>
          <label>Current Act<select id="sdAct"><option>Act I — Opening Situation</option><option>Act II — Rising Complications</option><option>Act III — Reversal / Hidden Truth</option><option>Act IV — Descent / Crisis</option><option>Act V — Finale / Consequences</option></select></label>
          <label>Current Beat<select id="sdCurrentBeat"><option>Opening Hook</option><option>Approach</option><option>Discovery</option><option>Clue Reveal</option><option>Complication</option><option>Roleplay Pressure</option><option>Threat Escalation</option><option>Meaningful Choice</option><option>Confrontation</option><option>Aftermath</option></select></label>
          <label>Active Faction Role<select id="sdFactionRole"><option>Auto / current faction role</option><option>Corporate employer</option><option>Colonial authority</option><option>Labor bloc or union</option><option>Criminal syndicate</option><option>Frontier marshal / law office</option><option>Rival crew</option><option>Military command</option><option>Unknown xeno influence</option></select></label>
          <label>Active Faction<select id="sdFaction"><option>Auto / no specific faction</option><option value="__create_faction__">＋ Create New Faction…</option></select></label>
          <label>Active Mystery<select id="sdMystery"><option>Auto / current mystery</option><option>Missing person</option><option>Altered records</option><option>Hidden cargo</option><option>Sabotage</option><option>Biological anomaly</option><option>False distress call</option><option>Illegal research</option><option>Ancient signal</option><option>Corporate coverup</option></select></label>
        </div>
      </div>
      <details class="sd-collapse" data-sd-section="state" open><summary>Campaign State <span class="small">read-only for now</span></summary><div id="sdStateSummary" class="sd-state-summary"></div></details>
      <details class="sd-collapse" data-sd-section="scene" open><summary>Trackers in Current Scene</summary><div id="sdCurrentSceneTrackers" class="sd-tracker-list"></div></details>
      <details class="sd-collapse" data-sd-section="threads" open><summary>Open Threads</summary><div id="sdOpenThreads" class="sd-tracker-list"></div></details>
    </section>
    <section class="sd-view" data-sd-view="generate">
      <div class="sd-card"><h4>What are you trying to move forward?</h4>
        <div class="sd-grid">
          <label>Workflow<select id="sdWorkflow"><option>Start a Campaign</option><option>Plan an Act</option><option>Continue Current Story</option><option>Generate Next Scene</option><option>Generate Encounter</option><option>Build Investigation</option><option>Generate District Scene</option><option>Travel / Exploration Beat</option><option>Downtime / Recovery Beat</option><option>Advance World Evolution</option></select></label>
          <label>Scale<select id="sdBeatScale"><option>Campaign</option><option>Act</option><option>Adventure</option><option>Story Beat</option><option>Scene</option><option>Encounter</option><option>Conversation</option><option>Discovery</option></select></label>
          <label>Story Intent<select id="sdStoryIntent"><option>Let oracles decide</option><option>Reveal information</option><option>Increase tension</option><option>Introduce danger</option><option>Develop NPC or faction</option><option>Advance mystery</option><option>Reward exploration</option><option>Force meaningful choice</option><option>Escalate threat</option><option>Give recovery or hope</option></select></label>
          <label>District / Zone<select id="sdDistrict"><option>Auto / current district</option><option>Access</option><option>Community</option><option>Engineering</option><option>Living</option><option>Medical</option><option>Operations</option><option>Production</option><option>Research</option><option>Security</option><option>Commercial</option></select></label>
        </div>
        <div class="sd-workflow-help" id="sdWorkflowHelp"></div>
        <div class="button-row"><button id="sdGeneratePackage" type="button">Generate Story Package</button><button id="sdGenerateSceneLegacy" type="button" class="secondary">Use Standard Scene Generator</button></div>
        <div class="button-row sd-small-actions"><button id="sdSceneDecrement" type="button" class="secondary">Scene −1</button><button id="sdSceneReset" type="button" class="secondary">Reset Scene #</button></div>
      </div>
      <details class="sd-collapse" open><summary>Oracle Advisor</summary><div id="sdOracleAdvisor" class="sd-oracle-advisor"></div></details>
      <p class="small sd-moved-note">Generated Narrative Draft now lives in the center <b>Scene Inspiration</b> tab with the creative output.</p>
    </section>
    <section class="sd-view" data-sd-view="party">
      <div class="sd-card"><h4>Party Dashboard</h4><p class="small">Manual party-facing tracks, timers, resources, and conditions. These are separate from read-only Campaign State and can be adjusted directly during play.</p></div>
      <details class="sd-collapse" open><summary>Party Resources</summary><div id="sdPartyResources" class="sd-tracker-list"></div></details>
      <details class="sd-collapse" open><summary>Manual Progress Tracks</summary><div class="button-row sd-small-actions"><button type="button" class="secondary" data-sd-add-manual-track>Add Manual Track</button></div><div id="sdManualTracks" class="sd-tracker-list"></div></details>
      <details class="sd-collapse" open><summary>Manual Timers</summary><div class="button-row sd-small-actions"><button type="button" class="secondary" data-sd-add-manual-timer>Add Manual Timer</button></div><div id="sdManualTimers" class="sd-tracker-list"></div></details>
      <details class="sd-collapse"><summary>Conditions and Notes</summary><div id="sdPartyConditions" class="sd-condition-list"></div><div class="button-row sd-small-actions"><button type="button" class="secondary" data-sd-add-condition>Add Condition</button></div></details>
    </section>
    <section class="sd-view" data-sd-view="trackers">
      <div class="sd-card"><h4>Campaign Trackers</h4><p class="small">Persistent master trackers. Edit these manually here; current scenes use snapshots and only update master values after Scene Review.</p><div class="button-row sd-small-actions"><button type="button" class="secondary" data-sd-add-master-tracker>Add Campaign Tracker</button><button type="button" class="secondary" data-sd-add-master-timer>Add Countdown Timer</button></div></div>
      <div id="sdTrackerSections"></div>
    </section>

    <section class="sd-view" data-sd-view="colony">
      <div class="sd-card"><h4>5PFH Planetfall-style Colony Worksheet</h4><p class="small">Editable campaign/base worksheet for short-session play. It is inspired by the Planetfall colony tracking flow without forcing the story through the mechanics.</p></div>
      <div id="sdColonySheet" class="sd-colony-sheet"></div>
    </section>
    <section class="sd-view" data-sd-view="review">
      <div class="sd-card"><h4>Scene Review and Campaign Effects</h4><p class="small">After a scene, use Complete Scene to review likely campaign effects in one popup with yes/no sliders, then apply accepted changes to master trackers.</p></div>
      <div id="sdSceneReview"></div>
    </section>`;}
  function bindUi(){
    qsa('.sd-tab').forEach(b=>b.addEventListener('click',()=>showTab(b.dataset.sdTab)));
    ['sdLocation','sdObjective','sdAct','sdCurrentBeat','sdFactionRole','sdFaction','sdMystery','sdWorkflow','sdBeatScale','sdStoryIntent','sdDistrict'].forEach(id=>{
      const el=$(id); if(!el)return; el.addEventListener('input',readDirectorForm); el.addEventListener('change',readDirectorForm);
    });
    const factionSelect=$('sdFaction');
    if(factionSelect){
      factionSelect.addEventListener('focus',()=>{updateFactionOptions(); setSel('sdFaction',sd.activeFaction);});
      factionSelect.addEventListener('pointerdown',()=>{updateFactionOptions(); setSel('sdFaction',sd.activeFaction);});
      factionSelect.addEventListener('click',()=>{updateFactionOptions(); setSel('sdFaction',sd.activeFaction);});
    }
    $('sdContinueStory')?.addEventListener('click',()=>generatePackage('Continue Current Story'));
    $('sdSuggestOracles')?.addEventListener('click',suggestOraclesToOraclePanel);
    $('sdStartScene')?.addEventListener('click',startSceneSnapshot);
    $('sdCompleteScene')?.addEventListener('click',openSceneReviewModal);
    $('sdGeneratePackage')?.addEventListener('click',()=>{ readDirectorForm(); generatePackage(sd.workflow); setTimeout(()=>window.SagaStoryDirector&&window.SagaStoryDirector.stayOpen&&window.SagaStoryDirector.stayOpen(),0); });
    $('sdGenerateSceneLegacy')?.addEventListener('click',()=>{$('generateScene')?.click(); setTimeout(()=>{suggestFromLatestScene(); window.SagaStoryDirector&&window.SagaStoryDirector.stayOpen&&window.SagaStoryDirector.stayOpen();},250);});
    $('sdSceneDecrement')?.addEventListener('click',()=>{decrementSceneNumber();});
    $('sdSceneReset')?.addEventListener('click',()=>{resetSceneNumber();});
    document.addEventListener('click',function(ev){
      const openEnt=ev.target.closest('[data-sd-open-entity]'); if(openEnt){ openEntityFromDirector(openEnt.dataset.sdOpenEntity); return; }
      const addLife=ev.target.closest('[data-sd-add-lifeform-encounter]'); if(addLife){ addLifeformEncounterEntity(); return; }
      const accept=ev.target.closest('[data-accept-suggested-trackers]'); if(accept){acceptSuggestedTrackers();}
      const apply=ev.target.closest('[data-apply-scene-effects]'); if(apply){applySceneEffects();}
      const roll=ev.target.closest('[data-sd-roll-oracle]'); if(roll){rollRecommendedOracle(roll.dataset.sdRollOracle);}
      const tStep=ev.target.closest('[data-sd-track-step]'); if(tStep){adjustTrackerItem(tStep.dataset.sdTrackerId, Number(tStep.dataset.sdTrackStep)||0);}
      const tEdit=ev.target.closest('[data-sd-edit-tracker]'); if(tEdit){editTrackerItem(tEdit.dataset.sdEditTracker);}
      const tDel=ev.target.closest('[data-sd-delete-tracker]'); if(tDel){deleteTrackerItem(tDel.dataset.sdDeleteTracker);}
      const sStep=ev.target.closest('[data-sd-suggest-step]'); if(sStep){adjustSuggestedTracker(sStep.dataset.sdSuggestId, Number(sStep.dataset.sdSuggestStep)||0);}
      const sToggle=ev.target.closest('[data-sd-suggest-toggle]'); if(sToggle){toggleSuggestedTracker(sToggle.dataset.sdSuggestToggle, sToggle.checked);}
      const copyNarr=ev.target.closest('[data-sd-copy-narrative]'); if(copyNarr){copyNarrativeDraft();}
      const journalNarr=ev.target.closest('[data-sd-narrative-to-journal]'); if(journalNarr){addNarrativeDraftToJournal();}
      const step=ev.target.closest('[data-sd-step]'); if(step){adjustManualItem(step.dataset.sdKind,step.dataset.sdId,Number(step.dataset.sdStep)||0);}
      const addTrack=ev.target.closest('[data-sd-add-manual-track]'); if(addTrack){addManualTrack();}
      const addTimer=ev.target.closest('[data-sd-add-manual-timer]'); if(addTimer){addManualTimer();}
      const addCond=ev.target.closest('[data-sd-add-condition]'); if(addCond){addCondition();}
      const addMaster=ev.target.closest('[data-sd-add-master-tracker]'); if(addMaster){addMasterTracker();}
      const addMasterTimerBtn=ev.target.closest('[data-sd-add-master-timer]'); if(addMasterTimerBtn){addMasterTimer();}
      const del=ev.target.closest('[data-sd-delete-manual]'); if(del){deleteManualItem(del.dataset.sdKind,del.dataset.sdId);}
      const modalApply=ev.target.closest('[data-sd-review-apply]'); if(modalApply){applySceneReviewModal();}
      const modalClose=ev.target.closest('[data-sd-review-close]'); if(modalClose){closeSceneReviewModal();}
    });
    document.addEventListener('click',function(ev){
      if(ev.target.closest('#generateScene,#cieGenerate,#sdGeneratePackage,#sdContinueStory')) setTimeout(suggestFromLatestScene,300);
    },true);
    document.addEventListener('input',function(ev){
      const narr=ev.target.closest && ev.target.closest('#sdNarrativeDraft');
      if(narr){ sd.narrativeDraft=narr.innerHTML; save(); return; }
      const sugName=ev.target.closest && ev.target.closest('[data-sd-suggest-name]');
      if(sugName){ updateSuggestedTrackerField(sugName.dataset.sdSuggestName,'name',sugName.value); return; }
      const sugMax=ev.target.closest && ev.target.closest('[data-sd-suggest-max]');
      if(sugMax){ updateSuggestedTrackerField(sugMax.dataset.sdSuggestMax,'max',Number(sugMax.value)||1); return; }
      const sugVal=ev.target.closest && ev.target.closest('[data-sd-suggest-value]');
      if(sugVal){ updateSuggestedTrackerField(sugVal.dataset.sdSuggestValue,'value',Number(sugVal.value)||0); return; }
      const manual=ev.target.closest && ev.target.closest('[data-sd-manual-field]');
      if(manual){
        const item=findManual(manual.dataset.sdKind,manual.dataset.sdId); if(!item)return;
        const field=manual.dataset.sdManualField;
        if(field==='name') item.name=manual.value;
        else if(field==='note') item.note=manual.value;
        else if(field==='max') item.max=Math.max(1,Number(manual.value)||1);
        else if(field==='value') item.value=Math.max(0,Math.min(Number(item.max)||10,Number(manual.value)||0));
        else if(field==='text') item.text=manual.value;
        save(); renderAll(); return;
      }
      const inp=ev.target.closest && ev.target.closest('[data-sd-currency-id]'); if(!inp)return;
      const item=findManual(inp.dataset.sdCurrencyKind,inp.dataset.sdCurrencyId); if(!item)return;
      item.value=Math.max(0,Number(inp.value)||0); save();
    });
  }
  function readDirectorForm(){
    sd.currentLocation=$('sdLocation')?.value||sd.currentLocation;
    sd.objective=$('sdObjective')?.value||sd.objective;
    sd.act=$('sdAct')?.value||sd.act;
    sd.currentBeat=$('sdCurrentBeat')?.value||sd.currentBeat;
    sd.activeFactionRole=$('sdFactionRole')?.value||sd.activeFactionRole;
    sd.activeFaction=$('sdFaction')?.value||sd.activeFaction;
    if(sd.activeFaction==='__create_faction__'){ createNewFactionFromDirector(); return; }
    sd.activeMystery=$('sdMystery')?.value||sd.activeMystery;
    sd.workflow=$('sdWorkflow')?.value||sd.workflow;
    sd.beatScale=$('sdBeatScale')?.value||sd.beatScale;
    sd.storyIntent=$('sdStoryIntent')?.value||sd.storyIntent;
    sd.currentDistrict=$('sdDistrict')?.value||sd.currentDistrict;
    syncToLegacy(); save(); renderAll();
  }
  function showTab(tab){qsa('.sd-tab').forEach(b=>b.classList.toggle('active',b.dataset.sdTab===tab));qsa('.sd-view').forEach(v=>v.classList.toggle('active',v.dataset.sdView===tab));}

  function entityStore(){
    try{
      if(typeof ensureEntityState==='function') return ensureEntityState();
      if(window.state && window.state.entities) return window.state.entities;
    }catch(e){}
    return {items:[]};
  }
  function entityTags(ent){
    const tags = Array.isArray(ent && ent.tags) ? ent.tags : [];
    return tags.map(t=>String(t||'').replace(/^#/,'').toLowerCase());
  }
  function encounterEntities(){
    return (entityStore().items||[]).filter(ent=>String(ent.type||'').toLowerCase()==='encounter');
  }
  function lifeformEncounterEntities(){
    return encounterEntities().filter(ent=>entityTags(ent).includes('lifeform'));
  }
  function openEntityFromDirector(id){
    try{ if(typeof setActiveEntity==='function') setActiveEntity(id,true); }catch(e){}
    try{ if(typeof showLeftTab==='function') showLeftTab('entity'); }catch(e){}
  }
  function addLifeformEncounterEntity(){
    try{
      if(typeof addEntity==='function'){
        addEntity('encounter','New Lifeform Encounter');
        const es=entityStore();
        const ent=(es.items||[]).find(x=>x.id===es.activeId) || (es.items||[]).slice(-1)[0];
        if(ent){
          ent.type='encounter';
          if(!Array.isArray(ent.tags)) ent.tags=[];
          if(!ent.tags.some(t=>String(t).toLowerCase()==='lifeform')) ent.tags.push('lifeform');
          if(!ent.name) ent.name='New Lifeform Encounter';
          try{ if(typeof saveState==='function') saveState(); }catch(e){}
          openEntityFromDirector(ent.id);
        }
      }
    }catch(e){ console.warn('Could not add lifeform encounter', e); }
    renderAll();
  }
  function lifeformEncounterMarkup(){
    const rows=lifeformEncounterEntities();
    const list=rows.map(ent=>`<div class="sd-lifeform-row"><button type="button" class="secondary" data-sd-open-entity="${esc(ent.id)}">${esc(ent.name||'Unnamed Lifeform')}</button><span class="small">${esc((ent.tags||[]).map(t=>'#'+String(t).replace(/^#/,'')).join(' '))}</span></div>`).join('') || '<p class="small">No Encounter entities tagged #Lifeform yet. Add one here or create an Encounter entity and tag it #Lifeform.</p>';
    return `<details class="sd-collapse" open><summary>Lifeforms Encountered</summary><p class="small">Shows Encounter entities tagged <strong>#Lifeform</strong>. The full Encounters list remains available in the Entities tab.</p><div class="sd-lifeform-list">${list}</div><div class="button-row sd-small-actions"><button type="button" class="secondary" data-sd-add-lifeform-encounter>＋ Add Lifeform Encounter</button></div></details>`;
  }

  function colonyInput(key,label,type='number'){
    const val=sd.colony[key]??'';
    if(type==='textarea') return `<label>${label}<textarea data-colony-field="${key}" rows="3">${esc(val)}</textarea></label>`;
    return `<label>${label}<input data-colony-field="${key}" type="${type}" value="${esc(String(val))}"></label>`;
  }
  function renderColony(){
    const boxes=[$('sdColonySheet'), $('sdCenterColonySheet')].filter(Boolean); if(!boxes.length)return;
    const c=sd.colony||{};
    const html=`<div class="sd-colony-grid">
      <label>Colony Name<input data-colony-field="name" value="${esc(c.name||'')}"></label>
      ${colonyInput('campaignTurn','Campaign Turn')}
      ${colonyInput('campaignMilestones','Campaign Milestones')}
      ${colonyInput('rosterSize','Roster Size')}
      ${colonyInput('colonyMorale','Colony Morale')}
      ${colonyInput('colonyIntegrity','Colony Integrity')}
      ${colonyInput('buildPointsPerTurn','Build Points / Turn')}
      ${colonyInput('buildPoints','Build Points')}
      ${colonyInput('researchPointsPerTurn','Research Points / Turn')}
      ${colonyInput('researchPoints','Research Points')}
      ${colonyInput('storyPoints','Story Points')}
      ${colonyInput('ancientSigns','Ancient Signs')}
      ${colonyInput('repairCapacity','Repair Capacity')}
      ${colonyInput('augmentationPoints','Augmentation Points')}
      ${colonyInput('enemyInformation','Enemy Information')}
      ${colonyInput('colonyDefenses','Colony Defenses')}
      ${colonyInput('rawMaterials','Raw Materials')}
      ${colonyInput('missionData','Mission Data')}
      ${colonyInput('calamityPoints','Calamity Points')}
      ${colonyInput('grunts','Grunts')}
    </div><div class="sd-grid sd-colony-notes">
      ${colonyInput('conditionNotes','Campaign Condition Notes','textarea')}
      ${colonyInput('notes','Colony Notes','textarea')}
    </div>${lifeformEncounterMarkup()}<details class="sd-collapse" open><summary>Colony Crew Snapshot</summary><table class="sd-colony-table"><thead><tr><th>Name</th><th>Role/Class</th><th>Reactions</th><th>Combat</th><th>Loyalty</th><th>Speed</th><th>Tough.</th><th>Savvy</th><th>XP</th><th>Upgrades</th></tr></thead><tbody>${(c.crewRows||[]).map((r,i)=>`<tr>${['name','role','reactions','combat','loyalty','speed','toughness','savvy','xp','upgrades'].map(k=>`<td><input data-colony-crew="${i}:${k}" value="${esc(r[k]||'')}"></td>`).join('')}</tr>`).join('')}</tbody></table><div class="button-row sd-small-actions"><button type="button" class="secondary" data-colony-add-crew>Add Crew Row</button></div></details>`;
    boxes.forEach(box=>{ box.innerHTML=html; });
  }

  function renderAll(){
    if(!$('storyDirectorDashboard'))return;
    const app=loadApp();
    $('sdLocation').value=sd.currentLocation||[app.locationType,app.surroundings].filter(Boolean).join(' — ');
    $('sdObjective').value=sd.objective||app.currentThread||'';
    updateFactionOptions();
    setSel('sdAct',sd.act); setSel('sdCurrentBeat',sd.currentBeat); setSel('sdFactionRole',sd.activeFactionRole); setSel('sdFaction',sd.activeFaction); setSel('sdMystery',sd.activeMystery); setSel('sdWorkflow',sd.workflow); setSel('sdBeatScale',sd.beatScale); setSel('sdStoryIntent',sd.storyIntent); setSel('sdDistrict',sd.currentDistrict);
    $('sdThreatMini').textContent=`${sd.state.threat}/10`; $('sdHeatMini').textContent=`${sd.state.heat}/8`; $('sdHopeMini').textContent=`${sd.state.hope}/10`;
    renderState(); renderContinuityStrip(); renderCurrentSceneTrackers(); renderThreads(); renderTrackerSections(); renderPartyDashboard(); renderOracleAdvisor(); renderReview(); renderColony(); renderWorkflowHelp(); renderNarrativeDraft(); renderReviewModal();
    const pt=document.querySelector('[data-sd-tab="party"]'); if(pt) pt.style.display='none';
    const pv=document.querySelector('.sd-view[data-sd-view="party"]'); if(pv) pv.style.display='none';
    const ct=document.querySelector('[data-sd-tab="colony"]'); if(ct) ct.style.display='none';
    const cv=document.querySelector('.sd-view[data-sd-view="colony"]'); if(cv) cv.style.display='none';
  }
  function setSel(id,val){const el=$(id); if(el&&val)el.value=val;}
  function factionEntityOptions(){
    let items=[];
    try{
      const es=(typeof ensureEntityState==='function')?ensureEntityState():((window.state&&window.state.entities)||null);
      items=(es&&Array.isArray(es.items))?es.items:[];
    }catch(e){items=[];}
    return items.filter(ent=>{
      const type=String(ent.type||ent.category||'').toLowerCase();
      const tags=Array.isArray(ent.tags)?ent.tags.join(' ').toLowerCase():String(ent.tags||'').toLowerCase();
      return type==='faction' || type.includes('faction') || tags.includes('faction');
    }).map(ent=>({id:ent.id,name:ent.name||'Unnamed Faction'})).filter(ent=>ent.name).sort((a,b)=>a.name.localeCompare(b.name));
  }
  function updateFactionOptions(){
    const roleEl=$('sdFactionRole');
    if(roleEl){
      const roles=['Auto / current faction role','Corporate employer','Colonial authority','Labor bloc or union','Criminal syndicate','Frontier marshal / law office','Rival crew','Military command','Unknown xeno influence'];
      const currentRole=roleEl.value||sd.activeFactionRole||'Auto / current faction role';
      roleEl.innerHTML=roles.map(x=>`<option value="${escAttr(x)}">${esc(x)}</option>`).join('');
      roleEl.value=roles.includes(currentRole)?currentRole:'Auto / current faction role';
    }
    const el=$('sdFaction'); if(!el)return;
    const current=el.value||sd.activeFaction||'Auto / no specific faction';
    const entities=factionEntityOptions();
    const opts=[{label:'Auto / no specific faction',value:'Auto / no specific faction'}]
      .concat(entities.map(ent=>({label:ent.name,value:'entity:'+ent.id})))
      .concat([{label:'＋ Create New Faction…',value:'__create_faction__'}]);
    el.innerHTML=opts.map(o=>`<option value="${escAttr(o.value)}">${esc(o.label)}</option>`).join('');
    let val=current;
    if(current && !opts.some(o=>o.value===current)){
      const clean=String(current).replace(/^Entity:\s*/,'');
      const found=entities.find(e=>e.name===clean || ('entity:'+e.id)===current);
      val=found?'entity:'+found.id:'Auto / no specific faction';
    }
    el.value=opts.some(o=>o.value===val)?val:'Auto / no specific faction';
  }
  function createNewFactionFromDirector(){
    sd.activeFaction='Auto / no specific faction'; save();
    try{
      if(typeof addEntity==='function'){
        addEntity('faction');
        if(typeof window.openEntityEditorOverlay==='function') window.openEntityEditorOverlay();
        else document.getElementById('openEntityListPanel')?.click();
        setTimeout(()=>{
          const f=document.getElementById('entityName'); if(f){f.focus(); f.select();}
          updateFactionOptions(); renderAll();
        },100);
        toast('Created a new Faction entity. Name it in the Entity editor.');
        return;
      }
    }catch(e){}
    toast('Entity editor is not available yet. Open Entities and add a Faction.');
    renderAll();
  }
  function meter(value,max){const pct=Math.max(0,Math.min(100,(Number(value||0)/Number(max||10))*100));return `<div class="sd-meter" title="${value}/${max}"><span style="width:${pct}%"></span></div>`;}
  function renderState(){
    const s=sd.state; const rows=[['Current Location',sd.currentLocation||'Not set'],['Objective',sd.objective||'Not set'],['Act',sd.act],['Beat',sd.currentBeat],['Threat',`${s.threat}/10`],['Heat',`${s.heat}/8`],['Hope',`${s.hope}/10`],['Mystery',`${s.mystery}/10`],['Resources',`${s.resources}/10`],['Momentum',`${s.momentum}/10`]];
    $('sdStateSummary').innerHTML=rows.map(([k,v])=>`<div class="sd-state-row"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('');
  }
  function renderContinuityStrip(){
    const el=$('sdContinuityStrip'); if(!el)return;
    const beat=sd.currentBeat||'Opening Hook';
    const next=nextBeatFor(beat);
    const loc=sd.currentLocation||'Location not set';
    const obj=sd.objective||'Objective not set';
    const hot=sd.state.heat>=6?'High heat':sd.state.heat>=3?'Rising heat':'Low heat';
    el.innerHTML=`<div><span>Now</span><b>${esc(beat)}</b></div><div><span>Next beat</span><b>${esc(next)}</b></div><div><span>Focus</span><b>${esc(obj)}</b></div><div><span>Pressure</span><b>${esc(hot)} · ${esc(loc)}</b></div>`;
  }
  function nextBeatFor(beat){
    const order=['Opening Hook','Approach','Discovery','Clue Reveal','Complication','Roleplay Pressure','Threat Escalation','Meaningful Choice','Confrontation','Aftermath'];
    const i=order.indexOf(beat); return order[(i<0?0:i+1)%order.length];
  }
  function renderCurrentSceneTrackers(){
    let items=[];
    if(sd.sceneSnapshot && Array.isArray(sd.sceneSnapshot.trackers)) items=sd.sceneSnapshot.trackers;
    if(!items.length){ const ids=new Set(sd.currentSceneTrackerIds||[]); items=allTrackers().concat(partyItems()).filter(t=>ids.has(t.id)); }
    if(!items.length) items=rankTrackersForContext().slice(0,4);
    const note=sd.sceneSnapshot?`<p class="small">Scene snapshot from ${esc(new Date(sd.sceneSnapshot.startedAt).toLocaleString())}. Temporary scene changes are reviewed before master trackers update.</p>`:'';
    $('sdCurrentSceneTrackers').innerHTML=note+(items.map(renderTracker).join('') || '<p class="small">No trackers involved yet. Start or generate a scene to suggest them.</p>');
  }
  function renderThreads(){
    $('sdOpenThreads').innerHTML=(sd.threads||[]).map(t=>`<div class="sd-tracker"><div><b>${esc(t.name)}</b><p class="small">${esc(t.status||'Open')} — ${esc(t.note||'')}</p></div>${meter(t.value,t.max)}<span>${t.value}/${t.max}</span></div>`).join('');
  }
  function renderTrackerSections(){
    const root=$('sdTrackerSections'); if(!root)return;
    const groups=['Threats','Mysteries','Factions','Resources','Relationships','Timers'];
    root.innerHTML=groups.map(g=>{
      const items=g==='Timers'?(sd.timers||[]):allTrackers().filter(t=>t.type===g);
      const open=g==='Threats' || g==='Timers';
      return `<details class="sd-collapse sd-tracker-section" ${open?'open':''}><summary>${esc(g)} <span class="small">${items.length} active</span></summary><div class="sd-tracker-list">${items.map(renderEditableTracker).join('')||'<p class="small">No active trackers in this category.</p>'}</div></details>`;
    }).join('');
  }
  function renderTracker(t){return `<div class="sd-tracker"><div><b>${esc(t.name)}</b><p class="small">${esc(t.trigger||t.note||'')}</p></div>${meter(t.value,t.max)}<span>${t.value}/${t.max}</span></div>`;}
  function renderEditableTracker(t){return `<div class="sd-tracker sd-manual-tracker"><div><b>${esc(t.name)}</b><p class="small">${esc(t.trigger||t.note||t.type||'')}</p></div>${meter(t.value,t.max)}<span>${t.value}/${t.max}</span><div class="sd-track-actions"><button type="button" data-sd-track-step="-1" data-sd-tracker-id="${escAttr(t.id)}">−</button><button type="button" data-sd-track-step="1" data-sd-tracker-id="${escAttr(t.id)}">+</button><button type="button" class="tiny secondary oracle-table-edit" data-sd-edit-tracker="${escAttr(t.id)}" title="Edit" aria-label="Edit tracker">✎</button><button type="button" class="secondary" data-sd-delete-tracker="${escAttr(t.id)}">×</button></div></div>`;}
  function renderSuggestedTracker(t){const checked=t.include!==false; return `<div class="sd-tracker sd-suggested-tracker"><label class="sd-include-check"><input type="checkbox" ${checked?'checked':''} data-sd-suggest-toggle="${escAttr(t.id)}"> Include</label><div class="sd-suggested-fields"><input data-sd-suggest-name="${escAttr(t.id)}" value="${escAttr(t.name)}" aria-label="Tracker name"><div class="sd-suggested-values"><label class="small">Value <input type="number" min="0" value="${Number(t.value)||0}" data-sd-suggest-value="${escAttr(t.id)}"></label><label class="small">Max <input type="number" min="1" value="${Number(t.max)||10}" data-sd-suggest-max="${escAttr(t.id)}"></label></div><p class="small">${esc(t.trigger||t.note||t.type||'Suggested tracker')}</p></div>${meter(t.value,t.max)}<span>${t.value}/${t.max}</span><div class="sd-track-actions"><button type="button" data-sd-suggest-step="-1" data-sd-suggest-id="${escAttr(t.id)}">−</button><button type="button" data-sd-suggest-step="1" data-sd-suggest-id="${escAttr(t.id)}">+</button></div></div>`;}
  function allTrackers(){return [...(sd.trackers||[]),...(sd.threads||[])];}

  function partyItems(){return [...(sd.party.resources||[]),...(sd.party.tracks||[]),...(sd.party.timers||[])];}
  function renderPartyDashboard(){
    const pr=$('sdPartyResources'), mt=$('sdManualTracks'), tm=$('sdManualTimers'), cn=$('sdPartyConditions');
    if(pr) pr.innerHTML=(sd.party.resources||[]).map(t=>renderManualTracker(t,'resources')).join('')||'<p class="small">No resources yet.</p>';
    if(mt) mt.innerHTML=(sd.party.tracks||[]).map(t=>renderManualTracker(t,'tracks')).join('')||'<p class="small">No manual progress tracks yet.</p>';
    if(tm) tm.innerHTML=(sd.party.timers||[]).map(t=>renderManualTracker(t,'timers')).join('')||'<p class="small">No manual timers yet.</p>';
    if(cn) cn.innerHTML=(sd.party.conditions||[]).map(c=>`<div class="sd-condition"><span>${esc(c.text||c.name||'Condition')}</span><button type="button" class="secondary" data-sd-delete-manual data-sd-kind="conditions" data-sd-id="${escAttr(c.id)}">Remove</button></div>`).join('')||'<p class="small">No conditions yet.</p>';
  }
  function renderManualTracker(t,kind){
    if(t.type==='Currency' || String(t.id||'').toLowerCase()==='credits'){
      return `<div class="sd-tracker sd-currency-row"><div><b>${esc(t.name||'Credits')}</b><p class="small">${esc(t.note||'Currency count; not a progress track.')}</p></div><label class="sd-currency-input"><span class="small">Amount</span><input type="number" step="1" min="0" value="${Number(t.value)||0}" data-sd-currency-kind="${kind}" data-sd-currency-id="${escAttr(t.id)}"></label></div>`;
    }
    return `<div class="sd-tracker sd-manual-tracker"><div><b>${esc(t.name)}</b><p class="small">${esc(t.note||t.trigger||t.type||'Manual')}</p></div>${meter(t.value,t.max)}<span>${t.value}/${t.max}</span><div class="sd-track-actions"><button type="button" data-sd-step="-1" data-sd-kind="${kind}" data-sd-id="${escAttr(t.id)}">−</button><button type="button" data-sd-step="1" data-sd-kind="${kind}" data-sd-id="${escAttr(t.id)}">+</button><button type="button" class="secondary" data-sd-delete-manual data-sd-kind="${kind}" data-sd-id="${escAttr(t.id)}">×</button></div></div>`;
  }
  function findTrackerById(id){return allTrackers().concat(sd.timers||[]).find(t=>t.id===id);}
  function adjustTrackerItem(id,delta){const t=findTrackerById(id); if(!t)return; const max=Number(t.max)||10; t.value=Math.max(0,Math.min(max,(Number(t.value)||0)+delta)); save(); renderAll();}
  function editTrackerItem(id){const t=findTrackerById(id); if(!t)return; const name=prompt('Tracker name?',t.name); if(name===null)return; const max=prompt('Maximum segments?',t.max||10); if(max===null)return; t.name=(name||t.name).trim(); t.max=Math.max(1,Number(max)||Number(t.max)||10); t.value=Math.max(0,Math.min(t.max,Number(t.value)||0)); save(); renderAll();}
  function deleteTrackerItem(id){if(!confirm('Delete this tracker?'))return; sd.trackers=(sd.trackers||[]).filter(t=>t.id!==id); sd.threads=(sd.threads||[]).filter(t=>t.id!==id); sd.timers=(sd.timers||[]).filter(t=>t.id!==id); sd.currentSceneTrackerIds=(sd.currentSceneTrackerIds||[]).filter(x=>x!==id); save(); renderAll();}
  function findSuggestedTracker(id){return (sd.suggestedTrackers||[]).find(t=>t.id===id);}
  function toggleSuggestedTracker(id,include){const t=findSuggestedTracker(id); if(!t)return; t.include=!!include; save(); renderReview(); renderColony();}
  function adjustSuggestedTracker(id,delta){const t=findSuggestedTracker(id); if(!t)return; const max=Number(t.max)||10; t.value=Math.max(0,Math.min(max,(Number(t.value)||0)+delta)); save(); renderReview(); renderColony();}
  function updateSuggestedTrackerField(id,field,value){const t=findSuggestedTracker(id); if(!t)return; if(field==='name')t.name=String(value||'').trim()||t.name; if(field==='max')t.max=Math.max(1,Number(value)||1); if(field==='value')t.value=Math.max(0,Math.min(Number(t.max)||10,Number(value)||0)); save(); renderReview(); renderColony();}
  function findManual(kind,id){const list=sd.party[kind]||[]; return list.find(x=>x.id===id);}
  function adjustManualItem(kind,id,delta){const item=findManual(kind,id); if(!item)return; if(item.type==='Currency'){item.value=Math.max(0,(Number(item.value)||0)+delta);} else {const cap=Number(item.max)|| (kind==='resources'?5:10); item.value=Math.max(0,Math.min(cap,(Number(item.value)||0)+delta));} save(); renderAll();}
  function addMasterTracker(){
    const name=prompt('Campaign tracker name?'); if(!name)return;
    const type=prompt('Category? Threats, Mysteries, Factions, Resources, Relationships', 'Threats')||'Threats';
    const max=Math.max(1,Number(prompt('Maximum boxes?', '8'))||8);
    const value=Math.max(0,Math.min(max,Number(prompt('Starting value?', '0'))||0));
    sd.trackers.push({id:'tracker-'+Date.now(),name:name.trim(),type:type.trim()||'Threats',value,max,trigger:'Manual campaign tracker.'});
    save(); renderAll();
  }
  function addMasterTimer(){
    const name=prompt('Countdown timer name?'); if(!name)return;
    const max=Math.max(1,Number(prompt('Timer segments?', '6'))||6);
    sd.timers.push({id:'timer-'+Date.now(),name:name.trim(),type:'Timers',value:max,max,mode:'down',trigger:'At 0, trigger the consequence.'});
    save(); renderAll();
  }
  function addManualTrack(){const name=prompt('Manual progress track name?'); if(!name)return; sd.party.tracks.push({id:'manual-'+Date.now(),name:name.trim(),value:0,max:10,type:'Manual',note:'Manual progress track.'}); save(); renderAll();}
  function addManualTimer(){const name=prompt('Manual timer name?'); if(!name)return; sd.party.timers.push({id:'timer-'+Date.now(),name:name.trim(),value:6,max:6,type:'Manual Timer',mode:'down',note:'Manual countdown timer.'}); save(); renderAll();}
  function decrementSceneNumber(){
    const undo=$('undoScene');
    if(undo){ undo.click(); }
    else { const app=loadApp(); if(Array.isArray(app.sceneLog)&&app.sceneLog.length){app.sceneLog.pop(); saveApp(app);} }
    setTimeout(()=>{renderAll(); toast('Scene count reduced by one');},60);
  }
  function resetSceneNumber(){
    if(!confirm('Reset the scene log count? This clears generated scene log entries but does not delete Journal entries.'))return;
    const clear=$('clearLog');
    if(clear){ const oldConfirm=window.confirm; window.confirm=()=>true; try{clear.click();}finally{window.confirm=oldConfirm;} }
    else { const app=loadApp(); app.sceneLog=[]; app.lastSceneText=''; saveApp(app); }
    setTimeout(()=>{renderAll(); toast('Scene count reset');},80);
  }
  function addCondition(){const text=prompt('Condition or note?'); if(!text)return; sd.party.conditions.push({id:'cond-'+Date.now(),text:text.trim()}); save(); renderAll();}
  function deleteManualItem(kind,id){if(!sd.party[kind])return; sd.party[kind]=sd.party[kind].filter(x=>x.id!==id); save(); renderAll();}
  function renderOracleAdvisor(){
    const list=recommendedOracles(); const root=$('sdOracleAdvisor'); if(!root)return;
    root.innerHTML=list.map(o=>`<button type="button" class="secondary sd-oracle-chip" data-sd-roll-oracle="${escAttr(o.path.join('|'))}">${esc(o.label)}</button>`).join('') || '<p class="small">Set a workflow or generate a scene to get oracle suggestions.</p>';
  }
  function renderNarrativeDraft(){
    const el=$('sdNarrativeDraft'); if(!el)return;
    if(document.activeElement!==el){ el.innerHTML=sd.narrativeDraft||''; }
  }
  function copyNarrativeDraft(){
    const html=$('sdNarrativeDraft')?.innerText||'';
    navigator.clipboard?.writeText(html).then(()=>toast('Narrative draft copied')).catch(()=>toast('Copy unavailable'));
  }
  function addNarrativeDraftToJournal(){
    const text=($('sdNarrativeDraft')?.innerText||'').trim(); if(!text){toast('No narrative draft to add');return;}
    const app=loadApp();
    app.journal=Array.isArray(app.journal)?app.journal:[];
    app.journal.unshift({id:'journal-'+Date.now(),createdAt:new Date().toISOString(),title:(sd.lastPackage&&sd.lastPackage.title)||'Story Director Scene',body:text,comments:[],tags:['story-director','scene-draft']});
    saveApp(app); if(typeof window.saveState==='function')window.saveState(); if(typeof window.render==='function')window.render(); toast('Narrative draft added to Journal');
  }
  function renderReview(){
    const root=$('sdSceneReview'); if(!root)return;
    if(!sd.lastPackage){root.innerHTML='<p class="small">No generated scene package yet.</p>';return;}
    const p=sd.lastPackage;
    root.innerHTML=`<div class="sd-card"><h4>${esc(p.title)}</h4><p>${esc(p.summary)}</p><h5>Suggested Campaign Effects</h5>${(p.effects||[]).map(e=>`<div class="sd-effect">${esc(e)}</div>`).join('')}<h5>Suggested Trackers</h5><div class="sd-tracker-list">${(sd.suggestedTrackers||[]).map(renderSuggestedTracker).join('')||'<p class="small">None.</p>'}</div><div class="button-row"><button type="button" data-accept-suggested-trackers>Accept Included Trackers</button><button type="button" class="secondary" data-apply-scene-effects>Apply Scene Effects</button></div></div>`;
  }
  function renderWorkflowHelp(){
    const root=$('sdWorkflowHelp'); if(!root)return;
    const help={
      'Start a Campaign':'Creates a premise, major conflict, starting location, primary mystery, starting trackers, and a 3–5 act outline.',
      'Plan an Act':'Frames this act around a goal, reversal, locations, faction pressure, and a tracker that should resolve or transform by act end.',
      'Continue Current Story':'Uses current location, objective, open threads, and active trackers to answer: what happens next?',
      'Generate Next Scene':'Builds a playable scene package with situation, choices, consequences, suggested oracles, and current-scene trackers.',
      'Generate Encounter':'Creates a social, exploration, combat, or hazard encounter using faction, district, threat, and stakes.',
      'Build Investigation':'Creates a mystery structure with hidden truth, false lead, 3 clues, escalation, and tracker suggestions.',
      'Generate District Scene':'Focuses on a station/colony district with atmosphere, useful detail, local complication, NPC pressure, and oracles.',
      'Travel / Exploration Beat':'Creates a route, discovery, hazard, resource pressure, and transition hook.',
      'Downtime / Recovery Beat':'Creates crew roleplay, maintenance, rumors, healing, trade, or moral consequences.',
      'Advance World Evolution':'Advances factions, clocks, heat, threats, colony pressure, and unresolved mysteries without forcing a direct scene.'
    };
    root.textContent=help[sd.workflow]||'';
  }
  function recommendedOracles(){
    const w=sd.workflow, i=sd.storyIntent, f=sd.activeFactionRole, af=cleanEntity(cleanAuto(sd.activeFaction)), d=sd.currentDistrict, m=sd.activeMystery;
    const base=[
      {label:'Roleplay Option',path:['Campaign Intelligence Engine','Roleplay Option']},
      {label:'Recommended Next Step',path:['Campaign Intelligence Engine','Recommended Next Step']},
      {label:'Director Move',path:['Campaign Intelligence Engine','Director Move']}
    ];
    const extra=[];
    if(/Campaign|Act/.test(w)) extra.push({label:'Inciting Incident',path:['Campaign','Inciting Incident']},{label:'Sector Trouble',path:['Campaign','Sector Trouble']},{label:'Campaign Tone',path:['Campaign','Campaign Tone']});
    if(/Encounter/.test(w)) extra.push({label:'Opposition Tactic',path:['Conflict','Opposition Tactic']},{label:'Security Operation',path:['Marines & Security','Security Operation']},{label:'Tactical Twist',path:['Marines & Security','Tactical Twist']});
    if(/Investigation|Mystery/.test(w+i+m)) extra.push({label:'Clue Type',path:['Mysteries & Coverups','Clue Type']},{label:'Coverup Move',path:['Mysteries & Coverups','Coverup Move']},{label:'Story Clue',path:['Miscellaneous','Story Clue']});
    if(/District|Access|Community|Engineering|Living|Medical|Operations|Production|Research|Security|Commercial/.test(w+d)) extra.push({label:'District Type',path:['Districts','District Type']},{label:'Settlement Trouble',path:['Settlements','Settlement Trouble']},{label:'Local Color',path:['Worlds & Colonies','Local Color']});
    if(/World|Faction|Corporate|Labor|Syndicate|Military|xeno/.test(w+i+f+af)) extra.push({label:'Corporate Pressure',path:['Corporate Powers','Corporate Pressure']},{label:'Faction Project',path:['Factions','Project']},{label:'Public Reaction',path:['Frontier Society','Public Reaction']});
    if(/Travel|Exploration|Discovery/.test(w+i)) extra.push({label:'Discovery',path:['Exploration','Discovery']},{label:'Route Hazard',path:['Exploration','Route Hazard']},{label:'System Pressure',path:['Sector & System Creation','System Pressure']});
    if(sd.state.threat>=6) extra.push({label:'Meaningful Cost',path:['Conflict','Meaningful Cost']},{label:'Pay the Price',path:['Miscellaneous','Pay the Price']});
    if(sd.state.mystery>=6) extra.push({label:'Fear Trigger',path:['Fear and Dread','Fear Trigger']},{label:'Uncanny Detail',path:['Fear and Dread','Uncanny Detail']});
    return [...base,...extra].filter(o=>Array.isArray(byPath(o.path))).slice(0,12);
  }
  function rollRecommendedOracle(encoded){
    const path=String(encoded||'').split('|'); const values=byPath(path)||[]; const result=pick(values); if(!result)return;
    const out=$('oracleOutput'); if(out){ if(!out.dataset.hasRolls){out.textContent='';out.dataset.hasRolls='true';} out.textContent+=(out.textContent?'\n\n---\n':'')+path.join(' > ')+'\n'+result; }
    if(typeof window.showSagaAtlasRightTab==='function') window.showSagaAtlasRightTab('oracles');
  }
  function suggestOraclesToOraclePanel(){
    const lines=recommendedOracles().map(o=>`• ${o.label} (${o.path.join(' > ')})`).join('\n');
    const out=$('oracleOutput'); if(out){ if(!out.dataset.hasRolls){out.textContent='';out.dataset.hasRolls='true';} out.textContent+=(out.textContent?'\n\n---\n':'')+'Recommended Oracles for Current Story\n'+lines; }
    if(typeof window.showSagaAtlasRightTab==='function') window.showSagaAtlasRightTab('oracles');
  }
  function generatePackage(forcedWorkflow){
    readDirectorForm(); syncToLegacy();
    const workflow=forcedWorkflow||sd.workflow; const p=buildPackage(workflow);
    sd.lastPackage=p; sd.narrativeDraft=buildNarrativeDraft(p); sd.suggestedTrackers=p.trackers.map(t=>({...t,include:t.include!==false})); sd.currentSceneTrackerIds=p.trackers.map(t=>t.id).concat(rankTrackersForContext().slice(0,2).map(t=>t.id));
    applySoftState(p);
    save(); renderAll();
    const text=formatPackage(p);
    if(typeof window.addOutput==='function'){
      const app=loadApp(); const no=(app.sceneLog||[]).length+1;
      window.addOutput(no,text,p.title,p.nextCue||'Story Director');
      if(typeof window.saveState==='function') window.saveState();
      if(typeof window.render==='function') window.render();
    } else {
      const card=$('sceneCard'); if(card){card.classList.remove('empty'); card.textContent=text;}
    }
    if(typeof window.showCenterTab==='function') window.showCenterTab('output',true);
  }
  function buildPackage(workflow){
    const context={location:sd.currentLocation||'the current frontier site',objective:sd.objective||'the active mission objective',act:sd.act,beat:sd.currentBeat,faction:cleanEntity(cleanAuto(sd.activeFaction))||roll(['Factions','Faction Type'])||'a pressure faction',factionRole:cleanAuto(sd.activeFactionRole)||'scene pressure faction',mystery:cleanAuto(sd.activeMystery)||roll(['Mysteries & Coverups','Clue Type'])||'an unresolved mystery',district:cleanAuto(sd.currentDistrict)||roll(['Districts','District Type'])||'a functional district'};
    const title=workflow==='Start a Campaign'?'Campaign Launch Package':workflow;
    const spine=[roll(['Core Oracles','Action']),roll(['Core Oracles','Theme']),roll(['Core Oracles','Descriptor']),roll(['Core Oracles','Focus'])].filter(Boolean).join(' / ');
    let summary='', steps=[], choices=[], effects=[], trackers=[], nextCue='';
    if(/Start a Campaign/.test(workflow)){
      summary=`Begin in ${context.location}, where ${roll(['Campaign','Sector Trouble'])||'a frontier pressure'} turns ${context.objective} into the opening crisis.`;
      steps=['Define the crew’s practical job and personal stake.','Introduce a useful NPC with a hidden agenda.','Reveal a local problem that points to a larger campaign mystery.','End the opening act with a choice between safety and leverage.'];
      trackers=[mkTracker('campaign-goal','Campaign Goal','Mysteries',1,10,'At 10, resolve or transform the campaign objective.'),mkTracker('sector-heat','Sector Heat','Threats',2,8,'At 6+, outside powers intervene directly.'),mkTimer('first-crisis','First Crisis Arrives',5,6,'At 0, force the inciting incident into the crew’s path.')];
      nextCue='Generate Act I setup or first scene.';
    } else if(/Plan an Act/.test(workflow)){
      summary=`This act should move ${context.objective} through ${context.beat}, with ${context.faction} applying pressure through ${context.district}.`;
      steps=['Opening beat: make the objective actionable.','Middle beat: complicate the obvious solution.','Reversal: reveal what the opposition actually wants.','Act turn: resolve one question and open a larger danger.'];
      trackers=[mkTracker(slug(context.act),'Act Progress','Mysteries',1,8,'At 8, the act reaches its turn or finale.'),mkTracker('act-opposition','Act Opposition Pressure','Threats',2,8,'At 6+, the opposition takes visible control.')];
      nextCue='Generate the act opening scene.';
    } else if(/Encounter/.test(workflow)){
      const tactic=roll(['Conflict','Opposition Tactic'])||roll(['Marines & Security','Security Operation']);
      summary=`An encounter in ${context.district} turns ${context.objective} into a live problem: ${tactic}.`;
      steps=['Establish who blocks progress and why.','Make terrain, bystanders, or equipment matter.','Offer a non-combat leverage point.','Attach a cost to delay or noise.'];
      trackers=[mkTracker('local-alert','Local Alert Level','Threats',sd.state.threat,8,'At 6+, reinforcements, lockdown, or official scrutiny arrives.')];
      nextCue='Resolve encounter, then run Scene Review.';
    } else if(/Investigation/.test(workflow)){
      const truth=roll(['Mysteries & Coverups','Coverup Move']); const clue=roll(['Mysteries & Coverups','Clue Type']);
      summary=`The investigation reveals ${clue||'a concrete clue'}, but ${truth||context.faction+' is hiding the full truth'}.`;
      steps=['Name the hidden truth.','Place three clues in different modes: physical, social, records/sensors.','Add one false lead that protects the truth without blocking progress.','Escalate when the crew acts openly.'];
      trackers=[mkTracker('investigation-progress','Investigation Progress','Mysteries',2,10,'At 10, the crew can identify the truth.'),mkTracker('coverup-pressure','Coverup Pressure','Threats',sd.state.heat,8,'At 6+, evidence disappears or witnesses are silenced.')];
      nextCue='Generate a clue scene or roleplay pressure scene.';
    } else if(/District/.test(workflow)){
      summary=`In ${context.district}, the scene should make place matter: ${roll(['Location Themes','Sensory Detail'])||'strong sensory detail'} and ${roll(['Settlements','Settlement Trouble'])||'local trouble'}.`;
      steps=['Open with a district-specific sensory detail.','Introduce a worker, official, patient, guard, vendor, or tech who wants something.','Add a useful detail that can become leverage.','Connect the district problem to the current mystery or faction.'];
      trackers=[mkTracker(slug(context.district)+'-stability',`${context.district} Stability`,'Factions',4,8,'At 2 or less, the district becomes unsafe or unusable.')];
      nextCue='Use a district oracle, then generate the next story beat.';
    } else if(/World Evolution/.test(workflow)){
      summary=`Behind the scenes, ${context.faction} advances while ${context.mystery} becomes harder to ignore.`;
      steps=['Advance one faction project.','Tick one threat or timer.','Change public reaction or access.','Create one rumor, warning, or consequence for the next scene.'];
      trackers=[mkTracker('faction-agenda','Faction Agenda','Factions',3,8,'At 8, the faction completes a project.'),mkTimer('next-world-event','Next World Event',4,6,'At 0, the world changes even if the crew does nothing.')];
      nextCue='Generate next scene from the changed world state.';
    } else if(/Travel|Exploration/.test(workflow)){
      summary=`Travel through ${context.location} becomes meaningful when ${roll(['Exploration','Route Hazard'])||'the route creates pressure'} points toward ${roll(['Exploration','Discovery'])||'a discovery'}.`;
      steps=['Define route and destination.','Add a hazard that costs time, supplies, safety, or secrecy.','Reveal a discovery that changes the objective.','End with a new location or decision.'];
      trackers=[mkTracker('route-progress','Route Progress','Mysteries',1,6,'At 6, the route reaches destination or decisive discovery.'),mkTracker('resource-strain','Resource Strain','Resources',Math.max(1,10-sd.state.resources),8,'At 6+, shortage creates hard choices.')];
      nextCue='Generate arrival scene.';
    } else if(/Downtime|Recovery/.test(workflow)){
      summary=`Recovery gives the crew a breath, but ${roll(['Crew & NPCs','Relationship Spark'])||'a relationship spark'} and ${roll(['Frontier Society','Social Tension'])||'social tension'} create obligations.`;
      steps=['Let someone recover, repair, or reconnect.','Introduce rumor or personal concern.','Offer a trade, favor, or debt.','Foreshadow the next threat without forcing action.'];
      trackers=[mkTracker('crew-trust','Crew Trust','Relationships',sd.state.hope,10,'At 8+, allies take risks; at 3 or less, conflict returns.')];
      nextCue='Generate social scene or world evolution.';
    } else {
      const director=roll(['Campaign Intelligence Engine','Director Move']);
      const clue=roll(['Mysteries & Coverups','Clue Type'])||roll(['Miscellaneous','Story Clue']);
      summary=`The next scene at ${context.location} should ${director||'move pressure onto the current objective'} while offering ${clue||'one concrete clue'}.`;
      steps=['Re-establish location and objective.','Bring in a faction, NPC, environmental pressure, or discovery.','Offer 2–4 choices with different costs.','Update one tracker or timer before ending.'];
      trackers=[mkTracker('scene-stakes','Scene Stakes','Threats',Math.max(1,sd.state.threat),8,'At 6+, the scene demands immediate action.'),mkTracker('mystery-thread','Mystery Thread','Mysteries',Math.max(1,sd.state.mystery),10,'At 10, resolve one mystery question.')];
      nextCue='Run Scene Review, then Continue Current Story.';
    }
    choices=buildChoices(context,workflow);
    effects=buildEffects(workflow);
    return {id:'pkg-'+Date.now(),title,workflow,context,summary,oracleSpine:spine,steps,choices,effects,trackers,nextCue,oracles:recommendedOracles().map(o=>o.label)};
  }
  function buildChoices(c,w){return [
    `Push the objective now in ${c.district}, accepting exposure or resource cost.`,
    `Question someone tied to ${c.faction}, gaining leverage but risking delay.`,
    `Investigate the clue trail around ${c.mystery}, raising mystery pressure.`,
    `Withdraw, regroup, or trade for help, preserving safety but advancing opposition.`
  ];}
  function buildEffects(w){
    const e=[]; if(/Encounter|Threat|World/.test(w)) e.push('Advance Heat or Threat +1.'); if(/Investigation|Mystery|Continue|Scene/.test(w)) e.push('Advance or create one Mystery tracker.'); if(/Downtime|Recovery/.test(w)) e.push('Increase Hope or Crew Morale +1 if the crew accepts a new obligation.'); if(/Travel|Resource/.test(w)) e.push('Reduce Resources or create a timer if delay matters.'); e.push('List recommended oracles for the next scene.'); return e;
  }
  function buildNarrativeDraft(p){
    const ctx=p.context||{};
    const choice=(p.choices||[])[0]||'press forward despite the risk';
    const step=(p.steps||[])[0]||'re-establish the objective';
    const tracker=(p.trackers||[])[0];
    const trackerLine=tracker?` The pressure is visible in the ${tracker.name} track, now sitting at ${tracker.value}/${tracker.max}.`:'';
    return `<p><strong>${esc(p.title||'Scene')}</strong></p><p>The scene opens at ${esc(ctx.location||sd.currentLocation||'the current location')}, where the crew's immediate objective is to ${esc(ctx.objective||sd.objective||'move the mission forward')}. The mood is shaped by <em>${esc(p.oracleSpine||'the current oracle spine')}</em>.</p><p>${esc(p.summary||'A new pressure enters the story.')}</p><p>Start by having the crew ${esc(step.charAt(0).toLowerCase()+step.slice(1))}. Bring ${esc(ctx.faction||'the active faction')} into the situation through a demand, obstacle, witness, or tempting offer. Tie the scene back to ${esc(ctx.mystery||'the active mystery')} with one concrete clue or suspicious detail.</p><p>The most obvious course is to ${esc(choice.charAt(0).toLowerCase()+choice.slice(1))}. If the crew delays, makes noise, or exposes leverage, advance the appropriate tracker or timer during Scene Review.${trackerLine}</p><p><strong>Next cue:</strong> ${esc(p.nextCue||'Run Scene Review and choose the next beat.')}</p>`;
  }
  function formatPackage(p){
    return `${p.title}\n\nCurrent Story\nAct: ${sd.act}\nLocation: ${sd.currentLocation||p.context.location}\nObjective: ${sd.objective||p.context.objective}\nFaction Role: ${p.context.factionRole}
Faction: ${p.context.faction}\nMystery: ${p.context.mystery}\nDistrict: ${p.context.district}\nState: Threat ${sd.state.threat}/10, Heat ${sd.state.heat}/8, Hope ${sd.state.hope}/10, Mystery ${sd.state.mystery}/10, Resources ${sd.state.resources}/10, Supply ${((sd.party&&sd.party.resources||[]).find(r=>r.id==='supply')||{}).value||0}/5\n\nOracle Spine\n${p.oracleSpine||'Use recommended oracles below.'}\n\nSummary\n${p.summary}\n\nHigh-Level Steps\n${p.steps.map((s,i)=>`${i+1}. ${s}`).join('\n')}\n\nPlayer Options\n${p.choices.map((s,i)=>`${i+1}. ${s}`).join('\n')}\n\nTrackers Involved / Suggested\n${p.trackers.map(t=>`- ${t.name}: ${t.value}/${t.max} — ${t.trigger}`).join('\n')}\n\nRecommended Oracles\n${p.oracles.map(o=>`- ${o}`).join('\n')}\n\nScene Review Prompts\n${p.effects.map(e=>`- ${e}`).join('\n')}\n\nNext Cue\n${p.nextCue}`;
  }
  function applySoftState(p){
    const w=p.workflow||'';
    if(/World|Encounter|Threat|Investigation/.test(w)) sd.state.heat=Math.min(8,sd.state.heat+1);
    if(/Encounter|Threat/.test(w)) sd.state.threat=Math.min(10,sd.state.threat+1);
    if(/Investigation|Mystery|Continue|Scene/.test(w)) sd.state.mystery=Math.min(10,sd.state.mystery+1);
    if(/Downtime|Recovery/.test(w)) sd.state.hope=Math.min(10,sd.state.hope+1);
    if(/Travel|Exploration/.test(w)) sd.state.resources=Math.max(0,sd.state.resources-1);
  }

  function startSceneSnapshot(){
    readDirectorForm();
    const suggested=(sd.suggestedTrackers||[]).length?sd.suggestedTrackers:rankTrackersForContext().slice(0,4);
    const base=dedupe([...suggested,...allTrackers().filter(t=>(sd.currentSceneTrackerIds||[]).includes(t.id)),...partyItems().filter(t=>(sd.currentSceneTrackerIds||[]).includes(t.id))]).slice(0,8);
    sd.sceneSnapshot={id:'scene-'+Date.now(),startedAt:new Date().toISOString(),location:sd.currentLocation,objective:sd.objective,trackers:base.map(t=>({...t,sceneValue:t.value,masterValue:t.value}))};
    sd.currentSceneTrackerIds=base.map(t=>t.id);
    save(); renderAll(); toast('Scene snapshot started');
  }
  function defaultReviewItems(){
    const p=sd.lastPackage||{}; const w=(p.workflow||sd.workflow||'')+' '+(sd.storyIntent||'');
    const items=[];
    function add(id,label,target,delta,likely,reason){items.push({id,label,target,delta,likely:likely?'yes':'no',reason});}
    add('advance-objective','Objective advanced','mission-progress',1,/Continue|Scene|Investigation|Adventure|Act/.test(w),'Current package moved the active objective forward.');
    add('increase-heat','Heat increased','corp-heat',1,/Encounter|Threat|World|Corporate|Investigation/.test(w) || sd.state.heat>=5,'Exposure, security, faction, or corporate pressure is likely.');
    add('increase-mystery','Mystery deepened','active-mystery',1,/Mystery|Investigation|Clue|Reveal|Continue|Scene/.test(w) || sd.state.mystery>=5,'The scene created or uncovered new questions.');
    add('decrease-resources','Resources strained','supply-pressure',1,/Travel|Resource|Survival|Encounter/.test(w),'Delay, travel, combat, or hazard pressure may have cost supplies.');
    add('crew-stress','Crew stress changed','crew-morale',-1,/Threat|Encounter|Horror|Setback/.test(w) || sd.state.threat>=6,'Danger or pressure likely affected crew morale.');
    add('tick-timer','Tick scene timer','timer-next-pressure',-1,true,'Most scenes should move at least one countdown or pressure clock.');
    add('create-next-thread','Create/continue open thread','thread-main',1,/Campaign|Act|Mystery|Investigation|Continue/.test(w),'The scene likely produced a dangling question or future hook.');
    return items;
  }
  function openSceneReviewModal(){
    if(!sd.sceneSnapshot) startSceneSnapshot();
    sd.pendingReview={id:'review-'+Date.now(),items:defaultReviewItems()};
    save(); renderReviewModal(true);
  }
  function renderReviewModal(forceOpen){
    let modal=$('sdReviewModal');
    if(!modal){modal=document.createElement('div'); modal.id='sdReviewModal'; modal.className='sd-modal hidden'; document.body.appendChild(modal);}
    const rev=sd.pendingReview;
    if(!rev){modal.classList.add('hidden'); modal.innerHTML=''; return;}
    modal.innerHTML=`<div class="sd-modal-backdrop" data-sd-review-close></div><div class="sd-modal-panel"><div class="sd-modal-head"><h3>Scene Review</h3><button type="button" class="secondary" data-sd-review-close>×</button></div><p class="small">Review likely scene effects in one place. Each slider defaults to the most likely answer; switch any to No before applying.</p><div class="sd-review-list">${rev.items.map(renderReviewItem).join('')}</div><div class="button-row"><button type="button" data-sd-review-apply>Apply Accepted Effects</button><button type="button" class="secondary" data-sd-review-close>Cancel</button></div></div>`;
    modal.classList.toggle('hidden',!forceOpen);
    qsa('.sd-review-toggle',modal).forEach(input=>input.addEventListener('input',ev=>{const item=rev.items.find(x=>x.id===ev.target.dataset.reviewId); if(item){item.likely=ev.target.value==='1'?'yes':'no'; save(); renderReviewModal(true);}}));
  }
  function renderReviewItem(item){
    const yes=item.likely==='yes';
    return `<div class="sd-review-item"><div><b>${esc(item.label)}</b><p class="small">${esc(item.reason||'')}</p><span class="small">Target: ${esc(item.target)} ${item.delta>0?'+':''}${item.delta}</span></div><label class="sd-yesno"><span>No</span><input class="sd-review-toggle" data-review-id="${escAttr(item.id)}" type="range" min="0" max="1" step="1" value="${yes?1:0}"><span>Yes</span><b>${yes?'Yes':'No'}</b></label></div>`;
  }
  function closeSceneReviewModal(){sd.pendingReview=null; save(); renderReviewModal(false);}
  function applySceneReviewModal(){
    const rev=sd.pendingReview; if(!rev)return;
    rev.items.filter(i=>i.likely==='yes').forEach(i=>applyEffectItem(i));
    sd.state.momentum=Math.min(10,sd.state.momentum+1);
    sd.sceneSnapshot=null; sd.pendingReview=null;
    save(); renderAll(); toast('Accepted scene effects applied to master trackers');
  }
  function applyEffectItem(item){
    const id=item.target; const delta=Number(item.delta)||0;
    let target=allTrackers().concat(partyItems()).find(t=>t.id===id);
    if(!target){
      if(id==='active-mystery'){target=mkTracker('active-mystery','Active Mystery Progress','Mysteries',sd.state.mystery,10,'At 10, answer the core mystery question.'); sd.trackers.push(target);}
      else if(id==='timer-next-pressure'){target=mkTimer('timer-next-pressure','Next Pressure Event',4,6,'At 0, introduce a hard move, arrival, system failure, or faction demand.'); sd.timers.push(target);}
    }
    if(target){target.value=Math.max(0,Math.min(Number(target.max)||10,(Number(target.value)||0)+delta));}
    if(id==='corp-heat') sd.state.heat=Math.max(0,Math.min(8,sd.state.heat+delta));
    if(id==='active-mystery'||id==='mystery-thread') sd.state.mystery=Math.max(0,Math.min(10,sd.state.mystery+Math.max(delta,0)));
    if(id==='supply-pressure') sd.state.resources=Math.max(0,Math.min(10,sd.state.resources-delta));
    if(id==='crew-morale') sd.state.hope=Math.max(0,Math.min(10,sd.state.hope+delta));
    if(/heat|alert|threat/.test(id)) sd.state.threat=Math.max(0,Math.min(10,sd.state.threat+Math.max(delta,0)));
  }
  function acceptSuggestedTrackers(){
    const existing=new Set(allTrackers().concat(sd.timers||[]).map(t=>t.id));
    const accepted=[];
    (sd.suggestedTrackers||[]).filter(t=>t.include!==false).forEach(t=>{const copy={...t}; delete copy.include; if(existing.has(copy.id))return; if(copy.type==='Timers')sd.timers.push(copy); else sd.trackers.push(copy); existing.add(copy.id); accepted.push(copy);});
    sd.currentSceneTrackerIds=accepted.map(t=>t.id).concat((sd.currentSceneTrackerIds||[]).filter(id=>existing.has(id)));
    save(); renderAll(); toast(accepted.length+' suggested tracker(s) accepted');
  }
  function applySceneEffects(){
    openSceneReviewModal();
  }
  function suggestFromLatestScene(){
    const app=loadApp(); const last=(app.sceneLog||[]).slice(-1)[0]; if(!last)return;
    const text=(last.text||'')+' '+(last.summary||'');
    const suggested=inferTrackers(text);
    if(suggested.length){sd.suggestedTrackers=suggested; sd.currentSceneTrackerIds=suggested.map(t=>t.id).concat(rankTrackersForContext().slice(0,2).map(t=>t.id)); sd.lastPackage=sd.lastPackage||{title:'Latest Scene Effects',summary:'Suggested trackers based on the latest generated scene.',effects:buildEffects(sd.workflow),trackers:suggested}; save(); renderAll();}
  }
  function inferTrackers(text){
    const t=String(text||'').toLowerCase(); const out=[];
    if(/corporate|company|audit|coverup|security/.test(t)) out.push(mkTracker('corp-heat','Corporate Heat','Threats',Math.max(1,sd.state.heat),8,'At 6+, corporate intervention becomes direct.'));
    if(/missing|clue|mystery|investigat|record|signal|truth/.test(t)) out.push(mkTracker('active-mystery','Active Mystery Progress','Mysteries',Math.max(1,sd.state.mystery),10,'At 10, answer the core mystery question.'));
    if(/alien|xeno|organism|anomaly|bio/.test(t)) out.push(mkTracker('xeno-awareness','Xeno Awareness','Threats',1,8,'At 6+, the unknown adapts or reveals itself.'));
    if(/reactor|storm|life support|timer|evacuation|countdown|deadline/.test(t)) out.push(mkTimer('active-countdown','Active Countdown',5,6,'At 0, trigger the failure, arrival, storm, or evacuation deadline.'));
    if(/crew|morale|trust|npc|relationship/.test(t)) out.push(mkTracker('crew-morale','Crew Morale','Relationships',sd.state.hope,10,'At 3 or less, crew conflict complicates progress.'));
    return dedupe(out).slice(0,5);
  }
  function rankTrackersForContext(){
    const text=[sd.workflow,sd.storyIntent,sd.activeFactionRole,cleanEntity(sd.activeFaction),sd.activeMystery,sd.objective,sd.currentLocation].join(' ').toLowerCase();
    return allTrackers().concat(partyItems()).map(t=>{let score=0; const n=(t.name+' '+t.type+' '+(t.trigger||'')).toLowerCase(); ['corporate','heat','mystery','mission','crew','resource','faction','threat','timer'].forEach(k=>{if(text.includes(k)&&n.includes(k))score+=2;}); if(t.value/t.max>.6)score+=1; return {t,score};}).sort((a,b)=>b.score-a.score).map(x=>x.t);
  }
  function mkTracker(id,name,type,value,max,trigger){return {id,name,type,value:Number(value)||0,max:Number(max)||10,trigger};}
  function mkTimer(id,name,value,max,trigger){return {id,name,type:'Timers',value:Number(value)||0,max:Number(max)||6,mode:'down',trigger};}
  function cleanAuto(v){return /^Auto/.test(v||'')?'':v;}
  function cleanEntity(v){
    const val=String(v||'');
    if(val.startsWith('entity:')){ const ent=factionEntityOptions().find(e=>'entity:'+e.id===val); return ent?ent.name:val; }
    return val.replace(/^Entity:\s*/,'');
  }
  function slug(s){return String(s||'item').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'item';}
  function dedupe(arr){const seen=new Set(); return arr.filter(x=>{if(seen.has(x.id))return false; seen.add(x.id); return true;});}
  function esc(s){return String(s??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));}
  function escAttr(s){return esc(s).replace(/"/g,'&quot;');}
  function toast(msg){if(typeof window.setStatus==='function')window.setStatus(msg); else {const st=$('saveStatus'); if(st)st.textContent=msg;}}
  window.SagaStoryDirectorDashboardState=function(){return JSON.parse(JSON.stringify(sd));};
  window.SagaStoryDirectorDashboardRender=function(){ renderAll(); };
  window.SagaStoryDirector = Object.assign(window.SagaStoryDirector||{}, {
    getSceneNumber:function(){ const app=loadApp(); return 'Scene #'+(((app.sceneLog||[]).length||0)+1); },
    resetSceneNumber:resetSceneNumber,
    decrementSceneNumber:decrementSceneNumber,
    setCurrentLocation:function(loc){
      if(!loc) return;
      sd.currentLocation=loc;
      const el=$('sdLocation'); if(el) el.value=loc;
      save();
      if($('storyDirectorDashboard')) renderAll();
    },
    refreshFactionOptions:function(){ updateFactionOptions(); renderAll(); },
    stayOpen:function(){
      try{ if(typeof showLeftTab==='function') showLeftTab('scene'); }catch(e){}
      const c=$('controlsPanel'); if(c) c.classList.add('active-left-view');
      ['entityListPanel','crewLinkPanel','livingShipPanel'].forEach(id=>{ const p=$(id); if(p) p.classList.remove('active-left-view'); });
      if(window.state){ window.state.activeLeftTab='scene'; try{ if(typeof saveState==='function') saveState(); }catch(e){} }
    }
  });
  function boot(){installUi();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot); else boot();
})();
