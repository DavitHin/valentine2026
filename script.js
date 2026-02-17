/* ==========================================
   Security: HTML Sanitization
   ========================================== */
function sanitizeHTML(str) {
    if (typeof str !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function sanitizeAttribute(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[<>"']/g, (char) => {
        const escapeMap = {
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };
        return escapeMap[char] || char;
    });
}

/* ==========================================
   Configuration
   ========================================== */
const CONFIG = {
    valentineDate: "2022-02-14",
    weddingDate: "2025-01-05",
    music: {
        /* HOW TO ADD MUSIC:
         * 1. Create music/music-manifest.json (fastest, zero 404s)
         * 2. OR just drop MP3s in music/romantic/ and music/funny/
         *    and the scanner will find them automatically.
         *
         * music-manifest.json example:
         * {
         *   "romantic": [
         *     { "path": "music/romantic/1.mp3", "title": "A Thousand Years" },
         *     { "path": "music/romantic/2.mp3", "title": "Perfect" }
         *   ],
         *   "funny": [
         *     { "path": "music/funny/1.mp3", "title": "Never Gonna Give You Up" }
         *   ]
         * }
         */
        manifestPath: "music/music-manifest.json",
        fallbackScan: true,          // Scan folders if no manifest
        folders: {
            romantic: "music/romantic/",
            funny: "music/funny/"
        },
        panicSound: "music/panic.mp3",
        scanMaxPerFolder: 20,         // Only probe 1.mp3 - 20.mp3 (not hundreds)
        cacheEnabled: true,
        cacheExpiryHours: 24
    },
    rainItems: ["\uD83C\uDF39", "\uD83C\uDF3B", "\uD83D\uDC90", "\uD83C\uDF38", "\uD83C\uDF3C", "\u2764\uFE0F", "\uD83D\uDC95", "💵", "🍷"],
    loveLetter: `My Dearest Wife,

From the moment we met on Valentine's Day 2022, my life found its purpose.
You are the sunflowers in my garden and the calm in my storm.
Every day with you is a gift I promise to never take for granted.

ពេលខ្លះបងចរិកបងរឺងរូសតែក៏បងបានព្យាយាមសម្របដើម្បីពួកយើង។ One day we will have a proper date.
ស្រលាញ់អូនថ្ងៃនេះ ថ្ងៃស្អែក និងពេញមួយជីវិត។
B order red wine for us already, and sorry today too busy no time to clean house, b will clean tomorrow.

Happy Valentine's Day!`,

    // Media source:
    // - "local": use ./media-manifest.json (recommended for simple hosting)
    // - "drive": load images/videos from a private Google Drive folder (shared users only)
    mediaSource: "drive",
    drive: {
        enabled: true,
        // Create this in Google Cloud Console -> APIs & Services -> Credentials -> OAuth Client ID (Web).
        // This is safe to keep in a public repo (it's not a secret).
        clientId: "981668329881-og8ohi8v3v8prepe7ttkgq2dclqd8j2v.apps.googleusercontent.com",
        // Accepts either a full folder URL or the raw folder ID.
        folderId: "https://drive.google.com/drive/folders/1tS1Ati0zTib-v5UA4DRyWqlIjv5r5Wuc?usp=sharing",
        // Read-only access (keeps it safer). If you later want to upload/write, you'd need a different scope.
        scopes: "https://www.googleapis.com/auth/drive.readonly"
    },
    // Put your deployed Apps Script Web App URL here to capture answers on GitHub Pages.
    // Example: "https://script.google.com/macros/s/AKfycb.../exec"
    answerSink: {
        endpoint: "https://script.google.com/macros/s/AKfycbwfUXY2VOlUIybsxBce6lmMU4sOWU3KlbayuXNIZ-0GNpxZLXRFaLdr16L09S7sJMCcLA/exec",
        mode: "no-cors"
    },
    security: {
        maxFailedAttemptsPerMinute: 10
    },
    appSession: {
        maxDays: 1
    },
    driveSession: {
        maxDays: 7
    },
    mediaQuality: {
        default: "hd",
        imageWidths: {
            hd: 1280,
            fhd: 1920
        },
        blobCacheMaxItems: 10,
        blobCacheMaxMb: 120
    },
    thumbnails: {
        // Gallery thumb max size: balances clarity + low bandwidth.
        driveMaxPx: 512
    }

};

/* ==========================================
   Dom references
   ========================================== */
const verifyCard = document.querySelector(".verify-card");
const errorMsg = document.getElementById("error-msg");
const panicModal = document.getElementById("panic-modal");
const panicCloseBtn = document.getElementById("panic-close");
const appSignOutBtn = document.getElementById("app-signout-btn");
const btnNo = document.getElementById("btn-no");
const btnYes = document.getElementById("btn-yes");
const lightbox = document.getElementById("lightbox");
const lbContainer = document.getElementById("lb-media-container");
const lbPrev = document.getElementById("lb-prev");
const lbNext = document.getElementById("lb-next");
const timerElement = document.getElementById("timer");
const galleryRoot = document.getElementById("gallery-root");
const verifyForm = document.getElementById("verify-form");

const driveAuthBox = document.getElementById("drive-auth");
const driveSignInBtn = document.getElementById("drive-signin-btn");
const driveStatus = document.getElementById("drive-auth-status");
const mediaQualitySelect = document.getElementById("media-quality");


const dateFieldMeta = [
    { id: "valentine-day", len: 2 },
    { id: "valentine-month", len: 2 },
    { id: "valentine-year", len: 4 },
    { id: "wedding-day", len: 2 },
    { id: "wedding-month", len: 2 },
    { id: "wedding-year", len: 4 }
];

const answerFields = [
    ...dateFieldMeta.map((item) => document.getElementById(item.id)),
    document.getElementById("txt-reason"),
    document.getElementById("txt-food")
];
const failedVerifyTimestamps = [];
const VERIFY_FORM_DRAFT_KEY = "valentine_verify_form_draft_v1";
const VERIFY_FORM_DRAFT_MAX_RESTORE = 10;
const APP_AUTH_SESSION_KEY = "valentine_app_auth_session_v1";
const MUSIC_PLAYBACK_STATE_KEY = "valentine_music_playback_state_v1";
const MEDIA_QUALITY_KEY = "valentine_media_quality_v1";
const DRIVE_BLOB_CACHE_NAME = "valentine_drive_blob_cache_v1";
const DRIVE_BLOB_CACHE_META_KEY = "valentine_drive_blob_cache_meta_v1";
const MUSIC_STATE_MAX_AGE_MS = Math.max(30 * 60 * 1000, getAppSessionMaxMs());
const MUSIC_STATE_SAVE_INTERVAL_MS = 2500;

/* ==========================================
   Date input UX (limit + auto move)
   ========================================== */
function setupDateColumnInputs() {
    const dateInputs = dateFieldMeta.map((item) => document.getElementById(item.id));

    dateFieldMeta.forEach((meta, index) => {
        const input = document.getElementById(meta.id);

        input.addEventListener("input", () => {
            const digits = input.value.replace(/\D/g, "").slice(0, meta.len);
            input.value = digits;

            if (digits.length === meta.len && index < dateInputs.length - 1) {
                dateInputs[index + 1].focus();
                dateInputs[index + 1].select();
            }
        });

        input.addEventListener("keydown", (event) => {
            if (event.key === "Backspace" && input.value === "" && index > 0) {
                dateInputs[index - 1].focus();
            }
        });

        input.addEventListener("blur", () => normalizeDateInput(input, meta.len));
    });
}

function normalizeDateInput(input, maxLen) {
    const raw = input.value.trim();
    if (!raw) {
        return;
    }

    const value = Number(raw);
    if (!Number.isFinite(value)) {
        input.value = "";
        return;
    }

    const min = Number(input.dataset.min || "0");
    const max = Number(input.dataset.max || "9999");
    const clamped = Math.min(max, Math.max(min, Math.floor(value)));

    if (maxLen <= 2) {
        input.value = String(clamped).padStart(2, "0");
        return;
    }

    input.value = String(clamped);
}

function formatDateFromColumns(prefix) {
    const dayRaw = document.getElementById(`${prefix}-day`).value.trim();
    const monthRaw = document.getElementById(`${prefix}-month`).value.trim();
    const yearRaw = document.getElementById(`${prefix}-year`).value.trim();

    if (!dayRaw && !monthRaw && !yearRaw) {
        return "";
    }

    if (!dayRaw || !monthRaw || !yearRaw) {
        return null;
    }

    const day = Number(dayRaw);
    const month = Number(monthRaw);
    const year = Number(yearRaw);

    if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) {
        return null;
    }

    const checkDate = new Date(Date.UTC(year, month - 1, day));
    if (
        checkDate.getUTCFullYear() !== year ||
        checkDate.getUTCMonth() + 1 !== month ||
        checkDate.getUTCDate() !== day
    ) {
        return null;
    }

    return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function displayDate(isoDate) {
    if (!isoDate) {
        return "(not provided)";
    }

    const parts = isoDate.split("-");
    if (parts.length !== 3) {
        return isoDate;
    }

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

setupDateColumnInputs();

function readJsonStorage(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) {
            return fallback;
        }
        return JSON.parse(raw);
    } catch (_error) {
        return fallback;
    }
}

function writeJsonStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (_error) {
        // no-op
    }
}

function getSelectedVibeValue() {
    const selected = document.querySelector('input[name="music-vibe"]:checked');
    return selected ? selected.value : "romantic";
}

function saveVerifyFormDraft() {
    const current = readJsonStorage(VERIFY_FORM_DRAFT_KEY, {});
    const payload = {
        ...current,
        valentineDay: document.getElementById("valentine-day").value,
        valentineMonth: document.getElementById("valentine-month").value,
        valentineYear: document.getElementById("valentine-year").value,
        weddingDay: document.getElementById("wedding-day").value,
        weddingMonth: document.getElementById("wedding-month").value,
        weddingYear: document.getElementById("wedding-year").value,
        reason: document.getElementById("txt-reason").value,
        food: document.getElementById("txt-food").value,
        vibe: getSelectedVibeValue(),
        updatedAt: new Date().toISOString()
    };

    writeJsonStorage(VERIFY_FORM_DRAFT_KEY, payload);
}

function restoreVerifyFormDraft() {
    const draft = readJsonStorage(VERIFY_FORM_DRAFT_KEY, null);
    if (!draft || typeof draft !== "object") {
        return;
    }

    const restoreCount = Number(draft.restoreCount || 0);
    if (restoreCount >= VERIFY_FORM_DRAFT_MAX_RESTORE) {
        localStorage.removeItem(VERIFY_FORM_DRAFT_KEY);
        return;
    }

    document.getElementById("valentine-day").value = String(draft.valentineDay || "");
    document.getElementById("valentine-month").value = String(draft.valentineMonth || "");
    document.getElementById("valentine-year").value = String(draft.valentineYear || "");
    document.getElementById("wedding-day").value = String(draft.weddingDay || "");
    document.getElementById("wedding-month").value = String(draft.weddingMonth || "");
    document.getElementById("wedding-year").value = String(draft.weddingYear || "");
    document.getElementById("txt-reason").value = String(draft.reason || "");
    document.getElementById("txt-food").value = String(draft.food || "");

    const vibe = String(draft.vibe || "");
    if (vibe === "funny" || vibe === "romantic") {
        const radio = document.querySelector(`input[name="music-vibe"][value="${vibe}"]`);
        if (radio) {
            radio.checked = true;
        }
    }

    writeJsonStorage(VERIFY_FORM_DRAFT_KEY, {
        ...draft,
        restoreCount: restoreCount + 1
    });
}

function clearVerifyFormDraft() {
    try {
        localStorage.removeItem(VERIFY_FORM_DRAFT_KEY);
    } catch (_error) {
        // no-op
    }
}

function bindVerifyFormDraftListeners() {
    const vibeInputs = Array.from(document.querySelectorAll('input[name="music-vibe"]'));
    const watched = [...answerFields, ...vibeInputs].filter(Boolean);

    watched.forEach((field) => {
        const eventName = field.tagName === "TEXTAREA" ? "input" : "change";
        field.addEventListener(eventName, saveVerifyFormDraft);
        if (eventName !== "input") {
            field.addEventListener("input", saveVerifyFormDraft);
        }
    });

    vibeInputs.forEach((input) => {
        input.addEventListener("change", () => {
            if (input.checked) {
                setSelectedMusicFromVibe(input.value, { allowPlaybackResume: false });
            }
        });
    });
}

/* ==========================================
   Verification + session + submit
   ========================================== */
function setVerifyRequiredFields() {
    answerFields.forEach((field) => {
        field.required = true;
    });
}

function getAppSessionMaxMs() {
    const days = Number(CONFIG?.appSession?.maxDays || 7);
    return Math.max(1, days) * 24 * 60 * 60 * 1000;
}

