// ─── CONFIG ──────────────────────────────────────────────────────────────────
const API_URL = 'http://localhost:3001';
// When deployed replace with: 'https://your-app.onrender.com'

// ─── State ────────────────────────────────────────────────────────────────────
let selectedMood = null;
let currentLang  = 'english';
let currentData  = null;
let chatHistory  = [];
let currentUser  = null;

const moodEmojis = {
  happy: '😊', sad: '😢', angry: '😤', anxious: '😰',
  motivated: '🔥', chill: '😌', focused: '🎯',
  heartbroken: '💔', tired: '😴',
};

// ─── Get or ask username ──────────────────────────────────────────────────────
function initUser() {
  const saved = localStorage.getItem('moodbeats_username');
  if (saved) {
    currentUser = saved;
    showWelcome(saved);
    return;
  }

  // First time — ask for name
  const name = prompt('Welcome to MoodBeats 🎵\n\nWhat should we call you?');
  if (name && name.trim().length > 0) {
    currentUser = name.trim();
  } else {
    currentUser = 'Friend';
  }
  localStorage.setItem('moodbeats_username', currentUser);
  showWelcome(currentUser);
}

function showWelcome(name) {
  const tagline = document.getElementById('tagline');
  if (tagline) tagline.textContent = `Welcome back, ${name}. Tell us how you feel.`;
}

// ─── Streak ───────────────────────────────────────────────────────────────────
function updateStreak() {
  const today     = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  let streak      = JSON.parse(localStorage.getItem('moodStreak') || '{"count":0,"last":""}');

  if (streak.last === today) {
    // already logged today
  } else if (streak.last === yesterday) {
    streak = { count: streak.count + 1, last: today };
  } else {
    streak = { count: 1, last: today };
  }

  localStorage.setItem('moodStreak', JSON.stringify(streak));
  document.getElementById('streakCount').textContent = streak.count;
  document.getElementById('streakBar').style.display = 'inline-block';
}

// ─── Tab switching ────────────────────────────────────────────────────────────
function switchTab(tab) {
  ['quick', 'journal', 'history'].forEach(t => {
    document.getElementById(`panel-${t}`).classList.toggle('hidden', t !== tab);
    document.getElementById(`tab-${t}`).classList.toggle('active', t === tab);
  });
  document.getElementById('results').classList.add('hidden');
  document.getElementById('loader').classList.add('hidden');
  document.querySelector('.mode-tabs').style.opacity = '1';
  if (tab === 'history') loadHistory();
}

// ─── Quick mood ───────────────────────────────────────────────────────────────
function selectMood(btn) {
  document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  selectedMood = btn.dataset.mood;
  document.getElementById('btn-quick').disabled = false;
}

async function submitQuick() {
  if (!selectedMood) return;
  showLoader('Getting your playlist...');
  const data = await callAPI({ quickMood: selectedMood, username: currentUser });
  if (data) showResults(data);
}

// ─── Journal ──────────────────────────────────────────────────────────────────
async function submitJournal() {
  const text = document.getElementById('journal-text').value.trim();
  if (!text) { alert('Please write something about your day!'); return; }
  showLoader('AI is reading your emotions...');
  const data = await callAPI({ text, username: currentUser });
  if (data) showResults(data);
}

