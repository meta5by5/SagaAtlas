(function(){
  'use strict';

  /*
    Saga Atlas Phase A Increment 30: Update Focus, Scene Inspiration, Colony Sheet

    Design contract:
    - Story Director suggests; the GM decides.
    - Context flows downward: World/Planet -> Environment -> Development -> Location Type -> District/Zone -> Encounter Site.
    - Updating a field never changes upstream fields.
    - Updating a field only changes downstream fields whose current value is no longer valid for the new context.
    - Pin state is per-field and only changes when the GM selects/toggles that specific field.
    - Entity records add optional context: faction entities feed faction choices; location entities feed location choices.
    - Suggestions are ranked by semantic tags and confidence, not independent random rolls.
  */

  const STORE='sagaAtlasStoryDirectorContextCascadeV5';
  const OLD_STORES=['sagaAtlasStoryDirectorContextCascadeV4','sagaAtlasStoryDirectorContextCascadeV3','sagaAtlasStoryDirectorContextCascadeV2','sagaAtlasStoryDirectorV1'];
  const APP_STORE='sagaAtlasSceneOracleV1';
  const ORDER=['world','environment','development','locationType','districtZone','encounterSite'];
  const LABELS={world:'World / Planet',environment:'Biome / Environment',development:'Development Level',locationType:'Location Type',districtZone:'District / Zone',encounterSite:'Encounter Site'};
  const HELP={
    world:'Broad campaign or regional stage. This is always upstream from every setting choice.',
    environment:'Biome, climate, habitat, vacuum, station interior, wilderness, subterranean, or other environmental frame. This sits directly under World / Planet.',
    development:'Civilization, decay, occupation, or relic presence shaping the place.',
    locationType:'The concrete kind of place suitable for the selected environment and development.',
    districtZone:'The play-level area within the selected location.',
    encounterSite:'The exact encounter-scale feature where the scene begins.'
  };
  const STATUS={suggested:'⚪ Suggested',pinned:'📌 Pinned',revise:'❓ Revise'};
  const $=id=>document.getElementById(id);
  const qs=(s,r=document)=>r.querySelector(s);
  const qsa=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const clone=o=>JSON.parse(JSON.stringify(o||{}));
  const esc=s=>String(s??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  const escA=s=>esc(s).replace(/"/g,'&quot;');
  const slug=s=>String(s||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const uniq=a=>Array.from(new Set((a||[]).filter(Boolean)));

  function opt(name,score,tags=[],parents={}){return {name,score,tags:uniq(tags.map(slug)),parents};}
  const GRAPH={
    world:[
      opt('Current Campaign World',70,['campaign','flexible','known']),
      opt('Frontier Planet',92,['planet','frontier','colony','wilderness','industrial','settled']),
      opt('Corporate Colony',89,['planet','corporate','colony','industrial','settled','urban']),
      opt('Orbital Station',88,['station','orbital','vacuum','artificial','interior','civilized']),
      opt('Deep Space Route',80,['space','vacuum','ship','route','transit','derelict']),
      opt('Uncharted World',78,['planet','wilderness','unknown','survey','primordial']),
      opt('Relic Moon',74,['moon','relic','alien','vacuum','ruin','mystery']),
      opt('Asteroid Belt',76,['asteroid','belt','vacuum','orbital','mining','industrial']),
      opt('Core Industrial World',66,['planet','industrial','urban','corporate','settled'])
    ],
    environment:[
      opt('Station Interior',94,['station','interior','artificial','civilized','industrial'],{world:['Orbital Station','Deep Space Route','Asteroid Belt','Corporate Colony','Current Campaign World']}),
      opt('Vacuum / EVA',92,['vacuum','eva','space','exterior','orbital','derelict'],{world:['Orbital Station','Deep Space Route','Asteroid Belt','Relic Moon','Current Campaign World']}),
      opt('Industrial Habitat',90,['station','habitat','artificial','industrial','settled'],{world:['Orbital Station','Asteroid Belt','Corporate Colony','Core Industrial World','Frontier Planet','Current Campaign World']}),
      opt('Ruined Megastructure',82,['ruin','relic','artificial','derelict','alien','station'],{world:['Orbital Station','Deep Space Route','Relic Moon','Asteroid Belt','Current Campaign World']}),
      opt('Subterranean Network',84,['subterranean','tunnel','cavern','mine','interior'],{world:['Frontier Planet','Corporate Colony','Uncharted World','Relic Moon','Core Industrial World','Current Campaign World']}),
      opt('Frozen Wasteland',80,['planet','frozen','wilderness','exterior','weather'],{world:['Frontier Planet','Uncharted World','Relic Moon','Current Campaign World']}),
      opt('Toxic Desert',76,['planet','desert','toxic','wilderness','exterior'],{world:['Frontier Planet','Corporate Colony','Uncharted World','Core Industrial World','Current Campaign World']}),
      opt('Jungle Biosphere',72,['planet','jungle','biosphere','wilderness','life'],{world:['Frontier Planet','Uncharted World','Current Campaign World']}),
      opt('Oceanic / Storm World',68,['planet','ocean','storm','weather','wilderness'],{world:['Frontier Planet','Uncharted World','Current Campaign World']}),
      opt('Volcanic / Primordial',78,['planet','volcanic','primordial','geological','wilderness'],{world:['Frontier Planet','Uncharted World','Relic Moon','Current Campaign World']})
    ],
    development:[
      opt('Stellar',78,['space','orbital','vacuum','route'],{environment:['Vacuum / EVA','Ruined Megastructure']}),
      opt('Primordial',84,['primordial','natural','geological','planetary'],{environment:['Frozen Wasteland','Toxic Desert','Jungle Biosphere','Oceanic / Storm World','Volcanic / Primordial']}),
      opt('Subterranean',86,['subterranean','tunnel','mine','underground'],{environment:['Subterranean Network']}),
      opt('Wilderness',78,['wilderness','survey','natural','frontier'],{environment:['Frozen Wasteland','Toxic Desert','Jungle Biosphere','Oceanic / Storm World','Volcanic / Primordial']}),
      opt('Explored',74,['explored','survey','frontier'],{environment:['Frozen Wasteland','Toxic Desert','Jungle Biosphere','Oceanic / Storm World','Subterranean Network']}),
      opt('Settled',82,['settled','colony','civilized','habitat'],{environment:['Station Interior','Industrial Habitat','Subterranean Network','Frozen Wasteland','Toxic Desert']}),
      opt('Domesticated',70,['domesticated','agriculture','civilized'],{environment:['Industrial Habitat','Frozen Wasteland','Jungle Biosphere','Oceanic / Storm World']}),
      opt('Urbanized',84,['urban','civilized','station','city'],{environment:['Station Interior','Industrial Habitat']}),
      opt('Industrial',90,['industrial','mining','factory','station','colony'],{environment:['Station Interior','Industrial Habitat','Subterranean Network','Vacuum / EVA','Toxic Desert','Frozen Wasteland']}),
      opt('Derelict',88,['derelict','abandoned','wreck','dead','station','ship'],{environment:['Station Interior','Vacuum / EVA','Industrial Habitat','Ruined Megastructure','Subterranean Network']}),
      opt('Desolated',76,['desolated','ruin','dead','hazard'],{environment:['Station Interior','Vacuum / EVA','Industrial Habitat','Ruined Megastructure','Toxic Desert','Frozen Wasteland']}),
      opt('Relic',86,['relic','alien','ancient','ruin','mystery'],{environment:['Ruined Megastructure','Subterranean Network','Vacuum / EVA','Jungle Biosphere','Volcanic / Primordial','Frozen Wasteland']})
    ],
    locationType:[
      opt('Orbital Transfer Route',88,['space','route','transit','orbital'],{development:['Stellar']}),
      opt('Refueling Platform',82,['space','fuel','station','orbital'],{development:['Stellar','Industrial']}),
      opt('Sensor Buoy Chain',76,['space','sensor','route'],{development:['Stellar']}),
      opt('Comms Relay',72,['space','comms','station'],{development:['Stellar','Industrial']}),
      opt('Debris Field',74,['space','debris','derelict','salvage'],{development:['Stellar','Derelict','Desolated']}),
      opt('Volcanic Field',94,['planet','volcanic','primordial','geological'],{development:['Primordial']}),
      opt('Storm Plain',86,['planet','storm','primordial','wilderness'],{development:['Primordial','Wilderness']}),
      opt('Tectonic Rift',80,['planet','geological','primordial'],{development:['Primordial']}),
      opt('Toxic Basin',76,['planet','toxic','desert','primordial'],{development:['Primordial','Wilderness']}),
      opt('Mine Tunnels',94,['subterranean','mine','industrial','tunnel'],{development:['Subterranean','Industrial']}),
      opt('Cavern Network',87,['subterranean','cavern','wilderness'],{development:['Subterranean','Wilderness']}),
      opt('Subsurface Research Site',82,['subterranean','research','industrial'],{development:['Subterranean','Industrial','Relic']}),
      opt('Alien Catacombs',76,['subterranean','relic','alien','ruin'],{development:['Subterranean','Relic']}),
      opt('Survey Zone',92,['wilderness','survey','frontier'],{development:['Wilderness','Explored']}),
      opt('Unmapped Valley',84,['wilderness','valley','planet'],{development:['Wilderness','Explored']}),
      opt('Weather Station',76,['wilderness','station','survey'],{development:['Wilderness','Explored']}),
      opt('Frontier Town',91,['settled','town','colony','civilized'],{development:['Settled']}),
      opt('Agricultural Dome',82,['settled','dome','agriculture','habitat'],{development:['Settled','Domesticated']}),
      opt('Landing Field',79,['settled','cargo','landing','transport'],{development:['Settled','Industrial','Urbanized']}),
      opt('Supply Depot',88,['settled','cargo','supply','industrial','station'],{development:['Settled','Industrial','Urbanized']}),
      opt('Clinic Outpost',86,['medical','clinic','settled','station','colony'],{development:['Settled','Urbanized','Industrial']}),
      opt('City District',94,['urban','city','civilized'],{development:['Urbanized']}),
      opt('Corporate Precinct',88,['urban','corporate','security','civilized'],{development:['Urbanized','Industrial']}),
      opt('Transit Hub',86,['urban','station','cargo','transport','civilized'],{development:['Urbanized','Industrial']}),
      opt('Business District',78,['urban','trade','market','corporate'],{development:['Urbanized']}),
      opt('Port Authority',84,['urban','port','cargo','station','transport'],{development:['Urbanized','Industrial','Settled']}),
      opt('Mining Colony',90,['industrial','mining','colony','frontier'],{development:['Industrial']}),
      opt('Orbital Mining Station',96,['station','orbital','mining','industrial','artificial'],{development:['Industrial']}),
      opt('Cargo Transfer Hub',92,['station','cargo','transport','industrial','artificial'],{development:['Industrial','Urbanized']}),
      opt('Refinery',90,['industrial','refinery','station','colony'],{development:['Industrial']}),
      opt('Factory Arcology',84,['industrial','factory','urban','artificial'],{development:['Industrial','Urbanized']}),
      opt('Shipyard Annex',82,['industrial','ship','station','orbital'],{development:['Industrial']}),
      opt('Power Plant',78,['industrial','power','station'],{development:['Industrial']}),
      opt('Crashed Starship',96,['derelict','ship','wreck','salvage','space'],{development:['Derelict','Desolated']}),
      opt('Abandoned Station',92,['derelict','station','abandoned','space'],{development:['Derelict','Desolated']}),
      opt('Dead Colony',86,['derelict','colony','dead','settled'],{development:['Derelict','Desolated']}),
      opt('Failed Mine',80,['derelict','mine','subterranean','industrial'],{development:['Derelict','Desolated','Subterranean']}),
      opt('Quarantine Lab',86,['derelict','medical','quarantine','lab','station'],{development:['Derelict','Industrial','Urbanized']}),
      opt('Alien Ruins',94,['relic','alien','ruin','mystery'],{development:['Relic']}),
      opt('Ancient Vault',88,['relic','vault','alien','mystery'],{development:['Relic']}),
      opt('Buried Megastructure',84,['relic','megastructure','subterranean'],{development:['Relic','Subterranean']}),
      opt('Signal Monolith',72,['relic','signal','alien'],{development:['Relic']})
    ],
    districtZone:[
      opt('Ore Processing',94,['industrial','mining','processing'],{locationType:['Mining Colony','Orbital Mining Station']}),
      opt('Operations',88,['operations','command','station'],{locationType:['Mining Colony','Orbital Mining Station','Refinery','Factory Arcology','Power Plant','Cargo Transfer Hub','Abandoned Station','Clinic Outpost']}),
      opt('Maintenance Tunnels',86,['maintenance','tunnel','engineering'],{locationType:['Mining Colony','Orbital Mining Station','Refinery','Factory Arcology','Shipyard Annex','Power Plant','Abandoned Station']}),
      opt('Habitation',80,['habitation','crew','station'],{locationType:['Mining Colony','Orbital Mining Station','Abandoned Station','Frontier Town','Cargo Transfer Hub']}),
      opt('Security Checkpoint',76,['security','checkpoint'],{locationType:['Mining Colony','Orbital Mining Station','Corporate Precinct','Transit Hub','Port Authority','Quarantine Lab']}),
      opt('Medical Bay',74,['medical','clinic'],{locationType:['Mining Colony','Orbital Mining Station','Abandoned Station','Crashed Starship','Cargo Transfer Hub']}),
      opt('Docking Pad',70,['dock','landing','cargo'],{locationType:['Mining Colony','Orbital Mining Station','Cargo Transfer Hub','Landing Field','Port Authority','Abandoned Station']}),
      opt('Smelter Floor',92,['industrial','refinery'],{locationType:['Refinery']}),
      opt('Pipe Gallery',88,['industrial','maintenance'],{locationType:['Refinery','Power Plant']}),
      opt('Control Room',84,['operations','control'],{locationType:['Refinery','Power Plant','Shipyard Annex','Subsurface Research Site']}),
      opt('Dry Dock',94,['shipyard','dock','ship'],{locationType:['Shipyard Annex']}),
      opt('Parts Warehouse',86,['cargo','warehouse'],{locationType:['Shipyard Annex','Supply Depot','Cargo Transfer Hub']}),
      opt('Reactor Hall',94,['power','reactor','engineering'],{locationType:['Power Plant','Abandoned Station','Crashed Starship']}),
      opt('Broken Bridge',94,['bridge','command','ship','derelict'],{locationType:['Crashed Starship']}),
      opt('Cargo Hold',88,['cargo','ship','freight'],{locationType:['Crashed Starship']}),
      opt('Engineering Rupture',86,['engineering','damage','ship'],{locationType:['Crashed Starship']}),
      opt('Cryo Bay',82,['cryo','medical','ship'],{locationType:['Crashed Starship']}),
      opt('Alien Breach',76,['alien','breach','horror'],{locationType:['Crashed Starship']}),
      opt('Docking Ring',88,['dock','station','orbital'],{locationType:['Abandoned Station','Cargo Transfer Hub']}),
      opt('Life Support',84,['life support','station','engineering'],{locationType:['Abandoned Station','Cargo Transfer Hub','Quarantine Lab']}),
      opt('Command Core',80,['command','station'],{locationType:['Abandoned Station']}),
      opt('Habitat Ring',76,['habitation','station'],{locationType:['Abandoned Station']}),
      opt('Triage Ward',98,['medical','triage','hospital'],{locationType:['Clinic Outpost','Quarantine Lab']}),
      opt('Pharmacy Lockup',92,['medical','medicine','cargo'],{locationType:['Clinic Outpost','Quarantine Lab']}),
      opt('Quarantine Room',90,['medical','quarantine','biohazard'],{locationType:['Clinic Outpost','Quarantine Lab']}),
      opt('Records Desk',72,['records','medical','admin'],{locationType:['Clinic Outpost']}),
      opt('Specimen Ward',92,['medical','specimen','lab'],{locationType:['Quarantine Lab']}),
      opt('Clean Room',86,['lab','medical','clean'],{locationType:['Quarantine Lab']}),
      opt('Loading Dock',96,['cargo','dock','trade'],{locationType:['Supply Depot','Cargo Transfer Hub','Port Authority','Transit Hub','Landing Field']}),
      opt('Inventory Office',90,['cargo','records','trade'],{locationType:['Supply Depot','Cargo Transfer Hub']}),
      opt('Cold Storage',86,['cargo','medical','cold'],{locationType:['Supply Depot','Cargo Transfer Hub','Clinic Outpost']}),
      opt('Customs Cage',84,['cargo','customs','security'],{locationType:['Supply Depot','Port Authority','Transit Hub']}),
      opt('Cargo Gates',90,['cargo','transport'],{locationType:['Transit Hub','Port Authority','Cargo Transfer Hub']}),
      opt('Security Screening',84,['security','transport'],{locationType:['Transit Hub','Port Authority','Corporate Precinct']}),
      opt('Main Concourse',80,['social','crowd','transport'],{locationType:['Transit Hub','City District']}),
      opt('Customs Desk',78,['customs','trade','transport'],{locationType:['Transit Hub','Port Authority']}),
      opt('Commercial Street',88,['trade','urban','social'],{locationType:['City District','Business District']}),
      opt('Market Arcade',78,['trade','urban'],{locationType:['City District','Business District']}),
      opt('Lobby Security',90,['security','corporate'],{locationType:['Corporate Precinct']}),
      opt('Executive Offices',84,['corporate','office'],{locationType:['Corporate Precinct']}),
      opt('Data Center',82,['data','corporate','tech'],{locationType:['Corporate Precinct']}),
      opt('Glyph Chamber',92,['relic','alien','clue'],{locationType:['Alien Ruins']}),
      opt('Hidden Vault',84,['relic','vault','alien'],{locationType:['Alien Ruins','Ancient Vault']}),
      opt('Outer Seal',90,['vault','relic'],{locationType:['Ancient Vault']}),
      opt('Sealed Repository',86,['vault','archive','relic'],{locationType:['Ancient Vault']}),
      opt('Excavation Pit',88,['relic','dig','industrial'],{locationType:['Buried Megastructure','Alien Ruins']}),
      opt('Signal Core',86,['signal','relic','data'],{locationType:['Buried Megastructure','Signal Monolith']}),
      opt('Main Drift',90,['mine','subterranean'],{locationType:['Mine Tunnels','Failed Mine']}),
      opt('Old Survey Cut',82,['mine','survey','subterranean'],{locationType:['Mine Tunnels','Failed Mine']}),
      opt('Pump Gallery',78,['mine','maintenance'],{locationType:['Mine Tunnels','Failed Mine']})
    ],
    encounterSite:[
      opt('Conveyor Split',92,['industrial','choice','movement'],{districtZone:['Ore Processing']}),
      opt('Crusher Pit',86,['industrial','hazard'],{districtZone:['Ore Processing']}),
      opt('Dust-Choked Control Booth',78,['control','clue'],{districtZone:['Ore Processing']}),
      opt('Sample Silo',72,['cargo','sample'],{districtZone:['Ore Processing']}),
      opt('Duty Console',86,['console','records','control'],{districtZone:['Operations','Control Room']}),
      opt('Wall of Status Screens',80,['data','control'],{districtZone:['Operations','Control Room']}),
      opt('Supervisor Desk',72,['records','npc'],{districtZone:['Operations']}),
      opt('Steam Junction',88,['maintenance','hazard'],{districtZone:['Maintenance Tunnels','Pipe Gallery']}),
      opt('Cable Crawlspace',84,['maintenance','route'],{districtZone:['Maintenance Tunnels']}),
      opt('Badge Gate',84,['security','checkpoint'],{districtZone:['Security Checkpoint','Lobby Security']}),
      opt('Camera Blind Spot',72,['security','opportunity'],{districtZone:['Security Checkpoint','Security Screening']}),
      opt('Triage Bed',88,['medical','patient'],{districtZone:['Medical Bay','Triage Ward']}),
      opt('Drug Cabinet',76,['medical','supply'],{districtZone:['Medical Bay']}),
      opt('Emergency Recorder',95,['recorder','ship','clue'],{districtZone:['Broken Bridge','Command Core']}),
      opt('Dead Nav Console',88,['console','ship','clue'],{districtZone:['Broken Bridge']}),
      opt('Cracked Viewport',82,['ship','visual','hazard'],{districtZone:['Broken Bridge']}),
      opt('Captain’s Chair',72,['ship','npc','clue'],{districtZone:['Broken Bridge']}),
      opt('Collapsed Container Stack',84,['cargo','hazard'],{districtZone:['Cargo Hold']}),
      opt('Manifest Terminal',82,['cargo','data','clue'],{districtZone:['Cargo Hold','Inventory Office']}),
      opt('Hidden Crate',78,['cargo','secret'],{districtZone:['Cargo Hold','Loading Dock','Cold Storage']}),
      opt('Exposed Reactor Line',94,['reactor','hazard'],{districtZone:['Engineering Rupture','Reactor Hall']}),
      opt('Coolant Fog',88,['coolant','hazard'],{districtZone:['Engineering Rupture','Reactor Hall']}),
      opt('Open Cryotube',88,['cryo','medical','clue'],{districtZone:['Cryo Bay']}),
      opt('Body Bag Rack',70,['cryo','horror'],{districtZone:['Cryo Bay']}),
      opt('Melted Bulkhead',86,['alien','breach','horror'],{districtZone:['Alien Breach']}),
      opt('Organic Residue',82,['alien','bio','clue'],{districtZone:['Alien Breach']}),
      opt('Isolation Bed',88,['medical','biohazard'],{districtZone:['Triage Ward','Quarantine Room']}),
      opt('Blood Cooler',76,['medical','supply'],{districtZone:['Triage Ward']}),
      opt('Missing Vial Slot',94,['medical','cargo','clue'],{districtZone:['Pharmacy Lockup']}),
      opt('Inventory Terminal',86,['cargo','medical','data'],{districtZone:['Pharmacy Lockup','Inventory Office']}),
      opt('Biohazard Door',84,['biohazard','medical'],{districtZone:['Quarantine Room']}),
      opt('Discarded Injector',70,['medical','clue'],{districtZone:['Quarantine Room']}),
      opt('Biotoxin Case',96,['medical','cargo','biotoxin'],{districtZone:['Cold Storage','Quarantine Room','Pharmacy Lockup']}),
      opt('Crate Stack',86,['cargo','cover'],{districtZone:['Loading Dock']}),
      opt('Suspicious Manifest',88,['cargo','clue','trade'],{districtZone:['Loading Dock','Customs Desk','Inventory Office']}),
      opt('Side Door',70,['route','opportunity'],{districtZone:['Loading Dock']}),
      opt('Hidden Compartment',82,['cargo','secret'],{districtZone:['Customs Cage','Cargo Hold']}),
      opt('Rival Broker Tag',78,['trade','rival','clue'],{districtZone:['Customs Cage','Loading Dock']}),
      opt('Sealed Crate',88,['cargo','mystery'],{districtZone:['Cargo Gates']}),
      opt('Wrong Destination Tag',78,['cargo','clue'],{districtZone:['Cargo Gates','Customs Desk']}),
      opt('Detained Porter',76,['npc','social','cargo'],{districtZone:['Security Screening']}),
      opt('Rumor Kiosk',74,['rumor','social'],{districtZone:['Main Concourse']}),
      opt('Competitor Contact',72,['trade','rival','npc'],{districtZone:['Main Concourse','Market Arcade','Commercial Street']}),
      opt('Inspection Stamp',78,['customs','clue'],{districtZone:['Customs Desk']}),
      opt('Broker Argument',76,['trade','social'],{districtZone:['Customs Desk']}),
      opt('Living Wall Text',88,['alien','relic','clue'],{districtZone:['Glyph Chamber']}),
      opt('Dustless Pedestal',80,['relic','artifact'],{districtZone:['Glyph Chamber']}),
      opt('Unopened Case',86,['relic','container'],{districtZone:['Hidden Vault','Sealed Repository']}),
      opt('Pressure Plate',78,['relic','hazard'],{districtZone:['Hidden Vault']}),
      opt('Central Console',84,['data','control'],{districtZone:['Command Core','Signal Core']}),
      opt('Emergency Broadcast Panel',78,['broadcast','clue'],{districtZone:['Command Core']}),
      opt('CO2 Scrubber',84,['life support','hazard'],{districtZone:['Life Support']}),
      opt('Manual Override',80,['control','opportunity'],{districtZone:['Life Support']}),
      opt('Narrow Passage',70,['route'],{districtZone:['Main Drift','Old Survey Cut','Pump Gallery']}),
      opt('Abandoned Equipment',68,['tool','clue'],{districtZone:['Main Drift','Old Survey Cut','Pump Gallery']})
    ]
  };

  // Increment 28: broaden sci-fi context graph options. These options remain filtered by tags/parents.
  GRAPH.world.push(
    opt('Hospital Moon',74,['moon','medical','settled','corporate','clinic','transport']),
    opt('Free Trader Route',72,['space','route','trade','cargo','ship','frontier']),
    opt('Refugee Convoy',70,['space','ship','social','crisis','medical','cargo']),
    opt('Military Exclusion Zone',73,['space','military','security','restricted','danger']),
    opt('Corporate Logistics Corridor',77,['space','corporate','trade','cargo','route'])
  );
  GRAPH.environment.push(
    opt('Medical Habitat',91,['station','medical','clinic','quarantine','artificial','civilized'],{world:['Orbital Station','Corporate Colony','Hospital Moon','Refugee Convoy','Current Campaign World']}),
    opt('Cargo Hold / Freight Deck',90,['ship','cargo','interior','trade','transport','artificial'],{world:['Deep Space Route','Free Trader Route','Corporate Logistics Corridor','Refugee Convoy','Current Campaign World']}),
    opt('Ship Interior',94,['ship','interior','artificial','space','derelict','cargo'],{world:['Deep Space Route','Free Trader Route','Corporate Logistics Corridor','Refugee Convoy','Current Campaign World']}),
    opt('Military Facility Interior',84,['military','security','interior','artificial'],{world:['Orbital Station','Military Exclusion Zone','Corporate Colony','Current Campaign World']})
  );
  GRAPH.development.push(
    opt('Operational',88,['operational','active','civilized','station','ship'],{environment:['Station Interior','Industrial Habitat','Medical Habitat','Cargo Hold / Freight Deck','Ship Interior','Military Facility Interior']}),
    opt('Contested',82,['contested','security','faction','danger'],{environment:['Station Interior','Industrial Habitat','Medical Habitat','Cargo Hold / Freight Deck','Ship Interior','Military Facility Interior','Subterranean Network']}),
    opt('Quarantined',90,['quarantine','medical','biohazard','restricted'],{environment:['Medical Habitat','Station Interior','Industrial Habitat','Ship Interior']}),
    opt('Commercial',84,['trade','cargo','corporate','market'],{environment:['Station Interior','Industrial Habitat','Cargo Hold / Freight Deck','Ship Interior']}),
    opt('Military-Controlled',83,['military','security','restricted'],{environment:['Military Facility Interior','Station Interior','Vacuum / EVA']})
  );
  GRAPH.locationType.push(
    opt('Hospital Wing',95,['medical','clinic','hospital','triage'],{development:['Operational','Quarantined','Settled','Urbanized']}),
    opt('Biosecurity Checkpoint',92,['medical','quarantine','security','biohazard'],{development:['Quarantined','Operational','Military-Controlled']}),
    opt('Freight Contract Office',88,['cargo','trade','office','broker'],{development:['Commercial','Operational','Urbanized']}),
    opt('Smuggler Drop',82,['cargo','crime','hidden','trade'],{development:['Commercial','Derelict','Contested']}),
    opt('Convoy Ship',86,['ship','cargo','transport','social'],{development:['Operational','Commercial','Contested']}),
    opt('Patrol Cutter',80,['ship','military','security'],{development:['Military-Controlled','Operational','Contested']}),
    opt('Refugee Deck',78,['ship','social','medical','crisis'],{development:['Operational','Contested','Quarantined']})
  );
  GRAPH.districtZone.push(
    opt('Intake Desk',90,['medical','admin','social'],{locationType:['Hospital Wing','Clinic Outpost']}),
    opt('Isolation Corridor',92,['medical','quarantine','tension'],{locationType:['Hospital Wing','Biosecurity Checkpoint','Quarantine Lab']}),
    opt('Broker Cubicle',86,['trade','npc','cargo'],{locationType:['Freight Contract Office','Cargo Transfer Hub','Transit Hub']}),
    opt('Sealed Freight Cage',88,['cargo','security','mystery'],{locationType:['Freight Contract Office','Smuggler Drop','Supply Depot']}),
    opt('Passenger Bay',80,['ship','social','crisis'],{locationType:['Convoy Ship','Refugee Deck']}),
    opt('Armory Lockup',84,['military','security','gear'],{locationType:['Patrol Cutter','Corporate Precinct']})
  );
  GRAPH.encounterSite.push(
    opt('Patient Clipboard',72,['medical','clue','records'],{districtZone:['Intake Desk','Triage Ward']}),
    opt('Biohazard Seal',86,['medical','quarantine','hazard'],{districtZone:['Isolation Corridor','Quarantine Room']}),
    opt('Counterfeit Bill of Lading',90,['cargo','trade','clue'],{districtZone:['Broker Cubicle','Customs Desk','Inventory Office']}),
    opt('Competitor Offer',86,['trade','rival','choice'],{districtZone:['Broker Cubicle','Main Concourse','Market Arcade']}),
    opt('Locked Medical Cooler',94,['medical','cargo','epidemic'],{districtZone:['Sealed Freight Cage','Cold Storage','Pharmacy Lockup']}),
    opt('Hidden Transponder',82,['ship','cargo','clue'],{districtZone:['Passenger Bay','Cargo Hold']}),
    opt('Missing Weapon Slot',78,['military','clue','security'],{districtZone:['Armory Lockup']})
  );


  function field(value='',status='suggested',confidence=0,pinned=false){return {value,status,confidence,pinned};}
  function defaults(){return {
    fields:{world:field(),environment:field(),development:field(),locationType:field(),districtZone:field(),encounterSite:field()},
    focusTopic:'Storyline / current decision',
    situation:{objective:'',thread:'',stakes:'Survive the job and uncover what is really happening.',opportunity:'Actionable clue or leverage'},
    legacy:{campaignName:'',sceneIntent:'Let oracles decide',pacing:'Rising tension',scenePhase:'Discovery',threatLevel:4,mysteryLevel:5,predictability:50,useContinuity:true,escalateOnComplication:true,useConflictArchitecture:true,missionSeed:'',worldSeed:''},
    entityContext:{faction:'',location:'',asset:''},
    experience:{genre:'Hostile-compatible frontier sci-fi',sceneMode:'Exploration / Investigation',tone:'Gritty but playable',guidance:'Suggest, do not decide',pacing:'Rising tension',predictability:'Balanced surprise',generateKind:'Scene',storyIntent:'Let oracles decide',playMode:'Freeform Saga Atlas',playStep:'Choose Campaign Step'},
    systemBridge:{primaryLoop:'Freeform Story Director',roleplayLayer:'Starforged-style moves',tacticalLayer:'None / Theater of the Mind',worldLayer:'Hostile-compatible lore',colonyLayer:'Off',characterSheet:'Story-only'},
    continuity:{previous:true,npcs:true,factions:true,mysteries:true,plot:true,escalate:true},
    director:{mood:5,danger:4,hope:5,mystery:5,resources:4,momentum:5},
    weighting:{exploration:5,roleplaying:5,corporate:4,horror:3,combat:3,mystery:5},
    atmosphere:{lighting:'',smell:'',noise:'',visibility:'',activity:'',hazard:'',opportunity:''},
    lastChangedCard:'situation',lastCascadeNudge:'Context graph active: suggestions are filtered, ranked, and non-destructive.',sceneDescription:''
  };}
  function merge(base,extra){
    const out={...base,...(extra||{})};
    out.fields={...base.fields,...((extra&&extra.fields)||{})};
    ORDER.forEach(k=>out.fields[k]={...base.fields[k],...(extra&&extra.fields&&extra.fields[k]||{})});
    out.situation={...base.situation,...((extra&&extra.situation)||{})};
    out.legacy={...base.legacy,...((extra&&extra.legacy)||{})};
    out.entityContext={...base.entityContext,...((extra&&extra.entityContext)||{})};
    out.experience={...base.experience,...((extra&&extra.experience)||{})};
    out.systemBridge={...base.systemBridge,...((extra&&extra.systemBridge)||{})};
    out.continuity={...base.continuity,...((extra&&extra.continuity)||{})};
    out.director={...base.director,...((extra&&extra.director)||{})};
    out.weighting={...base.weighting,...((extra&&extra.weighting)||{})};
    out.atmosphere={...base.atmosphere,...((extra&&extra.atmosphere)||{})};
    out.focusTopic=out.focusTopic||base.focusTopic;
    return out;
  }
  function readRawStore(key){try{return JSON.parse(localStorage.getItem(key)||'{}')||{};}catch(e){return {};}}
  function read(){let raw=readRawStore(STORE); if(!raw.phaseA&&!Object.keys(raw).length){ for(const k of OLD_STORES){ const r=readRawStore(k); if(r&&Object.keys(r).length){raw=r;break;} } } return {phaseA:merge(defaults(),raw.phaseA||raw)};}
  function write(s){try{localStorage.setItem(STORE,JSON.stringify(s.phaseA||s));}catch(e){}}
  function load(){return read().phaseA;}
  function save(a){write({phaseA:a});}

  function appState(){return readRawStore(APP_STORE);}
  function entities(){const s=appState();return (((s.entities||{}).items)||[]).filter(e=>e&&e.name);}
  function entityTags(ent){return uniq([ent.type,ent.subtype,ent.relationshipDescription,ent.overview, ...(ent.tags||[])].join(' ').split(/[^A-Za-z0-9]+/).map(slug).filter(Boolean));}
  function entityOptions(type){
    const aliases={faction:['faction','corporation','organization','government','military','crew faction'],location:['location','planet','settlement','station','world','district','site'],asset:['asset','ship','vehicle','starship','equipment','item']};
    const allowed=aliases[type]||[type];
    return entities().filter(e=>allowed.includes(String(e.type||'').trim().toLowerCase())).map(e=>({id:e.id,name:e.name,tags:entityTags(e)}));
  }

  function storyText(a){const app=appState(); return [a.situation.objective,a.situation.thread,a.situation.stakes,a.situation.opportunity,a.entityContext.faction,a.entityContext.location,a.entityContext.asset,app.planet,app.biome,app.locationType,app.surroundings].join(' ').toLowerCase();}
  function semanticTags(a){
    const t=storyText(a); const tags=[];
    const add=(cond,...xs)=>{if(cond)tags.push(...xs);};
    add(/derelict|abandoned|adrift|wreck|hulk|ghost ship|what happened to the ship|crashed/i.test(t),'derelict','ship','wreck','salvage','mystery','space');
    add(/ship|vessel|freighter|starship|bridge|engineering/i.test(t),'ship','space','engineering');
    add(/transport|deliver|shipment|cargo|goods|freight|courier|box|crate|package|manifest|broker|side deal|competitor/i.test(t),'cargo','trade','transport','rival');
    add(/hospital|clinic|medical|doctor|patient|medicine|vaccine|biotoxin|epidemic|triage|quarantine|outbreak|plague/i.test(t),'medical','quarantine','biohazard','clinic');
    add(/relic|alien|ancient|ruin|vault|monolith|artifact/i.test(t),'relic','alien','mystery');
    add(/subterranean|underground|tunnel|cavern|mine|beneath|below/i.test(t),'subterranean','tunnel','mine');
    add(/city|urban|district|street|precinct|business|market/i.test(t),'urban','city','trade');
    add(/wilderness|jungle|desert|forest|wild|survey|valley/i.test(t),'wilderness','survey');
    add(/corporate|company|audit|liability|contract/i.test(t),'corporate');
    add(/hospital|patient|biotoxin|epidemic|medical|medicine|vaccine/i.test(t),'medical','quarantine','clinic');
    add(/ranger|marshal|patrol|military|marine|law|security/i.test(t),'security','military','law');
    const loc=entityOptions('location').find(e=>e.name===a.entityContext.location); if(loc) tags.push(...loc.tags);
    const fac=entityOptions('faction').find(e=>e.name===a.entityContext.faction); if(fac) tags.push(...fac.tags);
    const asset=entityOptions('asset').find(e=>e.name===a.entityContext.asset); if(asset) tags.push(...asset.tags);
    ORDER.forEach(k=>{const v=a.fields[k]?.value; if(v){ const o=findCandidate(k,v,a,false); if(o) tags.push(...o.tags); else tags.push(...slug(v).split(' ')); }});
    return uniq(tags);
  }

  function baseCandidates(field,a){
    let rows=(GRAPH[field]||[]).slice();
    if(field==='world'){
      entityOptions('location').forEach(e=>{ if(e.tags.some(t=>['planet','moon','station','asteroid','colony','world','belt'].includes(t))) rows.push(opt(e.name,72,['entity','known','location',...e.tags])); });
    }
    if(field==='locationType'){
      entityOptions('location').forEach(e=>rows.push(opt(e.name,72,['entity','known','location',...e.tags])));
    }
    if(field==='encounterSite'){
      entityOptions('asset').forEach(e=>{ if(e.tags.some(t=>['vehicle','starship','ship','cargo','artifact','equipment','asset'].includes(t))) rows.push(opt(e.name,66,['entity','known','asset',...e.tags])); });
    }
    return rows;
  }
  function parentField(field){return {environment:'world',development:'environment',locationType:'development',districtZone:'locationType',encounterSite:'districtZone'}[field]||null;}
  function parentKey(field){return {environment:'world',development:'environment',locationType:'development',districtZone:'locationType',encounterSite:'districtZone'}[field]||null;}
  function parentAllows(o,field,parentValue){
    if(!parentValue) return true;
    const pk=parentKey(field); if(!pk) return true;
    const allowed=o.parents&&o.parents[pk];
    if(!allowed || !allowed.length){
      // Entity-backed locations stay available, but will be low-ranked unless tag overlap is strong.
      return (o.tags||[]).includes('entity');
    }
    return allowed.includes(parentValue);
  }
  function findCandidate(field,value,a,includeEntity=true){return (includeEntity?baseCandidates(field,a):GRAPH[field]||[]).find(o=>o.name===value);}
  function scoreCandidate(o,field,a){
    const tags=semanticTags(a); let score=o.score||50;
    const overlap=(o.tags||[]).filter(t=>tags.includes(t));
    score += Math.min(18,overlap.length*4);
    // Field-specific strong intent boosts.
    const st=storyText(a);
    if(/derelict|what happened to the ship|ship/.test(st) && /derelict|ship|wreck|bridge|engineering|recorder|salvage/.test((o.tags||[]).join(' '))) score+=16;
    if(/transport|cargo|box|side deal|competitor/.test(st) && /cargo|trade|transport|manifest|broker|supply/.test((o.tags||[]).join(' '))) score+=16;
    if(/hospital|biotoxin|epidemic|medical/.test(st) && /medical|clinic|quarantine|biohazard|triage|medicine/.test((o.tags||[]).join(' '))) score+=18;
    // Keep unrelated entity locations available but not dominant.
    if((o.tags||[]).includes('entity') && overlap.length<2) score-=12;
    return Math.max(5,Math.min(99,Math.round(score)));
  }
  function contextClass(a){
    const world=a.fields.world.value||'';
    const env=a.fields.environment.value||'';
    const dev=a.fields.development.value||'';
    const txt=[world,env,dev,storyText(a)].join(' ');
    const cls=[];
    if(/Orbital|Asteroid|Deep Space|Route|Convoy|Exclusion|Corridor|Station|Habitat|Vacuum|Ship|Cargo Hold|Military Facility/i.test(txt)) cls.push('spaceArtificial');
    if(/Station Interior|Industrial Habitat|Medical Habitat|Cargo Hold|Ship Interior|Military Facility/i.test(env)) cls.push('interior');
    if(/Frozen|Desert|Jungle|Oceanic|Volcanic|Wasteland|Planet|World|Wilderness/i.test(txt)) cls.push('planetNatural');
    if(/Medical|Hospital|Clinic|Quarantine|Biotoxin|Epidemic/i.test(txt)) cls.push('medical');
    if(/Cargo|Freight|Trade|Transport|Box|Crate|Contract|Broker|Competitor/i.test(txt)) cls.push('cargoTrade');
    if(/Derelict|Wreck|Crashed|Abandoned|Ghost Ship/i.test(txt)) cls.push('derelictShip');
    return cls;
  }
  function incompatibleOption(o,field,a){
    const name=o.name||'';
    const tags=(o.tags||[]).join(' ');
    const cls=contextClass(a);
    const world=a.fields.world.value||'';
    const env=a.fields.environment.value||'';
    const dev=a.fields.development.value||'';
    if(field==='environment' && /Orbital Station|Asteroid Belt|Deep Space Route|Free Trader Route|Corporate Logistics Corridor|Refugee Convoy|Military Exclusion Zone/i.test(world)){
      if(/Frozen Wasteland|Toxic Desert|Jungle Biosphere|Oceanic|Volcanic|planetary|natural|wilderness/.test(name+' '+tags)) return true;
    }
    if(field==='development' && cls.includes('spaceArtificial')){
      if(/Primordial|Wilderness|Domesticated/.test(name)) return true;
    }
    if(field==='development' && /Station Interior|Medical Habitat|Cargo Hold|Ship Interior|Military Facility/i.test(env)){
      if(/Primordial|Wilderness|Subterranean|Domesticated/.test(name)) return true;
    }
    if(field==='locationType' && cls.includes('spaceArtificial')){
      if(/Volcanic|Storm Plain|Tectonic|Toxic Basin|Unmapped Valley|Predator|Weather Station|Agricultural Dome|Frontier Town|Cavern Network|Alien Catacombs/.test(name)) return true;
    }
    if(field==='locationType' && /Station Interior|Medical Habitat|Cargo Hold|Ship Interior|Military Facility/i.test(env) && /Primordial|Wilderness/.test(dev)) return true;
    if(field==='districtZone' && cls.includes('spaceArtificial') && /Old Survey Cut|Main Drift|Pump Gallery|Excavation Pit|Outer Seal|Sealed Repository|Glyph Chamber/.test(name) && !/Relic|Ruined Megastructure|Subterranean Network/i.test(env+' '+dev)) return true;
    if(field==='encounterSite' && cls.includes('spaceArtificial') && /Pressure Plate|Living Wall|Dustless Pedestal|Narrow Passage/.test(name) && !/Relic|Ruined/i.test(env+' '+dev)) return true;
    return false;
  }
  function optsFor(field,a){
    const parent=parentField(field); const parentValue=parent?a.fields[parent].value:'';
    let rows=baseCandidates(field,a).filter(o=>parentAllows(o,field,parentValue));
    rows=rows.filter(o=>!incompatibleOption(o,field,a));
    // Intent-aware narrowing: story text biases options without overriding pinned/valid choices.
    const st=storyText(a);
    if(field==='world' && /hospital|clinic|medical|biotoxin|epidemic/.test(st)) rows=rows.concat([opt('Hospital Moon',92,['moon','medical','settled','corporate','clinic','transport'])]);
    if(field==='environment' && /cargo|freight|transport|box|crate/.test(st)) rows=rows.concat([opt('Cargo Hold / Freight Deck',94,['ship','cargo','interior','trade','transport','artificial'],{world:[a.fields.world.value||'Current Campaign World']})]);
    if(field==='environment' && /derelict|what happened to the ship|wreck|hulk/.test(st)) rows=rows.concat([opt('Ship Interior',96,['ship','interior','artificial','space','derelict','cargo'],{world:[a.fields.world.value||'Current Campaign World']})]);
    if(field==='environment' && /hospital|clinic|medical|biotoxin|epidemic|quarantine/.test(st)) rows=rows.concat([opt('Medical Habitat',95,['station','medical','clinic','quarantine','artificial','civilized'],{world:[a.fields.world.value||'Current Campaign World']})]);
    const scored=rows.map(o=>[o.name,scoreCandidate(o,field,a),o]).sort((x,y)=>y[1]-x[1]||x[0].localeCompare(y[0]));
    const seen=new Set(), out=[]; for(const [n,s,o] of scored){ if(seen.has(n))continue; seen.add(n); out.push([n,s,o]); }
    return out;
  }
  function hasOpt(field,a,value){return !!value && optsFor(field,a).some(o=>o[0]===value);}
  function best(field,a){return optsFor(field,a)[0]||['',0,null];}

  function applyDownstreamValidation(a,changed){
    const idx=ORDER.indexOf(changed); if(idx<0)return;
    const changedLabels=[];
    for(let i=idx+1;i<ORDER.length;i++){
      const k=ORDER[i], f=a.fields[k];
      if(!f.value){ const [v,c]=best(k,a); if(v){a.fields[k]={...f,value:v,confidence:c,status:'suggested',pinned:false}; changedLabels.push(`${LABELS[k]} suggested`);} continue; }
      if(hasOpt(k,a,f.value)){
        // Valid values remain exactly as the GM left them. Do not alter pin/status.
        continue;
      }
      const [v,c]=best(k,a);
      a.fields[k]={...f,value:v||'',confidence:c||0,status:'suggested',pinned:false};
      delete a.fields[k].suggestedValue; delete a.fields[k].suggestedConfidence;
      changedLabels.push(`${LABELS[k]} revised`);
    }
    updateAtmosphere(a); a.sceneDescription='';
    a.lastCascadeNudge=changedLabels.length?`Updated only invalid downstream choices: ${changedLabels.join(', ')}.`:'All downstream choices still fit. Nothing else changed.';
  }
  function setField(a,k,value){
    const found=optsFor(k,a).find(o=>o[0]===value) || [value,75,null];
    a.fields[k]={...clone(a.fields[k]),value,confidence:found[1],status:'pinned',pinned:true};
    applyDownstreamValidation(a,k);
  }
  function togglePin(a,k){
    const f=a.fields[k]; if(!f.value){a.lastCascadeNudge=`Choose a ${LABELS[k]} before pinning it.`;return;}
    f.pinned=!f.pinned; f.status=f.pinned?'pinned':'suggested';
    a.lastCascadeNudge=(f.pinned?'Pinned ':'Unpinned ')+LABELS[k]+'. No other field changed.';
  }
  function shuffleBelow(a,k){
    const [v,c]=best(k,a); if(v){a.fields[k]={...clone(a.fields[k]),value:v,confidence:c,status:'suggested',pinned:false};}
    // Intentional shuffle from this point downward, but upstream remains untouched.
    for(let i=ORDER.indexOf(k)+1;i<ORDER.length;i++){const d=ORDER[i];const [nv,nc]=best(d,a);a.fields[d]={...clone(a.fields[d]),value:nv||'',confidence:nc||0,status:'suggested',pinned:false};}
    updateAtmosphere(a); a.sceneDescription=''; a.lastCascadeNudge=`Surprise Me refreshed ${LABELS[k]} and choices below it only.`;
  }
  function suggestFromSituation(a){
    const changed=[];
    ORDER.forEach(k=>{
      const f=a.fields[k];
      if(f.value && hasOpt(k,a,f.value)) return;
      const [v,c]=best(k,a);
      if(v && f.value!==v){a.fields[k]={...f,value:v,confidence:c,status:'suggested',pinned:false};changed.push(LABELS[k]);}
    });
    updateAtmosphere(a); a.sceneDescription=''; a.lastChangedCard='situation';
    a.lastCascadeNudge=changed.length?`Suggested setting refreshed from current situation: ${changed.join(', ')}.`:'Current setting already fits the situation.';
  }

  function updateAtmosphere(a){
    const txt=[a.fields.world.value,a.fields.environment.value,a.fields.development.value,a.fields.locationType.value,a.fields.districtZone.value,a.fields.encounterSite.value,storyText(a)].join(' ');
    a.atmosphere.lighting=/derelict|abandoned|dead|crashed|desolated/i.test(txt)?'Flickering emergency light, shadows, and dead zones':/station|habitat|industrial|cargo|clinic/i.test(txt)?'Functional work lights with blind spots':'Local light shaped by terrain, weather, or old infrastructure';
    a.atmosphere.smell=/medical|clinic|triage|quarantine|biotoxin|epidemic/i.test(txt)?'Disinfectant, plastic sheeting, and something sour underneath':/vacuum|eva|space/i.test(txt)?'Suit plastic, static, and stale breath':/cargo|freight|box|crate/i.test(txt)?'Cold packing foam, lubricant, and warehouse dust':/volcanic|toxic/i.test(txt)?'Sulfur, scorched minerals, and warning chemicals':'Ozone, oil, dust, and human fatigue';
    a.atmosphere.noise=/derelict|crashed|abandoned/i.test(txt)?'Settling metal, failing systems, and distant knocks':/station|industrial|mining|refinery|cargo/i.test(txt)?'Fans, machinery, cargo movers, and intermittent alarms':'Wind, structural creaks, and far-off motion';
    a.atmosphere.visibility=/fog|storm|toxic|coolant|dust|smoke|frozen/i.test(txt)?'Partially obscured':'Clear enough to notice one wrong detail';
    a.atmosphere.activity=/derelict|desolated|dead|crashed/i.test(txt)?'No normal activity; evidence of sudden interruption':/urban|station|clinic|cargo|hub|depot/i.test(txt)?'People are present, but not everyone wants attention':'Sparse signs of work, travel, or life';
    a.atmosphere.hazard=/biotoxin|quarantine|medical|epidemic/i.test(txt)?'Contamination, triage pressure, or a delayed diagnosis':/cargo|box|manifest|competitor/i.test(txt)?'The cargo attracts rivals, scrutiny, or the wrong buyer':/reactor|engineering|power|coolant/i.test(txt)?'Mechanical failure or dangerous energy':/vacuum|eva/i.test(txt)?'Exposure, decompression, or suit limits':'Delay will increase heat, danger, or attention';
    a.atmosphere.opportunity=/recorder|console|terminal|manifest|records|data/i.test(txt)?'A data trail, record, or control override':/cargo|crate|box|storage|lockup/i.test(txt)?'Useful cargo, evidence, or leverage':/medical|biotoxin|epidemic/i.test(txt)?'A treatment clue, missing supply, or witness':/relic|alien|glyph|vault/i.test(txt)?'An anomalous clue or artifact':'A useful route, witness, or overlooked tool';
  }

  function saveVisible(a){
    if($('paUpdateFocus')) a.focusTopic=$('paUpdateFocus').value;
    if($('paObjective')) a.situation.objective=$('paObjective').value;
    if($('paThread')) a.situation.thread=$('paThread').value;
    if($('paStakes')) a.situation.stakes=$('paStakes').value;
    if($('paOpportunity')) a.situation.opportunity=$('paOpportunity').value;
    if($('paFactionEntity')) a.entityContext.faction=$('paFactionEntity').value;
    if($('paLocationEntity')) a.entityContext.location=$('paLocationEntity').value;
    if($('paAssetEntity')) a.entityContext.asset=$('paAssetEntity').value;
    if($('paCampaignName')) a.legacy.campaignName=$('paCampaignName').value;
    if($('paLegacyIntent')) { a.legacy.sceneIntent=$('paLegacyIntent').value; a.experience.storyIntent=a.legacy.sceneIntent; }
    if($('paLegacyPacing')) { a.legacy.pacing=$('paLegacyPacing').value; a.experience.pacing=a.legacy.pacing; }
    if($('paLegacyPhase')) a.legacy.scenePhase=$('paLegacyPhase').value;
    if($('paLegacyThreat')) { a.legacy.threatLevel=Number($('paLegacyThreat').value||0); a.director.danger=a.legacy.threatLevel; }
    if($('paLegacyMystery')) { a.legacy.mysteryLevel=Number($('paLegacyMystery').value||0); a.director.mystery=a.legacy.mysteryLevel; }
    if($('paLegacyPredictability')) a.legacy.predictability=Number($('paLegacyPredictability').value||0);
    if($('paLegacyUseContinuity')) a.legacy.useContinuity=$('paLegacyUseContinuity').checked;
    if($('paLegacyEscalate')) a.legacy.escalateOnComplication=$('paLegacyEscalate').checked;
    if($('paLegacyConflictArch')) a.legacy.useConflictArchitecture=$('paLegacyConflictArch').checked;
    if($('paMissionSeed')) a.legacy.missionSeed=$('paMissionSeed').value;
    if($('paWorldSeed')) a.legacy.worldSeed=$('paWorldSeed').value;
    if($('paGenre')) a.experience.genre=$('paGenre').value;
    if($('paSceneMode')) a.experience.sceneMode=$('paSceneMode').value;
    if($('paTone')) a.experience.tone=$('paTone').value;
    if($('paGuidance')) a.experience.guidance=$('paGuidance').value;
    if($('paPacing')) a.experience.pacing=$('paPacing').value;
    if($('paPredict')) a.experience.predictability=$('paPredict').value;
    if($('paGenerateKind')) a.experience.generateKind=$('paGenerateKind').value;
    if($('paStoryIntent')) a.experience.storyIntent=$('paStoryIntent').value;
    if($('paPlayMode')) a.experience.playMode=$('paPlayMode').value;
    if($('paPlayStep')) a.experience.playStep=$('paPlayStep').value;
    ['previous','npcs','factions','mysteries','plot','escalate'].forEach(k=>{const el=$('paCont_'+k); if(el) a.continuity[k]=el.checked;});
    ['mood','danger','hope','mystery','resources','momentum'].forEach(k=>{const el=$('paDir_'+k); if(el) a.director[k]=Number(el.value||0);});
    ['exploration','roleplaying','corporate','horror','combat','mystery'].forEach(k=>{const el=$('paWeight_'+k); if(el) a.weighting[k]=Number(el.value||0);});
    ['primaryLoop','roleplayLayer','tacticalLayer','worldLayer','colonyLayer','characterSheet'].forEach(k=>{const el=$('paSys_'+k); if(el) a.systemBridge[k]=el.value;});
    if($('paSceneDescription')) a.sceneDescription=$('paSceneDescription').value;
  }
  function derivedLocation(a){return [a.fields.locationType.value,a.fields.districtZone.value,a.fields.encounterSite.value].filter(Boolean).join(' — ') || 'No current location selected yet.';}
  function syncLegacy(a){
    const loc=derivedLocation(a);
    try{
      const app=appState();
      app.campaignName=(a.legacy&&a.legacy.campaignName)||app.campaignName||'';
      app.planet=a.fields.world.value||app.planet||'';
      app.biome=a.fields.environment.value||app.biome||'';
      app.locationType=a.fields.locationType.value||'';
      app.surroundings=[a.fields.districtZone.value,a.fields.encounterSite.value].filter(Boolean).join(' — ');
      app.intent=(a.legacy&&a.legacy.sceneIntent)||a.experience.storyIntent||app.intent;
      app.pacing=(a.legacy&&a.legacy.pacing)||a.experience.pacing||app.pacing;
      app.phase=(a.legacy&&a.legacy.scenePhase)||app.phase;
      app.threatLevel=(a.legacy&&a.legacy.threatLevel!==undefined)?a.legacy.threatLevel:a.director.danger;
      app.mysteryLevel=(a.legacy&&a.legacy.mysteryLevel!==undefined)?a.legacy.mysteryLevel:a.director.mystery;
      app.predictability=(a.legacy&&a.legacy.predictability!==undefined)?a.legacy.predictability:app.predictability;
      app.currentThread=a.situation.thread||app.currentThread||'';
      app.useContinuity=!!(a.legacy&&a.legacy.useContinuity);
      app.escalateOnComplication=!!(a.legacy&&a.legacy.escalateOnComplication);
      app.useConflictArchitecture=!!(a.legacy&&a.legacy.useConflictArchitecture);
      app.missionSeed=(a.legacy&&a.legacy.missionSeed)||app.missionSeed||'';
      app.worldSeed=(a.legacy&&a.legacy.worldSeed)||app.worldSeed||'';
      localStorage.setItem(APP_STORE,JSON.stringify(app));
    }catch(e){}
    const set=(id,val)=>{const el=$(id); if(el) { if(el.type==='checkbox') el.checked=!!val; else el.value=val??''; }};
    set('campaignName',a.legacy&&a.legacy.campaignName);
    set('planet',a.fields.world.value);
    set('biome',a.fields.environment.value);
    set('locationType',a.fields.locationType.value);
    set('surroundings',[a.fields.districtZone.value,a.fields.encounterSite.value].filter(Boolean).join(' — '));
    set('intent',(a.legacy&&a.legacy.sceneIntent)||a.experience.storyIntent);
    set('pacing',(a.legacy&&a.legacy.pacing)||a.experience.pacing);
    set('phase',a.legacy&&a.legacy.scenePhase);
    set('threatLevel',(a.legacy&&a.legacy.threatLevel!==undefined)?a.legacy.threatLevel:a.director.danger);
    set('mysteryLevel',(a.legacy&&a.legacy.mysteryLevel!==undefined)?a.legacy.mysteryLevel:a.director.mystery);
    set('predictability',a.legacy&&a.legacy.predictability);
    set('currentThread',a.situation.thread);
    set('useContinuity',a.legacy&&a.legacy.useContinuity);
    set('escalateOnComplication',a.legacy&&a.legacy.escalateOnComplication);
    set('useConflictArchitecture',a.legacy&&a.legacy.useConflictArchitecture);
    set('missionSeed',a.legacy&&a.legacy.missionSeed);
    set('worldSeed',a.legacy&&a.legacy.worldSeed);
    if($('sdLocation'))$('sdLocation').value=loc; if($('sdDistrict'))$('sdDistrict').value=a.fields.districtZone.value||''; if($('sdObjective'))$('sdObjective').value=a.situation.objective||'';
    try{ if(window.SagaStoryDirector&&window.SagaStoryDirector.setCurrentLocation) window.SagaStoryDirector.setCurrentLocation(loc);}catch(e){}
  }
  function nextRecommendation(a){const t=storyText(a); if(/cargo|box|transport|deliver/.test(t))return 'Reveal what the cargo really means.'; if(/medical|biotoxin|epidemic/.test(t))return 'Force a triage choice before the evidence is complete.'; if(/derelict|ship|what happened/.test(t))return 'Find a record that answers one question and opens another.'; if(/relic|alien/.test(t))return 'Let the environment demonstrate the mystery before explaining it.'; return whyOptions(a)[0]?.[0]||'Unexpected discovery';}

  function focusTopicOptions(){return ['Storyline / current decision','Location / environment','Mood / danger level','Timers / tracker progress','Rules / play procedure','Colony / base sheet','Oracles / inspiration weighting','Show everything'];}
  function focusAllows(a,card){
    const t=a.focusTopic||'Storyline / current decision';
    if(t==='Show everything') return true;
    const map={
      'Storyline / current decision':['situation','continuity','beat'],
      'Location / environment':['environment'],
      'Mood / danger level':['director','experience'],
      'Timers / tracker progress':[],
      'Rules / play procedure':['system','beat'],
      'Colony / base sheet':['system'],
      'Oracles / inspiration weighting':['weighting','inspiration']
    };
    return (map[t]||[]).includes(card);
  }
  function maybeCard(a,card,html){ if(card==='inspiration') return ''; return focusAllows(a,card)?html:'';}
  function focusHelp(a){
    const t=a.focusTopic||'';
    const help={
      'Storyline / current decision':'Change only the story question, stakes, opportunity, and beat. Use this during active play.',
      'Location / environment':'Show the context graph: planet/world, biome/environment, development, location, zone, and site.',
      'Mood / danger level':'Tune pressure, hope, mystery, pacing, and tone without changing the current place.',
      'Timers / tracker progress':'Use the center Party Dashboard / Director State tabs for manual tracks, timers, resources, and read-only campaign pressure. The left panel hides unrelated controls.',
      'Rules / play procedure':'Switch between freeform Saga Atlas, 5PFH campaign steps, Planetfall colony turns, Starforged-style roleplay, or tactical battles.',
      'Colony / base sheet':'Use the Colony tab for a Planetfall-inspired worksheet while keeping story context here.',
      'Oracles / inspiration weighting':'Adjust what kind of inspiration the Story Engine favors while the GM remains in control.',
      'Show everything':'All Story Director controls are visible.'
    };
    return help[t]||'Choose what you want to update and Saga Atlas shows only the relevant GM decisions.';
  }

  function missionControl(a){const act=(window.SagaStoryDirector&&window.SagaStoryDirector.getCurrentAct&&window.SagaStoryDirector.getCurrentAct())||'Current Story'; const scene=(window.SagaStoryDirector&&window.SagaStoryDirector.getSceneNumber&&window.SagaStoryDirector.getSceneNumber())||'Scene'; return `<div class="sd-mission-control" aria-label="Story Director mission control"><div><span>Current Story</span><b>${esc(act)}</b></div><div><span>${esc(String(scene))}</span><b>${esc(derivedLocation(a))}</b></div><div><span>Current Objective</span><b>${esc(a.situation.objective||'Define the objective')}</b></div><div><span>Next Recommendation</span><b>${esc(nextRecommendation(a))}</b></div></div>`;}
  function optionListHtml(k,a){const options=optsFor(k,a); const f=a.fields[k]; const selected=f.value||''; const placeholder=`<option value="" ${selected?'':'selected'}>— select an option —</option>`; return placeholder+options.map(o=>`<option value="${escA(o[0])}" ${o[0]===selected?'selected':''}>${esc(o[0])} — ${o[1]}%</option>`).join('');}
  function fieldRow(k,a){const f=a.fields[k]; const options=optsFor(k,a); const top=options.slice(0,4); const visual=f.status==='revise'?'revise':(f.pinned?'pinned':'suggested'); const pct=f.confidence||best(k,a)[1]||0; return `<div class="sd-cascade-field ${f.status==='revise'?'needs-revision':''}" data-field="${k}"><div class="sd-field-top"><div><b>${LABELS[k]}</b><span class="small">${HELP[k]}</span></div><div class="sd-field-tools"><span class="sd-status ${visual}">${STATUS[visual]}</span><span class="sd-confidence" title="Applicability ranking">${pct}%</span><button type="button" class="tiny secondary" data-sd-pin="${k}" title="Pin/unpin this GM choice only">📌</button><button type="button" class="tiny secondary" data-sd-dice="${k}" title="Surprise me from here downward">🎲</button></div></div><select data-sd-cascade="${k}">${optionListHtml(k,a)}</select><div class="sd-chip-row">${top.map(o=>`<button type="button" class="tiny secondary sd-context-chip" data-sd-chip="${k}" data-value="${escA(o[0])}">${esc(o[0])} <span>${o[1]}%</span></button>`).join('')}${options.length>4?'<span class="small sd-more-chip">More in dropdown…</span>':''}</div></div>`;}
  function selectField(id,label,value,options){return `<label>${label}<select id="${id}">${options.map(o=>`<option ${o===value?'selected':''}>${esc(o)}</option>`).join('')}</select></label>`;}
  function entitySelect(id,label,value,type){const rows=entityOptions(type); return `<label>${label}<select id="${id}" data-entity-select="${type}"><option value="">Auto / no specific ${label.toLowerCase()}</option>${rows.map(e=>`<option value="${escA(e.name)}" ${e.name===value?'selected':''}>${esc(e.name)}</option>`).join('')}</select><span class="small">Uses defined ${type} entities and their tags as context. Opens fresh on click/focus.</span></label>`;}
  function refreshEntityDropdown(el){
    const type=el.dataset.entitySelect; if(!type) return;
    const current=el.value;
    const label=el.id==='paFactionEntity'?'Faction':el.id==='paLocationEntity'?'Known Location':'Asset / Ship / Vehicle';
    const rows=entityOptions(type);
    el.innerHTML=`<option value="">Auto / no specific ${label.toLowerCase()}</option>${rows.map(e=>`<option value="${escA(e.name)}" ${e.name===current?'selected':''}>${esc(e.name)}</option>`).join('')}`;
    if(current && !Array.from(el.options).some(o=>o.value===current)){ const opt=document.createElement('option'); opt.value=current; opt.textContent=current+' (not currently listed)'; opt.selected=true; el.appendChild(opt); }
  }
  function whyOptions(a){const txt=[storyText(a),derivedLocation(a),Object.values(a.atmosphere).join(' ')].join(' '); const out=[]; if(/cargo|box|manifest|supply|transport/.test(txt))out.push(['The cargo is more valuable than declared',94],['A competitor wants the shipment diverted',86]); if(/medical|hospital|biotoxin|epidemic|quarantine/.test(txt))out.push(['Triage pressure is hiding a larger outbreak',94],['Someone is exploiting the emergency',88]); if(/derelict|crashed|abandoned|ship/.test(txt))out.push(['Past failure is becoming active again',92],['Someone arrived here before the crew',84]); if(/corporate|industrial|mining|refinery/.test(txt))out.push(['Corporate liability control is shaping the scene',82]); out.push(['Local desperation creates bad choices',76],['A faction is using the situation as cover',72],['The obvious explanation is only partly true',68]); return out.slice(0,5);}
  function storySpine(a){const f=a.fields; const why=whyOptions(a)[0]||['The obvious explanation is only partly true',68]; const tags=semanticTags(a).slice(0,8).join(', '); const clue=/Recorder|Console|Terminal|Manifest|Records|Data|Vial|Biotoxin|Crate/i.test(f.encounterSite.value)?f.encounterSite.value:(a.atmosphere.opportunity||'A useful clue or leverage point'); return `Scene Context Tags: ${tags||'none yet'}\nWorld / Planet: ${f.world.value||'Auto'}\nBiome / Environment: ${f.environment.value||'Auto'}\nDevelopment: ${f.development.value||'Auto'}\nLocation: ${derivedLocation(a)}\nStory Beat: ${a.experience.generateKind||'Scene'} / ${a.experience.storyIntent||'Let oracles decide'}\nStructured Play: ${a.experience.playMode||'Freeform Saga Atlas'} / ${a.experience.playStep||'Choose Campaign Step'}
Rules Bridge: ${a.systemBridge.primaryLoop||'Freeform Story Director'} + ${a.systemBridge.roleplayLayer||'Starforged-style moves'} + ${a.systemBridge.tacticalLayer||'None'}\nFaction Context: ${a.entityContext.faction||'Auto'}\nKnown Location Context: ${a.entityContext.location||'Auto'}\nPressure: ${a.atmosphere.hazard||'Delay increases heat or danger.'}\nKey Clue / Opportunity: ${clue}\nWhy this is happening: ${why[0]} (${why[1]}%)\nLikely consequence: ${a.atmosphere.hazard||'Delay increases heat or danger.'}`;}
  function sceneDescription(a){const loc=derivedLocation(a);const why=whyOptions(a)[0];return `The scene opens on ${a.fields.world.value||'the current world'} in ${a.fields.environment.value||'the current environment'}, at ${loc}. ${a.atmosphere.lighting||'The environment offers an immediate sensory clue'} while ${a.atmosphere.noise||'background pressure reminds the crew that time matters'}.\n\nThe current objective is ${a.situation.objective||'not yet defined'}. The driving question is ${a.situation.thread||'what changes because the crew gets involved?'}. The most useful opportunity is ${a.atmosphere.opportunity||a.situation.opportunity||'something the crew can exploit'}, but the immediate hazard is ${a.atmosphere.hazard||'a pressure that worsens if ignored'}.\n\nWhy this may be happening: ${why[0]}. Treat this as a suggestion, not a decision.`;}
  function inspirationMarkup(a){return `<div class="sd-inspiration-grid"><div><h5>What is happening?</h5><p>${esc(a.situation.objective||'Define what the crew is trying to accomplish, then ask for setting suggestions.')}</p></div><div><h5>What do the players notice?</h5><p>${esc([a.atmosphere.lighting,a.atmosphere.smell,a.atmosphere.noise].filter(Boolean).join('; ')||'The scene needs a few sensory anchors.')}</p></div><div><h5>What opportunity stands out?</h5><p>${esc(a.atmosphere.opportunity||a.situation.opportunity||'A clue, route, witness, or leverage point.')}</p></div><div><h5>What could go wrong?</h5><p>${esc(a.atmosphere.hazard||'Delay should increase heat, danger, or resource pressure.')}</p></div><div><h5>Why is this happening?</h5>${whyOptions(a).map(o=>`<button type="button" class="tiny secondary sd-why-chip">${esc(o[0])} <span>${o[1]}%</span></button>`).join('')}</div><div><h5>Recommended nudge</h5><p>${esc(a.lastCascadeNudge||'Use the strongest unanswered question as the scene pressure point.')}</p></div></div><label>Scene Description<textarea id="paSceneDescription" rows="7">${esc(a.sceneDescription||sceneDescription(a))}</textarea></label>`;}

  function sliderField(id,label,value){return `<label class="sd-slider">${label}<input id="${id}" type="range" min="0" max="8" value="${Number(value||0)}"><span>${'■'.repeat(Math.max(0,Number(value||0))).padEnd(8,'□')}</span></label>`;}
  function checkRow(id,label,checked){return `<label class="sd-check"><input id="${id}" type="checkbox" ${checked?'checked':''}>${label}</label>`;}

  function checked(v){return v?'checked':'';}
  function legacySituationControls(a){
    const L=a.legacy||{};
    return `<details class="sd-collapse sd-legacy-merged" open><summary>Scene setup and compatibility inputs</summary><p class="small">These were formerly in Advanced Engine / Compatibility Controls. They now live here so the GM can shape the scene from one place while older generator code still receives synced values.</p><div class="sd-grid"><label>Campaign / Region<input id="paCampaignName" value="${escA(L.campaignName||'')}" placeholder="Frontier Reach, company route, colonial sector..."></label>${selectField('paLegacyIntent','Scene Intent',L.sceneIntent||a.experience.storyIntent,['Let oracles decide','Reveal information','Increase tension','Introduce danger','Develop NPC or faction','Advance mystery','Reward exploration','Force meaningful choice','Escalate threat','Give recovery or hope'])}${selectField('paLegacyPacing','Pacing',L.pacing||a.experience.pacing,['Calm setup','Rising tension','Fast escalation','Slow burn','Aftermath breathing room'])}${selectField('paLegacyPhase','Scene Phase',L.scenePhase||'Discovery',['Opening Hook','Approach','Discovery','Clue Reveal','Complication','Roleplay Pressure','Threat Escalation','Meaningful Choice','Confrontation','Aftermath'])}<label>Threat Level<input id="paLegacyThreat" type="number" min="0" max="10" step="1" value="${escA(L.threatLevel??a.director.danger)}"></label><label>Mystery Level<input id="paLegacyMystery" type="number" min="0" max="10" step="1" value="${escA(L.mysteryLevel??a.director.mystery)}"></label><label>Predictability<input id="paLegacyPredictability" type="range" min="0" max="100" value="${escA(L.predictability??50)}"><span class="small">${esc(L.predictability??50)}%</span></label></div><div class="rules sd-merged-rules"><label><input id="paLegacyUseContinuity" type="checkbox" ${checked(L.useContinuity)}>Reuse previous scene elements</label><label><input id="paLegacyEscalate" type="checkbox" ${checked(L.escalateOnComplication)}>Escalate after complications</label><label><input id="paLegacyConflictArch" type="checkbox" ${checked(L.useConflictArchitecture)}>Add stakes, opposition logic, and meaningful choice</label></div><label>Mission Seed<textarea id="paMissionSeed" rows="3" placeholder="Generate or paste the current mission seed here for continuity reference.">${esc(L.missionSeed||'')}</textarea></label><label>World Seed<textarea id="paWorldSeed" rows="3" placeholder="Generate or paste the current world / colony seed here for continuity reference.">${esc(L.worldSeed||'')}</textarea></label></details>`;
  }

  function compactDirectorControls(a){
    const continuity=`<details class="sd-card sd-phase-card" open><summary><h4>Campaign Continuity</h4></summary><div class="sd-check-grid">${checkRow('paCont_previous','Continue previous storyline',a.continuity.previous)}${checkRow('paCont_npcs','Reuse existing NPCs',a.continuity.npcs)}${checkRow('paCont_factions','Reuse existing factions',a.continuity.factions)}${checkRow('paCont_mysteries','Continue unresolved mysteries',a.continuity.mysteries)}${checkRow('paCont_plot','Advance campaign plot',a.continuity.plot)}${checkRow('paCont_escalate','Escalate danger gradually',a.continuity.escalate)}</div></details>`;
    const beat=`<details class="sd-card sd-phase-card" open><summary><h4>Story Beat & Intent</h4></summary><div class="sd-grid">${selectField('paGenerateKind','Generate...',a.experience.generateKind,['Entire Adventure','Story Beat','Scene','Encounter','Conversation','Discovery','Downtime','Travel','Combat','Investigation'])}${selectField('paStoryIntent','What should this accomplish?',a.experience.storyIntent,['Reveal information','Increase tension','Introduce danger','Develop NPC','Advance mystery','Character growth','Reward exploration','Surprise everyone','Let oracles decide'])}</div></details>`;
    const system=`<details class="sd-card sd-phase-card" open><summary><h4>System Bridge / Short Session Flow</h4></summary><p class="small">Seamlessly switch rules without changing the story. The Story Director keeps narrative continuity; the chosen system only decides which prompts, sheets, and next-step checklists are emphasized.</p><div class="sd-grid">${selectField('paPlayMode','Play Mode',a.experience.playMode,['Freeform Saga Atlas','5PFH Campaign Loop + Starforged RP','Starforged-first exploration','5PFH battle-focused session'])}${selectField('paPlayStep','Current Step',a.experience.playStep,['Choose Campaign Step','Upkeep / Crew Status','Find Patron / Job','Assign Equipment / Cargo','Travel / World Event','Pre-Battle Roleplay Scene','Battle / Encounter','Post-Battle Injuries & Loot','Campaign Event / Rivals','Downtime / Character Scene','Journal Reflection / What did I overlook?'])}${selectField('paSys_primaryLoop','Primary Loop',a.systemBridge.primaryLoop,['Freeform Story Director','5PFH Campaign Turn','5PFH Planetfall Colony Turn','Starforged Expedition','CWN Mission / Job Cycle','Hostile-style contract operation'])}${selectField('paSys_roleplayLayer','Roleplay Layer',a.systemBridge.roleplayLayer,['Starforged-style moves','Light oracle prompts only','Conversation scenes','No roleplay layer'])}${selectField('paSys_tacticalLayer','Tactical Layer',a.systemBridge.tacticalLayer,['None / Theater of the Mind','5PFH tabletop battle','5PFH Bug Hunt style mission','CWN tactical scene','Hostile/Cepheus encounter'])}${selectField('paSys_worldLayer','World Layer',a.systemBridge.worldLayer,['Hostile-compatible lore','5PFH frontier world','Planetfall colony development','CWN urban/corporate sandbox','Starforged sector exploration'])}${selectField('paSys_colonyLayer','Colony / Base Layer',a.systemBridge.colonyLayer,['Off','Planetfall colony worksheet','Ship/base upkeep worksheet','Trade route worksheet'])}${selectField('paSys_characterSheet','Character Sheet Focus',a.systemBridge.characterSheet,['Story-only','5PFH crew stats','Starforged assets/moves','Hybrid crew roster'])}</div><p class="small"><b>Influence rule:</b> Genre Lens colors tone; Scene Mode says how the scene plays; Play Mode/Current Step provides procedure. If they disagree, Story Director keeps the story context and treats the system choices as optional procedure, not narrative truth.</p></details>`;
    const director=`<details class="sd-card sd-phase-card" open><summary><h4>Campaign Director</h4></summary><div class="sd-slider-grid">${sliderField('paDir_mood','Mood',a.director.mood)}${sliderField('paDir_danger','Danger',a.director.danger)}${sliderField('paDir_hope','Hope',a.director.hope)}${sliderField('paDir_mystery','Mystery',a.director.mystery)}${sliderField('paDir_resources','Resources',a.director.resources)}${sliderField('paDir_momentum','Momentum',a.director.momentum)}</div></details>`;
    const weighting=`<details class="sd-card sd-phase-card" open><summary><h4>Story Sources / Oracle Weighting</h4></summary><div class="sd-slider-grid">${sliderField('paWeight_exploration','Exploration',a.weighting.exploration)}${sliderField('paWeight_roleplaying','Roleplaying',a.weighting.roleplaying)}${sliderField('paWeight_corporate','Corporate',a.weighting.corporate)}${sliderField('paWeight_horror','Horror',a.weighting.horror)}${sliderField('paWeight_combat','Combat',a.weighting.combat)}${sliderField('paWeight_mystery','Mystery',a.weighting.mystery)}</div><p class="small">The Story Engine chooses tables from these weights; users can still roll individual Oracles from the Oracle tab.</p></details>`;
    return [maybeCard(a,'continuity',continuity),maybeCard(a,'beat',beat),maybeCard(a,'system',system),maybeCard(a,'director',director),maybeCard(a,'weighting',weighting)].join('');
  }

  function render(){const panel=$('storyDirectorDashboard'); if(!panel)return; const a=load(); saveVisible(a); updateAtmosphere(a); save(a); syncLegacy(a); const current=qs('.sd-view[data-sd-view="current"]'); if(!current)return; if(!$('phaseAStoryDirector')){const old=qs('.sd-current-card',current); if(old)old.style.display='none'; const div=document.createElement('div'); div.id='phaseAStoryDirector'; current.insertBefore(div,current.firstChild);} $('phaseAStoryDirector').innerHTML=`<div class="sd-card sd-phase-focus"><label>I want to update...<select id="paUpdateFocus">${focusTopicOptions().map(x=>`<option ${x===a.focusTopic?'selected':''}>${esc(x)}</option>`).join('')}</select></label><p class="small">${esc(focusHelp(a))}</p></div>${maybeCard(a,'situation',`<details class="sd-card sd-phase-card" open><summary><h4>Shaping the Situation</h4></summary><p class="small">Make the decision you are making right now. Story Director suggests; the GM decides.</p><div class="sd-grid"><label>Current Objective<input id="paObjective" value="${escA(a.situation.objective)}" placeholder="What are the crew trying to accomplish now?"></label><label>Current Thread / Question<input id="paThread" value="${escA(a.situation.thread)}" placeholder="What unresolved question is driving this beat?"></label><label>Stakes Focus<input id="paStakes" value="${escA(a.situation.stakes)}" placeholder="What gets worse if they fail or delay?"></label><label>Opportunity<input id="paOpportunity" value="${escA(a.situation.opportunity)}" placeholder="What tempts the players to engage?"></label>${entitySelect('paFactionEntity','Faction',a.entityContext.faction,'faction')}${entitySelect('paLocationEntity','Known Location',a.entityContext.location,'location')}${entitySelect('paAssetEntity','Asset / Ship / Vehicle',a.entityContext.asset,'asset')}</div>${legacySituationControls(a)}<div class="sd-derived-location"><b>Derived Current Location</b><span>${esc(derivedLocation(a))}</span><em class="small">Built from the same context graph as the Story Spine and Scene Description. Use Suggest Setting after changing situation text or entity context.</em><button type="button" class="tiny secondary" data-sd-recalc-intent>💡 Suggest Setting</button></div></details>`)}${compactDirectorControls(a)}${maybeCard(a,'environment',`<details class="sd-card sd-phase-card" open><summary><h4>Setting the Environment</h4></summary><p class="small"><strong>World / Planet, Biome / Environment, Development, Location, District, and Encounter Site now share one Context Graph.</strong> Context graph filters each step before ranking. Invalid downstream choices are replaced; valid choices stay exactly as the GM left them.</p><div class="sd-cascade-stack">${ORDER.map(k=>fieldRow(k,a)).join('')}</div></details>`)}${maybeCard(a,'experience',`<details class="sd-card sd-phase-card" open><summary><h4>Defining the Experience</h4></summary><p class="small">Campaign-level taste and pacing. These rarely change.</p><div class="sd-grid">${selectField('paGenre','Genre Lens',a.experience.genre,['Hostile-compatible frontier sci-fi','Corporate survival horror','Space western exploration','Military industrial sci-fi','Mystery-first sandbox','Trade and salvage frontier'])}${selectField('paSceneMode','Scene Mode',a.experience.sceneMode,['Exploration / Investigation','Social pressure','Survival hazard','Combat encounter','Downtime / recovery','Travel discovery','World evolution'])}${selectField('paTone','Tone',a.experience.tone,['Gritty but playable','Bleak and dangerous','Hope through hardship','Tense procedural','Action-forward','Quiet dread'])}${selectField('paGuidance','Guidance',a.experience.guidance,['Suggest, do not decide','More surprise','More continuity','More player agency','More hard consequences'])}${selectField('paPacing','Pacing',a.experience.pacing,['Calm setup','Rising tension','Fast escalation','Slow burn','Aftermath breathing room'])}${selectField('paPredict','Predictability',a.experience.predictability,['Balanced surprise','Grounded and logical','High twist rate','Low chaos','Let oracles decide'])}</div></details>`)}${maybeCard(a,'inspiration',`<details class="sd-card sd-phase-card" open><summary><h4>Scene Inspiration</h4></summary><p class="small">Gameplay prompts rather than a workplace report. All outputs now read from the same context graph.</p><div class="sd-atmosphere-grid sd-scene-atmosphere">${Object.entries(a.atmosphere).map(([k,v])=>`<div><span>${esc(k.replace(/\b\w/g,m=>m.toUpperCase()))}</span><b>${esc(v||'—')}</b></div>`).join('')}</div><label>Contextual Story Spine<textarea id="paStorySpine" rows="6" readonly>${esc(storySpine(a))}</textarea></label><div id="paInspiration">${inspirationMarkup(a)}</div></details>`)}`; ensureCenterDirectorTabs(a); bind(); phaseALayoutCleanup(); renderNudge(a);}

  function bind(){
    qsa('[data-sd-cascade]').forEach(el=>el.addEventListener('change',()=>{const a=load(); saveVisible(a); if(el.value){setField(a,el.dataset.sdCascade,el.value); a.lastChangedCard='environment'; save(a); render();}}));
    qsa('[data-sd-chip]').forEach(b=>b.addEventListener('click',()=>{const a=load(); saveVisible(a); setField(a,b.dataset.sdChip,b.dataset.value); a.lastChangedCard='environment'; save(a); render();}));
    qsa('[data-sd-pin]').forEach(b=>b.addEventListener('click',ev=>{ev.preventDefault(); ev.stopPropagation(); const a=load(); saveVisible(a); togglePin(a,b.dataset.sdPin); a.lastChangedCard='environment'; save(a); render();}));
    qsa('[data-sd-dice]').forEach(b=>b.addEventListener('click',()=>{const a=load(); saveVisible(a); shuffleBelow(a,b.dataset.sdDice); a.lastChangedCard='environment'; save(a); render();}));
    qsa('[data-sd-recalc-intent]').forEach(b=>b.addEventListener('click',()=>{const a=load(); saveVisible(a); suggestFromSituation(a); save(a); render();}));
    ['paUpdateFocus'].forEach(id=>{const el=$(id); if(!el)return; ['change','input'].forEach(evt=>el.addEventListener(evt,()=>{const a=load(); a.focusTopic=el.value; save(a); render();}));});
    ['paObjective','paThread','paStakes','paOpportunity'].forEach(id=>{const el=$(id); if(!el)return; el.addEventListener('input',()=>{const a=load(); saveVisible(a); a.lastChangedCard='situation'; save(a); syncLegacy(a);});});
    ['paFactionEntity','paLocationEntity','paAssetEntity'].forEach(id=>{const el=$(id); if(!el)return; el.addEventListener('focus',()=>refreshEntityDropdown(el)); el.addEventListener('mousedown',()=>refreshEntityDropdown(el)); el.addEventListener('click',()=>refreshEntityDropdown(el)); el.addEventListener('change',()=>{const a=load(); saveVisible(a); suggestFromSituation(a); save(a); render();});});
    ['paCampaignName','paLegacyIntent','paLegacyPacing','paLegacyPhase','paLegacyThreat','paLegacyMystery','paLegacyPredictability','paLegacyUseContinuity','paLegacyEscalate','paLegacyConflictArch','paMissionSeed','paWorldSeed'].forEach(id=>{const el=$(id); if(!el)return; ['change','input'].forEach(evt=>el.addEventListener(evt,()=>{const a=load(); saveVisible(a); a.lastChangedCard='situation'; save(a); syncLegacy(a); render();}));});
    ['paGenre','paSceneMode','paTone','paGuidance','paPacing','paPredict','paGenerateKind','paStoryIntent','paPlayMode','paPlayStep','paSys_primaryLoop','paSys_roleplayLayer','paSys_tacticalLayer','paSys_worldLayer','paSys_colonyLayer','paSys_characterSheet','paSceneDescription'].forEach(id=>{const el=$(id); if(!el)return; el.addEventListener('change',()=>{const a=load(); saveVisible(a); a.lastChangedCard='experience'; save(a); render();}); el.addEventListener('input',()=>{const a=load(); saveVisible(a); a.lastChangedCard='experience'; save(a);});});
  }
  document.addEventListener('change', function(ev){ if(ev.target && (ev.target.id||'').match(/^pa(Cont_|Dir_|Weight_)/)){ const a=load(); saveVisible(a); save(a); render(); } }, true);
  document.addEventListener('input', function(ev){ if(ev.target && (ev.target.id||'').match(/^pa(Dir_|Weight_)/)){ const a=load(); saveVisible(a); save(a); render(); } }, true);


  function trackerMeter(value,max){const pct=Math.max(0,Math.min(100,(Number(value||0)/Number(max||10))*100));return `<div class="sd-meter" title="${esc(value)}/${esc(max)}"><span style="width:${pct}%"></span></div>`;}
  function centerTracker(t){return `<div class="sd-tracker"><div><b>${esc(t.name||'Unnamed')}</b><p class="small">${esc(t.trigger||t.note||t.status||t.type||'')}</p></div>${t.max?trackerMeter(t.value,t.max):''}<span>${t.max?`${esc(t.value)}/${esc(t.max)}`:esc(t.value??'')}</span></div>`;}
  function directorStateMarkup(a){
    const state=(window.SagaStoryDirectorDashboardState&&window.SagaStoryDirectorDashboardState())||{};
    const sdState=state.state||{};
    const sceneItems=(state.sceneSnapshot&&Array.isArray(state.sceneSnapshot.trackers))?state.sceneSnapshot.trackers:[];
    const ids=new Set(state.currentSceneTrackerIds||[]);
    const all=[...(state.trackers||[]),...(state.threads||[]),...(state.timers||[]),...((state.party&&state.party.resources)||[]),...((state.party&&state.party.tracks)||[]),...((state.party&&state.party.timers)||[])];
    const currentScene=(sceneItems.length?sceneItems:all.filter(t=>ids.has(t.id))).slice(0,8);
    const threads=(state.threads||[]);
    const sceneLabel=(window.SagaStoryDirector&&window.SagaStoryDirector.getSceneNumber&&window.SagaStoryDirector.getSceneNumber())||'Scene #'+((((JSON.parse(localStorage.getItem(APP_STORE)||'{}')||{}).sceneLog||[]).length||0)+1);
    const stripRows=[
      ['Current Story',state.act||'Current Story'],
      ['Scene',sceneLabel],
      ['Now',derivedLocation(a)],
      ['Next beat',nextRecommendation(a)],
      ['Focus',a.situation.thread||a.situation.opportunity||a.situation.objective||'Define the current question'],
      ['Pressure',[a.fields.world.value,a.fields.environment.value].filter(Boolean).join(' / ')||'No setting pressure selected']
    ];
    const campaignRows=[
      ['Current Location',derivedLocation(a)],
      ['Objective',a.situation.objective||state.objective||'Not set'],
      ['Act',state.act||'Act I'],
      ['Beat',state.currentBeat||a.experience.storyIntent||'Discovery'],
      ['Threat',`${sdState.threat??a.director.danger}/10`],
      ['Heat',`${sdState.heat??'—'}${sdState.heat===undefined?'':'/8'}`],
      ['Hope',`${sdState.hope??a.director.hope}/10`],
      ['Mystery',`${sdState.mystery??a.director.mystery}/10`],
      ['Resources',`${sdState.resources??a.director.resources}/10`],
      ['Momentum',`${sdState.momentum??a.director.momentum}/10`]
    ];
    const atmosphere=Object.entries(a.atmosphere||{}).map(([k,v])=>`<div><span>${esc(k.replace(/\b\w/g,m=>m.toUpperCase()))}</span><b>${esc(v||'—')}</b></div>`).join('');
    const sceneInspiration=`<details class="sd-collapse" open><summary>Scene Inspiration</summary><p class="small">Creative prompts derived from the current Context Graph. This replaces the old left-side Scene Inspiration card.</p><div class="sd-atmosphere-grid sd-scene-atmosphere">${atmosphere}</div><label>Contextual Story Spine<textarea rows="6" readonly>${esc(storySpine(a))}</textarea></label><div>${inspirationMarkup(a)}</div></details>`;
    return `<div class="sd-card"><h3>Mission Control</h3><div class="sd-mission-control center-mission-control">${stripRows.map(([k,v])=>`<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div></div><div class="sd-card"><h4>Campaign State</h4><div class="sd-state-summary">${campaignRows.map(([k,v])=>`<div class="sd-state-row"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div></div>${sceneInspiration}<details class="sd-collapse" open><summary>Trackers in Current Scene</summary><div class="sd-tracker-list">${currentScene.map(centerTracker).join('')||'<p class="small">No current scene trackers yet. Start or generate a scene to suggest them.</p>'}</div></details><details class="sd-collapse" open><summary>Open Threads</summary><div class="sd-tracker-list">${threads.map(centerTracker).join('')||'<p class="small">No open threads yet.</p>'}</div></details>`;
  }
  function partyCenterMarkup(){
    const state=(window.SagaStoryDirectorDashboardState&&window.SagaStoryDirectorDashboardState())||{};
    const party=state.party||{};
    const render=(items,kind)=> (items||[]).map(t=>{
      const isCurrency=String(t.id||'').toLowerCase()==='credits'||t.type==='Currency';
      if(isCurrency){
        return `<div class="sd-tracker sd-currency-row"><div><input class="sd-inline-name" data-sd-manual-field="name" data-sd-kind="${kind}" data-sd-id="${escA(t.id)}" value="${escA(t.name||'Credits')}" aria-label="Name"><p class="small">${esc(t.note||'Currency count; not a progress track.')}</p></div><label class="sd-currency-input"><span class="small">Amount</span><input type="number" step="1" min="0" value="${Number(t.value)||0}" data-sd-currency-kind="${kind}" data-sd-currency-id="${escA(t.id)}"></label></div>`;
      }
      return `<div class="sd-tracker sd-manual-tracker"><div><input class="sd-inline-name" data-sd-manual-field="name" data-sd-kind="${kind}" data-sd-id="${escA(t.id)}" value="${escA(t.name||'Unnamed')}" aria-label="Name"><input class="sd-inline-note" data-sd-manual-field="note" data-sd-kind="${kind}" data-sd-id="${escA(t.id)}" value="${escA(t.note||t.type||'')}" aria-label="Note"></div>${trackerMeter(t.value,t.max)}<span><input class="sd-small-number" type="number" min="0" max="${Number(t.max)||10}" data-sd-manual-field="value" data-sd-kind="${kind}" data-sd-id="${escA(t.id)}" value="${Number(t.value)||0}">/<input class="sd-small-number" type="number" min="1" data-sd-manual-field="max" data-sd-kind="${kind}" data-sd-id="${escA(t.id)}" value="${Number(t.max)||10}"></span><div class="sd-track-actions"><button type="button" data-sd-step="-1" data-sd-kind="${kind}" data-sd-id="${escA(t.id)}">−</button><button type="button" data-sd-step="1" data-sd-kind="${kind}" data-sd-id="${escA(t.id)}">+</button><button type="button" class="secondary" data-sd-delete-manual data-sd-kind="${kind}" data-sd-id="${escA(t.id)}">×</button></div></div>`;
    }).join('')||'<p class="small">No records yet.</p>';
    return `<div class="sd-card"><h3>Party Dashboard</h3><p class="small">Editable party-facing resources, progress tracks, timers, and conditions. These are manual controls separate from read-only Campaign State.</p><div class="button-row sd-small-actions"><button type="button" class="secondary" data-sd-add-manual-track>Add Track</button><button type="button" class="secondary" data-sd-add-manual-timer>Add Timer</button><button type="button" class="secondary" data-sd-add-condition>Add Condition</button></div></div><details class="sd-collapse" open><summary>Party Resources</summary><div class="sd-tracker-list">${render(party.resources,'resources')}</div></details><details class="sd-collapse" open><summary>Manual Progress Tracks</summary><div class="sd-tracker-list">${render(party.tracks,'tracks')}</div></details><details class="sd-collapse" open><summary>Manual Timers</summary><div class="sd-tracker-list">${render(party.timers,'timers')}</div></details><details class="sd-collapse" open><summary>Conditions</summary><div class="sd-tracker-list">${(party.conditions||[]).map(c=>`<div class="sd-condition"><input data-sd-manual-field="text" data-sd-kind="conditions" data-sd-id="${escA(c.id)}" value="${escA(c.text||c.name||'Condition')}"><button type="button" class="secondary" data-sd-delete-manual data-sd-kind="conditions" data-sd-id="${escA(c.id)}">Remove</button></div>`).join('')||'<p class="small">No conditions yet.</p>'}</div></details>`;
  }
  function ensureCenterDirectorTabs(a){
    const tabs=document.querySelector('.center-tabs');
    const outputPanel=document.getElementById('outputPanel');
    if(!tabs||!outputPanel)return;
    if(!document.getElementById('showDirectorStateTab')){
      const b=document.createElement('button'); b.id='showDirectorStateTab'; b.className='tab-button'; b.type='button'; b.textContent='Director State'; tabs.appendChild(b);
      const p=document.createElement('div'); p.id='directorStateView'; p.className='center-view'; outputPanel.appendChild(p);
    }
    if(!document.getElementById('showCenterPartyTab')){
      const b=document.createElement('button'); b.id='showCenterPartyTab'; b.className='tab-button'; b.type='button'; b.textContent='Party'; tabs.appendChild(b);
      const p=document.createElement('div'); p.id='centerPartyView'; p.className='center-view'; outputPanel.appendChild(p);
    }
    if(!document.getElementById('showCenterColonyTab')){
      const b=document.createElement('button'); b.id='showCenterColonyTab'; b.className='tab-button'; b.type='button'; b.textContent='Colony'; tabs.appendChild(b);
      const p=document.createElement('div'); p.id='centerColonyView'; p.className='center-view'; p.innerHTML='<div class="sd-card"><h3>Colony Worksheet</h3><p class="small">Planetfall-style colony tracking has moved here from the left Story Director tabs.</p></div><div id="sdCenterColonySheet" class="sd-colony-sheet"></div>'; outputPanel.appendChild(p);
    }
    const show=(id,title)=>{
      document.querySelectorAll('#outputPanel .center-view').forEach(v=>v.classList.remove('active-view'));
      document.querySelectorAll('.center-tabs .tab-button').forEach(v=>v.classList.remove('active'));
      const v=document.getElementById(id); if(v)v.classList.add('active-view');
      const titleEl=document.getElementById('centerSectionTitle'); if(titleEl)titleEl.textContent=title;
    };
    document.getElementById('showDirectorStateTab').onclick=function(){show('directorStateView','Director State'); this.classList.add('active');};
    document.getElementById('showCenterPartyTab').onclick=function(){show('centerPartyView','Party Dashboard'); this.classList.add('active');};
    document.getElementById('showCenterColonyTab').onclick=function(){show('centerColonyView','Colony Worksheet'); this.classList.add('active'); if(window.SagaStoryDirectorDashboardRender) window.SagaStoryDirectorDashboardRender();};
    ['showJournalTab','showCenterGuideTab','showOutputTab'].forEach(id=>{const btn=document.getElementById(id); if(btn&&!btn.dataset.phaseAHideBound){btn.dataset.phaseAHideBound='1'; btn.addEventListener('click',()=>{const d=document.getElementById('directorStateView'); const c=document.getElementById('centerPartyView'); const col=document.getElementById('centerColonyView'); if(d)d.classList.remove('active-view'); if(c)c.classList.remove('active-view'); if(col)col.classList.remove('active-view');});}});
    const d=document.getElementById('directorStateView'); if(d)d.innerHTML=directorStateMarkup(a);
    const c=document.getElementById('centerPartyView'); if(c)c.innerHTML=partyCenterMarkup();
    if(window.SagaStoryDirectorDashboardRender) window.SagaStoryDirectorDashboardRender();
    ensureNarrativeDraftInSceneInspiration();
  }

  function ensureNarrativeDraftInSceneInspiration(){
    const out=document.getElementById('currentOutputView');
    if(!out)return;
    if(!document.getElementById('sdNarrativeDraft')){
      const wrap=document.createElement('details');
      wrap.id='sdNarrativeCenterWrap';
      wrap.className='sd-collapse';
      wrap.open=true;
      wrap.innerHTML='<summary>Generated Narrative Draft</summary><p class="small">Creative prose derived from the current Story Context. Edit it here before copying or adding to the Journal.</p><div id="sdNarrativeDraft" class="sd-narrative-draft rich-editor" contenteditable="true" role="textbox" aria-multiline="true" data-placeholder="Generate a story package to draft a narrative scene entry."></div><div class="button-row sd-small-actions"><button type="button" class="secondary" data-sd-copy-narrative>Copy Draft</button><button type="button" data-sd-narrative-to-journal>Add Draft to Journal</button></div>';
      const card=document.getElementById('sceneCard');
      if(card&&card.parentNode)card.parentNode.insertBefore(wrap,card.nextSibling); else out.appendChild(wrap);
    }
  }

  function renderNudge(a){let n=$('sdFloatingNudge'); if(!n){n=document.createElement('button');n.id='sdFloatingNudge';n.type='button';document.body.appendChild(n);} n.innerHTML='💡 '+esc(a.lastCascadeNudge||'Story Director suggests; the GM decides.'); n.onclick=()=>{$('phaseAStoryDirector')?.scrollIntoView({behavior:'smooth',block:'start'});};}
  function buildPackage(kind){const a=load(); saveVisible(a); updateAtmosphere(a); save(a); const text=`Story Director — ${kind}\n\nObjective: ${a.situation.objective||'Not set'}\nThread: ${a.situation.thread||'Not set'}\nStakes: ${a.situation.stakes}\nOpportunity: ${a.situation.opportunity}\nFaction: ${a.entityContext.faction||'Auto'}\nKnown Location: ${a.entityContext.location||'Auto'}\nAsset: ${a.entityContext.asset||'Auto'}\n\nSetting\n${ORDER.map(k=>`${LABELS[k]}: ${a.fields[k].value||'(none)'} (${a.fields[k].status}, ${a.fields[k].confidence||0}%)`).join('\n')}\n\nStory Spine\n${storySpine(a)}\n\nAtmosphere\n${Object.entries(a.atmosphere).map(([k,v])=>`${k}: ${v}`).join('\n')}\n\nScene Description\n${a.sceneDescription||sceneDescription(a)}`; if($('sdNarrativeDraft'))$('sdNarrativeDraft').innerHTML=esc(a.sceneDescription||sceneDescription(a)).replace(/\n/g,'<br>'); if(window.addOutput){try{window.addOutput(Date.now(),text,'Story Director — '+kind,'Phase A Context Graph');}catch(e){}} return text;}
  function overrideButtons(){[['sdContinueStory','What Happens Next'],['sdStartScene','Start Scene'],['sdSuggestOracles','Suggest Oracles']].forEach(([id,kind])=>{const old=$(id); if(!old||old.dataset.phaseABoundV4)return; const clone=old.cloneNode(true); clone.dataset.phaseABoundV4='1'; old.replaceWith(clone); clone.addEventListener('click',()=>{if(kind==='Suggest Oracles'){const out=$('oracleOutput'); if(out){out.textContent='Recommended Oracles from Story Director\n• Location Themes > Sensory Detail\n• Districts > Useful Detail\n• Mysteries & Coverups > Clue Type\n• Corporate Powers > Corporate Pressure\n• Danger Situations > Industrial Hazards\n\n⚡ Apply future oracle results back to the Story Director as scene, mission, faction, region, campaign, rumor, or background flavor.';}}else buildPackage(kind); if(window.SagaStoryDirector&&window.SagaStoryDirector.stayOpen)window.SagaStoryDirector.stayOpen();});});}
  function bindNewCampaignReset(){const b=$('newCampaign'); if(!b||b.dataset.phaseAResetBoundV3)return; b.dataset.phaseAResetBoundV3='1'; b.addEventListener('click',()=>setTimeout(()=>{try{localStorage.removeItem(STORE); render();}catch(e){}},200));}
  function patchHeader(){const p=qs('.app-header p'); if(p&&!/frictionless empowerment/i.test(p.textContent))p.textContent='Story Director for frictionless empowerment — suggest, remember, and inspire without taking control.';}
  function phaseALayoutCleanup(){
    const strip=document.getElementById('sdContinuityStrip'); if(strip)strip.style.display='none';
    const partyTab=document.querySelector('.sd-tab[data-sd-tab="party"]'); if(partyTab)partyTab.style.display='none';
    const partyView=document.querySelector('.sd-view[data-sd-view="party"]'); if(partyView)partyView.style.display='none';
    ['sdStateSummary','sdCurrentSceneTrackers','sdOpenThreads'].forEach(id=>{const el=document.getElementById(id); const box=el&&el.closest('details.sd-collapse'); if(box)box.style.display='none';});
  }
  function boot(){let tries=0; const t=setInterval(()=>{tries++; if($('storyDirectorDashboard')){clearInterval(t); overrideButtons(); patchHeader(); bindNewCampaignReset(); phaseALayoutCleanup(); render(); phaseALayoutCleanup();} else if(tries>80)clearInterval(t);},100);}
  document.addEventListener('DOMContentLoaded',boot); boot();
  window.SagaAtlasStoryContextGraph={load,save,optsFor,semanticTags,derivedLocation};
})();
