// --- Animation Logic ---
function runWelcomeAnimation() {
    const overlay = document.getElementById('welcomeOverlay');
    const line1 = document.getElementById('line1');
    const line2 = document.getElementById('line2');

    // Safety check in case elements are missing
    if (!overlay || !line1 || !line2) return;

    setTimeout(() => { line1.classList.add('fade-in'); }, 400);
    setTimeout(() => { line2.classList.add('fade-in'); }, 1400);
    setTimeout(() => { overlay.classList.add('hidden'); }, 4000);
    setTimeout(() => { overlay.remove(); }, 5500);
}

(function sparkle() {
    const n = 18;
    for (let i = 0; i < n; i++) {
        const s = document.createElement('div');
        s.className = 'sparkle';
        s.style.left = (Math.random() * 100) + 'vw';
        s.style.top = (40 + Math.random() * 70) + 'vh';
        s.style.opacity = 0.5 + Math.random() * 0.6;
        s.style.width = (4 + Math.random() * 6) + 'px';
        s.style.height = s.style.width;
        s.style.transition = 'transform 6s linear, top 6s linear, opacity 6s linear';
        document.body.appendChild(s);
        (function loop(el) {
            const dur = 6000 + Math.random() * 5000;
            requestAnimationFrame(() => {
                el.style.transform = 'translateY(-120vh) scale(.6)';
                el.style.opacity = 0;
                setTimeout(() => {
                    el.style.top = (40 + Math.random() * 70) + 'vh';
                    el.style.transform = 'translateY(0) scale(1)';
                    el.style.opacity = 0.6 + Math.random() * 0.4;
                    setTimeout(() => loop(el), dur);
                }, dur);
            });
        })(s);
    }
})();

// --- Constants & Config ---
const PRESETS = [5, 10, 25, 50];
const STORAGE_KEY = 'arboris_web_state_v2';
const TOTAL_FOREST_SIZE = 21;
const MAX_SAVED_FORESTS = 10;

// --- State Management ---
let state = {
    username: "Guest",
    activeForestId: 0,
    forests: [
        {
            id: Date.now(),
            name: "My First Forest",
            treeCount: 9,  
            garden: [] 
        }
    ],
    sessions: [],
    totalSeconds: 0,
    streakCount: 0,
    lastPlantDate: null
};

let currentSessionBioData = null; // Stores bio data for the current running session

function getActiveForest() {
    return state.forests.find(f => f.id === state.activeForestId) || state.forests[0];
}

function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
        try {
            state = JSON.parse(raw);
        } catch(e) { console.error("Save file corrupted", e); }
    }
    
    // Ensure structure integrity
    state.forests.forEach(f => {
        if (f.garden.length < f.treeCount) {
            while (f.garden.length < f.treeCount) {
                f.garden.push({ status: 'dead', minutes: 0, growthHeight: 0 });
            }
        }
    });

    if (!state.activeForestId && state.forests.length > 0) state.activeForestId = state.forests[0].id;
    
    updateUserUI();
    renderForestSelector();
}

// --- Auth & User UI ---
const authBtn = document.getElementById('authBtn');
const logoutBtn = document.getElementById('logoutBtn');

authBtn.onclick = () => document.getElementById('authModal').style.display = 'flex';

logoutBtn.onclick = () => {
    if(confirm("Logout? (Your progress is saved locally, but your name will reset to Guest)")) {
        state.username = "Guest";
        saveState();
        updateUserUI();
        renderLeaderboard();  
    }
};

document.getElementById('saveUserBtn').onclick = () => {
    const name = document.getElementById('usernameInput').value.trim();
    if (name) {
        state.username = name;
        updateUserUI();
        closeAuthModal();
        saveState();
        renderLeaderboard(); 
    }
};

function updateUserUI() {
    const displayUsername = document.getElementById('displayUsername');
    displayUsername.textContent = state.username;
    
     if (state.username === "Guest") {
        authBtn.style.display = "block";
        logoutBtn.style.display = "none";
    } else {
        authBtn.style.display = "none";
        logoutBtn.style.display = "block";
    }

    const line1 = document.getElementById('line1');
    if (line1) line1.textContent = `Welcome back, ${state.username}`;
}

