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

let state = {
    garden: [],
    sessions: [],
    totalSeconds: 0,
    streakCount: 0,
    lastPlantDate: null,
    completedForests: [],
    username: "user_" + Math.random().toString(36).substr(2, 6)
};

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

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const loaded = JSON.parse(raw);
            // Merge loaded state with default state to ensure all properties exist
            state = { ...state, ...loaded };
        }

        // Update current user in mockUsers
        const currentUser = mockUsers.find(u => u.userId === "current_user");
        if (currentUser) {
            currentUser.username = state.username;
            currentUser.completedForests = state.completedForests.length;
            currentUser.totalTrees = state.completedForests.reduce((sum, forest) => sum + forest.trees.length, 0);
            currentUser.totalMinutes = state.completedForests.reduce((sum, forest) => sum + forest.totalMinutes, 0);
            currentUser.forests = [...state.completedForests];
        }

        // Fill with wasteland slots up to TOTAL_FOREST_SIZE if needed
        if (state.garden.length < TOTAL_FOREST_SIZE) {
            const currentLen = state.garden.length;
            for (let i = 0; i < (TOTAL_FOREST_SIZE - currentLen); i++) {
                state.garden.push({
                    status: 'dead',
                    createdAt: null,
                    minutes: 0,
                    fullDate: null,
                    growthHeight: 0
                });
            }
        }
    } catch (e) {
        console.warn('load failed', e);
    }
}

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

    const progress = (timerSeconds - timerLeft) / timerSeconds;
    if (progress < 0.25) {
        stageBox.textContent = '🪾';
        stageCaption.textContent = 'Seeking signs of life...';
    } else if (progress < 0.50) {
        stageBox.textContent = '🪵';
        stageCaption.textContent = 'Roots taking hold';
    } else if (progress < 0.75) {
        stageBox.textContent = '🌿';
        stageCaption.textContent = 'Restoration in progress';
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

    // Calculate a fun height (roughly 0.1 to 0.3 feet per minute)
    const growth = (sessionMins * (0.1 + Math.random() * 0.2)).toFixed(1);

    // Find the first dead tree to restore
    const targetIdx = state.garden.findIndex(t => t.status === 'dead');

    const newTreeData = {
        id: Date.now(),
        status: 'alive',
        minutes: sessionMins,
        fullDate: `${dateStr} @ ${timeStr}`,
        growthHeight: growth,
        name: null
    };

    let forestCompleted = false;

    if (targetIdx !== -1) {
        state.garden[targetIdx] = newTreeData;
    } else {
        state.garden.push(newTreeData);
    }

    state.sessions.push({ when: Date.now(), success: true, minutes: sessionMins });
    state.totalSeconds += timerSeconds;

    const todayKey = now.toISOString().slice(0, 10);
    if (state.lastPlantDate !== todayKey) {
        state.lastPlantDate = todayKey;
        state.streakCount = (state.streakCount || 0) + 1;
    }

    // Check if forest is complete
    const aliveCount = state.garden.filter(t => t.status === 'alive').length;
    if (aliveCount >= TOTAL_FOREST_SIZE) {
        forestCompleted = true;
        archiveForest();
    }

    timerLeft = timerSeconds;
    saveState();

    if (forestCompleted) {
        flashForestComplete();
    } else {
        flashCelebration();
    }

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
        startTimer();
    }
});

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
        if (t.status === 'alive') aliveCount++;
    });

    totalTreesLabel.textContent = `${aliveCount} / ${state.garden.length}`;
}

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
        nameInput.disabled = true;
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

// Close modal if clicking background
document.getElementById('treeModal').onclick = (e) => {
    if (e.target.id === 'treeModal') closeModal();
};

function renderStats() {
    const aliveCount = state.garden.filter(t => t.status === 'alive').length;
    statTotalTrees.textContent = aliveCount;
    statTotalMinutes.textContent = Math.round(state.totalSeconds / 60);
    statStreak.textContent = state.streakCount || 0;
}

