/* =========================================================
   じぶん定点観測（旧仮称：滞りセルフチェックツール）
   - 外部ライブラリなし・通信なし（CSPで禁止）
   - 結果はこのブラウザの localStorage にだけ保存
   - 画面への文字の書き込みは textContent のみ（innerHTMLは使わない）
   ========================================================= */
(function () {
  "use strict";

  const STORAGE_KEY = "jinseijikken-selfcheck-v1";
  const HISTORY_MAX = 20;
  const MAX_SCORE = 15; // 1領域3問 × 5点
  const MEMO_MAX = 1000; // 気づきメモの最大文字数
  const SVG_NS = "http://www.w3.org/2000/svg";
  // 「前回の一歩、やってみましたか？」の答え
  const TRIED_OPTIONS = [
    { id: "yes",    label: "やってみた" },
    { id: "partly", label: "少しやった" },
    { id: "no",     label: "やらなかった" },
    { id: "skip",   label: "答えずに進む" }
  ];

  const $ = (id) => document.getElementById(id);
  const domainById = Object.fromEntries(DOMAINS.map((d) => [d.id, d]));

  let order = [];      // 出題順（QUESTIONSの添字）
  let answers = [];    // QUESTIONSの添字ごとの点数
  let pos = 0;         // 何問目か
  let candidates = []; // 引けるカード（CARDSの添字）
  let currentCard = -1;
  let shown = null;    // 表示中の結果 { entry, prev, stuckNames }

  /* ---------- 保存（このブラウザの中だけ） ---------- */
  function loadHistory() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!data || !Array.isArray(data.history)) return [];
      // 形が正しいものだけ使う（card：受け取ったカードのタイトル／tried：前回の一歩をやったか）
      return data.history
        .filter((h) =>
          h && typeof h.date === "string" && h.scores &&
          DOMAINS.every((d) => Number.isInteger(h.scores[d.id]) && h.scores[d.id] >= 3 && h.scores[d.id] <= MAX_SCORE)
        )
        .map((h) => {
          const e = { date: h.date, scores: h.scores };
          if (typeof h.card === "string" && CARDS.some((c) => c.title === h.card)) e.card = h.card;
          if (TRIED_OPTIONS.some((o) => o.id === h.tried)) e.tried = h.tried;
          if (typeof h.memo === "string" && h.memo.trim()) e.memo = h.memo.slice(0, MEMO_MAX);
          return e;
        });
    } catch (e) {
      return [];
    }
  }
  function saveHistory(history) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ history: history.slice(-HISTORY_MAX) }));
    } catch (e) { /* 保存できない環境（プライベートモード等）では保存しない */ }
  }
  function clearHistory() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* noop */ }
  }

  /* ---------- 画面切り替え ---------- */
  function show(id) {
    flushMemo(); // 画面を切り替える前に、書きかけのメモを保存
    if (id !== "result" && sharedMode) { sharedMode = false; clearShareHash(); } // 共有された観測から離れたら URL を元に戻す
    ["intro", "followup", "quiz", "result", "records"].forEach((s) => { $(s).hidden = s !== id; });
    // 問いの画面ではヘッダー・フッターを隠して集中できるようにする
    document.body.classList.toggle("is-quiz", id === "quiz");
    window.scrollTo(0, 0);
  }

  function formatDate(iso) {
    const d = new Date(iso);
    return isNaN(d) ? "" : d.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });
  }

  /* ---------- ① はじめに ---------- */
  // 8つの領域を、結果画面と同じ色の丸つきで並べる
  DOMAINS.forEach((d) => {
    const li = document.createElement("li");
    const dot = document.createElement("span");
    dot.className = "dot";
    dot.style.background = d.accent;
    li.append(dot, d.name);
    $("domain-list").append(li);
  });

  function renderIntro() {
    const history = loadHistory();
    const last = history[history.length - 1];
    $("last-info").hidden = !last;
    if (last) $("last-info").textContent = "前回の観測：" + formatDate(last.date);
    show("intro");
  }

  /* ---------- ①' 前回の一歩、やってみましたか？ ---------- */
  // はじめに画面から始めるとき、前回受け取ったカードについてまだ答えていなければ聞く
  function startFlow() {
    const history = loadHistory();
    const last = history[history.length - 1];
    if (last && last.card && !last.tried) showFollowup(last);
    else startQuiz();
  }

  function showFollowup(last) {
    const c = CARDS.find((x) => x.title === last.card);
    const d = domainById[c.domain];
    const days = Math.floor((Date.now() - new Date(last.date).getTime()) / 86400000);
    $("fu-since").textContent = `前回の観測：${formatDate(last.date)}` + (days > 0 ? `（${days}日前）` : "");
    const box = $("fu-card");
    box.style.setProperty("--card-bg", d.bg);
    box.classList.toggle("is-white", d.bg.toLowerCase() === "#ffffff");
    $("fu-title").textContent = c.title;
    $("fu-step").textContent = c.step;
    const opts = $("fu-options");
    opts.replaceChildren();
    TRIED_OPTIONS.forEach((o) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = o.id === "skip" ? "btn text" : "btn ghost";
      b.textContent = o.label;
      b.addEventListener("click", () => {
        const all = loadHistory();
        const e = all.find((h) => h.date === last.date);
        if (e) { e.tried = o.id; saveHistory(all); }
        startQuiz();
      });
      opts.append(b);
    });
    show("followup");
  }

  /* ---------- ② 問い ---------- */
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function startQuiz() {
    order = shuffle(QUESTIONS.map((_, i) => i));
    answers = new Array(QUESTIONS.length).fill(null);
    pos = 0;
    $("q-total").textContent = QUESTIONS.length;
    show("quiz");
    renderQuestion();
  }

  function renderQuestion() {
    const qi = order[pos];
    $("q-index").textContent = pos + 1;
    $("q-text").textContent = QUESTIONS[qi].text;
    $("progress-bar").style.width = (pos / QUESTIONS.length) * 100 + "%";
    document.querySelectorAll(".score").forEach((b) => {
      const selected = Number(b.dataset.value) === answers[qi];
      b.classList.toggle("selected", selected);
      b.setAttribute("aria-pressed", selected ? "true" : "false");
    });
    $("q-text").focus({ preventScroll: true });
  }

  let busy = false;
  function answer(value) {
    if (busy) return;
    busy = true;
    answers[order[pos]] = value;
    document.querySelectorAll(".score").forEach((b) => b.classList.toggle("selected", Number(b.dataset.value) === value));
    setTimeout(() => {
      busy = false;
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); // タップしたボタンの状態を残さない
      pos++;
      if (pos < QUESTIONS.length) renderQuestion();
      else finish();
    }, 220);
  }

  function back() {
    if (pos === 0) renderIntro();
    else { pos--; renderQuestion(); }
  }

  /* ---------- ③ 結果 ---------- */
  function finish() {
    const scores = {};
    DOMAINS.forEach((d) => { scores[d.id] = 0; });
    QUESTIONS.forEach((q, i) => { scores[q.domain] += answers[i]; });

    const history = loadHistory();
    const prev = history[history.length - 1] || null;
    const entry = { date: new Date().toISOString(), scores };
    history.push(entry);
    saveHistory(history);
    renderResult(entry, prev);
  }

  // 記録の画面から、過去の観測を開く
  function showObservation(date) {
    const all = loadHistory();
    const i = all.findIndex((h) => h.date === date);
    if (i < 0) return showRecords();
    renderResult(all[i], all[i - 1] || null, true);
  }

  // fromRecords：記録の画面から開いた過去の観測なら true（見出しを日付にして、戻るリンクを出す）
  /* ---------- 気づきメモ（入力をやめて少したったら、表示中の回の記録に保存） ---------- */
  let memoDate = null;
  let memoTimer = null;
  function setMemo(entry) {
    flushMemo(); // 前に表示していた回の書きかけを保存してから切り替える
    memoDate = entry.date;
    $("memo").value = entry.memo || "";
    $("memo-status").textContent = "";
  }
  function saveMemo() {
    clearTimeout(memoTimer);
    memoTimer = null;
    if (!memoDate) return;
    const all = loadHistory();
    const e = all.find((h) => h.date === memoDate);
    if (!e) return;
    const raw = $("memo").value.slice(0, MEMO_MAX);
    const text = raw.trim() ? raw : ""; // 空白だけなら「メモなし」
    if ((e.memo || "") === text) return; // 変わっていなければ何もしない
    if (text) e.memo = text; else delete e.memo;
    saveHistory(all);
    $("memo-status").textContent = "保存しました";
  }
  function flushMemo() { if (memoTimer) saveMemo(); }

  /* ---------- 共有リンク（#r=1-YYYYMMDD-8桁）：日付と点数だけを URL の # 以降に入れる ----------
     # 以降はサーバーに送られないので、点数は外部に送信されない。
     点数（3〜15）は16進数1桁（3〜f）で、DOMAINS の順に並べる。 */
  function encodeShare(entry) {
    const d = new Date(entry.date);
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    return `r=1-${ymd}-${DOMAINS.map((dm) => entry.scores[dm.id].toString(16)).join("")}`;
  }
  function decodeShare(hash) {
    const m = /^#r=1-(\d{4})(\d{2})(\d{2})-([3-9a-f]{8})$/i.exec(hash || "");
    if (!m || DOMAINS.length !== 8) return null;
    const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
    if (isNaN(date) || date.getMonth() !== Number(m[2]) - 1) return null;
    const scores = {};
    DOMAINS.forEach((dm, i) => { scores[dm.id] = parseInt(m[4][i], 16); });
    return { date: date.toISOString(), scores };
  }
  function shareUrl(entry) {
    return location.href.split("#")[0] + "#" + encodeShare(entry);
  }
  function clearShareHash() {
    if (location.hash) history.replaceState(null, "", location.href.split("#")[0]);
  }

  let sharedMode = false; // 共有リンクの結果を表示中か
  function renderShared(entry) {
    renderResult(entry, null, false, true);
  }

  // fromRecords：記録の画面から開いた過去の観測 ／ shared：共有リンクから開いた観測（記録しない・カードやメモは出さない）
  function renderResult(entry, prev, fromRecords, shared) {
    sharedMode = !!shared;
    if (!shared) clearShareHash();
    if (shared) { flushMemo(); memoDate = null; } else setMemo(entry);
    $("shared-note").hidden = !shared;
    $("shared-start-box").hidden = !shared;
    $("share-box").hidden = !!shared;
    $("memo-box").hidden = !!shared;
    $("card-area").hidden = !!shared;
    closeShareMenu();
    $("result-title").textContent = shared ? "共有された観測" : fromRecords ? `${formatDate(entry.date)}の観測` : "今回の観測";
    $("result-date").textContent = fromRecords ? "" : formatDate(entry.date);
    $("result-date").hidden = !!fromRecords;
    $("back-records").hidden = !fromRecords;
    $("legend-now").textContent = fromRecords ? "この回" : "今回";
    drawChart(entry.scores, prev && prev.scores);
    $("legend").hidden = !prev;

    // 点数表
    const tbody = $("score-rows");
    tbody.replaceChildren();
    $("th-diff").hidden = !prev;
    DOMAINS.forEach((d) => {
      const tr = document.createElement("tr");
      const name = document.createElement("td");
      const dot = document.createElement("span");
      dot.className = "dot";
      dot.style.background = d.accent;
      name.append(dot, d.name);
      const sc = document.createElement("td");
      sc.textContent = entry.scores[d.id] + " / " + MAX_SCORE;
      tr.append(name, sc);
      if (prev) {
        const diff = entry.scores[d.id] - prev.scores[d.id];
        const td = document.createElement("td");
        td.textContent = diff > 0 ? "+" + diff : diff === 0 ? "±0" : String(diff);
        td.className = diff > 0 ? "up" : diff < 0 ? "down" : "";
        tr.append(td);
      }
      tbody.append(tr);
    });


    // いちばん低い領域（同点はすべて）
    const min = Math.min(...DOMAINS.map((d) => entry.scores[d.id]));
    const stuck = DOMAINS.filter((d) => entry.scores[d.id] === min);
    // 領域の色の丸つきで表示（同点はすべて）
    const names = $("stuck-names");
    names.replaceChildren();
    stuck.forEach((d) => {
      const item = document.createElement("span");
      item.className = "stuck-item";
      const dot = document.createElement("span");
      dot.className = "dot";
      dot.style.background = d.accent;
      item.append(dot, d.name);
      names.append(item);
    });
    shown = { entry, prev, stuckNames: stuck.map((d) => d.name).join("・") };
    $("save-msg").textContent = "";
    $("try-msg").textContent = "";

    candidates = CARDS.map((c, i) => i).filter((i) => stuck.some((d) => d.id === CARDS[i].domain));
    currentCard = -1;
    if (!shared) drawCard(entry.card); // 前に受け取ったカードがあれば、同じカードを表示する
    show("result");
  }

  /* ---------- レーダーチャート（SVGを自前で描画） ---------- */
  function svg(tag, attrs, parent) {
    const el = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    if (parent) parent.append(el);
    return el;
  }

  function drawChart(scores, prevScores) {
    const chart = $("chart");
    chart.replaceChildren();
    const cx = 180, cy = 170, R = 115, n = DOMAINS.length;
    const point = (i, v) => {
      const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
      const r = (R * v) / MAX_SCORE;
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    };
    const poly = (vals) => vals.map((v, i) => point(i, v).map((x) => x.toFixed(1)).join(",")).join(" ");

    [5, 10, 15].forEach((v) => svg("polygon", { points: poly(DOMAINS.map(() => v)), class: "grid" }, chart));
    DOMAINS.forEach((d, i) => {
      const [x, y] = point(i, MAX_SCORE);
      svg("line", { x1: cx, y1: cy, x2: x, y2: y, class: "axis" }, chart);
      const [lx, ly] = point(i, MAX_SCORE + 3.2);
      const t = svg("text", { x: lx, y: ly, class: "label", "text-anchor": "middle", "dominant-baseline": "middle" }, chart);
      t.textContent = d.name;
    });
    if (prevScores) svg("polygon", { points: poly(DOMAINS.map((d) => prevScores[d.id])), class: "prev" }, chart);
    svg("polygon", { points: poly(DOMAINS.map((d) => scores[d.id])), class: "now" }, chart);
    DOMAINS.forEach((d, i) => {
      const [x, y] = point(i, scores[d.id]);
      svg("circle", { cx: x, cy: y, r: 4, fill: d.accent, class: "pt" }, chart);
    });
  }

  /* ---------- 観測の記録（領域ごとの推移） ---------- */
  // 記録の画面を開く（ヘッダーの「記録」／過去の観測の「← 観測の記録へ」から）
  function showRecords() {
    const all = loadHistory();
    const last = all[all.length - 1];
    $("records-empty").hidden = all.length > 0;
    $("records-body").hidden = all.length === 0;
    if (last) renderHistory(last);
    show("records");
  }

  function renderHistory(entry) {
    const all = loadHistory();
    const idx = all.findIndex((h) => h.date === entry.date);
    const series = idx >= 0 ? all.slice(0, idx + 1) : [entry]; // 表示中の観測までの記録
    renderObsList(series);
    const grid = $("spark-grid");
    grid.replaceChildren();
    const enough = series.length >= 2;
    $("history-empty").hidden = enough;
    $("history-range").hidden = !enough;
    grid.hidden = !enough;
    if (!enough) return;

    $("history-range").textContent =
      `${formatDate(series[0].date)} 〜 ${formatDate(series[series.length - 1].date)}（${series.length}回）`;

    const VW = 240, VH = 60, PAD = 6;
    const x = (i) => PAD + (i * (VW - PAD * 2)) / (series.length - 1);
    const y = (v) => VH - PAD - ((v - 3) * (VH - PAD * 2)) / (MAX_SCORE - 3); // 3〜15点

    DOMAINS.forEach((d) => {
      const vals = series.map((h) => h.scores[d.id]);
      const last = vals[vals.length - 1];
      const diff = last - vals[vals.length - 2];

      const box = document.createElement("div");
      box.className = "spark";
      const head = document.createElement("div");
      head.className = "spark-head";
      const name = document.createElement("span");
      const dot = document.createElement("span");
      dot.className = "dot";
      dot.style.background = d.accent;
      name.append(dot, d.name);
      const val = document.createElement("span");
      const b = document.createElement("b");
      b.textContent = last;
      const sm = document.createElement("small");
      sm.textContent = diff > 0 ? "+" + diff : diff === 0 ? "±0" : String(diff);
      sm.className = diff > 0 ? "up" : diff < 0 ? "down" : "";
      val.append(b, sm);
      head.append(name, val);

      const s = document.createElementNS(SVG_NS, "svg");
      s.setAttribute("viewBox", `0 0 ${VW} ${VH}`);
      s.setAttribute("role", "img");
      s.setAttribute("aria-label", `${d.name}の推移：${vals.join("、")}`);
      svg("line", { x1: 0, y1: y(9), x2: VW, y2: y(9), class: "base" }, s); // 中間（9点）の目安線
      svg("polyline", {
        points: vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" "),
        class: "line", stroke: d.accent
      }, s);
      vals.forEach((v, i) => {
        svg("circle", { cx: x(i), cy: y(v), r: i === vals.length - 1 ? 4 : 2.5, fill: d.accent }, s);
      });

      box.append(head, s);
      grid.append(box);
    });
  }

  // これまでの観測：新しい順に、日付と「いま目を向けたいところ」を並べる（押すとその回の結果へ）
  function renderObsList(series) {
    const list = $("obs-list");
    list.replaceChildren();
    series.slice().reverse().forEach((h) => {
      const min = Math.min(...DOMAINS.map((d) => h.scores[d.id]));
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "obs-item";
      const date = document.createElement("span");
      date.className = "obs-date";
      date.textContent = formatDate(h.date);
      const focus = document.createElement("span");
      focus.className = "obs-focus";
      DOMAINS.filter((d) => h.scores[d.id] === min).forEach((d) => {
        const item = document.createElement("span");
        const dot = document.createElement("span");
        dot.className = "dot";
        dot.style.background = d.accent;
        item.append(dot, d.name);
        focus.append(item);
      });
      // その回の一歩をやったか（記録があるときだけ）
      const opt = TRIED_OPTIONS.find((o) => o.id === h.tried);
      const tried = document.createElement("span");
      tried.className = "obs-tried" + (h.tried === "yes" ? " yes" : "");
      tried.textContent = opt && h.tried !== "skip" ? opt.label : "";
      btn.append(date, focus, tried);
      if (h.memo) { // メモがある回には印
        const m = document.createElement("span");
        m.className = "obs-memo";
        m.textContent = "✎";
        m.title = "気づきメモあり";
        m.setAttribute("aria-label", "気づきメモあり");
        btn.append(m);
      }
      const arrow = document.createElement("span");
      arrow.className = "obs-arrow";
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "→";
      btn.append(arrow);
      btn.addEventListener("click", () => showObservation(h.date));
      li.append(btn);
      list.append(li);
    });
  }

  /* ---------- リフレクションカード ---------- */
  function setFlipped(flipped, animate) {
    const card = $("card");
    if (!animate) card.classList.add("no-anim");
    card.classList.toggle("flipped", flipped);
    $("card-front").setAttribute("aria-hidden", flipped ? "true" : "false");
    $("card-back").setAttribute("aria-hidden", flipped ? "false" : "true");
    $("reveal").textContent = flipped ? "問いに戻る" : "整える一歩を見る";
    if (!animate) {
      void card.offsetWidth; // アニメーションなしで即座に反映させる
      card.classList.remove("no-anim");
    }
  }

  function drawCard(preferTitle) {
    const preferred = typeof preferTitle === "string" ? CARDS.findIndex((c) => c.title === preferTitle) : -1;
    if (preferred >= 0) { // 受け取ったカードがあれば、必ずそのカードを出す
      currentCard = preferred;
    } else {
      const pool = candidates.length > 1 ? candidates.filter((i) => i !== currentCard) : candidates;
      currentCard = pool[Math.floor(Math.random() * pool.length)];
    }
    const c = CARDS[currentCard];
    const d = domainById[c.domain];
    const card = $("card");
    setFlipped(false, false); // 新しいカードは必ず表（問い）から
    card.style.setProperty("--card-bg", d.bg);
    card.classList.toggle("is-white", d.bg.toLowerCase() === "#ffffff");
    const num = String(currentCard + 1).padStart(2, "0");
    $("card-num").textContent = num;
    $("card-num-b").textContent = num;
    $("card-title").textContent = c.title;
    $("card-title-b").textContent = c.title;
    $("card-q").textContent = c.q;
    $("card-step-text").textContent = c.step;
    $("card-domain").textContent = d.name;
    $("card-domain-b").textContent = d.name;
    $("redraw").hidden = candidates.length < 2;
    rememberCard(c.title);
  }

  // 最新の観測を表示しているときだけ、受け取ったカードを記録に残す
  // （別のカードを引き直したら、前のカードの「やってみた」の記録は外す）
  function rememberCard(title) {
    const latest = latestShown();
    if (!latest) { renderTryBox(); return; }
    const all = loadHistory();
    const e = all[all.length - 1];
    if (e.card !== title) {
      e.card = title;
      delete e.tried;
      saveHistory(all);
      $("try-msg").textContent = "";
    }
    renderTryBox();
  }

  // 表示中の観測が、いちばん新しい観測ならその記録を返す
  function latestShown() {
    if (!shown) return null;
    const all = loadHistory();
    const latest = all[all.length - 1];
    return latest && latest.date === shown.entry.date ? latest : null;
  }

  /* ---------- 一歩をその場で記録する ---------- */
  const QUICK_OPTIONS = TRIED_OPTIONS.filter((o) => o.id === "yes" || o.id === "partly");

  function setTried(date, id) {
    const all = loadHistory();
    const e = all.find((h) => h.date === date);
    if (!e) return;
    if (id) e.tried = id; else delete e.tried;
    saveHistory(all);
  }

  // ボタンを並べる。選んだボタンをもう一度押すと取り消し
  function renderTryButtons(container, msg, date, current, onChange) {
    container.replaceChildren();
    QUICK_OPTIONS.forEach((o) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "btn ghost" + (current === o.id ? " selected" : "");
      b.setAttribute("aria-pressed", current === o.id ? "true" : "false");
      b.textContent = o.label;
      b.addEventListener("click", () => {
        const next = current === o.id ? null : o.id;
        setTried(date, next);
        msg.textContent = next ? "記録しました。" : "記録を取り消しました。";
        onChange();
      });
      container.append(b);
    });
  }

  // 結果画面：「この一歩、やってみた？」
  function renderTryBox() {
    const latest = latestShown();
    $("try-box").hidden = !latest;
    // 「もう1枚引く」は、最新の回で、まだ一歩を記録していないときだけ出す
    $("redraw").hidden = candidates.length < 2 || !latest || !!latest.tried;
    if (!latest) return;
    renderTryButtons($("try-options"), $("try-msg"), latest.date, latest.tried, renderTryBox);
  }

  function toggleCard() {
    setFlipped(!$("card").classList.contains("flipped"), true);
  }

  /* ---------- 結果を画像で保存 ---------- */
  async function saveImage() {
    if (!shown) return;
    const btn = $("save-image");
    const msg = $("save-msg");
    btn.disabled = true;
    msg.textContent = "画像を作っています…";
    try {
      const blob = await ResultImage.create({
        domains: DOMAINS,
        entry: shown.entry,
        prev: shown.prev,
        stuckNames: shown.stuckNames,
        max: MAX_SCORE,
        dateText: formatDate(shown.entry.date)
      });
      const d = new Date(shown.entry.date);
      const ymd = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("");
      const file = new File([blob], `jibun-teiten-kansoku-${ymd}.png`, { type: "image/png" });

      // スマホ：共有メニュー（写真に保存・SNSなど）／それ以外：ダウンロード
      const isTouch = window.matchMedia("(pointer: coarse)").matches;
      if (isTouch && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file] });
          msg.textContent = "";
        } catch (e) {
          msg.textContent = e && e.name === "AbortError" ? "" : "共有できませんでした。もう一度お試しください。";
        }
      } else {
        const url = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        msg.textContent = "";
      }
    } catch (e) {
      msg.textContent = "画像を作れませんでした。";
    } finally {
      btn.disabled = false;
    }
  }

  /* ---------- 結果を共有（共有リンク／画像） ---------- */
  const canShareLink = () => window.matchMedia("(pointer: coarse)").matches && !!navigator.share;
  function closeShareMenu() { // 結果を表示し直すたびに、前回のリンク表示とメッセージを消す
    $("share-url").hidden = true;
    $("save-msg").textContent = "";
    $("share-link").textContent = canShareLink() ? "リンクを送る" : "共有リンクをコピー";
  }
  async function shareLink() {
    if (!shown) return;
    const url = shareUrl(shown.entry);
    const msg = $("save-msg");
    msg.textContent = "";
    // スマホ：共有メニュー（LINE・メッセージなど）
    if (canShareLink()) {
      try { await navigator.share({ title: "じぶん定点観測", url }); return; }
      catch (e) { if (e && e.name === "AbortError") return; }
    }
    // PC：クリップボードにコピー（できない環境では、リンクを表示して選んでもらう）
    try {
      await navigator.clipboard.writeText(url);
      msg.textContent = "リンクをコピーしました。";
    } catch (e) {
      const input = $("share-url");
      input.value = url;
      input.hidden = false;
      input.focus();
      input.select();
      msg.textContent = "リンクを選んでコピーしてください。";
    }
  }

  /* ---------- イベント ---------- */
  $("share-link").addEventListener("click", shareLink);
  $("shared-start").addEventListener("click", () => { clearShareHash(); sharedMode = false; renderIntro(); });
  window.addEventListener("hashchange", () => {
    const e = decodeShare(location.hash);
    if (e) renderShared(e);
  });
  $("save-image").addEventListener("click", saveImage);
  $("memo").addEventListener("input", () => {
    $("memo-status").textContent = "";
    clearTimeout(memoTimer);
    memoTimer = setTimeout(saveMemo, 600);
  });
  $("memo").addEventListener("blur", saveMemo);
  window.addEventListener("pagehide", flushMemo); // タブを閉じる・別のページへ移るとき
  $("nav-records").addEventListener("click", (e) => { e.preventDefault(); showRecords(); });
  $("records-start").addEventListener("click", startFlow);
  $("start").addEventListener("click", startFlow);
  $("back-records").addEventListener("click", (e) => { e.preventDefault(); showRecords(); });
  $("back").addEventListener("click", back);
  $("reveal").addEventListener("click", toggleCard);
  $("card").addEventListener("click", toggleCard); // カード自体をタップしてもめくれる
  $("redraw").addEventListener("click", drawCard);
  $("clear").addEventListener("click", () => {
    if (window.confirm("このブラウザに保存した観測の記録をすべて消しますか？")) {
      clearHistory();
      renderIntro();
    }
  });
  document.querySelectorAll(".score").forEach((b) =>
    b.addEventListener("click", () => answer(Number(b.dataset.value)))
  );
  // キーボードの 1〜5 でも回答できる
  document.addEventListener("keydown", (e) => {
    if ($("quiz").hidden || e.altKey || e.ctrlKey || e.metaKey) return;
    const v = Number(e.key);
    if (v >= 1 && v <= 5) answer(v);
  });

  // 共有リンクから開いたら、その結果を表示。それ以外はホーム
  const sharedEntry = decodeShare(location.hash);
  if (sharedEntry) renderShared(sharedEntry);
  else { clearShareHash(); renderIntro(); }
})();