function closeAuthModal() { document.getElementById('authModal').style.display = 'none'; }

// --- Forest Management ---
document.getElementById('createNewForestBtn').onclick = () => {
    document.getElementById('newForestModal').style.display = 'flex';
};

document.getElementById('confirmNewForest').onclick = () => {
    const name = document.getElementById('forestNameInput').value || "New Forest";
    const count = parseInt(document.getElementById('treeCountInput').value);
    
    const newForest = {
        id: Date.now(),
        name: name,
        treeCount: count,
        garden: Array(count).fill().map(() => ({ status: 'dead', minutes: 0, growthHeight: 0 }))
    };
    
    state.forests.push(newForest);
    state.activeForestId = newForest.id;
    
    renderForestSelector();
    renderAll();
    saveState();
    closeForestModal();
};

function renderForestSelector() {
    const selector = document.getElementById('forestSelector');
    selector.innerHTML = '';
    state.forests.forEach(f => {
        const opt = document.createElement('option');
        opt.value = f.id;
        opt.textContent = f.name;
        if (f.id === state.activeForestId) opt.selected = true;
        selector.appendChild(opt);
    });
}

document.getElementById('forestSelector').onchange = (e) => {
    state.activeForestId = parseInt(e.target.value);
    renderAll();
    saveState();
};

function closeForestModal() { document.getElementById('newForestModal').style.display = 'none'; }

// --- Timer Variables ---
let timerSeconds = 25 * 60;
let timerLeft = timerSeconds;
let timerRunning = false;
let timerInterval = null;
let selectedTreeIndex = null;
let originalName = "";

// --- UI Elements ---
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


function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.warn('save failed', e);
    }
}

// --- Presets & Timer Settings ---
function renderPresets() {
    presetRow.innerHTML = '';
    PRESETS.forEach(p => {
        const btn = document.createElement('button');
        btn.className = 'preset';
        btn.textContent = p + 'm';
        btn.addEventListener('click', () => setTimerMinutes(p));
        presetRow.appendChild(btn);
    });
    highlightActivePreset();
}

function renderHistory() {
    const historyContainer = document.getElementById('history');
    const recentStatsContainer = document.getElementById('recentSessions');

    historyContainer.innerHTML = '';
    recentStatsContainer.innerHTML = '';

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

        const sessionHTML = `
            <div style="display:flex; justify-content:space-between; padding: 8px 0; border-bottom:1px solid rgba(0,0,0,0.05)">
                <div>
                    <span style="color:var(--leaf)">🌳</span> 
                    <strong>${session.minutes}m</strong>
                    ${session.hrv ? `<span style="font-size:10px; margin-left:8px; color:var(--mint)">🧬 ${session.hrv}ms</span>` : ''}
                </div>
                <div class="small muted">${dateString} at ${timeString}</div>
            </div>
        `;

        historyContainer.insertAdjacentHTML('beforeend', sessionHTML);
        recentStatsContainer.insertAdjacentHTML('beforeend', sessionHTML);
    });
}

document.getElementById('clearHistory').addEventListener('click', () => {
    if (confirm("Are you sure? This will clear your history and stats, but keep your trees.")) {
        state.sessions = [];
        state.totalSeconds = 0;
        saveState();
        renderAll();
    }
});

function highlightActivePreset() {
    document.querySelectorAll('.preset').forEach(el => {
        const mins = parseInt(el.textContent);
        if (mins === Math.round(timerSeconds / 60)) el.classList.add('active');
        else el.classList.remove('active');
    });
}

function setTimerMinutes(mins) {
    if (timerRunning) return; // Prevent changing time while running
    timerSeconds = mins * 60;
    timerLeft = timerSeconds;
    updateTimerDisplay();
    highlightActivePreset();
}

function applyCustomMinutes() {
    const v = parseInt(customMinutes.value);
    if (!v || v < 1 || v > 240) {
        alert('Enter a valid custom minute (1–240).');
        return;
    }
    setTimerMinutes(v);
}

