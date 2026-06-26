# Saga Atlas

Patch updates:
- Comment editor formatting toolbar is on the same row as Roll, Clear, and Add Comment.
- D6 result icon uses `33909.png` as `d6.png`; D10 uses `d10.jpg`.
- Ship generator icon remains `11872755.png` as `ship-generator-icon.png`.
- Multiple button rows are left-aligned.
- Header remains compact from the prior patch.
- Removed the visible `Table Output` heading to conserve space.


Patch includes: ship icon update, entity overview/revealed toolbar buttons, entity directory filter, directory row alignment, Scene Elements rename, icon-only action buttons, unified journal/copy icons, collapse-oracles filter-row placement, and compact insert-image button styling.


## File organization

This build uses root `index.html`, `css/style.css`, `js/app.js`, `js/tables.js`, and `img/` for icons and image assets.

## Added in this build

- Entity List left-side tab with filter and Show Editor button.
- Drag entities from Entity List or Entity Directory into editors to insert an entity reference.
- Type `@` in editors to open an entity picker and insert a reference.


Update: Entity List is now the default left view; Entity Tracker uses a left-side directory and right-side editor without collapsing center/right panels.


## Patch notes
- Entity Directory is the default left view.
- Removed separate Entity List tab treatment.
- Selecting an entity opens the Entity Editor as an overlay card across the center/right workspace while preserving the middle and right sections.


Update: Crew Link now spans the left and center workspace, Entity Tracker navigation was removed, and Entity Directory is presented as Entity Library in the left pane.


Patch: top navigation reordered to Entities, Crew, Journal, Oracle, Builder, Elements, Ship; Library renamed Entities; Journal/Scene Elements tabs moved to a right-aligned control row with the active label on the left.


## Update: Sticky Header/Nav
- Header and top navigation remain locked in place while scrolling.
- Main workspace is kept aligned to the top when tabs/cards update.
- Removed downward scroll jumps from navigation actions.

## 2026-06-23 Document Library PDF Viewer

This build reverts to the `hostilejournal-import-export-working-plus-entities` baseline and adds a native Document Library in the right-side Oracles panel.

- Use the right-panel **Documents** tab beside **Oracles**.
- Upload one or more PDFs with **Upload PDF**.
- PDFs are stored locally in the browser using IndexedDB, while the campaign JSON stores document metadata.
- Click **Open** to show the PDF in an expanding viewer card over the left and middle workspace, leaving the right Oracles/Documents panel accessible.
- Click **Open** in the viewer toolbar to launch the PDF in a browser tab, or **×** / Escape to close the overlay.

Note: browser PDF rendering depends on the built-in PDF viewer for the browser. Export Campaign JSON preserves document names/metadata, but the PDF binary files remain in local browser storage and should be re-uploaded if you move browsers/devices.

## PDF @ Links

Rich text editors now support PDF references through the existing `@` mention popup. Upload PDFs in the right-side Documents tab, then type `@` in a rich editor and select a PDF document. The app prompts for a page number and inserts a clickable PDF link. Clicking the link opens the PDF viewer directly to that page when the browser PDF engine supports page anchors.


### Document Library update
- PDFs now support comma-separated tags on upload and per-document tag editing.
- Search matches PDF names and tags; tag chips filter groups of documents.
- Duplicate uploads are skipped using the PDF filename and file size fingerprint.
- `@` PDF links now replace the typed trigger text, preventing orphaned text such as `@colony-` before the inserted link.

### Document Library list update
- PDFs are sorted alphabetically by file name.
- Size/date details are hidden to make the list denser.
- Document rows use compact padding so more PDFs are visible at once.

## Document Library Guide and tag dropdown update

- Document tag inputs now use the existing document tag catalog as suggestions.
- Each uploaded PDF row includes an existing-tag dropdown for quickly adding tags already used by other documents.
- The right panel now includes a Guide tab beside Oracles and Documents.
- The Guide tab is a rich text editor saved in the Saga Atlas JSON/local state and supports the same @ document links used by journal/comment editors, including PDF page targets.

### 2026-06-24 Guide navigation update
- Moved the right-panel Guide tab between Oracles and Documents.
- Added a center-section Guide tab to the left of Scene Elements.
- Added a main navigation Guide button that opens the right-panel Guide tab.
- The center Guide and right Guide share the same saved guide content.
- Selecting right-panel Guide while the center Guide is active switches the center panel back to Journal.
- Selecting center Guide while the right-panel Guide is active switches the right panel back to Oracles.