function loadAppSession() {
    return readJsonStorage(APP_AUTH_SESSION_KEY, null);
}

function normalizeMood(value) {
    const mood = String(value || "").toLowerCase();
    return mood === "funny" ? "funny" : "romantic";
}

function clearMusicPlaybackState() {
    try {
        localStorage.removeItem(MUSIC_PLAYBACK_STATE_KEY);
    } catch (_error) {
        // no-op
    }
}

function readSavedMusicPlaybackState() {
    const saved = readJsonStorage(MUSIC_PLAYBACK_STATE_KEY, null);
    if (!saved || typeof saved !== "object") {
        return null;
    }

    const updatedAt = Number(saved.updatedAt || 0);
    const videoId = String(saved.videoId || "");
    const mood = normalizeMood(saved.mood);
    const index = Number(saved.index);
    const timeSec = Number(saved.timeSec || 0);
    if (!videoId || !Number.isFinite(updatedAt) || updatedAt <= 0) {
        clearMusicPlaybackState();
        return null;
    }

    if ((Date.now() - updatedAt) > MUSIC_STATE_MAX_AGE_MS) {
        clearMusicPlaybackState();
        return null;
    }

    return {
        updatedAt,
        videoId,
        mood,
        index: Number.isInteger(index) && index >= 0 ? index : 0,
        timeSec: Number.isFinite(timeSec) ? Math.max(0, Math.floor(timeSec)) : 0
    };
}

function saveAppSession(stage, moodOverride = "") {
    const now = Date.now();
    const current = loadAppSession() || {};
    const nextMood = normalizeMood(moodOverride || current.mood || selectedMood);
    writeJsonStorage(APP_AUTH_SESSION_KEY, {
        createdAt: Number(current.createdAt || now),
        touchedAt: now,
        stage: stage === "main" ? "main" : "trap",
        mood: nextMood
    });
}

function clearAppSession() {
    try {
        localStorage.removeItem(APP_AUTH_SESSION_KEY);
    } catch (_error) {
        // no-op
    }
}

function isAppSessionValid() {
    const session = loadAppSession();
    if (!session || !session.createdAt) {
        return false;
    }

    return (Date.now() - Number(session.createdAt)) <= getAppSessionMaxMs();
}

function showVerifyScene() {
    document.getElementById("screen-verify").classList.remove("hidden");
    document.getElementById("screen-trap").classList.add("hidden");
    document.getElementById("screen-main").classList.add("hidden");
    appSignOutBtn && appSignOutBtn.classList.add("hidden");
}

function showTrapScene() {
    document.getElementById("screen-verify").classList.add("hidden");
    document.getElementById("screen-trap").classList.remove("hidden");
    document.getElementById("screen-main").classList.add("hidden");
    appSignOutBtn && appSignOutBtn.classList.remove("hidden");
}

function showMainScene() {
    document.getElementById("screen-verify").classList.add("hidden");
    document.getElementById("screen-trap").classList.add("hidden");
    document.getElementById("screen-main").classList.remove("hidden");
    appSignOutBtn && appSignOutBtn.classList.remove("hidden");
    
    // IMPROVEMENT #1: Show and initialize music player UI for mood selection
    const playerUI = document.getElementById('music-player-ui');
    if (playerUI && playerUI.classList.contains('hidden')) {
        playerUI.classList.remove('hidden');
    }
}

function signOutApp() {
    shouldResumeSelectedMusicOnGesture = false;
    stopMusicStatePersistence();
    clearAppSession();
    clearMusicPlaybackState();
    clearVerifyFormDraft();

    // Stop all audio
    pauseMusic();
    stopPanicAudio();
    panicMode = false;

    hidePanicAlert();
    noCount = 0;
    noRecentTargets.length = 0;
    btnNo.style.display = "";
    btnNo.style.position = "relative";
    btnNo.style.left = "";
    btnNo.style.top = "";
    btnNo.style.transform = "";
    btnNo.style.background = "";
    btnNo.classList.remove("crazy-no");
    btnYes.classList.add("locked");
    btnYes.classList.remove("unlocked");
    btnYes.innerText = "YES, Forever!";
    const letterEl = document.getElementById("typewriter");
    if (letterEl) {
        letterEl.innerHTML = "";
    }
    iLetter = 0;
    
    // Reset audio state
    selectedErrorCount = 0;
    audioPrimed = false;

    if (typeof signOutDrive === "function") {
        signOutDrive();
    }

    showVerifyScene();
}

function restoreAuthorizedSession() {
    if (!isAppSessionValid()) {
        clearAppSession();
        clearMusicPlaybackState();
        showVerifyScene();
        return false;
    }

    const session = loadAppSession() || {};
    const restoredMood = normalizeMood(session.mood);
    setSelectedMusicFromVibe(restoredMood, { allowPlaybackResume: true });

    if (session.stage === "main") {
        showMainScene();
        autoDiscoverMedia();
        startTimer();
        const letterEl = document.getElementById("typewriter");
        if (letterEl) letterEl.innerHTML = "";
        iLetter = 0;
        setTimeout(typeWriter, 350);
        setTimeout(() => { if (!isMusicPlaying && !panicMode) playSelectedMusic(); }, 500);
        return true;
    }

    showTrapScene();
    setTimeout(() => { if (!isMusicPlaying && !panicMode) playSelectedMusic(); }, 500);
    return true;
}

if (appSignOutBtn) {
    appSignOutBtn.addEventListener("click", signOutApp);
}

function isVerificationRateLimited() {
    const limit = Number(CONFIG?.security?.maxFailedAttemptsPerMinute || 10);
    if (limit <= 0) {
        return false;
    }

    const cutoff = Date.now() - (60 * 1000);
    while (failedVerifyTimestamps.length && failedVerifyTimestamps[0] < cutoff) {
        failedVerifyTimestamps.shift();
    }

    return failedVerifyTimestamps.length >= limit;
}

function markFailedVerificationAttempt() {
    failedVerifyTimestamps.push(Date.now());
}

async function checkAnswers() {
    primeAudioFromGesture();

    const inputVal = formatDateFromColumns("valentine");
    const inputWed = formatDateFromColumns("wedding");
    
    // SECURITY: Validate and sanitize user text input with length limits
    let txtReason = document.getElementById("txt-reason").value.trim();
    let txtFood = document.getElementById("txt-food").value.trim();
    
    // Limit length to prevent abuse
    if (txtReason.length > 1000) {
        txtReason = txtReason.substring(0, 1000);
    }
    if (txtFood.length > 500) {
        txtFood = txtFood.substring(0, 500);
    }
    
    const vibe = document.querySelector('input[name="music-vibe"]:checked').value;
    if (isVerificationRateLimited()) {
        errorMsg.textContent = "Too many attempts. Please wait a minute and try again.";
        errorMsg.classList.remove("hidden");
        animateShake();
        return;
    }

    if (inputVal === "" || inputWed === "") {
        errorMsg.textContent = "Please complete both dates before verification.";
        errorMsg.classList.remove("hidden");
        animateShake();
        return;
    }

    if (inputVal === null || inputWed === null) {
        errorMsg.textContent = "Please enter valid date values first.";
        errorMsg.classList.remove("hidden");
        animateShake();
        return;
    }

    const validDateAnswer = inputVal === CONFIG.valentineDate && inputWed === CONFIG.weddingDate;
    const isAuthorized = validDateAnswer;

    if (!isAuthorized) {
        markFailedVerificationAttempt();
        errorMsg.textContent = "Access denied: answer mismatch. This page is only for my wife.";
        errorMsg.classList.remove("hidden");
        animateShake();
        showPanicAlert();
        return;
    }

    hidePanicAlert();
    errorMsg.classList.add("hidden");

    setSelectedMusicFromVibe(vibe, { allowPlaybackResume: false });

    clearVerifyFormDraft();
    saveAppSession("trap", vibe);
    showTrapScene();
    setTimeout(() => { if (!isMusicPlaying && !panicMode) playSelectedMusic(); }, 300);

    submitAnswers({
        reason: txtReason || "(not provided)",
        food: txtFood || "(not provided)",
        valentineDateInput: displayDate(inputVal),
        weddingDateInput: displayDate(inputWed),
        vibe
    }).catch((error) => {
        console.warn("Background answer submit failed:", error);
    });
}

window.checkAnswers = checkAnswers;

function animateShake() {
    verifyCard.animate(
        [
            { transform: "translateX(-10px)" },
            { transform: "translateX(10px)" },
            { transform: "translateX(0)" }
        ],
        { duration: 320 }
    );
}

async function submitAnswers(payload) {
    const record = {
        valentine_date_answer: payload.valentineDateInput,
        wedding_date_answer: payload.weddingDateInput,
        reason: payload.reason,
        food: payload.food,
        mood: payload.vibe,
        bypass_used: "no",
        submitted_at: new Date().toISOString()
    };

    const endpoint = normalizeAnswerSinkEndpoint();
    if (endpoint) {
        const sent = await submitAnswersToEndpoint(endpoint, record);
        if (sent) {
            return true;
        }
    }
    persistAnswersFallback(record);
    return false;
}

function normalizeAnswerSinkEndpoint() {
    const raw = String(CONFIG?.answerSink?.endpoint || "").trim();
    if (!raw) {
        return "";
    }

    return raw;
}

async function submitAnswersToEndpoint(endpoint, record) {
    const mode = String(CONFIG?.answerSink?.mode || "no-cors").toLowerCase();
    const noCors = mode === "no-cors";

    try {
        const headers = {
            "Content-Type": noCors ? "text/plain;charset=UTF-8" : "application/json"
        };

        const response = await fetch(endpoint, {
            method: "POST",
            mode: noCors ? "no-cors" : "cors",
            headers,
            body: JSON.stringify(record),
            keepalive: true
        });

        // no-cors responses are opaque by design; request likely reached the endpoint.
        if (noCors) {
            return true;
        }

        if (!response.ok) {
            throw new Error(`Answer sink returned ${response.status}`);
        }

        return true;
    } catch (err) {
        console.warn("Could not submit to configured answer sink endpoint:", err);
        return false;
    }
}

function persistAnswersFallback(record) {
    const key = "valentine_answers_backup";
    const attempt = {
        ...record,
        submittedAt: new Date().toISOString()
    };

    try {
        const existing = JSON.parse(localStorage.getItem(key) || "[]");
        if (Array.isArray(existing)) {
            existing.push(attempt);
            localStorage.setItem(key, JSON.stringify(existing));
        } else {
            localStorage.setItem(key, JSON.stringify([attempt]));
        }
    } catch (_error) {
        // no-op
    }

    if (!normalizeAnswerSinkEndpoint()) {
        console.warn("No answer sink configured. Set CONFIG.answerSink.endpoint to capture live answers.");
    }
}

/* ==========================================
   Panic modal + intruder alert audio
   ========================================== */
function showPanicAlert() {
    panicModal.classList.remove("hidden");
    saveMusicPlaybackState(true);
    playPanicAlert();
}

function hidePanicAlert() {
    panicModal.classList.add("hidden");
    if (panicMode) {
        panicMode = false;
        stopPanicAudio();
        setTimeout(() => {
            if (!panicMode && isRomanceSceneVisible()) {
                playSelectedMusic();
            }
        }, 500);
    }
}

panicCloseBtn.addEventListener("click", hidePanicAlert);
panicModal.addEventListener("click", (event) => {
    if (event.target === panicModal) {
        hidePanicAlert();
    }
});

/* ==========================================
   MP3 Music Player State - (variables declared in block below)
   ========================================== */

/* ==========================================
   🎵 MANIFEST-FIRST MP3 LOADER
   Uses music-manifest.json for instant loading (zero 404s)
   Falls back to simple folder scan if no manifest found
   ========================================== */

async function autoDetectMusicFiles() {
    // Check localStorage cache first
    if (CONFIG.music.cacheEnabled && loadCachedMusicFiles()) {
        console.log("✅ Loaded music from cache");
        return;
    }

    // Try manifest file first (fastest, zero 404 spam)
    const loaded = await tryLoadManifest();
    if (loaded) return;

    // Fallback: simple folder scan
    if (CONFIG.music.fallbackScan) {
        console.log("📂 No manifest found, scanning folders...");
        musicTracks.romantic = await probeFolderForMP3s(CONFIG.music.folders.romantic);
        musicTracks.funny    = await probeFolderForMP3s(CONFIG.music.folders.funny);
    }

    if (musicTracks.romantic.length === 0 && musicTracks.funny.length === 0) {
        console.warn("⚠️ No MP3 files found. Add music/music-manifest.json or MP3 files.");
    } else {
        console.log(`✅ Found ${musicTracks.romantic.length} romantic + ${musicTracks.funny.length} funny`);
        if (CONFIG.music.cacheEnabled) saveMusicCache();
    }
}