applyCustom.addEventListener('click', applyCustomMinutes);

// --- Tabs ---
tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const to = tab.getAttribute('data-tab');
        tabPanels.forEach(p => p.style.display = 'none');
        document.getElementById(to + 'Tab').style.display = 'block';

        if (to === 'leaderboard') {
            renderLeaderboard();
        }
    });
});

// --- Timer Logic ---
function secToMMSS(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

function updateTimerDisplay() {
    timerDisplay.textContent = secToMMSS(timerLeft);
    const pct = ((timerSeconds - timerLeft) / timerSeconds) * 100;
    progressBar.style.width = Math.min(100, Math.max(0, pct)) + '%';

    if (timerLeft > 0 && timerRunning) {
        stageBox.textContent = '🪾';
        stageCaption.textContent = 'Restoring the wasteland...';
    } else if (timerLeft === 0) {
        stageBox.textContent = '🌳';
        stageCaption.textContent = 'Forest restored!';
    } else {
        stageBox.textContent = '🌱';
        stageCaption.textContent = 'Ready to grow';
    }
}

// --- BIO SYNC LOGIC ---
function triggerBioSync() {
    const readings = [
        { score: 48, label: "Fatigued", color: "#ff7675", emoji: "😴", tip: "Low recovery detected. Shorter session recommended." },
        { score: 76, label: "Balanced", color: "#7eb38b", emoji: "😌", tip: "Nervous system stable. Ready for Standard session." },
        { score: 94, label: "Peak Flow", color: "#1d5f2f", emoji: "🚀", tip: "Optimal coherence! High tree growth potential." }
    ];
    const data = readings[Math.floor(Math.random() * readings.length)];
    currentSessionBioData = data;
    
    const overlay = document.createElement('div');
    overlay.id = "bioSyncOverlay";
    overlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(21,49,31,0.9);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;z-index:10000;font-family:'Quicksand',sans-serif;`;
    
    // Added Cancel Button here
    overlay.innerHTML = `
        <div style="background:white;width:90%;max-width:340px;border-radius:30px;padding:35px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.4);position:relative;">
            <div style="font-size:11px;font-weight:800;color:#7eb38b;letter-spacing:3px;margin-bottom:15px;">ARBORIS BIOSYNC™</div>
            <div style="font-size:60px;margin-bottom:15px;">${data.emoji}</div>
            <div style="font-size:44px;font-weight:900;color:${data.color};">${data.score}<span style="font-size:18px;">ms</span></div>
            <div style="font-weight:800;color:#333;margin-top:5px;font-size:18px;">${data.label} State</div>
            <p style="background:#f8fbf8;padding:15px;border-radius:15px;margin:20px 0;font-size:13px;color:#555;border:1px solid #eef5ea;">"${data.tip}"</p>
            <div style="display:flex; gap:10px;">
                <button id="cancelBioBtn" style="flex:1; background:#eee; color:#555; border:none; padding:18px; border-radius:50px; font-weight:700; cursor:pointer;">Cancel</button>
                <button id="confirmBioBtn" style="flex:2; background:linear-gradient(90deg,#7eb38b,#1d5f2f); color:white; border:none; padding:18px; border-radius:50px; font-weight:800; cursor:pointer;">Begin Focus</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);

    // Confirm: Starts Timer
    document.getElementById('confirmBioBtn').onclick = () => {
        overlay.remove();
        startTimer();
    };

    // Cancel: Closes overlay, does NOT start timer
    document.getElementById('cancelBioBtn').onclick = () => {
        overlay.remove();
        currentSessionBioData = null;
    };
}

