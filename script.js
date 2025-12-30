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

const PRESETS = [5, 10, 25, 50];
const STORAGE_KEY = 'arboris_web_state_v2';
const TOTAL_FOREST_SIZE = 21;
const MAX_SAVED_FORESTS = 10;

// Update your initial state
let state = {
    username: "Guest",
    activeForestId: 0,
    forests: [
        {
            id: Date.now(),
            name: "My First Forest",
            treeCount: 9, // Changed default to 9
            garden: [] 
        }
    ],
    sessions: [],
    totalSeconds: 0,
    streakCount: 0,
    lastPlantDate: null
};

// HELPER: Get Current Active Forest
function getActiveForest() {
    return state.forests.find(f => f.id === state.activeForestId) || state.forests[0];
}

// UPDATE: loadState to handle the new structure
function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
        state = JSON.parse(raw);
    }
    
    // Ensure the active forest has its garden initialized
    state.forests.forEach(f => {
        if (f.garden.length < f.treeCount) {
            while (f.garden.length < f.treeCount) {
                f.garden.push({ status: 'dead', minutes: 0, growthHeight: 0 });
            }
        }
    });

    if (!state.activeForestId) state.activeForestId = state.forests[0].id;
    
    updateUserUI();
    renderForestSelector();
}

// AUTH LOGIC
// AUTH LOGIC
const authBtn = document.getElementById('authBtn');
const logoutBtn = document.getElementById('logoutBtn');

authBtn.onclick = () => document.getElementById('authModal').style.display = 'flex';

logoutBtn.onclick = () => {
    if(confirm("Logout? (Your progress is saved locally, but your name will reset to Guest)")) {
        state.username = "Guest";
        saveState();
        updateUserUI();
        renderLeaderboard(); // Refresh leaderboard to show Guest
    }
};

document.getElementById('saveUserBtn').onclick = () => {
    const name = document.getElementById('usernameInput').value.trim();
    if (name) {
        state.username = name;
        updateUserUI();
        closeAuthModal();
        saveState();
        renderLeaderboard(); // Refresh leaderboard to show new name
    }
};

function updateUserUI() {
    const displayUsername = document.getElementById('displayUsername');
    displayUsername.textContent = state.username;
    
    // Toggle buttons based on login status
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

// FOREST MANAGEMENT LOGIC
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

// Only the current user - no fake people
const mockUsers = [
    {
        username: state.username,
        userId: "current_user",
        completedForests: 0,
        totalTrees: 0,
        totalMinutes: 0,
        forests: []
    }
];

let timerSeconds = 25 * 60;
let timerLeft = timerSeconds;
let timerRunning = false;
let timerInterval = null;
let selectedTreeIndex = null;
let originalName = "";
let currentProfileUserId = null;

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

function highlightActivePreset() {
    document.querySelectorAll('.preset').forEach(el => {
        const mins = parseInt(el.textContent);
        if (mins === Math.round(timerSeconds / 60)) el.classList.add('active');
        else el.classList.remove('active');
    });
}

function setTimerMinutes(mins) {
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

tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const to = tab.getAttribute('data-tab');
        tabPanels.forEach(p => p.style.display = 'none');
        document.getElementById(to + 'Tab').style.display = 'block';

        // If switching to leaderboard tab, refresh leaderboard
        if (to === 'leaderboard') {
            renderLeaderboard();
        }
    });
});

function secToMMSS(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

function updateTimerDisplay() {
    timerDisplay.textContent = secToMMSS(timerLeft);
    const pct = ((timerSeconds - timerLeft) / timerSeconds) * 100;
    progressBar.style.width = Math.min(100, Math.max(0, pct)) + '%';

    // Simplified logic: Show wasteland while running, alive tree only when finished
    if (timerLeft > 0) {
        stageBox.textContent = '🪾';
        stageCaption.textContent = 'Restoring the wasteland...';
    } else {
        stageBox.textContent = '🌳';
        stageCaption.textContent = 'Forest restored!';
    }
}
function startTimer() {
    if (timerRunning) return;
    timerRunning = true;
    startStopBtn.textContent = 'Stop';
    timerInterval = setInterval(() => {
        if (timerLeft <= 0) {
            completeSession();
            return;
        }
        timerLeft--;
        updateTimerDisplay();
    }, 1000);
}

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
        name: null
    };