async function tryLoadManifest() {
    try {
        const res = await fetch(CONFIG.music.manifestPath, { cache: "no-cache" });
        if (!res.ok) return false;
        const data = await res.json();
        if (!data.romantic && !data.funny) return false;

        musicTracks.romantic = (data.romantic || []).map(t => ({
            path: t.path,
            title: t.title || extractTitleFromPath(t.path),
            folder: extractFolderFromPath(t.path)
        }));
        musicTracks.funny = (data.funny || []).map(t => ({
            path: t.path,
            title: t.title || extractTitleFromPath(t.path),
            folder: extractFolderFromPath(t.path)
        }));

        console.log(`✅ Manifest loaded: ${musicTracks.romantic.length} romantic + ${musicTracks.funny.length} funny`);
        if (CONFIG.music.cacheEnabled) saveMusicCache();
        return true;
    } catch {
        return false;
    }
}

async function probeFolderForMP3s(folderPath) {
    // Only probes 1.mp3, 2.mp3 ... N.mp3 - minimal 404s
    const max = CONFIG.music.scanMaxPerFolder || 20;
    const tracks = [];
    for (let i = 1; i <= max; i++) {
        const path = `${folderPath}${i}.mp3`;
        try {
            const res = await fetch(path, { method: "HEAD", cache: "force-cache" });
            if (res.ok) {
                tracks.push({ path, title: extractTitleFromPath(path), folder: extractFolderFromPath(path) });
            } else {
                // Stop early if we hit a missing number (avoids checking all 20)
                if (i > 3 && tracks.length === 0) break;
            }
        } catch { break; }
    }
    return tracks;
}

function extractTitleFromPath(filePath) {
    const name = filePath.split("/").pop().replace(/\.mp3$/i, "").replace(/[-_]/g, " ");
    return name.replace(/\b\w/g, c => c.toUpperCase());
}

function extractFolderFromPath(filePath) {
    const parts = filePath.split("/");
    return parts.length > 2 ? parts[parts.length - 2] : "";
}

function loadCachedMusicFiles() {
    try {
        const ts = localStorage.getItem(MUSIC_CACHE_TIMESTAMP_KEY);
        if (!ts) return false;
        const age = Date.now() - parseInt(ts, 10);
        if (age > (CONFIG.music.cacheExpiryHours || 24) * 3600000) {
            localStorage.removeItem(MUSIC_CACHE_KEY);
            localStorage.removeItem(MUSIC_CACHE_TIMESTAMP_KEY);
            return false;
        }
        const raw = localStorage.getItem(MUSIC_CACHE_KEY);
        if (!raw) return false;
        const d = JSON.parse(raw);
        musicTracks.romantic = d.romantic || [];
        musicTracks.funny    = d.funny    || [];
        return musicTracks.romantic.length > 0 || musicTracks.funny.length > 0;
    } catch { return false; }
}

function saveMusicCache() {
    try {
        localStorage.setItem(MUSIC_CACHE_KEY, JSON.stringify(musicTracks));
        localStorage.setItem(MUSIC_CACHE_TIMESTAMP_KEY, String(Date.now()));
    } catch (e) { console.warn("Cache save failed:", e); }
}

function clearMusicCache() {
    localStorage.removeItem(MUSIC_CACHE_KEY);
    localStorage.removeItem(MUSIC_CACHE_TIMESTAMP_KEY);
    console.log("🗑️ Music cache cleared");
}

window.clearMusicCache = clearMusicCache;

/* ==========================================
   HTML5 AUDIO PLAYER
   ========================================== */

function initMusicPlayer() {
    bgMusicElement    = document.getElementById("bg-music");
    panicSoundElement = document.getElementById("panic-sound");

    if (!bgMusicElement || !panicSoundElement) {
        console.error("❌ <audio id=\"bg-music\"> or <audio id=\"panic-sound\"> not found in HTML");
        return false;
    }

    bgMusicElement.addEventListener("ended",  playNextSelectedTrack);
    bgMusicElement.addEventListener("play",   () => { isMusicPlaying = true;  updateMusicPlayerUI(); });
    bgMusicElement.addEventListener("pause",  () => { isMusicPlaying = false; updateMusicPlayerUI(); });
    bgMusicElement.addEventListener("error",  () => { console.warn("Track error, skipping"); playNextSelectedTrack(); });

    bgMusicElement.volume    = 0.7;
    panicSoundElement.volume = 1.0;
    console.log("🎵 MP3 player ready");
    return true;
}

function playSelectedMusic() {
    if (!bgMusicElement) return;
    const tracks = musicTracks[currentMood];
    if (!tracks || tracks.length === 0) return;
    if (currentTrackIndex >= tracks.length) currentTrackIndex = 0;

    const track = tracks[currentTrackIndex];
    bgMusicElement.src = track.path;
    bgMusicElement.play().catch(() => {
        // Browser blocked autoplay - play on next user gesture
        document.addEventListener("click", () => bgMusicElement.play().catch(() => {}), { once: true });
    });
}

function pauseMusic()  { if (bgMusicElement) { bgMusicElement.pause(); } }
function stopMusic()   { pauseMusic(); }
function resumeMusic() { if (bgMusicElement && !isMusicPlaying) bgMusicElement.play().catch(() => {}); }

function playNextSelectedTrack() {
    const tracks = musicTracks[currentMood];
    if (!tracks || tracks.length === 0) return;
    currentTrackIndex = (currentTrackIndex + 1) % tracks.length;
    playSelectedMusic();
}

function playPreviousTrack() {
    const tracks = musicTracks[currentMood];
    if (!tracks || tracks.length === 0) return;
    currentTrackIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    playSelectedMusic();
}

function setSelectedMusicFromVibe(mood, options = {}) {
    const normalized = normalizeMood(mood);
    currentMood = normalized;
    currentTrackIndex = 0;

    const romanticBtn = document.getElementById("mood-romantic-btn");
    const funnyBtn    = document.getElementById("mood-funny-btn");
    if (romanticBtn && funnyBtn) {
        romanticBtn.classList.toggle("active", normalized === "romantic");
        funnyBtn.classList.toggle("active",    normalized === "funny");
    }

    if (options.allowPlaybackResume) playSelectedMusic();
    updateMusicPlayerUI();
}

function updateMusicPlayerUI() {
    const tracks = musicTracks[currentMood];
    const track  = tracks && tracks[currentTrackIndex];

    const titleEl = document.getElementById("track-title");
    if (titleEl) titleEl.textContent = track ? track.title : "—";

    const moodEl = document.getElementById("mood-label");
    if (moodEl) moodEl.textContent = currentMood.charAt(0).toUpperCase() + currentMood.slice(1);

    const posEl = document.getElementById("track-position");
    if (posEl) posEl.textContent = tracks ? `Track ${currentTrackIndex + 1}/${tracks.length}` : "";

    const playBtn   = document.getElementById("player-play-btn");
    if (playBtn) {
        playBtn.querySelector(".icon-play")?.classList.toggle("hidden",  isMusicPlaying);
        playBtn.querySelector(".icon-pause")?.classList.toggle("hidden", !isMusicPlaying);
    }
}

function setupMusicPlayerControls() {
    document.getElementById("player-play-btn")?.addEventListener("click", () => {
        if (isMusicPlaying) pauseMusic(); else playSelectedMusic();
    });
    document.getElementById("player-prev-btn")?.addEventListener("click", playPreviousTrack);
    document.getElementById("player-next-btn")?.addEventListener("click", playNextSelectedTrack);
    document.getElementById("mood-romantic-btn")?.addEventListener("click", () => {
        setSelectedMusicFromVibe("romantic", { allowPlaybackResume: true });
    });
    document.getElementById("mood-funny-btn")?.addEventListener("click", () => {
        setSelectedMusicFromVibe("funny", { allowPlaybackResume: true });
    });
}

function playPanicAlert() {
    panicMode = true;
    if (bgMusicElement) { bgMusicElement.pause(); }
    if (panicSoundElement && CONFIG.music.panicSound) {
        panicSoundElement.src  = CONFIG.music.panicSound;
        panicSoundElement.loop = true;
        panicSoundElement.play().catch(() => {});
    }
}

function stopPanicAudio() {
    if (panicSoundElement) {
        panicSoundElement.pause();
        panicSoundElement.currentTime = 0;
    }
}

/* Stubs for functions called elsewhere that no longer need real bodies */
function primeAudioFromGesture() { audioPrimed = true; }
function startMusicStatePersistence() {}
function stopMusicStatePersistence()  { clearTimeout(musicStateSaveTimerId); }

function saveMusicPlaybackState(force = false) {
    if (panicMode || !isRomanceSceneVisible()) return;
    const doSave = () => {
        const s = loadAppSession();
        if (s) { s.mood = currentMood; s.trackIndex = currentTrackIndex; saveAppSession(s); }
    };
    if (force) doSave();
    else { clearTimeout(musicStateSaveTimerId); musicStateSaveTimerId = setTimeout(doSave, 1000); }
}

function isRomanceSceneVisible() {
    const trap = document.getElementById("screen-trap");
    const main = document.getElementById("screen-main");
    return (trap && !trap.classList.contains("hidden")) || (main && !main.classList.contains("hidden"));
}

function isVerifySceneVisible() {
    const el = document.getElementById("screen-verify");
    return el && !el.classList.contains("hidden");
}

/* ==========================================
   Trap buttons (yes/no)
   ========================================== */
const noTexts = [
    "No? Are you sure, cutie?",
    "Aww, try again my love?",
    "You just broke my tiny heart.",
    "What if I bring flower Wine and 100USD 💰💯💵?",
    "Still no? aahhha why",
    "Plot twist: I am extra handsome today.",
    "One more chance for this husband?",
    "Say yes and I will do dishes for a week.",
    "Rose delivery in 3...2...YES?",
    "Your smile says yes already.",
    "No button is getting nervous.",
    "My heart is buffering... please say yes.",
    "Cute answer pending...",
    "Try the other button, princess.",
    "Come on, team us forever!",
    "You win. I still choose you.",
    "Red Wine 🍷 and Salmond 🍱 tonight? ",
    "Final round: yes?"
];
let noCount = 0;
const noRecentTargets = [];

// Shuffle messages except last one (always "Final round: yes?")
const shuffledNoTexts = [...noTexts];
for (let i = shuffledNoTexts.length - 2; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledNoTexts[i], shuffledNoTexts[j]] = [shuffledNoTexts[j], shuffledNoTexts[i]];
}