function startTimer() {
    if (timerRunning) return;
    
    timerRunning = true;
    startStopBtn.textContent = 'Give Up'; // Changed to indicate "Stop" means quitting
    startStopBtn.style.background = '#ff7675'; // Optional: Make it red to indicate danger
    
    // Disable inputs while running
    document.querySelectorAll('.preset').forEach(b => b.style.pointerEvents = 'none');
    
    timerInterval = setInterval(() => {
        if (timerLeft <= 0) {
            completeSession();
            return;
        }
        timerLeft--;
        updateTimerDisplay();
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
    timerRunning = false;
    timerLeft = timerSeconds; // Reset to original time
    updateTimerDisplay();
    
    // Reset Button UI
    startStopBtn.textContent = 'Start';
    startStopBtn.style.background = 'var(--leaf)';
    
    // Re-enable inputs
    document.querySelectorAll('.preset').forEach(b => b.style.pointerEvents = 'auto');
    
    currentSessionBioData = null;
}


startStopBtn.addEventListener('click', () => {
    if (timerRunning) {
        // "Pause/Cancel" Logic
        if (confirm('Stop focusing? You will lose progress on this tree.')) {
            stopTimer();
        }
    } else {
        // "Start" Logic
        const activeForest = getActiveForest();
        const aliveCount = activeForest.garden.filter(t => t.status === 'alive').length;
        
        if (aliveCount >= activeForest.treeCount) {
            alert("This forest is complete! Please create or select a new forest to continue focusing.");
            document.getElementById('newForestModal').style.display = 'flex'; 
            return;
        }
        
        // Trigger Bio Sync before starting
        triggerBioSync();
    }
});

function completeSession() {
    clearInterval(timerInterval);
    timerRunning = false;

    const now = new Date();
    const dateStr = now.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const sessionMins = Math.round(timerSeconds / 60);
    const growth = (sessionMins * (0.1 + Math.random() * 0.2)).toFixed(1);

    const activeForest = getActiveForest();
    const targetIdx = activeForest.garden.findIndex(t => t.status === 'dead');

    const newTreeData = {
        id: Date.now(),
        status: 'alive',
        minutes: sessionMins,
        fullDate: `${dateStr} @ ${timeStr}`,
        growthHeight: growth,
        name: null,
        hrvScore: currentSessionBioData ? currentSessionBioData.score : 75
    };

    if (targetIdx !== -1) {
        activeForest.garden[targetIdx] = newTreeData;
        
        const newAliveCount = activeForest.garden.filter(t => t.status === 'alive').length;
        
        if (newAliveCount >= activeForest.treeCount) { 
            activeForest.isComplete = true; 
            activeForest.completedDate = new Date().toISOString();
            flashForestComplete();
        }
    }
    
    state.sessions.push({ 
        when: Date.now(), 
        success: true, 
        minutes: sessionMins, 
        hrv: currentSessionBioData ? currentSessionBioData.score : null 
    });
    
    state.totalSeconds += timerSeconds;

    const todayKey = now.toISOString().slice(0, 10);
    if (state.lastPlantDate !== todayKey) {
        state.lastPlantDate = todayKey;
        state.streakCount = (state.streakCount || 0) + 1;
    }

    // Reset Timer & UI
    timerLeft = timerSeconds;
    startStopBtn.textContent = 'Start';
    startStopBtn.style.background = 'var(--leaf)';
    document.querySelectorAll('.preset').forEach(b => b.style.pointerEvents = 'auto');
    
    saveState();
    flashCelebration();
    renderAll();
    currentSessionBioData = null;
}

// --- Effects ---
function flashCelebration() {
    const el = document.createElement('div');
    el.textContent = '🌳 Life Restored!';
    Object.assign(el.style, {
        position: 'fixed', left: '50%', top: '14%', transform: 'translateX(-50%)',
        background: 'white', padding: '12px 18px', borderRadius: '12px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)', zIndex: 9999, fontWeight: 800, transition: 'opacity 0.5s'
    });
    document.body.appendChild(el);
    setTimeout(() => el.style.opacity = '0', 1200);
    setTimeout(() => el.remove(), 1700);
}

function flashForestComplete() {
    const el = document.createElement('div');
    el.textContent = '🎉 FOREST COMPLETED! 🎉';
    Object.assign(el.style, {
        position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
        background: 'linear-gradient(90deg, var(--mint), var(--leaf))', padding: '20px 30px',
        borderRadius: '18px', boxShadow: '0 25px 50px rgba(0,0,0,0.2)', zIndex: 9999,
        fontWeight: 800, color: 'white', fontSize: '24px', textAlign: 'center', transition: 'opacity 0.5s, transform 0.5s'
    });
    document.body.appendChild(el);
    setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translate(-50%, -50%) scale(1.2)';
    }, 2000);
    setTimeout(() => el.remove(), 2500);
}

