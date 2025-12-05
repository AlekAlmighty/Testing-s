// Firebase initialization and user data fetching
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyACafoJ0E-rJGv0Qz0F5C879ggI8CRSQ3A",
  authDomain: "breathe-green-7cc38.firebaseapp.com",
  projectId: "breathe-green-7cc38",
  storageBucket: "breathe-green-7cc38.firebasestorage.app",
  messagingSenderId: "219050855571",
  appId: "1:219050855571:web:5a418b7b9982baa806d166",
  measurementId: "G-4CZ35QJLJ1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Check auth state and fetch user profile data
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = '../../index.html';
    return;
  }

  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log('User profile data:', userData);
      
      // Store globally so updateMoneyTab, updateEnvironmentTab, updateMilestonesTab can use it
      window.userProfileData = userData;
      // Notify other parts of the app that profile data is available
      try { window.dispatchEvent(new Event('userProfileDataUpdated')); } catch (e) { /* ignore */ }

      // Calculate and display profile data - increments by 1 day each day based on quit date
      if (userData.quitDate) {
        const quitDateObj = new Date(userData.quitDate);
        
        // Set time to start of day for accurate calculation
        quitDateObj.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Calculate days (increments by 1 each day) - ensure never negative
        let daysSmokeFree = Math.floor((today - quitDateObj) / (1000 * 60 * 60 * 24));
        daysSmokeFree = Math.max(0, daysSmokeFree);  // Don't show negative days
        
        const streakEl = document.getElementById("streak-days");
        if (streakEl) streakEl.textContent = daysSmokeFree + " Days";

        // Calculate money saved - based on daily cost from profile (never negative)
        const dailyCost = Math.max(0, userData.costs || 0);
        const moneySaved = Math.max(0, daysSmokeFree * dailyCost);
        const moneyEl = document.getElementById("money-saved");
        if (moneyEl) moneyEl.textContent = "₱" + moneySaved.toLocaleString();

        // Calculate cigarettes not smoked - based on cigs/day from profile (never negative)
        const cigsPerDay = Math.max(0, userData.cigs || 0);
        const cigsAvoided = Math.max(0, daysSmokeFree * cigsPerDay);
        const cigEl = document.getElementById("cigarettes-avoided");
        if (cigEl) cigEl.textContent = cigsAvoided;

        // Update money saved header with accurate data
        const moneyHeaderEl = document.querySelector(".money-header h1");
        if (moneyHeaderEl) moneyHeaderEl.textContent = "₱" + moneySaved.toLocaleString() + " Saved";

        const sinceEl = document.querySelector(".money-header p");
        if (sinceEl) sinceEl.textContent = "Since you quit on " + quitDateObj.toLocaleDateString();
      }

      // Display reasons in the notepad
      if (userData.reasons) {
        const reasonText = document.getElementById("reason-text");
        if (reasonText) reasonText.value = userData.reasons;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch user profile:', err);
  }
});