function renderLeaderboard() {
    const leaderboardList = document.getElementById('leaderboardList');
    const userForestsContainer = document.getElementById('userForests');

    if (!leaderboardList) return;

    // Only show current user (since we removed fake users)
    const sortedUsers = [...mockUsers];

    // Render leaderboard
    leaderboardList.innerHTML = '';
    
    if (sortedUsers.length === 0) {
        leaderboardList.innerHTML = '<div class="small muted" style="padding:20px;text-align:center">No users found. Focus to grow your forest!</div>';
    } else {
        sortedUsers.forEach((user, index) => {
            const isCurrentUser = user.userId === "current_user";
            const item = document.createElement('div');
            item.className = 'leaderboard-item';
            item.dataset.userId = user.userId;

            item.innerHTML = `
                <div class="rank">${index + 1}</div>
                <div class="user-info">
                    <div class="username">${user.username} ${isCurrentUser ? '(You)' : ''}</div>
                    <div class="user-stats">${user.totalTrees} trees • ${user.totalMinutes} min</div>
                </div>
                <div class="forest-count">${user.completedForests} forest${user.completedForests !== 1 ? 's' : ''}</div>
            `;

            item.onclick = () => openUserProfile(user.userId);
            leaderboardList.appendChild(item);
        });
    }

    // Render current user's forests
    const currentUser = mockUsers.find(u => u.userId === "current_user");
    if (currentUser && userForestsContainer) {
        userForestsContainer.innerHTML = '';

        if (currentUser.forests.length === 0) {
            userForestsContainer.innerHTML = '<div class="small muted" style="padding:20px;text-align:center">Complete your first forest to see it here!</div>';
        } else {
            currentUser.forests.forEach((forest, index) => {
                const forestCard = document.createElement('div');
                forestCard.className = 'forest-card';
                forestCard.dataset.forestIndex = index;

                const date = new Date(forest.completedDate);
                const dateStr = date.toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });

                forestCard.innerHTML = `
                    <div class="forest-emoji">🌲</div>
                    <div class="forest-date">Forest #${currentUser.forests.length - index}</div>
                    <div class="forest-stats">${dateStr}</div>
                    <div class="forest-stats">${forest.trees.length} trees</div>
                `;

                forestCard.onclick = () => openUserProfile("current_user", index);
                userForestsContainer.appendChild(forestCard);
            });
        }
    }
}

function openUserProfile(userId, forestIndex = null) {
    const user = mockUsers.find(u => u.userId === userId);
    if (!user) return;

    currentProfileUserId = userId;

    const modal = document.getElementById('userProfileModal');
    const username = document.getElementById('profileUsername');
    const profileStats = document.getElementById('profileStats');
    const profileForests = document.getElementById('profileForests');
    const forestDetailView = document.getElementById('forestDetailView');
    const forestGridDetail = document.getElementById('forestGridDetail');

    // Set basic info
    username.textContent = user.username + (userId === "current_user" ? ' (You)' : '');
    profileStats.textContent = `${user.completedForests} forest${user.completedForests !== 1 ? 's' : ''} • ${user.totalTrees} trees • ${user.totalMinutes} minutes`;

    // Render forests list
    profileForests.innerHTML = '';

    if (user.forests.length === 0) {
        profileForests.innerHTML = '<div class="small muted" style="padding:20px;text-align:center">No forests completed yet.</div>';
    } else {
        user.forests.forEach((forest, index) => {
            const forestCard = document.createElement('div');
            forestCard.className = 'forest-card';
            forestCard.dataset.forestIndex = index;

            const date = new Date(forest.completedDate);
            const dateStr = date.toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });

            forestCard.innerHTML = `
                <div class="forest-emoji">🌲</div>
                <div class="forest-date">Forest #${user.forests.length - index}</div>
                <div class="forest-stats">${dateStr}</div>
                <div class="forest-stats">${forest.trees.length} trees</div>
            `;

            forestCard.onclick = () => showForestDetail(forest, index, user);
            profileForests.appendChild(forestCard);
        });
    }

    // Show forest detail if specified
    if (forestIndex !== null) {
        showForestDetail(user.forests[forestIndex], forestIndex, user);
    } else {
        forestDetailView.style.display = 'none';
        profileForests.style.display = 'grid';
    }

    modal.style.display = 'flex';
}

function showForestDetail(forest, index, user) {
    const forestDetailView = document.getElementById('forestDetailView');
    const forestGridDetail = document.getElementById('forestGridDetail');
    const profileForests = document.getElementById('profileForests');

    // Show detail view, hide list
    forestDetailView.style.display = 'block';
    profileForests.style.display = 'none';

    // Update header
    document.querySelector('#forestDetailView div').innerHTML = `
        <div style="font-weight:800;color:var(--leaf)">Forest #${user.forests.length - index} Details</div>
        <button class="btnGhost" onclick="backToProfile()">← Back</button>
    `;

    // Render forest trees
    forestGridDetail.innerHTML = '';

    forest.trees.forEach((tree, treeIndex) => {
        const treeEl = document.createElement('div');
        treeEl.className = 'gardenItem';

        treeEl.innerHTML = `
            <div style="font-size:32px">🌳</div>
            <div style="font-weight:700;color:var(--leaf);margin-top:4px;font-size:12px">${tree.name || `Tree ${treeIndex + 1}`}</div>
            <div class="tree-info">${tree.minutes}m • ${tree.growthHeight}ft</div>
            ${tree.fullDate ? `<div class="small muted" style="margin-top:2px">${tree.fullDate}</div>` : ''}
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