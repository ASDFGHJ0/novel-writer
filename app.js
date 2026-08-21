/* 墨屿 · 小说写作台 — 主逻辑 */
'use strict';

const LS_KEY = 'moyu.writer.v1';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------- 工具 ---------- */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const wc = s => (s || '').replace(/\s/g, '').length;
const esc = s => (s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const todayKey = (offset = 0) => {
  const d = new Date(); d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const WEEK_CN = ['日', '一', '二', '三', '四', '五', '六'];

const ICONS = {
  chev: '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',
  pencil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  dice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12a10 10 0 1 0 20 0 10 10 0 0 0-20 0"/><path d="M2 12h20"/><path d="M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20Z"/></svg>',
  insert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>',
};

const PROMPTS = [
  '主角最害怕失去的东西,在这一章里真的失去了。',
  '让两个互不信任的人被迫共处一夜,而且必须合作才能活到天亮。',
  '写一个谎言被当场拆穿的瞬间,但拆穿者选择了沉默。',
  '这一章全程用对话推进,不许出现任何心理描写。',
  '安排一场看似无关紧要的重逢,三年后它会改变所有人的命运。',
  '让反派做一件好事,而这好事比他的恶行更让人不安。',
  '写下主角第一次意识到自己是错的,但已经回不了头。',
  '用一件物品的流转(一把伞、一封信、一枚棋子)串起三个场景。',
  '这一章的结尾,有人敲门。门后是最不该出现的那个人。',
  '写一个胜利的场景,但读者看完只会感到悲凉。',
  '让某个配角说出全书的题眼,他自己却不知道。',
  '把最激烈的冲突放在最安静的环境里:病房、灵堂、雨夜的公交站。',
  '主角得到梦寐以求的东西,代价由他最爱的人支付。',
  '写一段回忆杀,但每个细节都在暗示叙事者在撒谎。',
  '让两个人都在等对方先开口,直到机会永远错过。',
  '设计一个规矩,这一章里有人打破了它,世界因此改变。',
  '写一场雨。雨停的时候,有一个人没有从雨里走出来。',
  '让主角救了一个不该救的人。',
];

/* ---------- 数据 ---------- */
function seedProject() {
  const volId = uid(), ch1 = uid(), ch2 = uid();
  return {
    id: uid(),
    title: '未命名作品',
    synopsis: '',
    tree: [{
      id: volId, title: '第1卷', closed: false,
      chapters: [
        { id: ch1, title: '第1章 起笔', content: '', outline: '' },
        { id: ch2, title: '第2章', content: '', outline: '' },
      ],
    }],
    chars: [],
    notes: [],
    daily: {},
    createdAt: Date.now(),
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && Array.isArray(s.projects) && s.projects.length) return s;
    }
  } catch (e) { /* 数据损坏则重新初始化 */ }
  const p = seedProject();
  return {
    settings: { theme: 'light', fontSize: 16, tab: 'outline', dailyGoal: 2000 },
    projects: [p],
    activeProjectId: p.id,
    activeChapterId: p.tree[0].chapters[0].id,
  };
}

let state = loadState();

const persist = () => localStorage.setItem(LS_KEY, JSON.stringify(state));
const persistSoon = debounce(() => { persist(); setSaved(); }, 600);

const project = () => state.projects.find(p => p.id === state.activeProjectId) || state.projects[0];
function locate(chId) {
  for (const vol of project().tree) {
    const ch = vol.chapters.find(c => c.id === chId);
    if (ch) return { vol, ch };
  }
  return null;
}
const activeChapter = () => locate(state.activeChapterId);
const bookWords = p => p.tree.reduce((n, v) => n + v.chapters.reduce((m, c) => m + wc(c.content), 0), 0);
const chapterCount = p => p.tree.reduce((n, v) => n + v.chapters.length, 0);