document.addEventListener("DOMContentLoaded", () => {

  // === DEBUG SECTION FUNCTIONALITY ===
  const debugInput = document.getElementById("debug-days-input");
  const debugApplyBtn = document.getElementById("debug-apply-btn");
  const debugMoneyEl = document.getElementById("debug-money");
  const debugCigsEl = document.getElementById("debug-cigs");
  const debugStreakEl = document.getElementById("debug-streak");
  const debugCo2El = document.getElementById("debug-co2");
  const debugProfileInfo = document.getElementById("debug-profile-info");

  console.log("Debug elements loaded:", { debugInput, debugApplyBtn, debugMoneyEl });

  function updateDebugDisplay() {
    const userData = window.userProfileData || {};
    const inputDays = parseInt(debugInput.value) || 0;
    const dailyCost = Math.max(0, userData.costs || 0);
    const cigsPerDay = Math.max(0, userData.cigs || 0);
    const co2PerCigarette = 0.014;

    // Calculate values based on input days
    const moneySaved = Math.max(0, inputDays * dailyCost);
    const cigsAvoided = Math.max(0, inputDays * cigsPerDay);
    const co2Prevented = cigsAvoided * co2PerCigarette;

    // Update display
    if (debugMoneyEl) debugMoneyEl.textContent = "₱" + moneySaved.toLocaleString();
    if (debugCigsEl) debugCigsEl.textContent = cigsAvoided;
    if (debugStreakEl) debugStreakEl.textContent = inputDays + " Days";
    if (debugCo2El) debugCo2El.textContent = co2Prevented.toFixed(2) + " kg";

    // Update profile info display
    if (debugProfileInfo) {
      debugProfileInfo.innerHTML = `
        <li><strong>Days Input:</strong> ${inputDays}</li>
        <li><strong>Daily Cost (₱):</strong> ${dailyCost}</li>
        <li><strong>Cigs/Day:</strong> ${cigsPerDay}</li>
        <li><strong>CO₂ per Cig:</strong> ${co2PerCigarette} kg</li>
        <li><strong>Quit Date:</strong> ${userData.quitDate ? new Date(userData.quitDate).toLocaleDateString() : 'N/A'}</li>
      `;
    }
    console.log("Debug display updated:", { inputDays, moneySaved, cigsAvoided, co2Prevented });
  }

  // Apply button click
  if (debugApplyBtn) {
    debugApplyBtn.addEventListener("click", () => {
      console.log("Apply button clicked");
      updateDebugDisplay();
    });
  }

  // Sample button clicks
  const sampleButtons = document.querySelectorAll(".debug-sample-btn");
  console.log("Sample buttons found:", sampleButtons.length);
  sampleButtons.forEach(btn => {
    btn.addEventListener("click", (e) => {
      const days = e.target.getAttribute("data-days");
      console.log("Sample button clicked:", days);
      if (debugInput) {
        debugInput.value = days;
        updateDebugDisplay();
      }
    });
  });

  // Allow Enter key to apply
  if (debugInput) {
    debugInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        console.log("Enter key pressed");
        updateDebugDisplay();
      }
    });

    // Live update as user types
    debugInput.addEventListener("input", updateDebugDisplay);
  }

  // Initialize debug display on page load
  setTimeout(() => {
    if (window.userProfileData) {
      if (debugInput) debugInput.value = 0;
      updateDebugDisplay();
      console.log("Debug section initialized");
    } else {
      console.log("User profile data not yet loaded");
    }
  }, 500);

  // Progress panel elements (floating, bottom-left)
  const progressToggle = document.getElementById('progress-toggle');
  const progressPanel = document.getElementById('progress-panel');
  const progressClose = document.getElementById('progress-close');
  const panelStreak = document.getElementById('panel-streak');
  const panelMoney = document.getElementById('panel-money');
  const panelCigs = document.getElementById('panel-cigs');
  const panelGoalBar = document.getElementById('panel-goal-bar');
  const panelGoalText = document.getElementById('panel-goal-text');

  function computeAndShowProgress() {
    const userData = window.userProfileData || {};
    const quitDate = userData.quitDate ? new Date(userData.quitDate) : new Date();
    quitDate.setHours(0,0,0,0);
    const today = new Date(); today.setHours(0,0,0,0);
    let daysQuit = Math.floor((today - quitDate) / (1000*60*60*24));
    daysQuit = Math.max(0, daysQuit);
    const dailyCost = Math.max(0, userData.costs || 0);
    const cigsPerDay = Math.max(0, userData.cigs || 0);
    const totalSaved = daysQuit * dailyCost;
    const totalCigs = daysQuit * cigsPerDay;

    if (panelStreak) panelStreak.textContent = daysQuit + ' Days';
    if (panelMoney) panelMoney.textContent = '₱' + totalSaved.toLocaleString();
    if (panelCigs) panelCigs.textContent = totalCigs;

    const goal = parseInt(localStorage.getItem('userGoal')) || 7000;
    const progressPct = goal === 0 ? 100 : Math.min(100, Math.round((totalSaved / goal) * 100));
    if (panelGoalBar) panelGoalBar.style.width = progressPct + '%';
    if (panelGoalText) panelGoalText.textContent = `₱${totalSaved.toLocaleString()} of ₱${goal.toLocaleString()}`;
  }

  function openProgressPanel() {
    if (!progressPanel) return;
    progressPanel.classList.add('open');
    progressPanel.setAttribute('aria-hidden','false');
    if (progressToggle) progressToggle.setAttribute('aria-expanded','true');
    computeAndShowProgress();
  }

  function closeProgressPanel() {
    if (!progressPanel) return;
    progressPanel.classList.remove('open');
    progressPanel.setAttribute('aria-hidden','true');
    if (progressToggle) progressToggle.setAttribute('aria-expanded','false');
  }

  if (progressToggle) {
    progressToggle.addEventListener('click', () => {
      if (progressPanel && progressPanel.classList.contains('open')) closeProgressPanel(); else openProgressPanel();
    });
  }
  if (progressClose) progressClose.addEventListener('click', closeProgressPanel);

  // Close when clicking outside
  document.addEventListener('click', (ev) => {
    const t = ev.target;
    if (!progressPanel || !progressToggle) return;
    if (progressPanel.classList.contains('open') && !progressPanel.contains(t) && !progressToggle.contains(t)) {
      closeProgressPanel();
    }
  });

  // Recompute when profile data becomes available
  window.addEventListener('userProfileDataUpdated', computeAndShowProgress);

  const links = document.querySelectorAll(".nav-links a");
  const sections = document.querySelectorAll(".content-section");

  links.forEach(link => {
    link.addEventListener("click", async (e) => {
      e.preventDefault();
      links.forEach(l => l.classList.remove("active"));
      sections.forEach(s => {
        s.classList.remove("active");
        if (s.id === "stories") s.style.display = "none";
      });

      link.classList.add("active");
      const target = link.dataset.target;
      if (target === "stories") {
        const storiesSection = document.getElementById("stories");
        if (!storiesSection) return;
        if (storiesSection.querySelector('#posts-container') || storiesSection.querySelector('#post-form')) {
          storiesSection.classList.add("active");
          storiesSection.style.display = "block";
        } else {
          try {
            const res = await fetch("stories.html");
            const text = await res.text();
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = text;
            const mainContent = tempDiv.querySelector("main");
            storiesSection.innerHTML = mainContent ? mainContent.innerHTML : "<p>Could not load stories.</p>";
          } catch {
            storiesSection.innerHTML = "<p>Could not load stories.</p>";
          }
          storiesSection.classList.add("active");
          storiesSection.style.display = "block";
        }
      } else {
        const tgtEl = document.getElementById(target);
        if (tgtEl) tgtEl.classList.add("active");
      }
    });
  });

  // Note: stat values are now populated from Firestore, not hardcoded here
  // See onAuthStateChanged handler at top of file

  const messages = [
    "STAY STRONG, YOU'RE DOING AMAZING!",
    "EVERY DAY SMOKE-FREE IS A VICTORY.",
    "YOUR LUNGS THANK YOU TODAY.",
    "KEEP GOING, YOUR FUTURE SELF IS PROUD.",
    "BREATHE DEEP, LIVE FREE."
  ];
  const motEl = document.getElementById("daily-motivation");
  if (motEl) motEl.textContent = messages[Math.floor(Math.random() * messages.length)];

  // Add click handlers to redirect cards
  const moneySavedCard = document.getElementById("money-saved-container");
  if (moneySavedCard) {
    moneySavedCard.style.cursor = "pointer";
    moneySavedCard.addEventListener("click", () => {
      document.querySelectorAll(".nav-links a").forEach(l => l.classList.remove("active"));
      document.querySelectorAll(".content-section").forEach(s => s.classList.remove("active"));
      document.querySelector("[data-target='money']").classList.add("active");
      document.getElementById("money").classList.add("active");
    });
  }

  const streakCard = document.getElementById("streak-container");
  if (streakCard) {
    streakCard.style.cursor = "pointer";
    streakCard.addEventListener("click", () => {
      document.querySelectorAll(".nav-links a").forEach(l => l.classList.remove("active"));
      document.querySelectorAll(".content-section").forEach(s => s.classList.remove("active"));
      document.querySelector("[data-target='milestones']").classList.add("active");
      document.getElementById("milestones").classList.add("active");
    });
  }

  const cigsCard = document.getElementById("cigs-container");
  if (cigsCard) {
    cigsCard.style.cursor = "pointer";
    cigsCard.addEventListener("click", () => {
      document.querySelectorAll(".nav-links a").forEach(l => l.classList.remove("active"));
      document.querySelectorAll(".content-section").forEach(s => s.classList.remove("active"));
      document.querySelector("[data-target='environment']").classList.add("active");
      document.getElementById("environment").classList.add("active");
    });
  }


  const reasonsList = document.getElementById("reasons-list");
  const reasonText = document.getElementById("reason-text");

  function loadReasons() {
    const reasonsList = document.getElementById("reasons-list");
    const saved = JSON.parse(localStorage.getItem("quittingReasons") || "[]");
    console.log("Loading reasons:", saved);
    reasonsList.innerHTML = "";
    saved.forEach(reason => {
      const li = document.createElement("li");
      const span = document.createElement("span");
      span.textContent = reason;
      li.appendChild(span);
      const del = document.createElement("button");
      del.textContent = "×";
      del.className = "delete-reason";
      del.dataset.reason = reason;
      li.appendChild(del);
      reasonsList.appendChild(li);
    });
  }

  function saveReason(reason) {
    if (!reason.trim()) return;
    const saved = JSON.parse(localStorage.getItem("quittingReasons") || "[]");
    saved.push(reason.trim());
    console.log("Saving reasons:", saved); // 👈 add this
    localStorage.setItem("quittingReasons", JSON.stringify(saved));
    reasonText.value = "";
    loadReasons();
  }

  function deleteReason(reason) {
    let savedReasons = JSON.parse(localStorage.getItem("quittingReasons") || "[]");
    savedReasons = savedReasons.filter((r) => r !== reason);
    localStorage.setItem("quittingReasons", JSON.stringify(savedReasons));
    loadReasons();
  }

  document.addEventListener("click", (e) => {
    const el = e.target;

    if (el.matches("#add-reason")) {
      saveReason(reasonText.value);
    }

    if (el.matches(".delete-reason")) {
      const reason = el.getAttribute("data-reason");
      deleteReason(reason);
    }
  });


  const helpSection = document.getElementById("help");
  const breathingCard = document.getElementById("breathing-card");

  if (breathingCard) {
    const INHALE = 4000;
    const HOLD = 2000;
    const EXHALE = 4000;
    const TOTAL = INHALE + HOLD + EXHALE;

    let breathingInterval = null;
    let breathingTimeouts = [];
    let breathingActive = false;
    const defaultBreathingHTML = breathingCard.innerHTML;

    function startBreathing() {
      if (breathingActive) return;
      breathingActive = true;
      if (helpSection) helpSection.classList.add("breathing-active");

      breathingCard.innerHTML = `
        <div class="breathing-circle" role="status" aria-live="polite">
          <div class="phase-text">BREATHE IN</div>
        </div>
        <button id="exit-breathing">Exit</button>
      `;

      const circle = breathingCard.querySelector(".breathing-circle");
      const phaseText = circle.querySelector(".phase-text");
      if (circle) circle.style.animationDuration = `${TOTAL}ms`;

      function cycleOnce() {
        phaseText.textContent = "BREATHE IN";
        breathingTimeouts.push(setTimeout(() => phaseText.textContent = "HOLD", INHALE));
        breathingTimeouts.push(setTimeout(() => phaseText.textContent = "BREATHE OUT", INHALE + HOLD));
      }

      cycleOnce();
      breathingInterval = setInterval(cycleOnce, TOTAL);
    }

    function stopBreathing() {
      if (!breathingActive) return;
      breathingActive = false;
      if (breathingInterval) clearInterval(breathingInterval);
      breathingTimeouts.forEach(t => clearTimeout(t));
      breathingTimeouts = [];
      if (helpSection) helpSection.classList.remove("breathing-active");
      breathingCard.innerHTML = defaultBreathingHTML;
    }

    document.addEventListener("click", (ev) => {
      const el = ev.target;
      if (el.matches("#start-breathing")) startBreathing();
      if (el.matches("#exit-breathing")) stopBreathing();
    });

    if (!breathingCard.innerHTML.trim()) breathingCard.innerHTML = defaultBreathingHTML;
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', () => window.location.href = '../../index.html');

  const playMiniBtn = document.getElementById("play-mini-games");
  const gameOverlay = document.getElementById("game-overlay");
  const gameMenu = document.getElementById("game-menu");
  const gameArea = document.getElementById("game-area");
  const gameClose = document.getElementById("game-close");
  const gameCenter = document.querySelector(".game-center");

  function openGameOverlay() {
    if (!gameOverlay) return;
    gameOverlay.setAttribute("aria-hidden", "false");
    gameMenu.hidden = false;
    gameArea.hidden = true;
    gameArea.innerHTML = "";
    if (gameCenter) {
      gameCenter.classList.add("menu-mode");
      gameCenter.classList.remove("game-mode");
    }
  }

  function closeGameOverlay() {
    if (!gameOverlay) return;
    gameOverlay.setAttribute("aria-hidden", "true");
    teardownReflex();
    teardownClickSpeed();
    teardownMemory();
    gameArea.innerHTML = "";
  }

  if (playMiniBtn) playMiniBtn.addEventListener("click", openGameOverlay);
  if (gameClose) gameClose.addEventListener("click", closeGameOverlay);

  document.addEventListener("click", (ev) => {
    const el = ev.target;
    if (el.matches(".game-select")) {
      const game = el.dataset.game;
      if (!game) return;
      gameMenu.hidden = true;
      gameArea.hidden = false;
      gameArea.dataset.currentGame = game;
      if (gameCenter) {
        gameCenter.classList.remove("menu-mode");
        gameCenter.classList.add("game-mode");
      }
      if (game === "reflex") launchReflexGame();
      if (game === "clickspeed") launchClickSpeedGame();
      if (game === "memory") launchMemoryGame();
    }
    if (el.matches(".game-back")) {
      teardownReflex();
      teardownClickSpeed();
      teardownMemory();
      gameArea.innerHTML = "";
      gameMenu.hidden = false;
      gameArea.hidden = true;
      if (gameCenter) {
        gameCenter.classList.add("menu-mode");
        gameCenter.classList.remove("game-mode");
      }
    }
    if (el.matches(".game-try-again")) {
      const currentGame = gameArea.dataset.currentGame;
      if (currentGame === "reflex") launchReflexGame();
      if (currentGame === "clickspeed") launchClickSpeedGame();
      if (currentGame === "memory") launchMemoryGame();
    }
  });

  let reflexStartTime = null;
  let reflexActiveListener = null;

  function launchReflexGame() {
    teardownReflex();
    gameArea.innerHTML = `
      <div class="game-inner">
        <div class="game-hint">Click the circle as fast as you can when it appears.</div>
        <div style="display:flex; justify-content:center; margin-top:8px;">
          <div id="reflex-well" style="min-height:160px; display:flex; align-items:center; justify-content:center;"></div>
        </div>
        <div class="reflex-info" id="reflex-result">Press Start to begin.</div>
        <div class="game-controls">
          <button class="game-back">Back</button>
          <button id="reflex-start" class="game-select" style="min-width:110px;">Start</button>
        </div>
      </div>
    `;

    const startBtn = document.getElementById("reflex-start");
    const well = document.getElementById("reflex-well");
    const result = document.getElementById("reflex-result");

    let timeoutId = null;
    startBtn.addEventListener("click", () => {
      startBtn.disabled = true;
      result.textContent = "Wait for the circle...";
      well.innerHTML = "";
      const delay = Math.random() * 3000 + 1200;
      timeoutId = setTimeout(() => {
        const circle = document.createElement("div");
        circle.className = "reflex-target";
        circle.tabIndex = 0;
        circle.setAttribute("role", "button");
        well.appendChild(circle);
        reflexStartTime = performance.now();
        reflexActiveListener = (ev) => {
          const end = performance.now();
          const reaction = ((end - reflexStartTime) / 1000).toFixed(3);
          result.innerHTML = `Your reaction time: <strong>${reaction}s</strong>`;
          startBtn.disabled = false;
          circle.remove();
          startBtn.textContent = "Try Again";
        };
        circle.addEventListener("click", reflexActiveListener, { once: true });
        circle.addEventListener("keydown", (k) => {
          if (k.key === "Enter" || k.key === " ") circle.click();
        });
      }, delay);
    });

    function cleanup() {
      if (timeoutId) clearTimeout(timeoutId);
      reflexStartTime = null;
      reflexActiveListener = null;
    }

    launchReflexGame.cleanup = cleanup;
  }

  function teardownReflex() {
    if (launchReflexGame && typeof launchReflexGame.cleanup === "function") {
      try { launchReflexGame.cleanup(); } catch {}
    }
  }

  let clickCount = 0;
  let clickTimer = null;

function launchClickSpeedGame() {
  teardownClickSpeed();
  gameArea.innerHTML = `
    <div class="game-inner">
      <div class="game-hint">
        Click the big button as many times as you can in <strong>5 seconds</strong>.
      </div>

      <div class="clickspeed-area">
        <button id="click-btn" class="clickspeed-btn">CLICK</button>
        <div id="click-timer" style="font-weight:700; color:#345c39;">Ready</div>
      </div>

      <div id="click-results" class="clickspeed-stats" 
           style="margin-top:20px; font-weight:700; color:#234d2f;">
        Clicks: 0
      </div>
        <div class="game-controls">
<button class="game-back">Back</button>
<button class="game-try-again try-again-green" style="min-width:110px;">Try Again</button>

        </div>
    </div>
  `;

  let clickCount = 0;
  let clickTimer = null;
  let running = false;

  const btn = document.getElementById("click-btn");
  const timerEl = document.getElementById("click-timer");
  const resultsEl = document.getElementById("click-results");

  btn.addEventListener("click", () => {
    if (!running) {
      running = true;
      clickCount = 1;
      resultsEl.textContent = `Clicks: ${clickCount}`;
      timerEl.textContent = `Time: 5s`;
      let remaining = 5;

      clickTimer = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          clearInterval(clickTimer);
          running = false;

          const cps = (clickCount / 5).toFixed(2);
          resultsEl.innerHTML = `
            Total Clicks: <strong>${clickCount}</strong><br>
            Clicks per Second: <strong style="color:green;">${cps} CPS</strong>
          `;

          timerEl.textContent = `Finished`;
          btn.disabled = true;
        } else {
          timerEl.textContent = `Time: ${remaining}s`;
        }
      }, 1000);
    } else {
      clickCount += 1;
      resultsEl.textContent = `Clicks: ${clickCount}`;
    }
  }, { passive: true });

  launchClickSpeedGame.cleanup = () => {
    if (clickTimer) clearInterval(clickTimer);
    clickTimer = null;
  };
}

  function teardownClickSpeed() {
    if (launchClickSpeedGame && typeof launchClickSpeedGame.cleanup === "function") {
      try { launchClickSpeedGame.cleanup(); } catch {}
    }
  }

  let memoryState = null;

  function launchMemoryGame() {
    teardownMemory();
    const emojis = ["🍃","🌱","🌿","🌸","🍀","🌼","🌻","🌹"];
    const pairs = emojis.concat(emojis);
    for (let i = pairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
    }

    gameArea.innerHTML = `
      <div class="game-inner">
        <div class="game-hint">Find matching pairs — flip two cards at a time.</div>
        <div class="memory-grid" id="memory-grid"></div>
        <div style="text-align:center; margin-top:14px;">
          <div id="memory-messages" style="font-weight:700; color:#234d2f;">Matches: 0</div>
        </div>
          <div class="game-controls">
            <button class="game-back">Back</button>
            <button class="game-try-again try-again-green" style="min-width:110px;">Try Again</button>
          </div>
        </div>
      </div>
    `;

    const grid = document.getElementById("memory-grid");
    const msg = document.getElementById("memory-messages");
    let firstCard = null;
    let lock = false;
    let matches = 0;
    pairs.forEach((emoji, idx) => {
      const card = document.createElement("div");
      card.className = "memory-card";
      card.dataset.index = idx;
      card.dataset.emoji = emoji;
      card.innerHTML = `<span class="card-face" aria-hidden="true">?</span>`;
      grid.appendChild(card);

      card.addEventListener("click", () => {
        if (lock || card.classList.contains("flipped")) return;
        flipCard(card);
      });
    });

    function flipCard(card) {
      if (lock) return;
      card.classList.add("flipped");
      card.innerHTML = `<span style="font-size:34px;">${card.dataset.emoji}</span>`;
      if (!firstCard) {
        firstCard = card;
        return;
      }
      if (firstCard.dataset.emoji === card.dataset.emoji) {
        matches += 1;
        msg.textContent = `Matches: ${matches}`;
        firstCard = null;
        if (matches === pairs.length / 2) msg.textContent = `You matched all pairs! 🎉`;
      } else {
        lock = true;
        setTimeout(() => {
          firstCard.classList.remove("flipped");
          firstCard.innerHTML = `<span class="card-face">?</span>`;
          card.classList.remove("flipped");
          card.innerHTML = `<span class="card-face">?</span>`;
          firstCard = null;
          lock = false;
        }, 800);
      }
    }

    launchMemoryGame.cleanup = () => { memoryState = null; };
  }

  function teardownMemory() {
    if (launchMemoryGame && typeof launchMemoryGame.cleanup === "function") {
      try { launchMemoryGame.cleanup(); } catch {}
    }
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const a = gameOverlay && gameOverlay.getAttribute("aria-hidden");
      if (a === "false") closeGameOverlay();
      }
});

