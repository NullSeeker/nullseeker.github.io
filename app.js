/* DieoDex — chat scaffold (placeholder responses)
   Later: replace placeholderLLM() with fetch() to your Worker/OpenRouter.
*/
const els = {
  app: document.getElementById('app'),
  sidebar: document.getElementById('sidebar'),
  menuBtn: document.getElementById('menuBtn'),
  newChatBtn: document.getElementById('newChatBtn'),
  sessionList: document.getElementById('sessionList'),
  chat: document.getElementById('chat'),
  chatInner: document.getElementById('chatInner'),
  hero: document.getElementById('hero'),
  prompt: document.getElementById('prompt'),
  sendBtn: document.getElementById('sendBtn'),
  clearBtn: document.getElementById('clearBtn'),
  exportBtn: document.getElementById('exportBtn'),
  settingsBtn: document.getElementById('settingsBtn'),
  themeBtn: document.getElementById('themeBtn'),
  settingsModal: document.getElementById('settingsModal'),
  apiHintModal: document.getElementById('apiHintModal'),
  saveSettingsBtn: document.getElementById('saveSettingsBtn'),
  endpointInput: document.getElementById('endpointInput'),
  modelInput: document.getElementById('modelInput'),
  apiKeyInput: document.getElementById('apiKeyInput'),
  persistToggle: document.getElementById('persistToggle'),
  soundToggle: document.getElementById('soundToggle'),
  typingSpeed: document.getElementById('typingSpeed'),
  modelPill: document.getElementById('modelPill'),
  tryDemoBtn: document.getElementById('tryDemoBtn'),
  openApiHintBtn: document.getElementById('openApiHintBtn'),
  chatTitle: document.getElementById('chatTitle'),
  chatSubtitle: document.getElementById('chatSubtitle'),
  agentBadge: document.getElementById('agentBadge'),
  agentName: document.getElementById('agentName'),
  agentDesc: document.getElementById('agentDesc'),
};

const STORAGE_KEY = 'dieodex_v1';
const THEME_KEY = 'dieodex_theme';

const state = {
  sessions: [],
  activeId: null,
  persist: true,
  sound: false,
  typingDelay: 18, // ms per char
  endpoint: '',
  model: '',
  agent: 'codex',
};

const agentProfiles = {
  codex: { badge: 'CO', name: 'Codex-like', desc: 'Планирует шаги и отвечает кратко', system: 'Ты аккуратный код-ассистент в стиле Codex.' },
  helper:{ badge: 'HP', name: 'Helper', desc: 'Дружелюбно объясняет и ведёт по шагам', system: 'Ты дружелюбный помощник, объясняй простыми шагами.' },
  dev:   { badge: 'DV', name: 'Dev', desc: 'Строго по делу, пишет код и команды', system: 'Ты инженер: кратко, конкретно, с кодом.' },
};

function nowTime(){
  const d = new Date();
  return d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
}
function uid(){
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function load(){
  const theme = localStorage.getItem(THEME_KEY);
  if(theme) document.documentElement.setAttribute('data-theme', theme);

  const raw = localStorage.getItem(STORAGE_KEY);
  if(!raw) return;
  try{
    const data = JSON.parse(raw);
    state.persist = data.persist ?? true;
    state.sound = data.sound ?? false;
    state.typingDelay = data.typingDelay ?? 18;
    state.endpoint = data.endpoint ?? '';
    state.model = data.model ?? '';
    state.agent = data.agent ?? 'codex';
    state.sessions = Array.isArray(data.sessions) ? data.sessions : [];
    state.activeId = data.activeId ?? (state.sessions[0]?.id ?? null);
  }catch(e){}
}
function save(){
  if(!state.persist) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    persist: state.persist,
    sound: state.sound,
    typingDelay: state.typingDelay,
    endpoint: state.endpoint,
    model: state.model,
    agent: state.agent,
    sessions: state.sessions,
    activeId: state.activeId,
  }));
}

function beep(type='click'){
  if(!state.sound) return;
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.type = 'sine';
  o.frequency.value = type==='send' ? 660 : 520;
  g.gain.value = 0.02;
  o.start();
  setTimeout(()=>{o.stop(); ctx.close();}, 60);
}

