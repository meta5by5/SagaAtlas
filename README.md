# Increment 37 Rebuild — Stable Tabs

This build rolls back to the known-good Increment 36 base and reapplies only the safe changes requested after the browser hang:

- Middle-section buttons now behave as a true tab set: only the selected tab is visible.
- Director State no longer remains visible when Journal, Scene Inspiration, Party, Colony, or Guide is selected.
- Scene Editor tracker edit buttons are hidden/removed from the play surface. Trackers remain adjusted directly with their normal controls.
- The unstable MutationObserver-based navigation patch from the prior Increment 37 has been removed to avoid browser lockups.

# Saga Atlas — Increment 29

## What changed

- Added **fresh entity-backed dropdown refresh** for Faction, Known Location, and Asset / Ship / Vehicle context selectors. Open/click/focus refreshes from the current Entity Library.
- Strengthened the **Context Graph** so World/Planet, Biome/Environment, Development, Location Type, District/Zone, Encounter Site, Scene Inspiration, and Story Spine all read from one context model.
- Added stricter sci-fi compatibility filtering. Examples: station/interior/vacuum contexts no longer offer primordial, wilderness, volcanic-field style paths unless the upstream context actually supports them.
- Integrated more of the old Advanced/Legacy generator intent into the Story Director through **System Bridge / Short Session Flow**.
- Added a first-pass system bridge for swapping rules procedures while keeping story continuity intact.

## System Bridge design

The story remains system-neutral. The selected ruleset only changes what Saga Atlas emphasizes next.

- **Genre Lens**: the fiction skin and tone, such as Hostile-compatible frontier sci-fi or space western exploration.
- **Scene Mode**: how this scene should play at the table, such as exploration, negotiation, travel, downtime, or combat.
- **Play Mode / Current Step**: the procedural game layer, such as a 5PFH campaign step, Starforged exploration beat, or freeform Story Director step.
- **Primary Loop**: the dominant session structure, such as 5PFH Campaign Turn, Planetfall Colony Turn, Starforged Expedition, CWN Job Cycle, or Hostile-style contract operation.
- **Roleplay Layer**: how uncertainty and social choices are handled, such as Starforged-style moves or light oracle prompts.
- **Tactical Layer**: whether the scene should become a 5PFH tabletop battle, a theater-of-the-mind scene, or another tactical procedure.
- **World Layer**: which setting toolkit frames the worldbuilding: Hostile-compatible, 5PFH, Planetfall, CWN, or Starforged.
- **Colony / Base Layer**: optional worksheets for Planetfall colony progress, ship/base upkeep, or trade routes.
- **Character Sheet Focus**: story-only, 5PFH crew stats, Starforged assets/moves, or hybrid roster.

If settings conflict, Story Director preserves the story context and treats mechanics as optional procedure. For example, “Corporate survival horror” + “5PFH battle-focused session” + “Starforged-style moves” means the fiction stays grim/corporate, the encounter may be staged as a 5PFH tactical fight, and non-combat uncertainty can still use Starforged-style prompts.

## 5PFH + Starforged structured play proposal

The long-term goal is a **short-session guided flow**:

1. Choose or continue current campaign objective.
2. Run the appropriate 5PFH campaign step: upkeep, patron/job, travel/world event, battle setup, battle, post-battle, rivals/events, downtime.
3. Use Story Director to convert the step into a playable scene.
4. Use Starforged-style moves/oracles for roleplay, negotiation, travel uncertainty, vows/goals, and dramatic discoveries.
5. If a tactical battle is chosen, export the scene as a 5PFH encounter package.
6. After resolution, apply Story Engine consequences to trackers, entities, campaign state, colony worksheets, and journal reflection.

## Future sheets / worksheets

Recommended next sheet models:

- **5PFH Crew Sheet**: name, class/archetype, reactions, combat, toughness, savvy, speed, weapons, gear, injuries, XP, quirks, story tags.
- **Starforged Character / Asset Sheet**: assets, momentum, health, spirit, supply, bonds, vows/progress tracks, move notes.
- **Hybrid Crew Roster**: shared story identity plus separate rules panels.
- **Planetfall Colony Sheet**: morale, integrity, resources, facilities, construction, exploration, exploitation, events, colony story track.
- **Trade / Cargo Worksheet**: cargo, medical supplies, fuel, route, buyer, risk, legal status, rival interest.

## Testing notes

- Create a Faction entity, return to Story Director, then click the Faction dropdown. It should refresh without reloading the page.
- Select Orbital Station → Station Interior. Development should rank station/artificial options and should not present Primordial as a coherent high-rank choice.
- Use Play Mode = 5PFH Campaign Loop + Starforged RP and Current Step = Find Patron / Job. Scene Inspiration and Story Spine should preserve the same story context while indicating the procedural step.