// ─── History ──────────────────────────────────────────────────────────────────
async function loadHistory() {
  const container = document.getElementById('history-list');
  container.innerHTML = '<div class="history-loading">Fetching your entries from IBM Cloudant...</div>';

  try {
    const res = await fetch(`${API_URL}/api/history?username=${encodeURIComponent(currentUser)}`);
    if (!res.ok) throw new Error('Failed');
    const data = await res.json();
    const entries = data.entries;

    if (!entries || entries.length === 0) {
      container.innerHTML = `
        <div class="history-empty">
          <p>No journal entries yet, ${currentUser}.</p>
          <p>Go to the Journal tab and write your first entry!</p>
        </div>`;
      return;
    }

    container.innerHTML = entries.map(entry => {
      const emoji = moodEmojis[entry.mood] || '🎵';
      const date  = new Date(entry.timestamp).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
      const tonesHTML = entry.tones && entry.tones.length > 0
        ? entry.tones.map(t =>
            `<span class="history-tone">${t.tone_name} ${Math.round(t.score * 100)}%</span>`
          ).join('')
        : '';

      return `
        <div class="history-card">
          <div class="history-header">
            <span class="history-mood">${emoji} ${capitalize(entry.mood)}</span>
            <span class="history-date">${date}</span>
          </div>
          ${entry.text ? `<p class="history-text">"${entry.text}"</p>` : ''}
          ${tonesHTML ? `<div class="history-tones">${tonesHTML}</div>` : ''}
        </div>`;
    }).join('');

  } catch (err) {
    container.innerHTML = `
      <div class="history-empty">
        <p>Could not load entries. Make sure backend is running.</p>
      </div>`;
  }
}

// ─── API call ─────────────────────────────────────────────────────────────────
async function callAPI(body) {
  try {
    const res = await fetch(`${API_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('API error');
    return await res.json();
  } catch (err) {
    hideLoader();
    alert('Could not reach the server. Make sure the backend is running.');
    return null;
  }
}

// ─── Show results ─────────────────────────────────────────────────────────────
function showResults(data) {
  hideLoader();
  currentData = data;
  currentLang = 'english';
  chatHistory = [];

  const { mood, tones, message } = data;
  const emoji = moodEmojis[mood] || '🎵';

  document.getElementById('mood-label').textContent   = `${emoji} ${capitalize(mood)}`;
  document.getElementById('mood-message').textContent = message || '';

  // Tone bars
  const toneContainer = document.getElementById('tone-bars');
  toneContainer.innerHTML = '';
  if (tones && tones.length > 0) {
    tones.forEach(t => {
      const pct = Math.round(t.score * 100);
      toneContainer.innerHTML += `
        <div class="tone-row">
          <span class="tone-name">${t.tone_name}</span>
          <div class="tone-track">
            <div class="tone-fill" style="width:${pct}%"></div>
          </div>
          <span class="tone-pct">${pct}%</span>
        </div>`;
    });
  } else {
    toneContainer.innerHTML = `<p class="quick-note">Quick mood selected — no AI analysis needed</p>`;
  }

  // Language toggle reset
  document.getElementById('btn-english').classList.add('active');
  document.getElementById('btn-hindi').classList.remove('active');

  renderSongs(data.englishSongs);
  updateStreak();

  // Reset chat UI
  document.getElementById('chatSection').style.display = 'none';
  document.getElementById('talkBtn').style.display     = 'block';
  document.getElementById('chatMessages').innerHTML    = '';

  document.getElementById('results').classList.remove('hidden');
  document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
}

// ─── Language toggle ──────────────────────────────────────────────────────────
function switchLang(lang) {
  currentLang = lang;
  document.getElementById('btn-english').classList.toggle('active', lang === 'english');
  document.getElementById('btn-hindi').classList.toggle('active',   lang === 'hindi');
  renderSongs(lang === 'hindi' ? currentData.hindiSongs : currentData.englishSongs);
}

// ─── Render songs ─────────────────────────────────────────────────────────────
function renderSongs(songs) {
  document.getElementById('song-list').innerHTML = songs.map((s, i) => `
    <a class="song-card" href="${s.url}" target="_blank" rel="noopener">
      <span class="song-num">${String(i + 1).padStart(2, '0')}</span>
      <span class="song-icon">🎵</span>
      <div class="song-info">
        <span class="song-title">${s.title}</span>
        <span class="song-artist">${s.artist}</span>
      </div>
      <span class="song-arrow">↗</span>
    </a>`).join('');
}

// ─── Chat ─────────────────────────────────────────────────────────────────────
function openChat() {
  const mood = currentData ? currentData.mood : 'neutral';

  document.getElementById('talkBtn').style.display     = 'none';
  document.getElementById('chatSection').style.display = 'block';

  const openers = {
    happy:       `Hey ${currentUser}! You seem to be in a good mood today 😊 What's making you happy?`,
    sad:         `Hey ${currentUser}, I'm here. You don't have to go through this alone. Want to tell me what happened?`,
    angry:       `I can tell something's got you fired up, ${currentUser}. I'm listening — what's going on?`,
    anxious:     `Hey ${currentUser}, take a breath. I'm right here. What's been making you feel anxious?`,
    motivated:   `You're giving off some serious energy today, ${currentUser}! What's got you so fired up?`,
    focused:     `In the zone, huh ${currentUser}? What are you working on?`,
    heartbroken: `I'm so sorry you're going through this, ${currentUser}. I'm here — do you want to talk about it?`,
    tired:       `You sound exhausted, ${currentUser}. What's been draining you lately?`,
    chill:       `Nice, taking it easy today ${currentUser}. How's everything going?`,
  };

  const firstMessage = openers[mood] || `Hey ${currentUser}, I'm here. How are you feeling? Tell me what's on your mind.`;

  chatHistory = [];
  appendChatMessage('ai', firstMessage);
  chatHistory.push({ role: 'assistant', content: firstMessage });

  document.getElementById('chatSection').scrollIntoView({ behavior: 'smooth' });
  document.getElementById('chatInput').focus();
}

async function sendChat() {
  const input = document.getElementById('chatInput');
  const text  = input.value.trim();
  if (!text) return;

  appendChatMessage('user', text);
  chatHistory.push({ role: 'user', content: text });
  input.value = '';

  const typingId = appendTyping();

  try {
    const res = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: chatHistory,
        mood: currentData ? currentData.mood : 'neutral',
        username: currentUser,
      }),
    });

    removeTyping(typingId);

    if (!res.ok) throw new Error('Chat failed');
    const data = await res.json();

    appendChatMessage('ai', data.reply);
    chatHistory.push({ role: 'assistant', content: data.reply });

  } catch (err) {
    removeTyping(typingId);
    appendChatMessage('ai', "Sorry, I couldn't connect. Make sure the backend is running.");
  }
}