## 2026-06-24 Guide navigation tweak
- Main navigation Guide now opens the right-panel Guide and resets the center Guide view back to Journal if it was active.
- Center tab order changed to Journal, Guide, Scene Elements.

## 2026-06-24 Document display-name editing
- Document rows now include a pencil button to edit the displayed document name.
- Renaming changes the name shown in the document list, PDF viewer title, search results, and newly inserted @ PDF links without changing the stored PDF file/blob.

## Scroll position update
- Center/right body tab buttons now keep the page pinned to the top.
- Scene Elements, Journal, Guide, Oracles, and Documents tab switching no longer scrolls down to a rich text editor or active card.

## Scroll/focus fix update
- Body section tab buttons now blur any active rich text editor before switching views.
- Journal, Guide, and Scene Elements center buttons are hard-bound in capture phase to prevent duplicate default handlers from scrolling the page.
- Center Guide button behavior restored while preserving the Guide/Oracles auto-switch behavior.

## Latest fix
- Fixed the main navigation **Oracles** button so it opens the right-side Oracles tab directly and no longer leaves/activates the Entities card.

## Document Library `/assets/docs` sync

The Document Library no longer uses the GitHub API or any token. **Sync Docs** reads from the `assets/docs` folder using `assets/index.json` relative to the running `index.html`. Local PDF uploads still save only to this browser's IndexedDB for offline viewing.

Because browsers cannot reliably enumerate a static directory on every host, the sync supports two relative-site methods:

1. A static manifest file at `assets/index.json`, `assets/docs/docs.json`, or `assets/docs/manifest.json`.
2. A plain directory listing at `assets/docs/` when the local/dev web server provides one.

Recommended `assets/index.json` format:

```json
{
  "files": [
    {
      "name": "temp.pdf",
      "path": "assets/docs/temp.pdf",
      "tags": ["temp", "reference"]
    },
    {
      "name": "doc.pdf",
      "path": "assets/docs/doc.pdf",
      "tags": ["manual", "rules"]
    }
  ]
}
```

A shorter form is also supported when you only need filenames:

```json
{
  "files": ["temp.pdf", "doc.pdf"]
}
```

Synced server documents appear in the Documents list even before a local PDF copy is stored in IndexedDB. Opening a synced document on a browser that does not have the PDF stored locally prompts the user to select the matching PDF file. Once attached, it can be viewed offline; a black down-arrow indicator marks documents with a local copy stored in this browser.

## 2026-06-24 Docs sync refinement

- Local/offline PDF documents now show a non-interactive black down-arrow indicator beside the edit button with the tooltip "File stored locally".
- **Sync Docs** first tries to read a directory listing at `assets/docs/`, then merges anything found with `assets/index.json`.
- Static hosts such as GitHub Pages generally do not allow browser JavaScript to rewrite `assets/index.json` or enumerate folders reliably. To keep the manifest updated, run this from the repository root after adding PDFs:

```bash
node scripts/build-docs-index.js
```

That script scans `assets/docs` and rewrites `assets/index.json` with every PDF found there.


## Local testing note for Sync Docs

Do not open `index.html` directly with a `file:///` URL when testing server-side docs. Modern browsers often block JavaScript `fetch()` calls to local files, so `assets/index.json` may not be readable.

From the folder containing `index.html`, run one of these instead:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

Place the manifest at:

```text
assets/index.json
```

Example:

```json
{
  "files": [
    {
      "name": "Hostile - Alien Breeds",
      "path": "Alien-Breeds3.pdf",
      "tags": ["npc", "hostilerpg"]
    },
    {
      "name": "colony-builder4.pdf",
      "path": "colony-builder4.pdf",
      "tags": ["colony", "rules"]
    }
  ]
}
```

If the manifest is inside `assets/docs`, bare file names are preferred. The app also accepts full paths such as `assets/docs/Alien-Breeds3.pdf`.

## Documents Sync Fix

The **Sync Docs** button now reads `assets/index.json` relative to the same folder as `index.html` and adds each listed PDF to the Documents library as a server document.

Server documents open in the embedded PDF viewer using their published path, such as:

```text
assets/docs/Alien-Breeds3.pdf
```

Use this format:

```json
{
  "files": [
    {
      "name": "Hostile - Alien Breeds",
      "path": "assets/docs/Alien-Breeds3.pdf",
      "tags": ["npc", "hostilerpg"]
    },
    {
      "name": "colony-builder4.pdf",
      "path": "assets/docs/colony-builder4.pdf",
      "tags": ["colony", "rules"]
    }
  ]
}
```

For local testing, run from the app folder with:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/`. Opening `index.html` directly as `file:///...` may prevent the browser from reading `assets/index.json`.


## 2026-06-24 Manifest Cleanup

- The server document manifest now lives at `assets/index.json` instead of `assets/docs/index.json`.
- PDF paths inside the manifest should still point to `assets/docs/<filename>.pdf`.
- The build no longer includes `assets/docs/.gitkeep` or sample manifest files.
- Imported migration JSON files are excluded from this build because they have already been imported.
- The Documents library ignores non-PDF entries in the manifest.

### 2026-06-24 Document search collapse
- The Documents panel now shows **Search Documents** as a compact link-style toggle.
- The search text field and tag filter chips are hidden until the link is opened.
- Closing the search panel hides both the text field and tags list to reduce vertical space.

### 2026-06-24 Document controls layout update
- Moved **Sync Docs** and its help/status text from the Documents tab to **Settings → General**.
- Documents tab now keeps only the local upload controls, search toggle, and document list.
- **Upload PDF** and **Tags for next upload...** are compact and aligned on one row, with the tags field to the right of the upload button.

## PDF Viewer session update

- The embedded PDF viewer now supports multiple open PDF tabs inside the viewer card.
- Each document remembers the last page opened or entered in the viewer page box.
- When the app reloads after PDFs were left open, it asks whether to reopen those documents to their recent pages.
- Browser PDF viewers do not expose scroll/current-page changes to JavaScript reliably, so the app remembers pages opened by links or entered in the viewer page field.


## Document list display update

- Server URL/path text is hidden in the Documents tab.
- The local-file indicator is a non-interactive icon with tooltip: `File stored locally`.
- The local-file indicator now appears to the left of the edit/tag/delete buttons.


## 2026-06-24 Guide reset update

- Starting a new campaign now clears `documentGuideHtml` and both Guide editors so the Guide does not carry over into the new campaign.

## 2026-06-24 Baseline reapply patch

- Fixed **Import Campaign JSON** to reliably import entities, journal entries, Guide HTML, and document library metadata from a campaign JSON file.
- Added **Lore** as a native Entity Library group with Lore/History/Rumor/Mystery/Culture/Technology subtype options.
- Local PDF blobs remain browser-local and are not embedded in Campaign JSON; imported document records open from server paths when available or prompt for a local copy.


### Entity relationship UI update
- Relationship rows now show the related entity type immediately before the relationship description field.
- Entity Directory filter row now includes an **Add New Entity** button using the Add to Journal icon.

## 2026-06-24 top navigation audit
- Fixed Crew Link workspace state blocking the Entities top-nav button.
- Added a window-capture navigation reset so every top-nav button clears incompatible Crew/Entity workspace classes before opening its intended left, center, or right section.
- Confirmed Documents top-nav opens the Documents tab in the right panel.


## Campaign Intelligence Engine update

This build keeps Saga Atlas local-first while upgrading the Scene Builder into a Campaign Intelligence Engine. The new Scene Director controls add a genre lens, scene mode, tone, guidance level, stakes focus, and pacing bias. The Generate Scene button now produces context-aware scenes with roleplay options, recommended next steps, clue/leverage prompts, consequence guidance, and campaign momentum adjustments.

Oracle groups have been reorganized into friendlier categories: Core Solo, Story Director, Exploration, Space Operations, Characters & Society, Threats & Horror, and Legacy/General. New Hostile-compatible-in-tone oracle modules have been added without locking the app to a specific game system or protected setting names.

## Oracle table browser/editor update
- Each random table row now includes a clickable table name and 📋 button that opens a popup with the full option list.
- The popup supports local editing, one option per line. Edits are stored in browser localStorage as table overrides and applied on reload.
- `ORACLE_TABLE_ORDER.md` lists the current category/group/table structure with option counts so the groups can be reordered deliberately.
- Scene Builder now includes Scene Oracle Context controls for faction pressure, district/zone, location detail, and mystery focus. These values are appended to Scene Director output so generated scenes connect to factions, districts, locations, mysteries, and roleplay decision points.