## Increment 30 - Focused Story Director, Scene Inspiration, and Colony Worksheet

This increment continues the Frictionless Empowerment design direction.

### Story Director focus selector
Added an **I want to update...** dropdown at the top of Story Director. It narrows the visible controls to the kind of GM decision being made:

- Storyline / current decision
- Location / environment
- Mood / danger level
- Timers / tracker progress
- Rules / play procedure
- Colony / base sheet
- Oracles / inspiration weighting
- Show everything

This is intended to reduce dropdown overload while keeping controls quickly available. It does not remove the underlying Context Graph; it only changes what is visible.

### Atmosphere moved out of the left-side environment controls
Read-only Atmosphere Micro-Oracles are now shown as part of **Scene Inspiration**, so the left-side Environment card focuses on editable decisions while the middle/right Story Director outputs focus on play prompts.

### Planetfall-style colony worksheet stub
Added a new **Colony** tab to the Story Director middle section. It includes an editable worksheet inspired by the Planetfall colony tracking flow: campaign turn, milestones, colony morale, colony integrity, build/research/story resources, raw materials, mission data, calamity points, grunts, notes, and a compact crew snapshot table.

This is a local-first worksheet and does not yet automate Planetfall turn logic. It is meant as the first usable shell for short-session 5PFH + Starforged hybrid play.

### Intended UX direction
The Story Director should help the GM choose the type of decision they want to make, hide unrelated controls, then let the Context Graph, entities, oracles, and worksheets support that decision without taking ownership away from the GM.

## Increment 31 — Focused GM Decisions and Center Dashboards

- The **I want to update...** dropdown now acts as a stronger focus filter. It shows only the related Story Director cards instead of leaving most fields visible.
- Read-only orientation data was moved out of the left decision flow and into center tabs:
  - **Director State**: mission-control summary, campaign state, and atmosphere micro-oracles.
  - **Party**: party resources, manual progress tracks, and timers.
- The left Story Director panel is now reserved for editable GM decisions, matching the frictionless empowerment design goal.
- The internal Party Dashboard tab in the left Story Director has been hidden so the same information is presented in the center area instead.



## Increment 32 testing notes

- The **I want to update...** selector now saves correctly and filters the visible Story Director fields instead of acting like a read-only label.
- Read-only mission-control details such as **Now**, **Next beat**, **Focus**, **Pressure**, and the campaign-state values are centralized in the middle **Director State** tab.
- **Party Dashboard** is now treated as a middle-section tab rather than a left-panel workflow tab.
- **Generated Narrative Draft** was moved into **Scene Inspiration**, because it is creative output rather than a setup control.
- **Suggest Oracles** now refreshes the oracle recommendation output instead of continually appending stale advice.
- Added **Scene -1** and **Reset Scene #** controls beside the standard generator for correction during testing.

### Button meanings

- **What Happens Next?**: reads the current campaign/story context and proposes the next interesting development without formally starting a scene.
- **Start Scene**: freezes the current context into a scene snapshot and identifies involved trackers/timers.
- **Complete Scene**: opens the review workflow to apply consequences from the played scene back to master trackers and campaign state.
- **Generate Story Package**: creates a structured package from the selected workflow, scale, and intent.
- **Use Standard Scene Generator**: calls the original legacy generator for compatibility and quick random output; it increments the legacy scene log.

## Increment 33 - Director State consolidation

- Moved the remaining read-only mission-control rows into the center **Director State** tab, including **Now**, **Next beat**, **Focus**, and **Pressure**.
- Merged the left-panel **Campaign State** values into the center **Director State > Campaign State** card without duplicating threat/heat/hope/mystery/resource/momentum rows.
- Moved **Trackers in Current Scene** and **Open Threads** into the center **Director State** tab while retaining collapsible group behavior.
- Left-side Story Director remains focused on editable GM decisions; read-only status information now lives in center tabs.
- Strengthened the **I want to update...** selector event binding so the chosen focus mode persists and immediately filters the left-side decision cards.

## Increment 34 - Advanced controls merged into Shaping the Situation

- Merged the former **Advanced Engine / Compatibility Controls** fields into the **Shaping the Situation** card.
- Added campaign/region, legacy scene intent, pacing, scene phase, threat, mystery, predictability, continuity toggles, mission seed, and world seed to the GM-facing decision workflow.
- The old legacy generator controls are now hidden and synchronized from Story Director so older generator functions still receive compatible values.
- Planet / World, Biome / Environment, Location Type, District / Zone, and Encounter Site remain in **Setting the Environment**, where they belong in the Context Graph.
- Scene Intent and Pacing changes in Shaping the Situation also sync to Story Intent / Pacing values used by the Story Engine.

