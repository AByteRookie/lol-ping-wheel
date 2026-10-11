/*!
 * 内容脚本：在每个网页里挂载信号盘。
 *
 * 只用一种交互（按要求精简）：
 *   按住 G 不放  →  信号盘在光标处弹出
 *   移动鼠标滑向目标方向  →  对应扇形高亮
 *   松开 G  →  发出所选信号
 *
 * 因此这里刻意关掉了其余触发方式，避免和你访问的网站打架：
 *   altClick: false         不动 Alt + 左键
 *   ctrlClick: false        不动 Ctrl + 左键（很多网站用它后台开新标签页）
 *   altHold: false          不响应单独按住 Alt
 *   quickKeysEnabled: false 不响应轻点 G / V
 *   holdKeyEnabled: true    ← 唯一入口：按住 G
 *
 * 输入框里按 G 会自动让路，不会抢你打字。想改参数：改完到
 * edge://extensions 点一下本扩展的「重新加载」。
 */
(function () {
  'use strict';

  /* 双保险一：同一个页面里只挂一次 */
  if (window.__lolPingWheelMounted) return;
  /* 双保险二：DOM 里已经有宿主元素就不再挂（跨隔离世界也有效），
     这样即使浏览器里存在两份安装副本，也不会出现两个信号盘。 */
  if (document.querySelector('[data-lol-ping-wheel]')) return;
  if (!window.LoLPingWheel) return;
  window.__lolPingWheelMounted = true;

  try {
    var wheel = window.LoLPingWheel.init({
      radius: 168,          /* 信号盘半径 px */
      lang: 'zh',           /* 'zh' | 'en' | 'both' */
      sound: true,          /* Web Audio 实时合成音效，无音频文件 */
      colorblind: false,    /* 改 true 用色盲安全配色 */
      holdKey: 'KeyG',
      holdKeyEnabled: true, /* 唯一入口：按住 G */
      altClick: false,
      ctrlClick: false,
      altHold: false,
      arrowKeys: true,      /* 呼出后也可用方向键选（可选） */
      quickKeysEnabled: false
    });
    window.lolPingWheel = wheel;
  } catch (err) {
    if (window.console && console.warn) console.warn('[LoL 信号盘] 初始化失败：', err);
  }
})();
