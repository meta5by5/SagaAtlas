const TABLES=window.SCENE_TABLES;function flattenKeys(obj,path=[]){let rows=[];for(const [key,value] of Object.entries(obj)){if(Array.isArray(value))rows.push({path:[...path,key],key,values:value});else rows=rows.concat(flattenKeys(value,[...path,key]));}return rows}const DEFAULT_STATE={campaignName:"",planet:"",biome:"",locationType:"",surroundings:"",intent:"Discovery",pacing:"Curious",phase:"Setup",threatLevel:2,mysteryLevel:2,currentThread:"",missionSeed:"",worldSeed:"",predictability:70,useContinuity:true,escalateOnComplication:true,useConflictArchitecture:true,sceneLog:[],lastSceneText:"",sceneSegments:[],journal:[],activeCenterTab:"journal",activeLeftTab:"entityList",oracleUsage:{},oracleFilter:"", entityFilter:"",entityTagCatalog:{},lynxShip:{name:"Lynx Rescue Ship",preset:"rescue",decks:5,zones:4,threat:"medium",lighting:"emergency",mission:"",threatScore:0,output:""},updatedAt:null};let state=loadState();state.activeCenterTab="journal";let boundFileHandle=null;let autosaveTimer=null;const $=id=>document.getElementById(id);function scrollActiveCardToTop(targetId){setTimeout(()=>{try{const layout=document.querySelector('.layout');[document.documentElement,document.body,layout,...document.querySelectorAll('.panel,.center-view,.left-view,.oracle-panel,.output')].filter(Boolean).forEach(el=>{try{el.scrollTop=0}catch(e){}});window.scrollTo({top:0,left:0,behavior:'auto'});}catch(e){window.scrollTo(0,0)}},0)}const pick=arr=>arr[Math.floor(Math.random()*arr.length)];const getTable=(...path)=>path.reduce((acc,key)=>acc&&acc[key],TABLES);function populateSelect(id,items){const el=$(id);el.innerHTML="";items.forEach(item=>{const opt=document.createElement("option");opt.value=item;opt.textContent=item;el.appendChild(opt)})}function init(){populateSelect("planet",getTable("Planets","Planetary Class"));populateSelect("biome",["Desert badlands","Frozen plain","Temperate forest","Jungle wetland","Mountain highlands","Subterranean caverns","Urban sprawl","Orbital / vacuum environment","Alien fungal fields","Coastal archipelago","Industrial wasteland","Flooded lowlands"]);populateSelect("locationType",["Settlement edge","Research outpost","Mining facility","Abandoned station","Ancient ruin","Trade depot","Wilderness trail","Crash site","Military checkpoint","Corporate compound","Derelict ship","Colonial district"]);populateSelect("surroundings",["Inside a building","Space station corridor","Cave opening","Underground cave system","Dense forest","Open plain","Vehicle bay","Landing pad","Market concourse","Maintenance tunnel","Ravine / canyon","Storm shelter","Medical ward","Reactor room","Docking arm"]);populateSelect("intent",["Discovery","Travel","Social encounter","Investigation","Resource pressure","Combat pressure","Moral choice","Faction complication","Exploration hazard","Trade opportunity"]);populateSelect("pacing",["Calm","Curious","Tense","Escalating","Dangerous","Aftermath"]);populateSelect("phase",["Setup","Approach","Discovery","Complication","Confrontation","Choice","Consequence","Transition"]);initLynxOptions();if(!state.planet)state.planet=getTable("Planets","Planetary Class")[0];if(!state.biome)state.biome="Desert badlands";if(!state.locationType)state.locationType="Settlement edge";if(!state.surroundings)state.surroundings="Inside a building";for(const id of ["campaignName","planet","biome","locationType","surroundings","intent","pacing","phase","threatLevel","mysteryLevel","currentThread","missionSeed","worldSeed","predictability","useContinuity","escalateOnComplication","useConflictArchitecture"]){$(id).addEventListener("input",readFormAndSave);$(id).addEventListener("change",readFormAndSave)}$("generateScene").addEventListener("click",generateNextScene);$("generateMission").addEventListener("click",generateMissionSeed);$("generateWorld").addEventListener("click",generateWorldSeed);$("advanceOnly").addEventListener("click",()=>{advancePhase(false);render();saveState()});$("copyScene").addEventListener("click",copyCurrentScene);$("undoScene").addEventListener("click",undoScene);$("clearLog").addEventListener("click",clearLog);$("exportJson").addEventListener("click",exportJson);if($("exportJournalRichText"))$("exportJournalRichText").addEventListener("click",exportJournalRichText);$("importJson").addEventListener("change",importJson);$("bindFile").addEventListener("click",bindFile);$("saveBoundFile").addEventListener("click",saveBoundFile);$("autosaveBoundFile").addEventListener("change",configureAutosave);$("newCampaign").addEventListener("click",newCampaign);const openSettings=$("openSettings"),closeSettingsBtn=$("closeSettings"),settingsBackdrop=$("settingsBackdrop");if(openSettings)openSettings.addEventListener("click",openSettingsModal);if(closeSettingsBtn)closeSettingsBtn.addEventListener("click",closeSettingsModal);if(settingsBackdrop)settingsBackdrop.addEventListener("click",closeSettingsModal);$("copyOracleOutput").addEventListener("click",copyOracleOutput);$("appendOracleToJournal").addEventListener("click",appendOracleToJournal);$("clearOracleOutput").addEventListener("click",clearOracleOutput);$("showOutputTab").addEventListener("click",()=>{showLeftTab("scene");showCenterTab("output")});$("showJournalTab").addEventListener("click",()=>{showLeftTab("scene");showCenterTab("journal")});const oh=document.querySelector("#oraclePanel .panel-title-row h2");if(oh)oh.addEventListener("click",()=>showLeftTab("scene"));document.querySelectorAll("[data-left-tab]").forEach(btn=>btn.addEventListener("click",()=>showLeftTab(btn.dataset.leftTab)));$("addCurrentToJournal").addEventListener("click",addCurrentOutputToJournal);$("addJournalComment").addEventListener("click",addJournalComment);$("clearJournalComment").addEventListener("click",clearJournalComment);if($("journalDiceRollButton"))$("journalDiceRollButton").addEventListener("click",rollStarforgedDiceToast);if($("commentDiceRollButton"))$("commentDiceRollButton").addEventListener("click",rollStarforgedDiceToast);$("collapseAllOracles").addEventListener("click",collapseAllOracles);bindLynxGenerator();initRichEditorToolbars();initImageUploads();$("oracleFilter").addEventListener("input",()=>{state.oracleFilter=$("oracleFilter").value;saveState();buildOracleTree()});$("fileSupport").textContent=supportsFileSystemAccess()?"File binding is supported in this browser. Save the JSON in your OneDrive synced folder on Windows for cloud sync.":"File binding is not supported in this browser. Use Export/Import JSON. This is common on Android.";if($("oracleFilter"))$("oracleFilter").value=state.oracleFilter||"";buildOracleTree();render()}const STATE_STORAGE_KEY="sagaAtlasSceneOracleV1";const LEGACY_STATE_STORAGE_KEYS=["hostileSceneOracleV1"];function loadState(){try{let saved=localStorage.getItem(STATE_STORAGE_KEY);if(!saved){for(const legacyKey of LEGACY_STATE_STORAGE_KEYS){saved=localStorage.getItem(legacyKey);if(saved){try{localStorage.setItem(STATE_STORAGE_KEY,saved)}catch(e){}break;}}}return saved?{...DEFAULT_STATE,...JSON.parse(saved)}:structuredClone(DEFAULT_STATE)}catch{return structuredClone(DEFAULT_STATE)}}function saveState(){state.updatedAt=new Date().toISOString();try{localStorage.setItem(STATE_STORAGE_KEY,JSON.stringify(state));setStatus("Saved locally "+new Date().toLocaleTimeString())}catch(err){console.warn("Local autosave quota exceeded; attempting compact save",err);try{const compact={...state,oracleOutput:"",sceneLog:(state.sceneLog||[]).slice(-25),journal:(state.journal||[]).slice(-100)};localStorage.setItem(STATE_STORAGE_KEY,JSON.stringify(compact));setStatus("Saved compact copy "+new Date().toLocaleTimeString())}catch(err2){console.warn("Compact autosave failed",err2);setStatus("Autosave storage full — export JSON, then clear old browser data")}}}function readFormAndSave(){state.campaignName=$("campaignName").value;state.planet=$("planet").value;state.biome=$("biome").value;state.locationType=$("locationType").value;state.surroundings=$("surroundings").value;state.intent=$("intent").value;state.pacing=$("pacing").value;state.phase=$("phase").value;state.threatLevel=Number($("threatLevel").value||0);state.mysteryLevel=Number($("mysteryLevel").value||0);state.currentThread=$("currentThread").value;if($("missionSeed"))state.missionSeed=$("missionSeed").value;if($("worldSeed"))state.worldSeed=$("worldSeed").value;state.predictability=Number($("predictability").value||70);state.useContinuity=$("useContinuity").checked;state.escalateOnComplication=$("escalateOnComplication").checked;state.useConflictArchitecture=$("useConflictArchitecture").checked;$("predictabilityLabel").textContent=state.predictability+"% predictable";saveState()}function render(){$("campaignName").value=state.campaignName||"";$("planet").value=state.planet;$("biome").value=state.biome;$("locationType").value=state.locationType;$("surroundings").value=state.surroundings;$("intent").value=state.intent;$("pacing").value=state.pacing;$("phase").value=state.phase;$("threatLevel").value=state.threatLevel;$("mysteryLevel").value=state.mysteryLevel;$("currentThread").value=state.currentThread||"";if($("missionSeed"))$("missionSeed").value=state.missionSeed||"";if($("worldSeed"))$("worldSeed").value=state.worldSeed||"";$("predictability").value=state.predictability;$("predictabilityLabel").textContent=state.predictability+"% predictable";$("useContinuity").checked=!!state.useContinuity;$("escalateOnComplication").checked=!!state.escalateOnComplication;$("useConflictArchitecture").checked=!!state.useConflictArchitecture;const card=$("sceneCard");renderSceneDraft(card);const log=$("sceneLog");log.innerHTML="";state.sceneLog.slice().reverse().forEach(scene=>{const li=document.createElement("li");li.textContent=`#${scene.number} — ${scene.phase} — ${scene.summary}\n\n${scene.text}`;log.appendChild(li)});renderJournal();renderLynxGenerator();showCenterTab(state.activeCenterTab||"output",false);showLeftTab(state.activeLeftTab||"scene",false)}function generateNextScene(){readFormAndSave();const action=pick(getTable("Core Oracles","Action"));const theme=pick(getTable("Core Oracles","Theme"));const descriptor=pick(getTable("Core Oracles","Descriptor"));const focus=pick(getTable("Core Oracles","Focus"));const sensory=pick(getTable("Location Themes","Sensory Detail"));const discovery=pick(getTable("Miscellaneous","Story Clue"));const complication=pick(getTable("Miscellaneous","Story Complication"));const threat=pick(getTable("Planets","Planetside Peril"));const opportunity=pick(getTable("Planets","Planetside Opportunity"));const consequence=pick(getTable("Miscellaneous","Pay the Price"));const plotTarget=pick(getTable("Plot Engine","Plot Target"));const plotMethod=pick(getTable("Plot Engine","Plot Method"));const plotReveal=pick(getTable("Plot Engine","Plot Reveals"));const sceneDriver=pick(getTable("Plot Engine","Scene Driver"));const fearTrigger=pick(getTable("Fear and Dread","Fear Trigger"));const dreadTechnique=pick(getTable("Fear and Dread","Dread Technique"));const uncannyDetail=pick(getTable("Fear and Dread","Uncanny Detail"));const revealTiming=pick(getTable("Fear and Dread","Revelation Timing"));const safeHorror=pick(getTable("Fear and Dread","Safety-Aware Horror Prompt"));const dangerSituation=pick([pick(getTable("Danger Situations","Industrial Hazards")),pick(getTable("Danger Situations","Environmental Dangers")),pick(getTable("Danger Situations","Space and Vacuum Dangers")),pick(getTable("Danger Situations","Social Dangers"))]);const horrorPayoff=pick(getTable("Miscellaneous","Horror Payoff"));const nextLocation=pick(["sealed service passage","upper observation deck","nearby settlement","underground chamber","emergency shelter","docking bay","forest ridge","old survey beacon","abandoned cargo module","restricted archive","commercial concourse","research annex","asteroid service tunnel","comet ice fissure"]);let conflictBlock="";if(state.useConflictArchitecture){conflictBlock=`\nConflict Architecture:\nStake Anchor: ${pick(getTable("Conflict Architecture","Stake Anchor"))}\nOpposition Logic: ${pick(getTable("Conflict Architecture","Opposition Logic"))}\nMeaningful Choice: ${pick(getTable("Conflict Architecture","Meaningful Choice"))}\nEscalation: ${pick(getTable("Conflict Architecture","Escalation"))}`;}const sceneNo=state.sceneLog.length+1;const text=`Scene ${sceneNo}: ${state.phase} — ${state.intent}\n\nPlanet / Biome: ${state.planet}; ${state.biome}\nLocation: ${state.locationType}; ${state.surroundings}\nPacing: ${state.pacing}\nThreat ${state.threatLevel}/10, Mystery ${state.mysteryLevel}/10\n\nOracle Spine:\nAction ${action} / Theme ${theme} / Descriptor ${descriptor} / Focus ${focus}\n\nOpening Image:\nThe scene opens in a ${descriptor} ${state.surroundings.toLowerCase()} connected to a ${state.locationType.toLowerCase()}. The first sensory impression is ${sensory}. ${describePressure()}\n\nContinuity:\n${continuityLine()}\n\nDiscovery:\nThe useful clue is ${discovery}. It points toward the current thread without fully resolving it.\n\nPlot Pressure:\nTarget: ${plotTarget}.\nMethod: ${plotMethod}.\nDriver: ${sceneDriver}.\nPossible reveal: ${plotReveal}.\n\nComplication:\n${complication}.\n\nDanger Situation:\n${dangerSituation}.\n\nFear / Dread Layer:\nFear trigger: ${fearTrigger}.\nDread technique: ${dreadTechnique}.\nUncanny detail: ${uncannyDetail}.\nReveal timing: ${revealTiming}.\nSafety-aware handling: ${safeHorror}.\n\nThreat / Opportunity:\nThreat: ${threat}.\nOpportunity: ${opportunity}.\nHorror payoff: ${horrorPayoff}.\n${conflictBlock}\n\nDecision Point:\nChoose between immediate safety, mission progress, and preserving leverage over the people or faction behind this scene.\n\nLikely Consequence:\nPay the price: ${consequence}. The most reasonable next location is the ${nextLocation}.\n\nCurrent Thread:\n${state.currentThread||"No active thread set. Create one from the discovery, stake anchor, or faction pressure."}`;addOutput(sceneNo,text,`${state.locationType} / ${state.surroundings}`,nextLocation);applyConsequence(consequence);advancePhase(true);saveState();render()}function generateMissionSeed(){readFormAndSave();const text=`Mission Seed\n\nMission: ${pick(getTable("Missions","Mission Type"))}\nPatron: ${pick(getTable("Missions","Patron"))}\nTarget Site: ${pick(getTable("Settlements","Settlement Type"))} / ${pick(getTable("Districts","District Type"))}\nComplication: ${pick(getTable("Missions","Twist"))}\nOpposition: ${pick(getTable("Factions","Faction Type"))} trying to ${pick(getTable("Factions","Project"))}\nReward: ${pick(getTable("Missions","Reward"))}\nHeat on Failure or Noise: ${pick(getTable("Missions","Heat Result"))}\n\nConflict Pressure:\nStake: ${pick(getTable("Conflict Architecture","Stake Anchor"))}\nHard Choice: ${pick(getTable("Conflict Architecture","Meaningful Choice"))}`;state.missionSeed=text;if($("missionSeed"))$("missionSeed").value=text;addOutput(state.sceneLog.length+1,text,"Mission Seed","mission");saveState();render()}function generateWorldSeed(){readFormAndSave();const text=`World / Colony Seed\n\nPlanetary Class: ${pick(getTable("Planets","Planetary Class"))}\nPlanet Trait: ${pick(getTable("Planets","Planet Traits"))}\nSettlement: ${pick(getTable("Settlements","Settlement Type"))}\nAuthority: ${pick(getTable("Settlements","Authority"))}\nSettlement Trouble: ${pick(getTable("Settlements","Settlement Trouble"))}\nLocal Project: ${pick(getTable("Settlements","Settlement Project"))}\nDominant Faction: ${pick(getTable("Factions","Faction Type"))}\nFaction Project: ${pick(getTable("Factions","Project"))}\nSpace Approach: ${pick(getTable("Space Encounters","Space Sighting"))}\nPlanetside Peril: ${pick(getTable("Planets","Planetside Peril"))}\nPlanetside Opportunity: ${pick(getTable("Planets","Planetside Opportunity"))}`;state.worldSeed=text;if($("worldSeed"))$("worldSeed").value=text;addOutput(state.sceneLog.length+1,text,"World Seed","world");saveState();render()}function addOutput(number,text,summary,memory,segments=null){state.lastSceneText=text;state.sceneSegments=segments||segmentsFromText(text);state.sceneLog.push({number,createdAt:new Date().toISOString(),phase:state.phase,intent:state.intent,summary,text,memory,segments:state.sceneSegments,parameters:{...state,sceneLog:undefined,lastSceneText:undefined,sceneSegments:undefined}})}
function renderSceneDraft(card){
  if(!card)return;
  const segments=Array.isArray(state.sceneSegments)?state.sceneSegments:[];
  card.classList.toggle("empty",!state.lastSceneText);
  if(!state.lastSceneText){card.textContent="Generate a scene to begin.";return;}
  if(!segments.length){card.textContent=state.lastSceneText;return;}
  card.innerHTML='<div class="scene-segment-list"></div>';
  const list=card.querySelector('.scene-segment-list');
  segments.forEach((seg,i)=>{
    const wrap=document.createElement('section');wrap.className='scene-segment-card';
    const header=document.createElement('div');header.className='scene-segment-header';
    const h=document.createElement('h3');h.textContent=seg.title||('Section '+(i+1));header.appendChild(h);
    const actions=document.createElement('div');actions.className='scene-segment-actions';
    [['copy','📋','Copy'],['journal','🖋','Add to Journal'],['reroll','🎲','Reroll']].forEach(([act,icon,label])=>{const b=document.createElement('button');b.type='button';b.className='secondary icon-button';b.dataset.sceneSegmentAction=act;b.dataset.sceneSegmentIndex=String(i);b.title=label;b.setAttribute('aria-label',label+' '+(seg.title||''));b.textContent=icon;actions.appendChild(b)});
    header.appendChild(actions);wrap.appendChild(header);
    const box=document.createElement('textarea');box.className='scene-segment-text';box.value=seg.text||'';box.dataset.sceneSegmentText=String(i);setSceneSegmentRows(box);box.addEventListener('input',()=>{state.sceneSegments[i].text=box.value;setSceneSegmentRows(box);syncSceneTextFromSegments();saveState()});wrap.appendChild(box);list.appendChild(wrap);
  });
}
function setSceneSegmentRows(box){const lines=String(box.value||'').split(/\n/).reduce((total,line)=>total+Math.max(1,Math.ceil(line.length/88)),0);box.rows=Math.min(10,Math.max(3,lines));}
function segmentsFromText(text){
  const lines=(text||'').split(/\n/);const segs=[];let current={title:'Scene Header',text:''};
  const headings=new Set(['Oracle Spine','Opening Image','Continuity','Discovery','Plot Pressure','Complication','Danger Situation','Fear / Dread Layer','Threat / Opportunity','Conflict Architecture','Decision Point','Likely Consequence','Current Thread','Mission Seed','World / Colony Seed','Conflict Pressure']);
  for(const line of lines){const clean=line.replace(/:$/,'').trim();if(headings.has(clean)){if(current.text.trim())segs.push({...current,text:current.text.trim()});current={title:clean,text:''};}else current.text+=(current.text?'\n':'')+line;}
  if(current.text.trim())segs.push({...current,text:current.text.trim()});return segs;
}
function syncSceneTextFromSegments(){state.lastSceneText=(state.sceneSegments||[]).map(seg=>(seg.title?seg.title+':\n':'')+(seg.text||'')).join('\n\n');}
document.addEventListener('click',evt=>{const btn=evt.target.closest('[data-scene-segment-action]');if(!btn)return;const idx=Number(btn.dataset.sceneSegmentIndex);const seg=state.sceneSegments&&state.sceneSegments[idx];if(!seg)return;const act=btn.dataset.sceneSegmentAction;if(act==='copy'){navigator.clipboard?.writeText(seg.text||'');setStatus('Copied scene section')}else if(act==='journal'){putTextInJournalComment((seg.title?seg.title+'\n\n':'')+(seg.text||''),'Scene section copied to comment editor for final edit')}else if(act==='reroll'){seg.text=rerollSegmentText(seg.title);syncSceneTextFromSegments();saveState();render();setStatus('Rerolled '+seg.title)}});
function rerollSegmentText(title){
  const t=(title||'').toLowerCase();
  if(t.includes('oracle'))return 'Action '+pick(getTable("Core Oracles","Action"))+' / Theme '+pick(getTable("Core Oracles","Theme"))+' / Descriptor '+pick(getTable("Core Oracles","Descriptor"))+' / Focus '+pick(getTable("Core Oracles","Focus"));
  if(t.includes('opening'))return 'The scene opens in a '+pick(getTable("Core Oracles","Descriptor"))+' '+String(state.surroundings||'place').toLowerCase()+' connected to a '+String(state.locationType||'site').toLowerCase()+'. The first sensory impression is '+pick(getTable("Location Themes","Sensory Detail"))+'. '+describePressure();
  if(t.includes('continuity'))return continuityLine();
  if(t.includes('discovery'))return 'The useful clue is '+pick(getTable("Miscellaneous","Story Clue"))+'. It points toward the current thread without fully resolving it.';
  if(t.includes('plot'))return 'Target: '+pick(getTable("Plot Engine","Plot Target"))+'.\nMethod: '+pick(getTable("Plot Engine","Plot Method"))+'.\nDriver: '+pick(getTable("Plot Engine","Scene Driver"))+'.\nPossible reveal: '+pick(getTable("Plot Engine","Plot Reveals"))+'.';
  if(t.includes('complication'))return pick(getTable("Miscellaneous","Story Complication"))+'.';
  if(t.includes('danger'))return pick([pick(getTable("Danger Situations","Industrial Hazards")),pick(getTable("Danger Situations","Environmental Dangers")),pick(getTable("Danger Situations","Space and Vacuum Dangers")),pick(getTable("Danger Situations","Social Dangers"))])+'.';
  if(t.includes('fear'))return 'Fear trigger: '+pick(getTable("Fear and Dread","Fear Trigger"))+'.\nDread technique: '+pick(getTable("Fear and Dread","Dread Technique"))+'.\nUncanny detail: '+pick(getTable("Fear and Dread","Uncanny Detail"))+'.\nReveal timing: '+pick(getTable("Fear and Dread","Revelation Timing"))+'.\nSafety-aware handling: '+pick(getTable("Fear and Dread","Safety-Aware Horror Prompt"))+'.';
  if(t.includes('threat'))return 'Threat: '+pick(getTable("Planets","Planetside Peril"))+'.\nOpportunity: '+pick(getTable("Planets","Planetside Opportunity"))+'.\nHorror payoff: '+pick(getTable("Miscellaneous","Horror Payoff"))+'.';
  if(t.includes('conflict'))return 'Stake Anchor: '+pick(getTable("Conflict Architecture","Stake Anchor"))+'\nOpposition Logic: '+pick(getTable("Conflict Architecture","Opposition Logic"))+'\nMeaningful Choice: '+pick(getTable("Conflict Architecture","Meaningful Choice"))+'\nEscalation: '+pick(getTable("Conflict Architecture","Escalation"));
  if(t.includes('decision'))return 'Choose between immediate safety, mission progress, and preserving leverage over the people or faction behind this scene.';
  if(t.includes('consequence'))return 'Pay the price: '+pick(getTable("Miscellaneous","Pay the Price"))+'. The most reasonable next location is the '+pick(["sealed service passage","upper observation deck","nearby settlement","underground chamber","emergency shelter","docking bay","forest ridge","old survey beacon","abandoned cargo module","restricted archive","commercial concourse","research annex","asteroid service tunnel","comet ice fissure"])+'.';
  if(t.includes('thread'))return state.currentThread||'No active thread set. Create one from the discovery, stake anchor, or faction pressure.';
  if(t.includes('mission'))return 'Mission: '+pick(getTable("Missions","Mission Type"))+'\nPatron: '+pick(getTable("Missions","Patron"))+'\nTarget Site: '+pick(getTable("Settlements","Settlement Type"))+' / '+pick(getTable("Districts","District Type"))+'\nComplication: '+pick(getTable("Missions","Twist"))+'\nReward: '+pick(getTable("Missions","Reward"));
  if(t.includes('world'))return 'Planetary Class: '+pick(getTable("Planets","Planetary Class"))+'\nPlanet Trait: '+pick(getTable("Planets","Planet Traits"))+'\nSettlement: '+pick(getTable("Settlements","Settlement Type"))+'\nAuthority: '+pick(getTable("Settlements","Authority"))+'\nDominant Faction: '+pick(getTable("Factions","Faction Type"));
  return pick(getTable("Core Oracles","Action"))+' / '+pick(getTable("Core Oracles","Theme"));
}
function describePressure(){if(state.threatLevel>=7)return"Everything feels exposed, watched, or already too late.";if(state.threatLevel>=4)return"There is enough pressure that lingering here has a cost.";if(state.mysteryLevel>=6)return"The scene feels wrong in a way that invites investigation.";return"For now, there is enough room to observe before danger closes in."}function continuityLine(){if(!state.sceneLog.length)return"This is the opening beat. Establish what feels normal before disrupting it.";const last=state.sceneLog[state.sceneLog.length-1];return`This follows from Scene ${last.number}. Carry forward one unresolved element from: ${last.summary}.`}function applyConsequence(consequence){if(consequence.includes("threat"))state.threatLevel=Math.min(10,state.threatLevel+1);if(consequence.includes("mystery"))state.mysteryLevel=Math.min(10,state.mysteryLevel+1);if(state.escalateOnComplication&&state.phase==="Complication")state.threatLevel=Math.min(10,state.threatLevel+1)}function advancePhase(afterScene){const order=["Setup","Approach","Discovery","Complication","Confrontation","Choice","Consequence","Transition"];const i=order.indexOf(state.phase);state.phase=order[(i+1)%order.length];if(afterScene&&state.phase==="Setup")state.pacing=state.threatLevel>=7?"Aftermath":"Calm";else if(afterScene&&state.threatLevel>=6)state.pacing="Dangerous";else if(afterScene&&["Complication","Confrontation","Choice"].includes(state.phase))state.pacing="Escalating"}function buildOracleTree(){const root=$("oracleTree");root.innerHTML="";const filter=(state.oracleFilter||"").trim().toLowerCase();const oracleLayout=[{label:"⭐ Core Solo",children:["Core Oracles","Core Solo Engine","Campaign Intelligence Engine"]},{label:"📖 Story Director",children:["Plot Engine","Adventure","Story","Mysteries & Coverups","Mission Aftermath"]},{label:"🌌 Exploration",children:["Exploration","Sector & System Creation","Worlds & Colonies","Planets","Settlements","Colonies and Expeditions","Vaults / Ruins"]},{label:"🚀 Space Operations",children:["Space Operations","Starships","Derelicts","Space Encounters","Trade & Cargo","Industrial Hazards"]},{label:"👥 Characters & Society",children:["Characters","Crew & NPCs","Frontier Society","Corporate Powers","Factions","Law, Marshals & Crime"]},{label:"☠ Threats & Horror",children:["Conflict","Marines & Security","Danger Situations","Horror Escalation","Fear and Dread","Xeno-Biology","Androids & AI","Creatures"]},{label:"📚 Legacy / General",children:["Campaign","Missions","Miscellaneous","Location Themes","Districts"]}];const matches=(key,value,path)=>{const p=path.concat(key).join(" ").toLowerCase();if(!filter)return true;if(p.includes(filter))return true;if(Array.isArray(value))return value.some(v=>String(v).toLowerCase().includes(filter));return Object.entries(value).some(([ck,cv])=>matches(ck,cv,path.concat(key)))};const buildNode=(key,value,path)=>{if(!matches(key,value,path))return null;if(Array.isArray(value)){const row=document.createElement("div");row.className="table-row";const label=document.createElement("span");label.textContent=`${key} (${value.length})`;const btn=document.createElement("button");btn.className="tiny secondary";btn.textContent="🎲";btn.title="Roll";btn.setAttribute("aria-label","Roll");btn.onclick=()=>{recordOracleUse(path[0]||key);rollTable(path.concat(key),value)};row.appendChild(label);row.appendChild(btn);return row}const details=document.createElement("details");details.className="oracle-node";if(filter)details.open=true;const summary=document.createElement("summary");const label=document.createElement("span");label.textContent=key;const rollAll=document.createElement("button");rollAll.className="tiny secondary";rollAll.textContent="🎲🎲";rollAll.title="Roll group";rollAll.setAttribute("aria-label","Roll group");rollAll.onclick=e=>{e.preventDefault();e.stopPropagation();recordOracleUse(path[0]||key);rollGroup(path.concat(key),value)};summary.appendChild(label);summary.appendChild(rollAll);details.appendChild(summary);for(const[childKey,childValue]of Object.entries(value)){const child=buildNode(childKey,childValue,path.concat(key));if(child)details.appendChild(child)}return details};const buildParent=(parent)=>{if(parent.children.length===1&&parent.children[0]===parent.label){const value=TABLES[parent.label];return value?buildNode(parent.label,value,[]):null}const details=document.createElement("details");details.className="oracle-node oracle-parent";if(filter)details.open=true;const summary=document.createElement("summary");const label=document.createElement("span");label.textContent=parent.label;summary.appendChild(label);details.appendChild(summary);parent.children.forEach(groupName=>{const value=TABLES[groupName];if(!value)return;const node=buildNode(groupName,value,[parent.label]);if(node)details.appendChild(node)});return details.children.length>1?details:null};oracleLayout.forEach(parent=>{const node=buildParent(parent);if(node)root.appendChild(node)});if(!root.children.length){const empty=document.createElement("p");empty.className="small";empty.textContent="No oracle tables match the filter.";root.appendChild(empty)}}function collapseAllOracles(){document.querySelectorAll("#oracleTree details.oracle-node").forEach(node=>node.open=false);setStatus("Collapsed all Oracle sections")}function recordOracleUse(group){if(!group)return;if(!state.oracleUsage)state.oracleUsage={};state.oracleUsage[group]=(state.oracleUsage[group]||0)+1;saveState()}function appendOracleOutput(text){const box=$("oracleOutput");if(!box.dataset.hasRolls){box.textContent="";box.dataset.hasRolls="true"}box.textContent+=(box.textContent?"\n\n---\n":"")+text;box.scrollTop=box.scrollHeight}function rollTable(path,values){appendOracleOutput(`${path.join(" > ")}\n${pick(values)}`)}function rollGroup(path,group){const leaves=flattenKeys(group,path);let prefix=commonPathPrefix(leaves.map(t=>t.path));if(prefix.length===0)prefix=path;const lines=leaves.map(t=>`${t.path.slice(prefix.length).join(" > ")}: ${pick(t.values)}`);appendOracleOutput(`${prefix.join(" > ")}\n${lines.join("\n")}`)}function commonPathPrefix(paths){if(!paths.length)return[];const prefix=[];for(let i=0;i<paths[0].length;i++){const value=paths[0][i];if(paths.every(p=>p[i]===value))prefix.push(value);else break}return prefix}async function copyOracleOutput(){const box=$("oracleOutput");await navigator.clipboard.writeText((box.innerText||box.textContent||""));setStatus("Copied table output")}function appendOracleToJournal(){const box=$("oracleOutput");const text=box&&box.dataset.hasRolls?(box.innerText||box.textContent||"").trim():"";if(!text){setStatus("No table output to add");return}putTextInJournalComment(text,"Oracle output copied to comment editor for final edit")}function clearOracleOutput(){const box=$("oracleOutput");box.textContent="Roll from the table tree.";delete box.dataset.hasRolls;setStatus("Cleared table output")}function undoScene(){state.sceneLog.pop();state.lastSceneText=state.sceneLog.length?state.sceneLog[state.sceneLog.length-1].text:"";saveState();render()}function clearLog(){if(!confirm("Clear the scene log?"))return;state.sceneLog=[];state.lastSceneText="";saveState();render()}async function copyCurrentScene(){if(!state.lastSceneText)return;await navigator.clipboard.writeText(state.lastSceneText);setStatus("Copied output")}function exportJson(){readFormAndSave();const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);const stamp=new Date().toISOString().slice(0,19).replaceAll(":","-");a.download=`saga-atlas-${stamp}.json`;a.click();URL.revokeObjectURL(a.href);setStatus("Exported JSON")}function escapeRtfText(text){return String(text||"").replace(/[\\{}]/g,"\\$&").replace(/\r?\n/g,"\\par ").replace(/[\u0080-\uFFFF]/g,ch=>"\\u"+ch.charCodeAt(0)+"?")}function htmlToRtf(html){const doc=new DOMParser().parseFromString("<div>"+(html||"")+"</div>","text/html");function walk(node){if(node.nodeType===3)return escapeRtfText(node.nodeValue);if(node.nodeType!==1)return"";const tag=node.tagName.toLowerCase();if(tag==="br")return"\\par ";if(tag==="img"){const src=node.getAttribute("src")||"";const m=src.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/i);if(!m)return" [image] ";const kind=m[1].toLowerCase()==="png"?"pngblip":"jpegblip";const bin=atob(m[2]);let hex="";for(let i=0;i<bin.length;i++)hex+=("0"+bin.charCodeAt(i).toString(16)).slice(-2);return"{\\pict\\"+kind+" "+hex+"}\\par ";}let inner="";node.childNodes.forEach(c=>inner+=walk(c));if(tag==="b"||tag==="strong")return"{\\b "+inner+"}";if(tag==="i"||tag==="em")return"{\\i "+inner+"}";if(tag==="h1"||tag==="h2"||tag==="h3")return"\\par {\\b\\fs32 "+inner+"}\\par ";if(tag==="li")return"\\par \\bullet "+inner;if(tag==="blockquote")return"\\par \\li360 {\\i "+inner+"}\\li0 \\par ";if(["p","div","section","article","ul","ol"].includes(tag))return inner+"\\par ";return inner}let out="";doc.body.firstChild.childNodes.forEach(c=>out+=walk(c));return out}function exportJournalRichText(){if(!Array.isArray(state.journal)||!state.journal.length){setStatus("No journal entries to export");return}const stamp=new Date().toISOString().slice(0,19).replaceAll(":","-");let body="{\\b\\fs36 Saga Atlas Journal}\\par\\par ";state.journal.forEach(entry=>{body+="{\\b "+escapeRtfText(new Date(entry.createdAt).toLocaleString()+" — "+(entry.source||"Journal"))+"}\\par ";body+=entry.isHtml?htmlToRtf(entry.text):escapeRtfText(entry.text||"");body+="\\par\\par "});const rtf="{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Arial;}}\\f0\\fs22 "+body+"}";const blob=new Blob([rtf],{type:"application/rtf"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`saga-atlas-journal-${stamp}.rtf`;a.click();URL.revokeObjectURL(a.href);setStatus("Exported Journal RTF")}function importJson(evt){const file=evt.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const imported=JSON.parse(reader.result);state={...DEFAULT_STATE,...imported};saveState();render();setStatus("Imported campaign JSON")}catch(e){alert("Could not import JSON: "+e.message)}};reader.readAsText(file)}function supportsFileSystemAccess(){return"showSaveFilePicker"in window}async function bindFile(){if(!supportsFileSystemAccess()){alert("This browser does not support file binding. Use Export/Import JSON instead.");return}try{boundFileHandle=await window.showSaveFilePicker({suggestedName:"saga-atlas-campaign.json",types:[{description:"JSON",accept:{"application/json":[".json"]}}]});await saveBoundFile();setStatus("Bound save file")}catch(e){if(e.name!=="AbortError")alert("File binding failed: "+e.message)}}async function saveBoundFile(){if(!boundFileHandle){alert("No bound file yet. Use Bind Save File first.");return}readFormAndSave();const writable=await boundFileHandle.createWritable();await writable.write(JSON.stringify(state,null,2));await writable.close();setStatus("Saved bound file "+new Date().toLocaleTimeString())}function configureAutosave(){if(autosaveTimer)clearInterval(autosaveTimer);autosaveTimer=null;if($("autosaveBoundFile").checked){autosaveTimer=setInterval(()=>{if(boundFileHandle)saveBoundFile().catch(err=>setStatus("Autosave failed"))},10*60*1000);setStatus("10-minute autosave enabled")}else setStatus("10-minute autosave disabled")}

