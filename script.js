

function runWelcomeAnimation() {
    const overlay = document.getElementById('welcomeOverlay');
    const line1 = document.getElementById('line1');
    const line2 = document.getElementById('line2');

    setTimeout(() => {
        line1.classList.add('fade-in');
    }, 300);

    setTimeout(() => {
        line2.classList.add('fade-in');
    }, 1200); 

    setTimeout(() => {
        overlay.classList.add('hidden');
    }, 3200); 

    setTimeout(() => {
        overlay.remove();
    }, 4700);
}

(function sparkle(){
  const n = 18;
  for(let i=0;i<n;i++){
    const s = document.createElement('div');
    s.className='sparkle';
    s.style.left = (Math.random()*100)+'vw';
    s.style.top = (40 + Math.random()*70)+'vh';
    s.style.opacity = 0.5 + Math.random()*0.6;
    s.style.width = (4 + Math.random()*6)+'px';
    s.style.height = s.style.width;
    s.style.transition = 'transform 6s linear, top 6s linear, opacity 6s linear';
    document.body.appendChild(s);
    (function loop(el){
      const dur = 6000 + Math.random()*5000;
      requestAnimationFrame(()=> {
        el.style.transform = 'translateY(-120vh) scale(.6)';
        el.style.opacity = 0;
        setTimeout(()=> {
          el.style.top = (40 + Math.random()*70)+'vh';
          el.style.transform = 'translateY(0) scale(1)';
          el.style.opacity = 0.6 + Math.random()*0.4;
          setTimeout(()=> loop(el), dur);
        }, dur);
      });
    })(s);
  }
})();


const PRESETS = [5,10,25,50]; // minutes
const STORAGE_KEY = 'arboris_web_state_v1';

let state = {
  garden: [], 
  sessions: [], 
  totalSeconds: 0,
  streakCount: 0,
  lastPlantDate: null
};

let timerSeconds = 25 * 60;
let timerLeft = timerSeconds;
let timerRunning = false;
let timerInterval = null;

const tabs = document.querySelectorAll('.tab');
const tabPanels = document.querySelectorAll('.tabPanel');
const timerDisplay = document.getElementById('timerDisplay');
const progressBar = document.getElementById('progressBar');
const startStopBtn = document.getElementById('startStopBtn');
const pauseBtn = document.getElementById('pauseBtn');
const cancelBtn = document.getElementById('cancelBtn');
const presetRow = document.getElementById('presetRow');
const customMinutes = document.getElementById('customMinutes');
const applyCustom = document.getElementById('applyCustom');
const stageBox = document.getElementById('stageBox');
const stageCaption = document.getElementById('stageCaption');
const gardenPreview = document.getElementById('gardenPreview');
const gardenGridAll = document.getElementById('gardenGridAll');
const totalTreesLabel = document.getElementById('totalTreesLabel');
const historyDiv = document.getElementById('history');
const clearHistoryBtn = document.getElementById('clearHistory');
const statTotalTrees = document.getElementById('statTotalTrees');
const statTotalMinutes = document.getElementById('statTotalMinutes');
const statStreak = document.getElementById('statStreak');
const recentSessionsDiv = document.getElementById('recentSessions');

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){ state = JSON.parse(raw); }
  }catch(e){ console.warn('load failed', e) }
}

function saveState(){
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e){ console.warn('save failed', e) }
}

function renderPresets(){
  presetRow.innerHTML = '';
  PRESETS.forEach(p=>{
    const btn = document.createElement('button');
    btn.className = 'preset';
    btn.textContent = p + 'm';
    btn.addEventListener('click', ()=> setTimerMinutes(p)); 
    presetRow.appendChild(btn);
  });
  highlightActivePreset();
}

function highlightActivePreset(){
  document.querySelectorAll('.preset').forEach(el=>{
    const mins = parseInt(el.textContent);
    if(mins === Math.round(timerSeconds/60)) el.classList.add('active'); else el.classList.remove('active');
  });
}

function setTimerMinutes(mins){ 
  timerSeconds = mins * 60;
  timerLeft = timerSeconds;
  updateTimerDisplay();
  highlightActivePreset();
}

function applyCustomMinutes(){
  const v = parseInt(customMinutes.value);
  if(!v || v < 1 || v > 240){ alert('Enter a valid custom minute (1–240).'); return; }
  setTimerMinutes(v); 
}

applyCustom.addEventListener('click', applyCustomMinutes);
renderPresets();