function appendChatMessage(sender, text) {
  const box = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className   = `chat-msg ${sender === 'ai' ? 'chat-msg-ai' : 'chat-msg-user'}`;
  div.textContent = text;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

function appendTyping() {
  const box = document.getElementById('chatMessages');
  const div = document.createElement('div');
  const id  = 'typing-' + Date.now();
  div.id          = id;
  div.className   = 'chat-msg chat-msg-ai chat-typing';
  div.textContent = '...';
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
  return id;
}

function removeTyping(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// ─── Loader ───────────────────────────────────────────────────────────────────
function showLoader(msg) {
  ['panel-quick', 'panel-journal', 'panel-history'].forEach(id =>
    document.getElementById(id).classList.add('hidden')
  );
  document.querySelector('.mode-tabs').style.opacity = '0.3';
  document.getElementById('loader-text').textContent = msg;
  document.getElementById('loader').classList.remove('hidden');
  document.getElementById('results').classList.add('hidden');
}

function hideLoader() {
  document.getElementById('loader').classList.add('hidden');
  document.querySelector('.mode-tabs').style.opacity = '1';
}

// ─── Reset ────────────────────────────────────────────────────────────────────
function reset() {
  selectedMood = null;
  currentData  = null;
  currentLang  = 'english';
  chatHistory  = [];
  document.getElementById('results').classList.add('hidden');
  document.getElementById('journal-text').value = '';
  document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
  document.getElementById('btn-quick').disabled = true;
  document.getElementById('chatSection').style.display = 'none';
  document.getElementById('talkBtn').style.display     = 'block';
  document.getElementById('chatMessages').innerHTML    = '';
  switchTab('quick');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── Init ─────────────────────────────────────────────────────────────────────
// Runs when page loads
initUser();

// ─── Util ─────────────────────────────────────────────────────────────────────
function capitalize(str) { return str.charAt(0).toUpperCase() + str.slice(1); }