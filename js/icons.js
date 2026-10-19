// =========================================================================
// 图标库：必要展示位用 Icons8 3D Fluency (128×128)，细小线标仍用 SVG
// =========================================================================
const Icons = {
  softBg: '#F0EFFF',
  color: '#7C3AED',
  base3d: 'assets/icons/3d/',

  // 逻辑名 → 3d 文件名（不含路径/后缀）
  files: {
    // 导航
    compass: 'compass', discover: 'compass',
    school: 'school', academy: 'school',
    toolbox: 'toolbox', tools: 'toolbox',
    chat: 'chat', community: 'chat',
    calendar: 'calendar', tasks: 'calendar',
    'bar-chart': 'bar-chart', analytics: 'combo-chart', combo_chart: 'combo-chart',
    wallet: 'wallet', assets: 'wallet',
    help: 'help',

    // 发现页快捷入口
    ai_tools: 'robot', timer: 'robot',
    smart_edit: 'clapperboard', clapper: 'clapperboard',
    digital_human: 'conference',
    txt2img: 'picture', image: 'picture', tupian: 'picture',
    txt2video: 'movie', video: 'movie', shipin: 'movie',
    voice: 'microphone', mic: 'microphone', peiyin: 'microphone', headphones: 'microphone',
    templates: 'documents', template: 'documents',
    all_tools: 'category', grid: 'category', quanbu: 'category', category: 'category',

    // 工具箱
    'file-text': 'document', file_text: 'document', wenan: 'document', file: 'document', document: 'document',
    music: 'musical-notes', yinyue: 'musical-notes',
    layout: 'design', fengmian: 'design', cover: 'design', design: 'design',
    'share-2': 'connected', share: 'connected', connected: 'connected',
    globe: 'globe', fanyi: 'globe', translate: 'globe',
    'bar-chart-2': 'combo-chart', chart: 'combo-chart', shuju: 'combo-chart',
    'edit-3': 'edit', edit: 'edit', pencil: 'pencil',
    zap: 'lightning-bolt', spark: 'lightning-bolt', sparkles: 'lightning-bolt',
    plus: 'plus',
    siwei: 'mind-map', mindmap: 'mind-map',
    module: 'module',

    // 成长路径
    iso_cube: 'package', path1: 'package', path3: 'package', package: 'package', cube: 'package',
    iso_gem: 'crystal', path2: 'crystal', path4: 'crystal', gem: 'crystal', crystal: 'crystal',
    iso_bag: 'shopping-bag', path5: 'shopping-bag', bag: 'shopping-bag',

    // 资源库
    res1: 'film-reel', folder_play: 'film-reel',
    res2: 'book', book: 'book',
    res3: 'opened-folder', folder_list: 'opened-folder',
    res4: 'documents-folder', folder_grid: 'documents-folder',
    res5: 'checked-checkbox', checklist: 'checked-checkbox',
    res6: 'conference', users: 'group', group: 'group', fans: 'group',

    // 社区挂件
    hash: 'idea', topics: 'idea',
    circles: 'chat',
    nearby: 'marker', marker: 'marker',
    megaphone: 'megaphone', announce: 'megaphone',
    flame: 'fire', fire: 'fire',

    // 数据 / 互动展示卡
    play: 'play', views: 'play',
    like: 'like', heart: 'like',
    comment: 'speech-bubble', 'message-circle': 'speech-bubble', speech: 'speech-bubble',
    eye: 'eye',
    clock: 'clock',
    coin: 'coin', token: 'coin', money: 'money', yen: 'money', 'dollar-sign': 'money',
    camera: 'camera', works: 'camera',
    briefcase: 'briefcase', brands: 'briefcase',
    shield: 'shield', 'shield-check': 'shield', shield_check: 'shield', creators: 'shield', tasks_done: 'shield',
    lock: 'lock', lock_sec: 'lock',
    smartphone: 'smartphone', phone: 'smartphone', phone_sec: 'smartphone',
    award: 'prize', prize: 'prize', medal: 'prize', benefit: 'prize',
    star: 'star',
    'check-circle': 'checkmark', checkmark: 'checkmark', check: 'checkmark',
    'credit-card': 'wallet', withdraw_fn: 'wallet',
    gift: 'gift', gift_fn: 'gift',
    tag: 'price-tag',
    purse: 'purse', income: 'purse',
    increase: 'increase', total: 'increase', trend: 'increase',
    bank: 'bank', bank_fn: 'bank',
    settings: 'module', settings_fn: 'module', tool: 'module',
    search: 'search', bell: 'bell',
    idea: 'idea', lightbulb: 'idea', tip: 'idea',
    rocket: 'robot',
    verified: 'verified-account', 'verified-account': 'verified-account'
  },

  src: function(name) {
    if (!name) return null;
    const key = this.files[name] || this.files[String(name).replace(/-/g, '_')];
    if (!key) return null;
    return this.base3d + key + '.png';
  },

  img: function(name, size, className) {
    size = size || 24;
    const src = this.src(name);
    if (!src) return this._glyph(name, size, true);
    const cls = className ? ` class="${className}"` : ' class="icon-3d-img"';
    return `<img src="${src}" alt="" width="${size}" height="${size}"${cls} draggable="false">`;
  },

  // 软圆底图标（快捷入口、圈子等）
  soft: function(name, size) {
    size = size || 40;
    const src = this.src(name);
    if (src) {
      const imgSize = Math.round(size * 0.7);
      return `<span class="icon-soft" style="width:${size}px;height:${size}px;background:${this.softBg};"><img src="${src}" alt="" width="${imgSize}" height="${imgSize}" class="icon-3d-img" draggable="false"></span>`;
    }
    const glyph = this._glyph(name, Math.round(size * 0.48));
    return `<span class="icon-soft" style="width:${size}px;height:${size}px;background:${this.softBg};color:${this.color};">${glyph}</span>`;
  },

  // 细小线标（帖子 meta 等）— 保留 SVG
  line: function(name, size) {
    size = size || 14;
    const src = this.src(name);
    // 稍大的展示位（≥16）优先用 3D；超小 meta 仍用线标避免糊
    if (src && size >= 16) {
      return this.img(name, size);
    }
    return this._glyph(name, size, true);
  },

  badge: function(name, bg, size) {
    size = size || 28;
    bg = bg || this.color;
    const src = this.src(name);
    if (src) {
      const imgSize = Math.round(size * 0.62);
      return `<span class="icon-badge" style="width:${size}px;height:${size}px;background:${bg};"><img src="${src}" alt="" width="${imgSize}" height="${imgSize}" class="icon-3d-img" draggable="false"></span>`;
    }
    return `<span class="icon-badge" style="width:${size}px;height:${size}px;background:${bg};">${this._glyph(name, Math.round(size * 0.5), false, '#fff')}</span>`;
  },

  _svg: function(inner, size, stroke) {
    const sw = stroke ? '1.8' : '0';
    const fill = stroke ? 'none' : 'currentColor';
    const strokeAttr = stroke ? `stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"` : '';
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" ${strokeAttr} aria-hidden="true">${inner}</svg>`;
  },

  _glyph: function(name, size, asStroke, forceColor) {
    const map = {
      compass: asStroke
        ? '<circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>'
        : '<circle cx="12" cy="12" r="10" opacity=".15"></circle><path d="M16.2 7.8l-2.1 6.4-6.4 2.1 2.1-6.4 6.4-2.1z"/>',
      eye: asStroke
        ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>'
        : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3" fill="#fff"/>',
      heart: asStroke
        ? '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>'
        : '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21.2l8.8-8.8a5.5 5.5 0 0 0 0-7.8z"/>',
      comment: asStroke
        ? '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>'
        : '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
      share: asStroke
        ? '<circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>'
        : '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>',
      users: asStroke
        ? '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>'
        : '<circle cx="9" cy="8" r="3.2"/><path d="M2 20v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1"/>',
      clock: asStroke
        ? '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>'
        : '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2" stroke="#fff" stroke-width="1.8" fill="none"/>',
      flame: '<path d="M12 3c2 3 1 5-1 7 3 0 6 2 6 6a7 7 0 1 1-14 0c0-3 2-5 4-7-1 3 0 4 2 5 0-4 1-7 3-11z"/>',
      play: asStroke
        ? '<polygon points="5 3 19 12 5 21 5 3"></polygon>'
        : '<path d="M6 4l14 8-14 8V4z"/>',
      hash: '<path d="M9 4l-2 16M17 4l-2 16M4 9h16M3 15h16"/>',
      chat: asStroke
        ? '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"></path>'
        : '<path d="M21 12a8.5 8.5 0 0 1-8.5 8.5c-1.4 0-2.7-.3-3.9-.9L3 21l1.5-5.1A8.5 8.5 0 1 1 21 12z"/>',
      nearby: '<path d="M12 22s8-6.5 8-13a8 8 0 1 0-16 0c0 6.5 8 13 8 13z"/><circle cx="12" cy="9" r="2.5" fill="#fff"/>',
      megaphone: '<path d="M3 10v4a2 2 0 0 0 2 2h1l4 4V6L6 10H5a2 2 0 0 0-2 2z"/><path d="M14 8c2 1 3 2.5 3 4s-1 3-3 4"/>',
      spark: '<path d="M12 2l1.5 6.5L20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5L12 2z"/>',
      camera: asStroke
        ? '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle>'
        : '<path d="M4 8h3l2-3h6l2 3h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2z"/>',
      briefcase: asStroke
        ? '<rect x="2" y="7" width="20" height="14" rx="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>'
        : '<rect x="2" y="7" width="20" height="14" rx="2"/>',
      shield_check: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4" stroke="#fff" stroke-width="1.7" fill="none"/>',
      yen: '<circle cx="12" cy="12" r="10"/><path d="M8 7l4 5 4-5M8 12h8M8 16h8M12 12v7" stroke="#fff" stroke-width="1.5" fill="none"/>',
      coin: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5c.8-1 2-1.5 2.5-1.5s1.7.5 1.7 1.5S13 11 12 11s-2.2.4-2.2 1.6 1.2 1.9 2.2 1.9 1.8-.5 2.4-1.4" stroke="#fff" stroke-width="1.5" fill="none"/>'
    };

    const aliases = {
      like: 'heart', view: 'eye', views: 'play', comment_icon: 'comment',
      creators: 'shield_check', works: 'camera', brands: 'briefcase',
      tasks_done: 'shield_check', paid: 'yen',
      ai_tools: 'spark', smart_edit: 'spark', digital_human: 'users',
      txt2img: 'spark', txt2video: 'spark', voice: 'spark', templates: 'spark', all_tools: 'spark'
    };

    const key = aliases[name] || name;
    let inner = map[key] || map.spark;

    if (asStroke) {
      const strokeMap = {
        eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>',
        heart: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>',
        comment: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>',
        share: '<circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>',
        users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>',
        clock: '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>',
        flame: '<path d="M12 3c2 3 1 5-1 7 3 0 6 2 6 6a7 7 0 1 1-14 0c0-3 2-5 4-7-1 3 0 4 2 5 0-4 1-7 3-11z"></path>',
        play: '<polygon points="5 3 19 12 5 21 5 3"></polygon>',
        hash: '<line x1="9" y1="4" x2="7" y2="20"></line><line x1="17" y1="4" x2="15" y2="20"></line><line x1="4" y1="9" x2="20" y2="9"></line><line x1="3" y1="15" x2="19" y2="15"></line>',
        chat: '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 1 1 16.3 1.4z"></path>',
        nearby: '<path d="M12 22s8-6.5 8-13a8 8 0 1 0-16 0c0 6.5 8 13 8 13z"></path><circle cx="12" cy="9" r="2.5"></circle>',
        megaphone: '<path d="M3 11v2a2 2 0 0 0 2 2h1l5 4V5L6 9H5a2 2 0 0 0-2 2z"></path>',
        shield_check: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><polyline points="9 12 11 14 15 10"></polyline>',
        yen: '<circle cx="12" cy="12" r="9"></circle><path d="M8 8l4 5 4-5M9 14h6M9 17h6"></path>',
        briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>',
        camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle>'
      };
      if (strokeMap[key]) inner = strokeMap[key];
    }

    const svg = this._svg(inner, size, !!asStroke);
    if (forceColor) {
      return svg.replace('<svg ', `<svg style="color:${forceColor}" `);
    }
    return svg;
  },

  // 成长路径：3D 图标
  pathIso: function(kind, opts) {
    opts = opts || {};
    const size = opts.size || 28;
    const locked = !!opts.locked;
    const map = { iso_cube: 'package', iso_gem: 'crystal', iso_bag: 'shopping-bag' };
    const file = map[kind] || this.files[kind] || 'package';
    const opacity = locked ? ' opacity:0.55;' : '';
    return `<span class="path-iso-icon" style="${opacity}"><img src="${this.base3d}${file}.png" alt="" width="${size}" height="${size}" class="icon-3d-img" draggable="false"></span>`;
  },

  // 成就勋章（已用本地裁切 PNG，保留兼容）
  medal: function(tone, size) {
    size = size || 42;
    const files = {
      gold: 'assets/decorations/achievement_medal_gold.png',
      orange: 'assets/decorations/achievement_medal_orange.png',
      blue: 'assets/decorations/achievement_medal_blue.png'
    };
    const src = files[tone] || files.gold;
    return `<span class="achievement-medal"><img src="${src}" alt="" width="${size}" height="${size}" class="achievement-medal-img" draggable="false"></span>`;
  },

  _avatarPhotos: [
    'assets/avatars/stack/face_1.jpg',
    'assets/avatars/stack/face_2.jpg',
    'assets/avatars/stack/face_3.jpg',
    'assets/avatars/stack/face_4.jpg',
    'assets/avatars/stack/face_5.jpg',
    'assets/avatars/stack/face_6.jpg',
    'assets/avatars/stack/face_7.jpg',
    'assets/avatars/stack/face_8.jpg'
  ],

  avatarPhoto: function(variant, size) {
    size = size || 22;
    const src = this._avatarPhotos[(variant || 0) % this._avatarPhotos.length];
    return `<img class="avatar-face-img" src="${src}" alt="" width="${size}" height="${size}" draggable="false">`;
  },

  avatarStack: function(countOrVariants, size) {
    size = size || 22;
    const variants = Array.isArray(countOrVariants)
      ? countOrVariants
      : Array.from({ length: Math.max(0, countOrVariants || 0) }, (_, i) => i);
    if (!variants.length) return '';
    return `<span class="avatar-stack" aria-hidden="true">${variants.map((v, i) =>
      `<span class="avatar-stack-item" style="z-index:${i + 1}">${this.avatarPhoto(v, size)}</span>`
    ).join('')}</span>`;
  }
};

window.Icons = Icons;