const openNotepadBtn = document.getElementById("open-notepad");
const notepadOverlay = document.getElementById("notepad-overlay");
const closeNotepadBtn = document.getElementById("close-notepad");

if (openNotepadBtn && notepadOverlay) {
  openNotepadBtn.addEventListener("click", () => {
    notepadOverlay.style.display = "flex";
    notepadOverlay.setAttribute("aria-hidden", "false");
    loadReasons();
  });
}

if (closeNotepadBtn) {
  closeNotepadBtn.addEventListener("click", () => {
    notepadOverlay.style.display = "none";
    notepadOverlay.setAttribute("aria-hidden", "true");
  });
}

function updateMoneyTab() {
  // Get actual user data from dashboard (populated from Firestore at top)
  const userData = window.userProfileData || {};
  const quitDate = userData.quitDate ? new Date(userData.quitDate) : new Date();
  quitDate.setHours(0, 0, 0, 0);
  const dailyCost = Math.max(0, userData.costs || 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let daysQuit = Math.floor((today - quitDate) / (1000 * 60 * 60 * 24));
  daysQuit = Math.max(0, daysQuit);  // Ensure non-negative
  const totalSaved = Math.max(0, daysQuit * dailyCost);
  const weekly = dailyCost * 7;
  const monthly = dailyCost * 30;

  let goalAmount = parseInt(localStorage.getItem("userGoal")) || 7000;
  const progress = Math.min((totalSaved / goalAmount) * 100, 100);

  document.querySelector("#money .money-header h1").textContent = `₱${totalSaved.toLocaleString()} Saved`;
  document.querySelector("#money .money-header p").textContent = `Since you quit on ${quitDate.toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}`;

  document.querySelectorAll("#money .savings-card p")[0].textContent = `₱${dailyCost}`;
  document.querySelectorAll("#money .savings-card p")[1].textContent = `₱${weekly}`;
  document.querySelectorAll("#money .savings-card p")[2].textContent = `₱${monthly}`;

  const goalBar = document.querySelector("#money .goal-progress");
  const goalText = document.querySelector("#money .goal-progress-text");
  const goalInput = document.getElementById("editable-goal");

  if (goalBar) goalBar.style.width = progress + "%";
  if (goalText) goalText.textContent = `₱${totalSaved.toLocaleString()} of ₱${goalAmount.toLocaleString()} reached`;
  if (goalInput) goalInput.textContent = goalAmount;

if (goalInput) {
  goalInput.addEventListener("blur", () => {
    let newGoal = parseInt(goalInput.textContent.replace(/[^\d]/g, "")) || goalAmount;
    localStorage.setItem("userGoal", newGoal);
    updateMoneyTab();
  });

  goalInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      goalInput.blur();
    }
  });
}

  drawSavingsChart(daysQuit, dailyCost);
}