function showCenterTab(tab,save=true){state.activeCenterTab=tab==="journal"?"journal":"output";const out=$("currentOutputView");const journal=$("journalView");const outBtn=$("showOutputTab");const journalBtn=$("showJournalTab");const title=$("centerSectionTitle");if(out)out.classList.toggle("active-view",state.activeCenterTab==="output");if(journal)journal.classList.toggle("active-view",state.activeCenterTab==="journal");if(outBtn)outBtn.classList.toggle("active",state.activeCenterTab==="output");if(journalBtn)journalBtn.classList.toggle("active",state.activeCenterTab==="journal");if(title)title.textContent=state.activeCenterTab==="journal"?"Journal":"Scene Header";const sceneTopActions=$("sceneTopActions");if(sceneTopActions)sceneTopActions.hidden=state.activeCenterTab!=="output";document.body.classList.toggle("center-focused",state.activeCenterTab==="output"||state.activeCenterTab==="journal");scrollActiveCardToTop(state.activeCenterTab==="journal"?"journalView":"currentOutputView");if(save)saveState()}function showLeftTab(tab,save=true){state.activeLeftTab=(tab==="crew"||tab==="living")?tab:"scene";const scene=$("controlsPanel");const crew=$("crewLinkPanel");const living=$("livingShipPanel");if(scene)scene.classList.toggle("active-left-view",state.activeLeftTab==="scene");if(crew)crew.classList.toggle("active-left-view",state.activeLeftTab==="crew");if(living)living.classList.toggle("active-left-view",state.activeLeftTab==="living");document.querySelectorAll("[data-left-tab]").forEach(btn=>btn.classList.toggle("active",btn.dataset.leftTab===state.activeLeftTab));document.body.classList.toggle("left-crew-expanded",state.activeLeftTab==="crew"||state.activeLeftTab==="living");if(document.body.classList.contains("side-panel-open")&&window.matchMedia("(max-width: 900px)").matches){if(scene)scene.classList.toggle("is-open",state.activeLeftTab==="scene");if(crew)crew.classList.toggle("is-open",state.activeLeftTab==="crew");if(living)living.classList.toggle("is-open",state.activeLeftTab==="living");}scrollActiveCardToTop(state.activeLeftTab==="crew"?"crewLinkPanel":state.activeLeftTab==="living"?"livingShipPanel":"controlsPanel");if(save)saveState()}
function sanitizeHtml(html){const template=document.createElement("template");template.innerHTML=html||"";template.content.querySelectorAll("script,style,iframe,object,embed").forEach(n=>n.remove());template.content.querySelectorAll("*").forEach(el=>{[...el.attributes].forEach(attr=>{const name=attr.name.toLowerCase();const value=attr.value||"";if(name.startsWith("on")||value.toLowerCase().startsWith("javascript:"))el.removeAttribute(attr.name)})});return template.innerHTML.trim()}
function editorHtml(id){const el=$(id);return el?sanitizeHtml(el.innerHTML):""}
function putTextInJournalComment(text,statusMsg){const editor=$("journalCommentEditor");const clean=(text||"").trim();if(!clean){setStatus("Nothing to add to comment editor");return}if(editor){const html=escapeHtml(clean).replace(/\n/g,"<br>");if(editor.innerHTML.trim()&&editor.innerHTML.trim()!=="<br>")editor.insertAdjacentHTML("beforeend","<br><br>"+html);else editor.innerHTML=html;showCenterTab("journal");editor.focus();setStatus(statusMsg||"Copied to comment editor for final edit")}}function addJournalEntry(text,source="Comment",isHtml=false){const clean=isHtml?sanitizeHtml(text):(text||"").trim();if(!clean||clean==="<br>"){setStatus("Nothing to add to journal");return}if(!Array.isArray(state.journal))state.journal=[];state.journal.push({id:"j"+Date.now()+Math.random().toString(16).slice(2),createdAt:new Date().toISOString(),source,text:clean,isHtml:!!isHtml,isEditing:false});saveState();renderJournal();showCenterTab("journal");setStatus("Added to journal")}
function addCurrentOutputToJournal(){putTextInJournalComment(state.lastSceneText||"","Scene draft copied to comment editor for final edit")}
function addJournalComment(){const editor=$("journalCommentEditor");addJournalEntry(editor?editor.innerHTML:"","Comment",true);if(editor)editor.innerHTML=""}
function clearJournalComment(){const editor=$("journalCommentEditor");if(editor)editor.innerHTML="";setStatus("Cleared comment editor")}
function makeFormatToolbar(targetId){const toolbar=document.createElement("div");toolbar.className="format-toolbar";toolbar.dataset.editorToolbar=targetId;[["bold","𝗕","Bold"],["italic","𝘐","Italic"],["insertUnorderedList","•","Bullet list"],["insertOrderedList","☷","Numbered list"],["formatBlock","❝","Quote","blockquote"],["formatBlock","▣","Header","h2"],["indent","⇥","Indent"],["outdent","⇤","Outdent"]].forEach(item=>{const btn=document.createElement("button");btn.type="button";btn.className="icon-button secondary";btn.dataset.format=item[0];if(item[3])btn.dataset.formatValue=item[3];btn.title=item[2];btn.setAttribute("aria-label",item[2]);btn.textContent=item[1];toolbar.appendChild(btn)});const img=document.createElement("label");img.className="icon-button secondary image-upload-button compact-editor-button";img.title="Insert image";img.setAttribute("aria-label","Insert image");img.textContent="🖼";const input=document.createElement("input");input.type="file";input.accept="image/*";input.dataset.imageTarget=targetId;img.appendChild(input);toolbar.appendChild(img);return toolbar}
function initRichEditorToolbars(){document.addEventListener("click",evt=>{const btn=evt.target.closest("[data-format]");if(!btn)return;const toolbar=btn.closest("[data-editor-toolbar]");if(!toolbar)return;evt.preventDefault();const editor=$(toolbar.dataset.editorToolbar);if(editor)editor.focus();const cmd=btn.dataset.format;const value=btn.dataset.formatValue||null;document.execCommand(cmd,false,value);if(editor)editor.focus()})}function initImageUploads(){document.addEventListener("change",evt=>{const input=evt.target.closest("input[type='file'][data-image-target]");if(!input||!input.files||!input.files[0])return;const editor=$(input.dataset.imageTarget);if(!editor)return;const file=input.files[0];const reader=new FileReader();reader.onload=()=>{editor.focus();document.execCommand("insertHTML",false,makeResizableImageHtml(reader.result,file.name));input.value=""};reader.readAsDataURL(file)});initImageResizeHandles()}
function makeResizableImageHtml(src,name){return `<span class="resizable-image" contenteditable="false"><img src="${src}" alt="${escapeHtml(name)}"><span class="resize-handle" title="Drag to resize"></span></span>&nbsp;`}
function initImageResizeHandles(){let active=null;document.addEventListener("pointerdown",evt=>{const handle=evt.target.closest(".resize-handle");if(!handle)return;const wrap=handle.closest(".resizable-image");const img=wrap&&wrap.querySelector("img");if(!img)return;evt.preventDefault();active={img,startX:evt.clientX,startY:evt.clientY,startW:img.offsetWidth,startH:img.offsetHeight,ratio:(img.naturalWidth&&img.naturalHeight)?img.naturalHeight/img.naturalWidth:(img.offsetHeight/img.offsetWidth||.65)};handle.setPointerCapture&&handle.setPointerCapture(evt.pointerId)});document.addEventListener("pointermove",evt=>{if(!active)return;evt.preventDefault();const dx=evt.clientX-active.startX;const dy=evt.clientY-active.startY;const width=Math.max(80,active.startW+dx);const height=Math.max(50,active.startH+dy);active.img.style.width=width+"px";active.img.style.height=(evt.shiftKey?height:Math.round(width*active.ratio))+"px"});document.addEventListener("pointerup",()=>{active=null})}

function lynxDefaults(){if(!state.lynxShip)state.lynxShip={};state.lynxShip={name:"Lynx Rescue Ship",preset:"rescue",decks:5,zones:4,threat:"medium",lighting:"emergency",mission:"",threatScore:0,output:"",...state.lynxShip};return state.lynxShip}
function initLynxOptions(){if(!$('lynxPreset'))return;populateSelect('lynxPreset',['rescue','derelict','military','research','frontier','horror']);populateSelect('lynxThreat',['low','medium','high','extreme']);populateSelect('lynxLighting',['normal','emergency','blackout'])}
function bindLynxGenerator(){['lynxShipName','lynxPreset','lynxDecks','lynxZones','lynxThreat','lynxLighting','lynxMission'].forEach(id=>{const el=$(id);if(el){el.addEventListener('input',readLynxAndSave);el.addEventListener('change',readLynxAndSave)}});const gen=$('lynxGenerate'),event=$('lynxEvent'),clear=$('lynxClearOutput'),toJournal=$('lynxToJournal');if(gen)gen.addEventListener('click',generateLynxShip);if(event)event.addEventListener('click',generateLynxEvent);if(clear)clear.addEventListener('click',()=>{lynxDefaults().output='';saveState();renderLynxGenerator();setStatus('Cleared ship generator output')});if(toJournal)toJournal.addEventListener('click',()=>{const lx=lynxDefaults();putTextInJournalComment(lx.output||'', 'Ship output copied to comment editor for final edit')})}
function readLynxAndSave(){const lx=lynxDefaults();if(!$('lynxShipName'))return;lx.name=$('lynxShipName').value||'Lynx Rescue Ship';lx.preset=$('lynxPreset').value||'rescue';lx.decks=Math.max(1,Math.min(12,Number($('lynxDecks').value||5)));lx.zones=Math.max(2,Math.min(8,Number($('lynxZones').value||4)));lx.threat=$('lynxThreat').value||'medium';lx.lighting=$('lynxLighting').value||'emergency';lx.mission=$('lynxMission').value||'';saveState()}
function renderLynxGenerator(){const lx=lynxDefaults();if(!$('lynxShipName'))return;$('lynxShipName').value=lx.name||'Lynx Rescue Ship';$('lynxPreset').value=lx.preset||'rescue';$('lynxDecks').value=lx.decks||5;$('lynxZones').value=lx.zones||4;$('lynxThreat').value=lx.threat||'medium';$('lynxLighting').value=lx.lighting||'emergency';$('lynxMission').value=lx.mission||'';const out=$('lynxOutput');if(out){out.textContent=lx.output||'Configure the ship generator, then generate a modular ship interior.';out.classList.toggle('empty',!lx.output)}}
function lynxPick(list){return list[Math.floor(Math.random()*list.length)]}
function lynxRoll(n){return Math.floor(Math.random()*n)+1}
const LYNX_DECKS=['Bridge / Command','Passenger Habitat','Medical and Triage','Cargo Handling','Engineering Core','Cryo / Cold Sleep','Sensor and Comms','Security Deck','Launch and Docking','Life Support Spine','Data Archive','Drone Operations'];
const LYNX_ZONES=['Cabins','Med Bay','Cargo Hold','Security Node','Life Support','Escape Corridor','Drone Bay','Auxiliary Control','Airlock Cluster','Maintenance Crawlway','Power Junction','Galley / Commons','Isolation Ward','Sensor Alcove','Workshop','Specimen Locker','Briefing Room','Emergency Shelter'];
const LYNX_HAZARDS=['Fire spreads through a service duct','Door lockdown splits the crew','Oxygen loss in a pressure zone','Hostile breach detected','System failure cascades across the deck','Radiation alarm from a damaged conduit','Gravity flickers or reverses locally','A sealed hatch hides movement','Coolant fog obscures the corridor','Automated defense routine wakes up'];
const LYNX_EVENTS=['Fire spreads','Door lockdown','Oxygen loss','Hostile breach','System failure','Distress ping from a hidden compartment','Cargo restraint failure','Emergency bulkhead slams shut','Unknown life sign appears','Main lights fail for one deck'];
function lynxThreatHazards(level){return {low:1,medium:2,high:3,extreme:4}[level]||2}
function lynxLightingText(mode){return {normal:'Normal operating lights with clear routes and readable panels.',emergency:'Emergency red lighting, pulsing alarms, and long shadowed corridors.',blackout:'Blackout conditions: handheld lights, sparks, silhouettes, and intermittent terminal glow.'}[mode]||'Emergency lighting.'}
function lynxPresetText(preset){return {rescue:'Rescue ship under pressure: triage, survivors, blocked passages, and evacuation choices.',derelict:'Derelict boarding scenario: lost crew, failing systems, and uncertain salvage rights.',military:'Military response craft: hardpoints, security nodes, and tactical choke points.',research:'Research vessel: labs, quarantine, sensor anomalies, and dangerous samples.',frontier:'Frontier utility ship: patched systems, mixed cargo, and improvised repairs.',horror:'Hostile survival scenario: isolation, dread, and a ship that reveals problems slowly.'}[preset]||'Procedural Lynx-class ship interior.'}
function generateLynxShip(){readLynxAndSave();const lx=lynxDefaults();const deckCount=lx.decks||5;const zoneCount=lx.zones||4;const hazardsPerDeck=lynxThreatHazards(lx.threat);let lines=[];lines.push('🚀 Lynx-Class Ship Generated');lines.push('Ship: '+(lx.name||'Lynx Rescue Ship'));lines.push('Preset: '+lynxPresetText(lx.preset));lines.push('Lighting: '+lynxLightingText(lx.lighting));lines.push('Threat Intensity: '+String(lx.threat||'medium').toUpperCase());if(lx.mission)lines.push('Mission: '+lx.mission);lines.push('');lines.push('Foundry-style module behavior: scene flagged as a Lynx instance, threat clock initialized, decks rendered as modular notes/tiles, and each zone can become a scene node.');lines.push('');for(let d=0;d<deckCount;d++){const deckName=lynxPick(LYNX_DECKS);lines.push('DECK '+(d+1)+': '+deckName);let zones=[];for(let z=0;z<zoneCount;z++){const zone=lynxPick(LYNX_ZONES);zones.push(zone)}lines.push('  Zones: '+zones.join(' | '));let hazards=[];for(let h=0;h<hazardsPerDeck;h++)hazards.push(lynxPick(LYNX_HAZARDS));lines.push('  Hazards: '+hazards.join(' ; '));lines.push('  Scene Preset: '+lynxDeckPreset(deckName,zones));lines.push('')}lx.threatScore=0;lx.output=lines.join('\n');saveState();renderLynxGenerator();setStatus('Ship generated')}
function lynxDeckPreset(deckName,zones){if(deckName.includes('Bridge'))return 'Command decisions, comms failures, and route control.';if(deckName.includes('Medical'))return 'Triage pressure, contamination checks, and survivor conflicts.';if(deckName.includes('Engineering'))return 'Repair clock, reactor access, and cascading system danger.';if(deckName.includes('Cargo'))return 'Blocked movement, salvage, hidden cargo, and ambush cover.';if(deckName.includes('Cryo'))return 'Awakening pods, identity questions, and failing life support.';if(deckName.includes('Security'))return 'Lockdowns, restricted doors, and automated countermeasures.';return 'Exploration node with one clear route, one risky shortcut, and one hidden complication.'}
function generateLynxEvent(){readLynxAndSave();const lx=lynxDefaults();lx.threatScore=Number(lx.threatScore||0)+1;const event=lynxPick(LYNX_EVENTS);const zone=lynxPick(LYNX_ZONES);const action=pick(getTable('Core Oracles','Action')||['React']);const theme=pick(getTable('Core Oracles','Theme')||['Survival']);const output='⚡ Lynx Gameplay Event\n\nThreat Clock: '+lx.threatScore+'\nEvent: '+event+'\nAffected Zone: '+zone+'\nOracle Cue: '+action+' / '+theme+'\nGM Move: escalate the ship map, reveal a new route, cut off a safe path, or force a crew resource decision.';lx.output=(lx.output?lx.output+'\n\n---\n':'')+output;saveState();renderLynxGenerator();setStatus('Lynx gameplay event generated')}
function iconImg(src,alt){return `<img class="button-inline-icon" src="${src}" alt="${escapeHtml(alt||"")}">`}
function renderJournal(){const list=$("journalList");if(!list)return;if(!Array.isArray(state.journal))state.journal=[];list.innerHTML="";if(state.journal.length===0){const empty=document.createElement("p");empty.className="small";empty.textContent="No journal entries yet.";list.appendChild(empty);return}state.journal.forEach(entry=>{const card=document.createElement("div");card.className="journal-entry";const top=document.createElement("div");top.className="journal-entry-top";const meta=document.createElement("div");meta.className="journal-meta";meta.textContent=`${new Date(entry.createdAt).toLocaleString()} — ${entry.source||"Journal"}`;const actions=document.createElement("div");actions.className="journal-actions top-actions";top.appendChild(meta);top.appendChild(actions);card.appendChild(top);if(entry.isEditing){const editorId="edit_"+entry.id;card.appendChild(makeFormatToolbar(editorId));const edit=document.createElement("div");edit.id=editorId;edit.className="rich-editor journal-edit";edit.contentEditable="true";edit.innerHTML=entry.isHtml?sanitizeHtml(entry.text):escapeHtml(entry.text||"").replace(/\n/g,"<br>");card.appendChild(edit);const saveBtn=document.createElement("button");saveBtn.className="secondary icon-button";saveBtn.title="Save";saveBtn.setAttribute("aria-label","Save");saveBtn.textContent="💾";saveBtn.addEventListener("click",()=>{entry.text=sanitizeHtml(edit.innerHTML);entry.isHtml=true;entry.isEditing=false;saveState();renderJournal()});const cancelBtn=document.createElement("button");cancelBtn.className="secondary icon-button";cancelBtn.title="Cancel";cancelBtn.setAttribute("aria-label","Cancel");cancelBtn.textContent="↩";cancelBtn.addEventListener("click",()=>{entry.isEditing=false;renderJournal()});actions.appendChild(saveBtn);actions.appendChild(cancelBtn)}else{const text=document.createElement("div");text.className="journal-text";if(entry.isHtml)text.innerHTML=sanitizeHtml(entry.text);else text.textContent=entry.text||"";card.appendChild(text);const editBtn=document.createElement("button");editBtn.className="secondary icon-button";editBtn.title="Edit";editBtn.setAttribute("aria-label","Edit");editBtn.innerHTML=iconImg("./edit-icon.png","Edit");editBtn.addEventListener("click",()=>{entry.isEditing=true;renderJournal()});const delBtn=document.createElement("button");delBtn.className="secondary icon-button";delBtn.title="Delete";delBtn.setAttribute("aria-label","Delete");delBtn.innerHTML=iconImg("./delete-icon.png","Delete");delBtn.addEventListener("click",()=>{if(confirm("Delete this journal entry?")){state.journal=state.journal.filter(j=>j.id!==entry.id);saveState();renderJournal()}});actions.appendChild(editBtn);actions.appendChild(delBtn)}list.appendChild(card)});list.scrollTop=list.scrollHeight}
function escapeHtml(text){return(text||"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[ch]))}
function newCampaign(){if(!confirm("Start a new campaign and clear local state? Export first if you want a backup."))return;state=structuredClone(DEFAULT_STATE);saveState();render()}function setStatus(msg){$("saveStatus").textContent=msg}

function openSettingsModal(){const modal=$("settingsModal"),backdrop=$("settingsBackdrop");if(modal)modal.hidden=false;if(backdrop)backdrop.hidden=false;document.body.classList.add("settings-open");}
function closeSettingsModal(){const modal=$("settingsModal"),backdrop=$("settingsBackdrop");if(modal)modal.hidden=true;if(backdrop)backdrop.hidden=true;document.body.classList.remove("settings-open");}
function initMobilePanels(){
  const backdrop = $("panelBackdrop");
  const controls = $("controlsPanel");
  const oracles = $("oraclePanel");
  const storage = $("storagePanel");
  const crewLink = $("crewLinkPanel");
  const livingShip = $("livingShipPanel");
  const entityTracker = $("entityTrackerPanel");
  const output = $("outputPanel");
  const panels = [controls, oracles, storage, crewLink, livingShip, entityTracker].filter(Boolean);

  function closePanels(){
    panels.forEach(p => p.classList.remove("is-open"));
    if (backdrop) backdrop.hidden = true;
    document.body.classList.remove("side-panel-open");
  }

  function openPanel(panel){
    if (!panel) return;
    panels.forEach(p => p.classList.toggle("is-open", p === panel));
    if (backdrop) backdrop.hidden = false;
    document.body.classList.add("side-panel-open");
  }

  const openControls = $("openControlsPanel");
  const openOracle = $("openOraclePanel");
  const openStorage = $("openStoragePanel");
  const focusOutput = $("focusOutputPanel");
  const openCrewLink = $("openCrewLinkPanel");
  const openLivingShip = $("openLivingShipPanel");
  const openEntityTracker = $("openEntityTrackerPanel");

  if (openControls) openControls.addEventListener("click", () => { showLeftTab("scene"); openPanel(controls); });
  if (openOracle) openOracle.addEventListener("click", () => openPanel(oracles));
  if (openStorage) openStorage.addEventListener("click", () => openSettingsModal());
  if (openCrewLink) openCrewLink.addEventListener("click", () => { showLeftTab("crew"); openPanel(crewLink); });
  if (openLivingShip) openLivingShip.addEventListener("click", () => { showLeftTab("living"); openPanel(livingShip); });
  if (openEntityTracker) openEntityTracker.addEventListener("click", () => { showLeftTab("entity"); openPanel(entityTracker); });
  if (focusOutput) focusOutput.addEventListener("click", () => {
    closePanels();
    window.scrollTo({top:0,behavior:"smooth"});
  });

  if (backdrop) backdrop.addEventListener("click", closePanels);
  document.querySelectorAll("[data-close-panel]").forEach(btn => btn.addEventListener("click", closePanels));
  document.addEventListener("keydown", evt => {
    if (evt.key === "Escape"){ closePanels(); closeSettingsModal(); }
  });

  // Auto-close after generating content on narrow screens so the middle output stays visible.
  ["generateScene","generateMission","generateWorld"].forEach(id => {
    const btn = $(id);
    if (btn) btn.addEventListener("click", () => {
      if (window.matchMedia("(max-width: 900px)").matches) {
        setTimeout(closePanels, 120);
      }
    });
  });
}


// Entity Tracker extension
const ENTITY_TYPES = {
  npc: { label: 'NPCs', singular: 'NPC', icon: '♟' },
  location: { label: 'Locations', singular: 'Location', icon: 'img:entity-compass.png' },
  faction: { label: 'Factions', singular: 'Faction', icon: '⚑' },
  asset: { label: 'Assets', singular: 'Asset', icon: '▣' }
};
const ENTITY_SUBTYPES = {
  npc: [
    {key:'person', label:'Person', icon:'♟'},
    {key:'crew', label:'Crew', icon:'♙'},
    {key:'agent', label:'Agent', icon:'◉'},
    {key:'contact', label:'Contact', icon:'◎'},
    {key:'rival', label:'Rival', icon:'◍'}
  ],
  location: [
    {key:'compass', label:'General Location', icon:'img:entity-compass.png'},
    {key:'planet', label:'Planet', icon:'img:entity-planet.png'},
    {key:'city', label:'City', icon:'⌂'},
    {key:'colony', label:'Colony', icon:'⌘'},
    {key:'station', label:'Space Station', icon:'◎'},
    {key:'asteroid', label:'Asteroid Belt', icon:'◌'},
    {key:'district', label:'District', icon:'▦'},
    {key:'ruin', label:'Vault / Ruin', icon:'△'}
  ],
  faction: [
    {key:'faction', label:'Faction', icon:'⚑'},
    {key:'corporation', label:'Corporation', icon:'▣'},
    {key:'government', label:'Government', icon:'◈'},
    {key:'cult', label:'Cult', icon:'◆'},
    {key:'crew', label:'Crew / Cell', icon:'⬢'},
    {key:'syndicate', label:'Syndicate', icon:'⬟'}
  ],
  asset: [
    {key:'asset', label:'Asset', icon:'▣'},
    {key:'starship', label:'Starship', icon:'img:ship-generator-icon.png'},
    {key:'vehicle', label:'Vehicle', icon:'◧'},
    {key:'cargo', label:'Cargo', icon:'▤'},
    {key:'artifact', label:'Artifact', icon:'◇'},
    {key:'equipment', label:'Equipment', icon:'◫'}
  ]
};
const ENTITY_THUMBNAILS = Object.fromEntries(Object.entries(ENTITY_SUBTYPES).map(([type,rows])=>[type, rows.map(r=>r.icon)]));
const ENTITY_TAGS = {npc:[],location:[],faction:[],asset:[]};
function entityTagCatalog(){
  if(!state.entityTagCatalog || typeof state.entityTagCatalog!=="object") state.entityTagCatalog={};
  Object.keys(ENTITY_TYPES||{}).forEach(type=>{if(!Array.isArray(state.entityTagCatalog[type])) state.entityTagCatalog[type]=[];});
  return state.entityTagCatalog;
}
function tagSlug(label){return String(label||"").trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,40)||"custom-tag"}
function tagRowsForType(type){
  const custom=(entityTagCatalog()[type]||[]).filter(t=>t&&t.key&&t.label);
  const seen=new Set();
  return custom.filter(t=>{if(seen.has(t.key))return false;seen.add(t.key);return true;});
}
function defaultTagForType(type){return ""}
function tagMeta(type,tag){
  return tagRowsForType(type).find(t=>t.key===tag)||{key:tag||"",label:String(tag||"").replace(/[-_]/g," ").replace(/\b\w/g,c=>c.toUpperCase())||"Untagged",icon:"◇"};
}
function addCustomTagForType(type,label){
  const clean=String(label||"").trim(); if(!clean)return null;
  const rows=tagRowsForType(type);
  const existing=rows.find(t=>t.key===clean || t.label.toLowerCase()===clean.toLowerCase());
  if(existing)return existing;
  const catalog=entityTagCatalog();
  let key=tagSlug(clean); let base=key; let i=2;
  while(tagRowsForType(type).some(t=>t.key===key)){key=base+"-"+i++;}
  const tag={key,label:clean,icon:"◇"};
  catalog[type].unshift(tag);
  return tag;
}
function pruneUnusedEntityTags(){
  const catalog=entityTagCatalog();
  const used={npc:new Set(),location:new Set(),faction:new Set(),asset:new Set()};
  (state.entities?.items||[]).forEach(ent=>{
    const type=ent.type||"asset";
    (ent.tags||[]).filter(Boolean).forEach(tag=>{if(used[type])used[type].add(tag);});
  });
  Object.keys(catalog).forEach(type=>{
    catalog[type]=(catalog[type]||[]).filter(tag=>used[type]?.has(tag.key));
  });
}
function normalizeEntityTags(ent){
  if(!ent.tags||!Array.isArray(ent.tags)) ent.tags=[];
  ent.tags=[...new Set(ent.tags.filter(Boolean))];
  return ent.tags;
}
function entityTagLabels(ent){const tags=normalizeEntityTags(ent);return tags.length?tags.map(t=>tagMeta(ent.type,t).label).join(", "):"No tags"}
function entityPrimaryTagIcon(ent){const tag=normalizeEntityTags(ent)[0];return tag?tagMeta(ent.type,tag).icon:(ENTITY_TYPES[ent.type]?.icon||"⬢")}


function entityIconMarkup(icon,label='Entity'){
  const safeLabel=escapeHtml(label||'Entity');
  if(String(icon||'').startsWith('img:')) return `<img class="entity-icon-img" src="${escapeHtml(String(icon).slice(4))}" alt="${safeLabel}">`;
  return `<span class="entity-icon-text" aria-hidden="true">${escapeHtml(icon||'⬢')}</span>`;
}
function subtypeRowsForType(type){return ENTITY_SUBTYPES[type]||ENTITY_SUBTYPES.asset}
function defaultSubtypeForType(type){return subtypeRowsForType(type)[0]?.key||'asset'}
function subtypeMeta(type,subtype){return subtypeRowsForType(type).find(s=>s.key===subtype)||subtypeRowsForType(type)[0]||{key:'asset',label:'Asset',icon:'▣'}}
function entityResolvedIcon(ent){if(!ent)return '⬢';normalizeEntityTags(ent);if(ent.thumbnailImage)return 'img:'+ent.thumbnailImage;return entityPrimaryTagIcon(ent)||ENTITY_TYPES[ent.type]?.icon||'⬢'}
function ensureEntityState(){
  if(!state.entities) state.entities={items:[], activeId:null, history:[]};
  if(!Array.isArray(state.entities.items)) state.entities.items=[];
  if(!Array.isArray(state.entities.history)) state.entities.history=[];
  state.entities.items.forEach(ent=>{normalizeEntityTags(ent);if(!Array.isArray(ent.relationships))ent.relationships=[];if(ent.links==null)ent.links="";if(ent.thumbnailImage==null)ent.thumbnailImage="";ent.thumbnail=ent.thumbnailImage?("img:"+ent.thumbnailImage):entityPrimaryTagIcon(ent);});
  return state.entities;
}
function entityId(){return 'ent_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7)}
function entityById(id){return ensureEntityState().items.find(e=>e.id===id)}
function defaultEntity(type){const meta=ENTITY_TYPES[type]||ENTITY_TYPES.asset;return {id:entityId(), type, tags:[], thumbnail:meta.icon, thumbnailImage:'', name:'', links:'', relationshipDescription:'', overview:'', revealed:'', relationships:[]}}
function entityDisplayName(ent){return ent ? (ent.name||ENTITY_TYPES[ent.type]?.singular||'Entity') : 'Entity'}
function ensureReciprocalEntityRelationships(){const es=ensureEntityState();const byId=new Map(es.items.map(e=>[e.id,e]));es.items.forEach(ent=>{if(!Array.isArray(ent.relationships))ent.relationships=[];ent.relationships=ent.relationships.filter(r=>r&&r.id&&byId.has(r.id)&&r.id!==ent.id);ent.relationships.forEach(r=>{const other=byId.get(r.id);if(!Array.isArray(other.relationships))other.relationships=[];if(!other.relationships.some(back=>back.id===ent.id)){other.relationships.push({id:ent.id,description:'Connected to '+entityDisplayName(ent)});}});});}
function setActiveEntity(id, pushHistory=true){const es=ensureEntityState();if(!entityById(id))return;if(pushHistory && es.activeId && es.activeId!==id){es.history=[es.activeId,...es.history.filter(x=>x!==es.activeId)].slice(0,8)}es.activeId=id;saveState();renderEntityTracker();scrollActiveCardToTop('entityTrackerPanel')}
function addEntity(type='npc'){const es=ensureEntityState();const safeType=ENTITY_TYPES[type]?type:'npc';const ent=defaultEntity(safeType);es.items.push(ent);setActiveEntity(ent.id,false);saveState();renderEntityTracker();setTimeout(()=>{const nameField=document.getElementById('entityName');if(nameField){nameField.focus();nameField.select();}},50)}
function removeEntity(id){const es=ensureEntityState();if(!id)return;if(!confirm('Remove this entity and its relationships?'))return;es.items=es.items.filter(e=>e.id!==id);es.items.forEach(e=>e.relationships=(e.relationships||[]).filter(r=>r.id!==id));es.history=es.history.filter(x=>x!==id);if(es.activeId===id)es.activeId=es.items[0]?.id||null;pruneUnusedEntityTags();saveState();renderEntityTracker()}
function updateActiveEntityField(field,value){const ent=entityById(ensureEntityState().activeId);if(!ent)return;ent[field]=value;saveState();renderEntityDirectoryOnly()}
function addRelationshipToActive(targetId){const es=ensureEntityState();const active=entityById(es.activeId);const target=entityById(targetId);if(!target)return;if(!active){setActiveEntity(targetId,false);return}if(active.id===target.id)return;if(!Array.isArray(active.relationships))active.relationships=[];if(!Array.isArray(target.relationships))target.relationships=[];let existing=active.relationships.find(r=>r.id===target.id);if(!existing)active.relationships.push({id:target.id, description:'Connected to '+entityDisplayName(target)});let back=target.relationships.find(r=>r.id===active.id);if(!back)target.relationships.push({id:active.id, description:'Connected to '+entityDisplayName(active)});saveState();renderEntityTracker()} 
function removeRelationshipFromActive(targetId){const ent=entityById(ensureEntityState().activeId);const target=entityById(targetId);if(!ent)return;ent.relationships=(ent.relationships||[]).filter(r=>r.id!==targetId);if(target)target.relationships=(target.relationships||[]).filter(r=>r.id!==ent.id);saveState();renderEntityTracker()}
function updateRelationshipDescription(targetId,value){const ent=entityById(ensureEntityState().activeId);if(!ent)return;const rel=(ent.relationships||[]).find(r=>r.id===targetId);if(rel){rel.description=value;saveState()}}
function initEntityTracker(){
  ensureEntityState();
  const generic=$('entityAddGeneric'); if(generic) generic.addEventListener('click',()=>addEntity('npc'));
  const filter=$('entityFilter'); if(filter) filter.addEventListener('input',()=>{state.entityFilter=filter.value; const lf=$('entityListFilter'); if(lf)lf.value=state.entityFilter; saveState(); renderEntityDirectoryOnly();}); const listFilter=$('entityListFilter'); if(listFilter) listFilter.addEventListener('input',()=>{state.entityFilter=listFilter.value; const ef=$('entityFilter'); if(ef)ef.value=state.entityFilter; saveState(); renderEntityDirectoryOnly();}); const showEditor=$('entityListShowEditor'); if(showEditor) showEditor.addEventListener('click',()=>showLeftTab('entity')); initEntityEditorLinks();
  const mobile=$('openEntityTrackerPanel');
  if(mobile) mobile.addEventListener('click',()=>{showLeftTab('entity'); const p=$('entityTrackerPanel'); document.querySelectorAll('.side-panel').forEach(x=>x.classList.toggle('is-open',x===p)); const bd=$('panelBackdrop'); if(bd) bd.hidden=false; document.body.classList.add('side-panel-open');});
  renderEntityTracker();
}
function renderEntityTracker(){ensureReciprocalEntityRelationships();renderEntityActiveCard();renderEntityDirectoryOnly()}

function makeTextareaToolbar(targetId){
  const actions=[['bold','𝗕','Bold'],['italic','𝘐','Italic'],['ul','•','Bullet list'],['ol','☷','Numbered list'],['quote','❝','Quote'],['h2','▣','Header'],['indent','⇥','Indent'],['outdent','⇤','Outdent']];
  return `<div class="format-toolbar textarea-toolbar" data-textarea-toolbar="${targetId}">${actions.map(a=>`<button type="button" class="icon-button secondary" data-textarea-format="${a[0]}" data-textarea-target="${targetId}" title="${a[2]}" aria-label="${a[2]}">${a[1]}</button>`).join('')}</div>`;
}
function formatTextareaMarkup(textarea,cmd){
  if(!textarea)return;
  const start=textarea.selectionStart||0,end=textarea.selectionEnd||0;
  const val=textarea.value||'', sel=val.slice(start,end)||'';
  let before='', after='', replacement=sel;
  if(cmd==='bold'){before='**';after='**';}
  else if(cmd==='italic'){before='*';after='*';}
  else if(cmd==='quote'){replacement=(sel||'quote').split(/\r?\n/).map(l=>'> '+l).join('\n');}
  else if(cmd==='h2'){replacement='## '+(sel||'Header');}
  else if(cmd==='ul'){replacement=(sel||'list item').split(/\r?\n/).map(l=>'- '+l).join('\n');}
  else if(cmd==='ol'){replacement=(sel||'list item').split(/\r?\n/).map((l,i)=>(i+1)+'. '+l).join('\n');}
  else if(cmd==='indent'){replacement=(sel||'').split(/\r?\n/).map(l=>'  '+l).join('\n');}
  else if(cmd==='outdent'){replacement=(sel||'').split(/\r?\n/).map(l=>l.replace(/^\s{1,2}/,'')).join('\n');}
  const insert=before+replacement+after;
  textarea.value=val.slice(0,start)+insert+val.slice(end);
  textarea.dispatchEvent(new Event('input',{bubbles:true}));
  textarea.focus(); textarea.setSelectionRange(start,start+insert.length);
}
function bindTextareaToolbars(root=document){
  root.querySelectorAll('[data-textarea-format]').forEach(btn=>{
    if(btn.dataset.boundTextareaToolbar)return; btn.dataset.boundTextareaToolbar='1';
    btn.addEventListener('click',()=>formatTextareaMarkup(document.getElementById(btn.dataset.textareaTarget),btn.dataset.textareaFormat));
  });
}

function renderEntityActiveCard(){
  const card=$('entityActiveCard'); if(!card)return; const es=ensureEntityState();
  if(!es.activeId && es.items.length) es.activeId=es.items[0].id;
  const ent=entityById(es.activeId);
  if(!ent){card.innerHTML='<div class="entity-empty"><h3>No active entity</h3><p class="small">Use Add entity or the + icon in a directory header to begin. You can also drag an entity from the directory here to make it active.</p></div>';card.ondragover=e=>e.preventDefault();card.ondrop=e=>{e.preventDefault();const id=e.dataTransfer.getData('text/entity-id');if(id)setActiveEntity(id,false)};return;}
  const typeOptions=Object.entries(ENTITY_TYPES).map(([k,v])=>`<option value="${k}" ${ent.type===k?'selected':''}>${v.singular}</option>`).join('');
  normalizeEntityTags(ent);
  const availableTags=tagRowsForType(ent.type).filter(t=>!ent.tags.includes(t.key));
  const tagOptions=availableTags.map(t=>`<option value="${escapeHtml(t.label)}" data-key="${escapeHtml(t.key)}"></option>`).join('');
  const tagChips=ent.tags.map(t=>{const m=tagMeta(ent.type,t);return `<span class="entity-tag-chip">${entityIconMarkup(m.icon,m.label)}<span>${escapeHtml(m.label)}</span><button type="button" class="entity-tag-remove" data-tag="${escapeHtml(t)}" title="Remove tag">×</button></span>`}).join('');
  const history=(es.history||[]).map(id=>entityById(id)).filter(Boolean).slice(0,5).map((h,i)=>`<button type="button" class="entity-history-tab entity-history-link" data-entity-id="${h.id}" title="Open ${escapeHtml(h.name||ENTITY_TYPES[h.type]?.singular||'Entity')}">${escapeHtml(h.name||ENTITY_TYPES[h.type]?.singular||'Entity')}</button>`).join('');
  const rels=(ent.relationships||[]).map(r=>{const target=entityById(r.id); if(!target)return ''; const targetMeta=ENTITY_TYPES[target.type]||ENTITY_TYPES.asset; return `<li class="entity-rel-row"><button type="button" class="entity-rel-link" data-entity-id="${target.id}"><span class="entity-glyph">${entityIconMarkup(entityResolvedIcon(target),target.name)}</span> ${escapeHtml(target.name||'Unnamed')}</button><span class="entity-rel-type" title="Entity type">${escapeHtml(targetMeta.singular||targetMeta.label||target.type||'Entity')}</span><input class="entity-rel-desc" data-rel-id="${target.id}" value="${escapeHtml(r.description||('Connected to '+entityDisplayName(target)))}" placeholder="Describe this entity&apos;s view of the relationship"><button type="button" class="secondary entity-rel-remove" data-rel-id="${target.id}" title="Remove relationship">×</button></li>`}).join('');
  card.innerHTML=`<div class="entity-nav-row"><button id="entityBack" type="button" class="secondary entity-back" title="Back">←</button><div class="entity-history-tabs">${history}</div></div>
  <div class="entity-main-drop"><div class="entity-identity-grid"><div class="entity-identity-fields"><div class="entity-form-head entity-form-head-compact"><div class="entity-head-fields"><label>Name<input id="entityName" value="${escapeHtml(ent.name||'')}"></label><label>Type<select id="entityType">${typeOptions}</select></label></div><button id="entityRemove" type="button" class="secondary entity-delete">Remove</button></div><label>Relationship description<input id="entityRelationshipDescription" value="${escapeHtml(ent.relationshipDescription||'')}" placeholder="How this entity tends to connect to scenes or other entities"></label><div class="entity-tag-panel"><div class="entity-tag-row">${tagChips||'<span class="small">No tags yet.</span>'}</div><div class="entity-tag-add"><input id="entityTagInput" list="entityTagOptions" placeholder="Choose existing tag or type a new tag"><datalist id="entityTagOptions">${tagOptions}</datalist><button id="entityAddTag" type="button" class="secondary compact-button">Add tag</button></div></div><label class="entity-links-field">Hyperlinks<textarea id="entityLinks" rows="2" placeholder="Paste relevant links, one per line.">${escapeHtml(ent.links||'')}</textarea></label><section class="entity-relationships compact-rels"><div class="section-header"><h3>Relationship Outline</h3><button id="entityAddRelated" type="button" class="secondary compact-button">Add Existing</button></div><ul class="entity-rel-list">${rels||'<li class="small">No relationships yet. Drag an entity from the directory onto this card or use Add Existing.</li>'}</ul></section></div><label class="entity-photo-picker" title="Click to choose an entity picture"><span>Thumbnail</span><div class="entity-photo-frame">${entityIconMarkup(entityResolvedIcon(ent),ent.name)}</div><input id="entityThumbnailInput" type="file" accept="image/*"></label></div><label>Overview description</label>${makeTextareaToolbar('entityOverview')}<textarea id="entityOverview" rows="4" placeholder="Who or what this is, what it wants, and how it appears in play.">${escapeHtml(ent.overview||'')}</textarea>
  <label>Revealed details</label>${makeTextareaToolbar('entityRevealed')}<textarea id="entityRevealed" rows="4" placeholder="Facts the players have discovered or confirmed.">${escapeHtml(ent.revealed||'')}</textarea></div>`;
  const bindInput=(id,field)=>{const el=$(id); if(el) el.addEventListener('input',()=>updateActiveEntityField(field,el.value));};
  bindInput('entityName','name'); bindInput('entityLinks','links'); bindInput('entityRelationshipDescription','relationshipDescription'); bindInput('entityOverview','overview'); bindInput('entityRevealed','revealed'); bindTextareaToolbars(card);
  const type=$('entityType'); if(type) type.addEventListener('change',()=>{ent.type=type.value;ent.tags=[];ent.thumbnail=ent.thumbnailImage?('img:'+ent.thumbnailImage):(ENTITY_TYPES[ent.type]?.icon||'⬢'); pruneUnusedEntityTags(); saveState(); renderEntityTracker()});
  const addTagBtn=$('entityAddTag'); if(addTagBtn) addTagBtn.addEventListener('click',()=>{const inp=$('entityTagInput'); const val=(inp?.value||'').trim(); if(val){const tag=addCustomTagForType(ent.type,val); if(tag){normalizeEntityTags(ent);ent.tags.push(tag.key);ent.tags=[...new Set(ent.tags)];ent.thumbnail=ent.thumbnailImage?('img:'+ent.thumbnailImage):entityPrimaryTagIcon(ent);} saveState();renderEntityTracker();}});
  document.querySelectorAll('.entity-tag-remove').forEach(btn=>btn.addEventListener('click',()=>{normalizeEntityTags(ent);ent.tags=ent.tags.filter(t=>t!==btn.dataset.tag);ent.thumbnail=ent.thumbnailImage?('img:'+ent.thumbnailImage):entityPrimaryTagIcon(ent);pruneUnusedEntityTags();saveState();renderEntityTracker();}));
  const thumbInput=$('entityThumbnailInput'); if(thumbInput) thumbInput.addEventListener('change',()=>{const file=thumbInput.files&&thumbInput.files[0]; if(!file)return; const reader=new FileReader(); reader.onload=()=>{ent.thumbnailImage=reader.result; ent.thumbnail='img:'+reader.result; saveState(); renderEntityTracker();}; reader.readAsDataURL(file);});
  const del=$('entityRemove'); if(del) del.addEventListener('click',()=>removeEntity(ent.id));
  const back=$('entityBack'); if(back) back.addEventListener('click',()=>{const prev=es.history.shift(); if(prev&&entityById(prev)){setActiveEntity(prev,false)}else renderEntityTracker()});
  document.querySelectorAll('.entity-history-tab,.entity-rel-link').forEach(btn=>btn.addEventListener('click',()=>setActiveEntity(btn.dataset.entityId,true)));
  document.querySelectorAll('.entity-rel-desc').forEach(inp=>inp.addEventListener('input',()=>updateRelationshipDescription(inp.dataset.relId,inp.value)));
  document.querySelectorAll('.entity-rel-remove').forEach(btn=>btn.addEventListener('click',()=>removeRelationshipFromActive(btn.dataset.relId)));
  const addExisting=$('entityAddRelated'); if(addExisting) addExisting.addEventListener('click',()=>{const choices=es.items.filter(e=>e.id!==ent.id && !(ent.relationships||[]).some(r=>r.id===e.id)); if(!choices.length){alert('No unlinked entities available.');return} const pickName=prompt('Type the exact name of an existing entity to relate:\n\n'+choices.map(e=>e.name).join('\n')); const found=choices.find(e=>(e.name||'').toLowerCase() === (pickName||'').toLowerCase()); if(found)addRelationshipToActive(found.id);});
  card.ondragover=e=>{e.preventDefault();card.classList.add('drag-over')};
  card.ondragleave=()=>card.classList.remove('drag-over');
  card.ondrop=e=>{e.preventDefault();card.classList.remove('drag-over');const id=e.dataTransfer.getData('text/entity-id');if(id)addRelationshipToActive(id)};
}
function entityDirGroupDefaultOpen(type, filter, count, directoryKey){
  const es=ensureEntityState();
  es.openGroups=es.openGroups||{};
  const key=(directoryKey||'entityDirectory')+':'+type;
  if(Object.prototype.hasOwnProperty.call(es.openGroups,key)) return !!es.openGroups[key];
  return !!filter || count < 4;
}
function rememberEntityDirGroupOpen(type, directoryKey, isOpen){
  const es=ensureEntityState();
  es.openGroups=es.openGroups||{};
  es.openGroups[(directoryKey||'entityDirectory')+':'+type]=!!isOpen;
  saveState();
}
function renderEntityDirectoryOnly(){
  const dir=$('entityDirectory'); if(!dir)return; const es=ensureEntityState();
  const filterEl=$('entityFilter');
  if(filterEl && filterEl.value!==state.entityFilter) filterEl.value=state.entityFilter||filterEl.value;
  const filter=(filterEl?.value||state.entityFilter||'').trim().toLowerCase();
  dir.innerHTML='';
  Object.entries(ENTITY_TYPES).forEach(([type,meta])=>{
    const items=es.items.filter(e=>e.type===type).filter(e=>{
      if(!filter)return true;
      const tags=entityTagLabels(e);
      return [e.name, e.relationshipDescription, e.overview, e.revealed, tags, meta.label].some(v=>String(v||'').toLowerCase().includes(filter));
    }).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),undefined,{sensitivity:'base'}));
    const details=document.createElement('details'); details.open=entityDirGroupDefaultOpen(type, filter, items.length, 'entityDirectory'); details.className='entity-dir-group'; details.addEventListener('toggle',()=>rememberEntityDirGroupOpen(type,'entityDirectory',details.open));
    const summary=document.createElement('summary'); summary.className='entity-dir-summary'; const title=document.createElement('span'); title.textContent=meta.label; const add=document.createElement('button'); add.type='button'; add.className='entity-dir-add icon-button secondary'; add.title='Add '+meta.singular; add.setAttribute('aria-label','Add '+meta.singular); add.textContent='＋'; add.addEventListener('click',ev=>{ev.preventDefault();ev.stopPropagation();addEntity(type)}); summary.appendChild(title); summary.appendChild(add); details.appendChild(summary);
    const list=document.createElement('div'); list.className='entity-dir-list';
    items.forEach(ent=>{
      normalizeEntityTags(ent);
      const btn=document.createElement('button'); btn.type='button'; btn.className='entity-dir-item'+(es.activeId===ent.id?' active':''); btn.draggable=true; btn.dataset.entityId=ent.id; btn.innerHTML=`<span class="entity-glyph">${entityIconMarkup(entityResolvedIcon(ent),ent.name)}</span><span class="entity-dir-name">${escapeHtml(ent.name||meta.singular)}</span><span class="entity-dir-tags">${escapeHtml(entityTagLabels(ent))}</span>`;
      btn.addEventListener('click',()=>setActiveEntity(ent.id,true));
      btn.addEventListener('dragstart',ev=>{ev.dataTransfer.setData('text/entity-id',ent.id);ev.dataTransfer.effectAllowed='copy'});
      list.appendChild(btn);
    });
    if(!list.children.length){const empty=document.createElement('p'); empty.className='small entity-dir-empty'; empty.textContent='None yet.'; list.appendChild(empty)}
    details.appendChild(list); dir.appendChild(details);
  });
  renderEntityListPanelDirectory();
}
function renderEntityListPanelDirectory(){
  const dir=$('entityListDirectory'); if(!dir)return; const es=ensureEntityState();
  const filterEl=$('entityListFilter'); if(filterEl && filterEl.value!==state.entityFilter) filterEl.value=state.entityFilter||filterEl.value;
  const filter=(filterEl?.value||state.entityFilter||'').trim().toLowerCase();
  dir.innerHTML='';
  Object.entries(ENTITY_TYPES).forEach(([type,meta])=>{
    const items=es.items.filter(e=>e.type===type).filter(e=>{
      if(!filter)return true; const tags=entityTagLabels(e);
      return [e.name,e.relationshipDescription,e.overview,e.revealed,tags,meta.label].some(v=>String(v||'').toLowerCase().includes(filter));
    }).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),undefined,{sensitivity:'base'}));
    const details=document.createElement('details'); details.open=entityDirGroupDefaultOpen(type, filter, items.length, 'entityListDirectory'); details.className='entity-dir-group'; details.addEventListener('toggle',()=>rememberEntityDirGroupOpen(type,'entityListDirectory',details.open));
    const summary=document.createElement('summary'); summary.className='entity-dir-summary'; const title=document.createElement('span'); title.textContent=meta.label; summary.appendChild(title); details.appendChild(summary);
    const list=document.createElement('div'); list.className='entity-dir-list';
    items.forEach(ent=>{normalizeEntityTags(ent); const btn=document.createElement('button'); btn.type='button'; btn.className='entity-dir-item'+(es.activeId===ent.id?' active':''); btn.draggable=true; btn.dataset.entityId=ent.id; btn.innerHTML=`<span class="entity-glyph">${entityIconMarkup(entityResolvedIcon(ent),ent.name)}</span><span class="entity-dir-name">${escapeHtml(ent.name||meta.singular)}</span><span class="entity-dir-tags">${escapeHtml(entityTagLabels(ent))}</span>`; btn.addEventListener('click',()=>{setActiveEntity(ent.id,true);showLeftTab('entity')}); btn.addEventListener('dragstart',ev=>{ev.dataTransfer.setData('text/entity-id',ent.id);ev.dataTransfer.setData('text/plain',entityDisplayName(ent));ev.dataTransfer.effectAllowed='copy'}); list.appendChild(btn);});
    if(!list.children.length){const empty=document.createElement('p'); empty.className='small entity-dir-empty'; empty.textContent='None yet.'; list.appendChild(empty)}
    details.appendChild(list); dir.appendChild(details);
  });
}
const baseShowLeftTab = showLeftTab;
showLeftTab = function(tab,save=true){
  state.activeLeftTab=(tab==='crew'||tab==='living'||tab==='entity'||tab==='entityList')?tab:'scene';
  const scene=$('controlsPanel'), crew=$('crewLinkPanel'), living=$('livingShipPanel'), entity=$('entityTrackerPanel'), entityList=$('entityListPanel');
  if(scene)scene.classList.toggle('active-left-view',state.activeLeftTab==='scene');
  if(crew)crew.classList.toggle('active-left-view',state.activeLeftTab==='crew');
  if(living)living.classList.toggle('active-left-view',state.activeLeftTab==='living');
  if(entity)entity.classList.toggle('active-left-view',state.activeLeftTab==='entity');
  if(entityList)entityList.classList.toggle('active-left-view',state.activeLeftTab==='entityList');
  document.querySelectorAll('[data-left-tab]').forEach(btn=>btn.classList.toggle('active',btn.dataset.leftTab===state.activeLeftTab));
  document.body.classList.toggle('left-crew-expanded',state.activeLeftTab==='crew'||state.activeLeftTab==='living'||state.activeLeftTab==='entity');
  if(document.body.classList.contains('side-panel-open')&&window.matchMedia('(max-width: 900px)').matches){[scene,crew,living,entity,entityList].filter(Boolean).forEach(p=>p.classList.toggle('is-open',p.classList.contains('active-left-view')))}
  if(state.activeLeftTab==='entity')renderEntityTracker();
  if(state.activeLeftTab==='entityList')renderEntityListPanelDirectory();
  scrollActiveCardToTop(state.activeLeftTab==='crew'?'crewLinkPanel':state.activeLeftTab==='living'?'livingShipPanel':state.activeLeftTab==='entity'?'entityTrackerPanel':state.activeLeftTab==='entityList'?'entityListPanel':'controlsPanel');
  if(save)saveState();
};



