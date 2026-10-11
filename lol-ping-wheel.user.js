// ==UserScript==
// @name         LoL 信号盘（League Ping Wheel）
// @namespace    lol-ping-wheel
// @version      2.1.0
// @description  按住 G 呼出《英雄联盟》风格信号盘，滑动鼠标选方向，松开 G 发出信号
// @author       lol-ping-wheel
// @match        *://*/*
// @match        file:///*
// @grant        none
// @run-at       document-idle
// @license      MIT
// ==/UserScript==
/*!
 * LoL Ping Wheel — 《英雄联盟》信号盘高保真复刻（可嵌入任意网页）
 * ---------------------------------------------------------------------------
 * 结构依据 LoL Wiki「Ping」条目：8 个 Smart Ping + 中心 Caution
 *   北 Retreat / 东北 Push / 东 On My Way / 东南 All-In
 *   南 Assist Me / 西南 Need Vision / 西 Enemy Missing / 西北 Enemy Vision
 *   中心 Caution
 * 交互依据 Riot 官方说明：按住 Alt / Ctrl / G / V + 左键唤出，拖动选择，
 *   松开左键在光标位置发出信号，右键取消。
 *
 * 用法：
 *   <script src="lol-ping-wheel.js"></script>
 *   <script>
 *     var wheel = LoLPingWheel.init();               // 或 init({ radius: 200 })
 *     wheel.on('ping', function (p) { console.log(p); });
 *   </script>
 *
 * 不依赖任何外部资源、不依赖框架；样式封装在 Shadow DOM 内，不污染宿主页，
 * 也不会被宿主页的 CSS 影响。
 */
