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

  /* 关系强度:按共现次数分级 */
  const REL_LEVELS = [
    { name: '擦肩', min: 1 },
    { name: '频繁', min: 4 },
    { name: '紧密', min: 8 },
  ];
  const relLevel = w => w >= REL_LEVELS[2].min ? 2 : w >= REL_LEVELS[1].min ? 1 : 0;

  /* ---------- 文本抽取 ---------- */
  const STOP_WORDS = new Set([
    // 代词/人称泛称
    '有人', '众人', '大家', '一个', '没有', '什么', '怎么', '这样', '那样', '自己',
    '他们', '我们', '你们', '她们', '老人', '少年', '少女', '男子', '女子', '孩子',
    '男人', '女人', '父亲', '母亲', '师父', '那人', '人人', '人们', '人间',
    // 常见身体/神态
    '眼睛', '目光', '脸色', '神情', '声音', '身影', '脚步', '手掌', '手指', '胸口',
    '心底', '脸上', '心中', '脑海', '耳边', '唇边', '嘴角', '眉间', '眉头', '眼底',
    // 时间/副词
    '今天', '明天', '昨天', '晚上', '上午', '下午', '半夜', '凌晨', '此刻', '当时',
    '后来', '之前', '之后', '忽然', '突然', '终于', '渐渐', '慢慢', '缓缓', '立刻',
    '马上', '刚才', '从前', '以后', '未来', '过去', '一时', '片刻', '许久', '很久',
    // 空间/场所
    '岛屿', '海岛', '海岸', '沙滩', '森林', '山脉', '河流', '湖泊', '海洋', '天空',
    '大地', '草原', '沙漠', '山谷', '树林', '花园', '庭院', '屋顶', '房间', '门口',
    '窗前', '楼下', '楼上', '门外', '门内', '路边', '街角', '巷口', '城市', '村庄',
    '城镇', '街道', '广场', '车站', '码头', '港口', '机场', '大厅', '走廊', '楼梯',
    // 物品
    '桌子', '椅子', '门窗', '窗户', '墙壁', '地板', '灯光', '电话', '手机', '书本',
    '文件', '纸张', '香烟', '酒杯', '茶杯', '碗筷', '刀剑', '枪支', '车辆', '船只',
    '飞机', '行李', '包裹', '箱子', '钥匙', '钱包', '手表', '眼镜', '雨伞', '帽子',
    // 抽象/叙事常用词
    '事情', '东西', '地方', '时候', '原因', '结果', '问题', '答案', '方法', '办法',
    '语气', '眼神', '表情', '动作', '态度', '感觉', '想法', '心情', '情绪', '气氛',
    '空气', '光线', '温度', '时间', '空间', '世界', '社会', '国家', '民族', '家族',
    '家庭', '家门', '天下', '地上', '手里', '心里', '眼前', '身后', '周围', '身旁',
    // 常见动词短语
    '看着', '听着', '想着', '说着', '笑着', '问道', '答道', '说道', '知道', '明白',
    '觉得', '认为', '以为', '看见', '听见', '发现', '感到', '想起', '记得', '忘记',
    '准备', '开始', '结束', '继续', '停止', '转身', '回头', '上前', '后退', '坐下',
    '站起', '走来', '走去', '过来', '过去', '出去', '进来', '上下', '前后', '左右',
    '内外', '远近', '大小', '多少', '高低', '长短', '好坏', '真假', '虚实', '轻重',
    // 常见副词/虚词/动词
    '已经', '曾经', '正在', '将要', '就要', '正在', '果然', '竟然', '难道', '也许',
    '或许', '大概', '恐怕', '似乎', '好像', '一定', '必须', '应该', '可以', '能够',
    '愿意', '想要', '需要', '开口', '闭口', '抬头', '低头', '点头', '摇头', '伸手',
    '摆手', '皱眉', '咬牙', '闭眼', '睁眼', '叹气', '呼吸', '心跳', '脚步', '动作',
    '样子', '模样', '神情', '表情', '脸色', '目光', '眼神', '声音', '语气', '话音',
    '口气', '口吻', '耳边', '眼前', '面前', '身后', '周围', '一旁', '一边', '一角',
    // 其他高频非人名
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
    const mentions = new Map();  // name -> count
    const rels = new Map();      // "a|b" -> { a, b, w, evi, eviWhere }
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

    /* 新人物线索：对话动词前的高频专名 + 全文中高频 2-4 字词 */
    const known = new Set(chars.map(c => c.name));
    const found = new Map();      // name -> total score
    const speechHits = new Map(); // name -> speech evidence count

    // 1. 对话线索（权重更高，可信度更高）
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

    // 2. 全文中重复出现的 2-4 字专名（按长度分别滑窗，避免跨词粘连）
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
        // 有对话线索时门槛低一些；纯靠频率时需要更多出现次数
        if (n < (hasSpeech ? 3 : 5)) return false;
        // 跳过与已有角色高度重叠的项
        for (const k of known) {
          if (name.includes(k) || k.includes(name)) return false;
        }
        return true;
      })
      .sort((x, y) => y[1] - x[1])
      .slice(0, 12)
      .map(([name, n]) => ({ name, n }));

    return { chars, mentions, rels: [...rels.values()], candidates };
  }

  /* ---------- 覆盖层 DOM ---------- */
  let overlay = null, canvas = null, ctx = null;
  let sim = null, rafId = 0, ro = null;
  let viewScale = 1, viewOffsetX = 0, viewOffsetY = 0;
  const MIN_SCALE = 0.3, MAX_SCALE = 4;

  function buildOverlay() {
    overlay = document.createElement('div');
    overlay.className = 'graph-overlay';
    overlay.innerHTML = `
      <div class="graph-top">
        <span class="graph-title">人物关系网</span>
        <span class="graph-meta" id="graphMeta"></span>
        <div class="legend" id="graphLegend"></div>
        <div class="graph-zoom">
          <button class="icon-btn" id="graphZoomOut" title="缩小">−</button>
          <span id="graphZoomValue">100%</span>
          <button class="icon-btn" id="graphZoomIn" title="放大">+</button>
          <button class="icon-btn" id="graphZoomReset" title="重置">⟲</button>
        </div>
        <button class="icon-btn" id="graphClose" title="关闭">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
      <div class="graph-main">
        <div class="graph-canvas-wrap">
          <canvas id="graphCanvas"></canvas>
          <div class="graph-hint">拖动节点调整布局 · 点击节点查看关系</div>
        </div>
        <aside class="graph-side" id="graphSide"></aside>
      </div>`;
    document.body.appendChild(overlay);
    canvas = overlay.querySelector('#graphCanvas');
    ctx = canvas.getContext('2d');
    overlay.querySelector('#graphClose').addEventListener('click', close);
    overlay.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement);
    bindCanvas();
  }

  function resize() {
    if (!canvas) return;
    const r = canvas.parentElement.getBoundingClientRect();
    if (!r.width || !r.height) return; // 等 ResizeObserver 下次触发
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, r.width * dpr);
    canvas.height = Math.max(1, r.height * dpr);
    canvas.style.width = r.width + 'px';
    canvas.style.height = r.height + 'px';
    resetView();
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
    // 如果画布还没拿到尺寸，先用一个安全中心，等 ResizeObserver 触发后再校正
    const cx = (r.width || 800) / 2, cy = (r.height || 600) / 2;
    const nodes = data.chars.map((c, i) => {
      const n = data.mentions.get(c.name) || 0;
      // 初始位置按圆周均匀分布，节点越多圆周越大，避免堆叠
      const count = data.chars.length || 1;
      const angleStep = (Math.PI * 2) / count;
      const ang = angleStep * i + Math.random() * 0.3;
      const dist = Math.min(180, 60 + count * 14);
      return {
        name: c.name, tag: c.tag || '其他', mentions: n,
        x: cx + Math.cos(ang) * dist,
        y: cy + Math.sin(ang) * dist,
        vx: 0, vy: 0, r: Math.min(30, 13 + Math.sqrt(n) * 2.2),
        fixed: false,
      };
    });
    const byName = new Map(nodes.map(n => [n.name, n]));
    const edges = data.rels
      .filter(rel => byName.has(rel.a) && byName.has(rel.b))
      .map(rel => ({ a: byName.get(rel.a), b: byName.get(rel.b), w: rel.w, evi: rel.evi, eviWhere: rel.eviWhere }));
    return { nodes, edges, sel: null, hover: null, drag: null };
  }

  function step() {
    const { nodes, edges } = sim;
    const r = canvas.parentElement.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const cx = r.width / 2, cy = r.height / 2;
    const calm = sim.drag ? 0.35 : 1; // 拖动时降低整体受力，方便自由拖动

    // 排斥力：让节点不重叠，但不要太强
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

    // 边吸引力：把有关系的节点拉到一起
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
        // 向中心的温和引力，防止节点飞出画布
        n.vx += (cx - n.x) * 0.015 * calm;
        n.vy += (cy - n.y) * 0.015 * calm;
        const maxV = 28;
        const v = Math.hypot(n.vx, n.vy);
        if (v > maxV) { n.vx = (n.vx / v) * maxV; n.vy = (n.vy / v) * maxV; }
        n.x += n.vx; n.y += n.vy;
      }
      n.vx *= 0.82; n.vy *= 0.82;
      // 限制在画布内
      const pad = n.r + 10;
      n.x = Math.max(pad, Math.min(r.width - pad, n.x));
      n.y = Math.max(pad, Math.min(r.height - pad, n.y));
    }
  }

  function draw() {
    const r = canvas.parentElement.getBoundingClientRect();
    const P = pal();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    applyViewTransform();
    const sel = sim.sel;
    const linked = new Set();
    if (sel) sim.edges.forEach(e => {
      if (e.a === sel) linked.add(e.b);
      if (e.b === sel) linked.add(e.a);
    });

    for (const e of sim.edges) {
      const lv = relLevel(e.w);
      const dim = sel && !(e.a === sel || e.b === sel);
      ctx.globalAlpha = dim ? P.dimAlpha : 0.9;
      ctx.strokeStyle = P.edge[lv];
      ctx.lineWidth = 1 + lv * 1.3;
      ctx.beginPath();
      ctx.moveTo(e.a.x, e.a.y);
      ctx.lineTo(e.b.x, e.b.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    for (const n of sim.nodes) {
      const dim = sel && n !== sel && !linked.has(n);
      ctx.globalAlpha = dim ? P.dimAlpha + 0.15 : 1;
      ctx.fillStyle = P.node[n.tag] || P.node['其他'];
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
      if (n === sel) {
        ctx.strokeStyle = P.selRing;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + 4, 0, Math.PI * 2);
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
  }

  function loop() {
    step();
    draw();
    rafId = requestAnimationFrame(loop);
  }

  /* ---------- 侧栏 ---------- */
  function renderLegend() {
    const P = pal();
    const dots = Object.entries(P.node)
      .map(([t, c]) => `<span class="lg"><i class="dot" style="background:${c}"></i>${t}</span>`).join('');
    const lines = REL_LEVELS.map((l, i) =>
      `<span class="lg"><i class="line" style="background:${P.edge[i]}"></i>${l.name}</span>`).join('');
    overlay.querySelector('#graphLegend').innerHTML = dots + lines;
  }

  function renderSide(data) {
    const side = overlay.querySelector('#graphSide');
    const P = pal();
    const sel = sim.sel;
    const persons = data.chars
      .map(c => ({ ...c, n: data.mentions.get(c.name) || 0 }))
      .sort((a, b) => b.n - a.n);

    let relHtml = '';
    if (sel) {
      const mine = sim.edges
        .filter(e => e.a === sel || e.b === sel)
        .sort((a, b) => b.w - a.w);
      relHtml = `
        <div>
          <div class="gs-cap"><span>「${sel.name}」的关系</span><span>${mine.length} 条</span></div>
          ${mine.length ? mine.map(e => {
            const other = e.a === sel ? e.b : e.a;
            const lv = REL_LEVELS[relLevel(e.w)];
            const c = P.edge[relLevel(e.w)];
            return `<div class="rel-row">
              <div class="rel-head">
                <span class="rel-name">${other.name}</span>
                <span class="rel-type" style="color:${c};border-color:${c}">${lv.name}</span>
                <span class="rel-w">同框 ${e.w} 段</span>
              </div>
              <div class="rel-evi">${escapeHtml(e.evi)}<br><span style="color:var(--muted);font-size:11px">— ${escapeHtml(e.eviWhere)}</span></div>
            </div>`;
          }).join('') : '<div class="gs-empty">没有检测到与其他角色的同框段落。</div>'}
        </div>`;
    }

    side.innerHTML = `
      <div>
        <div class="gs-cap"><span>人物</span><span>${persons.length}</span></div>
        ${persons.length ? persons.map(p => `
          <div class="person-row${sel && sel.name === p.name ? ' sel' : ''}" data-name="${escapeHtml(p.name)}">
            <span class="person-dot" style="background:${P.node[p.tag] || P.node['其他']}"></span>
            <span class="person-name">${escapeHtml(p.name)}</span>
            <span class="person-tag">${escapeHtml(p.tag)}</span>
            <span class="person-n">${p.n}</span>
          </div>`).join('') : '<div class="gs-empty">还没有角色。<br>去右侧「角色」页添加,或从下方"新发现"里一键加入。</div>'}
      </div>
      ${data.candidates.length ? `
      <div>
        <div class="gs-cap"><span>新发现</span><span>疑似人物</span></div>
        ${data.candidates.map(c => `
          <div class="person-row new-found">
            <span class="person-dot" style="background:var(--gold)"></span>
            <span class="person-name">${escapeHtml(c.name)}</span>
            <span class="person-n">${c.n} 次</span>
            <button class="join-btn" data-name="${escapeHtml(c.name)}">加入角色</button>
          </div>`).join('')}
        <button class="add-block" id="joinAllCandidates" style="margin-top:8px">全部加入角色</button>
      </div>` : ''}
      ${relHtml}`;

    side.querySelectorAll('.person-row[data-name]').forEach(row => {
      row.addEventListener('click', () => {
        const node = sim.nodes.find(n => n.name === row.dataset.name);
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
    if (joinAll) {
      joinAll.addEventListener('click', () => {
        data.candidates.forEach(c => window.Moyu.addCharacter(c.name));
        refresh();
      });
    }
  }

  function escapeHtml(s) {
    return (s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  /* ---------- 画布交互 ---------- */
  function nodeAt(x, y) {
    for (let i = sim.nodes.length - 1; i >= 0; i--) {
      const n = sim.nodes[i];
      if (Math.hypot(n.x - x, n.y - y) <= n.r + 3) return n;
    }
    return null;
  }
  function bindCanvas() {
    const pos = e => {
      const r = canvas.getBoundingClientRect();
      return screenToWorld(e.clientX - r.left, e.clientY - r.top);
    };
    canvas.addEventListener('pointerdown', e => {
      const p = pos(e);
      const n = nodeAt(p.x, p.y);
      if (n) {
        sim.drag = n;
        n.fixed = true;
        canvas.classList.add('grabbing');
        canvas.setPointerCapture(e.pointerId);
      }
    });
    canvas.addEventListener('pointermove', e => {
      const p = pos(e);
      if (sim.drag) {
        sim.drag.x = p.x; sim.drag.y = p.y;
        return;
      }
      const n = nodeAt(p.x, p.y);
      sim.hover = n;
      canvas.classList.toggle('point', !!n);
    });
    canvas.addEventListener('pointerup', e => {
      const p = pos(e);
      if (sim.drag) {
        const n = sim.drag;
        n.fixed = false;
        sim.drag = null;
        canvas.classList.remove('grabbing');
        if (Math.hypot(n.x - p.x, n.y - p.y) < 1) {
          sim.sel = sim.sel === n ? null : n;
          renderSide(lastData);
        } else {
          sim.sel = n;
          renderSide(lastData);
        }
      }
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

  /* ---------- 打开 / 关闭 / 刷新 ---------- */
  let lastData = null;

  function refresh() {
    const data = extract(window.Moyu.getProject());
    lastData = data;
    const keepSel = sim && sim.sel ? sim.sel.name : null;
    sim = makeSim(data);
    if (keepSel) sim.sel = sim.nodes.find(n => n.name === keepSel) || null;
    overlay.querySelector('#graphMeta').textContent =
      `${data.chars.length} 个人物 · ${data.rels.length} 组关系`;
    renderLegend();
    renderSide(data);
  }

  function open() {
    if (!overlay) buildOverlay();
    overlay.style.display = '';
    cancelAnimationFrame(rafId);
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