function teleportNoButton() {
    const area = btnNo.closest(".intro-card") || btnNo.parentElement;
    if (!area) {
        return;
    }

    if (window.getComputedStyle(area).position === "static") {
        area.style.position = "relative";
    }

    const group = btnNo.closest(".btn-group");
    if (group) {
        group.style.overflow = "visible";
    }

    const areaRect = area.getBoundingClientRect();
    const btnYesRect = btnYes.getBoundingClientRect();
    const btnNoRect = btnNo.getBoundingClientRect();
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    const toLocalRect = (rect) => ({
        left: rect.left - areaRect.left,
        top: rect.top - areaRect.top,
        right: rect.right - areaRect.left,
        bottom: rect.bottom - areaRect.top,
        width: rect.width,
        height: rect.height
    });

    const overlaps = (a, b) => (
        a.left < b.right &&
        a.right > b.left &&
        a.top < b.bottom &&
        a.bottom > b.top
    );

    const cardPad = 16;
    const screenPad = 8;
    const maxWidth = Math.max(120, Math.floor(areaRect.width - (cardPad * 2)));
    btnNo.style.maxWidth = `${maxWidth}px`;
    const sizedRect = btnNo.getBoundingClientRect();
    const buttonWidth = sizedRect.width || btnNoRect.width || 170;
    const buttonHeight = sizedRect.height || btnNoRect.height || 56;

    const zoneXMin = cardPad;
    const zoneXMax = Math.max(zoneXMin, areaRect.width - buttonWidth - cardPad);
    const zoneYMin = cardPad;
    const zoneYMax = Math.max(zoneYMin, areaRect.height - buttonHeight - cardPad);

    const visibleMinX = Math.max(zoneXMin, screenPad - areaRect.left);
    const visibleMaxX = Math.min(zoneXMax, window.innerWidth - screenPad - areaRect.left - buttonWidth);
    const visibleMinY = Math.max(zoneYMin, screenPad - areaRect.top);
    const visibleMaxY = Math.min(zoneYMax, window.innerHeight - screenPad - areaRect.top - buttonHeight);
    const boundMinX = Math.min(visibleMinX, visibleMaxX);
    const boundMaxX = Math.max(visibleMinX, visibleMaxX);
    const boundMinY = Math.min(visibleMinY, visibleMaxY);
    const boundMaxY = Math.max(visibleMinY, visibleMaxY);

    const yesLocal = toLocalRect(btnYesRect);
    const noSafeBox = {
        left: yesLocal.left - 14,
        top: yesLocal.top - 12,
        right: yesLocal.right + 14,
        bottom: yesLocal.bottom + 12
    };

    const currentLocalX = btnNoRect.left - areaRect.left;
    const currentLocalY = btnNoRect.top - areaRect.top;
    const currentCenterX = currentLocalX + (buttonWidth / 2);
    const currentCenterY = currentLocalY + (buttonHeight / 2);
    const yesCenterX = yesLocal.left + (yesLocal.width / 2);
    const yesCenterY = yesLocal.top + (yesLocal.height / 2);

    const areaDiagonal = Math.hypot(areaRect.width, areaRect.height);
    // Progressive difficulty - gets harder each time
    const distanceMultiplier = 1 + (noCount * 0.15);
    const minDistanceFromYes = Math.max(140, Math.min(420, areaRect.width * 0.48 * distanceMultiplier));
    const minTravelDistance = Math.max(120, Math.min(400, areaDiagonal * 0.36 * distanceMultiplier));
    const minDistanceFromRecent = Math.max(120, Math.min(300, areaRect.width * 0.36 * distanceMultiplier));

    let targetX = clamp(yesCenterX - (buttonWidth / 2), boundMinX, boundMaxX);
    let targetY = clamp(yesCenterY + 42 - (buttonHeight / 2), boundMinY, boundMaxY);
    let bestScore = -1;

    const tryCount = 96;
    for (let i = 0; i < tryCount; i += 1) {
        const testX = boundMinX + (Math.random() * Math.max(1, boundMaxX - boundMinX));
        const testY = boundMinY + (Math.random() * Math.max(1, boundMaxY - boundMinY));
        const candidate = {
            left: testX,
            top: testY,
            right: testX + buttonWidth,
            bottom: testY + buttonHeight
        };

        const candidateCenterX = testX + (buttonWidth / 2);
        const candidateCenterY = testY + (buttonHeight / 2);
        const distanceFromYes = Math.hypot(candidateCenterX - yesCenterX, candidateCenterY - yesCenterY);
        const travelDistance = Math.hypot(candidateCenterX - currentCenterX, candidateCenterY - currentCenterY);
        const nearestRecentDistance = noRecentTargets.length
            ? noRecentTargets.reduce((closest, point) => {
                const d = Math.hypot(candidateCenterX - point.x, candidateCenterY - point.y);
                return Math.min(closest, d);
            }, Number.POSITIVE_INFINITY)
            : minDistanceFromRecent * 1.8;
        const farFromRecent = nearestRecentDistance >= minDistanceFromRecent;

        if (!overlaps(candidate, noSafeBox) && distanceFromYes >= minDistanceFromYes && travelDistance >= minTravelDistance && farFromRecent) {
            const score = (distanceFromYes * 0.7) + (travelDistance * 1.1) + (nearestRecentDistance * 0.65);
            if (score <= bestScore) {
                continue;
            }
            bestScore = score;
            targetX = testX;
            targetY = testY;
        }
    }

    if (bestScore < 0) {
        const fallbackCandidates = [
            { x: boundMinX, y: boundMinY },
            { x: boundMaxX, y: boundMinY },
            { x: boundMinX, y: boundMaxY },
            { x: boundMaxX, y: boundMaxY }
        ];
        let fallbackBest = fallbackCandidates[0];
        let fallbackBestScore = -1;

        fallbackCandidates.forEach((point) => {
            const centerX = point.x + (buttonWidth / 2);
            const centerY = point.y + (buttonHeight / 2);
            const distanceFromYes = Math.hypot(centerX - yesCenterX, centerY - yesCenterY);
            const travelDistance = Math.hypot(centerX - currentCenterX, centerY - currentCenterY);
            const score = distanceFromYes + travelDistance;
            if (score > fallbackBestScore) {
                fallbackBestScore = score;
                fallbackBest = point;
            }
        });

        targetX = fallbackBest.x;
        targetY = fallbackBest.y;
    }

    const rotate = (Math.random() * 38) - 19;
    const scale = 0.92 + Math.random() * 0.28;
    const hue = Math.floor(Math.random() * 360);

    btnNo.style.position = "absolute";
    btnNo.style.left = `${targetX}px`;
    btnNo.style.top = `${targetY}px`;
    btnNo.style.transform = `rotate(${rotate}deg) scale(${scale})`;
    btnNo.style.background = `hsl(${hue} 75% 42%)`;
    btnNo.style.zIndex = "40";
    btnNo.classList.add("crazy-no");

    noRecentTargets.push({
        x: targetX + (buttonWidth / 2),
        y: targetY + (buttonHeight / 2)
    });
    if (noRecentTargets.length > 10) {
        noRecentTargets.shift();
    }

    btnNo.animate(
        [
            { transform: `translateY(-5px) rotate(${rotate - 20}deg) scale(${scale * 0.9})` },
            { transform: `translateY(2px) rotate(${rotate + 15}deg) scale(${scale * 1.05})` },
            { transform: `translateY(0) rotate(${rotate}deg) scale(${scale})` }
        ],
        { duration: 360, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }
    );
}

function moveNo() {
    if (noCount < shuffledNoTexts.length) {
        btnNo.innerText = shuffledNoTexts[noCount];
    } else {
        btnNo.style.display = "none";
        btnYes.classList.remove("locked");
        btnYes.classList.add("unlocked");
        btnYes.innerText = "YES! (Finally)";
        createAtmosphere("\uD83C\uDF3B", 30);
        return;
    }

    teleportNoButton();
    createAtmosphere(null, Math.floor(Math.random() * 5) + 4);
    noCount += 1;
}

btnNo.addEventListener("mouseover", moveNo);
btnNo.addEventListener("click", (event) => {
    event.preventDefault();
    moveNo();
});

btnYes.addEventListener("click", () => {
    if (btnYes.classList.contains("locked")) {
        return;
    }

    // IMPROVEMENT #2: Auto-start music from YES button
    // Prime audio first
    primeAudioFromGesture();
    
    // Start music immediately with aggressive retry
    primeAudioFromGesture();
    setTimeout(() => { if (!isMusicPlaying && !panicMode) playSelectedMusic(); }, 200);
    
    // Also try immediate play
    setTimeout(() => {
        if (!isMusicPlaying && !panicMode) {
            playSelectedMusic();
        }
    }, 200);

    saveAppSession("main", selectedMood);
    showMainScene();

    autoDiscoverMedia();
    startTimer();
    const letterEl = document.getElementById("typewriter");
    if (letterEl) {
        letterEl.innerHTML = "";
    }
    iLetter = 0;
    setTimeout(typeWriter, 1000);
    createAtmosphere("\uD83D\uDC95", 20);
});

/* ==========================================
   Media discovery + modern grid + lightbox slider
   ========================================== */
let validMedia = [];

function getPreferredMediaQuality() {
    let stored = "";
    try {
        stored = String(localStorage.getItem(MEDIA_QUALITY_KEY) || "").toLowerCase();
    } catch (_error) {
        stored = "";
    }
    if (stored === "hd" || stored === "fhd" || stored === "original") {
        return stored;
    }

    return String(CONFIG?.mediaQuality?.default || "hd").toLowerCase();
}

function setPreferredMediaQuality(quality) {
    const normalized = String(quality || "").toLowerCase();
    if (normalized !== "hd" && normalized !== "fhd" && normalized !== "original") {
        return;
    }

    try {
        localStorage.setItem(MEDIA_QUALITY_KEY, normalized);
    } catch (_error) {
        // no-op
    }
}

function getImageWidthForQuality(quality) {
    const map = CONFIG?.mediaQuality?.imageWidths || {};
    if (quality === "fhd") {
        return Number(map.fhd || 1920);
    }

    if (quality === "hd") {
        return Number(map.hd || 1280);
    }

    return 0;
}

function initMediaQualityControl() {
    if (!mediaQualitySelect) {
        return;
    }

    const preferred = getPreferredMediaQuality();
    mediaQualitySelect.value = preferred;

    mediaQualitySelect.addEventListener("change", () => {
        setPreferredMediaQuality(mediaQualitySelect.value);
        if (lightbox && lightbox.classList.contains("active")) {
            showSlide(currentIndex, 1);
        }
    });
}

function getSelectedMediaQuality() {
    if (mediaQualitySelect && mediaQualitySelect.value) {
        return String(mediaQualitySelect.value).toLowerCase();
    }

    return getPreferredMediaQuality();
}

initMediaQualityControl();

/* ==========================================
   Google Drive (shared users only)
   ========================================== */

const DRIVE_STATE = {
    tokenClient: null,
    folderId: "",
    accessToken: null,
    tokenExpiresAt: 0,
    isSignedIn: false,
    tokenRequest: null, // { promise, resolve, reject }
    // Small LRU cache to avoid re-downloading the same media repeatedly.
    objectUrlCache: new Map(), // fileId -> objectURL
    objectUrlOrder: [], // fileId order
    maxCacheItems: 20
};
const DRIVE_SESSION_KEY = "valentine_drive_session_v1";
const DRIVE_TOKEN_SKEW_MS = 20 * 1000;
let driveTokenRefreshTimerId = null;
let driveAuthInitRetryTimerId = null;
let driveAuthInitRetryCount = 0;
const DRIVE_AUTH_INIT_RETRY_MAX = 30;
const DRIVE_AUTH_INIT_RETRY_DELAY_MS = 500;

function getDriveSessionMaxMs() {
    const days = Number(CONFIG?.driveSession?.maxDays || 7);
    return Math.max(1, days) * 24 * 60 * 60 * 1000;
}

function loadDriveSession() {
    try {
        const raw = localStorage.getItem(DRIVE_SESSION_KEY);
        if (!raw) {
            return null;
        }

        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") {
            return null;
        }

        return parsed;
    } catch (_error) {
        return null;
    }
}

function saveDriveSession(update) {
    try {
        const prev = loadDriveSession() || {};
        const now = Date.now();
        const next = {
            startedAt: Number(prev.startedAt || now),
            touchedAt: now,
            ...prev,
            ...update
        };
        localStorage.setItem(DRIVE_SESSION_KEY, JSON.stringify(next));
    } catch (_error) {
        // no-op
    }
}

function clearDriveSession() {
    try {
        localStorage.removeItem(DRIVE_SESSION_KEY);
    } catch (_error) {
        // no-op
    }
}

function hasValidDriveSession() {
    const session = loadDriveSession();
    if (!session || !session.startedAt || session.signedOut) {
        return false;
    }

    return (Date.now() - Number(session.startedAt)) <= getDriveSessionMaxMs();
}

function setDriveSignedInState(isSignedIn) {
    DRIVE_STATE.isSignedIn = Boolean(isSignedIn);

    if (!DRIVE_STATE.isSignedIn) {
        clearDriveTokenRefreshTimer();
    }
}

function setDriveTokenFromResponse(response) {
    DRIVE_STATE.accessToken = response?.access_token || "";
    const expiresInSeconds = Math.max(60, Number(response?.expires_in || 3600));
    DRIVE_STATE.tokenExpiresAt = Date.now() + (expiresInSeconds * 1000);
    setDriveSignedInState(Boolean(DRIVE_STATE.accessToken));

    if (DRIVE_STATE.isSignedIn) {
        saveDriveSession({
            signedOut: false,
            lastSignInAt: Date.now(),
            tokenExpiresAt: DRIVE_STATE.tokenExpiresAt,
            accessToken: DRIVE_STATE.accessToken
        });
    }

    scheduleDriveTokenRefresh();
}

function hasUsableDriveToken() {
    if (!DRIVE_STATE.accessToken || !DRIVE_STATE.tokenExpiresAt) {
        return false;
    }

    return (DRIVE_STATE.tokenExpiresAt - Date.now()) > DRIVE_TOKEN_SKEW_MS;
}

function clearDriveTokenRefreshTimer() {
    if (!driveTokenRefreshTimerId) {
        return;
    }

    clearTimeout(driveTokenRefreshTimerId);
    driveTokenRefreshTimerId = null;
}

function restoreDriveTokenFromSession() {
    const session = loadDriveSession();
    if (!session || !hasValidDriveSession()) {
        return false;
    }

    const token = String(session.accessToken || "");
    const tokenExpiresAt = Number(session.tokenExpiresAt || 0);
    if (!token || !tokenExpiresAt || (tokenExpiresAt - Date.now()) <= DRIVE_TOKEN_SKEW_MS) {
        return false;
    }

    DRIVE_STATE.accessToken = token;
    DRIVE_STATE.tokenExpiresAt = tokenExpiresAt;
    setDriveSignedInState(true);
    scheduleDriveTokenRefresh();
    return true;
}

function getDriveBlobCacheMeta() {
    const meta = readJsonStorage(DRIVE_BLOB_CACHE_META_KEY, null);
    if (!meta || !Array.isArray(meta.order)) {
        return { order: [] };
    }

    return meta;
}