function drawSavingsChart(days, dailyCost) {
  const ctx = document.getElementById("savingsChart");
  if (!ctx) return;

  if (window.moneyChart) window.moneyChart.destroy();

  const labels = [];
  const dataPoints = [];
  let total = 0;
  
  // Generate chart data incrementing by 1 day, based on actual daily cost from profile
  for (let i = 0; i <= days; i++) {
    total += dailyCost;
    if (i % 2 === 0 || i === days) {  // Show every 2 days + final day
      labels.push(`Day ${i}`);
      dataPoints.push(total);
    }
  }

  window.moneyChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Money Saved (₱)",
          data: dataPoints,
          borderColor: "#27ae60",
          backgroundColor: "rgba(39,174,96,0.2)",
          fill: true,
          tension: 0.3,
        },
      ],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
    },
  });
}

document.querySelectorAll(".nav-links a").forEach(link => {
  link.addEventListener("click", () => {
    const target = link.getAttribute("data-target");
    if (target === "money") {
      setTimeout(updateMoneyTab, 200);
    }
  });
});

function updateMilestonesTab() {
  const userData = window.userProfileData || {};
  const quitDate = userData.quitDate ? new Date(userData.quitDate) : new Date();
  quitDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dailyCost = Math.max(0, userData.costs || 0);
  let daysQuit = Math.floor((today - quitDate) / (1000 * 60 * 60 * 24));
  daysQuit = Math.max(0, daysQuit);  // Ensure non-negative
  const totalSaved = Math.max(0, daysQuit * dailyCost);

  const daysEl = document.getElementById("milestone-days");
  const summaryEl = document.getElementById("milestone-summary");
  if (daysEl && summaryEl) {
    daysEl.textContent = `${daysQuit} Days Smoke-Free`;
    const nextGoal = daysQuit < 30 ? "1 Month" :
                     daysQuit < 90 ? "3 Months" :
                     daysQuit < 180 ? "6 Months" : "1 Year";
    summaryEl.textContent = `You're doing amazing! Next goal: ${nextGoal}.`;
  }

  const timeline = [
    { label: "Day 1 – You began your journey", days: 1 },
    { label: "3 Days – Nicotine left your system", days: 3 },
    { label: "1 Week – Improved breathing", days: 7 },
    { label: "1 Month – Energy levels rise", days: 30 },
    { label: "3 Months – Lung function improves", days: 90 },
    { label: "6 Months – Coughing reduced", days: 180 },
    { label: "1 Year – Heart disease risk drops 50%", days: 365 }
  ];
  const timelineEl = document.getElementById("milestone-timeline");
  if (timelineEl) {
    timelineEl.innerHTML = "";
    timeline.forEach(item => {
      const li = document.createElement("li");
      li.textContent = item.label;
      if (daysQuit >= item.days) li.classList.add("reached");
      timelineEl.appendChild(li);
    });
  }

  const finMilestones = [
    { amount: 1000, label: "Treat yourself to a nice dinner 🍽️" },
    { amount: 5000, label: "Buy a new pair of shoes 👟" },
    { amount: 10000, label: "Weekend getaway 🌴" }
  ];
  const finEl = document.getElementById("milestone-financial");
  if (finEl) {
    finEl.innerHTML = "";
    finMilestones.forEach(item => {
      const li = document.createElement("li");
      li.textContent = `₱${item.amount.toLocaleString()} – ${item.label}`;
      if (totalSaved >= item.amount) li.classList.add("reached");
      finEl.appendChild(li);
    });
  }

  const healthMilestones = [
    { time: "20 minutes", benefit: "Heart rate returns to normal" },
    { time: "12 hours", benefit: "Carbon monoxide drops to normal" },
    { time: "2 weeks", benefit: "Circulation improves" },
    { time: "3 months", benefit: "Lung capacity rises" },
    { time: "1 year", benefit: "Heart attack risk drops 50%" }
  ];
  const healthBody = document.getElementById("milestone-health-body");
  if (healthBody) {
    healthBody.innerHTML = "";
    healthMilestones.forEach((h, i) => {
      const tr = document.createElement("tr");
      if (i <= timeline.filter(t => daysQuit >= t.days).length) tr.classList.add("reached");
      tr.innerHTML = `<td>${h.time}</td><td>${h.benefit}</td>`;
      healthBody.appendChild(tr);
    });
  }
}