function getMentionTriggerBounds(target){
  const re=/@([\w\s'\-\.]{0,60})$/;
  if(!target)return null;
  if(target.isContentEditable){
    const sel=window.getSelection&&window.getSelection();
    if(!sel||!sel.rangeCount)return null;
    const range=sel.getRangeAt(0);
    const probe=range.cloneRange();
    probe.selectNodeContents(target);
    probe.setEnd(range.endContainer, range.endOffset);
    const before=probe.toString();
    const m=before.match(re);
    if(!m)return null;
    return { length:m[0].length };
  }
  if('selectionStart' in target){
    const pos=target.selectionStart||0;
    const before=String(target.value||'').slice(0,pos);
    const m=before.match(re);
    if(!m)return null;
    return { start:pos-m[0].length, end:pos, length:m[0].length };
  }
  return null;
}
function replaceMentionTriggerWithHtml(target,html){
  if(target&&target.isContentEditable){
    target.focus();
    const bounds=getMentionTriggerBounds(target);
    const sel=window.getSelection&&window.getSelection();
    if(bounds&&sel&&sel.rangeCount){
      const range=sel.getRangeAt(0);
      range.setStart(range.endContainer, Math.max(0, range.endOffset-bounds.length));
      range.deleteContents();
      sel.removeAllRanges(); sel.addRange(range);
    }
    document.execCommand('insertHTML',false,html+' ');
    return true;
  }
  return false;
}
function replaceMentionTriggerWithText(target,text){
  if(target&&'selectionStart' in target){
    const bounds=getMentionTriggerBounds(target);
    const start=bounds?bounds.start:(target.selectionStart||0);
    const end=bounds?bounds.end:(target.selectionEnd||0);
    const val=target.value||'';
    const insert=text+' ';
    target.value=val.slice(0,start)+insert+val.slice(end);
    target.dispatchEvent(new Event('input',{bubbles:true}));
    target.focus(); target.setSelectionRange(start+insert.length,start+insert.length);
    return true;
  }
  return false;
}
function entityLinkMarkup(ent){return `<a href="#" class="entity-inline-link" data-entity-id="${ent.id}">@${escapeHtml(entityDisplayName(ent))}</a>`}
function insertEntityReference(target,ent){
  if(!target||!ent)return;
  if(replaceMentionTriggerWithHtml(target, entityLinkMarkup(ent))) return;
  if(replaceMentionTriggerWithText(target, '@'+entityDisplayName(ent))) return;
}
function closeEntityMentionPopup(){const old=document.getElementById('entityMentionPopup'); if(old)old.remove();}
function showEntityMentionPopup(target,query=''){
  closeEntityMentionPopup(); const es=ensureEntityState(); const q=String(query||'').toLowerCase();
  const items=es.items.filter(e=>!q||entityDisplayName(e).toLowerCase().includes(q)||entityTagLabels(e).toLowerCase().includes(q)).slice(0,10);
  if(!items.length)return;
  const pop=document.createElement('div'); pop.id='entityMentionPopup'; pop.className='entity-mention-popup';
  items.forEach(ent=>{const b=document.createElement('button');b.type='button';b.innerHTML=`<span class="entity-glyph">${entityIconMarkup(entityResolvedIcon(ent),ent.name)}</span><span>${escapeHtml(entityDisplayName(ent))}</span><small>${escapeHtml(entityTagLabels(ent))}</small>`; b.addEventListener('mousedown',ev=>{ev.preventDefault(); insertEntityReference(target,ent); closeEntityMentionPopup();}); pop.appendChild(b);});
  document.body.appendChild(pop); const r=target.getBoundingClientRect(); pop.style.left=Math.max(8,Math.min(window.innerWidth-280,r.left))+'px'; pop.style.top=Math.min(window.innerHeight-220,r.bottom+4)+'px';
}
function initEntityEditorLinks(){
  if(document.body.dataset.entityEditorLinksBound)return; document.body.dataset.entityEditorLinksBound='1';
  document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('.entity-inline-link,[data-entity-link]'); if(a){e.preventDefault(); const id=a.dataset.entityId||a.dataset.entityLink; if(id&&entityById(id)){setActiveEntity(id,true);showLeftTab('entity');}}});
  document.addEventListener('dragover',e=>{const t=e.target.closest&&e.target.closest('.rich-editor, textarea'); if(t&&e.dataTransfer.types.includes('text/entity-id')){e.preventDefault();}});
  document.addEventListener('drop',e=>{const t=e.target.closest&&e.target.closest('.rich-editor, textarea'); if(!t)return; const id=e.dataTransfer.getData('text/entity-id'); const ent=entityById(id); if(ent){e.preventDefault(); insertEntityReference(t,ent);}});
  document.addEventListener('keyup',e=>{const t=e.target.closest&&e.target.closest('.rich-editor, textarea'); if(!t)return; let text=''; if(t.isContentEditable){text=(t.textContent||'').slice(-40);} else {text=(t.value||'').slice(0,t.selectionStart||0).slice(-40);} const m=text.match(/@([\w\s'-]{0,30})$/); if(m)showEntityMentionPopup(t,m[1]); else closeEntityMentionPopup();});
  document.addEventListener('scroll',closeEntityMentionPopup,true); window.addEventListener('resize',closeEntityMentionPopup);
}

function rollDie(sides){return Math.floor(Math.random()*sides)+1}
function rollStarforgedDiceToast(){
  let stat=2;
  const input=prompt("Starforged action score / stat add:","2");
  if(input===null)return;
  const parsed=Number(input);
  if(Number.isFinite(parsed))stat=parsed;
  const action=rollDie(6);
  const total=action+stat;
  const c1=rollDie(10), c2=rollDie(10);
  const hits=(total>c1?1:0)+(total>c2?1:0);
  const match=c1===c2;
  const outcome=hits===2?"STRONG HIT":hits===1?"WEAK HIT":"MISS";
  const toast=$("sfRollToast");
  const statEl=$("sfToastStat"), formulaEl=$("sfToastActionFormula"), challengeEl=$("sfToastChallengeDice"), outcomeEl=$("sfToastOutcome");
  if(statEl)statEl.textContent="ACTION";
  if(formulaEl)formulaEl.textContent=action+" + "+stat+" = "+total;
  if(challengeEl)challengeEl.textContent=c1+", "+c2+(match?"  • MATCH":"");
  if(outcomeEl){outcomeEl.textContent=outcome;outcomeEl.className="sf-roll-outcome "+(hits===2?"strong-hit":hits===1?"weak-hit":"miss")+(match?" match":"")}
  if(toast){toast.classList.add("show");toast.setAttribute("aria-hidden","false");clearTimeout(rollStarforgedDiceToast._timer);rollStarforgedDiceToast._timer=setTimeout(()=>{toast.classList.remove("show");toast.setAttribute("aria-hidden","true")},9000)}
  setStatus("Starforged roll: "+outcome+(match?" with a match":""));
}

initMobilePanels();
init();
initEntityTracker();

;(() => {
  function initSettingsTabs(){
    const modal=document.getElementById('settingsModal');
    if(!modal) return;
    const buttons=[...modal.querySelectorAll('[data-settings-tab]')];
    const sections=[...modal.querySelectorAll('[data-settings-section]')];
    function show(name){
      buttons.forEach(b=>b.classList.toggle('active', b.dataset.settingsTab===name));
      sections.forEach(s=>{const on=s.dataset.settingsSection===name; s.hidden=!on; s.classList.toggle('active-settings-section',on);});
    }
    buttons.forEach(b=>b.addEventListener('click',()=>show(b.dataset.settingsTab)));
    show('save');
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',initSettingsTabs); else initSettingsTabs();
})();

;(() => {
  const DELETE_ICON = './img/delete-icon.png';
  const EDIT_ICON = './edit-icon.png';
  const COPY_ICON = './img/copy-icon.png';
  const ADD_JOURNAL_ICON = './img/add-journal-icon.png';
  function esc(s){return String(s ?? '').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
  function iconHtml(src, cls, alt='') { return `<img class="${cls}" src="${src}" alt="${alt}">`; }
  function setIconButton(btn, src, cls, label, keepText=false) {
    if(!btn) return;
    const tip = btn.getAttribute('title') || btn.getAttribute('aria-label') || (btn.textContent||'').trim() || label || '';
    btn.dataset.customIconApplied = src;
    btn.title = tip || label || '';
    btn.setAttribute('aria-label', tip || label || 'Action');
    btn.classList.add('icon-only-button');
    btn.innerHTML = iconHtml(src, cls, tip || label || '');
  }
  function decorateActionIcons(root=document){
    root.querySelectorAll('button[title="Copy"], button[aria-label*="Copy"], #copyScene, #copyOracleOutput, #sfCopyRoll').forEach(btn=>setIconButton(btn, COPY_ICON, 'icon-img-copy', 'Copy'));
    root.querySelectorAll('button[title*="Add to Journal"], button[aria-label*="Add to Journal"], #addCurrentToJournal, #addJournalComment, #appendOracleToJournal, #lynxToJournal, #sfRollToJournal').forEach(btn=>setIconButton(btn, ADD_JOURNAL_ICON, 'icon-img-journal', 'Add to Journal'));
    root.querySelectorAll('button[title="Edit"], button[aria-label="Edit"]').forEach(btn=>setIconButton(btn, EDIT_ICON, 'icon-img-edit', 'Edit'));
    root.querySelectorAll('button[title="Delete"], button[aria-label="Delete"], .entity-rel-remove, .entity-tag-remove').forEach(btn=>setIconButton(btn, DELETE_ICON, 'icon-img-delete', 'Delete'));
    root.querySelectorAll('#entityRemove, button.entity-delete').forEach(btn=>setIconButton(btn, DELETE_ICON, 'icon-img-delete', 'Remove'));
  }
  function getCurrentDiceParts(){
    const stat = document.querySelector('#sfToastOutcome')?.textContent ? document.querySelector('#sfRollToast .sf-roll-stat')?.textContent : document.querySelector('#sfRollCard .sf-roll-stat')?.textContent;
    const formula = document.getElementById('sfToastActionFormula')?.textContent || document.getElementById('sfActionFormula')?.textContent || '';
    const challenges = document.getElementById('sfToastChallengeDice')?.textContent || document.getElementById('sfChallengeDice')?.textContent || '';
    const outcome = document.getElementById('sfToastOutcome')?.textContent || document.getElementById('sfOutcome')?.textContent || '';
    return { stat: (stat || 'EDGE').trim(), formula: formula.trim(), challenges: challenges.trim(), outcome: outcome.trim() || 'MISS' };
  }
  function diceRollSvgDataUrl(){
    const r = getCurrentDiceParts();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="235" height="127" viewBox="0 0 235 127">
      <rect x="0" y="0" width="235" height="127" rx="8" fill="#080d1b"/>
      <line x1="166" y1="10" x2="166" y2="117" stroke="#394056" stroke-width="1.2"/>
      <text x="16" y="32" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="800">${esc(r.stat.toUpperCase())}</text>
      <text x="52" y="72" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700">${esc(r.formula)}</text>
      <text x="54" y="104" fill="#d8deea" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700">${esc(r.challenges)}</text>
      <text x="201" y="80" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="900" text-anchor="middle">${esc(r.outcome.toUpperCase())}</text>
      <image href="data:image/png;base64,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" x="18" y="53" width="26" height="26" preserveAspectRatio="xMidYMid meet"/>
      <image href="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEBLAEsAAD/4QBWRXhpZgAATU0AKgAAAAgABAEaAAUAAAABAAAAPgEbAAUAAAABAAAARgEoAAMAAAABAAIAAAITAAMAAAABAAEAAAAAAAAAAAEsAAAAAQAAASwAAAAB/+0ALFBob3Rvc2hvcCAzLjAAOEJJTQQEAAAAAAAPHAFaAAMbJUccAQAAAgAEAP/hDW9odHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvADw/eHBhY2tldCBiZWdpbj0n77u/JyBpZD0nVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkJz8+Cjx4OnhtcG1ldGEgeG1sbnM6eD0nYWRvYmU6bnM6bWV0YS8nIHg6eG1wdGs9J0ltYWdlOjpFeGlmVG9vbCAxMS44OCc+CjxyZGY6UkRGIHhtbG5zOnJkZj0naHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyc+CgogPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9JycKICB4bWxuczp0aWZmPSdodHRwOi8vbnMuYWRvYmUuY29tL3RpZmYvMS4wLyc+CiAgPHRpZmY6UmVzb2x1dGlvblVuaXQ+MjwvdGlmZjpSZXNvbHV0aW9uVW5pdD4KICA8dGlmZjpYUmVzb2x1dGlvbj4zMDAvMTwvdGlmZjpYUmVzb2x1dGlvbj4KICA8dGlmZjpZUmVzb2x1dGlvbj4zMDAvMTwvdGlmZjpZUmVzb2x1dGlvbj4KIDwvcmRmOkRlc2NyaXB0aW9uPgoKIDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PScnCiAgeG1sbnM6eG1wPSdodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvJz4KICA8eG1wOkNyZWF0b3JUb29sPkFkb2JlIFN0b2NrIFBsYXRmb3JtPC94bXA6Q3JlYXRvclRvb2w+CiA8L3JkZjpEZXNjcmlwdGlvbj4KCiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0nJwogIHhtbG5zOnhtcE1NPSdodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vJz4KICA8eG1wTU06RG9jdW1lbnRJRD54bXAuaWlkOjBkZTE0YjgxLTAwMTktNDA1NC05YjY4LTMwZjE5MWE5NDZmODwveG1wTU06RG9jdW1lbnRJRD4KICA8eG1wTU06SW5zdGFuY2VJRD5hZG9iZTpkb2NpZDpzdG9jazo0OTY4Y2VmYi1hMDQ3LTRkZTQtODFhMy1iYTU3Njk5MDc3YzE8L3htcE1NOkluc3RhbmNlSUQ+CiAgPHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD5hZG9iZTpkb2NpZDpzdG9jazoxNTA1NDg0Nzg0PC94bXBNTTpPcmlnaW5hbERvY3VtZW50SUQ+CiA8L3JkZjpEZXNjcmlwdGlvbj4KPC9yZGY6UkRGPgo8L3g6eG1wbWV0YT4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKPD94cGFja2V0IGVuZD0ndyc/Pv/bAEMABQMEBAQDBQQEBAUFBQYHDAgHBwcHDwsLCQwRDxISEQ8RERMWHBcTFBoVEREYIRgaHR0fHx8TFyIkIh4kHB4fHv/AAAsIAWgBaAEBEQD/xAAdAAEAAgIDAQEAAAAAAAAAAAAACAkGBwIDBQQB/8QATRAAAQMDAgMDBwgFCwMEAgMAAQACAwQFBgcREiExCBNBFCJCUWFxgQkVFiMyUnKCGDNDkZIXNFNUVmKUorHS0yRzoSVjg5NERbLB8P/aAAgBAQAAPwCZaIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIi1J2kdbrLpHjzfNiuGRVjD5Bb+Pbl072Tbm2MH4uPIeJGn+zl2s58gyZuN6lNt9E6tk4aG5U7DFEx5PKOUEkAHoH78uh9al2ERERERERERERERERERERERERERERav7RGsdj0lxM1lT3dZe6trm2238WxlcPTftzbG3xPj0HM8q0c2yi95lk9bkeRV0lbcayTjlkd0Hqa0dGtA5ADkAvFHJTR7GfaL77yPTjPK76zzYbPcpn/a8G08rj4+DHHr9k89t5jhERERERERERERERERERERERERERa8151XsOlGHSXi6ObUV84cy3UDX7PqZAP/DByLneA9ZIBrL1DzK/55llZkuR1jqquqneHJkTB9mNjfRY0dB8TuSSseXOeGWCQxzRvjeNt2vaQRuNxyPsX66KaFscj43sbI3jjcWkBwBI3B8RuCNx4gqcnY17RAyCKl09ziu/9YYBHa7hM7+eNHSKQn9qPA+mOX2vtSwRERERERERERERERERERERERERYTrNqXj2l+Gz5BfZeN53ZR0bHAS1cu3JjfUPEu6NHP1A1k6rZ/kOpGY1WS5FU95PKeGGFpIipogTwxsHg0b+8ncnmVtnHNJzp7oVd9Wc1pu7utXTikxy2zM5xST+aKmRp9MML3saenDxHnttqTSTFZc21LsGKxBxFxrY4pSOrYgd5HfBgcfgt0fKA4THjuqlDkNDTiGgvdCwbNbs1s0AEbgPyd0f3rj2Z8PsusumGQ6cXOZtLfbNJ85WGuI3MLZdmyxnxMRe1hI9b9xz66MzHGr/AIPllXYb7STW+6UEuzm77cxza9jh1aeRDh15FTg7H3aHZmtLBhGZ1bWZNCzho6uQ7C4saOh/94Dr94c+u6k2iIiIiIiIiIiIiIiIiIiIiIiLE9V9QMe03w6pyXIqnghi82CBhHe1MpB4Y2DxcdvcBuTyCrJ1k1KyLVDMp8gv03C3myjo2OJipIt+TG/6l3Unn6gJFdjLs7CuNJqNndDvSAtltFtmZ+uPVs8jT6Hi1p+11PLbfh8o/mInvePYLTS7spInXGraD+0fuyIH2hoefzhfB8nJh3l+b3vNKiLeG1UopKZx/ppvtEe0MaR+dbw7dWHfSbQusuUEQfWWCZtwjI693zZKPdwu4vyBQ27J+Y/QrXbH7hNL3dFWTfN1WT07ubzQT7Gv4HflU5O0xonatWsX4ou5o8loYz831xGwPU9zJtzMZPxaeY8Qa3b1a77h+Uz224wVVqvNsqAHt3LJIZGncOaR8CHDryIU+uyL2gKfUa2R4tk88cOW0kfmvOzW3GNo5yNHhIB9po/EOW4Eh0RERERERERERERERERERERFj2ouZ2DAsSrMmySsFNQ0zeg5vled+GNjfSe7bkPidgCVWVrvqtf9V8xfeLo4wUMO8dvoGu3jpYienteeRc7xPqAAG5exx2eHZTPTZ9m1ERYYnB9uoZW/z9wPKR4/ogeg9M/3R507vMii9FjGj3AAKqHXXL3Z1q5keTCQvgqq1zaU777QM8yL/I0H4qf/AGN8O+h+gtkZNF3dbdQbnU7t2O8uxYD7oxGP3ra95t9LdrRWWuujElLWQPp52H0mPaWuH7iVUdnFgrMRza745Vlzam11slMX9CeBxAcPeNiPerRtCcvbnWkmOZOZA+eromtqtjvtOzzJf87XH4rBe1PoPb9VLCbnamQ0mWUMRFLUHzW1LBue5lPq+670SfUSq7Xsv2H5SWuFZZ73aqnn1jmp5mH/AMEEKw7sqa9UOqVkFnvMkNJl1FFvURDZraxg5d9GP/5NHQnccjy3oiIiIiIiIiIiIiIiIiIiIi8XOMpseGYxW5HkVdHRW6jZxySO6k+DWjq5xPIAcyVWj2h9Yr5q3lhranvKSy0jnNttvDtxE0+m7bk6R3Lc/Achz2J2QOz3JnlbFmWX0z48Wp5N6eneCDcZGnp/2gftH0j5o8SLAaeGKngZBBGyKKNoYxjGhrWtA2AAHQAeC1d2r8xOF6E5DcIZTHWVkPzfSEde8m3YSPa1nG78qrm0ixSXN9TbBi0QcW3CtjjlI6thB4pHfBgcfgraaWGKnpo6eCNscUbQxjGjYNaBsAPgF2KAHyhmHfM2q1FlVPFw01/ox3rg3YGoh2Y797DEf3rYXyb2Y+UWTIsFqZSX0krbjSNJ9B+zJQPYHBh/OVL1R+7WugNLqVaH5JjkMUGXUcWzejW3CNo5RPPg8ei4/hPLYtr+tldfcQymKtopqu03q11O7XbFksErCQQQfHqCD15gqx7swa4WzVjGu4qjDR5RQxjy+jB2Eg6d9ED1YT1HVpOx5EE7kRERERERERERERERERERF5uUX204zYKy+3yuiobdRRGWeeQ7BrR/qSdgAOZJACrW7S+tl21ayjaPvaLG6KQ/N1CTzPh30m3IyEfBo5DxJyLsl6BVWpl3bkOQwy0+I0cuzzza6vkB5xMPg0ek4e4c9yLErfR0tvoYKGhp4qalp42xQwxMDWRsaNg1oHIADwXeoR/KQZj5RfsewanlBZRwuuNW0f0km7IwfaGtefzr4vk5MO8uzS+ZrURbw2umFHTOPTvpubiPaGN2/wDkU6UWie3Lh30o0Jr6+CLjrLDK24xEde7G7ZR7uBxd+QKF/ZUzD6Fa6Y9cpZRHR1U/kFYT07qbzNz7Gu4HflVow6Io09r/ALPUedUc2Z4fSsZlNPHvU0zBsLjG0dP+6B0PpDzT4EQYxTIL9hWV017stVPbbtb5t2O22c1w5Oa5p6g8wWnqNwVZV2ctZbLq1igqYe7o77Rta25W/i5xu6d4zfmY3eB8DyPrO00RERERERERERERERERF8d8utusloqrtdqyGioaSJ0s88zuFkbBzJJVcXam13uGqt+NttbpqPE6GUmkpz5rql43Hfyj1/db6IPrJX52WNCbhqrf/nG5tmo8ToZQKupHmuqHjn3ER9Z9J3og+shWPWO1W6yWiltNpo4aKhpImxQQQt4WRsHIABfYuMjmsjc97g1rRuXE7ADxKqe1yy92datZHk/eF8FXWuFNud9oGeZEP4Gt/erAuxzh30P0GscU0Xd1t1abnVbjY7y7FgPujEY/etwovmutDTXO11dtrYxLS1cL4JmHo5j2lrh+4lVHZ9j1Xh+dXnG6ouE9rrZKbj6Fwa4hrx7xsR71aDoHmAzrSDHMldIH1FRRtZVnf9vH5kn+ZpPxCzlFFbtj9nhuTwVWf4RRAX2NpkuVDE3+fNA5yMA/agdR6Y/vfahhgOXX/A8spMjx2sfR3Ckfy3HmyN9KN7fSaehH+hAKsy0C1asWrGHsutuLaa5U4ay429z9300hH+ZjuZa7x6dQQtjIiIiIiIiIiIiIiIiIui4VlLb6GeurqiKmpaeN0s00rw1kbGjcucTyAAHVV2drPX2r1Mu78ex6aWnxGjl3YObXV8gPKV48Gj0Wn3nnsBjvZo0Vu2rWU7P72jxyheDca4D491HvyMhHwaOZ8AbKcWsNpxjH6Ow2KhiobdRRCKCCMcmgf+SSeZJ5kkkr00Wqu1lmP0L0IyGvhl7usrYfm6kI695Nu0ke1rON35VXRo/ikmb6nY/i0YJZcK2OOYjq2EHikd8GNcVbRTQxQU8cELGxxRtDWMaNg1oGwA+C7ERQE+UPw35n1RoMsp4uGnv1JwyuDeXlEOzXfvYY/wBxWd/JvZj31qyPBamXd9PI25UjSfQdsyUD2BwjP5ipgIih92zOzqa0Vmo2CUO9UN5rvbYW/rR1dPE0el4uaOv2hz33ilpZnmQac5jS5LjtV3VTCeGWJ25jqIifOjkHi07e8HYjmArN9FtTce1Sw2HILHLwSt2jraJ7gZaSXbmx3rHi13Rw9u4GboiIiIiIiIiIiIiIi4VE0VPBJPPKyKKNpe973BrWtA3JJPQAeKr+7X3aEkzytmw3EKp8eK00m1RUNJBuUjT1/wC0D9kekfOPgBrns86PXzVrLRQUnHSWelLX3K4Fu7YWH0W+DpHc9h8TyCsvwXFLHheL0eOY7Qso7dRs4Y2N5lx8XOPpOJ5knqV7aIoQfKP5j5VkWP4PTygx0MLrhVtH9JJuyMH2hrXH86+f5OPDvLsyvma1EW8VsphR0rj076Xm8j2hjdv/AJFOdERaN7cGHfSnQe5VcEXHWWKRtyi2HPgbu2Ue7gc535QoT9lvMPoTrljt1ll7ujnqPIawk8u6m8wk+xpLXflVpQ6IiKFPbM7OwojWajYJQ7UpJmu9thZ+qPMunjaPR8XNHT7Q5b7Ry0b1JyLS/MochsM245Mq6R7j3VXFvzY//UO6g8/fZrpLqFj2pWHU2SY9UccUnmTwPI72mlA86N48CN/cRsRyKy5ERERERERERERERfjnNa0ucQABuST0UD+2P2h3ZTPU4DhNaRYYnFlxronfz9wPONhH7IHqfTP90c9L6GaWX/VXMo7JaGGGli2kuFc9pMdLFv1PrceYa3xPqAJFmumuE2DAMRpMZxykFPR043c485JpD9qR59Jx8T7gNgAFkiIuMr2Rxue9waxo3c4nYAeJVTut+XOzrVjIso4y6GsrX+TbnfaBnmRD+BrVYL2PMO+h+gtjhmi7usujTc6rcbHim2LAfdGIwtvoiL57nRU1xttTb6yMS01TC+GZh6OY4Frh8QSqkNRMbqsNz29YzUlwmtdbJTh55FzWuPC/4t4T8VZ32fcwGc6O45kbpA+pmo2xVfPn38f1cm/vc0n3ELPERfjmhzS1wBBGxBUEe2P2d3YxNVZ/hFETYpHGS5UMTf5i4nnIwD9kT1HoH+79nS+hOqt/0ozJl5tTjPRTcMdwoHP2jqogenseOZa7wPrBINmunOaWDPcSo8mxysFTRVLeh5PiePtRvb6Lx4j3EbggrIkRERERERERERERQo7ZnaJFcazTnBK7ekG8N3uUL/1x6OgjcPR8HOHX7I5b7xx0e04yHU7MoMdsEPN3n1VU8HuqWLfnI8/+AOpOwCs10i07x7TPDafG8eg2Yzz6ioeB3tVKR50jz6z4DoBsAswREWp+1rmH0M0HyCthlMdZXRC3UhB2PHNu0ke0M43fBV26OYnJnGqGP4sxriyvrWMmI6thB4pD8GNcVbPTxRwQMhhY2OKNoaxrRsGtHIAfBc0REUCPlEsO+adTLbl1PFtT3yk7uZwH7eDZpJ98Zj/hKzP5N3Me8ocjwWpl86J7bnSNJ9F20coHuIjP5ipiIiLhPFFPA+CaNksUjS17HtBa4EbEEHqCFADtf9nqTBaybM8PpXyYtUSb1NMwEm3Pcen/AGieh9E+afAnXHZ41ivmkmWCtpe8rLLVOa25W4u2EzR6bd+TZG+B+B5FWX4PlNjzPGKLI8dro623VjOOORvIg+LXDq1wPIg8wV7SIiIiIiIiIiIih92zO0SaIVmnOCV3/VEGG73KF/6odHQRuHpeDnDp9kc99on6Y4NkGoeYUmNY5SmarnO75HbiOCMfakkPg0f+eQG5ICs30R0wx/SzDIrDZYxLO/aSurXtAkq5dvtO9TR0a3oB6ySTnSIiKD/yj2Y+VZLYMHppQY6CB1wqwP6WTdsYPtDGuP510/JxYd5bmF9zapi3ittMKKlcenfS83ke0Mbt/wDIpzIiIi0h22sO+leg90qIYuOtsb23ODYc+Fm4lH/1ucfyhQh7MOY/QjW/HbxLL3dHLUijrDvy7mbzCT7Gktd+VWmjoiIi6a+kpq+inoq2niqaaeN0c0MrA5kjHDYtcDyIIO2yru7WugNVprdn5HjkMtRiNZLs3q51vkceUTz4sPouP4Tz2Lsc7M+tl20lyfaTvq3G654+caEHmPDvo9+QkA+DhyPgRZRi99tOS2Cjvtjroq63VsQlgniO7XNP+hB5EHmCCCvSRERERERERERRX7Y/aHbi9PU4DhNaDfpWllxronfzFpHONhH7UjqfQH977MLcFxS/5zldJjuPUb6241j9mjfzWj0nvd6LQOZJVmHZ90hsWk2INttCGVV1qQ19yuBZs6okHgPuxt58LfieZK2UiIi4yvZHE6SRwYxoJc4nYADqVU3rZlr851XyLKC8uira15p9zvtA3zIh/A1qsJ7H+HfQ7QaxU80Xd1lyYbnVbjY8U2xaD7RGIx8Ft1EREXRcKSnr6CooquNstPUROilY7o5jgQ4H3glVI6lY1UYbqDfMXqOIPtlbJA1x6uYHHgd8W8J+Ks27O2YDOdGscyF8okqpKRsFWd+ffxfVyE+8t4vzBZ+iIi+O9Wu33q01VputHDWUNXE6KeCZvEyRhGxBCrj7U+g9w0rvpudqZNV4nXSkUtQfOdTPO57iU+v7rvSA9YK/OyxrvcNKr982XR01ZiddKDV04851M88u/iHr+830gPWArHbJdLferRS3a01kNbQ1cTZYJ4XcTJGEbggr7ERERERERERRs7X/AGg48CoZsNxGpZJlVTHtPUNO4t0bh1/7pH2R6I84+AMEsZsd9zLKaaz2ilqLndrjNwsYDxPkeTuXOJ8OpLj0G5Ksp7Nui9n0lxXum91W5BWsablXhv2j17qPfmI2n4uPM+AG10RERam7XGYnDdB7/Vwy93WXCMW2kIOx45t2uI9oZxu+Cru0axOTONUcfxZjXGOvrWMnI6thb50h+DGuVs9PFHDAyGFjWRsaGsa0bBoHID9y5oiIiKBfyimHfNeo1qzCni2gvdJ3M7gP28Ow3Pvjcz+ErLfk3cy4qfI8EqZebHNudG0u8DtHMB8e6PxKmOiIiLzsmsVqySwVlivlDDXW6tiMU8Eo3a9p/wBCOoI5ggEc1Wv2mNE7tpLk/FF31ZjVdIfm+uI5jx7mTbkJAPg4cx4gZD2S9farTO7tx3IZpajEayXd45udQSE85WDxYfSaPeOe4dYjb6yluFDBXUNRFU0tRG2WGaJ4cyRjhuHNI5EEc913oiIiIiIiLQvax17pNMbI6w2GaKoy6ti3ibyc2hjP7Z4+991p69TyHOveipb7l2UMpqaOru96ulTs1u5klqJXnckk9STzJPvKsY7Lmhdu0ox3y2vENZlVdGPLaoDdsLevcRH7oPU+kRv0AA3UiIiIoPfKPZj5XlFgwimlBjt8Dq+qaP6WXdsYPtDGk/nXD5OHDvLMsv2bVMW8Vup20NK4jl3svnPI9oY0D86nIiIiIi0p21cO+lmgt3lhi7yssrm3ODYbnaPcSD/63PPwCg12Z8w+g+tuOXqSXu6N1UKSsPh3M31bifYNw78qtQHREREReLm+LWPMsYrccyKhjrbdWR8Ekbuo9Tmnq1wPMEcwVWj2h9HL5pJlhoqnvKuy1TnOttx4dhK0eg7bk2RvLcePUciti9kDtCyYHWxYbl9U+TFqiTanqHkk26Rx6/8AaJ6j0T5w8QbAKeaKogjngkZLFI0PY9jg5rmkbggjqCPFc0REREREXyXqSths1bLboWzVrKeR1PG7o+QNJaD7CdgqhcquV4u+R3C55BPUT3WoqHvq3z78Zk384EHpseW3htt4LZ3Zd1asWk+V1FzvGKMu3lTBEK2KTappGel3bXeaeLx+yTttvtyNgumWp+Eai2/yrFL7T1j2t3lpXHgqIfxxnzh7+Y9RKzJEREXGaRkUL5ZXhjGNLnOJ2AA6lVNa05a/OdVMhyhzy6KurXup9z0gb5kQ+DGtVhfZCw76G6D2Gmmi7utuLDcqoEbHjm2LQfaIwwfBbcRERERdNdTQVlFPSVUbZYJ43Rysd0c1wIIPvBKqS1QxefC9Rb7i0/FxW2tkgY49XRg7sd8WFp+Ksw7OGYjOdF8cv0kokq3Ugp6z19/F9W8n3lvF7nBbDRERF0V1ZSUNJLWVtTDTU0LS+WaZ4YxjR1LnHkB71E3tSdovS28YnccJt1rGZSTgt8oDjFS00g34ZGSbcTntPMcA2PMcWxIMIfFWHfJ/12UVuij23wvfbKeufDZ5JSS8wgDjaN/Qa/cN/MOgCkSiIiIiIiKFXbu0R8mmm1TxilPcyuHz5Txt+w48hUgDwPIP9uzvFxUPF6NJNecfuNLX0slda61rWz008bnwyBpG7XscNjsR0I5FSU0d7YmT2Pubbn9F9IaFuzfLYeGOsYPWRyZL8eE+slTC0z1OwnUS3+V4pfaatc1oMtMTwVEP44z5w9/T1ErMURFqTtd5j9DdB7/VQy93W3GMW2k2Ox45t2uI9ojDz8FXlovib841Tx7F2tLo66tY2fYfZhb50p+DGuVssEccMLIomBkbGhrWgbAAcgFzRERERFA/5RfDjbdQbRmVPERBeaQ09Q4Dl38PIE++NzR+QrJfk3Mx83JMDqZenDdKNpd7o5gB/wDUf3qZaIi6K+spKCjlrK6phpaaFpfLNNIGMY0eLnHkB71G3WHtfYdjffW7CKf6UXJu7fKOIx0UZ/F9qT8oAP3lDvVLVrPNSasy5RfJp6UO4oqGH6qli9W0Y5E/3nbu9qweeKWGV0U0b45G8nNe0gj4FbP7Nekdx1YzuO3gSQWSiLZrrVtH6uPfkxp++/YgermfBWc2K1W+x2aks9ppIqOgo4Ww08EQ2bGxo2AC+1EREREREXTXUtPW0U9FWQRz008bopYpG8TXscCC0g9QQdtlWl2q9G6nSrOC6gjllxm5udJbZjue6PV0Dj95vgfFux6g7ZN2XcyxDJYYtItV7fSXKz1Ty2xVlR5slDM4/qWyjZzGvJ3GxADjsdw7lk2sXY3vls7656cXA3mkG7vm2sc2OqYOfJj+TJPjwn3qM0sWSYbkfBIy52G80L+h46eohd6/BwUj9He2Lk1k7m26gUX0goRs3y6ANjrGD1kcmSfHhPrJUwdNNTcJ1Et/leJ36mrnNaDLTE8FRD+ON3nD37bHwJWYIoN/KO5j5Zldhwmml3it1O6uqmjp3su7WA+0MaT+dfvycOHCsym/5vUxbx26nbQ0rj072Xznke0MaB+dTjREREREWmO2fh30u0FvJhi7yts/DdKfZu5+q37wfGNz/wBwUE+zbmP0G1qxy+ySllJ5UKasPh3Ev1byfdxB35QrUx0RdFfWUlBRy1ldVQUtNC0ulmmkDGMaPFzjyA96jZrB2v8ADsc763YRT/Se5N3b5TuY6KM/i+1J+UAH7yh3qlqznmpNYZcpvk09MHcUVDD9VSxerhjHIn+87d3tWUaPdnPUXUXua2K3/Mtlk2PzjcWljXt9cbPtSewgBv8AeW59ScR0x7NGFxVVHSxZNqDXsLbbUXJjXimI5OqGw/ZY1p+zvxOLthvsDtFnE7BkeomdU9ntrJrlebtUkufI4kuc4lz5JHeoc3OPvVn+iunFl0wwOkxm0MD3tHeVlUW7PqpyPOkP7tgPAABZsiIiIiIiIixfVPBrJqJhNfit+i4qaqbvHK0DjglG/BKz1Oaf3jcHkSqutUsGvunGcVuMXyPgqqV3FFMwEMqIiTwSsP3Tt8DuDzCnF2MNcBqBjgxLJatpyi1wjgkeedfTjkJPa9vIO9fJ3idtv6j6cYZqFbPIcssVLcA1pEUxHDPD7WSDzm+7fY+IKh7rH2Osis3fXLTyuN+ohu7yCoLY6tg9TXcmSf5T7Co1j6Q4jkP/AOysd5oZP79PUQOH7nNKklo72xclsvc23UGh+kFCNm+XU4bHVsHrcOTJP8p9ZKl9p3qfg2fWh9xxjIKSrZEzjqIXO7uaADqXxu85oHr229RKrI1my1+c6p5DlLnOdHXVr3Qb+jC3zYh8GNarDuyJhxw3QewUs0Xd1lwjNyqgRseObZzQfaGBg+C22iIiIiIuqsp4aqkmpqmNssMzDHIxw3DmkEEH3jdVJ6q4tNhWpF/xWYH/ANNrpIYyerot943fFhafirJOz1ntHlGg9hym518EDoKMQXGeeQMayWH6t7nucdhvwh3M+ktY6w9r/D8c763YPTfSe5N3b5SSY6KM+vi+1J+XYH7yh3qjqxnmpFYZcpvs9RTB3FFQxfV0sXq4Yxy3/vO3PtWS6PdnfUXUcxVlNbvmizP2PzlcGmNjm+uNm3FJ7wOH2hTN0d7M2neAdzXVFH9Ir1HsfLbhGHNjd644vss9hPE4etbB1Yzyx6b4PW5TfJPqKdvDDA0gSVMp34Ime07fAAk8gqu9SMxv2o2dVuSXl7p66ukDY4Y9y2Jm+zIox90DkB4nn1JU9ex7olHprifz7faYfSu6xA1AcNzRwnYiAe3oXn17D0dzvtERERERERERaj7T2jlDqxhLoYGQwZHb2uktdU7lufGF5+47Ye47H1g1xW2syTAM4jq4DU2i/WarPJw2fDKw7Frh4jqCOhBPgVZn2fNVbVqvgcN7pAynuMG0Nzog7c0823h4ljurT6tx1BWxlh2pmmOE6i27yTK7FT1r2t2iqmjgqIfwSDzh7uYPiCoc6x9j3KbB31ywKqOSW9u7vI5No6yMeodGy/DhPqaVG6Rt4x+6ywSCutdwg4opWHjhmj3BDmkcnDcEgg+tfFDJ3czJCxknC4HheN2u2PQ+xSGj7YurEcbY46TGGMaA1rW294AA6AfWLl+mRq3/AFfGf8A//kT9MjVv+r4z/gH/APIn6ZGrf9Xxn/AP/wCRP0yNW/6vjP8AgH/8ifpkat/1fGf8A/8A5E/TI1b/AKvjP+Af/wAifpkat/1fGf8AAP8A+RP0yNW/6vjP+Af/AMifpkat/wBXxn/AP/5E/TI1b/q+M/4B/wDyJ+mRq3/V8Z/wD/8AkWoNVs9vOpGXSZPfqeghuEsMcMho4TG14YNmuILj522w336ALwvnm7mxtsXzlWG1NnNQKPvndyJSAC/g324tmgb7eC2Xo92fNRNSDFV0Vt+a7M/Ym53AGOJzfXG3bik/KNvWQpm6O9mLTvAu5rq2l+kt6Zs7yu4Rgxxu9ccPNrfeeJw9a3gAANgF8t5udBZ7TVXW6VcVHQ0kTpp55XbNjY0blxPqAVZvad1ir9WM3dPA+aDHaBzo7XSu5eb4zPH337D3DYeBJ3P2FNDvK5oNUcqpD3ETt7HTSt+28cvKSD4Doz1nd3gCZrIiIiIiIiIiIii922dChllqm1BxWkJv9DF/19NE3nXQNH2gB1kYPi5o26gBRE0M1MvOlmeU2RWxzpaY7RV9HxbNqoCebT6nDq0+B9m4NoWDZTZczxWgyXH6ttVbq6ISRP6EeBa4eDmncEeBC9pFgOsGkmG6m2Sekv8AaoPL+6LKW5RsDaindt5pDxzLQefCdwfUqustsNwxjJ7lj12iMVdbql9PO3w4mkjcesHqD4ghSn0T7MOnOpOm1qyykyvIYpKmPgqoGiE9xO3lIzmzfbfmN/AgrM/0I8G/tbkf8MH+xP0I8G/tbkf8MH+xP0I8G/tbkf8ADB/sT9CPBv7W5H/DB/sT9CPBv7W5H/DB/sT9CPBv7W5H/DB/sT9CPBv7W5H/AAwf7E/Qjwb+1uR/wwf7E/Qjwb+1uR/wwf7E/Qjwb+1uR/wwf7F+O7EuCtaScuyMAdSWwcv8ihdn1HYLfmd1oMXrKmts9NUuhpKmoLeOZreXH5oA2JBI5dCFMfsT6E499CKXUDMLLBcblcHma2xVbOOOngHJsnAeRc4guBIOw4dttypZtaGgBoAA5BfqKBPbZ11OWXWbT7FasOsFDL/19TE7lXTtP2QR1jYfg53PoAVhXZM0VqNU8w8tukckeLWuRrq+TmPKH9RTtPrPVxHRvtIVk1HTQUdJFSUsMcFPCxscUcbQ1rGtGwaAOgAAGy7URERERERERERFA/tuaFHGbnPqLilGG2Osl3udNE3lRzOP6wAdI3k+5rj6iNsN7I2t8+mGU/M96ne/E7pKBVNO58kl6Cdo9XQOA6jn1aN7HqWeGqpo6mmljmhlYHxyRuDmvaRuCCORBHPddiKEvyiOm/kt1t+pVtg+qrOGhunCOkrQe6kP4mgtJ/uN9a8L5PrUf5hzuqwO4z8NBfvrKTiPJlWwdPZxsBHva1T3REREREWje2nqR9A9Iqmhoaju7zf+KhpeE7OZGR9dIPc08IPgXhQT0HwKo1J1StGLRB4pppe9rpG/sqZnOR3sO3mj2uCtYt9JT0NDBRUkLIKanjbFDEwbNYxo2a0ewAALuRRW7bmu4xu2z6c4nWkXurj2udVE7nRwuH6tpHSR4PP7rT6yNoiaNadXzU7OaTGrLGW8Z7yrqnN3ZSwAjikd+/YDxJAVomneH2TBcPoMYx+lEFDRx8I3+3I483SPPi5x5k//ANbLIEREREREREREREXzXW30V1tlTbbjTRVVHVROhnhlbxMkY4bFpHiCFWl2pNGazSfMz5GyafGbi5z7bUu5lniYHn77fA+k3Y9d9tudhzXcW+am0xy6s2pJXcFkq5Xconk/zdxPok/YPgfN6EbTaHNFjmpuI2/OsCvGKXMDye40zog/bcxP6skHta4Nd8FVNcaS94Rm81JN3lDerJXcPE3kY5on8nD4tBB8RsrS9Fs4pNRNNLPldLwNfVwgVMTT+pnb5sjPg4Hb2EFZiiIiIiE7Ak+CrE7Weo51G1fr6qjn7yz2zegtux81zGE8Ug/G/c7+rh9SlD8n/pv9HNPZ84uMHDcch2FNxDnHRsPm+7jdu72gMUmkWmO1TrVSaUYj3FvfFPlFyY5tvgdsRC3mDO8fdb4D0ncugO1dNqocgzjMYqKkZU3a+XeqO254pJpXkkucT8SSeQG5PJWYdnTSS1aTYOy1wGOpu9WGy3StA/XS7fZb4iNu5DR7z1JWzURERERERERERERFjWpmFWTUDDK/F7/T97SVbPNeAOOGQfZkYfBzTzHxB5Eqr3VzT+/aZZzV41e2bSwnvKapYCGVMJJ4JWew7dPAgjwU1exjrv8ATyzswzKKofSe3xfUTSO53CBo+17ZGj7XrHnfe2kkig98ofpv5Bf7fqRbafanuPDR3PhbybO1p7t5/EwFvvYPWvh+T21I+ZsyrNPrjPw0V6+voeI8mVTG82j8bB+9jfWp3oiIiItI9s3Uj6A6Q1VNRVHd3m+8VBR8J85jCPrZB+Fh2B8HPaoG6F4HU6kaoWjFYQ9tPPL3lbK39lTM5yO9+3Ie1wVrNto6a32+noKKFkFLTRNhhiYNmsY0bNaPYAAF3rB9bNSrHpdg9TkV4eJJf1dFSNds+qmI81jfUPEu8BufUDWDneVZBqBmdZkN7nkrLnXyjZrASGjoyONvg0DYAf6kqePY70Kj05x8ZNkdKw5ZcYhxMcNzQQnn3Q/vnlxn8o6HeQqIiIiIiIiIiIiIiItXdpHSG16s4Q+geI6a+UYdLa60j9XJtzY49e7dsAfVyPhzrVkZkmBZq5jvKrNf7NV+HmyQSsPUeB/0IPiCrIezJrJbtWcME0roqbIqBrWXOjadufQSsH3Hf5TuD4E7aWMaq4bQZ9p9eMTuIaIrhTlkchG/dSjnHIPa1wafgqqZo75g+bujd3lBe7JX7bjrFPE/r+9vxCtR0gzWi1B05s+WUXC0V1ODNEDv3MzfNkZ8HAj3bHxWWIiIiHoqyO11qR/KLq/XTUU/eWa070Fu2Pmva0njkH437nf7ob6lJn5PzTf6P4DU53cYOG4X/wAyl4hzjpGHkfZxuBd7Q1qk8vGzbJ7Lh2L12SZBWNpLdQxGSWQ9T6mtHi4nYAeJIVYevmql41Xzma+V/HT0EO8VtoeLdtNDv/5e7q53ifYABJHsQaCOpW0up+Y0e0zgJLJRSt+wD0qXg+J9AeA877u0xEREREREREREREREREUcu2XoSNQLG7LsYpW/Sm3Q/WRMHO4QN38z2yNH2T4jzfVtBvTXNL/p3mtHktimMFbSPLXxv34JmE+fFIPFp22I8DsRsQFZ/o5qLYdTcJpclsUuwf8AV1VM5wMlLMB50bvd1B8QQVmSgx8oZpv815RQ6i22Dalu21LceFvJtSxvmPP42Db3x+1fnyeWpHzXlFdpzcqjaku29VbuJ3JtSxvnsH42Df3x+1ToRERFpXtkakfyf6QVkdFP3d5vfFQUOx85gcPrZR+Fh2B8HOaoDaI4LVajam2fFKfjbFUzcVXK39lTt86R/wDCNh7SArWrXQ0tsttNbqGBlPSUsLIYImDYMY0cLWj2AABcrhWUtvoJ66tqIqalp43SzTSuDWRsaNy4k9AAN91W/wBq/XGq1Tyb5ttMksGKW2U+RxHdpqn8wZ3j28w0H7IPrJWTdjPQQ5xdI83yulP0Zopf+lp5G8rhM09NvGJp6/ePm/eVgDGtY0NaAGgbAAdF+oiIiIiIiIiIiIiIiIihX24dBhTPqtUMQpPqXkyXyjib9gnrUtA8D6Y8D53i7bQfZ81ZvGk2bMu9GH1NsqOGK50PFsKiLfqPAPbzLT7x0JVnGF5LZsvxihyOwVrKy3VsQkhkb/5aR4OB5EHmCCF5er2FUWoOnN5xOu4WiugIhlI37mZvnRv+DgD7twqroZL5g+btkb3lBe7JX77HkYp4n9P3t+IVqulOZUGfae2fLLcWiK4U4e+MHfupRykjPta4OHwWUIiIqzO2BqR/KHrBWmin7yzWfegt+x814a495KPxP32P3Q1SQ+T503+YsHqs+uMHDX336qj4hzZSMd19nG8b+5jT4qUZOw3UDO2lr67Kq6o0+w+s3sFNJw3GridyrpWn7DSOsTSPzOG/QDfX/Za0UrdWMsM1c2anxe3vabjUt5GU9RBGfvuHU+iOfUgGyizW2gs9qpbXa6SGkoqSJsMEETeFkbGjYNA9QC+tERERERERERERERERERcJ4op4XwzRskjkaWvY9u7XA8iCD1BCru7YOhUunGQOyXHKV7sTuMvmtaCfIJjue6P9w+gfynmBv5fZR1zq9K8k+bbtJLUYncZR5ZEN3GleeXfsHrHLiA+0PaArILbW0lyt9PX0FTFU0lTG2WGaJwcyRjhuHAjqCFBj5QjTf5mzKj1Bt0HDRXraCu4RyZVMbycfxsH72O9a+75O/UjyC/3DTe5VG1Pcd6y2cTuTZ2t+sYPxMAd72H1qcKIi0z2wtSP5PdH63yKfu7zed6Cg2PnM4ge8lH4Wb7H7zmqv7RfB6zUTUqz4pScTWVcwNTK0fqYG+dI/4NB29pA8Va7Z7fR2m00tst8DKejpIWQQRNHJjGjha0e4AKJ3bZ1+NsiqtNMMrdq6RpjvNbC7nA09adhHpkfaPojzepO0YNC9ML3qrnENgtYdDSs2luFaWbspYd+bj63Ho1vifYCRZ7gGJWPCMUocax2jbS0FHHwsHVz3ek959JzjzJXuoiIiIiIiIiIiIiIiIiIi8/JbJa8jsNbYr1RxVturYjDUQSDcPaf9D4gjmCAQqy+0jo7dtJcydSuEtVYa1zn2uuI+20dY37chI3lv6xsR12Gyexpr+7DK+HBMvqz9G6qTaiqpHcrfK49CfCJxPP7pO/QlTJ1mwii1G0yu+LVBYHVkHFSzHmIp2+dE/wBwcBv6wT61Vrbau94Rm0NXCJKG82WuDuF3IxzRP5tPxBBHq3VrOmOXW/OsCtGV2wjye40zZSzfcxP6PjPta4Ob8FkaJ4Ks/ti6kfyg6wVjKKfvLNZOKgoOE+a8tP1so/E/fY+LWtUiPk99N/mXDazUG4wcNbevqKHiHNlKx3Nw/G8fuY31r3+2Fr1Hp3Zn4pjFUx2WV0XnSNO/zfE4frD/AO4R9keH2j4bwUwPFMh1CzSlx+yQSVtzr5SXPeSQwb7vlkd4NHMk/wCpKs60R0zsWluEU+PWdglmO0ldWObtJVTbc3n1AdGt8B7dyc6RERERERERERERERERERERYxqfg9i1Cw2txjIafvaWpbuyRu3eQSDfhlYfBw3+PMHkSqw9ZNN8g0wzSox2+RcQH1lJVsaRHVQkkNkb/oR4Hce+S/Yq7QfKj0zzas5cobLXzO+Apnk/uYT+H7qxP5QPTj5hzulzy3QcNvv31dXwjkyrYOZ9nGwA+9rl73ydupHkt1uOmtyn+qq+KutfEekrR9bGPe0B4H9x3rU2kWne17qR/J5pBXS0U/d3m7b0Fv2PnMc4HvJR+Bm53+8WqvfR7Ca3UPUez4nRcTfLZx38oG/cwt86R/waD7zsPFT87Q2rNi0O08o7LY4ad16fStp7Pb+rYY2DhEsg+43bkPSI29ZFd4+kecZh/wDl3q/Xeq/HLUTPP/8AvYB6gFY/2X9F7fpNiH/UiGpyW4Ma65VbRuG+IhjP3G+v0jzPgBt9ERERERERERERERERERERERYDrrpbYtVcKlsV1aIauPeS31zW7vpZduo9bTyDm+I9oBFY+oOH3/AsvrMbyGkdS19I/qN+CRvoyMd6TT1B/wBCCFJ7SfUaj110kuGjGcVkbMp8m3sdwnd/O5YxxR8R/pW7bH77CfHfeLdgud5wjN6W50wfR3ezVwfwP5Fksb9nMcPVuC0j1bq13TrKbdmuEWnKbW7eluVM2Zrd9zG48nMPta4Fp9oXvqtTtl6kfT/V+qp6GfvLNY+KgouE7te4H62UfieNgfFrWrPOzjW2PRHR246u5HC2a+X/AIqLHqAnaSeJh853rawvALneDWDbm4Ax2zTJsiz7Mam+3qoluN2uEwGzGk9TsyONo6NHJrWj/VTw7H2gsenVnblWTUzH5ZXRbBjgD83xOH6sf+4R9p3h9kctyZEIiIiIiIiIiIiIiIiIiIiIiIi1Z2jdGrNq1iZppe7o79Rtc623Dh5sd/Rv25mN3iPA8x6jWvktjyHBcvntN1gqbVebZON9nFr43tO7XscPDo5rh15ELs1AyibMMifkFbSxQXKpiZ5fJFybUztHC6bh22a54ALgOXFxEbb7CUvydmpHd1Vy00uU/my8VfauI+kAO+jHvGzwPY9b07W2pH8nWkFfU0c/d3m6b0Fu2PnNe8HjkH4Gbnf18PrVZVMYfKozVCR0HGO8DCA4t357E8t9t1kOoeY3LM74ysqmtp6OlgZR22hiJ7qipmDaOJg9g6nq4kk9VMbsZdnv6NwU2oOa0X/rcrQ+2UMzf5k0jlK8H9qR0HoA/ePmysRERERERERERERERERERERERERae7TWh9p1ZxzvoO5ocmooz5BXEcnjme5l25lhPQ9Wk7jxBrbyiwXfGb/WWK+0M1BcaOQxzwSjYtP+hBHMEciCCF24TkdxxLLbZktpk7utttSyoiPgS082n2Ebg+wlbK7V2rceq2e09Zbe+jsdvpGRUUUg2Ie4B0riPXxeb7mBadHNTR7GvZzMBo9Rc9odpfNmtFsmZ9jxbUStPj4saen2jz22mOOSIiIiIiIiIiIiIiIiIiIiIiIiIi032mNC7PqzYfKafuaDJ6OMiiri3lIOZ7mXbmWE9D1aTuOW4NcGW47ecVyGssF/oJqC40cnBNDKOYPgQehBHMEciOYXlAbqZXY97NvGaPUHUGg8zzZrVap2fa8WzzNPh4tYfefAGZw5IiIiIiIiIiIiIiIiIiIiIiIiIiIi1V2htEcd1bsQbUltuv1KwihubI93NHXu5B6cZPh1B5jxB1V2fOyVT4nkTci1ArLfeqqlk4qGhpg51O1wPKSQvaC8jwbtsOp38JVDkiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiL//Z" x="18" y="85" width="26" height="26" preserveAspectRatio="xMidYMid meet"/>
    </svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  async function insertDiceRollImageToJournal(){
    const editor = document.getElementById('journalCommentEditor');
    if(!editor) return;
    const src = diceRollSvgDataUrl();
    const html = `<p><img src="${src}" alt="Starforged dice roll result" width="235" height="127" style="width:235px;height:127px;max-width:100%;border-radius:8px;"></p>`;
    if(editor.innerHTML.trim() && editor.innerHTML.trim() !== '<br>') editor.insertAdjacentHTML('beforeend', html);
    else editor.innerHTML = html;
    if(typeof showCenterTab === 'function') showCenterTab('journal');
    editor.focus();
    try {
      if(navigator.clipboard && window.ClipboardItem){
        const blob = await (await fetch(src)).blob();
        await navigator.clipboard.write([new ClipboardItem({[blob.type]: blob})]);
      }
    } catch(e) { /* Clipboard image copy is optional; insertion above is the main behavior. */ }
    if(typeof setStatus === 'function') setStatus('Dice result image added to Journal comment');
  }
  function bindDiceImageButtons(){
    const toastBtn = document.getElementById('sfToastImageToJournal');
    if(toastBtn && !toastBtn.dataset.bound){toastBtn.dataset.bound='1';toastBtn.addEventListener('click',insertDiceRollImageToJournal);}
    const footer = document.querySelector('.sf-roll-footer');
    if(footer && !document.getElementById('sfRollImageToJournal')){
      const btn=document.createElement('button');
      btn.id='sfRollImageToJournal';
      btn.type='button';
      btn.className='secondary compact-button';
      btn.title='Add dice card image to Journal comment';
      btn.textContent='🖼 Add image';
      btn.addEventListener('click',insertDiceRollImageToJournal);
      footer.appendChild(btn);
    }
  }
  function initIconAndDicePatch(){
    decorateActionIcons();
    bindDiceImageButtons();
    const mo = new MutationObserver(muts=>{
      for(const m of muts){
        m.addedNodes.forEach(n=>{ if(n.nodeType===1) decorateActionIcons(n); });
      }
    });
    mo.observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initIconAndDicePatch); else initIconAndDicePatch();
})();


/* 2026-06 entity default/no-collapse navigation patch */
(function(){
  function $(id){return document.getElementById(id)}
  function setActiveLeftButtons(tab){document.querySelectorAll('[data-left-tab]').forEach(btn=>btn.classList.toggle('active',btn.dataset.leftTab===tab));}
  window.showLeftTab = function(tab, save){
    if(save === undefined) save = true;
    var allowed = ['entityList','scene','crew','living','entity','roller'];
    if(allowed.indexOf(tab) < 0) tab = 'entityList';
    if(window.state) window.state.activeLeftTab = tab;
    var map = {scene:'controlsPanel', crew:'crewLinkPanel', living:'livingShipPanel', entity:'entityTrackerPanel', entityList:'entityListPanel', roller:'diceRollerPanel'};
    Object.keys(map).forEach(function(k){var p=$(map[k]); if(p) p.classList.toggle('active-left-view', k===tab);});
    setActiveLeftButtons(tab);
    document.body.classList.remove('left-crew-expanded');
    if(save && typeof saveState === 'function') saveState();
    if(tab === 'entityList' && typeof renderEntityListPanelDirectory === 'function') renderEntityListPanelDirectory();
    if(tab === 'entity' && typeof renderEntityDirectoryOnly === 'function') renderEntityDirectoryOnly();
  };
  function activateEntityTracker(){ window.showLeftTab('entity'); }
  function activateEntityList(){ window.showLeftTab('entityList'); }
  function activateBuilder(){ window.showLeftTab('scene'); }
  function activateCrew(){ window.showLeftTab('crew'); }
  function activateShip(){ window.showLeftTab('living'); }
  function activateOracles(){ 
    try{
      if(typeof showRightTabPublic==='function') showRightTabPublic('oracles');
      var op=document.getElementById('oraclePanel');
      if(op){ op.classList.add('is-open'); document.body.classList.add('side-panel-open'); }
    }catch(e){}
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function activateSceneElements(){ if(typeof showCenterTab==='function') showCenterTab('output'); window.scrollTo({top:0,behavior:'smooth'}); }
  function activateJournal(){ if(typeof showCenterTab==='function') showCenterTab('journal'); window.scrollTo({top:0,behavior:'smooth'}); }
  function rebindTopNav(){
    var pairs=[['openEntityListPanel',activateEntityList],['openControlsPanel',activateBuilder],['openCrewLinkPanel',activateCrew],['openLivingShipPanel',activateShip],['openEntityTrackerPanel',activateEntityTracker],['showSceneElementsNav',activateSceneElements],['focusOutputPanel',activateSceneElements],['showJournalNav',activateJournal],['openOraclePanel',activateOracles],['openDocumentsPanel',function(){ try{ if(typeof showRightTabPublic==='function') showRightTabPublic('documents'); var op=document.getElementById('oraclePanel'); if(op){ op.classList.add('is-open'); document.body.classList.add('side-panel-open'); } }catch(e){} }]];
    pairs.forEach(function(pair){var el=$(pair[0]); if(el && !el.dataset.navRebound){el.dataset.navRebound='1'; el.addEventListener('click',function(ev){ev.preventDefault(); pair[1]();});}});
  }
  function openEntityFromList(e){
    var btn=e.target.closest && e.target.closest('.entity-dir-item');
    if(!btn) return;
    setTimeout(function(){window.showLeftTab('entity');},0);
  }
  function initEntityDefaultPatch(){
    rebindTopNav();
    var list=$('entityListDirectory'); if(list && !list.dataset.editorOpenBound){list.dataset.editorOpenBound='1'; list.addEventListener('click',openEntityFromList,true);}
    var show=$('entityListShowEditor'); if(show && !show.dataset.editorOpenBound){show.dataset.editorOpenBound='1'; show.addEventListener('click',activateEntityTracker);}
    window.showLeftTab((window.state && window.state.activeLeftTab) || 'entityList', false);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', initEntityDefaultPatch); else initEntityDefaultPatch();
})();


/* 2026-06 entity directory default + editor overlay behavior */
(function(){
  function $(id){return document.getElementById(id)}
  function closeEntityEditorOverlay(){
    document.body.classList.remove('entity-editor-overlay-open');
    var tracker=$('entityTrackerPanel');
    if(tracker){tracker.classList.remove('entity-editor-overlay'); tracker.classList.remove('active-left-view');}
    var list=$('entityListPanel');
    if(list) list.classList.add('active-left-view');
  }
  function openEntityEditorOverlay(id){
    var list=$('entityListPanel'), tracker=$('entityTrackerPanel');
    if(id && typeof setActiveEntity==='function'){
      try{ setActiveEntity(id,true); }catch(e){}
    }
    if(typeof renderEntityTracker==='function'){
      try{ renderEntityTracker(); }catch(e){}
    }
    document.querySelectorAll('.left-view').forEach(function(p){p.classList.remove('active-left-view')});
    if(list) list.classList.add('active-left-view');
    if(tracker){ tracker.classList.add('active-left-view','entity-editor-overlay'); }
    document.body.classList.add('entity-editor-overlay-open');
    document.body.classList.remove('left-crew-expanded');
    if(window.state){ window.state.activeLeftTab='entityList'; }
    if(typeof saveState==='function') { try{ saveState(); }catch(e){} }
  }
  window.closeEntityEditorOverlay = closeEntityEditorOverlay;
  window.openEntityEditorOverlay = openEntityEditorOverlay;

  var previousShowLeft = window.showLeftTab;
  window.showLeftTab = function(tab, save){
    if(tab === 'entity'){
      openEntityEditorOverlay();
      return;
    }
    closeEntityEditorOverlay();
    if(previousShowLeft) return previousShowLeft.call(window, tab || 'entityList', save);
  };

  function bindEntityDirectoryOverlay(){
    var list=$('entityListDirectory');
    if(list && !list.dataset.overlayOpenBound){
      list.dataset.overlayOpenBound='1';
      list.addEventListener('click', function(ev){
        var btn=ev.target.closest && ev.target.closest('.entity-dir-item');
        if(!btn) return;
        ev.preventDefault();
        ev.stopPropagation();
        if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
        openEntityEditorOverlay(btn.dataset.entityId);
      }, true);
    }
    var trackerBtn=$('openEntityTrackerPanel');
    if(trackerBtn && !trackerBtn.dataset.overlayOpenBound){
      trackerBtn.dataset.overlayOpenBound='1';
      trackerBtn.addEventListener('click', function(ev){ev.preventDefault(); openEntityEditorOverlay();}, true);
    }
    var entityBtn=$('openEntityListPanel');
    if(entityBtn && !entityBtn.dataset.directoryDefaultBound){
      entityBtn.dataset.directoryDefaultBound='1';
      entityBtn.addEventListener('click', function(ev){ev.preventDefault(); closeEntityEditorOverlay(); if(previousShowLeft) previousShowLeft.call(window,'entityList',true);}, true);
    }
    var show=$('entityListShowEditor');
    if(show && !show.dataset.overlayOpenBound){
      show.dataset.overlayOpenBound='1';
      show.addEventListener('click', function(ev){ev.preventDefault(); openEntityEditorOverlay();}, true);
      show.textContent='Show Editor';
      show.title='Open Entity Editor';
    }
    var tracker=$('entityTrackerPanel');
    if(tracker && !tracker.dataset.overlayCloseBound){
      tracker.dataset.overlayCloseBound='1';
      tracker.addEventListener('click', function(ev){
        var close=ev.target.closest && ev.target.closest('[data-close-panel]');
        if(close){ev.preventDefault(); closeEntityEditorOverlay();}
      }, true);
    }
    document.querySelectorAll('button[data-left-tab="entityList"]').forEach(function(b){b.hidden=true;});
  }
  function init(){
    bindEntityDirectoryOverlay();
    closeEntityEditorOverlay();
    if(previousShowLeft) previousShowLeft.call(window,'entityList',false);
    setTimeout(bindEntityDirectoryOverlay, 250);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
  // MutationObserver disabled: repeated DOM edits here could lock the page.
  setTimeout(bindEntityDirectoryOverlay, 500);
})();


/* 2026-06 entity editor as workspace replacement rather than overlay */
(function(){
  function $(id){return document.getElementById(id)}
  function setWorkspace(open){
    document.body.classList.toggle('entity-editor-workspace-open', !!open);
    document.body.classList.toggle('entity-editor-overlay-open', !!open);
  }
  var oldOpen = window.openEntityEditorOverlay;
  var oldClose = window.closeEntityEditorOverlay;
  window.openEntityEditorOverlay = function(id){
    if(id && typeof setActiveEntity === 'function') { try{ setActiveEntity(id,true); }catch(e){} }
    if(typeof renderEntityTracker === 'function') { try{ renderEntityTracker(); }catch(e){} }
    document.querySelectorAll('.left-view').forEach(function(p){p.classList.remove('active-left-view')});
    var list=$('entityListPanel'), tracker=$('entityTrackerPanel');
    if(list) list.classList.add('active-left-view');
    if(tracker) tracker.classList.add('active-left-view','entity-editor-overlay');
    setWorkspace(true);
    document.body.classList.remove('left-crew-expanded');
    if(window.state) window.state.activeLeftTab='entityList';
    if(typeof saveState === 'function') { try{ saveState(); }catch(e){} }
  };
  window.closeEntityEditorOverlay = function(){
    setWorkspace(false);
    var tracker=$('entityTrackerPanel');
    if(tracker){tracker.classList.remove('entity-editor-overlay'); tracker.classList.remove('active-left-view');}
    var list=$('entityListPanel');
    if(list) list.classList.add('active-left-view');
    if(window.state) window.state.activeLeftTab='entityList';
  };
  function bind(){
    document.querySelectorAll('.left-tabs').forEach(function(x){x.setAttribute('aria-hidden','true')});
    var list=$('entityListDirectory');
    if(list && !list.dataset.workspaceOpenBound){
      list.dataset.workspaceOpenBound='1';
      list.addEventListener('click', function(ev){
        var btn=ev.target.closest && ev.target.closest('.entity-dir-item');
        if(!btn) return;
        ev.preventDefault();
        ev.stopPropagation();
        if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
        window.openEntityEditorOverlay(btn.dataset.entityId);
      }, true);
    }
    var trackerBtn=$('openEntityTrackerPanel');
    if(trackerBtn && !trackerBtn.dataset.workspaceOpenBound){
      trackerBtn.dataset.workspaceOpenBound='1';
      trackerBtn.addEventListener('click', function(ev){ev.preventDefault(); window.openEntityEditorOverlay();}, true);
    }
    var listBtn=$('openEntityListPanel');
    if(listBtn && !listBtn.dataset.workspaceListBound){
      listBtn.dataset.workspaceListBound='1';
      listBtn.addEventListener('click', function(ev){ev.preventDefault(); window.closeEntityEditorOverlay(); if(typeof showLeftTab==='function') showLeftTab('entityList', true);}, true);
    }
    var closeBtns=document.querySelectorAll('#entityTrackerPanel [data-close-panel]');
    closeBtns.forEach(function(btn){ if(!btn.dataset.workspaceCloseBound){btn.dataset.workspaceCloseBound='1'; btn.addEventListener('click', function(ev){ev.preventDefault(); window.closeEntityEditorOverlay();}, true);}});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', bind); else bind();
  // MutationObserver disabled: binding runs at startup and after render via timeout.
  setTimeout(bind, 500);
})();


/* 2026-06 Crew Link workspace + remove separate Entity Tracker navigation */
(function(){
  function $(id){return document.getElementById(id)}
  function clearCrewWorkspace(){document.body.classList.remove('crew-workspace-open');}
  function openCrewWorkspace(){
    document.body.classList.remove('entity-editor-workspace-open','entity-editor-overlay-open','left-crew-expanded');
    document.body.classList.add('crew-workspace-open');
    document.querySelectorAll('.left-view').forEach(function(p){p.classList.remove('active-left-view')});
    var crew=$('crewLinkPanel'); if(crew) crew.classList.add('active-left-view');
    if(window.state){window.state.activeLeftTab='crew'; try{saveState();}catch(e){}}
  }
  function bindCrew(){
    var crewBtn=$('openCrewLinkPanel');
    if(crewBtn && !crewBtn.dataset.crewWorkspaceBound){
      crewBtn.dataset.crewWorkspaceBound='1';
      crewBtn.addEventListener('click', function(ev){ev.preventDefault(); if(ev.stopImmediatePropagation)ev.stopImmediatePropagation(); openCrewWorkspace();}, true);
    }
    document.querySelectorAll('[data-left-tab="crew"]').forEach(function(btn){
      if(!btn.dataset.crewWorkspaceBound){
        btn.dataset.crewWorkspaceBound='1';
        btn.addEventListener('click', function(ev){ev.preventDefault(); if(ev.stopImmediatePropagation)ev.stopImmediatePropagation(); openCrewWorkspace();}, true);
      }
    });
    ['openEntityListPanel','openControlsPanel','showSceneElementsNav','focusOutputPanel','showJournalNav','openOraclePanel','openLivingShipPanel'].forEach(function(id){
      var b=$(id); if(b && !b.dataset.clearCrewWorkspace){b.dataset.clearCrewWorkspace='1'; b.addEventListener('click', clearCrewWorkspace, true);}
    });
    document.querySelectorAll('#crewLinkPanel [data-close-panel]').forEach(function(b){
      if(!b.dataset.crewCloseBound){b.dataset.crewCloseBound='1'; b.addEventListener('click', function(ev){ev.preventDefault(); clearCrewWorkspace(); if(typeof showLeftTab==='function') showLeftTab('entityList', true);}, true);}
    });
    var tracker=$('openEntityTrackerPanel'); if(tracker) tracker.remove();
    var show=$('entityListShowEditor'); if(show) show.remove();
    document.querySelectorAll('button[data-left-tab="entity"]').forEach(function(b){b.remove();});
    document.querySelectorAll('.entity-list-panel h2, #entityListPanel h2').forEach(function(h){var next=h.innerHTML.replace(/Entity Directory/g,'Entity Library').replace(/Entity List/g,'Entity Library'); if(next!==h.innerHTML) h.innerHTML=next;});
  }
  var oldOpen=window.openEntityEditorOverlay;
  window.openEntityEditorOverlay=function(id){
    clearCrewWorkspace();
    if(oldOpen) return oldOpen.apply(this, arguments);
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', bindCrew); else bindCrew();
  // MutationObserver disabled: repeated heading edits could lock the page.
  setTimeout(bindCrew, 500);
})();


// Keep sticky header/nav offsets accurate and avoid browser scroll jumping after view swaps.
(function(){
  function updateStickyOffsets(){
    var header=document.querySelector('.app-header');
    var nav=document.querySelector('.mobile-panel-tabs');
    if(header) document.documentElement.style.setProperty('--sticky-header-height', header.offsetHeight+'px');
    if(nav) document.documentElement.style.setProperty('--sticky-nav-height', nav.offsetHeight+'px');
  }
  window.addEventListener('load', updateStickyOffsets);
  window.addEventListener('resize', updateStickyOffsets);
  document.addEventListener('click', function(evt){
    if(evt.target.closest('.mobile-panel-tabs button, .center-tabs button, [data-left-tab]')){
      setTimeout(function(){ window.scrollTo({top:0,behavior:'auto'}); updateStickyOffsets(); }, 0);
    }
  }, true);
})();

/* 2026-06 fix: top navigation must exit Entity Editor workspace directly.
   Previously Journal only worked after another section cleared the entity workspace classes. */
(function(){
  function $(id){return document.getElementById(id)}
  function clearEntityWorkspaceState(){
    document.body.classList.remove('entity-editor-workspace-open','entity-editor-overlay-open','crew-workspace-open','left-crew-expanded');
    var tracker=$('entityTrackerPanel');
    if(tracker){tracker.classList.remove('entity-editor-overlay','active-left-view');}
    var list=$('entityListPanel');
    if(list) list.classList.add('active-left-view');
    if(window.state) window.state.activeLeftTab='entityList';
  }
  function activateCenter(tab){
    clearEntityWorkspaceState();
    if(typeof window.showCenterTab==='function') window.showCenterTab(tab, true);
    else if(typeof showCenterTab==='function') showCenterTab(tab, true);
    setTimeout(function(){window.scrollTo({top:0,left:0,behavior:'auto'});},0);
  }
  function activateOracles(){
    clearEntityWorkspaceState();
    var oracle=$('oraclePanel');
    if(oracle) oracle.scrollTop=0;
    setTimeout(function(){window.scrollTo({top:0,left:0,behavior:'auto'});},0);
  }
  function bindWorkspaceExitNav(){
    var journal=$('showJournalNav');
    if(journal && !journal.dataset.entityWorkspaceExitFix){
      journal.dataset.entityWorkspaceExitFix='1';
      journal.addEventListener('click', function(ev){ev.preventDefault(); if(ev.stopImmediatePropagation)ev.stopImmediatePropagation(); activateCenter('journal');}, true);
    }
    var elements=$('showSceneElementsNav') || $('focusOutputPanel');
    ['showSceneElementsNav','focusOutputPanel'].forEach(function(id){
      var btn=$(id);
      if(btn && !btn.dataset.entityWorkspaceExitFix){
        btn.dataset.entityWorkspaceExitFix='1';
        btn.addEventListener('click', function(ev){ev.preventDefault(); if(ev.stopImmediatePropagation)ev.stopImmediatePropagation(); activateCenter('output');}, true);
      }
    });
    var oracle=$('openOraclePanel');
    if(oracle && !oracle.dataset.entityWorkspaceExitFix){
      oracle.dataset.entityWorkspaceExitFix='1';
      oracle.addEventListener('click', function(ev){clearEntityWorkspaceState(); activateOracles();}, true);
    }
    ['openControlsPanel','openLivingShipPanel','openCrewLinkPanel','openEntityListPanel'].forEach(function(id){
      var btn=$(id);
      if(btn && !btn.dataset.entityWorkspaceClearFix){
        btn.dataset.entityWorkspaceClearFix='1';
        btn.addEventListener('click', clearEntityWorkspaceState, true);
      }
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', bindWorkspaceExitNav); else bindWorkspaceExitNav();
  setTimeout(bindWorkspaceExitNav,500);
})();


/* 2026-06-23: Native Journal/Entities JSON import/export.
   This code lives in app.js so it updates the real closure-scoped `state` object.
   Earlier HTML-level patch could show success while changing only window.state/localStorage. */
(function(){
  function jsonStamp(){return new Date().toISOString().replace(/[:.]/g,'-').slice(0,19)}
  function downloadJsonFile(name,payload){
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url; a.download=name; document.body.appendChild(a); a.click();
    setTimeout(()=>{URL.revokeObjectURL(url);a.remove();},0);
  }
  function readJsonInput(input,cb){
    const file=input.files&&input.files[0];
    if(!file)return;
    const reader=new FileReader();
    reader.onload=()=>{
      try{cb(JSON.parse(String(reader.result||'{}')))}
      catch(e){alert('Import failed: that file is not valid JSON.'); console.error(e);}
      input.value='';
    };
    reader.onerror=()=>{alert('Import failed: could not read file.'); input.value='';};
    reader.readAsText(file);
  }
  function normalizeImportedEntities(data){
    let entities=data && (data.entities || data.entityRecords || data);
    if(Array.isArray(entities)) entities={items:entities,activeId:entities[0]?.id||null,history:[]};
    if(!entities || typeof entities!=='object') return null;
    if(!Array.isArray(entities.items)){
      if(Array.isArray(entities.entities)) entities.items=entities.entities;
      else {
        const vals=Object.values(entities).filter(v=>v&&typeof v==='object'&&('name' in v || 'type' in v));
        entities={items:vals,activeId:vals[0]?.id||null,history:[]};
      }
    }
    entities.items=(entities.items||[]).map((e,i)=>{
      const ent={...e};
      ent.id=String(ent.id||('ent_import_'+Date.now().toString(36)+'_'+i));
      ent.type=String(ent.type||'asset').toLowerCase();
      if(ent.type==='person'||ent.type==='character') ent.type='npc';
      if(!['npc','location','faction','asset'].includes(ent.type)) ent.type='asset';
      ent.name=ent.name||('Imported '+ent.type);
      if(!Array.isArray(ent.relationships)) ent.relationships=[];
      ent.relationships=ent.relationships.map(r=>{
        if(typeof r==='string') return {id:r,description:''};
        return {id:String(r.id||r.targetId||r.entityId||''),description:r.description||r.note||r.relationshipDescription||''};
      }).filter(r=>r.id);
      if(!Array.isArray(ent.tags)) ent.tags=[];
      ent.links=ent.links||'';
      ent.overview=ent.overview||'';
      ent.revealed=ent.revealed||'';
      ent.relationshipDescription=ent.relationshipDescription||'';
      ent.thumbnailImage=ent.thumbnailImage||'';
      ent.thumbnail=ent.thumbnailImage?('img:'+ent.thumbnailImage):(ent.thumbnail||'◇');
      return ent;
    });
    entities.activeId=entities.activeId && entities.items.some(e=>e.id===entities.activeId) ? entities.activeId : (entities.items[0]?.id||null);
    entities.history=Array.isArray(entities.history)?entities.history.filter(id=>entities.items.some(e=>e.id===id)):[];
    return entities;
  }
  function exportJournalJson(){
    downloadJsonFile('sagaatlas-journal-'+jsonStamp()+'.json',{
      type:'sagaAtlas.journal', legacyType:'hostilejournal.journal',
      version:1,
      exportedAt:new Date().toISOString(),
      journal:Array.isArray(state.journal)?state.journal:[]
    });
  }
  function importJournalJson(input){
    readJsonInput(input,data=>{
      const journal=Array.isArray(data)?data:(data.journal||data.journalEntries||data.entries);
      if(!Array.isArray(journal)){alert('Import failed: no journal array found.');return;}
      state.journal=journal;
      saveState(); renderJournal(); render();
      alert('Imported '+journal.length+' journal entries.');
    });
  }
  function exportEntitiesJson(){
    const es=ensureEntityState();
    downloadJsonFile('sagaatlas-entities-'+jsonStamp()+'.json',{
      type:'sagaAtlas.entities', legacyType:'hostilejournal.entities',
      version:1,
      exportedAt:new Date().toISOString(),
      entities:es,
      relationships:{}
    });
  }
  function importEntitiesJson(input){
    readJsonInput(input,data=>{
      const imported=normalizeImportedEntities(data);
      if(!imported || !Array.isArray(imported.items)){alert('Import failed: no entity list found.');return;}
      state.entities=imported;
      pruneUnusedEntityTags();
      // Rebuild catalog from imported tags so dropdowns immediately work.
      state.entityTagCatalog={npc:[],location:[],faction:[],asset:[]};
      imported.items.forEach(ent=>{
        (ent.tags||[]).forEach(tag=>{
          if(!state.entityTagCatalog[ent.type]) state.entityTagCatalog[ent.type]=[];
          if(!state.entityTagCatalog[ent.type].some(t=>t.key===tag)){
            state.entityTagCatalog[ent.type].unshift({key:tag,label:String(tag).replace(/[-_]/g,' ').replace(/\b\w/g,c=>c.toUpperCase()),icon:'◇'});
          }
        });
      });
      ensureReciprocalEntityRelationships();
      saveState();
      renderEntityTracker();
      render();
      alert('Imported '+imported.items.length+' entities.');
    });
  }
  function bindJsonArchiveButtons(){
    const ej=$('exportJournalJson'), ij=$('importJournalJson'), ee=$('exportEntitiesJson'), ie=$('importEntitiesJson');
    if(ej&&!ej.dataset.nativeJsonBound){ej.dataset.nativeJsonBound='1';ej.addEventListener('click',exportJournalJson);}
    if(ij&&!ij.dataset.nativeJsonBound){ij.dataset.nativeJsonBound='1';ij.addEventListener('change',()=>importJournalJson(ij));}
    if(ee&&!ee.dataset.nativeJsonBound){ee.dataset.nativeJsonBound='1';ee.addEventListener('click',exportEntitiesJson);}
    if(ie&&!ie.dataset.nativeJsonBound){ie.dataset.nativeJsonBound='1';ie.addEventListener('change',()=>importEntitiesJson(ie));}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindJsonArchiveButtons);else bindJsonArchiveButtons();
  setTimeout(bindJsonArchiveButtons,500);
})();

;(() => {
  const DB_NAME = 'SagaAtlasDocumentLibraryDB';
  const STORE = 'pdfs';
  let currentPdfUrl = null;
  let currentPdfRecord = null;
  let documentViewerTabs = [];
  let activeDocumentTabId = null;
  const PDF_LAST_PAGES_KEY = 'sagaAtlasPdfLastPages';
  const PDF_OPEN_TABS_KEY = 'sagaAtlasPdfOpenTabs';
  const byId = id => document.getElementById(id);
  const escDoc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  function getPdfLastPages(){
    try { return JSON.parse(localStorage.getItem(PDF_LAST_PAGES_KEY) || '{}') || {}; } catch(e){ return {}; }
  }
  function getPdfLastPage(docId){
    const pages = getPdfLastPages();
    const n = parseInt(pages[docId], 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }
  function setPdfLastPage(docId, page){
    if (!docId) return;
    const p = Math.max(1, parseInt(page, 10) || 1);
    const pages = getPdfLastPages();
    pages[docId] = p;
    localStorage.setItem(PDF_LAST_PAGES_KEY, JSON.stringify(pages));
  }
  function normalizePdfPage(page, fallback=1){
    const p = Math.max(1, parseInt(page, 10) || parseInt(fallback, 10) || 1);
    return p;
  }
  function makePdfSrc(baseUrl, page){
    const p = normalizePdfPage(page, 1);
    const clean = String(baseUrl || '').split('#')[0];
    return clean + '#page=' + p;
  }
  function persistOpenPdfTabs(){
    try {
      const tabs = documentViewerTabs.map(t => ({ docId: t.docId, page: normalizePdfPage(t.page, getPdfLastPage(t.docId)), name: t.name || '' }));
      if (tabs.length) localStorage.setItem(PDF_OPEN_TABS_KEY, JSON.stringify({ activeDocId: documentViewerTabs.find(t=>t.id===activeDocumentTabId)?.docId || '', tabs }));
      else localStorage.removeItem(PDF_OPEN_TABS_KEY);
    } catch(e){ console.warn('Could not persist open PDF tabs', e); }
  }
  function loadPersistedPdfTabs(){
    try { return JSON.parse(localStorage.getItem(PDF_OPEN_TABS_KEY) || 'null'); } catch(e){ return null; }
  }
  function clearPersistedPdfTabs(){
    try { localStorage.removeItem(PDF_OPEN_TABS_KEY); } catch(e){}
  }
  const fmtBytes = n => {
    n = Number(n || 0);
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / (1024 * 1024)).toFixed(1) + ' MB';
  };
  function normalizeDocTag(tag){
    return String(tag||'').trim().replace(/^#+/,'').replace(/\s+/g,' ').toLowerCase();
  }
  function parseDocTags(text){
    return [...new Set(String(text||'').split(/[#,]/).map(normalizeDocTag).filter(Boolean))];
  }
  function displayDocTags(tags){
    return (Array.isArray(tags)?tags:[]).filter(Boolean).map(t=>'#'+t).join(' ');
  }
  function makeDocFingerprint(name,size){
    return String(name||'').trim().toLowerCase()+'::'+String(size||0);
  }
  function selectedDocumentTags(){
    return [...document.querySelectorAll('#documentTagFilterChips .document-tag-chip.active')].map(b=>b.dataset.tag).filter(Boolean);
  }
  function allDocumentTags(){
    return [...new Set(ensureDocState().flatMap(d => Array.isArray(d.tags) ? d.tags : []))].sort((a,b)=>a.localeCompare(b));
  }
  function refreshDocumentTagDatalist(){
    const dl = byId('documentTagDatalist');
    if (!dl) return;
    dl.innerHTML = '';
    allDocumentTags().forEach(tag => { const opt=document.createElement('option'); opt.value=tag; dl.appendChild(opt); });
  }
  function appendDocTag(doc, tag){
    tag = normalizeDocTag(tag);
    if (!tag) return false;
    if (!Array.isArray(doc.tags)) doc.tags = [];
    if (!doc.tags.includes(tag)) doc.tags.push(tag);
    doc.tags.sort((a,b)=>a.localeCompare(b));
    return true;
  }
  function removeDocTag(doc, tag){
    tag = normalizeDocTag(tag);
    if (!doc || !tag || !Array.isArray(doc.tags)) return false;
    const before = doc.tags.length;
    doc.tags = doc.tags.filter(t => normalizeDocTag(t) !== tag);
    return doc.tags.length !== before;
  }
  function ensureDocState(){
    if (!Array.isArray(state.documents)) state.documents = [];
    state.documents.forEach(d=>{ if(!Array.isArray(d.tags)) d.tags = []; if(!d.fingerprint && d.name && d.size) d.fingerprint = makeDocFingerprint(d.name,d.size); if (typeof d.hasLocalBlob === 'undefined') d.hasLocalBlob = !(d.serverPath || d.githubPath) || d.source === 'local'; if (!d.source) d.source = (d.serverPath || d.githubPath) ? (d.hasLocalBlob ? 'local+server' : 'server') : 'local'; });
    return state.documents;
  }
  function openDb(){
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function txStore(mode='readonly'){
    const db = await openDb();
    return db.transaction(STORE, mode).objectStore(STORE);
  }
  async function putPdf(record){
    const store = await txStore('readwrite');
    return new Promise((resolve, reject) => {
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
  async function getPdf(id){
    const store = await txStore('readonly');
    return new Promise((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }
  async function deletePdf(id){
    const store = await txStore('readwrite');
    return new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
  function saveDocState(){
    try { if (typeof saveState === 'function') saveState(); } catch(e) { console.warn(e); }
  }
  function showRightTab(name){
    const oracle = byId('oracleLibraryTab');
    const docs = byId('documentLibraryTab');
    const guide = byId('guideLibraryTab');
    const oracleBtn = byId('showOracleLibraryTab');
    const docsBtn = byId('showDocumentLibraryTab');
    const guideBtn = byId('showGuideLibraryTab');
    const onDocs = name === 'documents';
    const onGuide = name === 'guide';
    if (oracle){ oracle.hidden = onDocs || onGuide; oracle.classList.toggle('active-oracle-tab', !onDocs && !onGuide); }
    if (docs){ docs.hidden = !onDocs; docs.classList.toggle('active-oracle-tab', onDocs); }
    if (guide){ guide.hidden = !onGuide; guide.classList.toggle('active-oracle-tab', onGuide); }
    if (oracleBtn) oracleBtn.classList.toggle('active', !onDocs && !onGuide);
    if (docsBtn) docsBtn.classList.toggle('active', onDocs);
    if (guideBtn) guideBtn.classList.toggle('active', onGuide);
    if (onDocs) renderDocumentLibrary();
    if (onGuide) renderGuideEditor();
  }
  function ensureDocumentViewerTabsUi(){
    const card = document.querySelector('#documentViewerOverlay .document-viewer-card');
    const toolbar = byId('documentViewerOverlay')?.querySelector('.document-viewer-toolbar');
    const actions = byId('documentViewerOverlay')?.querySelector('.document-viewer-actions');
    if (!card || !toolbar) return;
    if (!byId('documentViewerTabs')){
      const tabs = document.createElement('div');
      tabs.id = 'documentViewerTabs';
      tabs.className = 'document-viewer-tabs';
      tabs.setAttribute('role','tablist');
      tabs.setAttribute('aria-label','Open PDF tabs');
      toolbar.insertAdjacentElement('afterend', tabs);
    }
    if (actions && !byId('documentViewerPageControls')){
      const wrap = document.createElement('span');
      wrap.id = 'documentViewerPageControls';
      wrap.className = 'document-viewer-page-controls';
      wrap.innerHTML = '<label for="documentViewerPageInput">Page</label><input id="documentViewerPageInput" type="number" min="1" step="1" value="1" aria-label="PDF page"><button id="documentViewerGoPage" class="secondary compact-button" type="button" title="Go to page">Go</button>';
      actions.insertBefore(wrap, actions.firstChild);
      byId('documentViewerGoPage')?.addEventListener('click', () => {
        const tab = documentViewerTabs.find(t => t.id === activeDocumentTabId);
        if (!tab) return;
        const page = normalizePdfPage(byId('documentViewerPageInput')?.value, tab.page || 1);
        tab.page = page;
        setPdfLastPage(tab.docId, page);
        activateDocumentViewerTab(tab.id);
        persistOpenPdfTabs();
      });
      byId('documentViewerPageInput')?.addEventListener('keydown', evt => {
        if (evt.key === 'Enter') byId('documentViewerGoPage')?.click();
      });
      byId('documentViewerPageInput')?.addEventListener('change', () => {
        const tab = documentViewerTabs.find(t => t.id === activeDocumentTabId);
        if (!tab) return;
        const page = normalizePdfPage(byId('documentViewerPageInput')?.value, tab.page || 1);
        tab.page = page;
        setPdfLastPage(tab.docId, page);
        persistOpenPdfTabs();
      });
    }
  }
  function renderDocumentViewerTabs(){
    ensureDocumentViewerTabsUi();
    const wrap = byId('documentViewerTabs');
    if (!wrap) return;
    wrap.innerHTML = '';
    documentViewerTabs.forEach(tab => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'document-viewer-tab' + (tab.id === activeDocumentTabId ? ' active' : '');
      btn.dataset.viewerTab = tab.id;
      btn.title = (tab.name || 'PDF Document') + ' — page ' + normalizePdfPage(tab.page, 1);
      btn.innerHTML = '<span class="document-viewer-tab-title">' + escDoc(tab.name || 'PDF Document') + '</span><span class="document-viewer-tab-page">p.' + normalizePdfPage(tab.page, 1) + '</span><span class="document-viewer-tab-close" data-viewer-tab-close="' + escDoc(tab.id) + '" title="Close this PDF" aria-label="Close this PDF">×</span>';
      wrap.appendChild(btn);
    });
  }
  function syncCurrentTabPageFromInput(){
    const tab = documentViewerTabs.find(t => t.id === activeDocumentTabId);
    if (!tab) return;
    const input = byId('documentViewerPageInput');
    if (!input) return;
    const page = normalizePdfPage(input.value, tab.page || 1);
    tab.page = page;
    setPdfLastPage(tab.docId, page);
  }
  function activateDocumentViewerTab(tabId){
    ensureDocumentViewerTabsUi();
    const tab = documentViewerTabs.find(t => t.id === tabId);
    if (!tab) return;
    activeDocumentTabId = tab.id;
    currentPdfRecord = tab.record || ensureDocState().find(d => d.id === tab.docId) || null;
    currentPdfUrl = tab.blobUrl || null;
    const title = byId('documentViewerTitle');
    const metaEl = byId('documentViewerMeta');
    const frame = byId('documentViewerFrame');
    const overlay = byId('documentViewerOverlay');
    const pageInput = byId('documentViewerPageInput');
    if (title) title.textContent = tab.name || currentPdfRecord?.name || 'PDF Document';
    if (metaEl) metaEl.textContent = `${fmtBytes(tab.size || currentPdfRecord?.size)} • ${tab.kind === 'server' ? 'Server' : 'Local'} PDF viewer`;
    if (pageInput) pageInput.value = normalizePdfPage(tab.page, getPdfLastPage(tab.docId));
    if (frame) frame.src = makePdfSrc(tab.baseUrl, tab.page);
    if (overlay) overlay.hidden = false;
    document.body.classList.add('document-viewer-open');
    renderDocumentViewerTabs();
    persistOpenPdfTabs();
  }
  function closeDocumentViewerTab(tabId){
    const idx = documentViewerTabs.findIndex(t => t.id === tabId);
    if (idx < 0) return;
    const tab = documentViewerTabs[idx];
    if (tab.docId) setPdfLastPage(tab.docId, tab.page || getPdfLastPage(tab.docId));
    if (tab.blobUrl) URL.revokeObjectURL(tab.blobUrl);
    documentViewerTabs.splice(idx, 1);
    if (!documentViewerTabs.length){
      closeDocument(true);
      return;
    }
    const next = documentViewerTabs[Math.max(0, idx - 1)] || documentViewerTabs[0];
    activateDocumentViewerTab(next.id);
  }
  function renderDocumentLibrary(){
    const list = byId('documentLibraryList');
    if (!list) return;
    const docsAll = ensureDocState().slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''), undefined, {sensitivity:'base', numeric:true}));
    const search = String(byId('documentSearch')?.value || '').trim().toLowerCase();
    const activeTags = selectedDocumentTags();
    const allTags = allDocumentTags();
    refreshDocumentTagDatalist();
    const chipWrap = byId('documentTagFilterChips');
    if (chipWrap){
      chipWrap.innerHTML = '';
      allTags.forEach(tag => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'document-tag-chip' + (activeTags.includes(tag) ? ' active' : '');
        chip.dataset.tag = tag;
        chip.textContent = '#'+tag;
        chipWrap.appendChild(chip);
      });
    }
    const docs = docsAll.filter(doc => {
      const tags = Array.isArray(doc.tags) ? doc.tags : [];
      const hay = [doc.name, ...(tags||[])].join(' ').toLowerCase();
      const searchOk = !search || hay.includes(search);
      const tagsOk = !activeTags.length || activeTags.every(t => tags.includes(t));
      return searchOk && tagsOk;
    });
    list.innerHTML = '';
    if (!docs.length){
      const empty = document.createElement('div');
      empty.className = 'document-library-empty';
      empty.textContent = docsAll.length ? 'No PDFs match the current search or tag filters.' : 'No PDFs uploaded yet.';
      list.appendChild(empty);
      return;
    }
    docs.forEach(doc => {
      const card = document.createElement('article');
      card.className = 'document-card';
      const docTags = Array.isArray(doc.tags) ? doc.tags.slice().sort((a,b)=>a.localeCompare(b)) : [];
      const tagChips = docTags.length ? docTags.map(t => `<span class="document-card-tag-chip">#${escDoc(t)}</span>`).join('') : '<span class="document-card-tags-empty">No tags</span>';
      const editableTagChips = docTags.length ? docTags.map(t => `<button type="button" class="document-card-tag-chip removable" data-doc-remove-tag="${escDoc(doc.id)}" data-tag="${escDoc(t)}" title="Remove #${escDoc(t)}">#${escDoc(t)} <span aria-hidden="true">×</span></button>`).join('') : '<span class="document-card-tags-empty">No tags yet.</span>';
      const tagOptions = allTags.filter(t => !docTags.includes(t)).map(t=>`<option value="${escDoc(t)}">#${escDoc(t)}</option>`).join('');
      card.draggable = true;
      card.dataset.docDrag = doc.id;
      card.title = 'Drag into a text editor to create a PDF page link';
      const sourceInfo = ''; // URLs/paths are intentionally hidden in the compact Documents list.
      const localDownloadButton = doc.hasLocalBlob ? `<span class="document-local-indicator" title="File stored locally" aria-label="File stored locally" role="img"><img src="img/local-doc-icon.png" alt=""></span>` : '';
      card.innerHTML = `<div class="document-card-main"><a href="#" class="document-card-title document-card-title-link" data-doc-open="${escDoc(doc.id)}" data-doc-drag="${escDoc(doc.id)}" draggable="true" title="Open PDF, or drag into an editor to link it">${escDoc(doc.name)}</a><div class="document-card-tags">${tagChips}</div>${sourceInfo}<div class="document-card-tag-editor" data-doc-tag-editor="${escDoc(doc.id)}" hidden><div class="document-card-edit-tags">${editableTagChips}</div><div class="document-card-tag-row"><input class="document-card-tag-input" type="text" list="documentTagDatalist" data-doc-new-tag="${escDoc(doc.id)}" placeholder="Add new tag" aria-label="Add new document tag"><select class="document-card-tag-select" data-doc-add-tag="${escDoc(doc.id)}" aria-label="Add existing tag"><option value="">+ existing</option>${tagOptions}</select></div></div></div><div class="document-card-actions">${localDownloadButton}<button class="secondary document-rename-button" type="button" data-doc-rename="${escDoc(doc.id)}" title="Rename displayed document name" aria-label="Rename document">✎</button><button class="secondary document-tag-toggle" type="button" data-doc-toggle-tags="${escDoc(doc.id)}" title="Modify tags" aria-label="Modify tags">⚑</button><button class="secondary" type="button" data-doc-delete="${escDoc(doc.id)}" title="Remove PDF" aria-label="Remove PDF">🗑</button></div>`;
      list.appendChild(card);
    });
  }
  function getGithubDocsConfig(){
    const owner = 'meta5by5';
    const repo = 'HostileJournal';
    const branch = 'main';
    const folder = 'assets/docs';
    return { owner, repo, branch, folder, token:'', autoUpload:false };
  }
  function saveGithubDocsConfig(){ /* server docs are read-only from /assets/docs */ }
  function loadGithubDocsConfig(){ /* no GitHub upload settings are used */ }
  function setGithubDocsStatus(text){
    const el = byId('githubDocsStatus');
    if (el) el.textContent = text;
    if (typeof setStatus === 'function') setStatus(text);
  }
  function sanitizeGithubPdfName(name){
    const raw = String(name || 'document.pdf').replace(/\\/g,'/').split('/').pop();
    const base = raw.replace(/\.pdf$/i,'').trim() || 'document';
    return base.replace(/[^a-zA-Z0-9._ -]+/g,'-').replace(/\s+/g,'-').replace(/-+/g,'-').replace(/^[-.]+|[-.]+$/g,'').slice(0,120) + '.pdf';
  }
  function encodePathForUrl(path){
    return String(path||'').split('/').map(encodeURIComponent).join('/');
  }
  async function fileToBase64(file){
    return '';
  }
  async function githubApi(path, cfg, options={}){
    throw new Error('GitHub API sync has been removed. Use relative /assets/docs sync instead.');
  }
  async function uploadPdfToGithubDocs(file, meta){
    return null;
  }

  function getServerDocsFolder(){
    return 'assets/docs';
  }
  function serverDocUrlForPath(path){
    const clean = String(path || '').replace(/\\/g,'/').replace(/^\.\//,'').replace(/^\/+/, '');
    return new URL(encodePathForUrl(clean), document.baseURI).href;
  }
  function normalizeServerDocEntry(entry){
    if (!entry) return null;
    const folder = getServerDocsFolder().replace(/^\/+|\/+$/g,'');
    let name = '';
    let path = '';
    let size = 0;
    let tags = [];
    if (typeof entry === 'string'){
      name = entry.replace(/\\/g,'/').split('/').pop();
      path = entry.includes('/') ? entry.replace(/^\/+/, '') : `${folder}/${entry}`;
    } else if (typeof entry === 'object'){
      name = entry.name || entry.filename || entry.title || '';
      path = entry.path || entry.url || entry.href || '';
      size = Number(entry.size || 0) || 0;
      tags = parseDocTags(Array.isArray(entry.tags) ? entry.tags.join(',') : (entry.tags || ''));
      if (!path && name) path = `${folder}/${name}`;
      if (!name && path) name = String(path).replace(/\\/g,'/').split('/').pop();
    }
    path = String(path || '').replace(/\\/g,'/').replace(/^\.\//,'').replace(/^\/+/, '');
    if (!path || !String(path).toLowerCase().split('?')[0].split('#')[0].endsWith('.pdf')) return null;
    if (!path.includes('/')) path = `${folder}/${path}`;
    name = name || path.split('/').pop();
    return { name, path, size, tags };
  }
  async function loadServerDocsFromManifest(){
    const folder = getServerDocsFolder().replace(/^\/+|\/+$/g,'');
    const manifests = ['./assets/index.json', 'assets/index.json'];
    const errors = [];
    for (const manifestPath of manifests){
      const url = new URL(manifestPath, document.baseURI).href;
      try {
        const res = await fetch(url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now(), { cache:'no-store' });
        if (!res.ok){ errors.push(`${manifestPath}: HTTP ${res.status}`); continue; }
        const json = await res.json();
        const rows = Array.isArray(json) ? json : (Array.isArray(json.files) ? json.files : (Array.isArray(json.documents) ? json.documents : []));
        const files = rows.map(normalizeServerDocEntry).filter(Boolean);
        return { files, source: manifestPath, errors };
      } catch (err) {
        errors.push(`${manifestPath}: ${err && err.message ? err.message : err}`);
        console.warn('Document manifest read skipped:', manifestPath, err);
      }
    }
    return { files: [], source: '', errors };
  }
  async function loadServerDocsFromDirectoryListing(){
    const folder = getServerDocsFolder().replace(/^\/+|\/+$/g,'');
    try {
      const res = await fetch(new URL(folder + '/', document.baseURI).href, { cache:'no-store' });
      if (!res.ok) return { files: [], source: '' };
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const files = [...doc.querySelectorAll('a[href]')]
        .map(a => a.getAttribute('href') || '')
        .filter(href => href && href.toLowerCase().split('?')[0].split('#')[0].endsWith('.pdf'))
        .map(href => {
          const url = new URL(href, new URL(folder + '/', document.baseURI));
          const relPath = url.pathname.replace(/^\//,'').replace(/^.*?assets\/docs\//, 'assets/docs/');
          return normalizeServerDocEntry({ name: decodeURIComponent(url.pathname.split('/').pop() || ''), path: relPath });
        })
        .filter(Boolean);
      return { files, source: folder + '/' };
    } catch (err) {
      console.warn('Directory listing read skipped:', err);
      return { files: [], source: '' };
    }
  }
  function mergeServerDocLists(...lists){
    const byPath = new Map();
    lists.flat().filter(Boolean).forEach(item => {
      const norm = normalizeServerDocEntry(item);
      if (!norm) return;
      const key = String(norm.path || norm.name || '').toLowerCase();
      const existing = byPath.get(key) || {};
      byPath.set(key, { ...existing, ...norm, tags: [...new Set([...(existing.tags||[]), ...(norm.tags||[])])].sort((a,b)=>a.localeCompare(b)) });
    });
    return [...byPath.values()].sort((a,b)=>String(a.name||a.path).localeCompare(String(b.name||b.path)));
  }

  async function syncGithubDocsFolder(){
    const folder = getServerDocsFolder();
    setGithubDocsStatus('Reading ./assets/index.json relative to this index.html...');
    const manifestResult = await loadServerDocsFromManifest();
    // Directory listings are optional. The manifest is authoritative so Sync Docs works on GitHub Pages and simple local servers.
    const listingResult = await loadServerDocsFromDirectoryListing();
    const files = mergeServerDocLists(manifestResult.files, listingResult.files);
    const sources = [manifestResult.source, listingResult.source].filter(Boolean).join(' + ') || 'assets/index.json';
    if (!files.length){
      const details = (manifestResult.errors && manifestResult.errors.length) ? ' Details: ' + manifestResult.errors.join(' | ') : '';
      if (location.protocol === 'file:') {
        setGithubDocsStatus('Could not read ' + folder + '/index.json from file://. Start a local server in the app folder: python -m http.server 8000, then open http://localhost:8000/.' + details);
      } else {
        setGithubDocsStatus('No PDFs found. Confirm ./assets/index.json exists and contains a files array. The path is relative to this index.html. Import JSON archives are ignored; only PDF entries are shown.' + details);
      }
      return;
    }
    const docs = ensureDocState();
    let added = 0, updated = 0;
    for (const item of files){
      const path = item.path;
      const url = serverDocUrlForPath(path);
      let doc = docs.find(d => d.serverPath === path || d.githubPath === path || String(d.name||'').toLowerCase() === String(item.name||'').toLowerCase());
      if (doc){
        const before = JSON.stringify({p:doc.serverPath||doc.githubPath,u:doc.githubPagesUrl||doc.githubDownloadUrl,n:doc.name});
        doc.serverPath = path;
        doc.githubPath = path; // retained for compatibility with existing document records and links
        doc.githubSha = doc.githubSha || '';
        doc.githubPagesUrl = url;
        doc.githubDownloadUrl = url;
        doc.githubHtmlUrl = url;
        doc.source = doc.hasLocalBlob ? 'local+server' : 'server';
        if (item.size) doc.size = item.size;
        if (Array.isArray(item.tags) && item.tags.length){
          doc.tags = [...new Set([...(Array.isArray(doc.tags)?doc.tags:[]), ...item.tags])].sort((a,b)=>a.localeCompare(b));
        }
        if (JSON.stringify({p:doc.serverPath||doc.githubPath,u:doc.githubPagesUrl||doc.githubDownloadUrl,n:doc.name}) !== before) updated++;
      } else {
        const id = 'srvpdf_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,8);
        docs.push({
          id,
          name: item.name || 'PDF Document',
          size: item.size || 0,
          tags: Array.isArray(item.tags) ? item.tags : [],
          type: 'application/pdf',
          source: 'server',
          hasLocalBlob: false,
          addedAt: new Date().toISOString(),
          serverPath: path,
          githubPath: path,
          githubSha: '',
          githubPagesUrl: url,
          githubDownloadUrl: url,
          githubHtmlUrl: url
        });
        added++;
      }
    }
    saveDocState();
    renderDocumentLibrary();
    setGithubDocsStatus(`Synced from ${sources}: ${added} new, ${updated} updated, ${files.length} PDF${files.length===1?'':'s'} found.`);
  }
  function chooseLocalPdfFile(expectedName=''){
    return new Promise(resolve => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/pdf,.pdf';
      input.style.position = 'fixed';
      input.style.left = '-9999px';
      document.body.appendChild(input);
      input.addEventListener('change', () => {
        const file = input.files && input.files[0] ? input.files[0] : null;
        input.remove();
        resolve(file);
      }, { once:true });
      input.addEventListener('cancel', () => { input.remove(); resolve(null); }, { once:true });
      input.click();
    });
  }
  async function attachLocalPdfCopy(id, file){
    const docs = ensureDocState();
    const doc = docs.find(d => d.id === id);
    if (!doc || !file) return false;
    if (!(file.type === 'application/pdf' || String(file.name||'').toLowerCase().endsWith('.pdf'))) throw new Error('Select a PDF file.');
    const fingerprint = makeDocFingerprint(file.name, file.size);
    doc.size = file.size;
    doc.fingerprint = fingerprint;
    doc.hasLocalBlob = true;
    doc.source = (doc.serverPath || doc.githubPath) ? 'local+server' : 'local';
    doc.localUpdatedAt = new Date().toISOString();
    if (!doc.name) doc.name = file.name;
    await putPdf({ ...doc, blob: file });
    saveDocState();
    renderDocumentLibrary();
    return true;
  }
  async function promptForLocalPdfCopy(doc){
    const msg = `"${doc.name || 'This PDF'}" is listed from /assets/docs but is not stored in this browser yet.\n\nSelect the matching PDF file to store a local offline copy?`;
    if (!confirm(msg)) return false;
    const file = await chooseLocalPdfFile(doc.name || '');
    if (!file) return false;
    await attachLocalPdfCopy(doc.id, file);
    return true;
  }
  async function downloadLocalDocument(id){
    const doc = ensureDocState().find(d => d.id === id);
    const rec = await getPdf(id);
    if (!rec || !rec.blob){ alert('No local PDF copy is stored in this browser.'); return; }
    const url = URL.createObjectURL(rec.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = sanitizeGithubPdfName(doc?.name || rec.name || 'document.pdf');
    document.body.appendChild(a);
    a.click();
    setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 0);
  }
  async function handlePdfUpload(evt){
    const files = [...(evt.target.files || [])].filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    if (!files.length) return;
    const docs = ensureDocState();
    const uploadTags = parseDocTags(byId('documentDefaultTags')?.value || '');
    let added = 0, skipped = 0;
    for (const file of files){
      const fingerprint = makeDocFingerprint(file.name, file.size);
      const duplicate = docs.find(d => (d.fingerprint || makeDocFingerprint(d.name,d.size)) === fingerprint);
      if (duplicate){
        if (!duplicate.hasLocalBlob){
          await attachLocalPdfCopy(duplicate.id, file);
          added++;
        } else {
          skipped++;
        }
        continue;
      }
      const id = 'pdf_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,8);
      const meta = { id, name: file.name, size: file.size, fingerprint, tags: uploadTags.slice(), type: 'application/pdf', source: 'local', hasLocalBlob: true, addedAt: new Date().toISOString() };
      await putPdf({ ...meta, blob: file });
      docs.unshift(meta);
      added++;
    }
    evt.target.value = '';
    saveDocState();
    renderDocumentLibrary();
    if (typeof setStatus === 'function') setStatus(`${added} PDF${added===1?'':'s'} uploaded${skipped ? '; '+skipped+' duplicate'+(skipped===1?'':'s')+' skipped' : ''}`);
  }
  async function openDocument(id,page=null){
    const meta = ensureDocState().find(d => d.id === id);
    const requestedPage = normalizePdfPage(page, getPdfLastPage(id));
    let rec = await getPdf(id);
    let baseUrl = '';
    let kind = 'local';
    let blobUrl = null;
    let record = meta || rec || null;
    if (rec && rec.blob){
      blobUrl = URL.createObjectURL(rec.blob);
      baseUrl = blobUrl;
      kind = 'local';
      record = meta || rec;
    } else if (meta && (meta.serverPath || meta.githubPath || meta.githubPagesUrl || meta.githubDownloadUrl)){
      baseUrl = meta.githubPagesUrl || meta.githubDownloadUrl || serverDocUrlForPath(meta.serverPath || meta.githubPath);
      kind = 'server';
      record = meta;
    }
    if (!baseUrl){ alert('Could not find this PDF in browser storage or /assets/docs. Re-upload the file or run Sync Docs.'); return; }
    const existing = documentViewerTabs.find(t => t.docId === id);
    if (existing){
      if (blobUrl){ if (existing.blobUrl) URL.revokeObjectURL(existing.blobUrl); existing.blobUrl = blobUrl; existing.baseUrl = blobUrl; existing.kind = 'local'; }
      existing.page = requestedPage;
      existing.record = record;
      existing.name = record?.name || 'PDF Document';
      existing.size = record?.size || 0;
      setPdfLastPage(id, requestedPage);
      activateDocumentViewerTab(existing.id);
    } else {
      const tab = {
        id: 'pdftab_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,7),
        docId: id,
        name: record?.name || 'PDF Document',
        size: record?.size || 0,
        page: requestedPage,
        kind,
        baseUrl,
        blobUrl,
        record
      };
      documentViewerTabs.push(tab);
      setPdfLastPage(id, requestedPage);
      activateDocumentViewerTab(tab.id);
    }
    if (typeof setStatus === 'function') setStatus('Opened PDF document to page ' + requestedPage);
  }
  function closeDocument(closeAll=false){
    if (!closeAll && activeDocumentTabId){
      syncCurrentTabPageFromInput();
      closeDocumentViewerTab(activeDocumentTabId);
      return;
    }
    documentViewerTabs.forEach(tab => { if (tab.docId) setPdfLastPage(tab.docId, tab.page || getPdfLastPage(tab.docId)); if (tab.blobUrl) URL.revokeObjectURL(tab.blobUrl); });
    documentViewerTabs = [];
    activeDocumentTabId = null;
    const frame = byId('documentViewerFrame');
    const overlay = byId('documentViewerOverlay');
    if (frame) frame.removeAttribute('src');
    if (currentPdfUrl) URL.revokeObjectURL(currentPdfUrl);
    currentPdfUrl = null;
    currentPdfRecord = null;
    if (overlay) overlay.hidden = true;
    document.body.classList.remove('document-viewer-open');
    renderDocumentViewerTabs();
    persistOpenPdfTabs();
  }
  async function removeDocument(id){
    const docs = ensureDocState();
    const doc = docs.find(d => d.id === id);
    if (!doc) return;
    if (!confirm('Remove "' + doc.name + '" from the Document Library?')) return;
    await deletePdf(id);
    state.documents = docs.filter(d => d.id !== id);
    documentViewerTabs.filter(t => t.docId === id).slice().forEach(t => closeDocumentViewerTab(t.id));
    saveDocState();
    renderDocumentLibrary();
    if (typeof setStatus === 'function') setStatus('Removed PDF document');
  }
  async function renameDocument(id){
    const docs = ensureDocState();
    const doc = docs.find(d => d.id === id);
    if (!doc) return;
    const oldName = doc.name || 'PDF Document';
    const nextName = prompt('Displayed document name:', oldName);
    if (nextName === null) return;
    const cleanName = String(nextName).trim();
    if (!cleanName || cleanName === oldName) return;
    doc.name = cleanName;
    try {
      const rec = await getPdf(id);
      if (rec) await putPdf({ ...rec, name: cleanName });
    } catch (err) {
      console.warn('Could not update stored PDF metadata name', err);
    }
    documentViewerTabs.forEach(t => { if (t.docId === id) t.name = cleanName; });
    if (currentPdfRecord && currentPdfRecord.id === id){ currentPdfRecord.name = cleanName; }
    if (documentViewerTabs.some(t => t.id === activeDocumentTabId && t.docId === id)) activateDocumentViewerTab(activeDocumentTabId);
    saveDocState();
    renderDocumentLibrary();
    if (typeof setStatus === 'function') setStatus('Renamed displayed document name');
  }
  function renderGuideEditor(){
    const editor = byId('guideEditor');
    if (!editor) return;
    if (editor.dataset.guideLoaded !== '1'){
      editor.innerHTML = state.documentGuideHtml || '';
      editor.dataset.guideLoaded = '1';
    }
  }
  function saveGuideEditor(){
    const editor = byId('guideEditor');
    if (!editor) return;
    state.documentGuideHtml = (typeof sanitizeHtml === 'function') ? sanitizeHtml(editor.innerHTML) : editor.innerHTML;
    saveDocState();
  }
  async function maybeRestoreOpenPdfTabs(){
    const saved = loadPersistedPdfTabs();
    if (!saved || !Array.isArray(saved.tabs) || !saved.tabs.length) return;
    const available = saved.tabs.filter(t => ensureDocState().some(d => d.id === t.docId));
    if (!available.length){ clearPersistedPdfTabs(); return; }
    const msg = 'Reopen ' + available.length + ' PDF' + (available.length===1?'':'s') + ' from your last session to their recent page?';
    if (!confirm(msg)){ clearPersistedPdfTabs(); return; }
    for (const t of available){
      try { await openDocument(t.docId, normalizePdfPage(t.page, getPdfLastPage(t.docId))); } catch(err){ console.warn('Could not reopen PDF tab', t, err); }
    }
    const active = available.find(t => t.docId === saved.activeDocId);
    if (active){ const tab = documentViewerTabs.find(x => x.docId === active.docId); if (tab) activateDocumentViewerTab(tab.id); }
  }
  function initDocumentLibrary(){
    if (!byId('documentLibraryTab')) return;
    ensureDocState();
    renderGuideEditor();
    ensureDocumentViewerTabsUi();
    byId('showOracleLibraryTab')?.addEventListener('click', () => showRightTab('oracles'));
    byId('showDocumentLibraryTab')?.addEventListener('click', () => showRightTab('documents'));
    byId('showGuideLibraryTab')?.addEventListener('click', () => showRightTab('guide'));
    loadGithubDocsConfig();
    byId('documentPdfUpload')?.addEventListener('change', handlePdfUpload);
    byId('syncGithubDocsFolder')?.addEventListener('click', () => syncGithubDocsFolder().catch(err => alert('Could not sync ./assets/index.json: ' + err.message)));
    byId('toggleDocumentSearch')?.addEventListener('click', () => {
      const btn = byId('toggleDocumentSearch');
      const panel = byId('documentSearchPanel');
      if (!btn || !panel) return;
      const opening = panel.hidden;
      panel.hidden = !opening;
      btn.setAttribute('aria-expanded', opening ? 'true' : 'false');
      if (opening) {
        setTimeout(() => byId('documentSearch')?.focus({ preventScroll:true }), 0);
      } else {
        document.activeElement && document.activeElement.blur && document.activeElement.blur();
        try { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); } catch(e) { window.scrollTo(0,0); }
      }
    });
    byId('documentSearch')?.addEventListener('input', renderDocumentLibrary);
    byId('documentDefaultTags')?.addEventListener('change', () => { if (typeof setStatus === 'function') setStatus('Document upload tags updated'); });
    byId('documentTagFilterChips')?.addEventListener('click', evt => { const chip = evt.target.closest('.document-tag-chip'); if (!chip) return; chip.classList.toggle('active'); renderDocumentLibrary(); });
    byId('documentLibraryList')?.addEventListener('click', evt => {
      const openBtn = evt.target.closest('[data-doc-open]');
      const toggleBtn = evt.target.closest('[data-doc-toggle-tags]');
      const renameBtn = evt.target.closest('[data-doc-rename]');
      const removeTagBtn = evt.target.closest('[data-doc-remove-tag]');
      const downloadBtn = evt.target.closest('[data-doc-download]');
      const delBtn = evt.target.closest('[data-doc-delete]');
      if (openBtn){ evt.preventDefault(); openDocument(openBtn.dataset.docOpen).catch(err => alert('Could not open PDF: ' + err.message)); return; }
      if (downloadBtn){ evt.preventDefault(); downloadLocalDocument(downloadBtn.dataset.docDownload).catch(err => alert('Could not download local PDF: ' + err.message)); return; }
      if (renameBtn){ evt.preventDefault(); renameDocument(renameBtn.dataset.docRename).catch(err => alert('Could not rename PDF: ' + err.message)); return; }
      if (toggleBtn){
        const card = toggleBtn.closest('.document-card');
        const editor = card?.querySelector('[data-doc-tag-editor]');
        if (editor){ editor.hidden = !editor.hidden; toggleBtn.classList.toggle('active', !editor.hidden); }
        return;
      }
      if (removeTagBtn){
        const doc = ensureDocState().find(d => d.id === removeTagBtn.dataset.docRemoveTag);
        if (doc && removeDocTag(doc, removeTagBtn.dataset.tag)){ saveDocState(); renderDocumentLibrary(); if (typeof setStatus === 'function') setStatus('Removed document tag'); }
        return;
      }
      if (delBtn) removeDocument(delBtn.dataset.docDelete).catch(err => alert('Could not remove PDF: ' + err.message));
    });
    byId('documentLibraryList')?.addEventListener('change', evt => {
      const select = evt.target.closest('[data-doc-add-tag]');
      if (select){
        const doc = ensureDocState().find(d => d.id === select.dataset.docAddTag);
        if (doc && appendDocTag(doc, select.value)){ saveDocState(); renderDocumentLibrary(); if (typeof setStatus === 'function') setStatus('Added document tag'); }
        else if (select) select.value = '';
        return;
      }
      const input = evt.target.closest('[data-doc-new-tag]');
      if (input && input.value.trim()){
        const doc = ensureDocState().find(d => d.id === input.dataset.docNewTag);
        parseDocTags(input.value).forEach(tag => { if (doc) appendDocTag(doc, tag); });
        input.value = '';
        saveDocState();
        renderDocumentLibrary();
        if (typeof setStatus === 'function') setStatus('Added document tag');
      }
    });
    byId('documentLibraryList')?.addEventListener('keydown', evt => {
      const input = evt.target.closest('[data-doc-new-tag]');
      if (!input || evt.key !== 'Enter') return;
      evt.preventDefault();
      if (!input.value.trim()) return;
      const doc = ensureDocState().find(d => d.id === input.dataset.docNewTag);
      parseDocTags(input.value).forEach(tag => { if (doc) appendDocTag(doc, tag); });
      input.value = '';
      saveDocState();
      renderDocumentLibrary();
      if (typeof setStatus === 'function') setStatus('Added document tag');
    });
    byId('documentViewerTabs')?.addEventListener('click', evt => {
      const close = evt.target.closest('[data-viewer-tab-close]');
      if (close){ evt.preventDefault(); evt.stopPropagation(); closeDocumentViewerTab(close.dataset.viewerTabClose); return; }
      const tab = evt.target.closest('[data-viewer-tab]');
      if (tab){ evt.preventDefault(); syncCurrentTabPageFromInput(); activateDocumentViewerTab(tab.dataset.viewerTab); }
    });
    byId('documentViewerClose')?.addEventListener('click', () => closeDocument(false));
    byId('documentViewerOpenNew')?.addEventListener('click', () => { const tab = documentViewerTabs.find(t => t.id === activeDocumentTabId); if (tab) window.open(makePdfSrc(tab.baseUrl, tab.page), '_blank', 'noopener'); });
    byId('guideEditor')?.addEventListener('input', saveGuideEditor);
    byId('clearGuideEditor')?.addEventListener('click', () => { if(confirm('Clear the Guide editor?')){ const ed=byId('guideEditor'); if(ed) ed.innerHTML=''; state.documentGuideHtml=''; saveDocState(); }});
    document.addEventListener('keydown', evt => { if (evt.key === 'Escape' && document.body.classList.contains('document-viewer-open')) closeDocument(); });
    renderDocumentLibrary();
    const restoreAfterSync = () => { if (!sessionStorage.getItem('sagaAtlasPdfRestorePrompted')){ sessionStorage.setItem('sagaAtlasPdfRestorePrompted','1'); maybeRestoreOpenPdfTabs().catch(err => console.warn('PDF restore skipped:', err)); } };
    if (!sessionStorage.getItem('sagaAtlasGithubDocsSyncedOnce')){
      sessionStorage.setItem('sagaAtlasGithubDocsSyncedOnce','1');
      syncGithubDocsFolder().catch(err => console.warn('Server docs auto-sync skipped:', err)).finally(restoreAfterSync);
    } else {
      setTimeout(restoreAfterSync, 200);
    }
    window.addEventListener('beforeunload', () => { syncCurrentTabPageFromInput(); persistOpenPdfTabs(); });
    window.SagaAtlasDocuments = {
      openDocument,
      closeDocument,
      renderDocumentLibrary,
      syncGithubDocsFolder,
      getDocumentMeta: id => ensureDocState().find(d => d.id === id) || null,
      importPdfFile: async (file, tags=[]) => {
        if (!file || !(file.type === 'application/pdf' || String(file.name||'').toLowerCase().endsWith('.pdf'))) return null;
        const docs = ensureDocState();
        const fingerprint = makeDocFingerprint(file.name, file.size);
        let existing = docs.find(d => (d.fingerprint || makeDocFingerprint(d.name,d.size)) === fingerprint);
        if (existing) return { doc: existing, duplicate: true };
        const id = 'pdf_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,8);
        const meta = { id, name: file.name, size: file.size, fingerprint, tags: parseDocTags(tags.join ? tags.join(',') : tags), type: 'application/pdf', source: 'local', hasLocalBlob: true, addedAt: new Date().toISOString() };
        await putPdf({ ...meta, blob: file });
        docs.unshift(meta);
        saveDocState();
        renderDocumentLibrary();
        return { doc: meta, duplicate: false };
      }
    };
    window.HostileDocuments = window.SagaAtlasDocuments;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initDocumentLibrary); else initDocumentLibrary();
})();

/* PDF @link capability for rich text editors */
function documentLinkMarkup(doc,page){
  const p=Math.max(1,parseInt(page||1,10)||1);
  const label='@'+escapeHtml(doc.name||'PDF')+' p.'+p;
  return `<a href="#" class="document-inline-link" data-document-id="${String(doc.id).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]))}" data-document-page="${p}" title="Open PDF page ${p}">${label}</a>`;
}
function insertDocumentReference(target,doc,page){
  if(!target||!doc)return;
  const p=Math.max(1,parseInt(page||1,10)||1);
  if(replaceMentionTriggerWithHtml(target, documentLinkMarkup(doc,p))) return;
  if(replaceMentionTriggerWithText(target, '@'+(doc.name||'PDF')+' p.'+p)) return;
}
showEntityMentionPopup = function(target,query=''){
  closeEntityMentionPopup();
  const q=String(query||'').toLowerCase();
  const es=ensureEntityState();
  const entityItems=es.items.filter(e=>!q||entityDisplayName(e).toLowerCase().includes(q)||entityTagLabels(e).toLowerCase().includes(q)).slice(0,8);
  const docItems=Array.isArray(state.documents)?state.documents.filter(d=>{const tags=Array.isArray(d.tags)?d.tags:[]; const hay=[d.name,...tags].join(' ').toLowerCase(); return !q||hay.includes(q);}).slice(0,8):[];
  if(!entityItems.length&&!docItems.length)return;
  const pop=document.createElement('div'); pop.id='entityMentionPopup'; pop.className='entity-mention-popup document-mention-popup';
  if(entityItems.length){
    const h=document.createElement('div'); h.className='mention-section-label'; h.textContent='Entities'; pop.appendChild(h);
    entityItems.forEach(ent=>{const b=document.createElement('button');b.type='button';b.innerHTML=`<span class="entity-glyph">${entityIconMarkup(entityResolvedIcon(ent),ent.name)}</span><span>${escapeHtml(entityDisplayName(ent))}</span><small>${escapeHtml(entityTagLabels(ent))}</small>`; b.addEventListener('mousedown',ev=>{ev.preventDefault(); insertEntityReference(target,ent); closeEntityMentionPopup();}); pop.appendChild(b);});
  }
  if(docItems.length){
    const h=document.createElement('div'); h.className='mention-section-label'; h.textContent='PDF Documents'; pop.appendChild(h);
    docItems.forEach(doc=>{const b=document.createElement('button');b.type='button';b.innerHTML=`<span class="entity-glyph document-glyph">PDF</span><span>${escapeHtml(doc.name||'PDF')}</span><small>${escapeHtml((doc.tags||[]).map(t=>'#'+t).join(' ') || 'Select page to link')}</small>`; b.addEventListener('mousedown',ev=>{ev.preventDefault(); const page=prompt('Open PDF to page:', '1'); if(page===null)return; insertDocumentReference(target,doc,page); closeEntityMentionPopup();}); pop.appendChild(b);});
  }
  document.body.appendChild(pop); const r=target.getBoundingClientRect(); pop.style.left=Math.max(8,Math.min(window.innerWidth-320,r.left))+'px'; pop.style.top=Math.min(window.innerHeight-260,r.bottom+4)+'px';
};
document.addEventListener('click',function(e){
  const a=e.target.closest&&e.target.closest('.document-inline-link,[data-document-id][data-document-page]');
  if(!a)return;
  e.preventDefault();
  const id=a.dataset.documentId, page=parseInt(a.dataset.documentPage||'1',10)||1;
  if(window.SagaAtlasDocuments&&typeof window.SagaAtlasDocuments.openDocument==='function') window.SagaAtlasDocuments.openDocument(id,page);
  else alert('Document Library is not ready yet.');
});


/* Drag/drop PDF document links into rich text editors */
(function initDocumentDragDropLinks(){
  function editorAtDrop(evt){
    const editor = evt.target && evt.target.closest ? evt.target.closest('.rich-editor[contenteditable="true"], [contenteditable="true"]') : null;
    return editor && !editor.closest('.oracle-output') ? editor : editor;
  }
  function placeCaretFromPoint(x,y){
    let range = null;
    if (document.caretRangeFromPoint) range = document.caretRangeFromPoint(x,y);
    else if (document.caretPositionFromPoint){
      const pos = document.caretPositionFromPoint(x,y);
      if (pos){ range = document.createRange(); range.setStart(pos.offsetNode,pos.offset); range.collapse(true); }
    }
    if (!range) return false;
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    return true;
  }
  function insertAtDrop(editor, evt, doc, page){
    editor.focus();
    placeCaretFromPoint(evt.clientX, evt.clientY);
    insertDocumentReference(editor, doc, page);
    editor.dispatchEvent(new Event('input', { bubbles:true }));
  }
  document.addEventListener('dragstart', evt => {
    const drag = evt.target.closest && evt.target.closest('[data-doc-drag]');
    if (!drag || !evt.dataTransfer) return;
    const id = drag.dataset.docDrag;
    evt.dataTransfer.setData('application/x-sagaatlas-document-id', id);
    evt.dataTransfer.setData('text/plain', drag.textContent || 'PDF Document');
    evt.dataTransfer.effectAllowed = 'copy';
  });
  document.addEventListener('dragover', evt => {
    const editor = editorAtDrop(evt);
    if (!editor) return;
    const dt = evt.dataTransfer;
    if (dt && (dt.types.includes('application/x-sagaatlas-document-id') || dt.types.includes('application/x-hostile-document-id') || dt.types.includes('Files'))){
      evt.preventDefault();
      dt.dropEffect = 'copy';
      editor.classList.add('rich-editor-drop-target');
    }
  });
  document.addEventListener('dragleave', evt => {
    const editor = editorAtDrop(evt);
    if (editor) editor.classList.remove('rich-editor-drop-target');
  });
  document.addEventListener('drop', async evt => {
    const editor = editorAtDrop(evt);
    if (!editor) return;
    const dt = evt.dataTransfer;
    if (!dt) return;
    const docId = dt.getData('application/x-sagaatlas-document-id') || dt.getData('application/x-hostile-document-id');
    const hasPdfFile = dt.files && [...dt.files].some(f => f.type === 'application/pdf' || String(f.name||'').toLowerCase().endsWith('.pdf'));
    if (!docId && !hasPdfFile) return;
    evt.preventDefault();
    editor.classList.remove('rich-editor-drop-target');
    let doc = null;
    if (docId && window.SagaAtlasDocuments && typeof window.SagaAtlasDocuments.getDocumentMeta === 'function'){
      doc = window.SagaAtlasDocuments.getDocumentMeta(docId);
    }
    if (!doc && hasPdfFile && window.SagaAtlasDocuments && typeof window.SagaAtlasDocuments.importPdfFile === 'function'){
      const file = [...dt.files].find(f => f.type === 'application/pdf' || String(f.name||'').toLowerCase().endsWith('.pdf'));
      const result = await window.SagaAtlasDocuments.importPdfFile(file);
      doc = result && result.doc;
      if (typeof setStatus === 'function' && result) setStatus(result.duplicate ? 'Duplicate PDF already exists; link created to existing document' : 'PDF uploaded and linked');
    }
    if (!doc) return;
    const page = prompt('Open PDF to page:', '1');
    if (page === null) return;
    insertAtDrop(editor, evt, doc, page);
  });
})();

/* 2026-06-24: Guide placement/navigation refinements.
   Adds a center Guide view, right-panel Guide tab behavior, and top-nav Guide entry. */
(function(){
  function byId(id){ return document.getElementById(id); }
  function isRightGuideActive(){ var g=byId('guideLibraryTab'); return !!(g && !g.hidden); }
  function renderAllGuideEditors(force){
    var html=(window.state && window.state.documentGuideHtml) || (typeof state!=='undefined' && state.documentGuideHtml) || '';
    ['guideEditor','centerGuideEditor'].forEach(function(id){
      var ed=byId(id); if(!ed) return;
      if(force || ed.dataset.guideLoaded!=='1'){
        ed.innerHTML=html;
        ed.dataset.guideLoaded='1';
      }
    });
  }
  function saveGuideFrom(editor){
    if(!editor) return;
    var html=editor.innerHTML || '';
    if(typeof sanitizeHtml==='function') html=sanitizeHtml(html);
    if(typeof state!=='undefined') state.documentGuideHtml=html;
    if(window.state) window.state.documentGuideHtml=html;
    ['guideEditor','centerGuideEditor'].forEach(function(id){
      var ed=byId(id); if(ed && ed!==editor && document.activeElement!==ed) { ed.innerHTML=html; ed.dataset.guideLoaded='1'; }
    });
    if(typeof saveState==='function') saveState();
  }
  function showRightTabPublic(name){
    var oracle=byId('oracleLibraryTab'), docs=byId('documentLibraryTab'), guide=byId('guideLibraryTab');
    var oracleBtn=byId('showOracleLibraryTab'), docsBtn=byId('showDocumentLibraryTab'), guideBtn=byId('showGuideLibraryTab');
    var onDocs=name==='documents', onGuide=name==='guide';
    if(oracle){ oracle.hidden=onDocs||onGuide; oracle.classList.toggle('active-oracle-tab', !onDocs&&!onGuide); }
    if(docs){ docs.hidden=!onDocs; docs.classList.toggle('active-oracle-tab', onDocs); }
    if(guide){ guide.hidden=!onGuide; guide.classList.toggle('active-oracle-tab', onGuide); }
    if(oracleBtn) oracleBtn.classList.toggle('active', !onDocs&&!onGuide);
    if(docsBtn) docsBtn.classList.toggle('active', onDocs);
    if(guideBtn) guideBtn.classList.toggle('active', onGuide);
    if(onDocs && window.SagaAtlasDocuments && typeof window.SagaAtlasDocuments.renderDocumentLibrary==='function') window.SagaAtlasDocuments.renderDocumentLibrary();
    if(onGuide) renderAllGuideEditors(false);
  }
  window.showSagaAtlasRightTab=showRightTabPublic; window.showHostileRightTab=showRightTabPublic;
  var originalCenter=window.showCenterTab || (typeof showCenterTab==='function' ? showCenterTab : null);
  window.showCenterTab=function(tab, save){
    try { if(document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch(e) {}
    tab = tab==='guide' ? 'guide' : (tab==='journal' ? 'journal' : 'output');
    if(typeof state!=='undefined') state.activeCenterTab=tab;
    if(window.state) window.state.activeCenterTab=tab;
    var out=byId('currentOutputView'), journal=byId('journalView'), guide=byId('centerGuideView');
    var outBtn=byId('showOutputTab'), journalBtn=byId('showJournalTab'), guideBtn=byId('showCenterGuideTab');
    var title=byId('centerSectionTitle');
    if(out) out.classList.toggle('active-view', tab==='output');
    if(journal) journal.classList.toggle('active-view', tab==='journal');
    if(guide) guide.classList.toggle('active-view', tab==='guide');
    if(outBtn) outBtn.classList.toggle('active', tab==='output');
    if(journalBtn) journalBtn.classList.toggle('active', tab==='journal');
    if(guideBtn) guideBtn.classList.toggle('active', tab==='guide');
    if(title) title.textContent = tab==='guide' ? 'Guide' : (tab==='journal' ? 'Journal' : 'Scene Header');
    var topActions=byId('sceneTopActions'); if(topActions) topActions.hidden = tab!=='output';
    document.body.classList.toggle('center-focused', true);
    if(tab==='guide') renderAllGuideEditors(false);
    var target = tab==='guide' ? 'centerGuideView' : (tab==='journal' ? 'journalView' : 'currentOutputView');
    if(typeof scrollActiveCardToTop==='function') scrollActiveCardToTop(target);
    try { if(document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch(e) {}
    if(typeof forcePageTop==='function') { forcePageTop(); setTimeout(forcePageTop, 25); }
    if(save!==false && typeof saveState==='function') saveState();
  };
  try { showCenterTab = window.showCenterTab; } catch(e) {}
  function openRightGuidePanel(){
    if((typeof state!=='undefined' && state.activeCenterTab==='guide') || (window.state && window.state.activeCenterTab==='guide')){
      window.showCenterTab('journal', true);
    }
    document.body.classList.remove('entity-editor-workspace-open','entity-editor-overlay-open','crew-workspace-open','left-crew-expanded');
    var panel=byId('oraclePanel');
    if(panel){
      document.querySelectorAll('.side-panel').forEach(function(p){ p.classList.toggle('is-open', p===panel); });
      panel.scrollTop=0;
    }
    var backdrop=byId('panelBackdrop'); if(backdrop) backdrop.hidden=false;
    document.body.classList.add('side-panel-open');
    showRightTabPublic('guide');
  }
  function forcePageTop(){
    try {
      if(document.activeElement && document.activeElement.blur) document.activeElement.blur();
      window.scrollTo({top:0,left:0,behavior:'auto'});
      document.documentElement.scrollTop=0;
      document.body.scrollTop=0;
      var layout=document.querySelector('.layout'); if(layout) layout.scrollTop=0;
    } catch(e) { try { window.scrollTo(0,0); } catch(_) {} }
  }
  function bindGuideNav(){
    var cbtn=byId('showCenterGuideTab');
    if(cbtn && !cbtn.dataset.guideNavBound){
      cbtn.dataset.guideNavBound='1';
      cbtn.addEventListener('click', function(ev){
        ev.preventDefault();
        if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
        forcePageTop();
        if(isRightGuideActive()) showRightTabPublic('oracles');
        window.showCenterTab('guide', true);
        forcePageTop();
        setTimeout(forcePageTop, 25);
      }, true);
    }
    var rbtn=byId('showGuideLibraryTab');
    if(rbtn && !rbtn.dataset.guideNavBound){
      rbtn.dataset.guideNavBound='1';
      rbtn.addEventListener('click', function(ev){
        ev.preventDefault(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
        if((typeof state!=='undefined' && state.activeCenterTab==='guide') || (window.state && window.state.activeCenterTab==='guide')) window.showCenterTab('journal', true);
        showRightTabPublic('guide');
      }, true);
    }
    var obtn=byId('showOracleLibraryTab');
    if(obtn && !obtn.dataset.guideNavBound){ obtn.dataset.guideNavBound='1'; obtn.addEventListener('click', function(ev){ ev.preventDefault(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation(); showRightTabPublic('oracles'); }, true); }
    var dbtn=byId('showDocumentLibraryTab');
    if(dbtn && !dbtn.dataset.guideNavBound){ dbtn.dataset.guideNavBound='1'; dbtn.addEventListener('click', function(ev){ ev.preventDefault(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation(); showRightTabPublic('documents'); }, true); }
    var top=byId('openGuidePanel');
    if(top && !top.dataset.guideNavBound){
      top.dataset.guideNavBound='1';
      top.addEventListener('click', function(ev){ ev.preventDefault(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation(); openRightGuidePanel(); }, true);
    }
    ['guideEditor','centerGuideEditor'].forEach(function(id){
      var ed=byId(id); if(ed && !ed.dataset.guideSyncBound){ ed.dataset.guideSyncBound='1'; ed.addEventListener('input', function(){ saveGuideFrom(ed); }); }
    });
    var clear=byId('clearCenterGuideEditor');
    if(clear && !clear.dataset.guideNavBound){ clear.dataset.guideNavBound='1'; clear.addEventListener('click', function(){ if(confirm('Clear the Guide editor?')){ if(typeof state!=='undefined') state.documentGuideHtml=''; if(window.state) window.state.documentGuideHtml=''; renderAllGuideEditors(true); if(typeof saveState==='function') saveState(); } }); }
    renderAllGuideEditors(false);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', bindGuideNav); else bindGuideNav();
  setTimeout(bindGuideNav, 600);
})();


// Keep body-section tab/action buttons from stealing scroll focus from the page and stop focused editors from auto-scrolling into view.
(function(){
  function resetPageTop(){
    try {
      if(document.activeElement && document.activeElement.blur) document.activeElement.blur();
      window.scrollTo({top:0,left:0,behavior:'auto'});
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      var layout=document.querySelector('.layout'); if(layout) layout.scrollTop=0;
      document.querySelectorAll('.panel,.center-view,.left-view,.oracle-panel,.output').forEach(function(el){ try{ el.scrollTop=0; }catch(e){} });
    } catch(e) { try { window.scrollTo(0,0); } catch(_) {} }
  }
  function hardBind(id, handler){
    var btn=document.getElementById(id);
    if(!btn || btn.dataset.hardNoScrollBound) return;
    btn.dataset.hardNoScrollBound='1';
    btn.addEventListener('click', function(ev){
      ev.preventDefault();
      if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
      resetPageTop();
      handler(ev);
      resetPageTop();
      setTimeout(resetPageTop, 0);
      setTimeout(resetPageTop, 60);
    }, true);
  }
  function bindNoScrollBodyButtons(){
    hardBind('showJournalTab', function(){ if(typeof showLeftTab==='function') showLeftTab('scene'); if(window.showCenterTab) window.showCenterTab('journal', true); });
    hardBind('showOutputTab', function(){ if(typeof showLeftTab==='function') showLeftTab('scene'); if(window.showCenterTab) window.showCenterTab('output', true); });
    hardBind('showCenterGuideTab', function(){
      if(typeof isRightGuideActive==='function' && isRightGuideActive() && typeof showRightTabPublic==='function') showRightTabPublic('oracles');
      if(window.showCenterTab) window.showCenterTab('guide', true);
    });
    ['showOracleLibraryTab','showGuideLibraryTab','showDocumentLibraryTab'].forEach(function(id){
      var btn=document.getElementById(id); if(!btn || btn.dataset.softNoScrollBound) return; btn.dataset.softNoScrollBound='1';
      btn.addEventListener('click', function(){ setTimeout(resetPageTop,0); setTimeout(resetPageTop,60); }, true);
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', bindNoScrollBodyButtons); else bindNoScrollBodyButtons();
  setTimeout(bindNoScrollBodyButtons, 500);
})();

// Fix main Oracles nav so it opens the right Oracles panel instead of leaving/activating Entity views.
(function(){
  function byId(id){ return document.getElementById(id); }
  function resetPageTop(){
    try {
      if(document.activeElement && document.activeElement.blur) document.activeElement.blur();
      window.scrollTo({top:0,left:0,behavior:'auto'});
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      var layout=document.querySelector('.layout'); if(layout) layout.scrollTop=0;
      document.querySelectorAll('.panel,.center-view,.left-view,.oracle-panel,.output').forEach(function(el){ try{ el.scrollTop=0; }catch(e){} });
    } catch(e) { try { window.scrollTo(0,0); } catch(_) {} }
  }
  function showOraclesRightTab(){
    if(window.showSagaAtlasRightTab){
      window.showSagaAtlasRightTab('oracles');
      return;
    }
    var oracle=byId('oracleLibraryTab'), docs=byId('documentLibraryTab'), guide=byId('guideLibraryTab');
    var oracleBtn=byId('showOracleLibraryTab'), docsBtn=byId('showDocumentLibraryTab'), guideBtn=byId('showGuideLibraryTab');
    if(oracle){ oracle.hidden=false; oracle.classList.add('active-oracle-tab'); }
    if(docs){ docs.hidden=true; docs.classList.remove('active-oracle-tab'); }
    if(guide){ guide.hidden=true; guide.classList.remove('active-oracle-tab'); }
    if(oracleBtn) oracleBtn.classList.add('active');
    if(docsBtn) docsBtn.classList.remove('active');
    if(guideBtn) guideBtn.classList.remove('active');
  }
  function openOraclePanelFromMain(ev){
    if(ev){ ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation(); }
    try { if(typeof closeEntityEditorOverlay === 'function') closeEntityEditorOverlay(); } catch(e) {}
    document.body.classList.remove('entity-editor-workspace-open','entity-editor-overlay-open','crew-workspace-open','left-crew-expanded');
    if(window.showLeftTab) window.showLeftTab('scene', false);
    var panel=byId('oraclePanel');
    if(panel){
      document.querySelectorAll('.side-panel').forEach(function(p){ p.classList.toggle('is-open', p===panel); });
      panel.scrollTop=0;
    }
    var backdrop=byId('panelBackdrop'); if(backdrop) backdrop.hidden=false;
    document.body.classList.add('side-panel-open');
    showOraclesRightTab();
    resetPageTop();
    setTimeout(resetPageTop, 0);
    setTimeout(resetPageTop, 60);
  }
  function bindOracleMainNavFix(){
    var btn=byId('openOraclePanel');
    if(!btn || btn.dataset.oracleMainNavFix) return;
    btn.dataset.oracleMainNavFix='1';
    btn.addEventListener('click', openOraclePanelFromMain, true);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', bindOracleMainNavFix); else bindOracleMainNavFix();
  setTimeout(bindOracleMainNavFix, 500);
})();

// Final hard override: main nav Oracles must affect only the right Oracles panel.
(function(){
  function byId(id){ return document.getElementById(id); }
  function resetTop(){
    try{
      if(document.activeElement && document.activeElement.blur) document.activeElement.blur();
      window.scrollTo({top:0,left:0,behavior:'auto'});
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      var layout=document.querySelector('.layout'); if(layout) layout.scrollTop=0;
    }catch(e){}
  }
  function showOraclesOnly(ev){
    if(ev){ ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation(); }
    var panel=byId('oraclePanel');
    if(panel){
      document.querySelectorAll('.side-panel').forEach(function(p){ p.classList.toggle('is-open', p===panel); });
      panel.scrollTop=0;
    }
    var backdrop=byId('panelBackdrop'); if(backdrop) backdrop.hidden=false;
    document.body.classList.add('side-panel-open');
    if(typeof window.showSagaAtlasRightTab==='function'){
      window.showSagaAtlasRightTab('oracles');
    }else if(typeof window.showRightTabPublic==='function'){
      window.showRightTabPublic('oracles');
    }else{
      var oracle=byId('oracleLibraryTab'), docs=byId('documentLibraryTab'), guide=byId('guideLibraryTab');
      var oracleBtn=byId('showOracleLibraryTab'), docsBtn=byId('showDocumentLibraryTab'), guideBtn=byId('showGuideLibraryTab');
      if(oracle){ oracle.hidden=false; oracle.classList.add('active-oracle-tab'); }
      if(docs){ docs.hidden=true; docs.classList.remove('active-oracle-tab'); }
      if(guide){ guide.hidden=true; guide.classList.remove('active-oracle-tab'); }
      if(oracleBtn) oracleBtn.classList.add('active');
      if(docsBtn) docsBtn.classList.remove('active');
      if(guideBtn) guideBtn.classList.remove('active');
    }
    resetTop(); setTimeout(resetTop,0); setTimeout(resetTop,60);
    return false;
  }
  function replaceOracleNavButton(){
    var old=byId('openOraclePanel');
    if(!old || old.dataset.oracleHardOverride==='1') return;
    var clone=old.cloneNode(true);
    clone.dataset.oracleHardOverride='1';
    old.parentNode.replaceChild(clone, old);
    clone.addEventListener('click', showOraclesOnly, true);
    clone.addEventListener('click', showOraclesOnly, false);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', replaceOracleNavButton); else replaceOracleNavButton();
  setTimeout(replaceOracleNavButton, 250);
  setTimeout(replaceOracleNavButton, 1000);
})();

/* 2026-06-24 definitive top-nav isolation fix.
   The app had accumulated several target-level click handlers during prior patches.
   Some of those handlers called showLeftTab('scene'), so each new fix only moved
   the Scene Builder side effect to a neighboring button. This document-capture
   guard intercepts main navigation before target handlers and gives each top-nav
   button one explicit, isolated responsibility. */
(function(){
  function byId(id){ return document.getElementById(id); }
  function resetTop(){
    try{
      if(document.activeElement && document.activeElement.blur) document.activeElement.blur();
      window.scrollTo({top:0,left:0,behavior:'auto'});
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      var layout=document.querySelector('.layout'); if(layout) layout.scrollTop=0;
    }catch(e){}
  }
  function setRightTab(tab){
    if(typeof window.showSagaAtlasRightTab === 'function'){
      window.showSagaAtlasRightTab(tab);
      return;
    }
    if(typeof window.showRightTabPublic === 'function'){
      window.showRightTabPublic(tab);
      return;
    }
    var tabs = {
      oracles: ['oracleLibraryTab','showOracleLibraryTab'],
      guide: ['guideLibraryTab','showGuideLibraryTab'],
      documents: ['documentLibraryTab','showDocumentLibraryTab']
    };
    Object.keys(tabs).forEach(function(key){
      var panel=byId(tabs[key][0]);
      var btn=byId(tabs[key][1]);
      var active = key === tab;
      if(panel){ panel.hidden = !active; panel.classList.toggle('active-oracle-tab', active); }
      if(btn) btn.classList.toggle('active', active);
    });
  }
  function openRightPanel(tab){
    var panel=byId('oraclePanel');
    if(panel){
      document.querySelectorAll('.side-panel').forEach(function(p){ p.classList.toggle('is-open', p===panel); });
      panel.scrollTop=0;
    }
    var backdrop=byId('panelBackdrop'); if(backdrop) backdrop.hidden=false;
    document.body.classList.add('side-panel-open');
    setRightTab(tab);
  }
  function showCenterOnly(tab){
    if(typeof window.showCenterTab === 'function') window.showCenterTab(tab, true);
    else if(typeof showCenterTab === 'function') showCenterTab(tab, true);
  }
  function hardHandleMainNav(ev){
    var btn = ev.target && ev.target.closest && ev.target.closest('.top-nav button, .mobile-panel-tabs.top-nav button');
    if(!btn) return;
    var id = btn.id;
    var handled = true;
    if(id === 'showJournalNav'){
      showCenterOnly('journal');
    }else if(id === 'showSceneElementsNav' || id === 'focusOutputPanel'){
      showCenterOnly('output');
    }else if(id === 'openOraclePanel'){
      openRightPanel('oracles');
    }else if(id === 'openGuidePanel'){
      // Main Guide opens the right Guide tab; if the center Guide is active,
      // return the center to Journal so the same Guide card is not duplicated.
      try{
        if(window.state && window.state.activeCenterTab === 'guide') showCenterOnly('journal');
        var cv=byId('centerGuideView');
        if(cv && cv.classList.contains('active-view')) showCenterOnly('journal');
      }catch(e){}
      openRightPanel('guide');
    }else if(id === 'openControlsPanel'){
      if(typeof window.showLeftTab === 'function') window.showLeftTab('scene', true);
      var panel=byId('controlsPanel');
      if(panel){ document.querySelectorAll('.side-panel').forEach(function(p){ p.classList.toggle('is-open', p===panel); }); }
      var backdrop=byId('panelBackdrop'); if(backdrop) backdrop.hidden=false;
      document.body.classList.add('side-panel-open');
    }else if(id === 'openCrewLinkPanel'){
      if(typeof window.showLeftTab === 'function') window.showLeftTab('crew', true); document.body.classList.add('crew-workspace-open'); document.body.classList.remove('entity-editor-workspace-open','entity-editor-overlay-open');
    }else if(id === 'openLivingShipPanel'){
      if(typeof window.showLeftTab === 'function') window.showLeftTab('living', true);
    }else if(id === 'openEntityListPanel'){
      if(typeof window.showLeftTab === 'function') window.showLeftTab('entityList', true);
    }else{
      handled = false;
    }
    if(handled){
      ev.preventDefault();
      ev.stopPropagation();
      if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
      resetTop(); setTimeout(resetTop,0); setTimeout(resetTop,60);
      return false;
    }
  }
  document.addEventListener('click', hardHandleMainNav, true);
})();


/* 2026-06-24 Docs Sync hard binding: Sync Docs reads assets/index.json and adds server docs to the library. */
(function(){
  function bindDocsSyncButton(){
    const old = document.getElementById('syncGithubDocsFolder');
    if(!old || old.dataset.relativeDocsSyncBound === '1') return;
    const btn = old.cloneNode(true);
    btn.dataset.relativeDocsSyncBound = '1';
    old.parentNode.replaceChild(btn, old);
    btn.addEventListener('click', async function(ev){
      ev.preventDefault();
      ev.stopPropagation();
      if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
      const status = document.getElementById('githubDocsStatus');
      if(status) status.textContent = 'Reading assets/index.json...';
      try{
        if(window.SagaAtlasDocuments && typeof window.SagaAtlasDocuments.syncGithubDocsFolder === 'function'){
          await window.SagaAtlasDocuments.syncGithubDocsFolder();
        } else {
          throw new Error('Document library is not initialized yet. Refresh the page and try again.');
        }
      }catch(err){
        const msg = 'Could not read assets/index.json: ' + (err && err.message ? err.message : err);
        if(status) status.textContent = msg;
        alert(msg);
      }
      return false;
    }, true);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindDocsSyncButton); else bindDocsSyncButton();
  setTimeout(bindDocsSyncButton, 300);
  setTimeout(bindDocsSyncButton, 1000);
})();


/* 2026-06-24 final docs/crew fixes: manifest paths, Crew Link full workspace. */
(function(){
  function topReset(){try{window.scrollTo({top:0,left:0,behavior:'auto'});}catch(e){window.scrollTo(0,0);}}
  function forceCrewWorkspace(){
    document.body.classList.add('crew-workspace-open','left-crew-expanded');
    document.body.classList.remove('entity-editor-workspace-open','entity-editor-overlay-open');
    document.querySelectorAll('.left-view').forEach(function(p){p.classList.remove('active-left-view');});
    var crew=document.getElementById('crewLinkPanel');
    if(crew) crew.classList.add('active-left-view');
    if(window.state){ window.state.activeLeftTab='crew'; try{ if(typeof saveState==='function') saveState(); }catch(e){} }
    topReset(); setTimeout(topReset,0);
  }
  function bindCrewFullWidth(){
    ['openCrewLinkPanel'].forEach(function(id){
      var b=document.getElementById(id); if(!b || b.dataset.crewFullWidthBound==='1') return;
      b.dataset.crewFullWidthBound='1';
      b.addEventListener('click', function(ev){ ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation(); forceCrewWorkspace(); return false; }, true);
    });
    document.querySelectorAll('[data-left-tab="crew"]').forEach(function(b){
      if(b.dataset.crewFullWidthBound==='1') return;
      b.dataset.crewFullWidthBound='1';
      b.addEventListener('click', function(ev){ ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation(); forceCrewWorkspace(); return false; }, true);
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', bindCrewFullWidth); else bindCrewFullWidth();
  setTimeout(bindCrewFullWidth,250); setTimeout(bindCrewFullWidth,1000);
})();

/* 2026-06-24 final workflow fixes: sorted entities, scene-button tab lock, Guide campaign JSON, Crew->Journal reset. */
(function(){
  function byId(id){ return document.getElementById(id); }
  function entityNameForSort(ent){
    try{
      if(typeof entityDisplayName === 'function') return String(entityDisplayName(ent)||'').toLowerCase();
    }catch(e){}
    return String((ent && ent.name) || '').toLowerCase();
  }
  function sortEntityState(){
    try{
      var es = (typeof ensureEntityState === 'function') ? ensureEntityState() : (state && state.entities);
      if(es && Array.isArray(es.items)){
        es.items.sort(function(a,b){
          var at=String(a && a.type || ''), bt=String(b && b.type || '');
          if(at !== bt) return at.localeCompare(bt);
          return entityNameForSort(a).localeCompare(entityNameForSort(b), undefined, {numeric:true, sensitivity:'base'});
        });
      }
    }catch(e){}
  }
  function rememberOpenEntityLibraryGroups(){
    try{
      if(typeof ensureEntityState !== 'function') return;
      var es=ensureEntityState(); es.openGroups=es.openGroups||{};
      ['entityDirectory','entityListDirectory'].forEach(function(dirId){
        var dir=byId(dirId); if(!dir) return;
        dir.querySelectorAll('details.entity-dir-group').forEach(function(details){
          var label=(details.querySelector('summary span')||{}).textContent||'';
          var matchType='';
          if(typeof ENTITY_TYPES !== 'undefined'){
            Object.entries(ENTITY_TYPES).forEach(function(pair){ if(pair[1] && pair[1].label===label) matchType=pair[0]; });
          }
          if(matchType && details.open) es.openGroups[dirId+':'+matchType]=true;
        });
      });
    }catch(e){}
  }
  try{
    if(typeof renderEntityDirectoryOnly === 'function' && !renderEntityDirectoryOnly.__sortedPatch){
      var oldRenderDirectory=renderEntityDirectoryOnly;
      renderEntityDirectoryOnly=function(){ sortEntityState(); return oldRenderDirectory.apply(this, arguments); };
      renderEntityDirectoryOnly.__sortedPatch=true;
    }
    if(typeof renderEntityListPanelDirectory === 'function' && !renderEntityListPanelDirectory.__sortedPatch){
      var oldRenderList=renderEntityListPanelDirectory;
      renderEntityListPanelDirectory=function(){ sortEntityState(); return oldRenderList.apply(this, arguments); };
      renderEntityListPanelDirectory.__sortedPatch=true;
    }
  }catch(e){}
  document.addEventListener('dragstart', function(ev){
    if(ev.target && ev.target.closest && ev.target.closest('.entity-dir-item')) rememberOpenEntityLibraryGroups();
  }, true);

  function forceSceneBuilderAfterAction(){
    try{
      if(typeof state !== 'undefined') state.activeLeftTab='scene';
      if(window.state) window.state.activeLeftTab='scene';
      if(typeof showLeftTab === 'function') showLeftTab('scene', true);
    }catch(e){}
  }
  ['generateScene','generateMission','generateWorld','advanceOnly'].forEach(function(id){
    var btn=byId(id); if(!btn || btn.dataset.sceneStayBound) return;
    btn.dataset.sceneStayBound='1';
    btn.addEventListener('click', function(){
      try{ if(typeof state !== 'undefined') state.activeLeftTab='scene'; }catch(e){}
      setTimeout(forceSceneBuilderAfterAction, 0);
      setTimeout(forceSceneBuilderAfterAction, 80);
    }, true);
  });

  function syncGuideIntoState(){
    try{
      var active=document.activeElement;
      var ed = (active && (active.id==='guideEditor' || active.id==='centerGuideEditor')) ? active : (byId('centerGuideEditor') || byId('guideEditor'));
      if(ed){
        if(typeof state !== 'undefined') state.documentGuideHtml = ed.innerHTML || '';
        if(window.state) window.state.documentGuideHtml = ed.innerHTML || '';
      }
    }catch(e){}
  }
  function exportCampaignJsonWithGuide(ev){
    var btn=byId('exportJson');
    if(!btn) return;
    if(ev && ev.target && ev.target.closest && ev.target.closest('#exportJson')){
      ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
      try{
        if(typeof readFormAndSave === 'function') readFormAndSave();
        syncGuideIntoState();
        var payload = (typeof state !== 'undefined') ? state : (window.state || {});
        payload.documentGuideHtml = payload.documentGuideHtml || '';
        var blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
        var a=document.createElement('a');
        a.href=URL.createObjectURL(blob);
        var stamp=new Date().toISOString().slice(0,19).replaceAll(':','-');
        a.download='saga-atlas-'+stamp+'.json';
        a.click();
        URL.revokeObjectURL(a.href);
        if(typeof setStatus === 'function') setStatus('Exported Campaign JSON including Guide');
        if(typeof saveState === 'function') saveState();
      }catch(err){ alert('Could not export campaign JSON: '+(err && err.message ? err.message : err)); }
      return false;
    }
  }
  window.addEventListener('click', exportCampaignJsonWithGuide, true);

  function resetFromCrewToJournal(ev){
    var btn = ev.target && ev.target.closest && ev.target.closest('#showJournalNav');
    if(!btn) return;
    ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
    try{
      document.body.classList.remove('crew-workspace-open','entity-editor-workspace-open','entity-editor-overlay-open');
      if(typeof showLeftTab === 'function') showLeftTab('entityList', true);
      if(window.showCenterTab) window.showCenterTab('journal', true); else if(typeof showCenterTab === 'function') showCenterTab('journal', true);
      if(typeof renderEntityListPanelDirectory === 'function') renderEntityListPanelDirectory();
      if(typeof renderJournal === 'function') renderJournal();
      if(typeof saveState === 'function') saveState();
      setTimeout(function(){ try{ window.scrollTo(0,0); }catch(e){} },0);
    }catch(e){}
    return false;
  }
  window.addEventListener('click', resetFromCrewToJournal, true);

  function importGuideAfterCampaign(){
    try{
      var imp=byId('importJson');
      if(!imp || imp.dataset.guideImportPatch) return;
      imp.dataset.guideImportPatch='1';
      imp.addEventListener('change', function(){
        setTimeout(function(){
          try{
            var html=(typeof state!=='undefined' && state.documentGuideHtml) || (window.state && window.state.documentGuideHtml) || '';
            ['guideEditor','centerGuideEditor'].forEach(function(id){ var ed=byId(id); if(ed){ ed.innerHTML=html; ed.dataset.guideLoaded='1'; }});
          }catch(e){}
        }, 250);
      });
    }catch(e){}
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', importGuideAfterCampaign); else importGuideAfterCampaign();
  setTimeout(function(){ sortEntityState(); try{ if(typeof renderEntityListPanelDirectory==='function') renderEntityListPanelDirectory(); }catch(e){} }, 600);
})();

/* 2026-06-24: Clear Guide when starting/selecting a new campaign. */
(function(){
  function byId(id){ return document.getElementById(id); }
  function clearGuideStateAndEditors(){
    try{
      if (typeof state !== 'undefined') state.documentGuideHtml = '';
      if (window.state) window.state.documentGuideHtml = '';
      ['guideEditor','centerGuideEditor'].forEach(function(id){
        var ed = byId(id);
        if (ed){ ed.innerHTML = ''; ed.dataset.guideLoaded = '1'; }
      });
    }catch(e){}
  }
  try{
    if (typeof window.newCampaign !== 'function' && typeof newCampaign === 'function') window.newCampaign = newCampaign;
  }catch(e){}
  try{
    if (typeof newCampaign === 'function' && !newCampaign.__clearGuidePatch){
      var originalNewCampaign = newCampaign;
      newCampaign = function(){
        var result = originalNewCampaign.apply(this, arguments);
        clearGuideStateAndEditors();
        try{ if (typeof saveState === 'function') saveState(); }catch(e){}
        return result;
      };
      newCampaign.__clearGuidePatch = true;
      window.newCampaign = newCampaign;
    }
  }catch(e){}
  document.addEventListener('click', function(ev){
    var btn = ev.target && ev.target.closest && ev.target.closest('#newCampaign');
    if (!btn) return;
    setTimeout(function(){ clearGuideStateAndEditors(); try{ if (typeof saveState === 'function') saveState(); }catch(e){} }, 50);
  }, true);
})();


/* 2026-06-24 baseline reapply: reliable Campaign JSON import + Lore entity group. */
(function(){
  function byId(id){ return document.getElementById(id); }

  function installLoreEntityType(){
    try{
      if(typeof ENTITY_TYPES !== 'undefined' && !ENTITY_TYPES.lore){
        ENTITY_TYPES.lore = { label:'Lore', singular:'Lore', icon:'✦' };
      }
      if(typeof ENTITY_SUBTYPES !== 'undefined' && !ENTITY_SUBTYPES.lore){
        ENTITY_SUBTYPES.lore = [
          {key:'lore', label:'Lore', icon:'✦'},
          {key:'history', label:'History', icon:'◷'},
          {key:'rumor', label:'Rumor', icon:'❖'},
          {key:'mystery', label:'Mystery', icon:'◇'},
          {key:'culture', label:'Culture', icon:'◈'},
          {key:'technology', label:'Technology', icon:'◫'}
        ];
      }
      if(typeof ENTITY_TAGS !== 'undefined' && !ENTITY_TAGS.lore){
        ENTITY_TAGS.lore = [];
      }
      if(typeof state !== 'undefined'){
        if(!state.entityTagCatalog || typeof state.entityTagCatalog !== 'object') state.entityTagCatalog = {};
        if(!Array.isArray(state.entityTagCatalog.lore)) state.entityTagCatalog.lore = [];
      }
    }catch(e){ console.warn('Lore entity type install failed', e); }
  }

  function normalizeOneEntity(ent, i){
    ent = ent && typeof ent === 'object' ? {...ent} : {};
    ent.id = String(ent.id || ('ent_import_' + Date.now().toString(36) + '_' + i + '_' + Math.random().toString(36).slice(2,6)));
    ent.type = String(ent.type || ent.kind || ent.category || 'asset').toLowerCase();
    if(ent.type === 'person' || ent.type === 'character' || ent.type === 'characters') ent.type = 'npc';
    if(ent.type === 'locations') ent.type = 'location';
    if(ent.type === 'factions') ent.type = 'faction';
    if(ent.type === 'assets') ent.type = 'asset';
    if(ent.type === 'lore' || ent.type === 'history' || ent.type === 'rumor' || ent.type === 'mystery') ent.type = 'lore';
    if(typeof ENTITY_TYPES !== 'undefined' && !ENTITY_TYPES[ent.type]) ent.type = 'asset';
    ent.name = ent.name || ent.title || ('Imported ' + (ent.type || 'entity'));
    ent.tags = Array.isArray(ent.tags) ? ent.tags.filter(Boolean).map(String) : [];
    ent.links = ent.links == null ? '' : ent.links;
    ent.overview = ent.overview || ent.description || ent.notes || '';
    ent.revealed = ent.revealed || '';
    ent.relationshipDescription = ent.relationshipDescription || '';
    ent.thumbnailImage = ent.thumbnailImage || '';
    if(!Array.isArray(ent.relationships)){
      if(ent.relationships && typeof ent.relationships === 'object'){
        ent.relationships = Object.entries(ent.relationships).map(function(pair){ return {id:String(pair[0]), description:String(pair[1]||'')}; });
      }else ent.relationships = [];
    }
    ent.relationships = ent.relationships.map(function(r){
      if(typeof r === 'string') return {id:r, description:''};
      return {id:String(r.id || r.targetId || r.entityId || ''), description:r.description || r.note || r.relationshipDescription || ''};
    }).filter(function(r){ return r.id && r.id !== ent.id; });
    ent.thumbnail = ent.thumbnailImage ? ('img:' + ent.thumbnailImage) : (ent.thumbnail || ((typeof ENTITY_TYPES !== 'undefined' && ENTITY_TYPES[ent.type]) ? ENTITY_TYPES[ent.type].icon : '◇'));
    return ent;
  }

  function normalizeCampaignEntities(data){
    var source = data && (data.entities || data.entityRecords || data.entityLibrary || data.entityState || data);
    if(!source) return {items:[], activeId:null, history:[], openGroups:{}};
    var items = [];
    var activeId = source.activeId || null;
    var history = Array.isArray(source.history) ? source.history.slice() : [];
    var openGroups = source.openGroups && typeof source.openGroups === 'object' ? {...source.openGroups} : {};
    if(Array.isArray(source)) items = source;
    else if(Array.isArray(source.items)) items = source.items;
    else if(Array.isArray(source.entities)) items = source.entities;
    else if(source && typeof source === 'object') items = Object.values(source).filter(function(v){ return v && typeof v === 'object' && (v.name || v.title || v.type || v.kind); });
    items = items.map(normalizeOneEntity);
    activeId = activeId && items.some(function(e){ return e.id === activeId; }) ? activeId : (items[0] && items[0].id) || null;
    history = history.filter(function(id){ return items.some(function(e){ return e.id === id; }); });
    return {items:items, activeId:activeId, history:history, openGroups:openGroups};
  }

  function normalizeCampaignDocuments(data){
    var docs = data && (data.documents || data.documentLibrary || data.pdfDocuments || data.docs);
    if(!Array.isArray(docs)) return [];
    return docs.map(function(d, i){
      d = d && typeof d === 'object' ? {...d} : {name:String(d||'PDF Document')};
      d.id = String(d.id || ('pdf_import_' + Date.now().toString(36) + '_' + i + '_' + Math.random().toString(36).slice(2,6)));
      d.name = d.name || d.title || d.filename || 'PDF Document';
      d.tags = Array.isArray(d.tags) ? d.tags.filter(Boolean).map(String) : [];
      d.type = d.type || 'application/pdf';
      d.size = Number(d.size || 0) || 0;
      d.serverPath = d.serverPath || d.githubPath || d.path || '';
      d.githubPath = d.githubPath || d.serverPath || '';
      d.githubPagesUrl = d.githubPagesUrl || d.githubDownloadUrl || d.url || '';
      d.githubDownloadUrl = d.githubDownloadUrl || d.githubPagesUrl || '';
      d.hasLocalBlob = !!d.hasLocalBlob;
      d.source = d.source || (d.serverPath || d.githubPath || d.githubPagesUrl ? 'server' : (d.hasLocalBlob ? 'local' : 'metadata'));
      d.addedAt = d.addedAt || new Date().toISOString();
      delete d.blob;
      return d;
    }).filter(function(d){
      var p = String(d.serverPath || d.githubPath || d.githubPagesUrl || d.githubDownloadUrl || d.name || '').toLowerCase().split('?')[0].split('#')[0];
      return p.endsWith('.pdf') || d.type === 'application/pdf';
    });
  }

  function rebuildEntityTagCatalog(){
    try{
      if(!state.entityTagCatalog || typeof state.entityTagCatalog !== 'object') state.entityTagCatalog = {};
      Object.keys(ENTITY_TYPES || {}).forEach(function(type){ if(!Array.isArray(state.entityTagCatalog[type])) state.entityTagCatalog[type] = []; });
      var seen = {};
      Object.keys(ENTITY_TYPES || {}).forEach(function(type){ seen[type] = new Set((state.entityTagCatalog[type]||[]).map(function(t){return t.key;})); });
      ((state.entities && state.entities.items) || []).forEach(function(ent){
        var type = ent.type || 'asset';
        if(!state.entityTagCatalog[type]) state.entityTagCatalog[type] = [];
        if(!seen[type]) seen[type] = new Set();
        (Array.isArray(ent.tags) ? ent.tags : []).forEach(function(tag){
          tag = String(tag || '').trim(); if(!tag || seen[type].has(tag)) return;
          seen[type].add(tag);
          state.entityTagCatalog[type].push({key:tag, label:tag.replace(/[-_]/g,' ').replace(/\b\w/g,function(c){return c.toUpperCase();}), icon:'◇'});
        });
      });
    }catch(e){ console.warn('Could not rebuild entity tag catalog', e); }
  }

  function renderImportedCampaign(){
    try{ if(typeof render === 'function') render(); }catch(e){}
    try{ if(typeof renderJournal === 'function') renderJournal(); }catch(e){}
    try{ if(typeof renderEntityTracker === 'function') renderEntityTracker(); }catch(e){}
    try{ if(typeof renderEntityListPanelDirectory === 'function') renderEntityListPanelDirectory(); }catch(e){}
    try{ if(typeof renderDocumentLibrary === 'function') renderDocumentLibrary(); }catch(e){}
    var guideHtml = (typeof state !== 'undefined' && state.documentGuideHtml) || '';
    ['guideEditor','centerGuideEditor'].forEach(function(id){
      var ed = byId(id);
      if(ed){ ed.innerHTML = guideHtml; ed.dataset.guideLoaded = '1'; }
    });
  }

  function readFileAsText(file){
    return new Promise(function(resolve, reject){
      var reader = new FileReader();
      reader.onload = function(){ resolve(String(reader.result || '')); };
      reader.onerror = function(){ reject(reader.error || new Error('Could not read file')); };
      reader.readAsText(file);
    });
  }

  async function importCampaignJsonReliably(input){
    var file = input && input.files && input.files[0];
    if(!file) return;
    try{
      var imported = JSON.parse(await readFileAsText(file));
      installLoreEntityType();
      var next = {...DEFAULT_STATE, ...imported};
      next.entities = normalizeCampaignEntities(imported);
      next.documents = normalizeCampaignDocuments(imported);
      next.journal = Array.isArray(imported.journal) ? imported.journal : (Array.isArray(imported.entries) ? imported.entries : []);
      next.documentGuideHtml = imported.documentGuideHtml || imported.guideHtml || imported.guide || '';
      if(!next.entityTagCatalog || typeof next.entityTagCatalog !== 'object') next.entityTagCatalog = {};
      state = next;
      rebuildEntityTagCatalog();
      try{ if(typeof ensureReciprocalEntityRelationships === 'function') ensureReciprocalEntityRelationships(); }catch(e){}
      try{ if(typeof saveState === 'function') saveState(); }catch(e){}
      renderImportedCampaign();
      var counts = [
        (state.entities && state.entities.items ? state.entities.items.length : 0) + ' entities',
        (Array.isArray(state.journal) ? state.journal.length : 0) + ' journal entries',
        (state.documentGuideHtml ? 'Guide imported' : 'Guide blank'),
        (Array.isArray(state.documents) ? state.documents.length : 0) + ' document records'
      ].join(', ');
      try{ if(typeof setStatus === 'function') setStatus('Imported campaign JSON: ' + counts); }catch(e){}
      alert('Imported campaign JSON: ' + counts + '.\n\nNote: local PDF file blobs are browser-only; imported document records will open from server paths when available or prompt to attach a local copy.');
    }catch(err){
      alert('Could not import Campaign JSON: ' + (err && err.message ? err.message : err));
      console.error(err);
    }finally{
      try{ input.value = ''; }catch(e){}
    }
  }

  function bindReliableCampaignImport(){
    var input = byId('importJson');
    if(!input || input.dataset.reliableCampaignImport === '1') return;
    input.dataset.reliableCampaignImport = '1';
    input.addEventListener('change', function(ev){
      ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
      importCampaignJsonReliably(input);
      return false;
    }, true);
  }

  function patchEntityHelpersForLore(){
    installLoreEntityType();
    try{
      pruneUnusedEntityTags = function(){
        var catalog = entityTagCatalog();
        var used = {};
        Object.keys(ENTITY_TYPES || {}).forEach(function(type){ used[type] = new Set(); });
        ((state.entities && state.entities.items) || []).forEach(function(ent){
          var type = ent.type || 'asset';
          if(!used[type]) used[type] = new Set();
          (ent.tags || []).filter(Boolean).forEach(function(tag){ used[type].add(tag); });
        });
        Object.keys(catalog).forEach(function(type){ catalog[type] = (catalog[type] || []).filter(function(tag){ return used[type] && used[type].has(tag.key); }); });
      };
    }catch(e){}
    try{
      if(typeof addEntity === 'function' && !addEntity.__lorePatch){
        var originalAddEntity = addEntity;
        addEntity = function(type, name){
          installLoreEntityType();
          type = String(type || 'npc').toLowerCase();
          if(type === 'history' || type === 'rumor' || type === 'mystery') type = 'lore';
          var es = ensureEntityState();
          var ent = defaultEntity(type);
          if(name) ent.name = String(name);
          es.items.push(ent);
          setActiveEntity(ent.id, false);
          saveState();
          renderEntityTracker();
        };
        addEntity.__lorePatch = true;
        window.addEntity = addEntity;
      }
    }catch(e){}
    try{
      sortEntityState = sortEntityState || null;
    }catch(e){}
  }

  function refreshEntityViews(){
    installLoreEntityType();
    rebuildEntityTagCatalog();
    try{ if(typeof ensureEntityState === 'function') ensureEntityState(); }catch(e){}
    try{ if(typeof renderEntityTracker === 'function') renderEntityTracker(); }catch(e){}
    try{ if(typeof renderEntityListPanelDirectory === 'function') renderEntityListPanelDirectory(); }catch(e){}
  }

  patchEntityHelpersForLore();
  bindReliableCampaignImport();
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ patchEntityHelpersForLore(); bindReliableCampaignImport(); refreshEntityViews(); });
  setTimeout(function(){ patchEntityHelpersForLore(); bindReliableCampaignImport(); refreshEntityViews(); }, 250);
  setTimeout(function(){ patchEntityHelpersForLore(); bindReliableCampaignImport(); refreshEntityViews(); }, 1000);
})();


/* 2026-06-24 Saga Atlas nav/docs/android fixes.
   - Oracle, Guide, and Documents top nav always restore the right panel even after an entity editor has replaced the center/right workspace.
   - Adds a top-nav Documents target.
   - Android Crew Link opens the external site in a browser tab because embedded iframes are unreliable on several Android browsers. */
(function(){
  function byId(id){ return document.getElementById(id); }
  function resetTop(){ try{ if(document.activeElement&&document.activeElement.blur) document.activeElement.blur(); window.scrollTo({top:0,left:0,behavior:'auto'}); document.documentElement.scrollTop=0; document.body.scrollTop=0; var layout=document.querySelector('.layout'); if(layout) layout.scrollTop=0; }catch(e){} }
  function closeEntityAndCrewWorkspace(){
    document.body.classList.remove('entity-editor-workspace-open','entity-editor-overlay-open','crew-workspace-open','left-crew-expanded');
    var tracker=byId('entityTrackerPanel'); if(tracker) tracker.classList.remove('entity-editor-overlay','active-left-view');
    var list=byId('entityListPanel'); if(list) list.classList.add('active-left-view');
  }
  function setRightTab(tab){
    if(typeof window.showSagaAtlasRightTab==='function') window.showSagaAtlasRightTab(tab);
    else if(typeof window.showRightTabPublic==='function') window.showRightTabPublic(tab);
    else {
      var tabs={oracles:['oracleLibraryTab','showOracleLibraryTab'],guide:['guideLibraryTab','showGuideLibraryTab'],documents:['documentLibraryTab','showDocumentLibraryTab']};
      Object.keys(tabs).forEach(function(key){ var panel=byId(tabs[key][0]), btn=byId(tabs[key][1]), active=key===tab; if(panel){panel.hidden=!active; panel.classList.toggle('active-oracle-tab',active);} if(btn) btn.classList.toggle('active',active); });
    }
    if(tab==='documents' && window.SagaAtlasDocuments && typeof window.SagaAtlasDocuments.renderDocumentLibrary==='function') window.SagaAtlasDocuments.renderDocumentLibrary();
  }
  function openRightWorkspace(tab){
    closeEntityAndCrewWorkspace();
    var panel=byId('oraclePanel');
    if(panel){ document.querySelectorAll('.side-panel').forEach(function(p){ p.classList.toggle('is-open', p===panel); }); panel.scrollTop=0; }
    var backdrop=byId('panelBackdrop'); if(backdrop) backdrop.hidden=false;
    document.body.classList.add('side-panel-open');
    setRightTab(tab);
    resetTop(); setTimeout(resetTop,0); setTimeout(resetTop,60);
  }
  function showCenter(tab){ if(typeof window.showCenterTab==='function') window.showCenterTab(tab,true); else if(typeof showCenterTab==='function') showCenterTab(tab,true); }
  function forceCrewWorkspace(){
    document.body.classList.add('crew-workspace-open','left-crew-expanded');
    document.body.classList.remove('entity-editor-workspace-open','entity-editor-overlay-open');
    document.querySelectorAll('.left-view').forEach(function(p){p.classList.remove('active-left-view');});
    var crew=byId('crewLinkPanel'); if(crew) crew.classList.add('active-left-view');
    if(window.state){ window.state.activeLeftTab='crew'; try{ if(typeof saveState==='function') saveState(); }catch(e){} }
    resetTop();
  }
  function isAndroid(){ return /Android/i.test(navigator.userAgent||''); }
  function openCrewExternal(){
    var url='https://starforged-crew-link.scottbenton.dev/';
    try{ var w=window.open(url,'_blank','noopener,noreferrer'); if(!w) window.location.href=url; }catch(e){ window.location.href=url; }
  }
  function handleTopNav(ev){
    var btn=ev.target && ev.target.closest && ev.target.closest('.top-nav button, .mobile-panel-tabs.top-nav button');
    if(!btn) return;
    var id=btn.id, handled=true;
    if(id==='openOraclePanel') openRightWorkspace('oracles');
    else if(id==='openGuidePanel'){ try{ if(window.state && window.state.activeCenterTab==='guide') showCenter('journal'); }catch(e){} openRightWorkspace('guide'); }
    else if(id==='openDocumentsPanel') openRightWorkspace('documents');
    else if(id==='showJournalNav'){ closeEntityAndCrewWorkspace(); showCenter('journal'); }
    else if(id==='showSceneElementsNav' || id==='focusOutputPanel'){ closeEntityAndCrewWorkspace(); showCenter('output'); }
    else if(id==='openCrewLinkPanel'){ if(isAndroid()) openCrewExternal(); else forceCrewWorkspace(); }
    else handled=false;
    if(handled){ ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation(); return false; }
  }
  document.addEventListener('click', handleTopNav, true);
  function bindExternalCrew(){ var a=byId('openCrewLinkExternal'); if(a && !a.dataset.bound){ a.dataset.bound='1'; a.addEventListener('click', function(ev){ ev.stopPropagation(); }, true); } }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', bindExternalCrew); else bindExternalCrew();
  setTimeout(bindExternalCrew,500);
})();

/* 2026-06-24 top nav state reset audit/fix.
   Window-capture handler runs before older document-capture/target handlers.
   Each top nav button now clears incompatible workspace classes before opening
   its intended left/center/right section. */
(function(){
  function byId(id){ return document.getElementById(id); }
  function stop(ev){ ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation(); }
  function pageTop(){
    try{
      if(document.activeElement && document.activeElement.blur) document.activeElement.blur();
      window.scrollTo({top:0,left:0,behavior:'auto'});
      document.documentElement.scrollTop=0; document.body.scrollTop=0;
      var layout=document.querySelector('.layout'); if(layout) layout.scrollTop=0;
    }catch(e){}
  }
  function clearWorkspace(){
    document.body.classList.remove('crew-workspace-open','entity-editor-workspace-open','entity-editor-overlay-open','left-crew-expanded');
    var tracker=byId('entityTrackerPanel');
    if(tracker) tracker.classList.remove('entity-editor-overlay');
  }
  function markLeft(tab){
    clearWorkspace();
    if(typeof window.showLeftTab === 'function') window.showLeftTab(tab, true);
    else if(typeof showLeftTab === 'function') showLeftTab(tab, true);
    // showLeftTab may intentionally add left-crew-expanded for entity/living; keep it
    // only for those views, never from a previous Crew Link workspace.
    if(tab !== 'crew') document.body.classList.remove('crew-workspace-open');
    if(tab !== 'entity') document.body.classList.remove('entity-editor-workspace-open','entity-editor-overlay-open');
  }
  function markCenter(tab){
    clearWorkspace();
    if(typeof window.showCenterTab === 'function') window.showCenterTab(tab, true);
    else if(typeof showCenterTab === 'function') showCenterTab(tab, true);
    // Leave Entity Library visible as a safe default in the left column.
    if(typeof window.showLeftTab === 'function') window.showLeftTab('entityList', true);
    else if(typeof showLeftTab === 'function') showLeftTab('entityList', true);
  }
  function setRightTab(tab){
    if(typeof window.showSagaAtlasRightTab === 'function') window.showSagaAtlasRightTab(tab);
    else if(typeof window.showHostileRightTab === 'function') window.showHostileRightTab(tab);
    else {
      var map={oracles:['oracleLibraryTab','showOracleLibraryTab'],guide:['guideLibraryTab','showGuideLibraryTab'],documents:['documentLibraryTab','showDocumentLibraryTab']};
      Object.keys(map).forEach(function(k){
        var panel=byId(map[k][0]), btn=byId(map[k][1]), active=k===tab;
        if(panel){ panel.hidden=!active; panel.classList.toggle('active-oracle-tab', active); }
        if(btn) btn.classList.toggle('active', active);
      });
    }
    if(tab === 'documents' && window.SagaAtlasDocuments && typeof window.SagaAtlasDocuments.renderDocumentLibrary === 'function') window.SagaAtlasDocuments.renderDocumentLibrary();
  }
  function openRight(tab){
    clearWorkspace();
    var panel=byId('oraclePanel');
    if(panel){
      document.querySelectorAll('.side-panel').forEach(function(p){ p.classList.toggle('is-open', p===panel); });
      panel.scrollTop=0;
    }
    var bd=byId('panelBackdrop'); if(bd) bd.hidden=false;
    document.body.classList.add('side-panel-open');
    setRightTab(tab);
    if(typeof window.showLeftTab === 'function') window.showLeftTab('entityList', true);
    else if(typeof showLeftTab === 'function') showLeftTab('entityList', true);
  }
  function openLeftPanel(tab, panelId){
    markLeft(tab);
    var panel=byId(panelId);
    if(panel){ document.querySelectorAll('.side-panel').forEach(function(p){ p.classList.toggle('is-open', p===panel); }); }
    var bd=byId('panelBackdrop'); if(bd) bd.hidden=false;
    document.body.classList.add('side-panel-open');
  }
  function openCrew(){
    clearWorkspace();
    if(typeof window.showLeftTab === 'function') window.showLeftTab('crew', true);
    else if(typeof showLeftTab === 'function') showLeftTab('crew', true);
    document.body.classList.remove('entity-editor-workspace-open','entity-editor-overlay-open');
    document.body.classList.add('crew-workspace-open');
    var crew=byId('crewLinkPanel'); if(crew) crew.classList.add('active-left-view');
  }
  function handler(ev){
    var btn=ev.target && ev.target.closest && ev.target.closest('.top-nav button, .mobile-panel-tabs button');
    if(!btn || !btn.id) return;
    var id=btn.id;
    var handled=true;
    switch(id){
      case 'openControlsPanel': openLeftPanel('scene','controlsPanel'); break;
      case 'openEntityListPanel': markLeft('entityList'); break;
      case 'openCrewLinkPanel': openCrew(); break;
      case 'openLivingShipPanel': openLeftPanel('living','livingShipPanel'); break;
      case 'showJournalNav': markCenter('journal'); break;
      case 'showSceneElementsNav':
      case 'focusOutputPanel': markCenter('output'); break;
      case 'openOraclePanel': openRight('oracles'); break;
      case 'openGuidePanel':
        try{ if(window.state && window.state.activeCenterTab==='guide') markCenter('journal'); }catch(e){}
        openRight('guide'); break;
      case 'openDocumentsPanel': openRight('documents'); break;
      default: handled=false;
    }
    if(handled){ stop(ev); pageTop(); setTimeout(pageTop,0); setTimeout(pageTop,80); return false; }
  }
  window.addEventListener('click', handler, true);
})();