## Increment 35 — Director State / scene lifecycle cleanup

- Fixed Scene −1 / Reset Scene # to use the original app's Undo/Clear Log actions so the visible scene number and generated scene log stay in sync.
- Moved the left-side Scene Inspiration content into the center **Director State** tab.
- Added Scene Inspiration prompts, Story Spine, and Atmosphere Micro-Oracles to Director State so creative output and read-only context live together.
- Made the center Party Dashboard editable with progress bars, +/- controls, editable names/notes/values/max values, and editable credits as currency.
- Ensured Director State and Party Dashboard center tabs are hidden when Journal, Guide, or Scene Inspiration tabs are selected.
- Clarified that Generate Story Package/What Happens Next/Start Scene should eventually become one scene lifecycle: preview → start/snapshot → complete/review.

## Increment 36 - Colony tab and lifeform encounter entities

- Moved the Planetfall-style **Colony Worksheet** out of the left Story Director tab flow and into its own middle-section **Colony** tab.
- Added a new Entity type: **Encounters**.
- Renamed **Lifeform Encounter Notes** to **Lifeforms Encountered**.
- **Lifeforms Encountered** now lists Entity records where `type = Encounter` and the entity has the `#Lifeform` tag.
- Added an **Add Lifeform Encounter** action that creates a new Encounter entity tagged `#Lifeform` and opens it in the Entity editor.
- The full Encounters catalog remains available through the Entities directory, while the Colony worksheet only surfaces lifeform encounters for quick campaign/Planetfall reference.

## Increment 38 - Safe attributes and oracle recommendation rebuild

Built from the stable Increment 37 base to avoid the previous browser-freeze regression.

Changes:
- Lifeforms Encountered now requires Encounter entities to have both `#Lifeform` and `#Encountered` tags.
- Added safe NPC attribute rows under the Entity name/type area.
- Added editable Attribute Defaults under Settings > Entity Defaults.
- Attribute rows support `Starforged method` and `d6 + attribute` roll types.
- Attribute roll buttons use the existing bottom-right dice result card.
- Dice result outcome text is smaller so labels such as Strong Hit fit the result box.
- Director State: Campaign State is collapsible.
- Director State: Scene Inspiration is placed below Trackers in Current Scene.
- Suggest Oracles now recommends actual existing oracle table paths from the Oracle library instead of invented names.

Stability note:
- This increment uses a single post-render patch file and avoids MutationObserver/render recursion loops.
- It does not replace the entity renderer or center-tab controller wholesale.

## Saga Atlas v0.39.0 release notes

Built from the stable Increment 38 baseline, with a conservative post-render patch to avoid the prior browser-freeze issue.

### Added
- Lifeforms Encountered now has tag filter checkboxes for `#Lifeform` and `#Encountered`, both enabled by default.
- Mission Board / seed textareas auto-expand up to three rows.
- Party Dashboard now includes a duplicate shared Colony Crew Snapshot.
- Crew Snapshot name field maps to existing NPC entities tagged `#character`.
- NPC entities tagged `#character` show a Crew Assignment panel under the Name area when assigned to a crew row.
- Story Director Suggested Oracles output now lists actual existing Oracle paths from the Oracle tree.
- Dice result summary text is smaller to fit result cards better.

### Stability note
This release avoids replacing the core render loop, tab controller, or Story Director reducer. The new behavior is applied as a guarded post-render enhancement to preserve browser stability.

## Release v0.40.0 — Entity Template Engine

This release begins the architecture shift from hard-coded character fields to configurable **Entity Templates**.

### Added

- **Entity Template Engine** under `Settings → Entity Defaults`.
  - Template fields support: System, Field Name, Default Value, Roll Method, Side, Row, Sort Order, and Crew Snapshot visibility.
  - Starforged and 5PFH templates are included by default.
  - Each system supports a compact left/right, row 1/row 2 layout.
- **Compact Character Stat Blocks** for NPC entities tagged `#character`.
  - Starforged and 5PFH fields render above Crew Assignment on the Entity Tracker page.
  - Fields are editable directly on the entity record.
  - Dice buttons use the configured roll method.
- **Roll Engine foundation**.
  - Starforged fields roll action die + stat vs. two challenge dice.
  - 5PFH-style fields roll d6 + attribute.
  - Result card text was kept smaller so results such as “Strong hit” fit in the bottom-right card.
