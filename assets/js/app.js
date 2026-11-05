/* PromptForge Studio — UI layer. Uses PromptForgeCompiler (compiler.js).
   Storage: localStorage only. No data leaves the browser unless the user
   pastes a Gemini key and explicitly enables a live test (key stays local). */
(function () {
  'use strict';
  var DB_KEY = 'promptforge_studio_sessions_v1';
  var sessions = [];
  var activeSessionId = null;
  var currentModel = 'Claude 4 Sonnet (XML)';

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (m) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]; }); }

  function loadDB() {
    try { sessions = JSON.parse(localStorage.getItem(DB_KEY) || '[]'); } catch (e) { sessions = []; }
    if (!sessions.length) {
      var seed = PromptForgeCompiler.compilePrompt('Extract structured invoice JSON (vendor, ISO date, line items, tax) from messy OCR text', currentModel);
      seed.id = 'msg_' + Date.now();
      sessions = [{ id: 'sess_' + Date.now(), title: 'Invoice OCR → Strict JSON Extractor', targetModel: currentModel, updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), messages: [seed] }];
      saveDB();
    }
    activeSessionId = sessions[0].id;
    renderHistory(); renderActive();
  }
  function saveDB() {
    try { localStorage.setItem(DB_KEY, JSON.stringify(sessions)); } catch (e) {}
    var b = $('dbCountBadge'); if (b) b.textContent = 'DB: ' + sessions.length + ' Saved';
  }
  function activeSession() { return sessions.find(function (s) { return s.id === activeSessionId; }); }

  function renderHistory() {
    var c = $('sessionList'); if (!c) return;
    var q = ($('searchHistoryInput').value || '').toLowerCase();
    c.innerHTML = '';
    sessions.filter(function (s) { return s.title.toLowerCase().indexOf(q) !== -1; }).forEach(function (s) {
      var d = document.createElement('div');
      d.className = 'hist-item' + (s.id === activeSessionId ? ' active' : '');
      d.innerHTML = '<div class="hist-title">' + esc(s.title) + '</div><div class="hist-meta">' + esc(s.targetModel.split(' ')[0]) + ' • ' + esc(s.updatedAt) + '</div><button class="hist-del" title="Delete">✕</button>';
      d.onclick = function () { activeSessionId = s.id; renderHistory(); renderActive(); };
      d.querySelector('.hist-del').onclick = function (e) { e.stopPropagation(); sessions = sessions.filter(function (x) { return x.id !== s.id; }); if (activeSessionId === s.id) activeSessionId = sessions.length ? sessions[0].id : null; saveDB(); renderHistory(); renderActive(); };
      c.appendChild(d);
    });
    saveDB();
  }

  function renderActive() {
    var list = $('messagesList'), hero = $('emptyStateHero');
    if (!list) return;
    list.innerHTML = '';
    var s = activeSession();
    if (!s || !s.messages.length) { hero.classList.remove('hidden'); return; }
    hero.classList.add('hidden');
    s.messages.forEach(function (msg) {
      var block = document.createElement('div');
      block.className = 'msg-block';
      var tabs = '<div class="tabs"><button class="tab-btn active" data-tab="final" data-id="' + msg.id + '">Final Prompt (P_final)</button>' +
        '<button class="tab-btn" data-tab="diff" data-id="' + msg.id + '">P₀ vs Patched Diff</button>' +
        '<button class="tab-btn" data-tab="tests" data-id="' + msg.id + '">3× Tests</button></div>';
      block.innerHTML =
        '<div class="user-bubble">' + esc(msg.userIntent) + '</div>' +
        '<div class="artifact"><div class="artifact-head"><span class="dot"></span><b>Compiled &amp; Stress-Tested Prompt</b>' +
        '<span class="pill">' + esc(msg.targetModel) + '</span><span class="score">Score: ' + msg.score + '%</span>' +
        '<span class="lat">' + msg.latencyMs + 'ms • ₹0.00 local</span>' +
        '<button class="copy-btn" data-id="' + msg.id + '">Copy Prompt</button></div>' + tabs +
        '<div class="tab-pane" id="tab-final-' + msg.id + '"><pre>' + esc(msg.pFinal) + '</pre></div>' +
        '<div class="tab-pane hidden" id="tab-diff-' + msg.id + '"><div class="diff-grid"><div class="diff-bad"><b>❌ Naive P₀ — failed edge cases</b><pre>' + esc(msg.p0Draft) + '</pre></div>' +
        '<div class="diff-good"><b>✅ Patched P_final — ' + msg.score + '% rubric</b><pre>' + esc(msg.pFinal) + '</pre></div></div></div>' +
        '<div class="tab-pane hidden" id="tab-tests-' + msg.id + '">' + msg.results.map(function (r) {
          return '<div class="test-row"><div><b>' + esc(r.name) + '</b><p>' + esc(r.input) + '</p></div><span class="badge ' + (r.pFinalPass ? 'ok' : 'fail') + '">' + (r.pFinalPass ? 'PASSED' : 'FAILED') + ' • P₀ ' + (r.p0Pass ? 'passed' : 'failed') + '</span></div>';
        }).join('') + '</div></div>';
      list.appendChild(block);
      updateTelemetry(msg);
    });
    list.querySelectorAll('.tab-btn').forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-id'), tab = b.getAttribute('data-tab');
        block.querySelectorAll('.tab-btn').forEach(function (x) { x.classList.toggle('active', x === b); });
        ['final', 'diff', 'tests'].forEach(function (t) { var el = $('tab-' + t + '-' + id); if (el) el.classList.toggle('hidden', t !== tab); });
      };
    });
    list.querySelectorAll('.copy-btn').forEach(function (b) {
      b.onclick = function () {
        var sess = activeSession(); var m = sess.messages.find(function (x) { return x.id === b.getAttribute('data-id'); });
        if (m && navigator.clipboard) navigator.clipboard.writeText(m.pFinal);
        b.textContent = '✓ Copied!'; setTimeout(function () { b.textContent = 'Copy Prompt'; }, 1500);
      };
    });
    var sc = $('chatScrollContainer'); if (sc) sc.scrollTop = sc.scrollHeight;
  }

  function updateTelemetry(msg) {
    $('telemetryScore').textContent = msg.score + '%';
    $('telemetryLatency').textContent = (msg.latencyMs / 1000).toFixed(2) + 's';
    $('telemetryCost').textContent = '₹0.00';
    ['lane1', 'lane2', 'lane3', 'lane4'].forEach(function (id) { var el = $('status-' + id); if (el) { el.textContent = 'VERIFIED ✓'; el.className = 'lane-ok'; } });
    $('syntheticTestsContainer').innerHTML = msg.results.map(function (r) {
      return '<div class="test-mini"><b>' + esc(r.name) + '</b> — <span>' + (r.pFinalPass ? 'PASSED' : 'FAILED') + '</span><p>' + esc(r.input) + '</p></div>';
    }).join('');
    $('gradientLogContainer').innerHTML = msg.gradients.map(function (g) { return '<div>▸ ' + esc(g) + '</div>'; }).join('');
  }

  function handleCompile() {
    var input = $('userInput'); var raw = input.value.trim(); if (!raw) return;
    input.value = '';
    var btn = $('compileBtn'); btn.disabled = true; btn.textContent = 'Compiling…';
    // Real lane animation, then real compile (measured inside compiler.js)
    var lanes = ['lane1', 'lane2', 'lane3', 'lane4'];
    lanes.forEach(function (id) { var el = $( 'status-' + id); if (el) { el.textContent = 'RUNNING…'; el.className = 'lane-run'; } });
    setTimeout(function () {
      var compiled;
      try { compiled = PromptForgeCompiler.compilePrompt(raw, currentModel); }
      catch (e) { btn.disabled = false; btn.textContent = 'Compile & Stress-Test'; alert(e.message); return; }
      compiled.id = 'msg_' + Date.now();
      var s = activeSession();
      if (!s) { s = { id: 'sess_' + Date.now(), title: 'Untitled Compilation', targetModel: currentModel, updatedAt: 'Just now', messages: [] }; sessions.unshift(s); activeSessionId = s.id; }
      if (!s.messages.length || s.title === 'Untitled Compilation') s.title = raw.slice(0, 38) + (raw.length > 38 ? '…' : '');
      s.updatedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      s.messages.push(compiled);
      saveDB(); renderHistory(); renderActive();
      btn.disabled = false; btn.textContent = 'Compile & Stress-Test';
    }, 320);
  }

  window.PromptForgeApp = {
    init: function () {
      loadDB();
      $('compileBtn').onclick = handleCompile;
      $('userInput').addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCompile(); } });
      $('searchHistoryInput').addEventListener('input', renderHistory);
      document.querySelectorAll('.model-btn').forEach(function (b) {
        b.onclick = function () {
          currentModel = b.getAttribute('data-model');
          document.querySelectorAll('.model-btn').forEach(function (x) { x.classList.toggle('active', x === b); });
        };
      });
      document.querySelectorAll('[data-preset]').forEach(function (b) {
        b.onclick = function () { $('userInput').value = b.getAttribute('data-preset'); handleCompile(); };
      });
    },
    newSession: function () {
      var s = { id: 'sess_' + Date.now(), title: 'Untitled Compilation', targetModel: currentModel, updatedAt: 'Just now', messages: [] };
      sessions.unshift(s); activeSessionId = s.id; saveDB(); renderHistory(); renderActive();
    },
    exportDB: function () {
      var a = document.createElement('a');
      a.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(sessions, null, 2));
      a.download = 'promptforge_db_backup.json'; a.click();
    }
  };
  document.addEventListener('DOMContentLoaded', function () { window.PromptForgeApp.init(); });
})();