function setAgent(agentKey){
  state.agent = agentKey;
  const p = agentProfiles[agentKey] || agentProfiles.codex;
  els.agentBadge.textContent = p.badge;
  els.agentName.textContent = p.name;
  els.agentDesc.textContent = p.desc;
  els.chatSubtitle.textContent = `Режим: ${p.name}. Сейчас заглушки ответов — подключишь OpenRouter позже.`;
  document.querySelectorAll('.chip').forEach(ch=>{
    const on = ch.dataset.agent === agentKey;
    ch.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  save();
}

function ensureSession(){
  if(state.activeId && state.sessions.find(s=>s.id===state.activeId)) return;
  const s = { id: uid(), title: 'Новый чат', createdAt: Date.now(), messages: [] };
  state.sessions.unshift(s);
  state.activeId = s.id;
  save();
}
function getActive(){ return state.sessions.find(s=>s.id===state.activeId); }

function escapeHtml(str){
  return String(str).replace(/[&<>"]/g, (c)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
}

function renderSessions(){
  els.sessionList.innerHTML = '';
  state.sessions.slice(0, 12).forEach(s=>{
    const div = document.createElement('div');
    div.className = 'session' + (s.id === state.activeId ? ' active' : '');
    div.innerHTML = `
      <div style="min-width:0">
        <div class="name">${escapeHtml(s.title || 'Чат')}</div>
        <div class="meta">${new Date(s.createdAt).toLocaleDateString()} · ${s.messages.length} msg</div>
      </div>
      <div class="x" title="Удалить">✕</div>
    `;
    div.addEventListener('click', (e)=>{
      const isX = e.target && (e.target.classList.contains('x'));
      if(isX){ deleteSession(s.id); return; }
      state.activeId = s.id;
      save(); renderSessions(); renderChat();
      beep('click');
      closeSidebarMobile();
    });
    els.sessionList.appendChild(div);
  });
}
function deleteSession(id){
  state.sessions = state.sessions.filter(s=>s.id!==id);
  if(state.activeId===id) state.activeId = state.sessions[0]?.id ?? null;
  save(); renderSessions(); renderChat();
  beep('click');
}

function scrollBottom(){ els.chat.scrollTop = els.chat.scrollHeight; }

function msgEl(role, content, time, isTyping=false){
  const wrap = document.createElement('div');
  wrap.className = 'msg';
  const ai = role === 'assistant';
  wrap.innerHTML = `
    <div class="avatar ${ai?'ai':''}">${ai ? 'DX' : 'ME'}</div>
    <div class="bubble ${ai?'ai':''}">
      <div class="meta-line">
        <div class="role">${ai ? 'DIEODEX' : 'USER'}</div>
        <div class="time">${time || nowTime()}</div>
      </div>
      <div class="text">${isTyping ? '<span class="typing">Печатает<span class="dots"><span></span><span></span><span></span></span></span>' : escapeHtml(content)}</div>
    </div>
  `;
  return wrap;
}

function renderChat(){
  const s = getActive();
  els.chatInner.innerHTML = '';
  if(!s || s.messages.length===0){
    els.chatInner.appendChild(els.hero);
    return;
  }
  s.messages.forEach(m=>els.chatInner.appendChild(msgEl(m.role, m.content, m.time)));
  scrollBottom();
}

function setTitleFromFirstUserMessage(s){
  const first = s.messages.find(m=>m.role==='user');
  if(!first) return;
  const t = first.content.trim().slice(0, 38);
  if(t && s.title === 'Новый чат') s.title = t;
}

function autoGrow(){
  els.prompt.style.height = 'auto';
  els.prompt.style.height = Math.min(180, els.prompt.scrollHeight) + 'px';
}

async function send(){
  const text = els.prompt.value.trim();
  if(!text) return;
  ensureSession();
  const s = getActive();

  s.messages.push({ role:'user', content:text, time: nowTime() });
  els.prompt.value = '';
  autoGrow();
  setTitleFromFirstUserMessage(s);
  save(); renderSessions();

  els.chatInner.appendChild(msgEl('user', text));
  scrollBottom();
  beep('send');

  const typingNode = msgEl('assistant', '', nowTime(), true);
  els.chatInner.appendChild(typingNode);
  scrollBottom();

  const profile = agentProfiles[state.agent] || agentProfiles.codex;
  const full = placeholderLLM(profile, text);

  const out = { role:'assistant', content:'', time: nowTime() };
  const textEl = typingNode.querySelector('.text');
  textEl.innerHTML = '';
  for await (const ch of streamText(full, state.typingDelay)){
    out.content += ch;
    textEl.textContent = out.content;
    scrollBottom();
  }
  s.messages.push(out);
  save();
}

function placeholderLLM(profile, userText){
  const ideas = ['могу предложить план','могу написать код','могу помочь с архитектурой','могу сделать UI/UX','могу оформить README'];
  const pick = ideas[Math.floor(Math.random()*ideas.length)];
  const steps = [
    '1) Уточняю цель и формат результата',
    '2) Делаю короткий план действий',
    '3) Пишу минимальный рабочий пример (MVP)',
    '4) Добавляю улучшения и обработку ошибок',
  ].join('\n');

  return [
    `🧠 [${profile.name}]`,
    `Принял: «${userText}».`,
    '',
    'Вот как бы я действовал:',
    steps,
    '',
    `Если хочешь — ${pick}. Сейчас это заглушка (без реального API).`,
    'Подключишь OpenRouter через Worker — и ответы станут настоящими.',
  ].join('\n');
}

async function* streamText(text, delay=18){
  const chars = [...text];
  for (let i=0;i<chars.length;i++){
    yield chars[i];
    await new Promise(r=>setTimeout(r, delay));
  }
}

function openModal(modal){
  modal.classList.add('show');
  modal.setAttribute('aria-hidden','false');
}
function closeModal(modal){
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden','true');
}
function bindModals(){
  document.querySelectorAll('[data-close="1"]').forEach(el=>{
    el.addEventListener('click', ()=>{
      const m = el.closest('.modal');
      if(m) closeModal(m);
      beep('click');
    });
  });
  document.addEventListener('keydown', (e)=>{
    if(e.key==='Escape'){
      [els.settingsModal, els.apiHintModal].forEach(m=>closeModal(m));
      closeSidebarMobile();
    }
  });
}

function toggleTheme(){
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(THEME_KEY, next);
  beep('click');
}

function newChat(){
  const s = { id: uid(), title: 'Новый чат', createdAt: Date.now(), messages: [] };
  state.sessions.unshift(s);
  state.activeId = s.id;
  save(); renderSessions(); renderChat();
  beep('click');
}
function clearChat(){
  const s = getActive();
  if(!s) return;
  s.messages = [];
  s.title = 'Новый чат';
  save(); renderSessions(); renderChat();
  beep('click');
}

function exportChat(){
  const s = getActive();
  if(!s) return;
  const lines = [];
  lines.push('# DieoDex export');
  lines.push(`# Session: ${s.title}`);
  lines.push(`# Date: ${new Date().toLocaleString()}`);
  lines.push('');
  for(const m of s.messages){
    lines.push(`[${m.time}] ${m.role.toUpperCase()}:`);
    lines.push(m.content);
    lines.push('');
  }
  const blob = new Blob([lines.join('\n')], {type:'text/plain;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dieodex_${(s.title||'chat').replace(/[^a-z0-9_\-]+/gi,'_')}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  beep('click');
}

function openSettings(){
  els.endpointInput.value = state.endpoint || '';
  els.modelInput.value = state.model || '';
  els.apiKeyInput.value = '';
  els.persistToggle.checked = !!state.persist;
  els.soundToggle.checked = !!state.sound;
  els.typingSpeed.value = String(state.typingDelay);
  openModal(els.settingsModal);
}

function saveSettings(){
  state.endpoint = els.endpointInput.value.trim();
  state.model = els.modelInput.value.trim();
  state.persist = els.persistToggle.checked;
  state.sound = els.soundToggle.checked;
  state.typingDelay = Number(els.typingSpeed.value) || 18;

  els.modelPill.textContent = `Model: ${state.model || 'placeholder'}`;

  if(!state.persist) localStorage.removeItem(STORAGE_KEY);
  else save();

  closeModal(els.settingsModal);
  beep('click');
}

function openApiHint(){
  openModal(els.apiHintModal);
  beep('click');
}

function openSidebarMobile(){ els.sidebar.classList.add('open'); }
function closeSidebarMobile(){ els.sidebar.classList.remove('open'); }

function init(){
  load();
  ensureSession();
  setAgent(state.agent);
  renderSessions();
  renderChat();
  els.modelPill.textContent = `Model: ${state.model || 'placeholder'}`;

  els.prompt.addEventListener('input', autoGrow);
  els.sendBtn.addEventListener('click', send);
  els.prompt.addEventListener('keydown', (e)=>{
    if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); send(); }
  });

  els.newChatBtn.addEventListener('click', newChat);
  els.clearBtn.addEventListener('click', clearChat);
  els.exportBtn.addEventListener('click', exportChat);

  els.settingsBtn.addEventListener('click', openSettings);
  els.saveSettingsBtn.addEventListener('click', saveSettings);
  els.themeBtn.addEventListener('click', toggleTheme);

  els.tryDemoBtn.addEventListener('click', ()=>{
    ensureSession();
    const s = getActive();
    if(s.messages.length===0){
      s.messages.push({ role:'assistant', content:'Привет! Я DieoDex (заглушка). Напиши что-нибудь — я отвечу красиво 🙂', time: nowTime() });
      save(); renderChat();
    }
    els.prompt.focus();
    beep('click');
  });
  els.openApiHintBtn.addEventListener('click', openApiHint);

  els.menuBtn.addEventListener('click', ()=>{
    if(els.sidebar.classList.contains('open')) closeSidebarMobile();
    else openSidebarMobile();
    beep('click');
  });

  document.querySelectorAll('.chip').forEach(ch=>{
    ch.addEventListener('click', ()=>{ setAgent(ch.dataset.agent); beep('click'); });
  });

  document.getElementById('attachBtn').addEventListener('click', ()=>{
    alert('Вложение пока заглушка 🙂');
    beep('click');
  });

  bindModals();
  autoGrow();
}

init();
