(function(){
  'use strict';
  const TAB_MAP = {
    showJournalTab: ['journalView','Journal'],
    showCenterGuideTab: ['centerGuideView','Guide'],
    showOutputTab: ['currentOutputView','Scene Inspiration'],
    showDirectorStateTab: ['directorStateView','Director State'],
    showCenterPartyTab: ['centerPartyView','Party Dashboard'],
    showCenterColonyTab: ['centerColonyView','Colony Worksheet']
  };
  function $(id){ return document.getElementById(id); }
  function allCenterViews(){ return Array.prototype.slice.call(document.querySelectorAll('#outputPanel .center-view')); }
  function allTabButtons(){ return Array.prototype.slice.call(document.querySelectorAll('.center-tabs .tab-button')); }
  function setSceneTopActions(viewId){
    const top = $('sceneTopActions');
    if(top) top.hidden = viewId !== 'currentOutputView';
  }
  function activateCenterTab(buttonId){
    const pair = TAB_MAP[buttonId];
    if(!pair) return false;
    const viewId = pair[0], title = pair[1];
    allCenterViews().forEach(v => v.classList.remove('active-view'));
    allTabButtons().forEach(b => b.classList.remove('active'));
    const view = $(viewId);
    if(view) view.classList.add('active-view');
    const btn = $(buttonId);
    if(btn) btn.classList.add('active');
    const titleEl = $('centerSectionTitle');
    if(titleEl) titleEl.textContent = title;
    setSceneTopActions(viewId);
    return true;
  }
  function currentActiveButtonId(){
    const active = document.querySelector('.center-tabs .tab-button.active');
    if(active && TAB_MAP[active.id]) return active.id;
    const activeView = document.querySelector('#outputPanel .center-view.active-view');
    if(activeView){
      for(const id in TAB_MAP){ if(TAB_MAP[id][0] === activeView.id) return id; }
    }
    return 'showJournalTab';
  }
  function normalizeCenterTabs(){ activateCenterTab(currentActiveButtonId()); }
  function hideSceneEditorTrackerEditButtons(){
    document.querySelectorAll('#storyDirectorDashboard [data-sd-edit-tracker]').forEach(btn => { btn.style.display='none'; btn.setAttribute('aria-hidden','true'); });
  }
  function boot(){
    if(document.body && document.body.dataset.inc37StableTabsBound) return;
    if(document.body) document.body.dataset.inc37StableTabsBound='1';
    document.addEventListener('click', function(ev){
      const btn = ev.target && ev.target.closest && ev.target.closest('.center-tabs .tab-button');
      if(!btn || !TAB_MAP[btn.id]) return;
      setTimeout(function(){ activateCenterTab(btn.id); }, 0);
    }, false);
    document.addEventListener('click', function(ev){
      const edit = ev.target && ev.target.closest && ev.target.closest('#storyDirectorDashboard [data-sd-edit-tracker]');
      if(edit){ ev.preventDefault(); ev.stopPropagation(); edit.style.display='none'; }
    }, true);
    setTimeout(normalizeCenterTabs, 250);
    setTimeout(hideSceneEditorTrackerEditButtons, 500);
    setTimeout(hideSceneEditorTrackerEditButtons, 1200);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.SagaAtlasCenterTabs = { activateCenterTab, normalizeCenterTabs };
})();
