function runWelcomeAnimation() {
    const overlay = document.getElementById('welcomeOverlay');
    const line1 = document.getElementById('line1');
    const line2 = document.getElementById('line2');

    // Smooth static fade in
    setTimeout(() => {
        line1.classList.add('fade-in');
    }, 400);

    setTimeout(() => {
        line2.classList.add('fade-in');
    }, 1400); 

    setTimeout(() => {
        overlay.classList.add('hidden');
    }, 4000); 

    setTimeout(() => {
        overlay.remove();
    }, 5500);
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

const PRESETS = [5,10,25,50];
const STORAGE_KEY = 'arboris_web_state_v1';
const TOTAL_FOREST_SIZE = 21; 

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
const presetRow = document.getElementById('presetRow');
const customMinutes = document.getElementById('customMinutes');
const applyCustom = document.getElementById('applyCustom');
const stageBox = document.getElementById('stageBox');
const stageCaption = document.getElementById('stageCaption');
const gardenGridAll = document.getElementById('gardenGridAll');
const totalTreesLabel = document.getElementById('totalTreesLabel');
const statTotalTrees = document.getElementById('statTotalTrees');
const statTotalMinutes = document.getElementById('statTotalMinutes');
const statStreak = document.getElementById('statStreak');

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){ 
        state = JSON.parse(raw); 
    }
    
    // Fill with wasteland slots up to 20 if needed
    if(state.garden.length < TOTAL_FOREST_SIZE){
        const currentLen = state.garden.length;
        for(let i=0; i < (TOTAL_FOREST_SIZE - currentLen); i++){
            state.garden.push({ 
                status: 'dead', 
                createdAt: null, 
                minutes: 0,
                fullDate: null,
                growthHeight: 0
            });
        }
    }
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


// Add these to your existing script.js

function renderHistory() {
    const historyContainer = document.getElementById('history');
    const recentStatsContainer = document.getElementById('recentSessions');
    
    // Clear existing content
    historyContainer.innerHTML = '';
    recentStatsContainer.innerHTML = '';

    // Sort sessions: Most recent first
    const sortedSessions = [...state.sessions].reverse();

    if (sortedSessions.length === 0) {
        const emptyMsg = '<div class="small muted" style="padding:10px">No sessions yet.</div>';
        historyContainer.innerHTML = emptyMsg;
        recentStatsContainer.innerHTML = emptyMsg;
        return;
    }

    sortedSessions.forEach(session => {
        const date = new Date(session.when);
        const dateString = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Create the HTML template for a session row
        const sessionHTML = `
            <div style="display:flex; justify-content:space-between; padding: 8px 0; border-bottom:1px solid rgba(0,0,0,0.05)">
                <div>
                    <span style="color:var(--leaf)">🌳</span> 
                    <strong>${session.minutes}m</strong>
                </div>
                <div class="small muted">${dateString} at ${timeString}</div>
            </div>
        `;

        // Append to both the Timer Page history and the Stats Page list
        historyContainer.insertAdjacentHTML('beforeend', sessionHTML);
        recentStatsContainer.insertAdjacentHTML('beforeend', sessionHTML);
    });
}

// Logic for the Clear History button
document.getElementById('clearHistory').addEventListener('click', () => {
    if (confirm("Are you sure? This will clear your history and stats, but keep your trees.")) {
        state.sessions = [];
        state.totalSeconds = 0;
        saveState();
        renderAll();
    }
});


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

tabs.forEach(tab=>{
  tab.addEventListener('click',(e)=>{
    tabs.forEach(t=>t.classList.remove('active'));
    tab.classList.add('active');
    const to = tab.getAttribute('data-tab');
    tabPanels.forEach(p=>p.style.display='none');
    document.getElementById(to + 'Tab').style.display = 'block';
  });
});

