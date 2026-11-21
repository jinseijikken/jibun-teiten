/* =========================================================
   結果を1枚の画像（PNG・1080×1350）にする
   - ブラウザの canvas だけで作る（外部への送信なし）
   ========================================================= */
const ResultImage = (function () {
  "use strict";

  const W = 1080, H = 1350;
  const C = {
    paper: "#f9f8f5", night: "#172139", ink: "#20201f", body: "#555350",
    muted: "#6b6668", label: "#8a8273", line: "#dcd9d2", gold: "#c7aa6b", cardGold: "#ba9f50"
  };
  const SERIF = '"Zen Old Mincho", "Yu Mincho", "Hiragino Mincho ProN", serif';
  const SANS = '"Zen Kaku Gothic New", "Yu Gothic", "Hiragino Kaku Gothic ProN", sans-serif';
  const ITALIC = 'italic 400 {s}px Georgia, "Times New Roman", serif';

  // 日本語向けの簡易折り返し（1文字ずつ幅を測る。句読点・閉じ括弧は行頭に来ないようにする）
  function wrap(ctx, text, maxWidth) {
    const noStart = "、。，．・：；？！ー）」』”’〉》】ぁぃぅぇぉっゃゅょァィゥェォッャュョ";
    const lines = [];
    let line = "";
    for (const ch of text) {
      const test = line + ch;
      if (ctx.measureText(test).width > maxWidth && line) {
        if (noStart.includes(ch)) {
          lines.push(test);
          line = "";
          continue;
        }
        lines.push(line);
        line = ch;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function drawLines(ctx, lines, x, y, lineHeight) {
    lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight));
    return y + lines.length * lineHeight;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawRadar(ctx, domains, scores, prevScores, cx, cy, R, max) {
    const n = domains.length;
    const pt = (i, v) => {
      const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
      const r = (R * v) / max;
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    };
    const path = (vals) => {
      ctx.beginPath();
      vals.forEach((v, i) => { const [x, y] = pt(i, v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.closePath();
    };
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1.5;
    [5, 10, 15].forEach((v) => { path(domains.map(() => v)); ctx.stroke(); });
    domains.forEach((d, i) => {
      const [x, y] = pt(i, max);
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke();
    });
    // ラベル（領域名＋点数）
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    domains.forEach((d, i) => {
      const [x, y] = pt(i, max + 3.6);
      ctx.fillStyle = C.body;
      ctx.font = `500 26px ${SANS}`;
      ctx.fillText(d.name, x, y - 14);
      ctx.fillStyle = d.accent;
      ctx.font = `700 26px ${SERIF}`;
      ctx.fillText(String(scores[d.id]), x, y + 18);
    });
    if (prevScores) {
      path(domains.map((d) => prevScores[d.id]));
      ctx.setLineDash([10, 8]);
      ctx.strokeStyle = C.gold;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.setLineDash([]);
    }
    path(domains.map((d) => scores[d.id]));
    ctx.fillStyle = "rgba(23, 33, 57, .14)";
    ctx.fill();
    ctx.strokeStyle = C.night;
    ctx.lineWidth = 4;
    ctx.lineJoin = "round";
    ctx.stroke();
    domains.forEach((d, i) => {
      const [x, y] = pt(i, scores[d.id]);
      ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.fillStyle = d.accent; ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.stroke();
    });
  }

  /**
   * @param {object} p { domains, entry, prev, stuckNames, card:{num,title,q,step,bg}, dateText, max }
   * @returns {Promise<Blob>}
   */
  async function create(p) {
    // Webフォントの読み込みを待つ（読めない環境では標準フォントで描く）
    try {
      await Promise.all([
        document.fonts.load(`700 40px "Zen Old Mincho"`),
        document.fonts.load(`500 26px "Zen Kaku Gothic New"`)
      ]);
    } catch (e) { /* noop */ }

    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");

    // 背景・ヘッダー帯
    ctx.fillStyle = C.paper;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = C.night;
    ctx.fillRect(0, 0, W, 112);
    ctx.fillStyle = "#fff";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.font = `700 34px ${SERIF}`;
    ctx.fillText("人生実験", 64, 58);
    ctx.textAlign = "right";
    ctx.font = `500 26px ${SANS}`;
    ctx.fillText("じぶん定点観測", W - 64, 58);

    // 日付
    ctx.textAlign = "left";
    ctx.fillStyle = C.muted;
    ctx.font = `500 24px ${SANS}`;
    ctx.fillText(p.dateText, 64, 160);
    if (p.prev) {
      // 凡例：── 今回　- - 前回
      ctx.fillStyle = C.night; ctx.fillRect(W - 310, 158, 36, 4);
      ctx.fillStyle = C.muted; ctx.fillText("今回", W - 264, 160);
      ctx.setLineDash([8, 6]); ctx.strokeStyle = C.gold; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(W - 170, 160); ctx.lineTo(W - 134, 160); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillText("前回", W - 124, 160);
    }

    // レーダーチャート
    drawRadar(ctx, p.domains, p.entry.scores, p.prev && p.prev.scores, W / 2, 450, 215, p.max);

    // いま滞っているところ
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = C.muted;
    ctx.font = `500 24px ${SANS}`;
    ctx.fillText("いま滞っているところ", W / 2, 790);
    ctx.fillStyle = C.ink;
    ctx.font = `700 46px ${SERIF}`;
    ctx.fillText(p.stuckNames, W / 2, 848);

    // カード（問いと整える一歩をまとめて）。高さは文章の行数に合わせる
    const cx = 120, cy = 884, cw = W - 240;
    ctx.font = `700 30px ${SERIF}`;
    const qLines = wrap(ctx, p.card.q, cw - 120);
    ctx.font = `500 24px ${SANS}`;
    const sLines = wrap(ctx, p.card.step, cw - 120);
    const ch = 150 + qLines.length * 44 + 6 + 48 + sLines.length * 36 + 20;
    ctx.save();
    ctx.shadowColor = "rgba(23, 33, 57, .14)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    roundRect(ctx, cx, cy, cw, ch, 18);
    ctx.fillStyle = p.card.bg;
    ctx.fill();
    ctx.restore();
    if (p.card.bg.toLowerCase() === "#ffffff") {
      roundRect(ctx, cx, cy, cw, ch, 18);
      ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.fillStyle = C.cardGold;
    ctx.font = ITALIC.replace("{s}", "44");
    ctx.fillText(p.card.title, W / 2, cy + 66);
    ctx.font = `400 20px Georgia, serif`;
    ctx.fillText(p.card.num, W / 2, cy + 98);

    ctx.fillStyle = C.ink;
    ctx.font = `700 30px ${SERIF}`;
    let y = drawLines(ctx, qLines, W / 2, cy + 150, 44);

    // Action の帯
    y += 6;
    ctx.fillStyle = C.cardGold;
    ctx.fillRect(W / 2 - 70, y - 26, 140, 36);
    ctx.fillStyle = "#fff";
    ctx.font = ITALIC.replace("{s}", "22");
    ctx.fillText("Action", W / 2, y);
    ctx.fillStyle = C.body;
    ctx.font = `500 24px ${SANS}`;
    drawLines(ctx, sLines, W / 2, y + 48, 36);

    // フッター
    ctx.fillStyle = C.label;
    ctx.font = `500 22px ${SANS}`;
    ctx.fillText("人生実験  jinseijikken.github.io", W / 2, H - 40);

    return new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png")
    );
  }

  return { create };
})();