tabs.forEach(tab=>{
  tab.addEventListener('click',(e)=>{
    tabs.forEach(t=>t.classList.remove('active'));
    tab.classList.add('active');
    const to = tab.getAttribute('data-tab');
    tabPanels.forEach(p=>p.style.display='none');
    document.getElementById(to + 'Tab').style.display = 'block';
    history.replaceState(null, '', '#' + to);
  });
});

(function initTabFromHash(){
  const which = location.hash.replace('#','') || 'grow';
  const chosen = document.querySelector('.tab[data-tab="'+which+'"]') || document.querySelector('.tab[data-tab="grow"]');
  if(chosen) chosen.click();
})();

function secToMMSS(s){
  const m = Math.floor(s/60); const sec = s%60;
  return `${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
}

function updateTimerDisplay(){
  timerDisplay.textContent = secToMMSS(timerLeft);
  const pct = ((timerSeconds - timerLeft) / timerSeconds) * 100;
  progressBar.style.width = Math.min(100, Math.max(0, pct)) + '%';
  // update stage visual
  const progress = (timerSeconds - timerLeft) / timerSeconds; // 0 to 1
  if(progress < 0.33){ stageBox.textContent = '🌱'; stageCaption.textContent = 'Seed'; }
  else if(progress < 0.66){ stageBox.textContent = '🌿'; stageCaption.textContent = 'Sprout'; }
  else if(progress < 1){ stageBox.textContent = '🌳'; stageCaption.textContent = 'Tree'; }
  else { stageBox.textContent = '🌲'; stageCaption.textContent = 'Mature'; }
}

function startTimer(){
  if(timerRunning) return;
  timerRunning = true;
  startStopBtn.textContent = 'Stop';
  pauseBtn.disabled = false;
  startStopBtn.classList.add('btnPrimary');
  
  timerInterval = setInterval(()=>{
    if(timerLeft <= 0){
      completeSession();
      return;
    }
    timerLeft--;
    updateTimerDisplay();
  }, 1000);
}

function pauseTimer(){
  if(!timerRunning) return;
  timerRunning = false;
  clearInterval(timerInterval);
  startStopBtn.textContent = 'Start';
  pauseBtn.disabled = true;
}

function cancelTimer(){
  const confirmCancel = confirm('Cancel this session? Progress will be lost.');
  if(!confirmCancel) return;
  clearInterval(timerInterval);
  timerRunning = false;
  timerLeft = timerSeconds;
  startStopBtn.textContent = 'Start';
  pauseBtn.disabled = true;
  updateTimerDisplay();
}

function completeSession(){
  clearInterval(timerInterval);
  timerRunning = false;
  timerLeft = timerSeconds;
  
  const now = Date.now();
  state.garden.push({ id: now, stage: 3, createdAt: now, minutes: Math.round(timerSeconds/60) });
  
  state.sessions.push({ when: now, success: true, minutes: Math.round(timerSeconds/60) });
  state.totalSeconds += timerSeconds;
  
  const today = new Date().toISOString().slice(0,10);
  if(state.lastPlantDate !== today) {
    state.lastPlantDate = today;
    state.streakCount = (state.streakCount || 0) + 1;
  }
  saveState();
  flashCelebration();
  renderAll();
}


function flashCelebration(){
  const el = document.createElement('div');
  el.textContent = '🌳 Tree grown!';
  Object.assign(el.style,{
    position:'fixed', left:'50%', top:'14%', transform:'translateX(-50%)', background:'linear-gradient(90deg,#fffbe8,#f6fff1)', padding:'12px 18px', borderRadius:'12px', boxShadow:'0 20px 40px rgba(60,120,70,0.12)', zIndex:9999, fontWeight:800, transition: 'opacity 0.5s ease-out'
  });
  document.body.appendChild(el);
  setTimeout(()=> el.style.opacity = '0', 1200);
  setTimeout(()=> document.body.removeChild(el), 1700);
}


startStopBtn.addEventListener('click', ()=>{
  if(timerRunning){ 
    const confirmStop = confirm('Stop session early? This will count as incomplete.');
    if(!confirmStop) return;
    clearInterval(timerInterval);
    timerRunning = false;
    
    const elapsed = timerSeconds - timerLeft;
    state.sessions.push({ when: Date.now(), success: false, minutes: Math.round(elapsed/60) });
    saveState();
    
    timerLeft = timerSeconds;
    updateTimerDisplay();
    renderAll();
    startStopBtn.textContent = 'Start';
    pauseBtn.disabled = true;
  } else {
    startTimer();
    startStopBtn.textContent = 'Stop';
  }
});

pauseBtn.addEventListener('click', ()=>{
  if(timerRunning) pauseTimer(); else startTimer();
});

cancelBtn.addEventListener('click', cancelTimer);


function renderGardenPreview(){
  gardenPreview.innerHTML = '';
  const recent = state.garden.slice(-6).reverse();
  if(recent.length === 0){
    gardenPreview.innerHTML = '<div class="gardenPlaceholder">No trees yet<br><small class="small">Complete a session to plant</small></div>';
    return;
  }
  recent.forEach(t=>{
    const el = document.createElement('div');
    el.className = 'gardenItem';
    const emoji = t.stage >= 3 ? '🌲' : t.stage === 2 ? '🌳' : t.stage === 1 ? '🌿' : '🌱';
    el.innerHTML = `<div style="font-size:30px">${emoji}</div><div class="small">${t.minutes}m</div>`;
    gardenPreview.appendChild(el);
  });
}

function renderGardenAll(){
  gardenGridAll.innerHTML = '';
  if(state.garden.length === 0){
    gardenGridAll.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--muted)">No trees yet — complete a focus session to plant your first tree.</div>';
    totalTreesLabel.textContent = '0';
    return;
  }
  state.garden.slice().reverse().forEach((t,idx)=>{
    const el = document.createElement('div');
    el.className = 'gardenItem';
    const emoji = t.stage >= 3 ? '🌲' : t.stage === 2 ? '🌳' : t.stage === 1 ? '🌿' : '🌱';
    el.innerHTML = `<div style="font-size:36px">${emoji}</div><div class="small">Planted ${new Date(t.createdAt).toLocaleString()}</div>`;
    el.addEventListener('click', ()=> alert(`Planted: ${new Date(t.createdAt).toLocaleString()}\nMinutes: ${t.minutes}`));
    gardenGridAll.appendChild(el);
  });
  totalTreesLabel.textContent = state.garden.length;
}

function renderHistory(){
  historyDiv.innerHTML = '';
  const rows = state.sessions.slice().reverse();
  if(rows.length === 0){ historyDiv.innerHTML = '<div class="small" style="color:var(--muted)">No sessions yet</div>'; return; }
  rows.forEach(s=>{
    const d = new Date(s.when);
    const el = document.createElement('div');
    el.style.padding='8px 0';
    el.innerHTML = `<div style="display:flex;justify-content:space-between;"><div>${d.toLocaleString()}</div><div style="font-weight:800">${s.success ? '✅' : '✖️'} ${s.minutes}m</div></div>`;
    historyDiv.appendChild(el);
  });
}

clearHistoryBtn.addEventListener('click', ()=>{
  if(!confirm('Clear session history? This cannot be undone.')) return;
  state.sessions = [];
  state.garden = [];
  state.totalSeconds = 0;
  state.streakCount = 0;
  saveState();
  renderAll();
});

function renderStats(){
  statTotalTrees.textContent = state.garden.length;
  statTotalMinutes.textContent = Math.round(state.totalSeconds / 60);
  statStreak.textContent = state.streakCount || 0;

  recentSessionsDiv.innerHTML = '';
  const recent = state.sessions.slice().reverse().slice(0,20);
  if(recent.length === 0){ recentSessionsDiv.textContent = 'No sessions yet'; return; }
  recent.forEach(s=>{
    const row = document.createElement('div');
    const d = new Date(s.when);
    row.style.padding='6px 0';
    row.innerHTML = `<div style="display:flex;justify-content:space-between"><div>${d.toLocaleString()}</div><div>${s.success ? '✅' : '✖️'} ${s.minutes}m</div></div>`;
    recentSessionsDiv.appendChild(row);
  });
}

function renderAll(){
  renderGardenPreview();
  renderGardenAll();
  renderHistory();
  renderStats();
  highlightActivePreset();
}


loadState();
state.garden = state.garden || [];
state.sessions = state.sessions || [];
state.totalSeconds = state.totalSeconds || 0;
state.streakCount = state.streakCount || 0;

renderAll();

setTimerMinutes(25);


runWelcomeAnimation();


document.addEventListener('keydown', (e)=>{
  if(e.code === 'Space'){
    e.preventDefault();
    startStopBtn.click();
  } else if(e.key === 'p' || e.key === 'P'){ pauseBtn.click(); }
});


setInterval(saveState, 20_000);