/* 이움레터 통합 라우터
 * 하나의 페이지 안에서 / (통합 홈), /wedding (모바일 청첩장), /obituary (모바일 부고장)를
 * History API로 전환합니다. 각 서비스 컴포넌트는 window.IUM 을 통해 주소와 화면 상태를 맞춥니다.
 */
(function () {
  'use strict';
  var TITLE = '이움레터';
  var SERVICES = ['wedding', 'obituary'];
  var LAST_KEY = 'iumletter:router:last';
  var BG = { home: '#FAF7F3', wedding: '#FAF7F3', obituary: '#F8F4EE' };
  var listeners = [];

  function norm(p) {
    p = String(p || '/').split('#')[0].split('?')[0];
    if (p.charAt(0) !== '/') p = '/' + p;
    p = p.replace(/\/{2,}/g, '/').replace(/\/+$/, '');
    return p || '/';
  }
  function serviceOf(p) {
    var s = norm(p).split('/')[1] || '';
    return SERVICES.indexOf(s) >= 0 ? s : 'home';
  }
  function path() { return norm(location.pathname); }
  function segs(p) { return norm(p).split('/').filter(Boolean).slice(1); }

  var last = {};
  try { last = JSON.parse(sessionStorage.getItem(LAST_KEY) || '{}') || {}; } catch (e) { last = {}; }
  function remember(p) {
    var s = serviceOf(p);
    if (s === 'home') return;
    last[s] = p;
    try { sessionStorage.setItem(LAST_KEY, JSON.stringify(last)); } catch (e) {}
  }

  function keepTitle() { if (document.title !== TITLE) document.title = TITLE; }
  var prevService = null;
  function settle() {
    keepTitle();
    var s = serviceOf(path());
    try { document.body && (document.body.style.background = BG[s]); } catch (e) {}
    if (prevService !== null && prevService !== s) { try { window.scrollTo(0, 0); } catch (e) {} }
    prevService = s;
  }
  function emit() {
    settle();
    var p = path();
    listeners.slice().forEach(function (fn) { try { fn(p); } catch (e) { console.error('[IUM]', e); } });
  }

  var IUM = {
    title: TITLE,
    path: path,
    service: function () { return serviceOf(path()); },
    segments: function () { return segs(path()); },
    /* 다른 화면으로 이동 (기본: 히스토리에 추가) */
    navigate: function (p, opts) {
      p = norm(p);
      var replace = !!(opts && opts.replace);
      if (p === path()) { settle(); return; }
      try { history[replace ? 'replaceState' : 'pushState']({ ium: 1 }, '', p); } catch (e) { location.href = p; return; }
      remember(p);
      emit();
    },
    /* 서비스 시작: 같은 탭에서 작업하던 화면이 있으면 그 화면으로 이어서 */
    open: function (service) {
      if (SERVICES.indexOf(service) < 0) { IUM.navigate('/'); return; }
      var p = last[service];
      IUM.navigate(p && serviceOf(p) === service ? p : '/' + service);
    },
    home: function () { IUM.navigate('/'); },
    subscribe: function (fn) {
      listeners.push(fn);
      return function () { listeners = listeners.filter(function (f) { return f !== fn; }); };
    }
  };
  window.IUM = IUM;

  window.addEventListener('popstate', function () { remember(path()); emit(); });

  /* 알 수 없는 주소는 통합 홈으로 */
  (function () {
    var p = path(), s = serviceOf(p);
    if (s === 'home' && p !== '/' && !/\.[a-z0-9]+$/i.test(p)) {
      try { history.replaceState({ ium: 1 }, '', '/'); } catch (e) {}
    }
    remember(path());
  })();

  /* 탭 제목은 항상 '이움레터' */
  function watchTitle() {
    keepTitle();
    var t = document.querySelector('title');
    if (t && window.MutationObserver) new MutationObserver(keepTitle).observe(t, { childList: true, characterData: true, subtree: true });
    settle();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchTitle); else watchTitle();
})();
