(function () {
  "use strict";

  var COURSES = window.LEDU_COURSES || [];
  var DEFAULT_TERM = "autumn";
  var TERM_KEY = "ledu_2a_current_term";

  function courseById(id) {
    for (var i = 0; i < COURSES.length; i++) {
      if (COURSES[i].id === id) return COURSES[i];
    }
    return null;
  }

  // 恢复上次学期，否则默认秋季
  var saved = null;
  try { saved = localStorage.getItem(TERM_KEY); } catch (e) {}
  var termId = (saved && courseById(saved)) ? saved : DEFAULT_TERM;

  var course = courseById(termId) || COURSES[0];
  var LESSONS = course ? course.lessons : [];
  var checkins = loadCheckins();
  var activeNum = defaultNum();

  function storageKey() { return "ledu_2a_" + (course ? course.id : "x") + "_checkin"; }

  // ---------- 打卡存储 ----------
  function loadCheckins() {
    try {
      var raw = localStorage.getItem(storageKey());
      var data = raw ? JSON.parse(raw) : {};
      return (data && typeof data === "object") ? data : {};
    } catch (e) {
      return {};
    }
  }
  function saveCheckins() {
    try { localStorage.setItem(storageKey(), JSON.stringify(checkins)); } catch (e) {}
  }

  function isDone(num) { return !!checkins[num]; }

  // 默认打开「第一个未打卡」的讲次；全部打卡则回到第一讲
  function defaultNum() {
    for (var i = 0; i < LESSONS.length; i++) {
      if (!isDone(LESSONS[i].num)) return LESSONS[i].num;
    }
    return LESSONS.length ? LESSONS[0].num : null;
  }

  function toggleCheckin(num) {
    if (checkins[num]) { delete checkins[num]; } else { checkins[num] = true; }
    saveCheckins();
    renderTabs();
    renderProgress();
    renderLesson(num);
  }

  // ---------- 渲染：学期侧边栏 ----------
  function renderTermBar() {
    var bar = document.getElementById("termBar");
    if (!bar) return;
    var old = bar.querySelectorAll(".term-tab");
    for (var i = 0; i < old.length; i++) old[i].parentNode.removeChild(old[i]);
    COURSES.forEach(function (c) {
      var b = document.createElement("button");
      b.className = "term-tab" + (c.id === termId ? " active" : "");
      b.textContent = c.label;
      b.setAttribute("aria-label", "切换到" + c.label);
      b.addEventListener("click", function () { switchTerm(c.id); });
      bar.appendChild(b);
    });
  }

  function renderHeader() {
    var t = document.getElementById("mainTitle");
    if (t) t.textContent = "乐读英语 · 2A " + (course ? course.label : "");
  }

  // ---------- 渲染：进度 / 讲次 / 内容 ----------
  function renderProgress() {
    var done = LESSONS.filter(function (l) { return isDone(l.num); }).length;
    var total = LESSONS.length;
    var pct = total ? (done / total) : 0;
    var ring = document.getElementById("ringFg");
    if (ring) ring.style.strokeDashoffset = String(97.4 * (1 - pct));
    var txt = document.getElementById("progressText");
    if (txt) txt.textContent = done + "/" + total;
  }

  function renderTabs() {
    var bar = document.getElementById("tabBar");
    if (!bar) return;
    bar.innerHTML = "";
    LESSONS.forEach(function (lesson) {
      var tab = document.createElement("button");
      tab.className = "tab" + (lesson.num === activeNum ? " active" : "") + (isDone(lesson.num) ? " done" : "");
      tab.textContent = "L" + lesson.num;
      tab.setAttribute("aria-label", "第 " + lesson.num + " 讲 " + lesson.title);
      tab.addEventListener("click", function () {
        activeNum = lesson.num;
        renderTabs();
        renderLesson(lesson.num);
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
      bar.appendChild(tab);
    });
  }

  function renderLesson(num) {
    var lesson = LESSONS.find(function (l) { return l.num === num; });
    var content = document.getElementById("content");
    if (!lesson || !content) return;

    var html = "";
    html += '<div class="lesson-head">';
    html += '  <div class="lesson-title"><h2>第 ' + lesson.num + ' 讲 · ' + escapeHtml(lesson.title) + '</h2>';
    html += '    <span class="badge">' + escapeHtml(lesson.badge) + '</span></div>';
    html += '  <button class="checkin-btn' + (isDone(num) ? ' checked' : '') + '" id="checkinBtn">';
    html += '    <span class="box">' + (isDone(num) ? '✓' : '') + '</span>' + (isDone(num) ? '已学' : '标记已学');
    html += '  </button></div>';

    // 语法 / 技能 / 阅读
    (lesson.grammar || []).forEach(function (g) {
      html += '<section class="section"><h3><span class="dot"></span>' + escapeHtml(g.h) + '</h3>';
      if (g.items && g.items.length) {
        html += '<ul class="rule-list">';
        g.items.forEach(function (it) { html += '<li>' + escapeHtml(it) + '</li>'; });
        html += '</ul>';
      }
      if (g.examples && g.examples.length) {
        html += '<div class="examples">';
        g.examples.forEach(function (ex) {
          html += '<div class="example"><div class="en">' + escapeHtml(ex.en) + '</div>';
          if (ex.zh) { html += '<div class="zh">' + escapeHtml(ex.zh) + '</div>'; }
          html += '</div>';
        });
        html += '</div>';
      }
      if (g.note) { html += '<div class="tip"><strong>小贴士：</strong>' + escapeHtml(g.note) + '</div>'; }
      html += '</section>';
    });

    // 词汇
    if (lesson.vocab && lesson.vocab.length) {
      html += '<section class="section"><h3><span class="dot blue"></span>词汇 Vocabulary</h3>';
      html += '<div class="vocab-grid">';
      lesson.vocab.forEach(function (v) {
        html += '<div class="vocab-card"><div class="w">' + escapeHtml(v.w) + '</div>';
        html += '<div class="zh">' + escapeHtml(v.zh) + '</div>';
        if (v.ex) { html += '<div class="ex">' + escapeHtml(v.ex) + '</div>'; }
        html += '</div>';
      });
      html += '</div></section>';

      // 默写（看中文 → 点开显英文）
      html += '<section class="section"><h3><span class="dot green"></span>默写 Dictation</h3>';
      html += '<p class="dictation-hint">看着中文说 / 写英文，点卡片翻面核对</p>';
      html += '<div class="dictation-grid">';
      lesson.vocab.forEach(function (v, i) {
        html += '<div class="flip-card" data-i="' + i + '"><div class="flip-inner">';
        html += '<div class="flip-face flip-front"><span class="q">默写</span><span class="zh">' + escapeHtml(v.zh) + '</span></div>';
        html += '<div class="flip-face flip-back"><span class="w">' + escapeHtml(v.w) + '</span><span class="hint">' + escapeHtml(v.zh) + '</span></div>';
        html += '</div></div>';
      });
      html += '</div></section>';
    }

    if (lesson.vocab && !lesson.vocab.length) {
      html += '<p class="empty">本讲为技能课，无词汇 / 默写，重点掌握题型与句型。</p>';
    }

    content.innerHTML = html;

    // 打卡按钮
    var btn = document.getElementById("checkinBtn");
    if (btn) {
      btn.addEventListener("click", function () { toggleCheckin(num); });
    }
    // 默写翻卡
    content.querySelectorAll(".flip-card").forEach(function (card) {
      card.addEventListener("click", function () { card.classList.toggle("revealed"); });
    });
  }

  function switchTerm(id) {
    if (id === termId) return;
    try { localStorage.setItem(TERM_KEY, id); } catch (e) {}
    termId = id;
    course = courseById(id);
    LESSONS = course ? course.lessons : [];
    checkins = loadCheckins();
    activeNum = defaultNum();
    renderHeader();
    renderTermBar();
    renderProgress();
    renderTabs();
    renderLesson(activeNum);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // 让讲次横条吸附在 header 下方（header 高度随学期切换块变化）
  function fixSticky() {
    var header = document.querySelector(".app-header");
    var bar = document.getElementById("tabBar");
    if (header && bar) bar.style.top = header.offsetHeight + "px";
  }
  window.addEventListener("resize", fixSticky);

  // ---------- 初始化 ----------
  if (!COURSES.length) {
    var c = document.getElementById("content");
    if (c) c.innerHTML = '<p class="empty">未能加载内容，请检查 data.js。</p>';
  } else {
    renderHeader();
    renderTermBar();
    renderProgress();
    renderTabs();
    renderLesson(activeNum);
    fixSticky();
  }
})();