function setDriveBlobCacheMeta(meta) {
    writeJsonStorage(DRIVE_BLOB_CACHE_META_KEY, meta);
}

async function getDriveBlobFromPersistentCache(fileId) {
    if (!("caches" in window) || !fileId) {
        return null;
    }

    try {
        const cache = await caches.open(DRIVE_BLOB_CACHE_NAME);
        const key = new Request(`/__drive_blob_cache__/${encodeURIComponent(fileId)}`);
        const response = await cache.match(key);
        if (!response) {
            return null;
        }

        const blob = await response.blob();
        return blob;
    } catch (_error) {
        return null;
    }
}

async function setDriveBlobToPersistentCache(fileId, blob) {
    if (!("caches" in window) || !fileId || !blob) {
        return;
    }

    const maxMb = Number(CONFIG?.mediaQuality?.blobCacheMaxMb || 120);
    const maxBytes = Math.max(10, maxMb) * 1024 * 1024;
    if (blob.size > maxBytes) {
        return;
    }

    try {
        const cache = await caches.open(DRIVE_BLOB_CACHE_NAME);
        const key = new Request(`/__drive_blob_cache__/${encodeURIComponent(fileId)}`);
        await cache.put(key, new Response(blob, { headers: { "Content-Type": blob.type || "application/octet-stream" } }));

        const meta = getDriveBlobCacheMeta();
        meta.order = meta.order.filter((id) => id !== fileId);
        meta.order.push(fileId);

        const maxItems = Math.max(2, Number(CONFIG?.mediaQuality?.blobCacheMaxItems || 10));
        while (meta.order.length > maxItems) {
            const oldest = meta.order.shift();
            if (oldest) {
                await cache.delete(new Request(`/__drive_blob_cache__/${encodeURIComponent(oldest)}`));
            }
        }

        setDriveBlobCacheMeta(meta);
    } catch (_error) {
        // no-op
    }
}

async function clearDriveBlobPersistentCache() {
    if (!("caches" in window)) {
        return;
    }

    try {
        await caches.delete(DRIVE_BLOB_CACHE_NAME);
    } catch (_error) {
        // no-op
    }

    setDriveBlobCacheMeta({ order: [] });
}

function scheduleDriveTokenRefresh() {
    clearDriveTokenRefreshTimer();

    if (!DRIVE_STATE.accessToken || !DRIVE_STATE.tokenExpiresAt || !DRIVE_STATE.isSignedIn) {
        return;
    }

    const delayMs = Math.max(5 * 1000, DRIVE_STATE.tokenExpiresAt - Date.now() + 500);

    driveTokenRefreshTimerId = setTimeout(() => {
        if (!DRIVE_STATE.isSignedIn) {
            return;
        }

        // Avoid automatic background re-auth popups. Let next Drive request ask for sign-in if needed.
        DRIVE_STATE.accessToken = null;
        DRIVE_STATE.tokenExpiresAt = 0;
    }, delayMs);
}

function hasDriveConfig() {
    return Boolean(CONFIG?.drive?.enabled && getDriveClientId() && getDriveFolderId());
}

function isDriveMedia(media) {
    return typeof media?.path === "string" && media.path.startsWith("drive:");
}

function driveFileId(media) {
    return media.path.slice("drive:".length);
}

function getDriveClientId() {
    return String(CONFIG?.drive?.clientId || "").trim();
}

function getDriveFolderId() {
    const raw = CONFIG?.drive?.folderId;
    if (!raw) {
        return "";
    }

    const value = String(raw).trim();
    if (!value) {
        return "";
    }

    const folderPathMatch = value.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (folderPathMatch && folderPathMatch[1]) {
        return folderPathMatch[1];
    }

    try {
        const url = new URL(value);
        const idParam = url.searchParams.get("id");
        if (idParam) {
            return idParam.trim();
        }
    } catch (_error) {
        // Not a URL. Continue and treat as plain ID.
    }

    const plainIdMatch = value.match(/^([a-zA-Z0-9_-]{10,})$/);
    return plainIdMatch ? plainIdMatch[1] : "";
}

function buildDriveAuthConfigHint(reason = "") {
    const origin = window.location.origin;
    const pieces = [
        "Google sign-in config error.",
        "Use an OAuth Web client ID and add this Authorized JavaScript origin:",
        origin
    ];

    if (reason) {
        pieces.push(`Reason: ${reason}`);
    }

    return pieces.join(" ");
}

function normalizeDriveAuthError(errorLike) {
    return String(
        errorLike?.error ||
        errorLike?.type ||
        errorLike?.message ||
        errorLike ||
        ""
    ).trim().toLowerCase();
}

function optimizeDriveThumbnailUrl(url, maxPx = Number(CONFIG?.thumbnails?.driveMaxPx || 512)) {
    const raw = String(url || "").trim();
    if (!raw) {
        return "";
    }

    const safePx = Math.min(1024, Math.max(160, Math.floor(maxPx)));

    if (/=s\d+/i.test(raw)) {
        return raw.replace(/=s\d+/i, `=s${safePx}`);
    }

    try {
        const parsed = new URL(raw);
        parsed.searchParams.set("sz", `w${safePx}`);
        return parsed.toString();
    } catch (_error) {
        const glue = raw.includes("?") ? "&" : "?";
        return `${raw}${glue}sz=w${safePx}`;
    }
}

function buildDriveThumbnailById(fileId, maxPx = Number(CONFIG?.thumbnails?.driveMaxPx || 512)) {
    if (!fileId) {
        return "";
    }

    const safePx = Math.min(1024, Math.max(160, Math.floor(maxPx)));
    return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w${safePx}`;
}

function buildDrivePreviewUrl(fileId) {
    if (!fileId) {
        return "";
    }

    return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview`;
}

function releaseDriveObjectUrlCache() {
    DRIVE_STATE.objectUrlOrder.forEach((fileId) => {
        const url = DRIVE_STATE.objectUrlCache.get(fileId);
        if (url) {
            URL.revokeObjectURL(url);
        }
    });
    DRIVE_STATE.objectUrlCache.clear();
    DRIVE_STATE.objectUrlOrder = [];
}

function setDriveStatus(message, isError = false) {
    if (!driveStatus) return;
    driveStatus.textContent = message;
    driveStatus.classList.toggle("is-error", Boolean(isError));
}

function showDriveAuthUI() {
    if (driveAuthBox) driveAuthBox.classList.remove("hidden");
    if (driveSignInBtn) driveSignInBtn.disabled = false;
}

function hideDriveAuthUI() {
    if (driveAuthBox) driveAuthBox.classList.add("hidden");
}

function rememberObjectUrl(fileId, objectUrl) {
    if (!objectUrl) return;
    if (DRIVE_STATE.objectUrlCache.has(fileId)) return;

    DRIVE_STATE.objectUrlCache.set(fileId, objectUrl);
    DRIVE_STATE.objectUrlOrder.push(fileId);

    while (DRIVE_STATE.objectUrlOrder.length > DRIVE_STATE.maxCacheItems) {
        const oldest = DRIVE_STATE.objectUrlOrder.shift();
        const url = DRIVE_STATE.objectUrlCache.get(oldest);
        if (url) URL.revokeObjectURL(url);
        DRIVE_STATE.objectUrlCache.delete(oldest);
    }
}

async function requestDriveAccessToken(prompt = "none") {
    if (!DRIVE_STATE.tokenClient) {
        throw new Error("token_client_missing");
    }

    if (DRIVE_STATE.tokenRequest?.promise) {
        return DRIVE_STATE.tokenRequest.promise;
    }

    const tokenRequest = { promise: null, resolve: null, reject: null };
    tokenRequest.promise = new Promise((resolve, reject) => {
        tokenRequest.resolve = resolve;
        tokenRequest.reject = reject;

        DRIVE_STATE.tokenClient.callback = (response) => {
            const pending = DRIVE_STATE.tokenRequest;
            DRIVE_STATE.tokenRequest = null;

            if (!response || response.error) {
                pending?.reject(new Error(normalizeDriveAuthError(response || "token_error") || "token_error"));
                return;
            }

            setDriveTokenFromResponse(response);
            pending?.resolve(response);
        };

        try {
            DRIVE_STATE.tokenClient.requestAccessToken({ prompt });
        } catch (error) {
            DRIVE_STATE.tokenRequest = null;
            reject(error);
        }
    });

    DRIVE_STATE.tokenRequest = tokenRequest;
    return tokenRequest.promise;
}

async function ensureDriveToken() {
    if (hasUsableDriveToken()) {
        return;
    }

    throw new Error("login_required");
}

async function driveFetchJson(url) {
    await ensureDriveToken();
    const response = await fetch(url, {
        headers: { Authorization: `Bearer ${DRIVE_STATE.accessToken}` }
    });
    if (!response.ok) {
        throw new Error(`Drive API error ${response.status}`);
    }
    return response.json();
}

async function driveFetchBlob(fileId) {
    const cached = DRIVE_STATE.objectUrlCache.get(fileId);
    if (cached) return cached;

    const persisted = await getDriveBlobFromPersistentCache(fileId);
    if (persisted) {
        const persistedObjectUrl = URL.createObjectURL(persisted);
        rememberObjectUrl(fileId, persistedObjectUrl);
        return persistedObjectUrl;
    }

    await ensureDriveToken();

    const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`;
    const response = await fetch(url, {
        headers: { Authorization: `Bearer ${DRIVE_STATE.accessToken}` }
    });

    if (!response.ok) {
        throw new Error(`Drive download failed ${response.status}`);
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    rememberObjectUrl(fileId, objectUrl);
    setDriveBlobToPersistentCache(fileId, blob);
    return objectUrl;
}

async function listDriveFolderMedia(folderId) {
    // Search query syntax is documented in Drive "Search for files and folders".
    // We filter: in folder + not trashed + image/* or video/*.
    const q = `'${folderId}' in parents and trashed=false and (mimeType contains 'image/' or mimeType contains 'video/')`;

    const params = new URLSearchParams({
        q,
        pageSize: "1000",
        fields: "files(id,name,mimeType,thumbnailLink,modifiedTime),nextPageToken",
        supportsAllDrives: "true",
        includeItemsFromAllDrives: "true"
    });

    const url = `https://www.googleapis.com/drive/v3/files?${params.toString()}`;
    const data = await driveFetchJson(url);
    return Array.isArray(data.files) ? data.files : [];
}

const DRIVE_FILE_LIST_CACHE_KEY = "valentine_drive_file_list_cache";
const DRIVE_FILE_LIST_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function getDriveFileListCache() {
    try {
        const cached = readJsonStorage(DRIVE_FILE_LIST_CACHE_KEY, null);
        if (!cached || !cached.files || !cached.timestamp) {
            return null;
        }
        
        // Check if cache is still valid
        const age = Date.now() - cached.timestamp;
        if (age > DRIVE_FILE_LIST_CACHE_TTL_MS) {
            // Cache expired
            localStorage.removeItem(DRIVE_FILE_LIST_CACHE_KEY);
            return null;
        }
        
        return cached.files;
    } catch (_error) {
        return null;
    }
}

function setDriveFileListCache(files) {
    try {
        writeJsonStorage(DRIVE_FILE_LIST_CACHE_KEY, {
            files: files,
            timestamp: Date.now()
        });
    } catch (_error) {
        // Cache save failed, continue without cache
    }
}

function clearDriveFileListCache() {
    try {
        localStorage.removeItem(DRIVE_FILE_LIST_CACHE_KEY);
    } catch (_error) {
        // no-op
    }
}

async function loadDriveMediaAfterAuth() {
    if (!DRIVE_STATE.folderId) {
        throw new Error("folder_id_missing");
    }

    // Try to load from cache first for better UX
    const cachedFiles = getDriveFileListCache();
    let files;
    
    if (cachedFiles && cachedFiles.length > 0) {
        // Use cached files immediately
        files = cachedFiles;
        
        // Fetch fresh data in background and update cache
        listDriveFolderMedia(DRIVE_STATE.folderId)
            .then((freshFiles) => {
                if (freshFiles && freshFiles.length > 0) {
                    setDriveFileListCache(freshFiles);
                    
                    // Only refresh gallery if files changed
                    const freshIds = freshFiles.map(f => f.id).sort().join(',');
                    const cachedIds = cachedFiles.map(f => f.id).sort().join(',');
                    if (freshIds !== cachedIds) {
                        validMedia = freshFiles
                            .map((file) => ({
                                path: `drive:${file.id}`,
                                isVideo: String(file.mimeType || "").startsWith("video/"),
                                mimeType: file.mimeType,
                                name: file.name,
                                thumb: buildDriveThumbnailById(file.id),
                                thumbFallback: optimizeDriveThumbnailUrl(file.thumbnailLink || "")
                            }))
                            .sort((a, b) => sortMediaPaths(a.name || a.path, b.name || b.path));
                        refreshGallery();
                    }
                }
            })
            .catch(() => {
                // Background fetch failed, keep using cache
            });
    } else {
        // No cache, fetch fresh data
        files = await listDriveFolderMedia(DRIVE_STATE.folderId);
        if (!files.length) {
            throw new Error("no_files_found");
        }
        // Save to cache
        setDriveFileListCache(files);
    }

    validMedia = files
        .map((file) => ({
            path: `drive:${file.id}`,
            isVideo: String(file.mimeType || "").startsWith("video/"),
            mimeType: file.mimeType,
            name: file.name,
            thumb: buildDriveThumbnailById(file.id),
            thumbFallback: optimizeDriveThumbnailUrl(file.thumbnailLink || "")
        }))
        .sort((a, b) => sortMediaPaths(a.name || a.path, b.name || b.path));

    hideDriveAuthUI();
    refreshGallery();
}