function secToMMSS(s){
  const m = Math.floor(s/60); const sec = s%60;
  return `${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
}

function updateTimerDisplay(){
  timerDisplay.textContent = secToMMSS(timerLeft);
  const pct = ((timerSeconds - timerLeft) / timerSeconds) * 100;
  progressBar.style.width = Math.min(100, Math.max(0, pct)) + '%';
  
  const progress = (timerSeconds - timerLeft) / timerSeconds; 
  if(progress < 0.25){ stageBox.textContent = '🪾'; stageCaption.textContent = 'Seeking signs of life...'; }
  else if(progress < 0.50){ stageBox.textContent = '🪵'; stageCaption.textContent = 'Roots taking hold'; }
  else if(progress < 0.75){ stageBox.textContent = '🌿'; stageCaption.textContent = 'Restoration in progress'; }
  else { stageBox.textContent = '🌳'; stageCaption.textContent = 'Forest restored!'; }
}

function startTimer(){
  if(timerRunning) return;
  timerRunning = true;
  startStopBtn.textContent = 'Stop';
  timerInterval = setInterval(()=>{
    if(timerLeft <= 0){ completeSession(); return; }
    timerLeft--;
    updateTimerDisplay();
  }, 1000);
}

function completeSession(){
  clearInterval(timerInterval);
  timerRunning = false;
  
  const now = new Date();
  const dateStr = now.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const sessionMins = Math.round(timerSeconds/60);
  
  // Calculate a fun height (roughly 0.1 to 0.3 feet per minute)
  const growth = (sessionMins * (0.1 + Math.random() * 0.2)).toFixed(1);

  // Find the first dead tree to restore
  const targetIdx = state.garden.findIndex(t => t.status === 'dead');
  
  const newTreeData = { 
    id: Date.now(), 
    status: 'alive', 
    minutes: sessionMins,
    fullDate: `${dateStr} @ ${timeStr}`,
    growthHeight: growth
  };

  if(targetIdx !== -1) {
      state.garden[targetIdx] = newTreeData;
  } else {
      state.garden.push(newTreeData);
  }
  
  state.sessions.push({ when: Date.now(), success: true, minutes: sessionMins });
  state.totalSeconds += timerSeconds;
  
  const todayKey = now.toISOString().slice(0,10);
  if(state.lastPlantDate !== todayKey) {
    state.lastPlantDate = todayKey;
    state.streakCount = (state.streakCount || 0) + 1;
  }

  timerLeft = timerSeconds;
  saveState();
  flashCelebration();
  renderAll();
  startStopBtn.textContent = 'Start';
}

function flashCelebration(){
  const el = document.createElement('div');
  el.textContent = '🌳 Life Restored!';
  Object.assign(el.style,{
    position:'fixed', left:'50%', top:'14%', transform:'translateX(-50%)', background:'white', padding:'12px 18px', borderRadius:'12px', boxShadow:'0 20px 40px rgba(0,0,0,0.1)', zIndex:9999, fontWeight:800, transition: 'opacity 0.5s'
  });
  document.body.appendChild(el);
  setTimeout(()=> el.style.opacity = '0', 1200);
  setTimeout(()=> el.remove(), 1700);
}

startStopBtn.addEventListener('click', ()=>{
  if(timerRunning){ 
    if(!confirm('Stop and lose progress?')) return;
    clearInterval(timerInterval);
    timerRunning = false;
    timerLeft = timerSeconds;
    updateTimerDisplay();
    startStopBtn.textContent = 'Start';
  } else { startTimer(); }
});

let selectedTreeIndex = null;

function renderGardenAll() {
    gardenGridAll.innerHTML = '';
    let aliveCount = 0;

    state.garden.forEach((t, index) => {
        const el = document.createElement('div');
        el.className = t.status === 'alive' ? 'gardenItem' : 'gardenItem dead-tree';
        
        const emoji = t.status === 'alive' ? '🌳' : '🪾';
        const label = t.status === 'alive' ? (t.name || 'Restored') : 'Needs Restoration';
        
        el.innerHTML = `
            <div style="font-size:32px">${emoji}</div>
            <div class="status-label">${label}</div>
        `;

        el.onclick = () => handleTreeClick(index);
        gardenGridAll.appendChild(el);
        if(t.status === 'alive') aliveCount++;
    });
    
    totalTreesLabel.textContent = `${aliveCount} / ${state.garden.length}`;
}

let originalName = "";

function handleTreeClick(index) {
    selectedTreeIndex = index;
    const tree = state.garden[index];
    const modal = document.getElementById('treeModal');
    const nameInput = document.getElementById('treeNameInput');
    const saveBtn = document.getElementById('saveTreeBtn');
    
    // Reset save button
    saveBtn.style.display = 'none';

    if (tree.status === 'dead') {
        document.getElementById('aliveDetails').style.display = 'none';
        document.getElementById('deadDetails').style.display = 'block';
        document.getElementById('modalEmoji').textContent = '🪾';
        nameInput.value = "Wasteland";
        nameInput.disabled = true; // Prevent editing dead tree names
        nameInput.style.background = "transparent";
    } else {
        document.getElementById('aliveDetails').style.display = 'block';
        document.getElementById('deadDetails').style.display = 'none';
        document.getElementById('modalEmoji').textContent = '🌳';
        
        // Set name logic
        originalName = tree.name || "Focus Tree";
        nameInput.value = originalName;
        nameInput.disabled = false;
        nameInput.style.background = "rgba(0,0,0,0.03)";

        document.getElementById('modalStats').innerHTML = `
            <p>Restored: ${tree.fullDate}</p>
            <p>Focus Time: ${tree.minutes}m | Growth: ${tree.growthHeight}ft</p>
        `;
    }
    modal.style.display = 'flex';
}

// Check for changes to show/hide Save button
document.getElementById('treeNameInput').addEventListener('input', (e) => {
    const saveBtn = document.getElementById('saveTreeBtn');
    const currentName = e.target.value;
    
    if (currentName !== originalName && currentName.trim() !== "") {
        saveBtn.style.display = 'block';
    } else {
        saveBtn.style.display = 'none';
    }
});

document.getElementById('saveTreeBtn').onclick = () => {
    const newName = document.getElementById('treeNameInput').value;
    if (selectedTreeIndex !== null) {
        state.garden[selectedTreeIndex].name = newName;
        saveState();
        renderGardenAll();
        closeModal();
    }
};

function closeModal() {
    document.getElementById('treeModal').style.display = 'none';
}

document.getElementById('saveTreeBtn').onclick = () => {
    const newName = document.getElementById('treeNameInput').value;
    if (selectedTreeIndex !== null) {
        state.garden[selectedTreeIndex].name = newName;
        saveState();
        renderGardenAll();
        closeModal();
    }
};

// Close modal if clicking background
document.getElementById('treeModal').onclick = (e) => {
    if(e.target.id === 'treeModal') closeModal();
};

function renderStats(){
  const aliveCount = state.garden.filter(t => t.status === 'alive').length;
  statTotalTrees.textContent = aliveCount;
  statTotalMinutes.textContent = Math.round(state.totalSeconds / 60);
  statStreak.textContent = state.streakCount || 0;
}

function renderAll() {
    renderGardenAll();
    renderStats();
    renderHistory(); // <--- Add this line
}

loadState();
renderAll();
renderPresets();
setTimerMinutes(25);
runWelcomeAnimation();

setInterval(saveState, 20_000);