(function (global) {
  'use strict';

  /* =======================================================================
   * 1. 图标：内联 SVG，形状与配色按官方各信号图标实图逐个核对
   * ======================================================================= */
  var ICONS = {
    /* 撤退 Retreat：红色正三角 + 感叹号 */
    retreat:
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M12 2.9 22 20.6H2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>' +
      '<path d="M12 9.3v4.9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
      '<circle cx="12" cy="17.4" r="1.2" fill="currentColor"/></svg>',

    /* 推进 Push：绿色弧形箭头，指向右上 */
    push:
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M4.4 19.2C4.9 12.4 9.6 8.1 16.2 8.1" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>' +
      '<path d="M13.2 4.4 18.7 8.1l-4.9 4.1z" fill="currentColor"/></svg>',

    /* 正在路上 On My Way：蓝色粗箭头朝下 + 左下一枚小指针 */
    onmyway:
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M12.8 3.6v9.2" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/>' +
      '<path d="M7 10.6 12.8 17.4 18.6 10.6z" fill="currentColor"/>' +
      '<path d="M3.6 15.1 7.3 19.2l-3.7.5z" fill="currentColor"/></svg>',

    /* 全力进攻 All-In：黄色交叉短条 + 下方圆环 */
    allin:
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M5.6 4.4 17.4 13.6M18.4 4.4 6.6 13.6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>' +
      '<circle cx="12" cy="18.4" r="3.1" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>',

    /* 请求支援 Assist Me：绿色旗帜（左侧旗杆 + 向右的旗面） */
    assistme:
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M5.6 3.4v17.2" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/>' +
      '<path d="M5.6 4.9h11.6l-2.7 4.3 2.7 4.3H5.6z" fill="currentColor"/></svg>',

    /* 需要视野 Need Vision：绿色，上方针尖 + 下方两条外撇短线 */
    needvision:
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M12 2.6 15 8.4H9z" fill="currentColor"/>' +
      '<path d="M12 8.6v3.4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>' +
      '<path d="M12 12.4 7.2 20.4M12 12.4l4.8 8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',

    /* 敌人消失 Enemy Missing：黄色问号 */
    enemymissing:
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M8.9 9.2a3.1 3.1 0 1 1 4.3 2.9c-.9.4-1.3 1.1-1.3 2.1" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>' +
      '<circle cx="11.9" cy="17.9" r="1.35" fill="currentColor"/></svg>',

    /* 敌方视野 Enemy Vision：红色倒水滴定位标 + 中间镂空 */
    enemyvision:
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<path fill-rule="evenodd" d="M12 2.6c3.7 0 6.7 2.9 6.7 6.6 0 4.8-6.7 12.2-6.7 12.2S5.3 14 5.3 9.2c0-3.7 3-6.6 6.7-6.6zm0 4.3a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z" fill="currentColor"/></svg>',

    /* 中心 Caution：黄色圆环 + 白底三角 + 三角内一条横杠 */
    caution:
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" stroke-width="1.9"/>' +
      '<path d="M12 5.4 19 17.4H5z" fill="#ffffff" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>' +
      '<path d="M7.6 13.6h8.8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',

    /* 普通 Ping：蓝色菱形 */
    ping:
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M12 2.4 21.6 12 12 21.6 2.4 12z" fill="currentColor" fill-opacity=".45" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/></svg>'
  };

  /* =======================================================================
   * 2. 信号数据（位置、名称、颜色按官方实图核对；trans 为游戏内聊天转写）
   * ======================================================================= */
  var PINGS = [
    { id: 'retreat',      pos: 'N',  angle: 0,   icon: 'retreat',      color: '#e2493a',
      zh: '撤退',      en: 'Retreat',
      trans: { zh: '示意撤退', en: 'signals to retreat' },
      sfx: [[880, 0, 90, 'triangle'], [560, 80, 130, 'triangle']] },

    { id: 'push',         pos: 'NE', angle: 45,  icon: 'push',         color: '#3fbf6a',
      zh: '推进',      en: 'Push',
      trans: { zh: '想要向前推进', en: 'wants to push forward' },
      sfx: [[620, 0, 80, 'triangle'], [880, 70, 120, 'triangle']] },

    { id: 'onmyway',      pos: 'E',  angle: 90,  icon: 'onmyway',      color: '#2f8fe8',
      zh: '正在路上',  en: 'On My Way',
      trans: { zh: '正在赶来', en: 'is on the way' },
      sfx: [[950, 0, 80, 'sine'], [1320, 70, 140, 'sine']] },

    { id: 'allin',        pos: 'SE', angle: 135, icon: 'allin',        color: '#e8c34a',
      zh: '全力进攻',  en: 'All-In',
      trans: { zh: '准备全力开战', en: 'is going all in' },
      sfx: [[740, 0, 70, 'square'], [740, 90, 70, 'square'], [1108, 180, 150, 'triangle']] },

    { id: 'assistme',     pos: 'S',  angle: 180, icon: 'assistme',     color: '#35c07a',
      zh: '请求支援',  en: 'Assist Me',
      trans: { zh: '正在请求支援', en: 'is asking for assistance' },
      sfx: [[600, 0, 90, 'triangle'], [900, 80, 130, 'triangle']] },

    { id: 'needvision',   pos: 'SW', angle: 225, icon: 'needvision',   color: '#43c9c0',
      zh: '需要视野',  en: 'Need Vision',
      trans: { zh: '需要视野', en: 'is asking for vision' },
      sfx: [[1046, 0, 80, 'sine'], [784, 80, 140, 'sine']] },

    { id: 'enemymissing', pos: 'W',  angle: 270, icon: 'enemymissing', color: '#e8c34a',
      zh: '敌人消失',  en: 'Enemy Missing',
      trans: { zh: '提示敌人消失', en: 'signals that enemies are missing' },
      sfx: [[784, 0, 80, 'triangle'], [1046, 80, 80, 'triangle'], [784, 170, 150, 'triangle']] },

    { id: 'enemyvision',  pos: 'NW', angle: 315, icon: 'enemyvision',  color: '#e2493a',
      zh: '敌方视野',  en: 'Enemy Vision',
      trans: { zh: '此处有敌方视野', en: 'enemy has vision here' },
      sfx: [[520, 0, 90, 'square'], [392, 80, 150, 'square']] }
  ];

  /* 中心位：Caution（官方：Caution 位于信号盘中心） */
  var CENTER_PING = {
    id: 'caution', pos: 'C', angle: null, icon: 'caution', color: '#e8c34a',
    zh: '警告', en: 'Caution',
    trans: { zh: '示意小心', en: 'signals to be cautious' },
    sfx: [[540, 0, 90, 'square'], [540, 100, 130, 'square']]
  };

  /* 色盲安全配色：采用公认的 Okabe-Ito 八色方案（相邻扇形颜色互不相邻、可辨），
     中心 Caution 用白色。注意：这不是 Riot 官方色盲模式的原始取色
     （官方原图站点拒绝下载），此处为「可辨识性优先」的等价方案。 */
  var CB_COLORS = {
    retreat: '#d55e00',       /* 朱红 */
    push: '#009e73',          /* 蓝绿 */
    onmyway: '#56b4e9',       /* 天蓝 */
    allin: '#f0e442',         /* 黄 */
    assistme: '#0072b2',      /* 蓝 */
    needvision: '#cc79a7',    /* 红紫 */
    enemymissing: '#e69f00',  /* 橙 */
    enemyvision: '#b0b0b0',   /* 灰 */
    caution: '#ffffff',       /* 白（中心） */
    ping: '#56b4e9'           /* 通用 Ping */
  };

  /* 通用 Ping（蓝色菱形）：不在轮盘上，对应游戏里轻点一下 G；
     宿主页可用 wheel.ping('ping', x, y) 主动发出 */
  var GENERIC_PING = {
    id: 'ping', pos: 'G', angle: null, icon: 'ping', color: '#3f8fe8',
    zh: '提示', en: 'Ping',
    trans: { zh: '发出了一个提示信号', en: 'pinged' },
    sfx: [[880, 0, 70, 'sine'], [1180, 70, 110, 'sine']]
  };

  var ALL_PINGS = PINGS.concat([CENTER_PING, GENERIC_PING]);
  var DEFAULT_OPTIONS = {
    radius: 168,          // 信号盘半径（px），实际还会受 maxRadiusRatio 限制
    maxRadiusRatio: 0.42, // 半径最大不超过 min(视口宽,视口高) 的该比例
    lang: 'zh',           // 'zh' | 'en' | 'both'
    sound: true,
    volume: 0.5,
    pingDuration: 2000,   // 落地信号停留时长（官方：地面 2 秒）
    clampToViewport: true,
    swallowHostClicks: true,
    /* 触发方式：Alt/Ctrl + 左键（官方主路径）；holdKey 支持「按住某键呼出、松开该键发出」 */
    altClick: true,
    ctrlClick: true,
    holdKey: 'KeyG',
    holdKeyEnabled: true,
    /* 按住 Alt 即呼出（非游戏原版行为：原版必须配合左键）。
       开启后：按住 Alt 超过 holdDelayMs 就弹出轮盘，滑动选择，松开 Alt 发送；
       期间若按了别的键（Alt+Tab、切输入法）会自动取消这次手势，不会误发。 */
    altHold: false,
    /* 按住多久才算「呼出轮盘」：短于这个时长的按压算轻点快发。
       和游戏一致 —— 轻点 G 只发一个普通 Ping，不会闪一下轮盘。 */
    holdDelayMs: 110,
    /* 轻点快发：G = 通用 Ping、V = Caution（同游戏）；V + 左键也能呼出轮盘 */
    quickKeysEnabled: true,
    quickKeys: { KeyG: 'ping', KeyV: 'caution' },
    colorblind: false,
    /* 没选任何方向就松手时发什么：center=中心 Caution（默认）/ generic=通用 Ping（同游戏轻点 G）/ cancel=不发 */
    emptySelection: 'center',
    arrowKeys: true,
    touch: true,
    longPressMs: 220
  };

  var STYLE_ID = 'lol-ping-wheel-styles';
  var CSS = [
    /* 注意：这里绝不能加 contain:layout —— 那会让宿主元素成为后代的包含块，
       宿主页只要用 !important 把宿主压成 0×0，整个盘就会被裁没。
       stage 用 100vw/100vh + fixed，尺寸与位置都不依赖宿主盒子。 */
    ':host{all:initial;position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:2147483600;pointer-events:none;display:block;}',
    '.stage{position:fixed;left:0;top:0;width:100vw;height:100vh;overflow:hidden;pointer-events:none;',
    /* 继承封印：宿主页的 !important 全局样式只会落在宿主元素上，
       这里把全部可继承属性显式写死，继承链到此为止 —— 宿主页再野也影响不到盘。 */
    '  color:#e9e4d8;font-family:"Segoe UI","Microsoft YaHei",system-ui,-apple-system,sans-serif;',
    '  font-size:14px;font-weight:400;font-style:normal;line-height:1.5;letter-spacing:normal;word-spacing:normal;',
    '  text-align:left;text-transform:none;text-indent:0;white-space:normal;direction:ltr;',
    '  visibility:visible;cursor:default;',
    '  -webkit-font-smoothing:antialiased;user-select:none;-webkit-user-select:none;}',

    /* ---------- 信号盘本体 ---------- */
    '.wheel{position:absolute;width:0;height:0;transform:translate(-50%,-50%) scale(.86);opacity:0;',
    '  transition:transform .13s ease,opacity .13s ease;will-change:transform,opacity;}',
    '.wheel.open{transform:translate(-50%,-50%) scale(1);opacity:1;}',
    '.disc{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);border-radius:50%;',
    '  background:radial-gradient(circle at 50% 42%,rgba(21,58,52,.93) 0%,rgba(11,38,36,.95) 58%,rgba(5,22,21,.97) 100%);',
    '  backdrop-filter:blur(6px) saturate(120%);-webkit-backdrop-filter:blur(6px) saturate(120%);',
    '  box-shadow:0 0 0 1px rgba(200,170,110,.55),0 0 0 3px rgba(0,0,0,.45),0 14px 50px rgba(0,0,0,.55),inset 0 0 60px rgba(0,0,0,.45);}',
    '.rings,.sectors,.icons,.center{position:absolute;left:50%;top:50%;}',
    '.rings,.sectors{transform:translate(-50%,-50%);overflow:visible;}',
    '.sector{transition:fill .15s ease,fill-opacity .15s ease;}',
    '.sector.active{fill:var(--c);fill-opacity:.22;}',
    '.divider{stroke:rgba(200,170,110,.55);stroke-width:1;}',
    '.ringline{fill:none;stroke:rgba(200,170,110,.6);}',
    '.icon{position:absolute;display:flex;align-items:center;justify-content:center;border-radius:50%;',
    '  transform:translate(-50%,-50%) scale(1);transition:transform .15s ease,box-shadow .15s ease,background .15s ease;color:var(--c);}',
    '.icon svg{width:74%;height:74%;display:block;overflow:visible;}',
    '.icon.active{transform:translate(-50%,-50%) scale(1.2);background:rgba(0,0,0,.28);',
    '  box-shadow:0 0 16px 2px var(--c),0 0 0 1px rgba(255,255,255,.18) inset;}',
    '.icon svg *{filter:drop-shadow(0 1px 1px rgba(0,0,0,.85));}',

    /* ---------- 中心区 ---------- */
    '.center{transform:translate(-50%,-50%);border-radius:50%;display:flex;flex-direction:column;',
    '  align-items:center;justify-content:center;gap:2px;',
    '  background:radial-gradient(circle at 50% 38%,rgba(26,68,60,.95),rgba(6,24,23,.98));',
    '  box-shadow:0 0 0 1px rgba(200,170,110,.5),inset 0 0 22px rgba(0,0,0,.6);}',
    '.c-icon{display:flex;align-items:center;justify-content:center;color:var(--c);}',
    '.c-icon svg{width:100%;height:100%;display:block;}',
    '.c-name{color:#e9e4d8;font-weight:600;letter-spacing:.5px;line-height:1.15;text-align:center;text-shadow:0 1px 3px #000;}',
    '.c-name .en{display:block;opacity:.62;font-weight:500;letter-spacing:.3px;}',

    /* ---------- 落地信号（页面上的 ping 标记） ---------- */
    '.fx{position:absolute;inset:0;}',
    '.mark{position:absolute;width:0;height:0;}',
    '.mark .glyph{position:absolute;left:0;top:0;transform:translate(-50%,-50%) scale(.4);opacity:0;',
    '  display:flex;align-items:center;justify-content:center;color:var(--c);',
    '  animation:lolgp-pop var(--dur) cubic-bezier(.2,.8,.3,1) forwards;}',
    '.mark .glyph svg{width:100%;height:100%;display:block;filter:drop-shadow(0 0 8px var(--c)) drop-shadow(0 2px 2px rgba(0,0,0,.7));}',
    '.mark .ring{position:absolute;left:0;top:0;border-radius:50%;border:2px solid var(--c);opacity:0;',
    '  transform:translate(-50%,-50%) scale(.25);animation:lolgp-ring 620ms ease-out forwards;}',
    '.mark .ring.r2{animation-delay:120ms;border-width:1.5px;opacity:0;}',
    '@keyframes lolgp-pop{',
    '  0%{transform:translate(-50%,-50%) scale(.35);opacity:0}',
    '  12%{transform:translate(-50%,-50%) scale(1.18);opacity:1}',
    '  22%{transform:translate(-50%,-50%) scale(1);opacity:1}',
    '  80%{transform:translate(-50%,-50%) scale(1);opacity:.95}',
    '  100%{transform:translate(-50%,-50%) scale(1.08);opacity:0}}',
    '@keyframes lolgp-ring{',
    '  0%{transform:translate(-50%,-50%) scale(.25);opacity:.95}',
    '  100%{transform:translate(-50%,-50%) scale(2.1);opacity:0}}',

    '@media (prefers-reduced-motion:reduce){.wheel,.icon,.sector{transition-duration:.01ms}}'
  ].join('\n');

  /* =======================================================================
   * 3. 工具
   * ======================================================================= */
  function assign(target) {
    for (var i = 1; i < arguments.length; i++) {
      var src = arguments[i];
      if (!src) continue;
      for (var k in src) if (Object.prototype.hasOwnProperty.call(src, k)) target[k] = src[k];
    }
    return target;
  }
  function bind(fn, ctx) { return function () { return fn.apply(ctx, arguments); }; }
  function findPing(id) {
    for (var i = 0; i < ALL_PINGS.length; i++) if (ALL_PINGS[i].id === id) return ALL_PINGS[i];
    return null;
  }
  function isTypingTarget(el) {
    if (!el || el.nodeType !== 1) return false;
    var tag = (el.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable === true;
  }
  /* 每实例一个 id 前缀，避免同页多实例的样式/元素互相干扰 */
  var uid = 0;

  /* =======================================================================
   * 4. 主体
   * ======================================================================= */
  function PingWheel(userOptions) {
    this.options = assign({}, DEFAULT_OPTIONS, userOptions || {});
    this.id = ++uid;
    this.isOpen = false;
    this.index = -1;              // -1 = 中心（Caution）
    this.anchor = { x: 0, y: 0 }; // 信号盘圆心（已按需夹取到视口内）
    this.pointer = { x: 0, y: 0 }; // 最近一次光标位置
    this.openedBy = null;         // 'pointer' | 'key' | 'api'
    this._handlers = {};
    this._marks = [];
    this._audio = null;
    this._keysDown = {};      /* 当前按下的物理键，用于「G/V + 左键」判定 */
    this._pendingKey = null;  /* 正在等待判定「轻点 or 长按」的那次按压 */
    this._holdTimer = null;
    this._built = false;
    this._bindAll();
  }

  PingWheel.prototype = {

    /* ---------------- 构建：Shadow DOM 挂载 ---------------- */
    mount: function () {
      if (this._built) return this;
      var host = document.createElement('div');
      host.setAttribute('data-lol-ping-wheel', String(this.id));
      var shadow;
      try { shadow = host.attachShadow({ mode: 'open' }); }
      catch (err) { shadow = host; }

      /* 优先用可构造样式表（不受宿主页 CSP 的 style-src 限制，也不会被覆盖） */
      var cssOk = false;
      try {
        if (typeof global.CSSStyleSheet === 'function' && 'adoptedStyleSheets' in shadow && 'replaceSync' in CSSStyleSheet.prototype) {
          var sheet = new CSSStyleSheet();
          sheet.replaceSync(CSS);
          shadow.adoptedStyleSheets = [sheet];
          cssOk = true;
        }
      } catch (err) { cssOk = false; }
      if (!cssOk) {
        var style = document.createElement('style');
        style.id = STYLE_ID + '-' + this.id;
        style.textContent = CSS;
        shadow.appendChild(style);
      }

      var stage = document.createElement('div');
      stage.className = 'stage';

      var fx = document.createElement('div');
      fx.className = 'fx';

      var wheel = document.createElement('div');
      wheel.className = 'wheel';

      var disc = document.createElement('div');
      disc.className = 'disc';

      wheel.appendChild(disc);
      stage.appendChild(fx);
      stage.appendChild(wheel);
      shadow.appendChild(stage);

      this.host = host;
      this.shadow = shadow;
      this.stage = stage;
      this.fx = fx;
      this.wheelEl = wheel;
      this.discEl = disc;

      this._attach();

      this._buildWheel();
      this._built = true;
      return this;
    },

    /* 挂载到文档。脚本可能出现在 <body> 之前（甚至页面没有显式 body），
       所以这里不能只依赖 document.body —— 每次要用之前都会再兜一次。 */
    _attach: function () {
      if (!this.host || this.host.isConnected) return;
      var root = document.body || document.documentElement;
      if (root) root.appendChild(this.host);
    },

    /* ---------------- 生成扇形 / 分隔线 / 图标 ---------------- */
    _buildWheel: function () {
      var R = 100;                       // SVG 用户单位半径
      var inner = 42;                    // 内圈半径（中心区）
      var gap = 0.45;                    // 扇形间留出的金色细缝（度）
      var svgNS = 'http://www.w3.org/2000/svg';
      var self = this;

      function polar(r, deg) {
        var a = deg * Math.PI / 180;
        return { x: r * Math.sin(a), y: -r * Math.cos(a) };
      }
      function wedge(a1, a2) {
        var p1 = polar(inner, a1), p2 = polar(R, a1), p3 = polar(R, a2), p4 = polar(inner, a2);
        return 'M' + p1.x.toFixed(3) + ' ' + p1.y.toFixed(3) +
               ' L' + p2.x.toFixed(3) + ' ' + p2.y.toFixed(3) +
               ' A' + R + ' ' + R + ' 0 0 1 ' + p3.x.toFixed(3) + ' ' + p3.y.toFixed(3) +
               ' L' + p4.x.toFixed(3) + ' ' + p4.y.toFixed(3) +
               ' A' + inner + ' ' + inner + ' 0 0 0 ' + p1.x.toFixed(3) + ' ' + p1.y.toFixed(3) + ' Z';
      }

      var svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('viewBox', '-100 -100 200 200');
      svg.setAttribute('class', 'rings');
      svg.setAttribute('aria-hidden', 'true');

      var gSectors = document.createElementNS(svgNS, 'g');
      var sectors = [];
      PINGS.forEach(function (p, i) {
        var path = document.createElementNS(svgNS, 'path');
        path.setAttribute('class', 'sector');
        path.setAttribute('data-id', p.id);
        path.setAttribute('d', wedge(i * 45 - 22.5 + gap, i * 45 + 22.5 - gap));
        path.style.setProperty('--c', p.color);
        gSectors.appendChild(path);
        sectors.push(path);
      });
      svg.appendChild(gSectors);

      /* 8 条放射状金线 */
      var gDiv = document.createElementNS(svgNS, 'g');
      for (var i = 0; i < 8; i++) {
        var a = i * 45 + 22.5;
        var p1 = polar(inner, a), p2 = polar(R, a);
        var line = document.createElementNS(svgNS, 'line');
        line.setAttribute('class', 'divider');
        line.setAttribute('x1', p1.x.toFixed(3)); line.setAttribute('y1', p1.y.toFixed(3));
        line.setAttribute('x2', p2.x.toFixed(3)); line.setAttribute('y2', p2.y.toFixed(3));
        gDiv.appendChild(line);
      }
      svg.appendChild(gDiv);

      /* 外圈 + 内圈金环 */
      [R, inner].forEach(function (r, idx) {
        var c = document.createElementNS(svgNS, 'circle');
        c.setAttribute('class', 'ringline');
        c.setAttribute('cx', 0); c.setAttribute('cy', 0); c.setAttribute('r', r);
        c.setAttribute('stroke-width', idx === 0 ? 1.6 : 1.2);
        svg.appendChild(c);
      });

      /* 图标层 */
      var icons = document.createElement('div');
      icons.className = 'icons';
      icons.style.position = 'absolute';
      icons.style.left = '50%';
      icons.style.top = '50%';
      icons.style.width = R * 2 + 'px';
      icons.style.height = R * 2 + 'px';
      icons.style.transform = 'translate(-50%,-50%)';
      icons.style.pointerEvents = 'none';

      var midUnit = (inner + R) / 2;   // 71
      var iconEls = [];
      PINGS.forEach(function (p, i) {
        var pt = polar(midUnit, i * 45);
        var el = document.createElement('div');
        el.className = 'icon';
        el.setAttribute('data-id', p.id);
        el.style.setProperty('--c', p.color);
        el.style.left = (50 + pt.x / 2) + '%';
        el.style.top = (50 + pt.y / 2) + '%';
        el.style.width = '15%';
        el.style.height = '0';
        el.style.paddingBottom = '15%';
        el.innerHTML = ICONS[p.icon] || '';
        icons.appendChild(el);
        iconEls.push(el);
      });

      /* 中心区 */
      var center = document.createElement('div');
      center.className = 'center';
      center.style.setProperty('--c', CENTER_PING.color);
      var cIcon = document.createElement('div');
      cIcon.className = 'c-icon';
      var cName = document.createElement('div');
      cName.className = 'c-name';
      center.appendChild(cIcon);
      center.appendChild(cName);

      this.wheelEl.appendChild(svg);
      this.wheelEl.appendChild(icons);
      this.wheelEl.appendChild(center);

      this._svg = svg;
      this._sectors = sectors;
      this._iconEls = iconEls;
      this._iconLayer = icons;
      this._centerEl = center;
      this._cIcon = cIcon;
      this._cName = cName;
      this._geom = { R: R, inner: inner, midUnit: midUnit };

      this._layout();
      this._render();
    },

    /* ---------------- 尺寸与字体（跟随 radius 缩放） ---------------- */
    _layout: function () {
      var o = this.options;
      var vw = global.innerWidth || document.documentElement.clientWidth;
      var vh = global.innerHeight || document.documentElement.clientHeight;
      var maxR = Math.min(vw, vh) * o.maxRadiusRatio;
      var R = Math.max(90, Math.min(o.radius, maxR));
      this._R = R;
      var size = R * 2;
      var u = R / 100;                       // 1 个 SVG 单位 = u px
      var s = this.discEl.style;
      s.width = size + 'px'; s.height = size + 'px';
      /* 图标层必须是「盘」的真实尺寸：图标位置用百分比表达，层一缩放半径才跟着对 */
      this._iconLayer.style.width = size + 'px';
      this._iconLayer.style.height = size + 'px';
      this._svg.setAttribute('width', size);
      this._svg.setAttribute('height', size);
      this._svg.setAttribute('viewBox', '-100 -100 200 200');

      var c = this._centerEl.style;
      var centerR = this._geom.inner * u;
      c.width = (centerR * 2) + 'px';
      c.height = (centerR * 2) + 'px';
      this._cIcon.style.width = (centerR * 0.86) + 'px';
      this._cIcon.style.height = (centerR * 0.86) + 'px';
      var fs = Math.max(11, Math.min(centerR * 0.26, 20));
      this._cName.style.fontSize = fs + 'px';
      this._cName.style.maxWidth = (centerR * 1.7) + 'px';
      this._fontSize = fs;
      var iconSize = R * 0.30;
      for (var i = 0; i < this._iconEls.length; i++) {
        this._iconEls[i].style.width = iconSize + 'px';
        this._iconEls[i].style.height = iconSize + 'px';
        this._iconEls[i].style.paddingBottom = '0';
      }
    },

    /* 取某个信号在当前配色下的颜色（宿主页画 UI 时可直接用） */
    colorOf: function (id) {
      var p = findPing(id);
      return p ? this._color(p) : '#c8aa6e';
    },

    /* ---------------- 渲染选中状态 ---------------- */
    _color: function (ping) {
      if (this.options.colorblind && CB_COLORS[ping.id]) return CB_COLORS[ping.id];
      return ping.color;
    },

    _render: function () {
      var i, ping = this.index === -1 ? CENTER_PING : PINGS[this.index];
      for (i = 0; i < this._sectors.length; i++) {
        this._sectors[i].classList.toggle('active', i === this.index);
        this._sectors[i].style.setProperty('--c', this._color(PINGS[i]));
      }
      for (i = 0; i < this._iconEls.length; i++) {
        this._iconEls[i].classList.toggle('active', i === this.index);
        this._iconEls[i].style.setProperty('--c', this._color(PINGS[i]));
      }
      this._centerEl.style.setProperty('--c', this._color(ping));
      this._cIcon.innerHTML = ICONS[ping.icon] || '';
      this._cName.innerHTML = this._labelHTML(ping);
    },

    _labelHTML: function (ping) {
      var lang = this.options.lang;
      if (lang === 'en') return '<span>' + ping.en + '</span>';
      if (lang === 'both') return '<span>' + ping.zh + '</span><span class="en">' + ping.en + '</span>';
      return '<span>' + ping.zh + '</span>';
    },

    /* ---------------- 事件绑定 ---------------- */
    _bindAll: function () {
      this._onMouseDown = bind(this._handleMouseDown, this);
      this._onMouseMove = bind(this._handleMouseMove, this);
      this._onMouseUp = bind(this._handleMouseUp, this);
      this._onCtx = bind(this._handleContextMenu, this);
      this._onKeyDown = bind(this._handleKeyDown, this);
      this._onKeyUp = bind(this._handleKeyUp, this);
      this._onScroll = bind(this._handleViewportChange, this);
      this._onBlur = bind(this._handleBlur, this);
      this._onTouchStart = bind(this._handleTouchStart, this);
      this._onTouchMove = bind(this._handleTouchMove, this);
      this._onTouchEnd = bind(this._handleTouchEnd, this);
      this._onTouchCancel = bind(this._handleTouchCancel, this);
    },

    listen: function () {
      if (this._listening) return this;
      /* 捕获阶段：既能抢在宿主页之前处理，也能完整看到拖拽全过程 */
      document.addEventListener('mousedown', this._onMouseDown, true);
      document.addEventListener('mousemove', this._onMouseMove, true);
      document.addEventListener('mouseup', this._onMouseUp, true);
      document.addEventListener('contextmenu', this._onCtx, true);
      document.addEventListener('keydown', this._onKeyDown, true);
      document.addEventListener('keyup', this._onKeyUp, true);
      global.addEventListener('resize', this._onScroll, true);
      global.addEventListener('scroll', this._onScroll, true);
      global.addEventListener('blur', this._onBlur);
      if (this.options.touch) {
        document.addEventListener('touchstart', this._onTouchStart, { capture: true, passive: true });
        document.addEventListener('touchmove', this._onTouchMove, { capture: true, passive: false });
        document.addEventListener('touchend', this._onTouchEnd, true);
        document.addEventListener('touchcancel', this._onTouchCancel, true);
      }
      this._listening = true;
      return this;
    },

    _swallow: function (e) {
      if (!this.options.swallowHostClicks) return;
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
    },

    /* ---------------- 触发：鼠标 ---------------- */
    _handleMouseDown: function (e) {
      if (e.button === 2) {                    // 右键：取消
        if (this.isOpen) { this._swallow(e); this._cancel(); }
        return;
      }
      if (e.button !== 0) return;
      var o = this.options;

      /* 已由「按住按键」呼出、此时又按下左键：
         MouseEvent 上没有 code，所以这里看的是按键按下状态。
         语义同游戏「G + 左键」——把盘挪到光标处，改为松开左键发出。 */
      if (this.isOpen) {
        if (this.openedBy === 'key' && this._isKeyDown(o.holdKey)) {
          this._swallow(e);
          this.openedBy = 'pointer';
          this._altOpened = false;   /* 已转为左键驱动，松开 Alt 不再发送 */
          this.anchor = this._resolveAnchor(e.clientX, e.clientY);
          this.wheelEl.style.left = this.anchor.x + 'px';
          this.wheelEl.style.top = this.anchor.y + 'px';
          this._updateFromPoint(e.clientX, e.clientY);
        }
        return;
      }

      var isAlt = o.altClick && e.altKey;
      var isCtrl = o.ctrlClick && e.ctrlKey;
      /* Alt+左键优先：清掉「按住 Alt 即呼出」的待定计时，免得松开 Alt 时重复发送 */
      if (isAlt) {
        if (this._holdTimer) { global.clearTimeout(this._holdTimer); this._holdTimer = null; }
        this._altPending = false;
        this._altOpened = false;
      }
      var isHotkeyClick = o.holdKeyEnabled && this._isKeyDown(o.holdKey) && !e.altKey && !e.ctrlKey && !e.metaKey;
      var isQuickClick = o.quickKeysEnabled && this._anyQuickKeyDown() && !e.altKey && !e.ctrlKey && !e.metaKey;
      if (!isAlt && !isCtrl && !isHotkeyClick && !isQuickClick) return;
      if (isTypingTarget(e.target)) return;     // 别抢输入框里的操作
      this._swallow(e);
      this.open('pointer', e.clientX, e.clientY);
    },

    _handleMouseMove: function (e) {
      this.pointer.x = e.clientX;
      this.pointer.y = e.clientY;
      if (!this.isOpen) return;
      if (this.openedBy === 'pointer') this._swallow(e);
      this._updateFromPoint(e.clientX, e.clientY);
    },

    _handleMouseUp: function (e) {
      if (!this.isOpen || this.openedBy !== 'pointer' || e.button !== 0) return;
      this._swallow(e);
      this._fire(e.clientX, e.clientY);
    },

    _handleContextMenu: function (e) {
      if (!this.isOpen) return;
      this._swallow(e);
      this._cancel();
    },

    /* ---------------- 触发：键盘 ---------------- */
    _isHoldKey: function (e) {
      var k = this.options.holdKey;
      if (!k) return false;
      if (e.code) return e.code === k;
      return String(e.key || '').toLowerCase() === String(k).slice(-1).toLowerCase();
    },

    _isKeyDown: function (code) {
      return !!code && this._keysDown[code] === true;
    },
    /* 取消「按住 Alt 即呼出」这次手势（不动 G 的那套逻辑） */
    _cancelAltGesture: function () {
      if (this._holdTimer) { global.clearTimeout(this._holdTimer); this._holdTimer = null; }
      var wasOpen = this._altOpened;
      this._altPending = false;
      this._altOpened = false;
      if (wasOpen && this.isOpen && this.openedBy === 'key') this._cancel();
    },
    /* 除 holdKey 之外的快发键是否按下（默认就是 V，同游戏里 V + 左键也能开轮盘） */
    _anyQuickKeyDown: function () {
      var qk = this.options.quickKeys || {};
      var hold = this.options.holdKey;
      for (var code in qk) {
        if (!Object.prototype.hasOwnProperty.call(qk, code)) continue;
        if (code === hold) continue;
        if (this._keysDown[code] === true) return true;
      }
      return false;
    },

    _handleKeyDown: function (e) {
      var o = this.options;
      if (e.code) this._keysDown[e.code] = true;

      /* ---- 可选：按住 Alt 即呼出 ---- */
      if (o.altHold && (e.key === 'Alt' || e.code === 'AltLeft' || e.code === 'AltRight')) {
        if (isTypingTarget(e.target)) return;
        this._swallow(e);
        if (!this.isOpen && !this._altPending) {
          var selfA = this;
          this._altPending = true;
          this._holdTimer = global.setTimeout(function () {
            selfA._holdTimer = null;
            if (!selfA._altPending) return;
            selfA._altOpened = true;
            selfA.open('key', selfA.pointer.x, selfA.pointer.y);
          }, Math.max(0, o.holdDelayMs));
        }
        return;
      }
      /* 按住 Alt 期间又按了别的键 → 取消这次 Alt 手势，避免 Alt+Tab / 切输入法误发 */
      if (this._altPending || this._altOpened) this._cancelAltGesture();

      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (isTypingTarget(e.target)) return;

      if (e.key === 'Escape' && this.isOpen) { this._swallow(e); this._cancel(); return; }

      if (this.isOpen) {
        if (o.arrowKeys) {
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { this._swallow(e); this._step(1); return; }
          if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { this._swallow(e); this._step(-1); return; }
        }
        if (e.key === 'Enter' || e.key === ' ') { this._swallow(e); this._fire(null, null); return; }
        return;
      }
      if (e.repeat) return;

      var isHold = o.holdKeyEnabled && this._isHoldKey(e);
      var quickId = o.quickKeysEnabled ? (o.quickKeys[e.code] || null) : null;
      if (!isHold && !quickId) return;

      this._swallow(e);
      this._pendingKey = { code: e.code, quickId: quickId, opened: false };

      /* 按住到 holdDelayMs 才呼出轮盘：这样「轻点」不会闪一下轮盘 */
      if (isHold) {
        var self = this;
        this._holdTimer = global.setTimeout(function () {
          self._holdTimer = null;
          if (!self._pendingKey) return;
          self._pendingKey.opened = true;
          self.open('key', self.pointer.x, self.pointer.y);
        }, Math.max(0, o.holdDelayMs));
      }
    },

    _handleKeyUp: function (e) {
      if (e.code) delete this._keysDown[e.code];
      var o = this.options;

      /* ---- 可选：松开 Alt → 发送并关闭 ---- */
      if (o.altHold && (e.key === 'Alt' || e.code === 'AltLeft' || e.code === 'AltRight')) {
        this._swallow(e);
        if (this._altOpened && this.isOpen && this.openedBy === 'key') this._fire(null, null);
        this._cancelAltGesture();
        return;
      }

      var pending = this._pendingKey;
      var isHold = this._isHoldKey(e);
      var quickId = o.quickKeysEnabled ? (o.quickKeys[e.code] || null) : null;
      if (!isHold && !quickId) return;
      this._swallow(e);

      /* 轮盘还没开出来就松手了 —— 这是一次轻点快发 */
      if (pending && !pending.opened) {
        if (this._holdTimer) { global.clearTimeout(this._holdTimer); this._holdTimer = null; }
        this._pendingKey = null;
        if (quickId) this.ping(quickId, this.pointer.x, this.pointer.y);
        return;
      }

      this._pendingKey = null;
      if (this.isOpen && this.openedBy === 'key') this._fire(null, null);
    },

    /* ---------------- 触发：触摸（长按呼出、拖动选择、抬手发出） ---------------- */
    _handleTouchStart: function (e) {
      if (this.isOpen || !e.touches || e.touches.length !== 1) return;
      var t = e.touches[0];
      var self = this;
      this._touch = { x: t.clientX, y: t.clientY, t0: Date.now(), moved: false };
      /* 手指按住不动时不会触发 touchmove，所以长按必须靠定时器 */
      if (this._touchTimer) global.clearTimeout(this._touchTimer);
      this._touchTimer = global.setTimeout(function () {
        self._touchTimer = null;
        if (!self._touch || self._touch.moved || self.isOpen) return;
        self.open('touch', self._touch.x, self._touch.y);
      }, this.options.longPressMs);
    },
    _handleTouchMove: function (e) {
      if (!e.touches || !e.touches.length) return;
      var t = e.touches[0];
      this.pointer.x = t.clientX; this.pointer.y = t.clientY;
      if (!this.isOpen) {
        if (!this._touch) return;
        if (Math.abs(t.clientX - this._touch.x) > 6 || Math.abs(t.clientY - this._touch.y) > 6) {
          this._touch.moved = true;
          if (this._touchTimer) { global.clearTimeout(this._touchTimer); this._touchTimer = null; }
        }
        return;
      }
      if (e.cancelable) e.preventDefault();
      this._updateFromPoint(t.clientX, t.clientY);
    },
    _handleTouchEnd: function () {
      if (this._touchTimer) { global.clearTimeout(this._touchTimer); this._touchTimer = null; }
      if (this.isOpen && this.openedBy === 'touch') this._fire(this.pointer.x, this.pointer.y);
      this._touch = null;
    },
    _handleTouchCancel: function () {
      if (this._touchTimer) { global.clearTimeout(this._touchTimer); this._touchTimer = null; }
      this._touch = null;
      if (this.isOpen && this.openedBy === 'touch') this._cancel();
    },

    /* ---------------- 开关 ---------------- */
    open: function (source, x, y) {
      if (this.isOpen) return this;
      if (!this._built) this.mount();
      this._attach();
      var px = (typeof x === 'number' && isFinite(x)) ? x : this.pointer.x;
      var py = (typeof y === 'number' && isFinite(y)) ? y : this.pointer.y;
      if (!px && !py) { px = (global.innerWidth || 0) / 2; py = (global.innerHeight || 0) / 2; }
      this.anchor = this._resolveAnchor(px, py);
      /* 手势原点 = 按下时光标所在处。
         圆心 anchor 可能被夹回视口内（贴边时），方向判定必须用这个真实原点，
         否则在屏幕边缘拖同样的距离会落进中心死区、表现为"滑动选择不灵"。 */
      this.origin = { x: px, y: py };
      this.pointer.x = px; this.pointer.y = py;
      this.openedBy = source || 'api';
      this.isOpen = true;
      this.index = -1;
      this._layout();
      this._render();
      this.wheelEl.style.left = this.anchor.x + 'px';
      this.wheelEl.style.top = this.anchor.y + 'px';
      this.wheelEl.classList.add('open');
      this._swoosh();
      this._emit('open', { source: this.openedBy, x: px, y: py });
      return this;
    },

    close: function () {
      if (!this.isOpen) return this;
      this.isOpen = false;
      this.index = -1;
      this.wheelEl.classList.remove('open');
      this._emit('close', {});
      return this;
    },

    _cancel: function () {
      if (!this.isOpen) return;
      this.close();
      this._emit('cancel', {});
    },

    _handleBlur: function () {
      this._keysDown = {};
      this._pendingKey = null;
      this._altPending = false;
      this._altOpened = false;
      if (this._holdTimer) { global.clearTimeout(this._holdTimer); this._holdTimer = null; }
      this._touch = null;
      if (this._touchTimer) { global.clearTimeout(this._touchTimer); this._touchTimer = null; }
      this._cancel();
    },

    /* 信号盘圆心：跟随光标，但不越出视口（越界时夹取） */
    _resolveAnchor: function (x, y) {
      if (!this.options.clampToViewport) return { x: x, y: y };
      var R = this._R || this.options.radius;
      var pad = 10;
      var vw = global.innerWidth || document.documentElement.clientWidth;
      var vh = global.innerHeight || document.documentElement.clientHeight;
      var cx = Math.min(Math.max(x, R + pad), Math.max(R + pad, vw - R - pad));
      var cy = Math.min(Math.max(y, R + pad), Math.max(R + pad, vh - R - pad));
      return { x: cx, y: cy };
    },

    _handleViewportChange: function () {
      if (!this.isOpen) return;
      this._layout();
      this.anchor = this._resolveAnchor(this.anchor.x, this.anchor.y);
      this.wheelEl.style.left = this.anchor.x + 'px';
      this.wheelEl.style.top = this.anchor.y + 'px';
      this._updateFromPoint(this.pointer.x, this.pointer.y);
    },

    /* ---------------- 选择 ---------------- */
    _updateFromPoint: function (px, py) {
      var R = this._R || this.options.radius;
      var inner = this._geom.inner / 100 * R;
      var org = this.origin || this.anchor;     /* 以手势起点判定，不用被夹取的圆心 */
      var dx = px - org.x;
      var dy = py - org.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var idx = -1;
      if (dist >= inner) {
        var ang = Math.atan2(dx, -dy) * 180 / Math.PI;
        if (ang < 0) ang += 360;
        idx = Math.round(ang / 45) % 8;
      }
      this._setIndex(idx, true);
    },

    _step: function (dir) {
      var n = 8;
      var next;
      if (this.index === -1) next = dir > 0 ? 0 : n - 1;
      else next = (this.index + dir + n) % n;
      this._setIndex(next, false);
    },

    _setIndex: function (idx, silent) {
      if (idx === this.index) return;
      this.index = idx;
      this._render();
      this._tick();
      this._emit('select', { ping: this.index === -1 ? CENTER_PING : PINGS[this.index] });
    },

    /* ---------------- 发送 ---------------- */
    _fire: function (x, y) {
      var ping;
      if (this.index === -1) {
        var mode = this.options.emptySelection;
        if (mode === 'cancel') {
          this.close();
          this._emit('cancel', { reason: 'emptySelection' });
          return;
        }
        ping = mode === 'generic' ? GENERIC_PING : CENTER_PING;
      } else {
        ping = PINGS[this.index];
      }
      var fx = (typeof x === 'number' && isFinite(x)) ? x : this.pointer.x;
      var fy = (typeof y === 'number' && isFinite(y)) ? y : this.pointer.y;
      this.close();
      this.ping(ping.id, fx, fy);
    },

    /* 在指定位置放出一个信号（也对外暴露，宿主页可主动调用） */
    ping: function (id, x, y) {
      var ping = findPing(id);
      if (!ping) return this;
      if (!this._built) this.mount();
      this._attach();
      var o = this.options;
      var R = this._R || o.radius;

      var mark = document.createElement('div');
      mark.className = 'mark';
      mark.style.left = x + 'px';
      mark.style.top = y + 'px';
      mark.style.setProperty('--c', this._color(ping));
      mark.style.setProperty('--dur', o.pingDuration + 'ms');

      var glyph = document.createElement('div');
      glyph.className = 'glyph';
      var gs = Math.round(R * 0.30);
      glyph.style.width = gs + 'px';
      glyph.style.height = gs + 'px';
      glyph.innerHTML = ICONS[ping.icon] || '';

      var r1 = document.createElement('span'); r1.className = 'ring r1';
      var r2 = document.createElement('span'); r2.className = 'ring r2';
      var rs = Math.round(R * 0.46);
      [r1, r2].forEach(function (r) { r.style.width = rs + 'px'; r.style.height = rs + 'px'; });

      mark.appendChild(r1);
      mark.appendChild(r2);
      mark.appendChild(glyph);
      this.fx.appendChild(mark);

      var self = this;
      var timer = global.setTimeout(function () {
        if (mark.parentNode) mark.parentNode.removeChild(mark);
        var i = self._marks.indexOf(mark);
        if (i >= 0) self._marks.splice(i, 1);
      }, o.pingDuration + 250);
      mark._timer = timer;
      this._marks.push(mark);

      this._playSfx(ping);
      this._emit('ping', {
        id: ping.id, zh: ping.zh, en: ping.en, color: this._color(ping),
        pos: ping.pos, x: x, y: y, duration: o.pingDuration,
        transcription: ping.trans[this.options.lang === 'en' ? 'en' : 'zh'],
        transcriptionEn: ping.trans.en
      });
      return this;
    },

    clear: function () {
      for (var i = 0; i < this._marks.length; i++) {
        var m = this._marks[i];
        if (m._timer) global.clearTimeout(m._timer);
        if (m.parentNode) m.parentNode.removeChild(m);
      }
      this._marks = [];
      return this;
    },

    /* ---------------- 音效：Web Audio 实时合成，不使用任何音频文件 ---------------- */
    _audioContext: function () {
      if (!this.options.sound) return null;
      try {
        if (!this._audio) {
          var AC = global.AudioContext || global.webkitAudioContext;
          if (!AC) return null;
          this._audio = new AC();
        }
        if (this._audio.state === 'suspended' && this._audio.resume) this._audio.resume();
        return this._audio;
      } catch (err) { return null; }
    },

    _tone: function (freq, delayMs, durMs, type, vol) {
      var ctx = this._audioContext();
      if (!ctx) return;
      try {
        var t0 = ctx.currentTime + delayMs / 1000;
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = type || 'sine';
        osc.frequency.setValueAtTime(freq, t0);
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.001, vol), t0 + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durMs / 1000);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(t0); osc.stop(t0 + durMs / 1000 + 0.04);
      } catch (err) { /* 音频不可用时静默降级 */ }
    },

    _playSfx: function (ping) {
      var v = this.options.volume * 0.09;
      for (var i = 0; i < ping.sfx.length; i++) {
        var s = ping.sfx[i];
        this._tone(s[0], s[1], s[2], s[3], i === 0 ? v : v * 0.85);
      }
    },

    _tick: function () {
      this._tone(this.index === -1 ? 520 : 760, 0, 45, 'square', this.options.volume * 0.022);
    },

    _swoosh: function () {
      this._tone(300, 0, 70, 'triangle', this.options.volume * 0.03);
    },

    /* ---------------- 事件订阅 ---------------- */
    on: function (type, fn) {
      (this._handlers[type] = this._handlers[type] || []).push(fn);
      return this;
    },
    off: function (type, fn) {
      var list = this._handlers[type];
      if (!list) return this;
      var i = list.indexOf(fn);
      if (i >= 0) list.splice(i, 1);
      return this;
    },
    _emit: function (type, detail) {
      detail = detail || {};
      detail.type = 'lol-ping-wheel:' + type;
      detail.instance = this;
      var list = this._handlers[type] || [];
      for (var i = 0; i < list.length; i++) {
        try { list[i](detail); } catch (err) { /* 订阅方异常不影响组件 */ }
      }
      var list2 = this._handlers['*'] || [];
      for (var j = 0; j < list2.length; j++) {
        try { list2[j](detail); } catch (err2) {}
      }
      try {
        document.dispatchEvent(new CustomEvent('lol-ping-wheel:' + type, { detail: detail }));
      } catch (err3) { /* 老浏览器无 CustomEvent 构造器时忽略 */ }
      return this;
    },

    /* ---------------- 选项 / 销毁 ---------------- */
    setOptions: function (patch) {
      assign(this.options, patch || {});
      if (this._built) { this._layout(); this._render(); }
      return this;
    },

    destroy: function () {
      if (this._listening) {
        document.removeEventListener('mousedown', this._onMouseDown, true);
        document.removeEventListener('mousemove', this._onMouseMove, true);
        document.removeEventListener('mouseup', this._onMouseUp, true);
        document.removeEventListener('contextmenu', this._onCtx, true);
        document.removeEventListener('keydown', this._onKeyDown, true);
        document.removeEventListener('keyup', this._onKeyUp, true);
        global.removeEventListener('resize', this._onScroll, true);
        global.removeEventListener('scroll', this._onScroll, true);
        global.removeEventListener('blur', this._onBlur);
        if (this.options.touch) {
          document.removeEventListener('touchstart', this._onTouchStart, true);
          document.removeEventListener('touchmove', this._onTouchMove, true);
          document.removeEventListener('touchend', this._onTouchEnd, true);
          document.removeEventListener('touchcancel', this._onTouchCancel, true);
        }
        this._listening = false;
      }
      this.clear();
      if (this.host && this.host.parentNode) this.host.parentNode.removeChild(this.host);
      if (this._audio && this._audio.close) { try { this._audio.close(); } catch (err) {} }
      this._audio = null;
      this._built = false;
      return this;
    }
  };

  /* =======================================================================
   * 5. 对外 API
   * ======================================================================= */
  var instances = [];

  var LoLPingWheel = {
    version: '2.0.0',
    PINGS: PINGS,
    CENTER_PING: CENTER_PING,
    GENERIC_PING: GENERIC_PING,
    ICONS: ICONS,
    COLORBLIND: CB_COLORS,
    init: function (options) {
      var w = new PingWheel(options).mount().listen();
      instances.push(w);
      return w;
    },
    /* 同页可创建多个互不干扰的实例 */
    instances: instances,
    get: function (id) {
      for (var i = 0; i < instances.length; i++) if (instances[i].id === id) return instances[i];
      return null;
    },
    destroyAll: function () {
      while (instances.length) instances.pop().destroy();
    }
  };

  /* 零配置嵌入：<script src="lol-ping-wheel.js" data-lol-ping-wheel></script> */
  (function autoInit() {
    var cs = document.currentScript;
    if (cs && cs.hasAttribute('data-lol-ping-wheel')) {
      var opts = {};
      if (cs.getAttribute('data-radius')) opts.radius = parseInt(cs.getAttribute('data-radius'), 10);
      if (cs.getAttribute('data-lang')) opts.lang = cs.getAttribute('data-lang');
      if (cs.getAttribute('data-sound') === 'false') opts.sound = false;
      if (cs.getAttribute('data-hold-key')) opts.holdKey = cs.getAttribute('data-hold-key');
      LoLPingWheel.init(opts);
    }
  })();

  global.LoLPingWheel = LoLPingWheel;

  if (typeof module === 'object' && module && module.exports) module.exports = LoLPingWheel;
})(typeof window !== 'undefined' ? window : this);

/* ===== 初始化：只用「按住 G + 滑动」这一种交互 ===== */
(function () {
  'use strict';
  if (window.__lolPingWheelMounted) return;
  if (document.querySelector('[data-lol-ping-wheel]')) return;
  if (!window.LoLPingWheel) return;
  window.__lolPingWheelMounted = true;
  try {
    window.lolPingWheel = window.LoLPingWheel.init({
      radius: 168,
      lang: 'zh',
      sound: true,
      colorblind: false,
      holdKey: 'KeyG',
      holdKeyEnabled: true,
      altClick: false,
      ctrlClick: false,
      altHold: false,
      arrowKeys: true,
      quickKeysEnabled: false
    });
  } catch (e) {
    if (window.console) console.warn('[LoL 信号盘] 初始化失败：', e);
  }
})();