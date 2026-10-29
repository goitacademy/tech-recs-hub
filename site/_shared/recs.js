/*
 * Builds a recommendations page from the global `RECS` object that the page defines before loading this script.
 * Data format: see CLAUDE.md. Text values may contain a small set of inline HTML tags (see INLINE_TAGS).
 * In Node, this file only exports validate() for scripts/validate-recs.js.
 */
(function () {
  'use strict';

  const ACCENTS = ['blue', 'pink', 'green', 'yellow', 'violet'];
  const STORAGE_PREFIX = 'tech-recs:';

  const CALLOUTS = {
    why: { label: 'Чому так', icon: 'bulb', hint: 'пояснення, чому це важливо' },
    how: { label: 'Як правильно', icon: 'check', hint: 'конкретні кроки' },
    ex: { label: 'Приклад', icon: 'play', hint: 'приклад або шаблон' },
    tip: { label: 'Лайфхак', icon: 'spark', hint: 'прийом, що економить час' },
    warn: { label: 'Увага', icon: 'warn', hint: 'критичний момент' },
    error: { label: 'Типова помилка', icon: 'cross', hint: 'чого уникати' },
    note: { label: 'Примітка', icon: 'pin', hint: 'додаткове уточнення' },
  };

  const KEYS = {
    root: ['course', 'subtitle', 'intro', 'modules', 'blocks', 'outro'],
    block: ['title', 'summary', 'intro', 'outro', 'modules'],
    module: ['label', 'title', 'icon', 'intro', 'note', 'tips', 'mistake', 'links', 'checklist', 'outro'],
    tip: ['title', 'body'],
    mistake: ['title', 'body'],
    link: ['text', 'url'],
    check: ['q', 'a'],
    callout: ['callout', 'title', 'body'],
  };

  // 9x9 pixel icons: "X" = filled pixel.
  const ICONS = {
    terminal: ['.........', '.X.......', '..X......', '...X.....', '..X......', '.X.......', '.........', '....XXXX.', '.........'],
    code: ['.........', '..XX.XX..', '..X...X..', '..X...X..', '.X.....X.', '..X...X..', '..X...X..', '..XX.XX..', '.........'],
    globe: ['...XXX...', '..X.X.X..', '.X..X..X.', 'XXXXXXXXX', 'X...X...X', 'XXXXXXXXX', '.X..X..X.', '..X.X.X..', '...XXX...'],
    play: ['.........', '..X......', '..XX.....', '..XXX....', '..XXXX...', '..XXX....', '..XX.....', '..X......', '.........'],
    layers: ['XXXXXX...', 'X....X...', 'X..XXXXXX', 'X..X.X..X', 'XXXXXX..X', '...X....X', '...X....X', '...XXXXXX', '.........'],
    calendar: ['X.X...X.X', 'XXXXXXXXX', 'X.......X', 'XXXXXXXXX', 'X.X.X.X.X', 'X.......X', 'X.X.X.X.X', 'X.......X', 'XXXXXXXXX'],
    spark: ['....X....', '....X....', '...XXX...', 'XX.XXX.XX', '..XXXXX..', '...XXX...', '..X...X..', '.X.....X.', '.........'],
    briefcase: ['...XXX...', '...X.X...', 'XXXXXXXXX', 'X.......X', 'X.......X', 'XXXXXXXXX', 'X...X...X', 'X.......X', 'XXXXXXXXX'],
    box: ['...XXX...', '.XX...XX.', 'X...X...X', 'XXX.X.XXX', 'X..XXX..X', 'X...X...X', 'X...X...X', '.XX.X.XX.', '...XXX...'],
    check: ['.........', '.......XX', '......XX.', '.....XX..', 'XX..XX...', '.XXXX....', '..XX.....', '.........', '.........'],
    target: ['..XXXXX..', '.X.....X.', 'X..XXX..X', 'X.X...X.X', 'X.X.X.X.X', 'X.X...X.X', 'X..XXX..X', '.X.....X.', '..XXXXX..'],
    db: ['.XXXXXXX.', 'X.......X', '.XXXXXXX.', 'X.......X', '.XXXXXXX.', 'X.......X', '.XXXXXXX.', 'X.......X', '.XXXXXXX.'],
    chart: ['.......X.', '.......X.', '....X..X.', '....X..X.', '.X..X..X.', '.X..X..X.', '.X..X..X.', 'XXXXXXXXX', '.........'],
    server: ['XXXXXXXXX', 'X.......X', 'X.XX..X.X', 'XXXXXXXXX', 'X.......X', 'X.XX..X.X', 'XXXXXXXXX', '....X....', '..XXXXX..'],
    lock: ['..XXXXX..', '.X.....X.', '.X.....X.', 'XXXXXXXXX', 'X.......X', 'X...X...X', 'X...X...X', 'X.......X', 'XXXXXXXXX'],
    grid: ['XX.XX.XX.', 'XX.XX.XX.', '.........', 'XX.XX.XX.', 'XX.XX.XX.', '.........', 'XX.XX.XX.', 'XX.XX.XX.', '.........'],
    loop: ['..XXXXX..', '.X.....X.', 'X.......X', 'X.......X', 'X.....XXX', 'X......X.', 'X........', '.X.......', '..XXX....'],
    text: ['XXXXXXXXX', '.........', 'XXXXXX...', '.........', 'XXXXXXXXX', '.........', 'XXXX.....', '.........', 'XXXXXXX..'],
    plug: ['..X...X..', '..X...X..', 'XXXXXXXXX', 'X.......X', 'X.......X', '.X.....X.', '..XXXXX..', '....X....', '....X....'],
    list: ['XX.XXXXXX', '.........', 'XX.XXXXXX', '.........', 'XX.XXXXXX', '.........', 'XX.XXXXXX', '.........', '.........'],
    file: ['XXXXX....', 'X...XX...', 'X...X.X..', 'X...XXXX.', 'X......X.', 'X.XXXX.X.', 'X......X.', 'X.XXXX.X.', 'XXXXXXXX.'],
    plus: ['...XXX...', '...X.X...', '...X.X...', 'XXXX.XXXX', 'X.......X', 'XXXX.XXXX', '...X.X...', '...X.X...', '...XXX...'],
    var: ['.........', 'XXXXXXXXX', 'X.......X', 'X.XXXXX.X', 'X.......X', 'X.XXXXX.X', 'X.......X', 'XXXXXXXXX', '.........'],
    threads: ['.X..X..X.', '.X..X..X.', '.X..X..X.', '.X..X..X.', '.X..X..X.', '.X..X..X.', 'XXXXXXXXX', '.X..X..X.', '..X.X.X..'],
    cookie: ['..XXXXX..', '.X.....X.', 'X..X....X', 'X.....X.X', 'X...X...X', 'X.X.....X', 'X....X..X', '.X.....X.', '..XXXXX..'],
    leaf: ['....XXXXX', '..XX....X', '.X.....XX', '.X....X.X', 'X....X..X', 'X...X..X.', 'X..X..X..', '.XXXXX...', 'X........'],
    coffee: ['..X.X.X..', '...X.X...', '.........', 'XXXXXXX..', 'X.....XXX', 'X.....X.X', 'X.....XXX', '.X...X...', '..XXX....'],
    lambda: ['XX.......','..X......', '..X......', '...X.....', '...XX....', '..X..X...', '..X..X...', '.X....X..', '.X....XX.'],
    image: ['.........', 'XXXXXXXXX', 'X.......X', 'X.....X.X', 'X.......X', 'X...X...X', 'X..XXX..X', 'X.XXXXX.X', 'XXXXXXXXX'],
    house: ['....X....', '...XXX...', '..XXXXX..', '.XXXXXXX.', 'XXXXXXXXX', '.XX...XX.', '.XX.X.XX.', '.XX.X.XX.', '.XXXXXXX.'],
    bulb: ['...XXX...', '..X...X..', '.X.....X.', '.X.....X.', '..X...X..', '...X.X...', '...XXX...', '...XXX...', '....X....'],
    warn: ['....X....', '...XXX...', '...X.X...', '..XX.XX..', '..XX.XX..', '.XXXXXXX.', '.XXX.XXX.', 'XXXXXXXXX', '.........'],
    cross: ['X.......X', '.X.....X.', '..X...X..', '...X.X...', '....X....', '...X.X...', '..X...X..', '.X.....X.', 'X.......X'],
    pin: ['...XXX...', '..XXXXX..', '..XXXXX..', '..XXXXX..', '.XXXXXXX.', '....X....', '....X....', '....X....', '....X....'],
    search: ['..XXX....', '.X...X...', 'X.....X..', 'X.....X..', 'X.....X..', '.X...X...', '..XXXX...', '......XX.', '.......XX'],
    link: ['.........', '..XXX....', '.X...X...', '.X..XXX..', '..XXX..X.', '....X..X.', '....X..X.', '.....XX..', '.........'],
    arrow: ['.........', '...XXXXX.', '......XX.', '.....X.X.', '....X..X.', '...X.....', '..X......', '.X.......', '.........'],
    up: ['....X....', '...XXX...', '..X.X.X..', '.X..X..X.', '....X....', '....X....', '....X....', '....X....', '.........'],
  };

  /* ---------- validation ---------- */

  const isText = (v) => typeof v === 'string' && v.trim() !== '';
  const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

  function unknownKeys(obj, allowed, at, errors) {
    for (const key of Object.keys(obj)) {
      if (!allowed.includes(key)) errors.push(`${at}${key}: unknown field (allowed: ${allowed.join(', ')})`);
    }
  }

  const INLINE_TAGS = ['b', 'strong', 'i', 'em', 'u', 'code', 'br', 'a'];

  /* Text may contain only INLINE_TAGS without attributes, and <a href="https://...">. Code may contain only highlight spans. */
  function checkHtml(text, at, errors, isCode) {
    const re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g;
    let m;
    while ((m = re.exec(text))) {
      const [tag, closing, name, attrs] = m;
      const n = name.toLowerCase();
      let ok;
      if (isCode) ok = n === 'span' && (closing || /^\s+class="(kw|st|nm|cm)"$/.test(attrs));
      else if (n === 'a') ok = closing ? attrs.trim() === '' : /^\s+href="https:\/\/[^"\s<>]+"$/.test(attrs);
      else ok = INLINE_TAGS.includes(n) && /^\s*\/?$/.test(attrs);
      if (!ok) {
        const allowed = isCode ? '<span class="kw|st|nm|cm">' : `${INLINE_TAGS.join(', ')} (a only with href="https://...")`;
        errors.push(`${at}: tag ${tag} is not allowed (allowed: ${allowed})`);
      }
    }
  }

  function text(v, at, errors, required) {
    if (v === undefined && !required) return;
    if (!isText(v)) { errors.push(`${at}: ${required ? 'required ' : 'must be '}text`); return; }
    checkHtml(v, at, errors, false);
  }

  function textList(v, at, errors) {
    if (!Array.isArray(v) || v.length === 0) { errors.push(`${at}: must be a non-empty list of text`); return; }
    v.forEach((t, i) => text(t, `${at}[${i}]`, errors, true));
  }

  /* One content item: paragraph text, { heading }, { list }, { steps }, { code }, { template }, or { callout } (not inside a callout). */
  function contentItem(item, at, errors, inCallout) {
    if (typeof item === 'string') { text(item, at, errors, true); return; }
    if (!isObject(item)) { errors.push(`${at}: must be text or an object`); return; }
    const keys = Object.keys(item);
    if (keys.length === 1 && keys[0] === 'heading') { text(item.heading, `${at}.heading`, errors, true); return; }
    if (keys.length === 1 && keys[0] === 'list') { textList(item.list, `${at}.list`, errors); return; }
    if (keys.length === 1 && keys[0] === 'steps') { textList(item.steps, `${at}.steps`, errors); return; }
    if (keys.length === 1 && (keys[0] === 'code' || keys[0] === 'template')) {
      const key = keys[0];
      if (!isText(item[key])) errors.push(`${at}.${key}: required text`);
      else checkHtml(item[key], `${at}.${key}`, errors, true);
      return;
    }
    if ('callout' in item && !inCallout) {
      unknownKeys(item, KEYS.callout, `${at}.`, errors);
      if (!Object.keys(CALLOUTS).includes(item.callout)) errors.push(`${at}.callout: must be one of ${Object.keys(CALLOUTS).join(', ')}`);
      text(item.title, `${at}.title`, errors, false);
      content(item.body, `${at}.body`, errors, true);
      return;
    }
    errors.push(`${at}: unknown content item; use text, { heading }, { list }, { steps }, { code }, { template }` + (inCallout ? '' : ', or { callout, title, body }'));
  }

  /* Content: one paragraph of text, or a non-empty list of content items. */
  function content(v, at, errors, inCallout) {
    if (typeof v === 'string') { text(v, at, errors, true); return; }
    if (!Array.isArray(v) || v.length === 0) { errors.push(`${at}: must be text or a non-empty list of content items`); return; }
    v.forEach((item, i) => contentItem(item, `${at}[${i}]`, errors, inCallout));
  }

  function validateModule(m, at, errors) {
    if (!isObject(m)) { errors.push(`${at}: must be an object`); return; }
    unknownKeys(m, KEYS.module, `${at}.`, errors);
    text(m.title, `${at}.title`, errors, true);
    text(m.label, `${at}.label`, errors, false);
    text(m.intro, `${at}.intro`, errors, false);
    text(m.note, `${at}.note`, errors, false);
    if (m.icon !== undefined && !Object.prototype.hasOwnProperty.call(ICONS, m.icon)) {
      errors.push(`${at}.icon: unknown icon (allowed: ${Object.keys(ICONS).join(', ')})`);
    }
    if (!Array.isArray(m.tips) || m.tips.length === 0) {
      errors.push(`${at}.tips: required non-empty list`);
    } else {
      m.tips.forEach((t, i) => {
        const tat = `${at}.tips[${i}]`;
        if (!isObject(t)) { errors.push(`${tat}: must be { title, body }`); return; }
        unknownKeys(t, KEYS.tip, `${tat}.`, errors);
        text(t.title, `${tat}.title`, errors, true);
        content(t.body, `${tat}.body`, errors, false);
      });
    }
    if (m.mistake !== undefined) {
      if (!isObject(m.mistake)) errors.push(`${at}.mistake: must be { title, body }`);
      else {
        unknownKeys(m.mistake, KEYS.mistake, `${at}.mistake.`, errors);
        text(m.mistake.title, `${at}.mistake.title`, errors, false);
        content(m.mistake.body, `${at}.mistake.body`, errors, false);
      }
    }
    if (m.links !== undefined) {
      if (!Array.isArray(m.links) || m.links.length === 0) errors.push(`${at}.links: must be a non-empty list`);
      else m.links.forEach((l, i) => {
        const lat = `${at}.links[${i}]`;
        if (!isObject(l)) { errors.push(`${lat}: must be { text, url }`); return; }
        unknownKeys(l, KEYS.link, `${lat}.`, errors);
        text(l.text, `${lat}.text`, errors, true);
        if (!(typeof l.url === 'string' && /^https:\/\/[^\s"<>]+$/.test(l.url))) errors.push(`${lat}.url: must be an https:// address`);
      });
    }
    if (m.checklist !== undefined) {
      if (!Array.isArray(m.checklist) || m.checklist.length === 0) errors.push(`${at}.checklist: must be a non-empty list`);
      else m.checklist.forEach((c, i) => {
        const cat = `${at}.checklist[${i}]`;
        if (!isObject(c)) { errors.push(`${cat}: must be { q, a }`); return; }
        unknownKeys(c, KEYS.check, `${cat}.`, errors);
        text(c.q, `${cat}.q`, errors, true);
        text(c.a, `${cat}.a`, errors, false);
      });
    }
    if (m.outro !== undefined) content(m.outro, `${at}.outro`, errors, false);
  }

  function validateModules(list, at, errors) {
    if (!Array.isArray(list) || list.length === 0) { errors.push(`${at}: required non-empty list`); return; }
    list.forEach((m, i) => validateModule(m, `${at}[${i}]`, errors));
  }

  /* Returns a list of problems in the data; an empty list means the data is valid. */
  function validate(recs) {
    const errors = [];
    if (!isObject(recs)) return ['RECS: must be an object'];
    unknownKeys(recs, KEYS.root, '', errors);
    text(recs.course, 'course', errors, true);
    text(recs.subtitle, 'subtitle', errors, false);
    if (recs.intro !== undefined) content(recs.intro, 'intro', errors, false);
    text(recs.outro, 'outro', errors, false);

    const hasModules = recs.modules !== undefined;
    const hasBlocks = recs.blocks !== undefined;
    if (hasModules === hasBlocks) {
      errors.push('modules / blocks: use exactly one of them (blocks for a course with blocks, modules otherwise)');
    } else if (hasModules) {
      validateModules(recs.modules, 'modules', errors);
    } else if (!Array.isArray(recs.blocks) || recs.blocks.length === 0) {
      errors.push('blocks: required non-empty list');
    } else {
      recs.blocks.forEach((b, i) => {
        const at = `blocks[${i}]`;
        if (!isObject(b)) { errors.push(`${at}: must be an object`); return; }
        unknownKeys(b, KEYS.block, `${at}.`, errors);
        text(b.title, `${at}.title`, errors, true);
        text(b.summary, `${at}.summary`, errors, false);
        text(b.intro, `${at}.intro`, errors, false);
        text(b.outro, `${at}.outro`, errors, false);
        validateModules(b.modules, `${at}.modules`, errors);
      });
    }
    return errors;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { validate };
    return;
  }

  /* ---------- rendering ---------- */

  const pad = (n) => String(n).padStart(2, '0');
  const attr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const px = (name, extra) => `<span class="px${extra ? ' ' + extra : ''}" data-icon="${name}"></span>`;

  function renderContent(v) {
    const items = typeof v === 'string' ? [v] : v;
    return items.map((item) => {
      if (typeof item === 'string') return `<p>${item}</p>`;
      if ('heading' in item) return `<h4>${item.heading}</h4>`;
      if ('list' in item) return `<ul>${item.list.map((t) => `<li>${t}</li>`).join('')}</ul>`;
      if ('steps' in item) return `<ol>${item.steps.map((t) => `<li>${t}</li>`).join('')}</ol>`;
      if ('code' in item) return `<div class="code"><pre>${item.code}</pre></div>`;
      if ('template' in item) return `<div class="code tpl"><pre>${item.template}</pre></div>`;
      return renderCallout(item);
    }).join('');
  }

  function renderCallout(c) {
    const kind = CALLOUTS[c.callout];
    const sameAsLabel = c.title && c.title.trim().toLowerCase() === kind.label.toLowerCase();
    const title = c.title && !sameAsLabel ? `<span class="callout-title">${c.title}</span>` : '';
    return `<div class="callout k-${c.callout}">
      <div class="callout-head"><span class="callout-type">${px(kind.icon)}${kind.label}</span>${title}</div>
      <div class="rich">${renderContent(c.body)}</div>
    </div>`;
  }

  /* "Модуль 5" → 5, so the badge matches a custom label; null when the label has no number. */
  const labelNumber = (label) => {
    const n = label && label.replace(/<[^>]+>/g, '').match(/\d+/);
    return n ? Number(n[0]) : null;
  };

  function renderModule(m, id, index, color) {
    const tips = m.tips.map((t, i) => `<article class="tip">
      <div class="tip-head"><div class="tip-num c-${color}">${i + 1}</div><h3>${t.title}</h3></div>
      <div class="tip-body rich">${renderContent(t.body)}</div>
    </article>`).join('');

    const mistake = m.mistake ? `<div class="mistake c-${color}">
      <div class="icon-box">${px('warn')}</div>
      <div><small>Типова помилка</small>${m.mistake.title ? `<h3>${m.mistake.title}</h3>` : ''}<div class="rich">${renderContent(m.mistake.body)}</div></div>
    </div>` : '';

    const checklist = m.checklist ? `<div class="checklist">
      <h3>${px('check')}Чек-лист самоперевірки</h3>
      <p class="hint">Спробуйте відповісти самостійно, потім відкрийте відповідь.</p>
      ${m.checklist.map((c, i) => `<div class="check">
        <input type="checkbox" id="${id}-c${i + 1}" data-check="${id}-c${i + 1}"><label for="${id}-c${i + 1}">${c.q}</label>
        ${c.a ? `<details><summary>Відповідь</summary><p>${c.a}</p></details>` : ''}
      </div>`).join('')}
    </div>` : '';

    const links = m.links ? `<div class="links"><h3>${px('link')}Корисні посилання</h3>
      ${m.links.map((l) => `<div class="link-row"><span>${l.text}</span><a class="btn" target="_blank" rel="noopener" href="${attr(l.url)}">Відкрити ${px('arrow')}</a></div>`).join('')}
    </div>` : '';

    return `<section class="module" id="${id}">
      <div class="mod-head">
        <div class="mod-badge c-${color}">${px(m.icon || 'bulb')}<b>${pad(labelNumber(m.label) || index)}</b></div>
        <div>
          <div class="mod-label">${m.label || `Модуль ${index}`}</div>
          <h2>${m.title}</h2>
          ${m.intro ? `<p>${m.intro}</p>` : ''}
        </div>
      </div>
      ${m.note ? `<div class="note">${px('pin')}<div>${m.note}</div></div>` : ''}
      <div class="tips">${tips}</div>
      ${mistake}${checklist}
      ${m.outro ? `<div class="outro rich">${renderContent(m.outro)}</div>` : ''}
      ${links}
    </section>`;
  }

  function usedCallouts(recs) {
    const used = new Set();
    const walk = (v) => {
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') {
        if (typeof v.callout === 'string') used.add(v.callout);
        Object.values(v).forEach(walk);
      }
    };
    walk(recs);
    return Object.keys(CALLOUTS).filter((k) => used.has(k));
  }

  function render(recs) {
    const blocks = recs.blocks || null;
    const moduleCount = blocks ? blocks.reduce((n, b) => n + b.modules.length, 0) : recs.modules.length;

    let nav, cards, main;
    if (blocks) {
      nav = blocks.map((b, i) => `<a href="#b${i + 1}" data-block="${i + 1}">${pad(i + 1)} ${b.title}</a>`).join('');
      cards = blocks.map((b, i) => `<a href="#b${i + 1}" class="hero-card c-${ACCENTS[i % ACCENTS.length]}">
        <div class="num">Блок ${pad(i + 1)} ${px('layers')}</div>
        <div><div class="ttl">${b.title}</div>${b.summary ? `<p class="sum">${b.summary}</p>` : ''}</div>
        <div class="num">${b.modules.length} мод.</div>
      </a>`).join('');
      main = blocks.map((b, i) => {
        const color = ACCENTS[i % ACCENTS.length];
        const prev = i > 0 ? `<a class="btn" href="#b${i}">← ${blocks[i - 1].title}</a>` : '<span></span>';
        const next = i < blocks.length - 1 ? `<a class="btn" href="#b${i + 2}">${blocks[i + 1].title} →</a>` : '';
        return `<section class="block" id="b${i + 1}" data-block="${i + 1}">
          <div class="block-head c-${color}">
            <div class="block-num">${pad(i + 1)}</div>
            <div><small>Блок · ${b.modules.length} мод.</small><h2>${b.title}</h2>${b.intro ? `<p>${b.intro}</p>` : ''}</div>
          </div>
          ${b.modules.map((m, j) => renderModule(m, `b${i + 1}-m${j + 1}`, j + 1, color)).join('')}
          ${b.outro ? `<div class="block-outro">${b.outro}</div>` : ''}
          <nav class="pager">${prev}${next}</nav>
        </section>`;
      }).join('');
    } else {
      nav = recs.modules.map((m, i) => `<a href="#m${i + 1}">${pad(i + 1)}</a>`).join('');
      cards = recs.modules.map((m, i) => `<a href="#m${i + 1}" class="hero-card c-${ACCENTS[i % ACCENTS.length]}">
        <div class="num">${pad(i + 1)} ${px(m.icon || 'bulb')}</div><div class="ttl">${m.title}</div>
      </a>`).join('');
      main = recs.modules.map((m, i) => renderModule(m, `m${i + 1}`, i + 1, ACCENTS[i % ACCENTS.length])).join('');
    }

    const legendKinds = usedCallouts(recs);
    const legend = legendKinds.length > 1 ? `<div class="legend">${legendKinds.map((k) =>
      `<span><span class="callout-type">${px(CALLOUTS[k].icon)}${CALLOUTS[k].label}</span>${CALLOUTS[k].hint}</span>`).join('')}</div>` : '';

    document.body.insertAdjacentHTML('afterbegin', `
      <div class="progress" id="progress"></div>
      <header class="topbar">
        <div class="topbar-inner">
          <a href="#top" class="brand">${px('bulb')}${recs.course} <span class="long">· рекомендації</span></a>
          <nav class="nav" id="nav">${nav}</nav>
          <label class="search">${px('search')}<input type="search" id="search" placeholder="Пошук порад" aria-label="Пошук порад"></label>
        </div>
        <div class="search-status" id="search-status" hidden></div>
      </header>
      <main id="top">
        <section class="hero wrap" id="hero">
          <span class="eyebrow">${px('bulb')}Технічні рекомендації ментора · ${blocks ? `${blocks.length} бл. · ` : ''}${moduleCount} мод.</span>
          <h1>${recs.course}</h1>
          ${recs.subtitle ? `<p class="lead">${recs.subtitle}</p>` : ''}
          ${recs.intro ? `<div class="hero-intro rich">${renderContent(recs.intro)}</div>` : ''}
          ${legend}
          <div class="hero-grid">${cards}</div>
        </section>
        <div class="wrap" id="content">${main}${recs.outro ? `<div class="block-outro page-outro">${recs.outro}</div>` : ''}<p class="empty" id="empty" hidden>Нічого не знайдено. Спробуйте інше слово.</p></div>
      </main>
      <footer><div class="wrap"><p>${recs.course} · Технічні рекомендації ментора</p><a href="#top" class="btn">Нагору ${px('up')}</a></div></footer>`);
  }

  /* ---------- behavior ---------- */

  function drawIcons(root) {
    root.querySelectorAll('.px[data-icon]').forEach((el) => {
      const rows = ICONS[el.dataset.icon];
      if (!rows) return;
      let rects = '';
      rows.forEach((row, y) => [...row].forEach((c, x) => { if (c === 'X') rects += `<rect x="${x}" y="${y}" width="1" height="1"/>`; }));
      el.innerHTML = `<svg viewBox="0 0 9 9" aria-hidden="true">${rects}</svg>`;
    });
  }

  function setupCopy() {
    document.querySelectorAll('.code').forEach((block) => {
      const btn = document.createElement('button');
      btn.className = 'copy';
      btn.type = 'button';
      btn.textContent = 'Копіювати';
      btn.addEventListener('click', () => {
        const done = () => { btn.textContent = 'Скопійовано'; setTimeout(() => { btn.textContent = 'Копіювати'; }, 1500); };
        const text = block.querySelector('pre').innerText;
        if (navigator.clipboard) navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
        else fallbackCopy(text, done);
      });
      block.appendChild(btn);
    });
  }

  function fallbackCopy(text, done) {
    const t = document.createElement('textarea');
    t.value = text;
    document.body.appendChild(t);
    t.select();
    try { document.execCommand('copy'); done(); } catch (e) {}
    t.remove();
  }

  /* Self-check state is stored per page URL, so pages on the same origin never share it. */
  function setupChecklist() {
    const key = STORAGE_PREFIX + location.pathname;
    let state = {};
    try { state = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch (e) {}
    document.querySelectorAll('[data-check]').forEach((cb) => {
      const row = cb.closest('.check');
      cb.checked = !!state[cb.dataset.check];
      row.classList.toggle('done', cb.checked);
      cb.addEventListener('change', () => {
        state[cb.dataset.check] = cb.checked;
        row.classList.toggle('done', cb.checked);
        try { localStorage.setItem(key, JSON.stringify(state)); } catch (e) {}
      });
    });
  }

  function setup(recs) {
    const hasBlocks = !!recs.blocks;
    const nav = document.getElementById('nav');
    const links = [...nav.querySelectorAll('a')];
    const blockEls = [...document.querySelectorAll('.block')];
    const searchInput = document.getElementById('search');
    let currentBlock = 1;
    let searching = false;

    function showBlock(n) {
      currentBlock = n;
      blockEls.forEach((b) => { b.hidden = !searching && Number(b.dataset.block) !== n; });
      links.forEach((a) => a.classList.toggle('active', Number(a.dataset.block) === n));
      const a = links[n - 1];
      if (a) nav.scrollTo({ left: a.offsetLeft - nav.offsetLeft - nav.clientWidth / 2 + a.offsetWidth / 2, behavior: 'smooth' });
    }

    // Tabs: #b2 opens block 2, #b2-m3 opens block 2 and scrolls to its module 3.
    // The page is built after load, so the browser cannot scroll to the #anchor by itself.
    function route() {
      if (!hasBlocks) {
        const target = location.hash.length > 1 && document.getElementById(location.hash.slice(1));
        if (target) requestAnimationFrame(() => target.scrollIntoView());
        return;
      }
      const m = location.hash.match(/^#b(\d+)(?:-m\d+)?$/);
      const n = m ? Number(m[1]) : 0;
      if (n < 1 || n > blockEls.length) { showBlock(currentBlock); return; }
      if (searching) clearSearch();
      showBlock(n);
      const target = document.getElementById(location.hash.slice(1));
      if (target) requestAnimationFrame(() => target.scrollIntoView());
    }

    function filter(q) {
      let modules = 0;
      document.querySelectorAll('.module').forEach((mod) => {
        const head = mod.querySelector('.mod-head').textContent.toLowerCase();
        const items = mod.querySelectorAll('.note, .tip, .mistake, .checklist, .outro, .links');
        let hits = 0;
        items.forEach((el) => {
          const hit = !q || head.includes(q) || el.textContent.toLowerCase().includes(q);
          el.hidden = !hit;
          if (hit) hits++;
        });
        mod.hidden = hits === 0;
        if (hits) modules++;
      });
      blockEls.forEach((b) => {
        const any = [...b.querySelectorAll('.module')].some((m) => !m.hidden);
        b.hidden = searching ? !any : Number(b.dataset.block) !== currentBlock;
        b.querySelectorAll('.pager, .block-outro').forEach((el) => { el.hidden = searching; });
      });
      document.querySelectorAll('.page-outro').forEach((el) => { el.hidden = searching; });
      return modules;
    }

    function clearSearch() {
      searching = false;
      searchInput.value = '';
      document.getElementById('hero').hidden = false;
      document.getElementById('search-status').hidden = true;
      document.getElementById('empty').hidden = true;
      filter('');
      if (hasBlocks) showBlock(currentBlock);
    }

    let timer;
    searchInput.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const q = searchInput.value.trim().toLowerCase();
        if (!q) { clearSearch(); return; }
        searching = true;
        const found = filter(q);
        document.getElementById('hero').hidden = true;
        const status = document.getElementById('search-status');
        status.hidden = false;
        status.textContent = found ? `Знайдено в модулях: ${found}. Esc — скинути пошук.` : 'Нічого не знайдено.';
        document.getElementById('empty').hidden = found > 0;
        window.scrollTo({ top: 0 });
      }, 150);
    });
    searchInput.addEventListener('keydown', (e) => { if (e.key === 'Escape') clearSearch(); });

    // Reading progress and, without blocks, the active module in the top bar.
    const bar = document.getElementById('progress');
    const sections = hasBlocks ? [] : links.map((a) => document.querySelector(a.getAttribute('href')));
    let lastIdx = -2;
    function onScroll() {
      const h = document.documentElement;
      bar.style.width = (h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight) * 100) + '%';
      if (hasBlocks) return;
      let idx = -1;
      sections.forEach((s, i) => { if (s.getBoundingClientRect().top <= 160) idx = i; });
      if (idx === lastIdx) return;
      lastIdx = idx;
      links.forEach((a, i) => a.classList.toggle('active', i === idx));
      if (idx >= 0) {
        const a = links[idx];
        nav.scrollTo({ left: a.offsetLeft - nav.offsetLeft - nav.clientWidth / 2 + a.offsetWidth / 2, behavior: 'smooth' });
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('hashchange', route);
    route();
    onScroll();
  }

  /* global RECS */
  const errors = validate(RECS);
  if (errors.length) {
    document.body.innerHTML = `<pre style="padding:24px;white-space:pre-wrap">RECS data has errors:\n${errors.map(attr).join('\n')}</pre>`;
    return;
  }
  render(RECS);
  drawIcons(document);
  setupCopy();
  setupChecklist();
  setup(RECS);
})();
