/* =========================================================
   結果を1枚の画像（PNG・1080×1350）にする
   - ブラウザの canvas だけで作る（外部への送信なし）
   ========================================================= */
const ResultImage = (function () {
  "use strict";

  const W = 1080, H = 1350;
  const C = {
    paper: "#f9f8f5", night: "#172139", ink: "#20201f", body: "#555350",
    muted: "#6b6668", label: "#8a8273", line: "#dcd9d2", gold: "#c7aa6b"
  };
  const SERIF = '"Zen Old Mincho", "Yu Mincho", "Hiragino Mincho ProN", serif';
  const SANS = '"Zen Kaku Gothic New", "Yu Gothic", "Hiragino Kaku Gothic ProN", sans-serif';

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
   * @param {object} p { domains, entry, prev, stuckNames, dateText, max }
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

    // 名前（任意）と日付
    ctx.textAlign = "left";
    if (p.name) {
      ctx.fillStyle = C.ink;
      ctx.font = `700 28px ${SERIF}`;
      ctx.fillText(`${p.name}の観測`, 64, 160);
      ctx.fillStyle = C.muted;
      ctx.font = `500 22px ${SANS}`;
      ctx.fillText(p.dateText, 64, 200);
      ctx.font = `500 24px ${SANS}`;
    } else {
      ctx.fillStyle = C.muted;
      ctx.font = `500 24px ${SANS}`;
      ctx.fillText(p.dateText, 64, 160);
    }
    if (p.prev) {
      // 凡例：── 今回　- - 前回
      ctx.fillStyle = C.night; ctx.fillRect(W - 310, 158, 36, 4);
      ctx.fillStyle = C.muted; ctx.fillText("今回", W - 264, 160);
      ctx.setLineDash([8, 6]); ctx.strokeStyle = C.gold; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(W - 170, 160); ctx.lineTo(W - 134, 160); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillText("前回", W - 124, 160);
    }

    // レーダーチャート（カードを入れない分、大きく）
    drawRadar(ctx, p.domains, p.entry.scores, p.prev && p.prev.scores, W / 2, 590, 300, p.max);

    // いま目を向けたいところ（いちばん点数の低い領域。同点が多くて長いときは小さくして折り返す）
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = C.muted;
    ctx.font = `500 26px ${SANS}`;
    ctx.fillText("いま目を向けたいところ", W / 2, 1110);
    ctx.fillStyle = C.ink;
    if (p.hasDent === false) {
      // 3〜8点の領域がないとき：「大きなへこみはありません」＋いちばん低い領域を小さく
      ctx.font = `700 44px ${SERIF}`;
      ctx.fillText("大きなへこみはありません", W / 2, 1180);
      ctx.fillStyle = C.body;
      ctx.font = `500 26px ${SANS}`;
      const subLines = wrap(ctx, `いちばん低いのは ${p.stuckNames}（${p.min}点）`, W - 160);
      drawLines(ctx, subLines.slice(0, 2), W / 2, 1232, 36);
    } else {
      ctx.font = `700 54px ${SERIF}`;
      let lines = wrap(ctx, p.stuckNames, W - 160);
      if (lines.length > 1) {
        ctx.font = `700 38px ${SERIF}`;
        lines = wrap(ctx, p.stuckNames, W - 160);
      }
      drawLines(ctx, lines, W / 2, lines.length > 1 ? 1170 : 1185, 54);
    }

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