function signOutDrive() {
    if (window.google?.accounts?.oauth2?.revoke && DRIVE_STATE.accessToken) {
        try {
            window.google.accounts.oauth2.revoke(DRIVE_STATE.accessToken, () => {});
        } catch (_error) {
            // no-op
        }
    }

    DRIVE_STATE.accessToken = null;
    DRIVE_STATE.tokenExpiresAt = 0;
    setDriveSignedInState(false);
    clearDriveTokenRefreshTimer();
    clearDriveSession();
    clearDriveFileListCache(); // Clear file list cache
    releaseDriveObjectUrlCache();
    clearDriveBlobPersistentCache();
    validMedia = [];
    refreshGallery();
    showDriveAuthUI();
    setDriveStatus("Signed out. Sign in to unlock our gallery again.");
    if (driveSignInBtn) {
        driveSignInBtn.disabled = false;
    }
}

function ensureDriveAuthHandlersBound() {
    if (driveSignInBtn && !driveSignInBtn.dataset.bound) {
        driveSignInBtn.dataset.bound = "true";
        driveSignInBtn.addEventListener("click", () => {
            startDriveSignInFlow("consent");
        });
    }
}

function clearDriveAuthInitRetry() {
    if (driveAuthInitRetryTimerId) {
        clearTimeout(driveAuthInitRetryTimerId);
        driveAuthInitRetryTimerId = null;
    }
    driveAuthInitRetryCount = 0;
}

function scheduleDriveAuthInitRetry() {
    if (driveAuthInitRetryTimerId || driveAuthInitRetryCount >= DRIVE_AUTH_INIT_RETRY_MAX) {
        return;
    }

    driveAuthInitRetryCount += 1;
    driveAuthInitRetryTimerId = setTimeout(() => {
        driveAuthInitRetryTimerId = null;
        setupDriveAuth();
    }, DRIVE_AUTH_INIT_RETRY_DELAY_MS);
}

function buildDriveSignInErrorMessage(error) {
    const code = normalizeDriveAuthError(error);

    if (code.includes("invalid_client")) {
        return buildDriveAuthConfigHint("invalid_client");
    }

    if (code.includes("popup_closed")) {
        return "Sign-in popup was closed. Tap Sign in again.";
    }

    if (code.includes("access_denied")) {
        return "Access denied for this Google account. Use an account shared to the folder.";
    }

    if (code.includes("no_files_found")) {
        return "No files found. Make sure this Google account has access to the Drive folder.";
    }

    if (code.includes("interaction_required") || code.includes("login_required") || code.includes("consent_required")) {
        return "Session expired. Please tap Sign in with Google again.";
    }

    return "Could not load from Google Drive. Check sharing permissions and OAuth setup.";
}

async function startDriveSignInFlow(prompt = "consent") {
    if (!DRIVE_STATE.tokenClient) {
        setupDriveAuth();
        if (!DRIVE_STATE.tokenClient) {
            setDriveStatus("Google Sign-In is still loading. Please tap again in a moment.", true);
            return;
        }
    }

    if (!window.google?.accounts?.oauth2) {
        setDriveStatus("Google Sign-In library is not available right now.", true);
        return;
    }

    setDriveStatus("Signing in to Google Drive…");
    if (driveSignInBtn) {
        driveSignInBtn.disabled = true;
    }

    try {
        await requestDriveAccessToken(prompt);
        setDriveStatus("Loading our memories… 🌻");
        await loadDriveMediaAfterAuth();
        if (!panicMode && isRomanceSceneVisible()) {
            setTimeout(() => { if (!isMusicPlaying && !panicMode) playSelectedMusic(); }, 500);
        }
    } catch (error) {
        console.error(error);
        const code = normalizeDriveAuthError(error);
        const silentRestoreFailed = prompt === "none" && (
            code.includes("interaction_required") ||
            code.includes("login_required") ||
            code.includes("consent_required")
        );

        if (silentRestoreFailed) {
            setDriveSignedInState(false);
            showDriveAuthUI();
            setDriveStatus("Drive session needs a quick re-login. Tap Sign in with Google.");
            return;
        }

        showDriveAuthUI();
        setDriveStatus(buildDriveSignInErrorMessage(error), true);
    } finally {
        if (driveSignInBtn) {
            driveSignInBtn.disabled = false;
        }
    }
}

function setupDriveAuth() {
    const clientId = getDriveClientId();
    const folderId = getDriveFolderId();
    ensureDriveAuthHandlersBound();

    if (!hasDriveConfig()) {
        const reason = !clientId
            ? "Client ID is missing."
            : (!folderId ? "Folder ID/URL is missing or invalid." : "");
        clearDriveAuthInitRetry();
        showDriveAuthUI();
        setDriveStatus(buildDriveAuthConfigHint(reason), true);
        driveSignInBtn && (driveSignInBtn.disabled = true);
        return;
    }

    DRIVE_STATE.folderId = folderId;

    showDriveAuthUI();
    setDriveStatus("🔒 Sign in with the Google account I shared the folder with to unlock our memories.");

    if (!window.google?.accounts?.oauth2) {
        setDriveStatus("Loading Google Sign-In library…");
        scheduleDriveAuthInitRetry();
        return;
    }

    clearDriveAuthInitRetry();

    if (!DRIVE_STATE.tokenClient) {
        DRIVE_STATE.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: CONFIG.drive.scopes,
            callback: () => {},
            error_callback: (oauthError) => {
                if (DRIVE_STATE.tokenRequest) {
                    const message = normalizeDriveAuthError(oauthError || "oauth_error");
                    const pending = DRIVE_STATE.tokenRequest;
                    DRIVE_STATE.tokenRequest = null;
                    pending?.reject(new Error(message || "oauth_error"));
                }
            }
        });
    }
    const restoredToken = restoreDriveTokenFromSession();
    if (restoredToken) {
        setDriveStatus("Drive session restored. Loading gallery…");
        loadDriveMediaAfterAuth()
            .then(() => {
                if (!panicMode && isRomanceSceneVisible()) {
                    setTimeout(() => { if (!isMusicPlaying && !panicMode) playSelectedMusic(); }, 500);
                }
            })
            .catch((error) => {
                console.error(error);
                setDriveSignedInState(false);
                showDriveAuthUI();
                setDriveStatus("Stored session expired. Tap Sign in with Google.", true);
            });
        return;
    }

    setDriveSignedInState(false);
    if (hasValidDriveSession()) {
        setDriveStatus("Session found. Tap Sign in with Google to reconnect.");
    }
}


let mediaLoaded = false;
let currentIndex = 0;
let lightboxRenderToken = 0;
let touchStartX = 0;
let touchEndX = 0;
const MEDIA_RENDER_CHUNK = 36;
let mediaRenderToken = 0;
const videoThumbCache = new Map();
let videoThumbObserver = null;
const videoThumbQueue = [];
let videoThumbBusy = false;
const FALLBACK_VIDEO_THUMB = buildFallbackThumbData("VIDEO");