// --- Grid Rendering ---
function renderGardenAll() {
    const activeForest = getActiveForest();
    gardenGridAll.innerHTML = '';
    let aliveCount = 0;

    activeForest.garden.forEach((t, index) => {
        const el = document.createElement('div');
        el.className = t.status === 'alive' ? 'gardenItem' : 'gardenItem dead-tree';

        const emoji = t.status === 'alive' ? '🌳' : '🪾';
        const label = t.status === 'alive' ? (t.name || 'Restored') : 'Needs Restoration';

        el.innerHTML = `
            <div style="font-size:32px">${emoji}</div>
            <div class="status-label">${label}</div>
            ${t.hrvScore ? `<div style="font-size:9px; font-weight:800; color:var(--leaf); margin-top:2px;">🧬 ${t.hrvScore}ms</div>` : ''}
        `;

        el.onclick = () => handleTreeClick(index);
        gardenGridAll.appendChild(el);
        if (t.status === 'alive') aliveCount++;
    });

    totalTreesLabel.textContent = `${aliveCount} / ${activeForest.treeCount}`;
}

// --- Tree Modal & Editing ---
function handleTreeClick(index) {
    selectedTreeIndex = index;
    const activeForest = getActiveForest();
    const tree = activeForest.garden[index];

    const modal = document.getElementById('treeModal');
    const nameInput = document.getElementById('treeNameInput');
    const saveBtn = document.getElementById('saveTreeBtn');
    const modalEmoji = document.getElementById('modalEmoji');
    const aliveDetails = document.getElementById('aliveDetails');
    const deadDetails = document.getElementById('deadDetails');
    const modalStats = document.getElementById('modalStats');

    saveBtn.style.display = 'none';

    if (tree.status === 'dead') {
        aliveDetails.style.display = 'none';
        deadDetails.style.display = 'block';
        modalEmoji.textContent = '🪾';
        
        nameInput.value = "Wasteland";
        nameInput.disabled = true; 
        nameInput.style.background = "transparent";
        nameInput.style.border = "none";
    } else {
        aliveDetails.style.display = 'block';
        deadDetails.style.display = 'none';
        modalEmoji.textContent = '🌳';

        originalName = tree.name || "Focus Tree";
        nameInput.value = originalName;
        nameInput.disabled = false;
        nameInput.style.background = "rgba(0,0,0,0.03)";
        nameInput.style.border = "1px solid rgba(0,0,0,0.1)";

        modalStats.innerHTML = `
            <div style="margin-top:10px;">
                <p><strong>Restored:</strong> ${tree.fullDate}</p>
                <p><strong>Focus Time:</strong> ${tree.minutes}m</p>
                <p><strong>Growth:</strong> ${tree.growthHeight}ft</p>
                ${tree.hrvScore ? `<p><strong>Bio-Score:</strong> ${tree.hrvScore}ms HRV</p>` : ''}
            </div>
        `;
    }

    modal.style.display = 'flex';
}

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
        const activeForest = getActiveForest();
        activeForest.garden[selectedTreeIndex].name = newName;
        saveState();
        renderGardenAll();
        closeModal();
    }
};

function closeModal() {
    document.getElementById('treeModal').style.display = 'none';
}

document.getElementById('treeModal').onclick = (e) => {
    if (e.target.id === 'treeModal') closeModal();
};

// --- Stats & Leaderboard ---
function renderStats() {
    const allAliveTrees = state.forests.reduce((sum, forest) => {
        return sum + forest.garden.filter(t => t.status === 'alive').length;
    }, 0);

    statTotalTrees.textContent = allAliveTrees;
    statTotalMinutes.textContent = Math.round(state.totalSeconds / 60);
    statStreak.textContent = state.streakCount || 0;
}

