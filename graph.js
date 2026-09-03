/* 墨屿 · 人物关系网 */
'use strict';

window.MoyuGraph = (() => {

  /* ---------- 配色(跟随主题) ---------- */
  const PALETTES = {
    light: {
      node: { '主角': '#14675a', '配角': '#b07d2b', '反派': '#b23c2a', '其他': '#77807f' },
      edge: ['#c4cdca', '#9db5ae', '#5e968a'],
      label: '#22262b', labelSoft: '#77807f', selRing: '#14675a', dimAlpha: 0.18,
    },
    dark: {
      node: { '主角': '#35a892', '配角': '#d0a04a', '反派': '#e06a50', '其他': '#7d868d' },
      edge: ['#31393f', '#3f5b53', '#3f8f7c'],
      label: '#d9dde1', labelSoft: '#7d868d', selRing: '#35a892', dimAlpha: 0.16,
    },
  };
  const pal = () => PALETTES[document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'];

  const CAMP_COLORS = {
    light: { '正派': '#14675a', '邪派': '#b23c2a', '中立': '#77807f', '其他': '#b07d2b' },
    dark: { '正派': '#35a892', '邪派': '#e06a50', '中立': '#7d868d', '其他': '#d0a04a' },
  };
  const CAMPS = ['正派', '邪派', '中立', '其他'];
  const STATUSES = ['活跃', '死亡', '失踪', '离线'];
  const REL_TYPES = ['亲情', '爱情', '师徒', '上下级', '结义', '宿敌', '利用', '暗恋', '挚友', '合作', '仇敌', '守护'];
  const SHAPES = [
    { value: 'circle', label: '圆形' },
    { value: 'hexagon', label: '六边形' },
    { value: 'diamond', label: '菱形' },
  ];

  /* 关系强度:按共现次数分级 */
  const REL_LEVELS = [
    { name: '擦肩', min: 1 },
    { name: '频繁', min: 4 },
    { name: '紧密', min: 8 },
  ];
  const relLevel = w => w >= REL_LEVELS[2].min ? 2 : w >= REL_LEVELS[1].min ? 1 : 0;

  /* ---------- 文本抽取 ---------- */
  const STOP_WORDS = new Set([
    '有人', '众人', '大家', '一个', '没有', '什么', '怎么', '这样', '那样', '自己',
    '他们', '我们', '你们', '她们', '老人', '少年', '少女', '男子', '女子', '孩子',
    '男人', '女人', '父亲', '母亲', '师父', '那人', '人人', '人们', '人间',
    '眼睛', '目光', '脸色', '神情', '声音', '身影', '脚步', '手掌', '手指', '胸口',
    '心底', '脸上', '心中', '脑海', '耳边', '唇边', '嘴角', '眉间', '眉头', '眼底',
    '今天', '明天', '昨天', '晚上', '上午', '下午', '半夜', '凌晨', '此刻', '当时',
    '后来', '之前', '之后', '忽然', '突然', '终于', '渐渐', '慢慢', '缓缓', '立刻',
    '马上', '刚才', '从前', '以后', '未来', '过去', '一时', '片刻', '许久', '很久',
    '岛屿', '海岛', '海岸', '沙滩', '森林', '山脉', '河流', '湖泊', '海洋', '天空',
    '大地', '草原', '沙漠', '山谷', '树林', '花园', '庭院', '屋顶', '房间', '门口',
    '窗前', '楼下', '楼上', '门外', '门内', '路边', '街角', '巷口', '城市', '村庄',
    '城镇', '街道', '广场', '车站', '码头', '港口', '机场', '大厅', '走廊', '楼梯',
    '桌子', '椅子', '门窗', '窗户', '墙壁', '地板', '灯光', '电话', '手机', '书本',
    '文件', '纸张', '香烟', '酒杯', '茶杯', '碗筷', '刀剑', '枪支', '车辆', '船只',
    '飞机', '行李', '包裹', '箱子', '钥匙', '钱包', '手表', '眼镜', '雨伞', '帽子',
    '事情', '东西', '地方', '时候', '原因', '结果', '问题', '答案', '方法', '办法',
    '语气', '眼神', '表情', '动作', '态度', '感觉', '想法', '心情', '情绪', '气氛',
    '空气', '光线', '温度', '时间', '空间', '世界', '社会', '国家', '民族', '家族',
    '家庭', '家门', '天下', '地上', '手里', '心里', '眼前', '身后', '周围', '身旁',
    '看着', '听着', '想着', '说着', '笑着', '问道', '答道', '说道', '知道', '明白',
    '觉得', '认为', '以为', '看见', '听见', '发现', '感到', '想起', '记得', '忘记',
    '准备', '开始', '结束', '继续', '停止', '转身', '回头', '上前', '后退', '坐下',
    '站起', '走来', '走去', '过来', '过去', '出去', '进来', '上下', '前后', '左右',
    '内外', '远近', '大小', '多少', '高低', '长短', '好坏', '真假', '虚实', '轻重',
    '已经', '曾经', '正在', '将要', '就要', '正在', '果然', '竟然', '难道', '也许',
    '或许', '大概', '恐怕', '似乎', '好像', '一定', '必须', '应该', '可以', '能够',
    '愿意', '想要', '需要', '开口', '闭口', '抬头', '低头', '点头', '摇头', '伸手',
    '摆手', '皱眉', '咬牙', '闭眼', '睁眼', '叹气', '呼吸', '心跳', '脚步', '动作',
    '样子', '模样', '神情', '表情', '脸色', '目光', '眼神', '声音', '语气', '话音',
    '口气', '口吻', '耳边', '眼前', '面前', '身后', '周围', '一旁', '一边', '一角',
    '系统', '作者', '读者', '主角', '配角', '反派', '剧情', '故事', '小说', '章节',
  ]);
  const SPEECH_RE = /([一-龥]{2,4}?)(?:开口|说道|问道|答道|喊道|笑道|叹道|喝道|怒道|低语|喃喃|道|说|问|答|喊)/g;
  const BAD_START = /^(的|了|是|在|我|有|和|就|都|而|不|也|你|他|她|它|这|那|为|与|着|被|把|给|让|向|到|从|说|看|想|会|能|可|还|要|以|或|但|么|之)/;
  const BAD_END = /(们|个|位|种|件|条|张|座|片|次|回|说|问道|答道|喊道|笑道|叹道|喝道|怒道|道|问|答|喊|笑|看|想|又|也|都|还|就|才|再|便|却|忽|然|后|前|上|下|里|外|中|内|边|面|头|来|去|过|着|了|的|地|得|口|手|心|头|眼|声|气|经|在|为|以|被|把|给)$/;

  function extract(project) {
    const paras = [];
    for (const vol of project.tree) {
      for (const ch of vol.chapters) {
        ch.content.split(/\n+/).forEach(t => {
          t = t.trim();
          if (t) paras.push({ text: t, chTitle: ch.title, volTitle: vol.title });
        });
      }
    }

    const chars = project.chars.filter(c => c.name && c.name.trim());
    const mentions = new Map();
    const rels = new Map();
    chars.forEach(c => mentions.set(c.name, 0));

    const countIn = (text, name) => {
      let n = 0, i = -1;
      while ((i = text.indexOf(name, i + 1)) > -1) n++;
      return n;
    };

    for (const para of paras) {
      const present = [];
      for (const c of chars) {
        const n = countIn(para.text, c.name);
        if (n) { mentions.set(c.name, mentions.get(c.name) + n); present.push(c.name); }
      }
      for (let i = 0; i < present.length; i++) {
        for (let j = i + 1; j < present.length; j++) {
          const a = present[i], b = present[j];
          const key = a < b ? `${a}|${b}` : `${b}|${a}`;
          if (!rels.has(key)) {
            const clip = para.text.length > 70 ? para.text.slice(0, 70) + '…' : para.text;
            rels.set(key, { a, b, w: 0, evi: clip, eviWhere: `${para.volTitle} · ${para.chTitle}` });
          }
          rels.get(key).w++;
        }
      }
    }

    const known = new Set(chars.map(c => c.name));
    const found = new Map();
    const speechHits = new Map();

    for (const para of paras) {
      SPEECH_RE.lastIndex = 0;
      let m;
      while ((m = SPEECH_RE.exec(para.text)) !== null) {
        const name = m[1];
        if (known.has(name) || STOP_WORDS.has(name)) continue;
        if (BAD_START.test(name) || BAD_END.test(name)) continue;
        found.set(name, (found.get(name) || 0) + 2);
        speechHits.set(name, (speechHits.get(name) || 0) + 1);
      }
    }

    const allText = paras.map(p => p.text).join('\n');
    for (let len = 2; len <= 4; len++) {
      const wordRe = new RegExp('[一-龥]{' + len + '}', 'g');
      let wm;
      while ((wm = wordRe.exec(allText)) !== null) {
        const name = wm[0];
        if (known.has(name) || STOP_WORDS.has(name)) continue;
        if (BAD_START.test(name) || BAD_END.test(name)) continue;
        if (/^[一二三四五六七八九十百千万亿]+$/.test(name)) continue;
        found.set(name, (found.get(name) || 0) + 1);
      }
    }

    const candidates = [...found.entries()]
      .filter(([name, n]) => {
        const hasSpeech = (speechHits.get(name) || 0) > 0;
        if (n < (hasSpeech ? 3 : 5)) return false;
        for (const k of known) {
          if (name.includes(k) || k.includes(name)) return false;
        }
        return true;
      })
      .sort((x, y) => y[1] - x[1])
      .slice(0, 12)
      .map(([name, n]) => ({ name, n }));

    const chapterOrder = new Map(); let chapterPosition = 0;
    (project.tree || []).forEach(v => (v.chapters || []).forEach(c => chapterOrder.set(c.id, ++chapterPosition)));
    const manualRels = (project.manualRels || []).map(r => normalizeEdge(r, chapterOrder));
    const removed = new Set(project.removedRels || []);
    const merged = mergeEdges([...rels.values()], manualRels)
      .filter(e => !(e.source === 'auto' && removed.has(edgeKey(e.a, e.b))));
    return { chars, mentions, rels: merged, candidates, manualRels };
  }

  function normalizeEdge(rel, chapterOrder = new Map()) {
    const a = rel.a || rel.source;
    const b = rel.b || rel.target;
    let startChapter = null, endChapter = null;
    if (Array.isArray(rel.chapterRange)) {
      startChapter = rel.chapterRange[0] ?? null;
      endChapter = rel.chapterRange[1] ?? null;
    } else {
      startChapter = rel.startChapter ?? null;
      endChapter = rel.endChapter ?? null;
    }
    return {
      a, b,
      id: rel.id || null,
      direction: rel.direction || 'two-way',
      type: rel.type || '自定义',
      desc: rel.desc || '',
      weight: Number(rel.weight) || 3,
      secret: !!rel.secret,
      startChapter, endChapter,
      stages: (rel.stages || []).map(s => ({ ...s, startChapter: Number(s.startChapter) || chapterOrder.get(s.startChapterId) || 1, endChapter: Number(s.endChapter) || chapterOrder.get(s.endChapterId) || null })),
      evidence: rel.evidence || [],
      source: 'manual',
      w: Number(rel.weight) || 3,
      evi: rel.desc || '',
      eviWhere: '手动关系',
    };
  }

  function relationAt(edge, chapter = currentChapter) {
    const stages = (edge.stages || []).slice().sort((a, b) => (a.startChapter || 1) - (b.startChapter || 1));
    if (!stages.length) return { ...edge, visible: true, stage: null };
    const point = chapter === Infinity ? Infinity : Number(chapter);
    const stage = point === Infinity ? stages[stages.length - 1] : stages.find(s => point >= (s.startChapter || 1) && (s.endChapter == null || point <= s.endChapter));
    if (!stage) return { ...edge, visible: point === Infinity, stage: null };
    return { ...edge, visible: true, stage, type: stage.type || edge.type, desc: stage.note || edge.desc, startChapter: stage.startChapter, endChapter: stage.endChapter };
  }
  function mergeEdges(autoEdges, manualEdges) {
    const map = new Map();
    const keyOf = (a, b) => (a < b ? a + '|' + b : b + '|' + a);
    for (const e of autoEdges) {
      map.set(keyOf(e.a, e.b), {
        a: e.a, b: e.b, w: e.w, weight: 1 + relLevel(e.w),
        direction: 'two-way', type: '自动', desc: '', secret: false,
        startChapter: null, endChapter: null, source: 'auto', id: null,
        evi: e.evi, eviWhere: e.eviWhere,
      });
    }
    for (const e of manualEdges) {
      const key = keyOf(e.a, e.b);
      const prev = map.get(key);
      if (!prev) {
        map.set(key, e);
      } else if (prev.source === 'auto') {
        map.set(key, { ...e, autoW: prev.w, autoEvi: prev.evi, autoEviWhere: prev.eviWhere });
      } else if (prev.direction === e.direction && prev.type === e.type) {
        map.set(key, { ...prev, weight: Math.max(prev.weight, e.weight), w: Math.max(prev.w, e.w), desc: e.desc || prev.desc });
      } else if (e.weight > prev.weight) {
        map.set(key, e);
      }
    }
    return [...map.values()];
  }

  function campConfig() {
    const p = window.Moyu.getProject();
    return { custom: p.customCamps || [], colors: p.campColors || {} };
  }

  function allCamps() {
    return CAMPS.concat(campConfig().custom.map(c => c.name));
  }

  function campColor(camp) {
    const { custom, colors } = campConfig();
    if (colors[camp]) return colors[camp];
    const hit = custom.find(c => c.name === camp);
    if (hit && hit.color) return hit.color;
    const theme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    return CAMP_COLORS[theme][camp] || CAMP_COLORS[theme]['其他'];
  }

  function edgeKey(a, b) {
    const x = a.name || a, y = b.name || b;
    return x < y ? x + '|' + y : y + '|' + x;
  }
  /* ---------- 状态与 DOM ---------- */
  let overlay = null, canvas = null, ctx = null;
  let sim = null, rafId = 0, ro = null;
  let viewScale = 1, viewOffsetX = 0, viewOffsetY = 0;
  const MIN_SCALE = 0.3, MAX_SCALE = 4;

  let currentLayout = 'force';
  let currentChapter = Infinity;
  let pathHighlight = [];
  let pendingEdge = null;
  let panning = null;
  let edgeHover = null;
  let downPos = null;
  let edgeEdit = null;

  function buildOverlay() {
    overlay = document.createElement('div');
    overlay.className = 'graph-overlay';
    overlay.innerHTML = `
      <div class="graph-top">
        <span class="graph-title">人物关系网</span>
        <span class="graph-meta" id="graphMeta"></span>
        <select class="graph-select" id="graphLayout" title="布局模式">
          <option value="force">力导向</option>
          <option value="tree">层级树状</option>
          <option value="circular">环形</option>
        </select>
        <div class="path-query">
          <input id="graphPathFrom" placeholder="起点" />
          <span>→</span>
          <input id="graphPathTo" placeholder="终点" />
          <button class="icon-btn" id="graphFindPath" title="查找最短路径">⌕</button>
        </div>
        <div class="legend" id="graphLegend"></div>
        <div class="graph-zoom">
          <button class="icon-btn" id="graphZoomOut" title="缩小">−</button>
          <span id="graphZoomValue">100%</span>
          <button class="icon-btn" id="graphZoomIn" title="放大">+</button>
          <button class="icon-btn" id="graphZoomReset" title="重置">⟲</button>
        </div>
        <button class="icon-btn" id="graphBookmark" title="保存视角书签">☆</button>
        <button class="icon-btn" id="graphExportPng" title="导出 PNG">⇩</button>
        <button class="icon-btn" id="graphExportJson" title="导出 JSON">{} </button>
        <button class="icon-btn" id="graphClose" title="关闭">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
      <div class="graph-main">
        <div class="graph-canvas-wrap">
          <canvas id="graphCanvas"></canvas>
          <div class="graph-hint">拖动节点调整布局 · Shift+拖动节点建边 · 点击边编辑 · 拖拽空白平移 · 滚轮缩放</div>
          <div class="graph-tooltip" id="graphTooltip"></div>
        </div>
        <aside class="graph-side" id="graphSide"></aside>
      </div>
      <div class="graph-bottom" id="graphBottom"></div>`;
    document.body.appendChild(overlay);
    canvas = overlay.querySelector('#graphCanvas');
    ctx = canvas.getContext('2d');
    overlay.querySelector('#graphClose').addEventListener('click', close);
    overlay.querySelector('#graphLayout').addEventListener('change', e => applyLayout(e.target.value));
    overlay.querySelector('#graphBookmark').addEventListener('click', saveBookmark);
    overlay.querySelector('#graphExportPng').addEventListener('click', exportPNG);
    overlay.querySelector('#graphExportJson').addEventListener('click', exportJSON);
    overlay.querySelector('#graphFindPath').addEventListener('click', runPathQuery);
    overlay.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement);
    bindCanvas();
  }

  function resize() {
    if (!canvas) return;
    const r = canvas.parentElement.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, r.width * dpr);
    canvas.height = Math.max(1, r.height * dpr);
    canvas.style.width = r.width + 'px';
    canvas.style.height = r.height + 'px';
  }

  function resetView() {
    viewScale = 1;
    viewOffsetX = 0;
    viewOffsetY = 0;
    updateZoomValue();
  }

  function updateZoomValue() {
    const el = overlay.querySelector('#graphZoomValue');
    if (el) el.textContent = Math.round(viewScale * 100) + '%';
  }

  function screenToWorld(sx, sy) {
    return {
      x: (sx - viewOffsetX) / viewScale,
      y: (sy - viewOffsetY) / viewScale,
    };
  }

  function applyViewTransform() {
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr * viewScale, 0, 0, dpr * viewScale, dpr * viewOffsetX, dpr * viewOffsetY);
  }

  function zoomTo(newScale, anchorX, anchorY) {
    const r = canvas.parentElement.getBoundingClientRect();
    const cx = anchorX ?? r.width / 2;
    const cy = anchorY ?? r.height / 2;
    const ratio = newScale / viewScale;
    viewOffsetX = cx - (cx - viewOffsetX) * ratio;
    viewOffsetY = cy - (cy - viewOffsetY) * ratio;
    viewScale = newScale;
    updateZoomValue();
  }

  /* ---------- 力导向模拟 ---------- */
  function makeSim(data) {
    let r = canvas.parentElement.getBoundingClientRect();
    const cx = (r.width || 800) / 2, cy = (r.height || 600) / 2;
    const nodes = data.chars.map((c, i) => {
      const n = data.mentions.get(c.name) || 0;
      const count = data.chars.length || 1;
      const angleStep = (Math.PI * 2) / count;
      const ang = angleStep * i + Math.random() * 0.3;
      const dist = Math.min(180, 60 + count * 14);
      const core = c.tag === '主角' || c.core === true;
      const r0 = Math.min(30, 13 + Math.sqrt(n) * 2.2);
      return {
        id: c.id || null,
        name: c.name,
        tag: c.tag || '其他',
        mentions: n,
        camp: c.camp || '中立',
        faction: c.faction || '',
        status: c.status || '活跃',
        shape: c.shape || 'circle',
        color: c.color || campColor(c.camp),
        core,
        alias: c.alias || [],
        avatar: c.avatar || '',
        x: cx + Math.cos(ang) * dist,
        y: cy + Math.sin(ang) * dist,
        vx: 0, vy: 0,
        r: core ? Math.min(36, r0 * 1.22) : r0,
        fixed: false,
        hidden: false,
      };
    });
    const byName = new Map(nodes.map(n => [n.name, n]));
    const edges = data.rels
      .filter(rel => byName.has(rel.a) && byName.has(rel.b))
      .map(rel => ({
        a: byName.get(rel.a),
        b: byName.get(rel.b),
        w: rel.w,
        weight: rel.weight,
        direction: rel.direction || 'two-way',
        type: rel.type || '自动',
        desc: rel.desc || '',
        secret: !!rel.secret,
        startChapter: rel.startChapter,
        endChapter: rel.endChapter,
        source: rel.source || 'auto',
        id: rel.id || null,
        evi: rel.evi,
        eviWhere: rel.eviWhere,
        autoW: rel.autoW,
        autoEvi: rel.autoEvi,
        autoEviWhere: rel.autoEviWhere,
      }));
    return { nodes, edges, sel: null, hover: null, drag: null };
  }

  function step() {
    if (currentLayout !== 'force') return;
    const { nodes, edges } = sim;
    const r = canvas.parentElement.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const cx = r.width / 2, cy = r.height / 2;
    const calm = sim.drag ? 0.35 : 1;

    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        let dx = a.x - b.x, dy = a.y - b.y;
        let d2 = dx * dx + dy * dy || 1;
        const f = Math.min(12, 6000 / d2);
        const d = Math.sqrt(d2);
        dx /= d; dy /= d;
        a.vx += dx * f * calm; a.vy += dy * f * calm;
        b.vx -= dx * f * calm; b.vy -= dy * f * calm;
      }
    }

    for (const e of edges) {
      const rest = Math.max(100, 220 - Math.min(100, e.w * 8));
      let dx = e.b.x - e.a.x, dy = e.b.y - e.a.y;
      const d = Math.hypot(dx, dy) || 1;
      const f = Math.min(3, (d - rest) * 0.02);
      dx /= d; dy /= d;
      e.a.vx += dx * f * calm; e.a.vy += dy * f * calm;
      e.b.vx -= dx * f * calm; e.b.vy -= dy * f * calm;
    }

    for (const n of nodes) {
      if (!n.fixed) {
        n.vx += (cx - n.x) * 0.015 * calm;
        n.vy += (cy - n.y) * 0.015 * calm;
        const maxV = 28;
        const v = Math.hypot(n.vx, n.vy);
        if (v > maxV) { n.vx = (n.vx / v) * maxV; n.vy = (n.vy / v) * maxV; }
        n.x += n.vx; n.y += n.vy;
      }
      n.vx *= 0.82; n.vy *= 0.82;
      const pad = n.r + 10;
      n.x = Math.max(pad, Math.min(r.width - pad, n.x));
      n.y = Math.max(pad, Math.min(r.height - pad, n.y));
    }
  }
  /* ---------- 绘制辅助 ---------- */
  function drawArrow(x1, y1, x2, y2, color, width) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const len = Math.max(8, width * 2.6);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = width;
    ctx.translate(x2, y2);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-len, -len * 0.45);
    ctx.lineTo(-len, len * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawHexagon(ctx, x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 3 * i - Math.PI / 6;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  function drawDiamond(ctx, x, y, r) {
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r * 0.85, y);
    ctx.lineTo(x, y + r);
    ctx.lineTo(x - r * 0.85, y);
    ctx.closePath();
  }

  function drawShape(n) {
    if (n.shape === 'hexagon') drawHexagon(ctx, n.x, n.y, n.r);
    else if (n.shape === 'diamond') drawDiamond(ctx, n.x, n.y, n.r);
    else { ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); }
  }

  function strokeShape(n, pad) {
    if (n.shape === 'hexagon') drawHexagon(ctx, n.x, n.y, n.r + pad);
    else if (n.shape === 'diamond') drawDiamond(ctx, n.x, n.y, n.r + pad);
    else ctx.arc(n.x, n.y, n.r + pad, 0, Math.PI * 2);
  }

  function draw() {
    const P = pal();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    applyViewTransform();

    const sel = sim.sel;
    const hover = sim.hover;
    const linked = new Set();
    const hoverLinked = new Set();
    if (sel) sim.edges.forEach(e => {
      if (e.a === sel) linked.add(e.b);
      if (e.b === sel) linked.add(e.a);
    });
    if (hover) sim.edges.forEach(e => {
      if (e.a === hover) hoverLinked.add(e.b);
      if (e.b === hover) hoverLinked.add(e.a);
    });

    const pathKeys = new Set();
    const pathSet = new Set(pathHighlight);
    for (let i = 0; i < pathHighlight.length - 1; i++) {
      pathKeys.add(edgeKey(pathHighlight[i], pathHighlight[i + 1]));
    }

    for (const e of sim.edges) {
      if (e.a.hidden || e.b.hidden) continue;
      const relation = relationAt(e);
      if (!relation.visible) continue;
      if (currentChapter != null && currentChapter !== Infinity) {
        if (relation.startChapter != null && relation.startChapter > currentChapter) continue;
        if (relation.endChapter != null && relation.endChapter < currentChapter) continue;
      }
      const onPath = pathKeys.has(edgeKey(e.a, e.b));
      const dim = (sel && !(e.a === sel || e.b === sel)) || (hover && !(e.a === hover || e.b === hover));
      ctx.globalAlpha = onPath ? 1 : (dim ? P.dimAlpha : 0.9);
      ctx.strokeStyle = onPath ? '#d9a441' : (e.secret ? P.edge[0] : P.edge[relLevel(e.w)]);
      ctx.lineWidth = onPath ? 3 : (e.source === 'manual' ? Math.max(1, Math.min(5, e.weight)) : 1 + relLevel(e.w) * 1.3);
      ctx.setLineDash(e.secret ? [5, 4] : []);

      const mx = (e.a.x + e.b.x) / 2, my = (e.a.y + e.b.y) / 2;
      const dx = e.b.x - e.a.x, dy = e.b.y - e.a.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      const bend = Math.min(30, len * 0.12);
      const cpx = mx + nx * bend, cpy = my + ny * bend;

      ctx.beginPath();
      ctx.moveTo(e.a.x, e.a.y);
      ctx.quadraticCurveTo(cpx, cpy, e.b.x, e.b.y);
      ctx.stroke();
      ctx.setLineDash([]);

      if (e.direction === 'one-way') {
        drawArrow(cpx, cpy, e.b.x, e.b.y, ctx.strokeStyle, ctx.lineWidth);
      }
    }
    ctx.globalAlpha = 1;

    for (const n of sim.nodes) {
      if (n.hidden) continue;
      const dim = (sel && n !== sel && !linked.has(n)) || (hover && n !== hover && !hoverLinked.has(n)) || (pathSet.size && !pathSet.has(n));
      const statusAlpha = n.status === '死亡' ? 0.45 : n.status === '失踪' ? 0.6 : n.status === '离线' ? 0.75 : 1;
      ctx.globalAlpha = dim ? P.dimAlpha + 0.15 : statusAlpha;
      ctx.fillStyle = n.color || campColor(n.camp) || P.node[n.tag] || P.node['其他'];
      drawShape(n);
      ctx.fill();

      if (n.core) {
        ctx.strokeStyle = '#d9a441';
        ctx.lineWidth = 2;
        ctx.beginPath();
        strokeShape(n, 4);
        ctx.stroke();
      }
      if (n === sel) {
        ctx.strokeStyle = P.selRing;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        strokeShape(n, 5);
        ctx.stroke();
      }
      if (n === hover && n !== sel) {
        ctx.strokeStyle = P.selRing;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        strokeShape(n, 3);
        ctx.stroke();
      }

      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.font = `700 ${Math.max(10, n.r * 0.62)}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(n.name.slice(0, 2), n.x, n.y);
      ctx.fillStyle = dim ? P.labelSoft : P.label;
      ctx.font = '12px sans-serif';
      ctx.fillText(n.name, n.x, n.y + n.r + 12);
      ctx.globalAlpha = 1;
    }

    if (pendingEdge) {
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = '#d9a441';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.moveTo(pendingEdge.a.x, pendingEdge.a.y);
      ctx.lineTo(pendingEdge.x, pendingEdge.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
  }

  function loop() {
    step();
    draw();
    rafId = requestAnimationFrame(loop);
  }
  /* ---------- 侧栏与工具 UI ---------- */
  function escapeHtml(s) {
    return (s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  function renderLegend() {
    const P = pal();
    const dots = allCamps().map(c => `<span class="lg"><i class="dot" style="background:${campColor(c)}"></i>${c}</span>`).join('');
    const lines = REL_LEVELS.map((l, i) =>
      `<span class="lg"><i class="line" style="background:${P.edge[i]}"></i>${l.name}</span>`).join('');
    overlay.querySelector('#graphLegend').innerHTML = dots + lines;
  }

  function renderSide(data) {
    const side = overlay.querySelector('#graphSide');
    const sel = sim.sel;
    const selEdge = edgeEdit;
    const searchText = side.dataset.search || '';
    const campFilter = side.dataset.camp || '';
    const statusFilter = side.dataset.status || '';

    const persons = data.chars
      .map(c => ({ ...c, n: data.mentions.get(c.name) || 0 }))
      .filter(c => {
        if (searchText && !c.name.includes(searchText) && !(c.alias || []).some(a => a.includes(searchText))) return false;
        if (campFilter && (c.camp || '中立') !== campFilter) return false;
        if (statusFilter && (c.status || '活跃') !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => b.n - a.n);

    let main = '';
    if (selEdge) main = renderEdgeEditor(selEdge);
    else if (sel) main = renderPersonEditor(sel) + renderRelations(data, sel);
    else main = renderPersonList(persons) + renderCandidates(data) + renderRemovedRels() + renderCampManager();

    side.innerHTML = `
      <div class="graph-controls">
        <input class="graph-search" id="graphSearch" placeholder="搜索人物" value="${escapeHtml(searchText)}" />
        <div class="filter-row">
          <select id="graphCampFilter">
            <option value="">全部阵营</option>
            ${allCamps().map(c => `<option value="${c}" ${campFilter === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
          <select id="graphStatusFilter">
            <option value="">全部状态</option>
            ${STATUSES.map(st => `<option value="${st}" ${statusFilter === st ? 'selected' : ''}>${st}</option>`).join('')}
          </select>
        </div>
        <button class="add-block" id="graphClearSelection">返回人物列表</button>
      </div>
      ${main}
      ${renderBookmarkList()}`;

    bindSideControls(data, side);
  }

  function renderPersonList(persons) {
    if (!persons.length) return '<div class="gs-empty">没有符合条件的人物。</div>';
    return `<div>
      <div class="gs-cap"><span>人物</span><span>${persons.length}</span></div>
      ${persons.map(p => `
        <div class="person-row${sim.sel && sim.sel.name === p.name ? ' sel' : ''}" data-name="${escapeHtml(p.name)}">
          <span class="person-dot" style="background:${p.color || campColor(p.camp)}"></span>
          <span class="person-name">${escapeHtml(p.name)}</span>
          <span class="person-tag">${escapeHtml(p.camp || '中立')}</span>
          <span class="person-n">${p.n}</span>
        </div>`).join('')}
    </div>`;
  }

  function renderCandidates(data) {
    if (!data.candidates.length) return '';
    return `<div>
      <div class="gs-cap"><span>新发现</span><span>疑似人物</span></div>
      ${data.candidates.map(c => `
        <div class="person-row new-found">
          <span class="person-dot" style="background:var(--gold)"></span>
          <span class="person-name">${escapeHtml(c.name)}</span>
          <span class="person-n">${c.n} 次</span>
          <button class="join-btn" data-name="${escapeHtml(c.name)}">加入角色</button>
        </div>`).join('')}
      <button class="add-block" id="joinAllCandidates" style="margin-top:8px">全部加入角色</button>
    </div>`;
  }

  function renderPersonEditor(node) {
    const c = node;
    return `<div class="gs-editor">
      <div class="gs-cap"><span>人物属性</span><span>${escapeHtml(c.name)}</span></div>
      <label>姓名<input id="f-name" value="${escapeHtml(c.name)}" /></label>
      <label>别名（逗号分隔）<input id="f-alias" value="${escapeHtml((c.alias || []).join(','))}" /></label>
      <label>头像 URL<input id="f-avatar" value="${escapeHtml(c.avatar || '')}" /></label>
      <label>代表色<input type="color" id="f-color" value="${c.color || campColor(c.camp)}" /></label>
      <label>阵营<select id="f-camp">${allCamps().map(x => `<option value="${x}" ${(c.camp || '中立') === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
      <label>所属势力<input id="f-faction" value="${escapeHtml(c.faction || '')}" /></label>
      <label>状态<select id="f-status">${STATUSES.map(x => `<option value="${x}" ${(c.status || '活跃') === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
      <label>形状<select id="f-shape">${SHAPES.map(x => `<option value="${x.value}" ${(c.shape || 'circle') === x.value ? 'selected' : ''}>${x.label}</option>`).join('')}</select></label>
      <label><input type="checkbox" id="f-core" ${c.core ? 'checked' : ''} /> 核心人物（发光边框）</label>
      <button class="add-block" id="savePerson">保存人物</button>
    </div>`;
  }

  function renderRelations(data, sel) {
    const mine = sim.edges
      .filter(e => (e.a === sel || e.b === sel) && relationAt(e).visible)
      .sort((a, b) => b.w - a.w);
    return `<div>
      <div class="gs-cap"><span>「${escapeHtml(sel.name)}」的关系</span><span>${mine.length} 条</span></div>
      ${mine.length ? mine.map(e => {
        const other = e.a === sel ? e.b : e.a;
        const badge = e.source === 'manual' ? (e.direction === 'one-way' ? '→' : '↔') : '自动';
        const relation = relationAt(e);
        const typeName = e.source === 'manual' ? relation.type : REL_LEVELS[relLevel(e.w)].name;
        return `<div class="rel-row edge-row" data-edge="${escapeHtml(edgeKey(e.a, e.b))}">
          <div class="rel-head">
            <span class="rel-name">${escapeHtml(other.name)}</span>
            <span class="rel-type" style="color:${e.source === 'manual' ? '#b07d2b' : '#5e968a'};border-color:${e.source === 'manual' ? '#b07d2b' : '#5e968a'}">${badge} ${escapeHtml(typeName)}</span>
            <span class="rel-w">${e.source === 'manual' ? `强度 ${e.weight}/5` : `同框 ${e.w} 段`}</span>
          </div>
          ${e.source === 'manual' ? `<div class="rel-evi">${escapeHtml(e.desc || '')}</div>` : `<div class="rel-evi">${escapeHtml(e.evi || '')}<br><span style="color:var(--muted);font-size:11px">— ${escapeHtml(e.eviWhere || '')}</span></div>`}
        </div>`;
      }).join('') : '<div class="gs-empty">暂无关系。可以按住 Shift 从该节点拖到另一节点来创建。</div>'}
    </div>`;
  }

  function renderEdgeEditor(e) {
    const isManual = e.source === 'manual';
    return `<div class="gs-editor">
      <div class="gs-cap"><span>关系编辑</span><span>${escapeHtml(e.a.name)} — ${escapeHtml(e.b.name)}</span></div>
      ${isManual ? `
        <label>方向<select id="e-direction"><option value="two-way" ${e.direction === 'two-way' ? 'selected' : ''}>双向</option><option value="one-way" ${e.direction === 'one-way' ? 'selected' : ''}>单向</option></select></label>
        <label>关系类型<input id="e-type" list="relTypes" value="${escapeHtml(e.type || '')}" /><datalist id="relTypes">${REL_TYPES.map(t => `<option value="${t}"></option>`).join('')}</datalist></label>
        <label>关系描述<input id="e-desc" value="${escapeHtml(e.desc || '')}" /></label>
        <label>权重/强度<input type="range" id="e-weight" min="1" max="5" value="${e.weight || 3}" /><span id="e-weightVal">${e.weight || 3}</span></label>
        <label>暗中/潜伏<input type="checkbox" id="e-secret" ${e.secret ? 'checked' : ''} /></label>
        <label>开始章节<input type="number" id="e-start" min="1" value="${e.startChapter ?? ''}" placeholder="空=全篇" /></label>
        <label>结束章节<input type="number" id="e-end" min="1" value="${e.endChapter ?? ''}" placeholder="空=全篇" /></label>
        <button class="add-block" id="saveEdge">保存关系</button>
        <button class="danger-btn" id="deleteEdge">删除关系</button>
      ` : `
        <div class="gs-empty">这是根据正文共现自动检测的关系。<br>可以转为手动关系后再补充方向、类型和时间信息。</div>
        <button class="add-block" id="promoteEdge">转为手动关系</button>
        <button class="danger-btn" id="breakEdge">断开此关系</button>
      `}
    </div>`;
  }

  function bindSideControls(data, side) {
    side.querySelectorAll('.person-row[data-name]').forEach(row => {
      row.addEventListener('click', () => {
        const node = sim.nodes.find(n => n.name === row.dataset.name);
        edgeEdit = null;
        sim.sel = sim.sel === node ? null : node || null;
        renderSide(data);
      });
    });
    side.querySelectorAll('.join-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        window.Moyu.addCharacter(btn.dataset.name);
        refresh();
      });
    });
    const joinAll = side.querySelector('#joinAllCandidates');
    if (joinAll) joinAll.addEventListener('click', () => {
      data.candidates.forEach(c => window.Moyu.addCharacter(c.name));
      refresh();
    });

    const clear = side.querySelector('#graphClearSelection');
    if (clear) clear.addEventListener('click', () => { edgeEdit = null; sim.sel = null; renderSide(data); });

    side.querySelectorAll('.edge-row[data-edge]').forEach(row => {
      row.addEventListener('click', () => {
        const key = row.dataset.edge;
        const e = sim.edges.find(x => edgeKey(x.a, x.b) === key);
        if (e) { edgeEdit = e; renderSide(data); }
      });
    });

    const search = side.querySelector('#graphSearch');
    if (search) {
      search.addEventListener('input', () => { side.dataset.search = search.value; renderSide(data); });
    }
    const campSel = side.querySelector('#graphCampFilter');
    if (campSel) campSel.addEventListener('change', () => { side.dataset.camp = campSel.value; renderSide(data); });
    const statusSel = side.querySelector('#graphStatusFilter');
    if (statusSel) statusSel.addEventListener('change', () => { side.dataset.status = statusSel.value; renderSide(data); });

    const savePerson = side.querySelector('#savePerson');
    if (savePerson) savePerson.addEventListener('click', () => {
      const node = sim.sel;
      if (!node) return;
      const patch = {
        name: document.getElementById('f-name').value.trim() || node.name,
        alias: document.getElementById('f-alias').value.split(/[,，]/).map(x => x.trim()).filter(Boolean),
        avatar: document.getElementById('f-avatar').value.trim(),
        color: document.getElementById('f-color').value.toLowerCase() === campColor(document.getElementById('f-camp').value).toLowerCase()
          ? '' : document.getElementById('f-color').value,
        camp: document.getElementById('f-camp').value,
        faction: document.getElementById('f-faction').value.trim(),
        status: document.getElementById('f-status').value,
        shape: document.getElementById('f-shape').value,
        core: document.getElementById('f-core').checked,
      };
      window.Moyu.updateCharacter(node.name, patch);
      refresh();
    });

    const saveEdge = side.querySelector('#saveEdge');
    if (saveEdge) saveEdge.addEventListener('click', () => {
      if (!edgeEdit) return;
      const patch = {
        direction: document.getElementById('e-direction').value,
        type: document.getElementById('e-type').value.trim(),
        desc: document.getElementById('e-desc').value.trim(),
        weight: Number(document.getElementById('e-weight').value),
        secret: document.getElementById('e-secret').checked,
        startChapter: document.getElementById('e-start').value ? Number(document.getElementById('e-start').value) : null,
        endChapter: document.getElementById('e-end').value ? Number(document.getElementById('e-end').value) : null,
      };
      if (edgeEdit.id) window.Moyu.updateManualRel(edgeEdit.id, patch);
      refresh();
    });

    const delEdge = side.querySelector('#deleteEdge');
    if (delEdge) delEdge.addEventListener('click', () => {
      if (edgeEdit && edgeEdit.id) window.Moyu.deleteManualRel(edgeEdit.id);
      edgeEdit = null;
      refresh();
    });

    const promote = side.querySelector('#promoteEdge');
    if (promote) promote.addEventListener('click', () => {
      if (!edgeEdit) return;
      window.Moyu.addManualRel({
        id: (Date.now().toString(36) + Math.random().toString(36).slice(2, 7)),
        a: edgeEdit.a.name, b: edgeEdit.b.name,
        direction: 'two-way', type: '自定义', desc: edgeEdit.evi || '', weight: 3, secret: false,
        startChapter: null, endChapter: null,
      });
      refresh();
    });

    const breakBtn = side.querySelector('#breakEdge');
    if (breakBtn) breakBtn.addEventListener('click', () => {
      if (!edgeEdit) return;
      window.Moyu.removeAutoRel(edgeKey(edgeEdit.a, edgeEdit.b));
      edgeEdit = null;
      refresh();
    });

    side.querySelectorAll('.restore-rel').forEach(b => b.addEventListener('click', () => {
      window.Moyu.restoreAutoRel(b.dataset.key);
      refresh();
    }));

    side.querySelectorAll('.camp-color-input').forEach(inp => inp.addEventListener('change', () => {
      const p = window.Moyu.getProject();
      window.Moyu.saveCampConfig({ campColors: { ...(p.campColors || {}), [inp.dataset.camp]: inp.value } });
      refresh();
    }));

    const addCampBtn = side.querySelector('#addCampBtn');
    if (addCampBtn) addCampBtn.addEventListener('click', () => {
      const name = side.querySelector('#newCampName').value.trim();
      const color = side.querySelector('#newCampColor').value;
      if (!name || allCamps().includes(name)) return;
      const p = window.Moyu.getProject();
      window.Moyu.saveCampConfig({ customCamps: (p.customCamps || []).concat([{ name, color }]) });
      refresh();
    });

    side.querySelectorAll('.del-camp').forEach(b => b.addEventListener('click', () => {
      const p = window.Moyu.getProject();
      const colors = { ...(p.campColors || {}) };
      delete colors[b.dataset.camp];
      window.Moyu.saveCampConfig({
        customCamps: (p.customCamps || []).filter(c => c.name !== b.dataset.camp),
        campColors: colors,
      });
      refresh();
    }));

    const campSelect = side.querySelector('#f-camp');
    if (campSelect) campSelect.addEventListener('change', () => {
      const colorInput = document.getElementById('f-color');
      if (colorInput) colorInput.value = campColor(campSelect.value);
    });
  }

  function renderRemovedRels() {
    const p = window.Moyu.getProject();
    const list = p.removedRels || [];
    if (!list.length) return '';
    return `<div>
      <div class="gs-cap"><span>已断开的关系</span><span>${list.length}</span></div>
      ${list.map(k => {
        const parts = k.split('|');
        return `<div class="person-row"><span class="person-name">${escapeHtml(parts[0])} — ${escapeHtml(parts[1])}</span><button class="join-btn restore-rel" data-key="${escapeHtml(k)}">恢复</button></div>`;
      }).join('')}
    </div>`;
  }

  function renderCampManager() {
    const custom = campConfig().custom;
    const customNames = new Set(custom.map(c => c.name));
    return `<div>
      <div class="gs-cap"><span>阵营管理</span><span>${allCamps().length}</span></div>
      ${allCamps().map(name => `
        <div class="person-row camp-row">
          <input type="color" class="camp-color-input" data-camp="${escapeHtml(name)}" value="${campColor(name)}" title="设置「${escapeHtml(name)}」颜色" />
          <span class="person-name">${escapeHtml(name)}</span>
          ${customNames.has(name) ? `<button class="join-btn del-camp" data-camp="${escapeHtml(name)}">删除</button>` : '<span class="person-tag">内置</span>'}
        </div>`).join('')}
      <div class="camp-add-row">
        <input id="newCampName" placeholder="新阵营名称" />
        <input type="color" id="newCampColor" value="#8a6d3b" title="新阵营颜色" />
        <button class="join-btn" id="addCampBtn">添加</button>
      </div>
    </div>`;
  }

  function renderBookmarkList() {
    const p = window.Moyu.getProject();
    const list = p.bookmarks || [];
    return `<div>
      <div class="gs-cap"><span>视角书签</span><span>${list.length}</span></div>
      ${list.length ? list.map((b, i) => `<div class="person-row bookmark-row" data-i="${i}"><span class="person-name">${escapeHtml(b.name || '未命名')}</span><button class="join-btn del-bookmark" data-i="${i}">删除</button><button class="join-btn use-bookmark" data-i="${i}">切换</button></div>`).join('') : '<div class="gs-empty">暂无书签。</div>'}
    </div>`;
  }

  function bindBookmarkClicks() {
    const side = overlay.querySelector('#graphSide');
    side.querySelectorAll('.use-bookmark').forEach(b => b.addEventListener('click', () => loadBookmark(Number(b.dataset.i))));
    side.querySelectorAll('.del-bookmark').forEach(b => b.addEventListener('click', () => {
      const p = window.Moyu.getProject();
      const list = p.bookmarks || [];
      list.splice(Number(b.dataset.i), 1);
      window.Moyu.saveBookmarks(list);
      refresh();
    }));
  }

  function renderTimeline() {
    const bottom = overlay.querySelector('#graphBottom');
    const total = window.Moyu.getChapterCount();
    if (!total) { bottom.innerHTML = ''; return; }
    const allPosition = total + 1;
    const val = currentChapter === Infinity || currentChapter == null ? allPosition : Math.min(currentChapter, total);
    bottom.innerHTML = `
      <div class="timeline">
        <span>章节</span>
        <input type="range" id="graphChapter" min="1" max="${allPosition}" value="${val}" />
        <span id="graphChapterLabel">${val === allPosition ? '全部' : '第 ' + val + ' 章'}</span>
      </div>`;
    bottom.querySelector('#graphChapter').addEventListener('input', e => {
      const raw = Number(e.target.value);
      currentChapter = raw === allPosition ? Infinity : raw;
      bottom.querySelector('#graphChapterLabel').textContent = currentChapter === Infinity ? '全部' : '第 ' + currentChapter + ' 章';
      window.Moyu.saveGraphState({ currentChapter });
      if (sim.sel || edgeEdit) renderSide(extract(window.Moyu.getProject()));
    });
  }
  /* ---------- 画布交互 ---------- */
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  function nodeAt(x, y) {
    for (let i = sim.nodes.length - 1; i >= 0; i--) {
      const n = sim.nodes[i];
      if (n.hidden) continue;
      if (Math.hypot(n.x - x, n.y - y) <= n.r + 3) return n;
    }
    return null;
  }

  function edgeAt(x, y) {
    for (const e of sim.edges) {
      if (e.a.hidden || e.b.hidden) continue;
      const relation = relationAt(e);
      if (!relation.visible) continue;
      if (currentChapter != null && currentChapter !== Infinity) {
        if (relation.startChapter != null && relation.startChapter > currentChapter) continue;
        if (relation.endChapter != null && relation.endChapter < currentChapter) continue;
      }
      const dx = e.b.x - e.a.x, dy = e.b.y - e.a.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      const bend = Math.min(30, len * 0.12);
      const mx = (e.a.x + e.b.x) / 2, my = (e.a.y + e.b.y) / 2;
      const cpx = mx + nx * bend, cpy = my + ny * bend;
      for (let t = 0; t <= 1; t += 0.04) {
        const it = 1 - t;
        const px = it * it * e.a.x + 2 * it * t * cpx + t * t * e.b.x;
        const py = it * it * e.a.y + 2 * it * t * cpy + t * t * e.b.y;
        if (Math.hypot(px - x, py - y) < 6) return e;
      }
    }
    return null;
  }

  function showTooltip(e, x, y) {
    const tip = overlay.querySelector('#graphTooltip');
    if (!tip) return;
    const relation = relationAt(e);
    tip.innerHTML = `<b>${escapeHtml(relation.type || '关系')}</b>${relation.stage ? '<br><small>当前关系阶段</small>' : ''}<br>${escapeHtml(relation.desc || (e.evi ? e.evi.slice(0, 40) : ''))}`;
    tip.style.display = 'block';
    const r = canvas.getBoundingClientRect();
    tip.style.left = (x - r.left + 12) + 'px';
    tip.style.top = (y - r.top + 12) + 'px';
  }

  function hideTooltip() {
    const tip = overlay.querySelector('#graphTooltip');
    if (tip) tip.style.display = 'none';
  }

  function bindCanvas() {
    const pos = e => {
      const r = canvas.getBoundingClientRect();
      return screenToWorld(e.clientX - r.left, e.clientY - r.top);
    };

    canvas.addEventListener('pointerdown', e => {
      const p = pos(e);
      const n = nodeAt(p.x, p.y);
      if (n && e.shiftKey) {
        pendingEdge = { a: n, x: p.x, y: p.y };
        canvas.setPointerCapture(e.pointerId);
        return;
      }
      if (n) {
        sim.drag = n;
        n.fixed = true;
        downPos = p;
        canvas.classList.add('grabbing');
        canvas.setPointerCapture(e.pointerId);
        return;
      }
      const ed = edgeAt(p.x, p.y);
      if (ed) {
        downPos = p;
        downEdge = ed;
        canvas.setPointerCapture(e.pointerId);
        return;
      }
      panning = { startX: e.clientX, startY: e.clientY, ox: viewOffsetX, oy: viewOffsetY };
      downPos = p;
      canvas.setPointerCapture(e.pointerId);
    });

    canvas.addEventListener('pointermove', e => {
      const p = pos(e);
      if (sim.drag) {
        sim.drag.x = p.x; sim.drag.y = p.y;
        return;
      }
      if (pendingEdge) {
        pendingEdge.x = p.x; pendingEdge.y = p.y;
        return;
      }
      if (panning) {
        viewOffsetX = panning.ox + (e.clientX - panning.startX);
        viewOffsetY = panning.oy + (e.clientY - panning.startY);
        return;
      }
      const n = nodeAt(p.x, p.y);
      sim.hover = n;
      canvas.classList.toggle('point', !!n);
      if (n) { hideTooltip(); edgeHover = null; return; }
      const ed = edgeAt(p.x, p.y);
      edgeHover = ed;
      if (ed) showTooltip(ed, e.clientX, e.clientY);
      else hideTooltip();
    });

    canvas.addEventListener('pointerup', e => {
      const p = pos(e);
      if (sim.drag) {
        const n = sim.drag;
        n.fixed = false;
        sim.drag = null;
        canvas.classList.remove('grabbing');
        if (Math.hypot(n.x - p.x, n.y - p.y) < 1) {
          edgeEdit = null;
          sim.sel = sim.sel === n ? null : n;
          renderSide(lastData);
        } else {
          sim.sel = n;
          renderSide(lastData);
        }
        downPos = null;
        return;
      }
      if (pendingEdge) {
        const target = nodeAt(p.x, p.y);
        if (target && target !== pendingEdge.a) createEdge(pendingEdge.a, target);
        pendingEdge = null;
        return;
      }
      if (panning) {
        panning = null;
        downPos = null;
        return;
      }
      if (downEdge && downPos && Math.hypot(downPos.x - p.x, downPos.y - p.y) < 3) {
        edgeEdit = downEdge;
        sim.sel = null;
        renderSide(lastData);
      }
      downPos = null;
      downEdge = null;
    });

    canvas.addEventListener('pointercancel', () => {
      if (sim.drag) { sim.drag.fixed = false; sim.drag = null; canvas.classList.remove('grabbing'); }
      pendingEdge = null;
      panning = null;
      downPos = null;
      downEdge = null;
    });

    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      const anchorX = e.clientX - r.left;
      const anchorY = e.clientY - r.top;
      const delta = e.deltaY < 0 ? 1.1 : 0.9;
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, viewScale * delta));
      zoomTo(newScale, anchorX, anchorY);
    }, { passive: false });

    overlay.querySelector('#graphZoomIn').addEventListener('click', () => {
      zoomTo(Math.min(MAX_SCALE, viewScale * 1.2));
    });
    overlay.querySelector('#graphZoomOut').addEventListener('click', () => {
      zoomTo(Math.max(MIN_SCALE, viewScale / 1.2));
    });
    overlay.querySelector('#graphZoomReset').addEventListener('click', () => {
      resetView();
    });
  }

  function createEdge(a, b) {
    window.Moyu.addManualRel({
      id: uid(),
      a: a.name,
      b: b.name,
      direction: 'two-way',
      type: '自定义',
      desc: '',
      weight: 3,
      secret: false,
      startChapter: null,
      endChapter: null,
    });
    refresh();
  }

  /* ---------- 布局 ---------- */
  function layoutTree() {
    const nodes = sim.nodes;
    const adj = new Map(nodes.map(n => [n, []]));
    for (const e of sim.edges) { adj.get(e.a).push(e.b); adj.get(e.b).push(e.a); }
    const root = nodes.slice().sort((a, b) => b.mentions - a.mentions)[0];
    const levels = new Map([[root, 0]]);
    const q = [root];
    while (q.length) {
      const cur = q.shift();
      for (const nb of adj.get(cur)) {
        if (!levels.has(nb)) { levels.set(nb, levels.get(cur) + 1); q.push(nb); }
      }
    }
    const byLevel = new Map();
    for (const n of nodes) {
      const lv = levels.has(n) ? levels.get(n) : 0;
      if (!byLevel.has(lv)) byLevel.set(lv, []);
      byLevel.get(lv).push(n);
    }
    const r = canvas.parentElement.getBoundingClientRect();
    const w = r.width || 800, h = r.height || 600;
    const maxLevel = Math.max(...byLevel.keys(), 0) || 1;
    const levelGap = (h - 100) / (maxLevel + 1);
    byLevel.forEach((arr, lv) => {
      const y = 50 + lv * levelGap;
      arr.forEach((n, i) => {
        n.x = 50 + (arr.length === 1 ? (w - 100) / 2 : (w - 100) * i / (arr.length - 1));
        n.y = y;
        n.fixed = true;
      });
    });
  }

  function layoutCircular() {
    const nodes = sim.nodes;
    const r = canvas.parentElement.getBoundingClientRect();
    const w = r.width || 800, h = r.height || 600;
    const cx = w / 2, cy = h / 2;
    const radius = Math.min(w, h) * 0.38;
    const groups = {};
    for (const n of nodes) { (groups[n.camp] = groups[n.camp] || []).push(n); }
    const camps = Object.keys(groups);
    camps.forEach((camp, gi) => {
      const arr = groups[camp];
      const start = (gi / camps.length) * Math.PI * 2;
      const sweep = (Math.PI * 2) / camps.length;
      arr.forEach((n, i) => {
        const ang = start + sweep * (i + 0.5) / arr.length;
        n.x = cx + Math.cos(ang) * radius;
        n.y = cy + Math.sin(ang) * radius;
        n.fixed = true;
      });
    });
  }

  function applyLayout(mode) {
    currentLayout = mode;
    if (mode === 'tree') layoutTree();
    else if (mode === 'circular') layoutCircular();
    else sim.nodes.forEach(n => { n.fixed = false; });
    window.Moyu.saveGraphState({ layout: mode });
  }

  /* ---------- 时间轴 / 书签 / 路径 / 导出 ---------- */
  async function saveBookmark() {
    const name = window.MoyuWorkspace ? await window.MoyuWorkspace.ask('给这个视角起个名字', '') : prompt('给这个视角起个名字');
    if (!name) return;
    const r = canvas.parentElement.getBoundingClientRect();
    const c = screenToWorld(r.width / 2, r.height / 2);
    const p = window.Moyu.getProject();
    const list = p.bookmarks || [];
    list.push({
      name,
      centerX: c.x,
      centerY: c.y,
      scale: viewScale,
      visibleNodes: sim.nodes.filter(n => !n.hidden).map(n => n.name),
    });
    window.Moyu.saveBookmarks(list);
    refresh();
  }

  function loadBookmark(i) {
    const p = window.Moyu.getProject();
    const b = (p.bookmarks || [])[i];
    if (!b) return;
    const r = canvas.parentElement.getBoundingClientRect();
    viewScale = b.scale || 1;
    viewOffsetX = r.width / 2 - (b.centerX || 0) * viewScale;
    viewOffsetY = r.height / 2 - (b.centerY || 0) * viewScale;
    const visible = new Set(b.visibleNodes || []);
    sim.nodes.forEach(n => { n.hidden = visible.size ? !visible.has(n.name) : false; });
    updateZoomValue();
    draw();
  }

  function findPath(aName, bName) {
    const a = sim.nodes.find(n => n.name === aName);
    const b = sim.nodes.find(n => n.name === bName);
    if (!a || !b) return [];
    const prev = new Map([[a, null]]);
    const q = [a];
    while (q.length) {
      const cur = q.shift();
      if (cur === b) break;
      for (const e of sim.edges) {
        const other = e.a === cur ? e.b : e.b === cur ? e.a : null;
        if (other && !prev.has(other)) { prev.set(other, cur); q.push(other); }
      }
    }
    if (!prev.has(b)) return [];
    const path = [];
    let cur = b;
    while (cur) { path.unshift(cur); cur = prev.get(cur); }
    return path;
  }

  function runPathQuery() {
    const from = overlay.querySelector('#graphPathFrom').value.trim();
    const to = overlay.querySelector('#graphPathTo').value.trim();
    pathHighlight = findPath(from, to);
    if (!pathHighlight.length) {
      overlay.querySelector('#graphMeta').textContent = '未找到路径';
    }
  }

  function exportPNG() {
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = '人物关系网.png';
    a.click();
  }

  function exportJSON() {
    const p = window.Moyu.getProject();
    const data = {
      chars: p.chars,
      manualRels: p.manualRels || [],
      bookmarks: p.bookmarks || [],
      graphSettings: p.graphSettings || {},
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '人物关系网.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }
  /* ---------- 打开 / 关闭 / 刷新 ---------- */
  let lastData = null;
  let downEdge = null;

  function refresh() {
    pendingEdge = null;
    pathHighlight = [];
    edgeHover = null;
    const data = extract(window.Moyu.getProject());
    lastData = data;
    const keepSel = sim && sim.sel ? sim.sel.name : null;
    const keepEdgeKey = edgeEdit ? edgeKey(edgeEdit.a, edgeEdit.b) : null;
    sim = makeSim(data);
    if (keepSel) sim.sel = sim.nodes.find(n => n.name === keepSel) || null;
    if (keepEdgeKey) edgeEdit = sim.edges.find(e => edgeKey(e.a, e.b) === keepEdgeKey) || null;
    overlay.querySelector('#graphMeta').textContent =
      `${data.chars.length} 个人物 · ${data.rels.length} 组关系`;
    renderLegend();
    renderSide(data);
    renderTimeline();
    bindBookmarkClicks();
    applyLayout(currentLayout);
  }

  function open() {
    if (!overlay) buildOverlay();
    overlay.style.display = '';
    cancelAnimationFrame(rafId);
    const p = window.Moyu.getProject();
    currentLayout = (p.graphSettings && p.graphSettings.layout) || 'force';
    currentChapter = (p.graphSettings && p.graphSettings.currentChapter) || Infinity;
    const sel = overlay.querySelector('#graphLayout');
    if (sel) sel.value = currentLayout;
    requestAnimationFrame(() => {
      resize();
      refresh();
      loop();
    });
  }

  function close() {
    cancelAnimationFrame(rafId);
    if (overlay) overlay.style.display = 'none';
  }

  return { open, close };
})();