function buildFallbackThumbData(label) {
    const text = encodeURIComponent(String(label || "MEDIA"));
    const svg = `
<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360' viewBox='0 0 640 360'>
<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='#f6c5d8'/><stop offset='100%' stop-color='#5a3e53'/></linearGradient></defs>
<rect width='640' height='360' fill='url(#g)'/>
<circle cx='320' cy='180' r='44' fill='rgba(0,0,0,0.42)'/>
<polygon points='307,157 307,203 346,180' fill='white'/>
<text x='320' y='322' text-anchor='middle' fill='white' font-family='Arial, sans-serif' font-size='26' opacity='0.88'>${text}</text>
</svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function initVideoThumbObserver() {
    if (videoThumbObserver || typeof IntersectionObserver === "undefined") {
        return;
    }

    videoThumbObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) {
                return;
            }

            const img = entry.target;
            const path = img.dataset.videoPath;
            if (path) {
                enqueueVideoThumb(path, img);
            }
            videoThumbObserver.unobserve(img);
        });
    }, { rootMargin: "240px 0px 240px 0px" });
}

function enqueueVideoThumb(path, imageEl) {
    if (!path || !imageEl) {
        return;
    }

    if (videoThumbCache.has(path)) {
        const cached = videoThumbCache.get(path);
        if (cached) {
            imageEl.src = cached;
            imageEl.classList.remove("video-thumb-loading");
        } else {
            imageEl.src = FALLBACK_VIDEO_THUMB;
            imageEl.classList.remove("video-thumb-loading");
            imageEl.classList.add("video-thumb-fallback");
        }
        return;
    }

    videoThumbQueue.push({ path, imageEl });
    processVideoThumbQueue();
}

async function processVideoThumbQueue() {
    if (videoThumbBusy || !videoThumbQueue.length) {
        return;
    }

    videoThumbBusy = true;
    const { path, imageEl } = videoThumbQueue.shift();
    const thumbnail = await createVideoThumbnail(path);

    if (thumbnail) {
        videoThumbCache.set(path, thumbnail);
        imageEl.src = thumbnail;
        imageEl.classList.remove("video-thumb-loading");
    } else {
        videoThumbCache.set(path, "");
        imageEl.src = FALLBACK_VIDEO_THUMB;
        imageEl.classList.remove("video-thumb-loading");
        imageEl.classList.add("video-thumb-fallback");
    }

    videoThumbBusy = false;
    processVideoThumbQueue();
}

function createVideoThumbnail(path) {
    return new Promise((resolve) => {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.muted = true;
        video.playsInline = true;
        video.crossOrigin = "anonymous";
        video.src = path;

        let settled = false;
        const clean = () => {
            video.removeAttribute("src");
            video.load();
        };
        const done = (value) => {
            if (settled) {
                return;
            }
            settled = true;
            clean();
            resolve(value);
        };

        const onFail = () => done(null);
        const onSeeked = () => {
            try {
                const canvas = document.createElement("canvas");
                const ratio = video.videoWidth > 0 ? video.videoHeight / video.videoWidth : 9 / 16;
                const width = Math.min(video.videoWidth || 640, 640);
                const height = Math.max(1, Math.round(width * ratio));
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    done(null);
                    return;
                }
                ctx.drawImage(video, 0, 0, width, height);
                done(canvas.toDataURL("image/jpeg", 0.72));
            } catch (_error) {
                done(null);
            }
        };

        video.addEventListener("error", onFail, { once: true });
        video.addEventListener("loadeddata", () => {
            try {
                const target = Math.min(1, Math.max(0.15, (video.duration || 0) * 0.15));
                video.currentTime = Number.isFinite(target) ? target : 0.2;
            } catch (_error) {
                done(null);
            }
        }, { once: true });
        video.addEventListener("seeked", onSeeked, { once: true });
        setTimeout(() => done(null), 4200);
    });
}

async function autoDiscoverMedia() {
    if (mediaLoaded) {
        return;
    }

    mediaLoaded = true;


    // If configured, load media from Google Drive (shared users only).
    if (hasDriveConfig() && String(CONFIG.mediaSource).toLowerCase() === "drive") {
        setupDriveAuth();
        return;
    }
    try {
        const response = await fetch("./media-manifest.json", { cache: "default" });
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }

        const data = await response.json();
        const mediaList = Array.isArray(data) ? data : data.media;
        if (Array.isArray(mediaList) && mediaList.length > 0) {
            validMedia = mediaList.map((item) => ({
                path: item.path,
                isVideo: Boolean(item.isVideo)
            }));

            validMedia.sort((a, b) => sortMediaPaths(a.path, b.path));
            refreshGallery();
            return;
        }
    } catch (error) {
        console.warn("Could not fetch /media-manifest.json, using lightweight fallback:", error);
    }

    fallbackProbeMediaList();
}

function fallbackProbeMediaList() {
    const folders = ["images", "Images"];
    const imageExts = ["jpg", "jpeg", "png", "webp", "dng"];
    const videoExts = ["mp4", "webm", "mov"];
    const sampleLimit = 24;
    const candidateList = [];

    for (let i = 1; i <= sampleLimit; i += 1) {
        folders.forEach((folder) => {
            imageExts.forEach((ext) => candidateList.push({ path: `${folder}/${i}.${ext}`, isVideo: false }));
            videoExts.forEach((ext) => candidateList.push({ path: `${folder}/${i}.${ext}`, isVideo: true }));
        });
    }

    probeCandidatesInBatches(candidateList, 16);
}

async function probeCandidatesInBatches(candidates, batchSize) {
    for (let i = 0; i < candidates.length; i += batchSize) {
        const batch = candidates.slice(i, i + batchSize);
        const checks = batch.map((candidate) =>
            fetch(candidate.path, { method: "HEAD", cache: "force-cache" })
                .then((resp) => ({ ok: resp.ok, candidate }))
                .catch(() => ({ ok: false, candidate }))
        );

        const results = await Promise.all(checks);
        results.forEach((result) => {
            if (result.ok) {
                addValidMedia(result.candidate.path, result.candidate.isVideo, false);
            }
        });
    }

    refreshGallery();
}

function addValidMedia(path, isVideo, renderNow = true) {
    if (validMedia.find((item) => item.path === path)) {
        return;
    }

    validMedia.push({ path, isVideo });

    if (renderNow) {
        validMedia.sort((a, b) => sortMediaPaths(a.path, b.path));
        refreshGallery();
    }
}

function sortMediaPaths(aPath, bPath) {
    const aMatch = aPath.match(/(\d+)/);
    const bMatch = bPath.match(/(\d+)/);

    if (aMatch && bMatch && Number(aMatch[1]) !== Number(bMatch[1])) {
        return Number(aMatch[1]) - Number(bMatch[1]);
    }

    return aPath.localeCompare(bPath);
}

function refreshGallery() {
    initVideoThumbObserver();
    const token = ++mediaRenderToken;
    galleryRoot.innerHTML = "";

    const renderBatch = (startIndex) => {
        if (token !== mediaRenderToken) {
            return;
        }

        const fragment = document.createDocumentFragment();
        const endIndex = Math.min(startIndex + MEDIA_RENDER_CHUNK, validMedia.length);

        for (let index = startIndex; index < endIndex; index += 1) {
            const media = validMedia[index];
            const item = document.createElement("div");
            item.className = "media-item";
            item.classList.add(`media-v${(index % 4) + 1}`);
            item.onclick = () => openLightbox(index);
            if (media.isVideo) {
                if (isDriveMedia(media)) {
                    const fileId = sanitizeAttribute(driveFileId(media));
                    const thumbSrc = sanitizeAttribute(media.thumb || media.thumbFallback || "");
                    const fallbackSrc = sanitizeAttribute(media.thumbFallback || "");
                    const initialSrc = thumbSrc || FALLBACK_VIDEO_THUMB;
                    item.innerHTML = `
                        <img class="video-thumb ${thumbSrc ? "" : "drive-thumb-placeholder"}" alt="video" loading="lazy" decoding="async" data-drive-id="${fileId}" src="${initialSrc}">
                        <div class="play-overlay"><div class="play-icon">&#9658;</div></div>
                    `;

                    const thumbEl = item.querySelector(".video-thumb");
                    if (thumbEl) {
                        thumbEl.addEventListener("error", () => {
                            if (!thumbEl.dataset.fallbackTried && fallbackSrc && thumbEl.src !== fallbackSrc) {
                                thumbEl.dataset.fallbackTried = "1";
                                thumbEl.src = fallbackSrc;
                                return;
                            }
                            thumbEl.classList.add("drive-thumb-placeholder");
                            thumbEl.src = FALLBACK_VIDEO_THUMB;
                        });
                    }
                } else {
                    const videoPath = sanitizeAttribute(media.path);
                    item.innerHTML = `
                        <img class="video-thumb video-thumb-loading" alt="video thumbnail" loading="lazy" decoding="async" data-video-path="${videoPath}" src="${FALLBACK_VIDEO_THUMB}">
                        <div class="play-overlay"><div class="play-icon">&#9658;</div></div>
                    `;

                    const thumbEl = item.querySelector(".video-thumb");
                    if (thumbEl) {
                        if (videoThumbObserver) {
                            videoThumbObserver.observe(thumbEl);
                        } else {
                            enqueueVideoThumb(media.path, thumbEl);
                        }
                    }
                }
            } else {
                if (isDriveMedia(media)) {
                    const fileId = sanitizeAttribute(driveFileId(media));
                    const thumbSrc = sanitizeAttribute(media.thumb || media.thumbFallback || "");
                    const fallbackSrc = sanitizeAttribute(media.thumbFallback || "");
                    const initialSrc = thumbSrc || FALLBACK_VIDEO_THUMB;
                    item.innerHTML = `
                        <img class="${thumbSrc ? "" : "drive-thumb-placeholder"}" alt="" loading="lazy" decoding="async" data-drive-id="${fileId}" src="${initialSrc}">
                    `;

                    const imgEl = item.querySelector("img");
                    if (imgEl) {
                        imgEl.addEventListener("error", () => {
                            if (!imgEl.dataset.fallbackTried && fallbackSrc && imgEl.src !== fallbackSrc) {
                                imgEl.dataset.fallbackTried = "1";
                                imgEl.src = fallbackSrc;
                                return;
                            }
                            imgEl.classList.add("drive-thumb-placeholder");
                            imgEl.src = FALLBACK_VIDEO_THUMB;
                        });
                    }
                } else {
                    const imagePath = sanitizeAttribute(media.path);
                    item.innerHTML = `
                        <img src="${imagePath}" loading="lazy" decoding="async" alt="">
                    `;
                }
            }

            fragment.appendChild(item);
        }

        galleryRoot.appendChild(fragment);

        if (endIndex < validMedia.length) {
            requestAnimationFrame(() => renderBatch(endIndex));
        }
    };

    renderBatch(0);
}

function openLightbox(index) {
    currentIndex = index;
    lightbox.classList.add("active");
    showSlide(index, 1);
}


function buildSlideWrapper(direction) {
    const wrapper = document.createElement("div");
    wrapper.className = `drive-slide ${direction >= 0 ? "slide-enter-right" : "slide-enter-left"}`;
    wrapper.innerHTML = `<div class="loader" aria-label="Loading"></div>`;
    return wrapper;
}

function isLightboxRenderCurrent(renderToken) {
    return renderToken === lightboxRenderToken && lightbox.classList.contains("active");
}

function showLightboxError(wrapper, message, renderToken) {
    if (!isLightboxRenderCurrent(renderToken)) {
        return;
    }
    wrapper.innerHTML = `<div class="media-error">${message}</div>`;
}

function clearWrapperLoader(wrapper) {
    const loader = wrapper.querySelector(".loader");
    if (loader) {
        loader.remove();
    }
}

function mountIframeWithLoader(wrapper, iframe, renderToken, errorMessage) {
    if (!isLightboxRenderCurrent(renderToken)) {
        return;
    }

    iframe.style.opacity = "0";
    iframe.style.transition = "opacity 180ms ease";
    wrapper.appendChild(iframe);

    let settled = false;
    const reveal = () => {
        if (settled || !isLightboxRenderCurrent(renderToken)) {
            return;
        }
        settled = true;
        clearWrapperLoader(wrapper);
        iframe.style.opacity = "1";
    };

    iframe.addEventListener("load", reveal, { once: true });

    // Iframes don't reliably fire error for cross-origin content.
    setTimeout(() => {
        if (!settled && isLightboxRenderCurrent(renderToken)) {
            reveal();
        }
    }, 3500);

    setTimeout(() => {
        if (!settled && isLightboxRenderCurrent(renderToken)) {
            settled = true;
            showLightboxError(wrapper, errorMessage, renderToken);
        }
    }, 12000);
}

function mountImageWithLoader(wrapper, image, renderToken, errorMessage, onFirstErrorRetry) {
    if (!isLightboxRenderCurrent(renderToken)) {
        return;
    }

    image.style.opacity = "0";
    image.style.transition = "opacity 180ms ease";
    wrapper.appendChild(image);

    let settled = false;
    let retried = false;
    const reveal = () => {
        if (settled || !isLightboxRenderCurrent(renderToken)) {
            return;
        }
        settled = true;
        clearWrapperLoader(wrapper);
        image.style.opacity = "1";
    };

    image.addEventListener("load", reveal);
    image.addEventListener("error", async () => {
        if (settled || !isLightboxRenderCurrent(renderToken)) {
            return;
        }

        if (!retried && typeof onFirstErrorRetry === "function") {
            retried = true;
            try {
                const retrySrc = await onFirstErrorRetry();
                if (retrySrc && isLightboxRenderCurrent(renderToken)) {
                    image.src = retrySrc;
                    return;
                }
            } catch (_error) {
                // Ignore and fall through to error UI.
            }
        }

        settled = true;
        showLightboxError(wrapper, errorMessage, renderToken);
    });

    if (image.complete && image.naturalWidth > 0) {
        reveal();
    }

    setTimeout(() => {
        if (!settled && isLightboxRenderCurrent(renderToken)) {
            settled = true;
            showLightboxError(wrapper, errorMessage, renderToken);
        }
    }, 15000);
}

function mountVideoWithLoader(wrapper, video, renderToken, errorMessage) {
    if (!isLightboxRenderCurrent(renderToken)) {
        return;
    }

    video.style.opacity = "0";
    video.style.transition = "opacity 180ms ease";
    wrapper.appendChild(video);

    let settled = false;
    const reveal = () => {
        if (settled || !isLightboxRenderCurrent(renderToken)) {
            return;
        }
        settled = true;
        clearWrapperLoader(wrapper);
        video.style.opacity = "1";
    };

    video.addEventListener("loadeddata", reveal, { once: true });
    video.addEventListener("canplay", reveal, { once: true });
    video.addEventListener("error", () => {
        if (settled || !isLightboxRenderCurrent(renderToken)) {
            return;
        }
        settled = true;
        showLightboxError(wrapper, errorMessage, renderToken);
    }, { once: true });

    setTimeout(() => {
        if (!settled && isLightboxRenderCurrent(renderToken)) {
            settled = true;
            showLightboxError(wrapper, errorMessage, renderToken);
        }
    }, 15000);
}

function buildDriveSlideElement(media, direction, renderToken) {
    const wrapper = buildSlideWrapper(direction);
    const fileId = driveFileId(media);

    if (!DRIVE_STATE.isSignedIn || !DRIVE_STATE.accessToken) {
        showLightboxError(wrapper, "Please sign in to Google Drive to view this media.", renderToken);
        return wrapper;
    }

    if (media.isVideo) {
        player.pauseVideo();
    }

    const quality = getSelectedMediaQuality();

    if (media.isVideo && quality !== "original") {
        const iframe = document.createElement("iframe");
        iframe.src = buildDrivePreviewUrl(fileId);
        iframe.allow = "autoplay; fullscreen";
        iframe.referrerPolicy = "no-referrer-when-downgrade";
        iframe.className = direction >= 0 ? "slide-enter-right" : "slide-enter-left";
        iframe.style.width = "min(96vw, 1200px)";
        iframe.style.height = "min(80vh, 680px)";
        iframe.style.border = "0";
        iframe.setAttribute("allowfullscreen", "true");
        mountIframeWithLoader(wrapper, iframe, renderToken, "Could not load video preview from Google Drive.");
        return wrapper;
    }

    if (!media.isVideo && quality !== "original") {
        const width = getImageWidthForQuality(quality);
        const image = document.createElement("img");
        image.src = buildDriveThumbnailById(fileId, width || 1280) || media.thumbFallback || media.thumb || "";
        image.alt = "memory";
        image.loading = "eager";
        image.decoding = "async";
        image.className = direction >= 0 ? "slide-enter-right" : "slide-enter-left";
        mountImageWithLoader(
            wrapper,
            image,
            renderToken,
            "Could not load media from Google Drive.",
            async () => driveFetchBlob(fileId)
        );
        return wrapper;
    }

    driveFetchBlob(fileId)
        .then((objectUrl) => {
            if (!isLightboxRenderCurrent(renderToken)) {
                return;
            }

            if (media.isVideo) {
                const video = document.createElement("video");
                video.src = objectUrl;
                video.controls = true;
                video.autoplay = true;
                video.preload = "metadata";
                video.playsInline = true;
                video.poster = FALLBACK_VIDEO_THUMB;
                video.className = direction >= 0 ? "slide-enter-right" : "slide-enter-left";
                mountVideoWithLoader(wrapper, video, renderToken, "Could not load media from Google Drive.");
                return;
            }

            const image = document.createElement("img");
            image.src = objectUrl;
            image.alt = "";
            image.loading = "eager";
            image.decoding = "async";
            image.className = direction >= 0 ? "slide-enter-right" : "slide-enter-left";
            mountImageWithLoader(wrapper, image, renderToken, "Could not load media from Google Drive.");
        })
        .catch((err) => {
            console.error(err);
            const authCode = normalizeDriveAuthError(err);
            if (
                authCode.includes("interaction_required") ||
                authCode.includes("login_required") ||
                authCode.includes("consent_required")
            ) {
                showDriveAuthUI();
                setDriveSignedInState(false);
                setDriveStatus("Google Drive session expired. Please sign in again.", true);
            }
            showLightboxError(wrapper, "Could not load media from Google Drive.", renderToken);
        });

    return wrapper;
}

function buildSlideElement(media, direction, renderToken) {
    if (isDriveMedia(media)) {
        return buildDriveSlideElement(media, direction, renderToken);
    }

    const wrapper = buildSlideWrapper(direction);
    if (media.isVideo) {
        if (true) {
            player.pauseVideo();
        }

        const video = document.createElement("video");
        video.src = media.path;
        video.controls = true;
        video.autoplay = true;
        video.preload = "metadata";
        video.playsInline = true;
        video.poster = FALLBACK_VIDEO_THUMB;
        video.className = direction >= 0 ? "slide-enter-right" : "slide-enter-left";
        mountVideoWithLoader(wrapper, video, renderToken, "Could not load video.");
        return wrapper;
    }

    const image = document.createElement("img");
    image.src = media.path;
    image.alt = "";
    image.loading = "eager";
    image.decoding = "async";
    image.className = direction >= 0 ? "slide-enter-right" : "slide-enter-left";
    mountImageWithLoader(wrapper, image, renderToken, "Could not load image.");
    return wrapper;
}

function showSlide(index, direction) {
    lbContainer.innerHTML = "";
    const media = validMedia[index];

    if (!media) {
        return;
    }

    lightboxRenderToken += 1;
    const renderToken = lightboxRenderToken;
    const element = buildSlideElement(media, direction, renderToken);
    lbContainer.appendChild(element);
}

function closeLightbox() {
    lightboxRenderToken += 1;
    lightbox.classList.remove("active");
    lbContainer.innerHTML = "";

    if (isMusicPlaying && !panicMode) {
        resumeMusic();
    }
}

lbPrev.addEventListener("click", (event) => {
    event.stopPropagation();
    changeSlide(-1);
});

lbNext.addEventListener("click", (event) => {
    event.stopPropagation();
    changeSlide(1);
});

lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox || event.target === lbContainer) {
        closeLightbox();
    }
});

lightbox.addEventListener("touchstart", (event) => {
    touchStartX = event.changedTouches[0].screenX;
}, { passive: true });

lightbox.addEventListener("touchend", (event) => {
    touchEndX = event.changedTouches[0].screenX;

    if (touchEndX < touchStartX - 50) {
        changeSlide(1);
    }

    if (touchEndX > touchStartX + 50) {
        changeSlide(-1);
    }
}, { passive: true });

document.addEventListener("keydown", (event) => {
    if (!lightbox.classList.contains("active")) {
        return;
    }

    if (event.key === "ArrowRight") {
        changeSlide(1);
        return;
    }

    if (event.key === "ArrowLeft") {
        changeSlide(-1);
        return;
    }

    if (event.key === "Escape") {
        closeLightbox();
    }
});

function changeSlide(direction) {
    if (!validMedia.length) {
        return;
    }

    currentIndex += direction;

    if (currentIndex >= validMedia.length) {
        currentIndex = 0;
    }

    if (currentIndex < 0) {
        currentIndex = validMedia.length - 1;
    }

    showSlide(currentIndex, direction);
}

/* ==========================================
   Extras
   ========================================== */
let timerStarted = false;

function formatTwoDigits(num) {
    return String(num).padStart(2, "0");
}

function startTimer() {
    if (timerStarted) {
        return;
    }

    timerStarted = true;

    const startDate = new Date(`${CONFIG.valentineDate}T00:00:00`);
    setInterval(() => {
        const now = new Date();

        let years = now.getFullYear() - startDate.getFullYear();
        const yearAnchor = new Date(startDate);
        yearAnchor.setFullYear(startDate.getFullYear() + years);

        if (yearAnchor > now) {
            years -= 1;
            yearAnchor.setFullYear(startDate.getFullYear() + years);
        }

        const diffFromAnchor = now - yearAnchor;
        const days = Math.floor(diffFromAnchor / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffFromAnchor / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diffFromAnchor / (1000 * 60)) % 60);
        const seconds = Math.floor((diffFromAnchor / 1000) % 60);

        const totalDays = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));

        timerElement.innerHTML = `${years} years, ${days} days, ${formatTwoDigits(hours)}:${formatTwoDigits(minutes)}:${formatTwoDigits(seconds)} since our first Valentine's Day<br>Total: ${totalDays} days loving you`;
    }, 1000);
}