if (targetIdx !== -1) {
    activeForest.garden[targetIdx] = newTreeData;
    
    // Check if the forest is full based on its OWN specific size
    const newAliveCount = activeForest.garden.filter(t => t.status === 'alive').length;
    
    if (newAliveCount >= activeForest.treeCount) { 
        activeForest.isComplete = true; 
        activeForest.completedDate = new Date().toISOString();
        flashForestComplete();
    }
}
    // Global Stats update
    state.sessions.push({ when: Date.now(), success: true, minutes: sessionMins });
    state.totalSeconds += timerSeconds;

    const todayKey = now.toISOString().slice(0, 10);
    if (state.lastPlantDate !== todayKey) {
        state.lastPlantDate = todayKey;
        state.streakCount = (state.streakCount || 0) + 1;
    }

    timerLeft = timerSeconds;
    saveState();
    flashCelebration();
    renderAll();
    startStopBtn.textContent = 'Start';
}

function archiveForest() {
    // Create a copy of the completed forest
    const completedForest = {
        id: 'forest_' + Date.now(),
        completedDate: new Date().toISOString().slice(0, 10),
        trees: [...state.garden],
        totalMinutes: state.garden.reduce((sum, tree) => sum + tree.minutes, 0)
    };

    // Add to completed forests
    state.completedForests.unshift(completedForest);

    // Keep only last MAX_SAVED_FORESTS
    if (state.completedForests.length > MAX_SAVED_FORESTS) {
        state.completedForests.pop();
    }

    // Update current user in mockUsers
    const currentUser = mockUsers.find(u => u.userId === "current_user");
    if (currentUser) {
        currentUser.completedForests++;
        currentUser.totalTrees += TOTAL_FOREST_SIZE;
        currentUser.totalMinutes += completedForest.totalMinutes;
        currentUser.forests.unshift(completedForest);
    }

    // Reset current garden with dead trees
    state.garden = Array(TOTAL_FOREST_SIZE).fill().map(() => ({
        status: 'dead',
        createdAt: null,
        minutes: 0,
        fullDate: null,
        growthHeight: 0
    }));

    // Show celebration
    flashForestComplete();
}

function flashCelebration() {
    const el = document.createElement('div');
    el.textContent = '🌳 Life Restored!';
    Object.assign(el.style, {
        position: 'fixed',
        left: '50%',
        top: '14%',
        transform: 'translateX(-50%)',
        background: 'white',
        padding: '12px 18px',
        borderRadius: '12px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
        zIndex: 9999,
        fontWeight: 800,
        transition: 'opacity 0.5s'
    });
    document.body.appendChild(el);
    setTimeout(() => el.style.opacity = '0', 1200);
    setTimeout(() => el.remove(), 1700);
}

function flashForestComplete() {
    const el = document.createElement('div');
    el.textContent = '🎉 FOREST COMPLETED! 🎉';
    Object.assign(el.style, {
        position: 'fixed',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'linear-gradient(90deg, var(--mint), var(--leaf))',
        padding: '20px 30px',
        borderRadius: '18px',
        boxShadow: '0 25px 50px rgba(0,0,0,0.2)',
        zIndex: 9999,
        fontWeight: 800,
        color: 'white',
        fontSize: '24px',
        textAlign: 'center',
        transition: 'opacity 0.5s, transform 0.5s'
    });
    document.body.appendChild(el);
    setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translate(-50%, -50%) scale(1.2)';
    }, 2000);
    setTimeout(() => el.remove(), 2500);
}