- **Crew Snapshot renderer** shared by Party Dashboard and Colony.
  - Crew rows use the same compact template renderer as the Entity page.
  - Crew row layout comes from Entity Defaults.
  - Name dropdown maps to NPC entities tagged `#character`.
  - `Unassign` removes the crew row and entity link without deleting the NPC entity.
- **Associated Asset / Ship relationship**.
  - Current ship is not a fixed crew field.
  - It is an associated `Asset` entity tagged `#starship`.
  - This keeps ships, vehicles, bases, cargo, and future assets available to the Context Graph and oracle lookups as first-class campaign entities.

### Milestones tracked

- `v0.40` — Entity Template Engine — in progress.
- `v0.50` — Context Graph Complete — planned.
- `v0.60` — Story Engine and Consequences — planned.
- `v0.70` — Journal 2.0 Reflection — planned.
- `v1.0` — Connected Campaign Platform — planned.

### Design note

The design philosophy remains **Frictionless Empowerment**: game-system mechanics should act as swappable lenses over the same living story. Starforged, 5PFH, Hostile, Traveller, CWN, and future systems should be added through templates and roll engines instead of rewriting entity forms.


## v0.40.1 Stability Fix

This patch fixes the v0.40 browser refresh loop by making the Entity Template Engine patch idempotent and non-recursive:

- Disconnects the MutationObserver while the patch renders its own panels.
- Removes the periodic full refresh timer.
- Ignores DOM mutations created by Saga v0.40 panels.
- Saves stat field edits without re-rendering the active form on every keystroke.
- Preserves the v0.40 template model: left/right groups, row 1/2 layout, Starforged and 5PFH fields, crew assignment, and #starship asset associations.

Use this as the new stable v0.40 baseline before adding more template features.

## Release v0.40.2 — Entity Template stabilization

This release stabilizes the v0.40 Entity Template Engine before adding more systems.

### What changed

- Removed the old Increment 38 NPC Attributes script from the page load so there is only one stat/template owner.
- Disabled the legacy v0.39 Crew Assignment renderer so Crew Assignment is shown only once by the v0.40 template system.
- Disabled the old v0.39 Party Crew Snapshot renderer so the v0.40 shared Crew Snapshot renderer owns Party and Colony crew displays.
- Reduced automatic re-rendering that made text selection difficult.
- Character template panels and Crew Assignment panels now only rebuild when the active entity/template signature changes.
- Add Track, Add Timer, and Add Condition now use the same compact button sizing as Start Scene, Complete Scene, and Suggest Oracles.
- Entity Template Engine settings now sort fields by Row, then Order, then Side for deterministic layout.
- The Entity Template Engine is now treated as the only source for Starforged / 5PFH fields; the older NPC Attributes editor is no longer used.

### Testing notes

- Open an NPC tagged #character and confirm only one stats section appears.
- Confirm Crew Assignment appears once, below Game Systems.
- Select text in Entity Tracker fields and confirm the page does not continually refresh/re-sort.
- Open Settings → Entity Defaults and confirm the Entity Template Engine section is the only attributes configuration UI.
- Change Row/Order in Entity Template Engine and confirm templates render in that sorted order after refresh/reopen.


## SagaAtlas v0.40.3

Stabilization and Entity Template cleanup release.

Changes:
- Removed the remaining Entity Tracker Crew Assignment display; crew links remain managed through the shared crew snapshot rows instead of a separate duplicate Entity panel.
- Removed the visible Game Systems title/description from Entity Tracker; compact system stat blocks now render directly.
- Reused the same compact Game Systems renderer in crew snapshots on Party/Colony views.
- Normalized Add Track, Add Timer, and Add Condition button sizing to match Start Scene / Complete Scene / Suggest Oracles.
- Kept template settings sorted by Row and Order for a deterministic compact sheet layout.
- Added tab-click refresh hooks so the Party view receives the latest crew/template renderer without replacing the host navigation loop.

Validation notes:
- Confirm no Crew Assignment section appears under the Entity Tracker.
- Confirm Starforged and 5PFH stat blocks appear under NPCs tagged #character.
- Confirm Party tab shows the Colony Crew Snapshot with the same compact system stats when a #character NPC is selected.
- Confirm text can be selected without page refresh/resort behavior.

## v0.40.4
- Added a top navigation **Party** button immediately before Crew using the Crew icon.
- Added collapsible **Party Members** section to Party Dashboard.
- Party Members lists NPC entities tagged `#character`, sorted by character name, and renders compact Game System statblocks for each.
- Reduced Game System statblock label prominence so system names read as compact references instead of field labels.
- Updated template script cache version to v0.40.4.