let iLetter = 0;
function typeWriter() {
    if (iLetter < CONFIG.loveLetter.length) {
        const char = CONFIG.loveLetter.charAt(iLetter);
        document.getElementById("typewriter").innerHTML += char === "\n" ? "<br>" : char;
        iLetter += 1;
        setTimeout(typeWriter, 50);
        return;
    }

    document.getElementById("typewriter").innerHTML += '<span class="cursor"></span>';
}

function createAtmosphere(char, amount) {
    const container = document.getElementById("atmosphere");
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    const sideBandPercent = isMobile ? 22 : 30;
    const minSize = isMobile ? 18 : 16;
    const maxExtraSize = isMobile ? 22 : 26;

    const pickSidePercent = () => {
        const sideOffset = Math.random() * sideBandPercent;
        if (Math.random() < 0.5) {
            return sideOffset;
        }
        return 100 - sideOffset;
    };

    for (let i = 0; i < amount; i += 1) {
        const el = document.createElement("div");
        el.className = "particle";
        el.innerText = char || CONFIG.rainItems[Math.floor(Math.random() * CONFIG.rainItems.length)];
        el.style.left = `${pickSidePercent()}vw`;
        el.style.top = "110vh";
        el.style.opacity = String(0.35 + (Math.random() * 0.35));
        el.style.fontSize = `${Math.random() * maxExtraSize + minSize}px`;
        el.style.animationDuration = `${Math.random() * 5 + 6}s`;
        container.appendChild(el);
        setTimeout(() => el.remove(), 9000);
    }
}

let atmosphereLoopId = null;

function getAtmosphereIntervalMs() {
    return window.matchMedia("(max-width: 768px)").matches ? 900 : 620;
}

function startAtmosphereLoop() {
    if (atmosphereLoopId) {
        return;
    }

    atmosphereLoopId = setInterval(() => {
        if (document.hidden) {
            return;
        }
        createAtmosphere(null, 1);
    }, getAtmosphereIntervalMs());
}

function stopAtmosphereLoop() {
    if (!atmosphereLoopId) {
        return;
    }

    clearInterval(atmosphereLoopId);
    atmosphereLoopId = null;
}

document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        stopAtmosphereLoop();
        return;
    }

    startAtmosphereLoop();
});

window.addEventListener("resize", () => {
    if (!atmosphereLoopId) {
        return;
    }
    stopAtmosphereLoop();
    startAtmosphereLoop();
});

function initializeApp() {
    bindVerifyFormDraftListeners();
    setVerifyRequiredFields();
    startAtmosphereLoop();
    const hasAuthorizedSession = restoreAuthorizedSession();
    if (!hasAuthorizedSession) {
        restoreVerifyFormDraft();
    }
}

initializeApp();

/* ==========================================
   MUSIC PLAYER UI - DISPLAY ONLY
   Does NOT interfere with original auto-play system!
   ========================================== */
(function() {
    'use strict';
    
    let playerUI, trackTitle, moodLabel, trackPosition;
    let playBtn, prevBtn, nextBtn, moodRomanticBtn, moodFunnyBtn;
    let uiInitialized = false;
    
    // Get track name from CONFIG
    function getTrackName(mood, index) {
        if (CONFIG.trackNames && CONFIG.trackNames[mood] && CONFIG.trackNames[mood][index]) {
            return CONFIG.trackNames[mood][index];
        }
        return 'Track ' + (index + 1);
    }
    
    // Initialize UI elements
    function initUI() {
        playerUI = document.getElementById('music-player-ui');
        trackTitle = document.getElementById('track-title');
        moodLabel = document.getElementById('mood-label');
        trackPosition = document.getElementById('track-position');
        playBtn = document.getElementById('player-play-btn');
        prevBtn = document.getElementById('player-prev-btn');
        nextBtn = document.getElementById('player-next-btn');
        moodRomanticBtn = document.getElementById('mood-romantic-btn');
        moodFunnyBtn = document.getElementById('mood-funny-btn');
        
        if (!playerUI) return false;
        
        // Show UI
        playerUI.classList.remove('hidden');
        
        // IMPORTANT: Only attach event listeners, don't change any playing logic
        if (playBtn) {
            playBtn.addEventListener('click', function() {
                // Just call the existing function - don't add new logic!
                if (typeof isMusicPlaying !== 'undefined' && isMusicPlaying) {
                    if (typeof player !== 'undefined' && player && player.pauseVideo) {
                        player.pauseVideo();
                    }
                } else {
                    if (typeof playSelectedMusic === 'function') {
                        playSelectedMusic();
                    }
                }
            });
        }
        
        if (prevBtn) {
            prevBtn.addEventListener('click', function() {
                playPreviousTrack();
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', function() {
                if (typeof playNextSelectedTrack === 'function') {
                    playNextSelectedTrack();
                }
            });
        }
        
        if (moodRomanticBtn) {
            moodRomanticBtn.addEventListener('click', function() {
                if (typeof setSelectedMusicFromVibe === 'function') {
                    setSelectedMusicFromVibe('romantic', { allowPlaybackResume: true });
                }
            });
        }
        
        if (moodFunnyBtn) {
            moodFunnyBtn.addEventListener('click', function() {
                if (typeof setSelectedMusicFromVibe === 'function') {
                    setSelectedMusicFromVibe('funny', { allowPlaybackResume: true });
                }
            });
        }
        
        // Start update loop
        updateUILoop();
        uiInitialized = true;
        return true;
    }
    
    // Update UI based on state (PASSIVE - just reads, doesn't control)
    function updateUI() {
        if (!trackTitle) return;
        
        // Update track info
        if (typeof selectedMood !== 'undefined' && typeof selectedMusicIndex !== 'undefined') {
            const mood = selectedMood;
            const index = selectedMusicIndex;
            const list = typeof selectedMusicList !== 'undefined' ? selectedMusicList : [];
            
            trackTitle.textContent = getTrackName(mood, index);
            if (moodLabel) {
                moodLabel.textContent = mood === 'romantic' ? 'Romantic' : 'Funny';
            }
            if (trackPosition) {
                trackPosition.textContent = 'Track ' + (index + 1) + '/' + list.length;
            }
        }
        
        // Update play/pause button
        if (playBtn) {
            const iconPlay = playBtn.querySelector('.icon-play');
            const iconPause = playBtn.querySelector('.icon-pause');
            const isPlaying = typeof isMusicPlaying !== 'undefined' && isMusicPlaying;
            
            if (iconPlay && iconPause) {
                if (isPlaying) {
                    iconPlay.classList.add('hidden');
                    iconPause.classList.remove('hidden');
                } else {
                    iconPlay.classList.remove('hidden');
                    iconPause.classList.add('hidden');
                }
            }
        }
        
        // Update mood buttons
        if (moodRomanticBtn && moodFunnyBtn) {
            const mood = typeof selectedMood !== 'undefined' ? selectedMood : 'romantic';
            if (mood === 'romantic') {
                moodRomanticBtn.classList.add('active');
                moodFunnyBtn.classList.remove('active');
            } else {
                moodFunnyBtn.classList.add('active');
                moodRomanticBtn.classList.remove('active');
            }
        }
    }
    
    // Update loop using RAF for performance
    function updateUILoop() {
        if (uiInitialized) {
            updateUI();
            requestAnimationFrame(updateUILoop);
        }
    }
    
    // Watch for main scene to appear
    function watchMainScene() {
        const mainScene = document.getElementById('screen-main');
        if (!mainScene) return;
        
        const observer = new MutationObserver(function() {
            if (!mainScene.classList.contains('hidden') && !uiInitialized) {
                setTimeout(function() {
                    initUI();
                }, 300);
            }
        });
        
        observer.observe(mainScene, {
            attributes: true,
            attributeFilter: ['class']
        });
        
        // Check immediately
        if (!mainScene.classList.contains('hidden')) {
            setTimeout(function() {
                initUI();
            }, 300);
        }
    }
    
    // Start watching
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            initMP3PlayerOnLoad();
            setTimeout(watchMainScene, 200);
        });
    } else {
        initMP3PlayerOnLoad();
        setTimeout(watchMainScene, 200);
    }
})();

async function initMP3PlayerOnLoad() {
    console.log("🎵 Starting MP3 player...");
    await autoDetectMusicFiles();
    const ready = initMusicPlayer();
    if (ready) setupMusicPlayerControls();
}