/* ---------- DOM ---------- */
const el = {
  bookTitle: $('#bookTitle'), ring: $('#goalRing'), ringFg: $('#ringFg'), ringNum: $('#ringNum'),
  searchInput: $('#searchInput'), searchResults: $('#searchResults'),
  btnFocus: $('#btnFocus'), btnGraph: $('#btnGraph'), btnTheme: $('#btnTheme'),
  btnExport: $('#btnExport'), exportMenu: $('#exportMenu'),
  projectSelect: $('#projectSelect'), btnNewProject: $('#btnNewProject'),
  tree: $('#tree'), btnAddChapter: $('#btnAddChapter'), btnAddVolume: $('#btnAddVolume'),
  chapterTitle: $('#chapterTitle'), editor: $('#editor'),
  stChapter: $('#stChapter'), stTotal: $('#stTotal'), stSaved: $('#stSaved'),
  btnFontMinus: $('#btnFontMinus'), btnFontPlus: $('#btnFontPlus'),
  panelBody: $('#panelBody'), importFile: $('#importFile'),
};

/* ---------- 保存状态 ---------- */
function setSaved() {
  const d = new Date();
  el.stSaved.textContent = `已保存 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function setDirty() { el.stSaved.textContent = '保存中…'; persistSoon(); }

/* ---------- 字数 / 目标环 ---------- */
function bumpDaily(delta) {
  if (!delta) return;
  const p = project(), k = todayKey();
  p.daily[k] = Math.max(0, (p.daily[k] || 0) + delta);
}
function updateCounts() {
  const p = project();
  const found = activeChapter();
  el.stChapter.textContent = `本章 ${found ? wc(found.ch.content) : 0} 字`;
  el.stTotal.textContent = `全书 ${bookWords(p)} 字`;
  updateRing();
}
function updateRing() {
  const goal = Math.max(1, state.settings.dailyGoal || 2000);
  const today = project().daily[todayKey()] || 0;
  const pct = Math.min(1, today / goal);
  el.ringFg.style.strokeDashoffset = (97.4 * (1 - pct)).toFixed(1);
  el.ringNum.textContent = pct >= 1 ? '✓' : Math.round(pct * 100);
  el.ring.classList.toggle('done', pct >= 1);
  el.ring.title = `今日码字 ${today} / ${goal}`;
}

/* ---------- 作品切换 ---------- */
function renderProjects() {
  el.projectSelect.innerHTML = state.projects
    .map(p => `<option value="${p.id}"${p.id === project().id ? ' selected' : ''}>${esc(p.title)}</option>`).join('');
  el.bookTitle.value = project().title;
}

/* ---------- 作品树 ---------- */
function renderTree() {
  const p = project();
  if (!p.tree.length || !chapterCount(p)) {
    el.tree.innerHTML = '<div class="tree-empty">还没有章节<br>点击下方按钮开始吧</div>';
    return;
  }
  el.tree.innerHTML = p.tree.map(vol => `
    <div class="vol${vol.closed ? ' closed' : ''}" data-id="${vol.id}">
      <div class="vol-header" data-id="${vol.id}">
        ${ICONS.chev}
        <span class="vol-title">${esc(vol.title)}</span>
        <span class="vol-acts">
          <button class="mini-icon" data-act="add-ch" title="在此卷新建章节">${ICONS.plus}</button>
          <button class="mini-icon" data-act="rename" title="重命名分卷">${ICONS.pencil}</button>
          <button class="mini-icon danger" data-act="del-vol" title="删除分卷">${ICONS.trash}</button>
        </span>
      </div>
      <div class="ch-list">
        ${vol.chapters.map(ch => `
          <div class="ch-item${ch.id === state.activeChapterId ? ' active' : ''}" draggable="true" data-id="${ch.id}">
            <span class="ch-name">${esc(ch.title)}</span>
            <span class="ch-count">${wc(ch.content)}</span>
            <span class="ch-acts">
              <button class="mini-icon" data-act="rename" title="重命名章节">${ICONS.pencil}</button>
              <button class="mini-icon danger" data-act="del-ch" title="删除章节">${ICONS.trash}</button>
            </span>
          </div>`).join('')}
      </div>
    </div>`).join('');
}

function startRename(container, initial, onCommit) {
  const span = container.querySelector('.vol-title, .ch-name');
  if (!span) return;
  const input = document.createElement('input');
  input.className = 'rename-input';
  input.value = initial;
  span.replaceWith(input);
  input.focus(); input.select();
  let done = false;
  const finish = ok => {
    if (done) return; done = true;
    if (ok && input.value.trim()) onCommit(input.value.trim());
    renderTree();
  };
  input.addEventListener('blur', () => finish(true));
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') finish(true);
    if (e.key === 'Escape') finish(false);
  });
}

function addVolume(title) {
  project().tree.push({ id: uid(), title: title || `第${project().tree.length + 1}卷`, closed: false, chapters: [] });
  renderTree(); setDirty();
}

function addChapter(volId) {
  const p = project();
  let vol = p.tree.find(v => v.id === volId);
  if (!vol) {
    if (!p.tree.length) addVolume('第1卷');
    vol = p.tree[p.tree.length - 1];
  }
  const n = p.tree.reduce((x, v) => x + v.chapters.length, 0) + 1;
  const ch = { id: uid(), title: `第${n}章`, content: '', outline: '' };
  vol.chapters.push(ch);
  vol.closed = false;
  state.activeChapterId = ch.id;
  renderTree(); renderEditor(); renderPanel(); setDirty();
  el.chapterTitle.focus(); el.chapterTitle.select();
}

/* ---------- 编辑器 ---------- */
function renderEditor() {
  const found = activeChapter();
  const has = !!found;
  el.chapterTitle.disabled = el.editor.disabled = !has;
  el.chapterTitle.value = has ? found.ch.title : '';
  el.editor.value = has ? found.ch.content : '';
  el.editor.placeholder = has ? '从这里开始你的故事……' : '先在左侧新建或选中一个章节';
  updateCounts();
}

/* ---------- 面板 ---------- */
function setTab(tab) {
  state.settings.tab = tab;
  $$('.panel-tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  renderPanel();
  persist();
}

function renderPanel() {
  const tab = state.settings.tab;
  if (tab === 'outline') renderOutline();
  else if (tab === 'chars') renderCards('chars');
  else if (tab === 'notes') renderCards('notes');
  else if (tab === 'inspire') renderInspire();
  else if (tab === 'stats') renderStats();
}

function renderOutline() {
  const p = project(), found = activeChapter();
  el.panelBody.innerHTML = `
    <p class="field-label">全书简介</p>
    <textarea class="outline-syn" id="synInput" placeholder="一句话故事、主线梗概……">${esc(p.synopsis)}</textarea>
    <p class="field-label">本章大纲</p>
    ${found
      ? `<textarea class="outline-ch" id="chOutlineInput" placeholder="${esc(found.ch.title)} 的情节要点……">${esc(found.ch.outline)}</textarea>`
      : '<div class="outline-empty">选中一个章节后,在这里写本章大纲</div>'}`;
  $('#synInput').addEventListener('input', e => { p.synopsis = e.target.value; setDirty(); });
  const co = $('#chOutlineInput');
  if (co && found) co.addEventListener('input', e => { found.ch.outline = e.target.value; setDirty(); });
}

const CHAR_TAGS = ['主角', '配角', '反派', '其他'];
function renderCards(kind) {
  const p = project();
  const list = kind === 'chars' ? p.chars : p.notes;
  const isChar = kind === 'chars';
  el.panelBody.innerHTML = `
    ${list.map(item => `
      <div class="card" data-id="${item.id}">
        <div class="card-head">
          <input class="card-name" type="text" value="${esc(item.name)}" placeholder="${isChar ? '角色名' : '设定名称'}" spellcheck="false">
          ${isChar ? `<select class="tag-select">${CHAR_TAGS.map(t => `<option${t === item.tag ? ' selected' : ''}>${t}</option>`).join('')}</select>` : ''}
        </div>
        <textarea placeholder="${isChar ? '外貌、性格、动机、弧光……' : '世界观、规则、地点、物品……'}">${esc(item.desc)}</textarea>
        <div class="card-actions"><button class="link-btn" data-act="del">${ICONS.trash}删除</button></div>
      </div>`).join('')}
    <button class="add-block" id="addCard">${ICONS.plus}${isChar ? '添加角色' : '添加设定'}</button>`;

  $$('.card', el.panelBody).forEach(card => {
    const item = list.find(x => x.id === card.dataset.id);
    if (!item) return;
    $('.card-name', card).addEventListener('input', e => { item.name = e.target.value; setDirty(); });
    $('textarea', card).addEventListener('input', e => { item.desc = e.target.value; setDirty(); });
    const tag = $('.tag-select', card);
    if (tag) tag.addEventListener('change', e => { item.tag = e.target.value; setDirty(); });
    $('[data-act="del"]', card).addEventListener('click', () => {
      const i = list.indexOf(item);
      if (i > -1) list.splice(i, 1);
      renderCards(kind); setDirty();
    });
  });
  $('#addCard').addEventListener('click', () => {
    list.push(isChar
      ? { id: uid(), name: '', tag: '配角', desc: '' }
      : { id: uid(), name: '', desc: '' });
    renderCards(kind); setDirty();
    const names = $$('.card-name', el.panelBody);
    if (names.length) names[names.length - 1].focus();
  });
}

let inspireIdx = Math.floor(Math.random() * PROMPTS.length);
function renderInspire() {
  el.panelBody.innerHTML = `
    <div class="inspire-card">${esc(PROMPTS[inspireIdx])}</div>
    <div class="inspire-actions">
      <button class="solid-btn plain" id="btnNextPrompt">${ICONS.dice}换一个</button>
      <button class="solid-btn" id="btnInsertPrompt">${ICONS.insert}插入本章</button>
    </div>`;
  $('#btnNextPrompt').addEventListener('click', () => {
    inspireIdx = (inspireIdx + 1 + Math.floor(Math.random() * (PROMPTS.length - 1))) % PROMPTS.length;
    renderInspire();
  });
  $('#btnInsertPrompt').addEventListener('click', () => {
    const found = activeChapter();
    if (!found) return;
    const t = el.editor;
    const text = `【灵感】${PROMPTS[inspireIdx]}\n`;
    const pos = t.selectionStart ?? t.value.length;
    t.value = t.value.slice(0, pos) + text + t.value.slice(pos);
    t.dispatchEvent(new Event('input'));
    t.focus();
    t.selectionStart = t.selectionEnd = pos + text.length;
  });
}

function renderStats() {
  const p = project();
  const total = bookWords(p), chs = chapterCount(p);
  const today = p.daily[todayKey()] || 0;
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    if ((p.daily[todayKey(-i)] || 0) > 0) streak++;
    else break;
  }
  const goal = state.settings.dailyGoal || 2000;
  const pct = Math.min(100, Math.round(today / Math.max(1, goal) * 100));
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push({ label: WEEK_CN[d.getDay()], words: p.daily[todayKey(-i)] || 0, today: i === 0 });
  }
  const max = Math.max(1, ...days.map(d => d.words));
  el.panelBody.innerHTML = `
    <div class="stat-grid">
      <div class="stat-cell"><div class="stat-num">${total}<em>字</em></div><div class="stat-cap">全书总字数</div></div>
      <div class="stat-cell"><div class="stat-num">${chs}<em>章</em></div><div class="stat-cap">章节数</div></div>
      <div class="stat-cell"><div class="stat-num">${today}<em>字</em></div><div class="stat-cap">今日码字</div></div>
      <div class="stat-cell"><div class="stat-num">${streak}<em>天</em></div><div class="stat-cap">连续写作</div></div>
    </div>
    <div class="goal-row">每日目标 <input type="number" id="goalInput" min="100" step="100" value="${goal}"> 字</div>
    <div class="progress-track"><div class="progress-fill${pct >= 100 ? ' done' : ''}" style="width:${pct}%"></div></div>
    <p class="field-label">近 7 天</p>
    <div class="week-chart">
      ${days.map(d => `
        <div class="day-bar${d.today ? ' today' : ''}">
          <span class="bar-num">${d.words || ''}</span>
          <div class="bar" style="height:${Math.max(2, d.words / max * 100)}%"></div>
          <span class="bar-day">${d.label}</span>
        </div>`).join('')}
    </div>`;
  $('#goalInput').addEventListener('change', e => {
    state.settings.dailyGoal = Math.max(100, parseInt(e.target.value, 10) || 2000);
    renderStats(); updateRing(); persist();
  });
}

/* ---------- 搜索 ---------- */
const doSearch = debounce(() => {
  const q = el.searchInput.value.trim();
  if (!q) { el.searchResults.hidden = true; return; }
  const p = project(), hits = [];
  const lq = q.toLowerCase();
  outer:
  for (const vol of p.tree) for (const ch of vol.chapters) {
    const inTitle = ch.title.toLowerCase().includes(lq);
    const idx = ch.content.toLowerCase().indexOf(lq);
    if (inTitle || idx > -1) {
      let clip = '';
      if (idx > -1) {
        const s = Math.max(0, idx - 24), e = Math.min(ch.content.length, idx + q.length + 36);
        clip = (s > 0 ? '…' : '') + ch.content.slice(s, e).replace(/\n/g, ' ') + (e < ch.content.length ? '…' : '');
        clip = esc(clip).replace(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), m => `<mark>${esc(m)}</mark>`);
      }
      hits.push({ chId: ch.id, title: ch.title, vol: vol.title, clip });
    }
    if (hits.length >= 30) break outer;
  }
  el.searchResults.innerHTML = hits.length
    ? hits.map(h => `<div class="search-hit" data-id="${h.chId}">
        <div><span class="hit-title">${esc(h.title)}</span><span class="hit-vol">${esc(h.vol)}</span></div>
        ${h.clip ? `<div class="hit-clip">${h.clip}</div>` : ''}
      </div>`).join('')
    : '<div class="search-empty">没有找到相关内容</div>';
  el.searchResults.hidden = false;
}, 200);

/* ---------- 导出 / 导入 ---------- */
function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: type || 'text/plain;charset=utf-8' }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
function exportTxt() {
  const p = project();
  let out = `${p.title}\n${'='.repeat(24)}\n\n`;
  if (p.synopsis.trim()) out += `【简介】\n${p.synopsis.trim()}\n\n`;
  p.tree.forEach(vol => {
    out += `\n■ ${vol.title}\n\n`;
    vol.chapters.forEach(ch => { out += `${ch.title}\n\n${ch.content.trim()}\n\n\n`; });
  });
  download(`${p.title}.txt`, out);
}
function exportJson() {
  const p = project();
  download(`${p.title}.备份.json`, JSON.stringify({ app: 'moyu', version: 1, project: p }, null, 2), 'application/json');
}
function importJson(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      const proj = data.project || data;
      if (!proj || !Array.isArray(proj.tree)) throw new Error('bad');
      proj.id = uid();
      proj.title = proj.title || file.name.replace(/\.json$/i, '');
      proj.daily = proj.daily || {}; proj.chars = proj.chars || []; proj.notes = proj.notes || [];
      proj.manualRels = proj.manualRels || [];
      proj.bookmarks = proj.bookmarks || [];
      proj.graphSettings = proj.graphSettings || { layout: 'force', currentChapter: null };
      proj.synopsis = proj.synopsis || '';
      state.projects.push(proj);
      state.activeProjectId = proj.id;
      const first = proj.tree.flatMap(v => v.chapters)[0];
      state.activeChapterId = first ? first.id : null;
      renderAll(); persist();
    } catch (e) { alert('导入失败:文件不是有效的墨屿备份'); }
  };
  reader.readAsText(file);
}

/* ---------- 树拖拽 ---------- */
let dragChId = null;
function bindTreeDnD() {
  el.tree.addEventListener('dragstart', e => {
    const item = e.target.closest('.ch-item');
    if (!item) return;
    dragChId = item.dataset.id;
    e.dataTransfer.effectAllowed = 'move';
  });
  el.tree.addEventListener('dragover', e => {
    if (!dragChId) return;
    const item = e.target.closest('.ch-item');
    const head = e.target.closest('.vol-header');
    $$('.ch-item.drop-before, .ch-item.drop-after, .vol-header.drop-into', el.tree)
      .forEach(x => x.classList.remove('drop-before', 'drop-after', 'drop-into'));
    if (item && item.dataset.id !== dragChId) {
      e.preventDefault();
      const r = item.getBoundingClientRect();
      item.classList.add(e.clientY < r.top + r.height / 2 ? 'drop-before' : 'drop-after');
    } else if (head) {
      e.preventDefault();
      head.classList.add('drop-into');
    }
  });
  el.tree.addEventListener('drop', e => {
    if (!dragChId) return;
    e.preventDefault();
    const p = project();
    const from = locate(dragChId);
    if (!from) return;
    const item = e.target.closest('.ch-item');
    const head = e.target.closest('.vol-header');
    from.vol.chapters.splice(from.vol.chapters.indexOf(from.ch), 1);
    if (item && item.dataset.id !== dragChId) {
      const to = locate(item.dataset.id);
      const r = item.getBoundingClientRect();
      const before = e.clientY < r.top + r.height / 2;
      to.vol.chapters.splice(to.vol.chapters.indexOf(to.ch) + (before ? 0 : 1), 0, from.ch);
    } else if (head) {
      const vol = p.tree.find(v => v.id === head.dataset.id);
      (vol || from.vol).chapters.push(from.ch);
    } else {
      from.vol.chapters.push(from.ch);
    }
    dragChId = null;
    renderTree(); setDirty();
  });
  el.tree.addEventListener('dragend', () => {
    dragChId = null;
    $$('.drop-before, .drop-after, .drop-into', el.tree).forEach(x => x.classList.remove('drop-before', 'drop-after', 'drop-into'));
  });
}

/* ---------- 事件绑定 ---------- */
function bindEvents() {
  el.bookTitle.addEventListener('input', () => {
    project().title = el.bookTitle.value.trim() || '未命名作品';
    renderProjects(); setDirty();
  });

  el.projectSelect.addEventListener('change', () => {
    state.activeProjectId = el.projectSelect.value;
    const first = project().tree.flatMap(v => v.chapters)[0];
    state.activeChapterId = first ? first.id : null;
    renderAll(); persist();
  });
  el.btnNewProject.addEventListener('click', () => {
    const name = prompt('新作品的名字:', '未命名作品');
    if (name === null) return;
    const p = seedProject();
    p.title = name.trim() || '未命名作品';
    state.projects.push(p);
    state.activeProjectId = p.id;
    state.activeChapterId = p.tree[0].chapters[0].id;
    renderAll(); persist();
  });

  el.btnAddChapter.addEventListener('click', () => addChapter());
  el.btnAddVolume.addEventListener('click', () => addVolume());

  el.tree.addEventListener('click', e => {
    const actBtn = e.target.closest('[data-act]');
    const volHeader = e.target.closest('.vol-header');
    const chItem = e.target.closest('.ch-item');
    if (actBtn) {
      e.stopPropagation();
      const act = actBtn.dataset.act;
      if (chItem) {
        const { vol, ch } = locate(chItem.dataset.id) || {};
        if (!ch) return;
        if (act === 'rename') startRename(chItem, ch.title, v => { ch.title = v; if (ch.id === state.activeChapterId) renderEditor(); setDirty(); });
        if (act === 'del-ch' && confirm(`删除「${ch.title}」?此操作不可撤销。`)) {
          vol.chapters.splice(vol.chapters.indexOf(ch), 1);
          if (state.activeChapterId === ch.id) {
            const next = project().tree.flatMap(v => v.chapters)[0];
            state.activeChapterId = next ? next.id : null;
            renderEditor(); renderPanel();
          }
          renderTree(); updateCounts(); setDirty();
        }
      } else if (volHeader) {
        const vol = project().tree.find(v => v.id === volHeader.dataset.id);
        if (!vol) return;
        if (act === 'add-ch') addChapter(vol.id);
        if (act === 'rename') startRename(volHeader, vol.title, v => { vol.title = v; setDirty(); });
        if (act === 'del-vol' && confirm(`删除分卷「${vol.title}」及其中 ${vol.chapters.length} 个章节?`)) {
          const p = project();
          p.tree.splice(p.tree.indexOf(vol), 1);
          if (!locate(state.activeChapterId)) {
            const next = p.tree.flatMap(v => v.chapters)[0];
            state.activeChapterId = next ? next.id : null;
            renderEditor(); renderPanel();
          }
          renderTree(); updateCounts(); setDirty();
        }
      }
      return;
    }
    if (chItem) {
      if (state.activeChapterId !== chItem.dataset.id) {
        state.activeChapterId = chItem.dataset.id;
        renderTree(); renderEditor(); renderPanel(); persist();
      }
      return;
    }
    if (volHeader) {
      const vol = project().tree.find(v => v.id === volHeader.dataset.id);
      if (vol) { vol.closed = !vol.closed; renderTree(); setDirty(); }
    }
  });
  el.tree.addEventListener('dblclick', e => {
    const chItem = e.target.closest('.ch-item');
    if (chItem && !e.target.closest('[data-act]')) {
      const { ch } = locate(chItem.dataset.id) || {};
      if (ch) startRename(chItem, ch.title, v => { ch.title = v; if (ch.id === state.activeChapterId) renderEditor(); setDirty(); });
    }
  });

  el.chapterTitle.addEventListener('input', () => {
    const found = activeChapter();
    if (!found) return;
    found.ch.title = el.chapterTitle.value;
    const item = el.tree.querySelector(`.ch-item[data-id="${found.ch.id}"] .ch-name`);
    if (item) item.textContent = el.chapterTitle.value;
    setDirty();
  });

  el.editor.addEventListener('input', () => {
    const found = activeChapter();
    if (!found) return;
    const before = wc(found.ch.content);
    found.ch.content = el.editor.value;
    bumpDaily(wc(found.ch.content) - before);
    updateCounts();
    const cnt = el.tree.querySelector(`.ch-item[data-id="${found.ch.id}"] .ch-count`);
    if (cnt) cnt.textContent = wc(found.ch.content);
    setDirty();
  });

  el.btnFontMinus.addEventListener('click', () => setFontSize(state.settings.fontSize - 1));
  el.btnFontPlus.addEventListener('click', () => setFontSize(state.settings.fontSize + 1));

  el.btnFocus.addEventListener('click', () => {
    document.body.classList.toggle('focus');
    el.btnFocus.classList.toggle('active', document.body.classList.contains('focus'));
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.body.classList.contains('focus')) el.btnFocus.click();
  });

  el.btnTheme.addEventListener('click', () => {
    state.settings.theme = state.settings.theme === 'dark' ? 'light' : 'dark';
    applyTheme(); persist();
  });

  el.btnExport.addEventListener('click', e => {
    e.stopPropagation();
    el.exportMenu.hidden = !el.exportMenu.hidden;
  });
  el.exportMenu.addEventListener('click', e => {
    const act = e.target.closest('[data-action]');
    if (!act) return;
    el.exportMenu.hidden = true;
    if (act.dataset.action === 'export-txt') exportTxt();
    if (act.dataset.action === 'export-json') exportJson();
    if (act.dataset.action === 'import-json') el.importFile.click();
  });
  el.importFile.addEventListener('change', () => {
    if (el.importFile.files[0]) importJson(el.importFile.files[0]);
    el.importFile.value = '';
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('.menu-wrap')) el.exportMenu.hidden = true;
    if (!e.target.closest('.search-box')) el.searchResults.hidden = true;
  });

  el.searchInput.addEventListener('input', doSearch);
  el.searchInput.addEventListener('focus', doSearch);
  el.searchResults.addEventListener('click', e => {
    const hit = e.target.closest('.search-hit');
    if (!hit) return;
    state.activeChapterId = hit.dataset.id;
    renderTree(); renderEditor(); renderPanel(); persist();
    el.searchResults.hidden = true;
  });

  $$('.panel-tabs button').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));

  el.btnGraph.addEventListener('click', () => window.MoyuGraph && window.MoyuGraph.open());

  window.addEventListener('beforeunload', persist);
}

/* ---------- 初始化 ---------- */
function applyTheme() {
  document.documentElement.dataset.theme = state.settings.theme;
}
function setFontSize(px) {
  state.settings.fontSize = Math.min(24, Math.max(13, px));
  el.editor.style.fontSize = state.settings.fontSize + 'px';
  persist();
}
function renderAll() {
  renderProjects(); renderTree(); renderEditor(); renderPanel(); updateRing();
  $$('.panel-tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === state.settings.tab));
}

/* 供 graph.js 使用的桥 */
window.Moyu = {
  getProject: project,
  wc,
  updateCharacter(name, patch = {}) {
    const p = project();
    const c = p.chars.find(x => x.name === name);
    if (c) {
      if (patch.name && patch.name !== name) c.name = patch.name;
      delete patch.name;
      Object.assign(c, patch);
      if (state.settings.tab === 'chars') renderPanel();
      setDirty();
    }
  },
  addCharacter(name, extra = {}) {
    const p = project();
    if (!p.chars.some(c => c.name === name)) {
      p.chars.push({ id: uid(), name, tag: extra.tag || '配角', desc: extra.desc || '', alias: extra.alias || [], avatar: extra.avatar || '', color: extra.color || '', camp: extra.camp || '中立', faction: extra.faction || '', status: extra.status || '活跃', shape: extra.shape || 'circle' });
      if (state.settings.tab === 'chars') renderPanel();
      setDirty();
    }
  },
  addManualRel(rel) {
    const p = project();
    p.manualRels.push(rel);
    setDirty();
  },
  updateManualRel(id, patch) {
    const p = project();
    const r = p.manualRels.find(x => x.id === id);
    if (r) Object.assign(r, patch);
    setDirty();
  },
  deleteManualRel(id) {
    const p = project();
    const i = p.manualRels.findIndex(x => x.id === id);
    if (i > -1) { p.manualRels.splice(i, 1); setDirty(); }
  },
  saveGraphState(patch) {
    const p = project();
    Object.assign(p.graphSettings || (p.graphSettings = {}), patch);
    setDirty();
  },
  saveBookmarks(list) {
    const p = project();
    p.bookmarks = list;
    setDirty();
  },
  getChapterCount() {
    return chapterCount(project());
  },
};

applyTheme();
setFontSize(state.settings.fontSize);
bindEvents();
bindTreeDnD();
renderAll();
setSaved();

