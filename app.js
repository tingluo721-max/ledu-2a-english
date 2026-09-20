(function () {
  "use strict";

  var LESSONS = window.LEDU_LESSONS || [];
  var STORAGE_KEY = "ledu_2a_summer_checkin";

  // ---------- 打卡存储 ----------
  function loadCheckins() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var data = raw ? JSON.parse(raw) : {};
      return (data && typeof data === "object") ? data : {};
    } catch (e) {
      return {};
    }
  }
  function saveCheckins(obj) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(obj)); } catch (e) {}
  }

  var checkins = loadCheckins();

  function isDone(num) { return !!checkins[num]; }

  function toggleCheckin(num) {
    if (checkins[num]) { delete checkins[num]; } else { checkins[num] = true; }
    saveCheckins(checkins);
    renderTabs();
    renderProgress();
    renderLesson(num); // 更新当前讲的按钮状态
  }

  // ---------- 渲染 ----------
  var activeNum = LESSONS.length ? LESSONS[0].num : null;

  function renderProgress() {
    var done = LESSONS.filter(function (l) { return isDone(l.num); }).length;
    var total = LESSONS.length;
    var pct = total ? (done / total) : 0;
    var ring = document.getElementById("ringFg");
    if (ring) {
      ring.style.strokeDashoffset = String(97.4 * (1 - pct));
    }
    var txt = document.getElementById("progressText");
    if (txt) { txt.textContent = done + "/" + total; }
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

    // 语法 / 技能
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
      html += '<p class="empty">本讲为剑二（Movers）技能课，无词汇 / 默写，重点掌握题型与句型。</p>';
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

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // ---------- 初始化 ----------
  if (!LESSONS.length) {
    document.getElementById("content").innerHTML = '<p class="empty">未能加载内容，请检查 data.js。</p>';
  } else {
    renderProgress();
    renderTabs();
    renderLesson(activeNum);
  }
})();