document.querySelectorAll(".nav-links a").forEach(link => {
  link.addEventListener("click", () => {
    const target = link.getAttribute("data-target");
    if (target === "milestones") {
      setTimeout(updateMilestonesTab, 200);
    }
  });
});

function updateEnvironmentTab() {
  const userData = window.userProfileData || {};
  const cigarettesPerDay = Math.max(0, userData.cigs || 0);
  const co2PerCigarette = 0.014;
  const quitDate = userData.quitDate ? new Date(userData.quitDate) : new Date();
  quitDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let daysQuit = Math.floor((today - quitDate) / (1000 * 60 * 60 * 24));
  daysQuit = Math.max(0, daysQuit);  // Ensure non-negative

  const totalCigs = daysQuit * cigarettesPerDay;
  const co2Prevented = totalCigs * co2PerCigarette;
  const treesSaved = Math.floor(co2Prevented / 21);
  const toxinsAvoided = totalCigs * 7;

  document.getElementById("co2-prevented").textContent = `${co2Prevented.toFixed(2)} kg`;
  document.getElementById("trees-saved").textContent = treesSaved;
  document.getElementById("toxins-avoided").textContent = toxinsAvoided.toLocaleString();

  const ecoGoal = parseFloat(document.getElementById("ecoGoal").value) || 100;
  const progress = Math.min((co2Prevented / ecoGoal) * 100, 100);
  document.getElementById("ecoGoalProgress").style.width = `${progress}%`;
  document.getElementById("ecoGoalText").textContent = `${co2Prevented.toFixed(2)} of ${ecoGoal} kg prevented`;

  drawEnvironmentChart(daysQuit, cigarettesPerDay, co2PerCigarette);
}