startStopBtn.addEventListener('click', () => {
    if (timerRunning) {
        if (!confirm('Stop and lose progress?')) return;
        clearInterval(timerInterval);
        timerRunning = false;
        timerLeft = timerSeconds;
        updateTimerDisplay();
        startStopBtn.textContent = 'Start';
    } else {
        // CHECK IF FOREST IS FULL BEFORE STARTING
        const activeForest = getActiveForest();
        const aliveCount = activeForest.garden.filter(t => t.status === 'alive').length;
        
        if (aliveCount >= activeForest.treeCount) {
            alert("This forest is complete! Please create or select a new forest to continue focusing.");
            document.getElementById('newForestModal').style.display = 'flex'; // Open modal automatically
            return;
        }
        startTimer();
    }
});

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
        `;

        el.onclick = () => handleTreeClick(index);
        gardenGridAll.appendChild(el);
        if (t.status === 'alive') aliveCount++;
    });

    totalTreesLabel.textContent = `${aliveCount} / ${activeForest.treeCount}`;
}

function handleTreeClick(index) {
    // 1. Store the index globally so the "Save" button knows which tree to update
    selectedTreeIndex = index;

    // 2. Get the active forest and the specific tree data
    const activeForest = getActiveForest();
    const tree = activeForest.garden[index];

    // 3. Get references to Modal elements
    const modal = document.getElementById('treeModal');
    const nameInput = document.getElementById('treeNameInput');
    const saveBtn = document.getElementById('saveTreeBtn');
    const modalEmoji = document.getElementById('modalEmoji');
    const aliveDetails = document.getElementById('aliveDetails');
    const deadDetails = document.getElementById('deadDetails');
    const modalStats = document.getElementById('modalStats');

    // 4. Reset the Save button visibility (only shows if name is edited)
    saveBtn.style.display = 'none';

    // 5. Check if the tree is Dead or Alive
    if (tree.status === 'dead') {
        // --- WASTELAND VIEW ---
        aliveDetails.style.display = 'none';
        deadDetails.style.display = 'block';
        modalEmoji.textContent = '🪾';
        
        nameInput.value = "Wasteland";
        nameInput.disabled = true; // Prevent renaming dead slots
        nameInput.style.background = "transparent";
        nameInput.style.border = "none";
    } else {
        // --- RESTORED TREE VIEW ---
        aliveDetails.style.display = 'block';
        deadDetails.style.display = 'none';
        modalEmoji.textContent = '🌳';

        // Setup renaming logic
        originalName = tree.name || "Focus Tree";
        nameInput.value = originalName;
        nameInput.disabled = false;
        nameInput.style.background = "rgba(0,0,0,0.03)";
        nameInput.style.border = "1px solid rgba(0,0,0,0.1)";

        // Display the specific stats for this tree
        modalStats.innerHTML = `
            <div style="margin-top:10px;">
                <p><strong>Restored:</strong> ${tree.fullDate}</p>
                <p><strong>Focus Time:</strong> ${tree.minutes}m</p>
                <p><strong>Growth:</strong> ${tree.growthHeight}ft</p>
            </div>
        `;
    }

    // 6. Show the modal
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

// Close modal if clicking background
document.getElementById('treeModal').onclick = (e) => {
    if (e.target.id === 'treeModal') closeModal();
};

function renderStats() {
    // Count every alive tree in every forest in the state
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

    // 1. Calculate stats based on the new isComplete property
    const completedForestsArray = state.forests.filter(f => f.isComplete);
    
    const currentUserData = {
        username: state.username,
        userId: "current_user",
        // Only count forests that have actually been finished (9/9)
        completedForests: completedForestsArray.length, 
        totalTrees: state.forests.reduce((sum, f) => sum + f.garden.filter(t => t.status === 'alive').length, 0),
        totalMinutes: Math.round(state.totalSeconds / 60),
        forests: state.forests 
    };

    const sortedUsers = [currentUserData];

    // 2. Render Leaderboard List
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

    // 3. Render User's Forest History (Show only completed ones or all)
    if (userForestsContainer) {
        userForestsContainer.innerHTML = '';

        if (completedForestsArray.length === 0) {
            userForestsContainer.innerHTML = '<div class="small muted" style="padding:20px;text-align:center">Reach 9/9 trees to complete your first forest!</div>';
        } else {
            // Sort to show most recently completed first
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

                // Logic to open details for this specific forest
                forestCard.onclick = () => openUserProfile("current_user", state.forests.indexOf(forest));
                userForestsContainer.appendChild(forestCard);
            });
        }
    }
}

function openUserProfile(userId, forestIndex = null) {
    const modal = document.getElementById('userProfileModal');
    const username = document.getElementById('profileUsername');
    const profileStats = document.getElementById('profileStats');
    const profileForests = document.getElementById('profileForests');
    const forestDetailView = document.getElementById('forestDetailView');

    // Get only the completed forests for the history view
    const completedForests = state.forests.filter(f => f.isComplete);

    // Set basic info
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

            // Pass the specific forest object to the detail view
            forestCard.onclick = () => showForestDetail(forest);
            profileForests.appendChild(forestCard);
        });
    }

    // Reset view state
    forestDetailView.style.display = 'none';
    profileForests.style.display = 'grid';
    modal.style.display = 'flex';
}

function showForestDetail(forest) {
    const forestDetailView = document.getElementById('forestDetailView');
    const forestGridDetail = document.getElementById('forestGridDetail');
    const profileForests = document.getElementById('profileForests');

    // Hide the list of forests
    profileForests.style.display = 'none';
    forestDetailView.style.display = 'block';

    // 1. Style the main Detail View container to have a solid background
    forestDetailView.style.cssText = `
        background: #f8faf9; /* Light mint-tinted solid background */
        border-radius: 20px;
        padding: 20px;
        border: 1px solid rgba(0,0,0,0.05);
        box-shadow: 0 4px 15px rgba(0,0,0,0.02);
    `;

    // 2. Build the Header (Name, Stats, and Back Button)
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

    // 3. Clear and style the Grid
    forestGridDetail.innerHTML = '';
    Object.assign(forestGridDetail.style, {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '10px',
        marginTop: '10px'
    });

    // 4. Render the miniature trees
    forest.garden.forEach((tree) => {
        const treeEl = document.createElement('div');
        treeEl.style.cssText = `
            background: white; 
            border-radius: 12px;
            padding: 10px 5px;
            text-align: center;
            border: 1px solid rgba(0,0,0,0.03);
            box-shadow: 0 2px 5px rgba(0,0,0,0.02);
        `;

        const emoji = tree.status === 'alive' ? '🌳' : '🪾';
        treeEl.innerHTML = `
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

// Close user profile modal when clicking outside
document.getElementById('userProfileModal').onclick = (e) => {
    if (e.target.id === 'userProfileModal') closeUserProfile();
};

function renderAll() {
    renderGardenAll();
    renderStats();
    renderHistory();
    renderLeaderboard();
}

// Update welcome animation to show username
window.addEventListener('load', () => {
    const line1 = document.getElementById('line1');
    if (line1) {
        line1.textContent = `Welcome back, ${state.username}`;
    }
});

// Initialize everything
loadState();
renderAll();
renderPresets();
setTimerMinutes(25);
runWelcomeAnimation();

// Auto-save every 20 seconds
setInterval(saveState, 20000);

// Add this at the bottom of your script to fix existing data
// One-time fix for existing data
state.forests.forEach(f => {
    const aliveCount = f.garden.filter(t => t.status === 'alive').length;
    // Only mark complete if it actually reached its target size
    if (aliveCount >= f.treeCount && f.treeCount > 0) {
        f.isComplete = true;
    }
});
saveState();
renderAll();