function renderLeaderboard() {
    const leaderboardList = document.getElementById('leaderboardList');
    const userForestsContainer = document.getElementById('userForests');
    if (!leaderboardList) return;

    const completedForestsArray = state.forests.filter(f => f.isComplete);
    
    const currentUserData = {
        username: state.username,
        userId: "current_user",
        completedForests: completedForestsArray.length, 
        totalTrees: state.forests.reduce((sum, f) => sum + f.garden.filter(t => t.status === 'alive').length, 0),
        totalMinutes: Math.round(state.totalSeconds / 60),
        forests: state.forests 
    };

    const sortedUsers = [currentUserData];

    leaderboardList.innerHTML = '';
    sortedUsers.forEach((user, index) => {
        const isCurrentUser = user.userId === "current_user";
        const item = document.createElement('div');
        item.className = 'leaderboard-item';
        
        item.innerHTML = `
            <div class="rank">${index + 1}</div>
            <div class="user-info">
                <div class="username">${user.username} ${isCurrentUser && user.username !== "Guest" ? '(You)' : ''}</div>
                <div class="user-stats">${user.totalTrees} trees • ${user.totalMinutes} min</div>
            </div>
            <div class="forest-count">${user.completedForests} completed forest${user.completedForests !== 1 ? 's' : ''}</div>
        `;

        item.onclick = () => openUserProfile(user.userId);
        leaderboardList.appendChild(item);
    });

    if (userForestsContainer) {
        userForestsContainer.innerHTML = '';

        if (completedForestsArray.length === 0) {
            userForestsContainer.innerHTML = '<div class="small muted" style="padding:20px;text-align:center">Reach trees goal to complete your first forest!</div>';
        } else {
            const displayForests = [...completedForestsArray].reverse();

            displayForests.forEach((forest, index) => {
                const forestCard = document.createElement('div');
                forestCard.className = 'forest-card';
                
                const date = forest.completedDate ? new Date(forest.completedDate) : new Date();
                const dateStr = date.toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });

                forestCard.innerHTML = `
                    <div class="forest-emoji">✅</div>
                    <div class="forest-date">${forest.name}</div>
                    <div class="forest-stats">${dateStr}</div>
                    <div class="forest-stats">${forest.treeCount}/${forest.treeCount} Trees</div>
                `;

                forestCard.onclick = () => openUserProfile("current_user", state.forests.indexOf(forest));
                userForestsContainer.appendChild(forestCard);
            });
        }
    }
}

// --- User Profile & Forest Detail ---
function openUserProfile(userId, forestIndex = null) {
    const modal = document.getElementById('userProfileModal');
    const username = document.getElementById('profileUsername');
    const profileStats = document.getElementById('profileStats');
    const profileForests = document.getElementById('profileForests');
    const forestDetailView = document.getElementById('forestDetailView');

    const completedForests = state.forests.filter(f => f.isComplete);

    username.textContent = state.username + (userId === "current_user" ? ' (You)' : '');
    
    const totalTrees = state.forests.reduce((sum, f) => sum + f.garden.filter(t => t.status === 'alive').length, 0);
    profileStats.textContent = `${completedForests.length} forests • ${totalTrees} trees • ${Math.round(state.totalSeconds / 60)}m`;

    profileForests.innerHTML = '';

    if (completedForests.length === 0) {
        profileForests.innerHTML = '<div class="small muted" style="padding:20px;text-align:center">No forests completed yet.</div>';
    } else {
        completedForests.forEach((forest, idx) => {
            const forestCard = document.createElement('div');
            forestCard.className = 'forest-card';
            
            const dateStr = forest.completedDate ? new Date(forest.completedDate).toLocaleDateString() : 'Recently';

            forestCard.innerHTML = `
                <div class="forest-emoji">🌳</div>
                <div class="forest-date">${forest.name}</div>
                <div class="forest-stats">${dateStr}</div>
                <div class="forest-stats">${forest.treeCount} Trees</div>
            `;

            forestCard.onclick = () => showForestDetail(forest);
            profileForests.appendChild(forestCard);
        });
    }

    forestDetailView.style.display = 'none';
    profileForests.style.display = 'grid';
    modal.style.display = 'flex';
}