function drawEnvironmentChart(days, cigsPerDay, co2PerCig) {
  const ctx = document.getElementById("environmentChart");
  if (!ctx) return;

if (window.environmentChart instanceof Chart) {
  window.environmentChart.destroy();
}

  const labels = [];
  const dataPoints = [];
  let total = 0;
  
  // Generate chart data incrementing by 1 day, based on actual cigs/day from profile
  for (let i = 0; i <= days; i++) {
    total += cigsPerDay * co2PerCig;
    if (i % 2 === 0 || i === days) {  // Show every 2 days + final day
      labels.push(`Day ${i + 1}`);
      dataPoints.push(parseFloat(total.toFixed(3)));
    }
  }

  window.environmentChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: "CO₂ Saved (kg)",
        data: dataPoints,
        borderColor: "#00ff66",
        backgroundColor: "rgba(0, 255, 102, 0.2)",
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      scales: { y: { beginAtZero: true } },
      plugins: { legend: { display: false } }
    }
  });
}
console.log("Chart created:", window.environmentChart);

document.querySelectorAll(".nav-links a").forEach(link => {
  link.addEventListener("click", () => {
    const target = link.getAttribute("data-target");
    if (target === "environment") {
      console.log("Environment tab clicked");
      setTimeout(updateEnvironmentTab, 300);
    }
  });
});

