/* KITTI demo: severe-failure counts, and cumulative diversity in feature space. */
(function () {
  const METHODS = [
    { id: "ours", name: "Ours", color: "#e4572e" },
    { id: "proxy", name: "Proxy only", color: "#4c9be8" },
    { id: "real", name: "Real only", color: "#6fbf73" },
    { id: "mi", name: "MI only", color: "#e3b341" },
    { id: "random", name: "Random", color: "#b7aea4" },
  ];

  const curves = document.getElementById("curves");
  const diversity = document.getElementById("diversity");
  const fill = document.getElementById("budget-fill");
  const budgetText = document.getElementById("budget-text");
  const readout = document.getElementById("readout");
  const inspect = document.getElementById("inspect");
  const proxyImg = document.getElementById("proxy-img");
  const realImg = document.getElementById("real-img");
  const proxyScore = document.getElementById("proxy-score");
  const realScore = document.getElementById("real-score");

  let demo = null;
  let seedSlot = 0;
  let stepIndex = 0;
  let timer = null;

  function current() { return demo.seeds[seedSlot]; }
  function clip() { return current().clips[stepIndex]; }
  function shown() { return clip().at; }

  function severeCount(order, n) {
    let count = 0;
    for (let i = 0; i < n; i++) count += demo.points[order[i]][2];
    return count;
  }

  function series(order, n) {
    const out = [];
    let count = 0;
    for (let i = 0; i < n; i++) {
      count += demo.points[order[i]][2];
      out.push(count);
    }
    return out;
  }

  function resizeCanvas(canvas, ratio) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(320, Math.floor(rect.width * dpr));
    canvas.width = width;
    canvas.height = Math.floor(width * ratio);
  }

  function resize() {
    resizeCanvas(curves, 11 / 16);
    resizeCanvas(diversity, 11 / 16);
  }

  function drawCurves() {
    const ctx = curves.getContext("2d");
    const w = curves.width;
    const h = curves.height;
    ctx.clearRect(0, 0, w, h);
    const n = shown();
    const total = demo.budget;
    const left = Math.round(w * 0.12);
    const right = Math.round(w * 0.04);
    const top = Math.round(h * 0.14);
    const bottom = Math.round(h * 0.16);
    const plotW = w - left - right;
    const plotH = h - top - bottom;
    let yMax = 4;
    for (const method of METHODS) {
      yMax = Math.max(yMax, severeCount(current().orders[method.id], total));
    }
    yMax = Math.ceil(yMax * 1.08);

    function xAt(i) { return left + (total <= 1 ? 0 : i / (total - 1)) * plotW; }
    function yAt(v) { return top + (1 - v / yMax) * plotH; }

    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.strokeRect(left, top, plotW, plotH);
    ctx.fillStyle = "#f6f1ea";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${Math.round(h * 0.045)}px "Source Sans 3", sans-serif`;
    ctx.fillText("Severe failures on real KITTI", left + plotW / 2, top * 0.42);
    ctx.fillStyle = "#c8bfb4";
    ctx.font = `${Math.round(h * 0.036)}px "Source Sans 3", sans-serif`;
    ctx.fillText("real labels", left + plotW / 2, h - bottom * 0.38);
    ctx.save();
    ctx.translate(left * 0.32, top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`count with score ≥ ${demo.threshold}`, 0, 0);
    ctx.restore();

    const initX = xAt(demo.nInit - 1);
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.beginPath();
    ctx.moveTo(initX, top);
    ctx.lineTo(initX, top + plotH);
    ctx.stroke();
    ctx.setLineDash([]);

    for (const method of METHODS) {
      const values = series(current().orders[method.id], n);
      ctx.beginPath();
      ctx.strokeStyle = method.color;
      ctx.lineWidth = Math.max(2.4, w / 360);
      values.forEach((v, i) => {
        const x = xAt(i);
        const y = yAt(v);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.beginPath();
      ctx.fillStyle = method.color;
      ctx.arc(xAt(n - 1), yAt(values[values.length - 1]), Math.max(3.5, w / 200), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawDiversity() {
    const ctx = diversity.getContext("2d");
    const w = diversity.width;
    const h = diversity.height;
    ctx.clearRect(0, 0, w, h);
    const n = shown();
    const total = demo.budget;
    const left = Math.round(w * 0.14);
    const right = Math.round(w * 0.04);
    const top = Math.round(h * 0.16);
    const bottom = Math.round(h * 0.16);
    const plotW = w - left - right;
    const plotH = h - top - bottom;
    let yMax = 1;
    for (const method of METHODS) {
      const values = current().diversity[method.id];
      yMax = Math.max(yMax, ...values);
    }
    yMax *= 1.08;

    function xAt(i) { return left + (total <= 1 ? 0 : i / (total - 1)) * plotW; }
    function yAt(v) { return top + (1 - v / yMax) * plotH; }

    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.strokeRect(left, top, plotW, plotH);
    ctx.fillStyle = "#f6f1ea";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${Math.round(h * 0.05)}px "Source Sans 3", sans-serif`;
    ctx.fillText("Coverage", left + plotW / 2, top * 0.4);
    ctx.fillStyle = "#c8bfb4";
    ctx.font = `${Math.round(h * 0.04)}px "Source Sans 3", sans-serif`;
    ctx.fillText("real labels", left + plotW / 2, h - bottom * 0.35);
    ctx.save();
    ctx.translate(left * 0.28, top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("mean pairwise distance", 0, 0);
    ctx.restore();

    const initX = xAt(demo.nInit - 1);
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.beginPath();
    ctx.moveTo(initX, top);
    ctx.lineTo(initX, top + plotH);
    ctx.stroke();
    ctx.setLineDash([]);

    for (const method of METHODS) {
      const values = current().diversity[method.id].slice(0, n);
      ctx.beginPath();
      ctx.strokeStyle = method.color;
      ctx.lineWidth = Math.max(2.4, w / 360);
      values.forEach((v, i) => {
        const x = xAt(i);
        const y = yAt(v);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.beginPath();
      ctx.fillStyle = method.color;
      ctx.arc(xAt(n - 1), yAt(values[values.length - 1]), Math.max(3.5, w / 200), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function render() {
    drawCurves();
    drawDiversity();
    const frame = clip();
    const n = frame.at;
    const run = current();
    realImg.src = frame.real;
    proxyImg.src = frame.proxyImg;
    realScore.textContent = frame.severe
      ? `severe failure ${frame.target.toFixed(2)} · sequence ${frame.seq}, frame ${frame.frame}`
      : `score ${frame.target.toFixed(2)} · sequence ${frame.seq}, frame ${frame.frame}`;
    proxyScore.textContent = "Same frame in the Virtual KITTI clone. The curve uses the real score only.";
    fill.style.width = `${(100 * n) / demo.budget}%`;
    budgetText.textContent = `real labels  ${n} / ${demo.budget}`;
    document.getElementById("n-used").textContent = String(n);
    const oursNow = severeCount(run.orders.ours, n);
    const proxyNow = severeCount(run.orders.proxy, n);
    const realNow = severeCount(run.orders.real, n);
    document.getElementById("n-severe").textContent = String(oursNow);
    document.getElementById("n-proxy").textContent = String(proxyNow);
    document.getElementById("n-real").textContent = String(realNow);
    inspect.textContent = `Ours has found ${oursNow} severe real failures. Proxy only has ${proxyNow}. Real only has ${realNow}. Coverage is the mean distance between the labeled frames in feature space.`;
  }

  function step() {
    if (stepIndex >= current().clips.length - 1) {
      pause();
      readout.textContent = "All 85 real labels are on the plots. New seed switches to another run.";
      return;
    }
    stepIndex += 1;
    const frame = clip();
    const previous = current().clips[stepIndex - 1].at;
    readout.textContent = frame.severe
      ? `Labels ${previous + 1}–${frame.at}: ours labeled a severe frame, score ${frame.target.toFixed(2)}.`
      : `Labels ${previous + 1}–${frame.at}: this clip is score ${frame.target.toFixed(2)}.`;
    render();
  }

  function play() { if (!timer) timer = setInterval(step, 900); }
  function pause() { clearInterval(timer); timer = null; }

  function reset(slot) {
    pause();
    seedSlot = slot % demo.seeds.length;
    stepIndex = 0;
    readout.textContent = `Seed ${current().seed}. All methods share the first ${demo.nInit} real labels, then each spends the rest of the ${demo.budget}.`;
    render();
  }

  document.getElementById("play").onclick = play;
  document.getElementById("pause").onclick = pause;
  document.getElementById("step").onclick = () => { pause(); step(); };
  document.getElementById("reset").onclick = () => reset(seedSlot + 1);
  window.addEventListener("resize", () => { resize(); if (demo) render(); });

  fetch("assets/kitti_demo.json?v=6")
    .then((response) => response.json())
    .then((data) => {
      demo = data;
      resize();
      reset(0);
      play();
    })
    .catch(() => {
      readout.textContent = "Could not load the KITTI acquisition.";
    });

  const video = document.getElementById("paper-video");
  const missing = document.getElementById("video-missing");
  if (video && missing) video.addEventListener("error", () => { missing.hidden = false; });
})();