function showForestDetail(forest) {
    const forestDetailView = document.getElementById('forestDetailView');
    const forestGridDetail = document.getElementById('forestGridDetail');
    const profileForests = document.getElementById('profileForests');

    profileForests.style.display = 'none';
    forestDetailView.style.display = 'block';

    forestDetailView.style.cssText = `
        background: #f8faf9;
        border-radius: 20px;
        padding: 20px;
        border: 1px solid rgba(0,0,0,0.05);
        box-shadow: 0 4px 15px rgba(0,0,0,0.02);
    `;

    const aliveCount = forest.garden.filter(t => t.status === 'alive').length;
    const totalMins = forest.garden.reduce((sum, t) => sum + (t.minutes || 0), 0);
    
    forestDetailView.querySelector('.detail-header').innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px;">
            <div>
                <div style="font-weight:800; color:var(--leaf); font-size:20px; line-height:1.2;">${forest.name}</div>
                <div style="font-size:12px; color:#666; margin-top:4px; font-weight:600;">
                    🏆 Forest Complete • ${aliveCount}/${forest.treeCount} Trees • ${totalMins}m
                </div>
            </div>
            <button class="btnGhost" onclick="backToProfile()" style="padding:6px 10px; font-size:12px; background:white; border-radius:8px; box-shadow:0 2px 4px rgba(0,0,0,0.05);">
                ← Back
            </button>
        </div>
    `;

    forestGridDetail.innerHTML = '';
    Object.assign(forestGridDetail.style, {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '10px',
        marginTop: '10px'
    });

    forest.garden.forEach((tree) => {
        const treeEl = document.createElement('div');
        treeEl.style.cssText = `
            background: white; 
            border-radius: 12px;
            padding: 10px 5px;
            text-align: center;
            border: 1px solid rgba(0,0,0,0.03);
            box-shadow: 0 2px 5px rgba(0,0,0,0.02);
            position: relative;
        `;

        const emoji = tree.status === 'alive' ? '🌳' : '🪾';
        const bioBadge = tree.hrvScore ? `<div style="position:absolute;top:-5px;right:-5px;background:var(--leaf);color:white;font-size:8px;padding:2px 5px;border-radius:10px;">🧬 ${tree.hrvScore}</div>` : '';

        treeEl.innerHTML = `
            ${bioBadge}
            <div style="font-size:22px;">${emoji}</div>
            <div style="font-size:10px; font-weight:800; color:var(--leaf); margin-top:4px;">${tree.minutes || 0}m</div>
        `;
        forestGridDetail.appendChild(treeEl);
    });
}

function backToProfile() {
    const forestDetailView = document.getElementById('forestDetailView');
    const profileForests = document.getElementById('profileForests');

    forestDetailView.style.display = 'none';
    profileForests.style.display = 'grid';
}

function closeUserProfile() {
    document.getElementById('userProfileModal').style.display = 'none';
}

document.getElementById('userProfileModal').onclick = (e) => {
    if (e.target.id === 'userProfileModal') closeUserProfile();
};

// --- Initialization ---
function renderAll() {
    renderGardenAll();
    renderStats();
    renderHistory();
    renderLeaderboard();
}

window.addEventListener('load', () => {
    const line1 = document.getElementById('line1');
    if (line1) {
        line1.textContent = `Welcome back, ${state.username}`;
    }
});

loadState();
renderAll();
renderPresets();
setTimerMinutes(25);
runWelcomeAnimation();

setInterval(saveState, 20000);

state.forests.forEach(f => {
    const aliveCount = f.garden.filter(t => t.status === 'alive').length;
    if (aliveCount >= f.treeCount && f.treeCount > 0) {
        f.isComplete = true;
    }
});
saveState();
renderAll();