document.addEventListener("input", (e) => {
  if (e.target.id === "ecoGoal") updateEnvironmentTab();
});
document.addEventListener("keydown", (e) => {
  const active = document.activeElement;
  if (active && active.id === "ecoGoal" && e.key === "Enter") {
    e.preventDefault();
    e.stopImmediatePropagation();
    updateEnvironmentTab();
    const y = window.scrollY;
    requestAnimationFrame(() => {
      active.blur();
      window.scrollTo(0, y);
    });

    return false;
  }
});

const ecoGoalInput = document.getElementById("ecoGoal");

if (ecoGoalInput) {
  ecoGoalInput.addEventListener("focus", () => {
    ecoGoalInput.dataset.scrollY = window.scrollY;
  });

  ecoGoalInput.addEventListener("keydown", (e) => {
    const y = parseInt(ecoGoalInput.dataset.scrollY || window.scrollY);
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopImmediatePropagation();
      updateEnvironmentTab();
      ecoGoalInput.blur();
      window.scrollTo(0, y);
      return false;
    }
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      e.stopImmediatePropagation();
      const step = parseFloat(ecoGoalInput.step) || 1;
      const current = parseFloat(ecoGoalInput.value) || 0;
      ecoGoalInput.value = e.key === "ArrowUp" ? current + step : current - step;
      updateEnvironmentTab();
      window.scrollTo(0, y);
    }
  });

  ecoGoalInput.addEventListener("input", () => {
    const y = parseInt(ecoGoalInput.dataset.scrollY || window.scrollY);
    window.scrollTo(0, y);
  });
}

});
