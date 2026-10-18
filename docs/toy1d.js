(function () {
  const canvas = document.getElementById("toy");
  const readout = document.getElementById("toy-readout");
  const ctx = canvas.getContext("2d");
  const geoCanvas = document.getElementById("mi-geometry");
  const geoReadout = document.getElementById("mi-geometry-readout");
  const geoCtx = geoCanvas.getContext("2d");
  let demo = null;
  let step = 0;
  let phase = 0;
  let timer = null;
  let preset = 0;

  function round(v, n) {
    const p = 10 ** n;
    return Math.round(v * p) / p;
  }

  function miAt(curve, x) {
    let best = 0;
    let dist = Infinity;
    demo.x.forEach((gx, i) => {
      const d = Math.abs(gx - x);
      if (d < dist) {
        dist = d;
        best = curve[i];
      }
    });
    return best;
  }

  function setup(canvasEl, ctx2d, ratio) {
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvasEl.clientWidth || 900;
    const cssH = Math.round(cssW * ratio);
    canvasEl.width = Math.round(cssW * dpr);
    canvasEl.height = Math.round(cssH * dpr);
    ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx2d.clearRect(0, 0, cssW, cssH);
    ctx2d.fillStyle = "#16130f";
    ctx2d.fillRect(0, 0, cssW, cssH);
    return { w: cssW, h: cssH };
  }

  function draw() {
    const { w, h } = setup(canvas, ctx, 0.62);
    if (!demo) {
      ctx.fillStyle = "#d9cfc3";
      ctx.font = "20px sans-serif";
      ctx.fillText("Loading the 1D example…", 24, 48);
      return;
    }

    const s = demo.steps[step];
    const padL = 54;
    const padR = 22;
    const top = 28;
    const mid = Math.round(h * 0.58);
    const bot = h - 36;
    const x0 = demo.x[0];
    const x1 = demo.x[demo.x.length - 1];
    const X = (x) => padL + ((x - x0) / (x1 - x0)) * (w - padL - padR);
    const ymin = Math.min(...demo.real, ...demo.sim) - 0.15;
    const ymax = Math.max(...demo.real, ...demo.sim) + 0.15;
    const Y = (v) => top + 18 + ((ymax - v) / (ymax - ymin)) * (mid - top - 36);
    const shownMi = phase >= 2 ? s.miAfter : s.mi;
    const miMax = Math.max(...s.mi, ...s.miAfter, 1e-6);
    const MY = (v) => mid + 36 + ((miMax - v) / miMax) * (bot - mid - 48);

    function stroke(values, color, width, dash) {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.setLineDash(dash || []);
      ctx.beginPath();
      values.forEach((v, i) => {
        const px = X(demo.x[i]);
        const py = Y(v);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
      ctx.restore();
    }

    stroke(demo.sim, "#4c9be8", 3, [8, 6]);
    stroke(demo.real, "#e4572e", 3.2, []);

    const mark = Math.max(14, Math.round(w / 70));
    s.x.forEach((x, i) => {
      const px = X(x);
      ctx.beginPath();
      ctx.fillStyle = "#e4572e";
      ctx.arc(px, Y(s.yReal[i]), mark, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#fff6ee";
      ctx.stroke();
      ctx.strokeStyle = "#4c9be8";
      ctx.lineWidth = 3.5;
      const py = Y(s.ySim[i]);
      const arm = mark * 0.85;
      ctx.beginPath();
      ctx.moveTo(px - arm, py - arm);
      ctx.lineTo(px + arm, py + arm);
      ctx.moveTo(px + arm, py - arm);
      ctx.lineTo(px - arm, py + arm);
      ctx.stroke();
    });

    if (phase >= 1) {
      ctx.beginPath();
      shownMi.forEach((v, i) => {
        const px = X(demo.x[i]);
        const py = MY(v);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.strokeStyle = "#e3b341";
      ctx.lineWidth = 3;
      ctx.stroke();
      const px = X(s.chosen);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "rgba(255,255,255,0.75)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, top);
      ctx.lineTo(px, bot - 8);
      ctx.stroke();
      ctx.setLineDash([]);
      const miY = MY(miAt(shownMi, s.chosen));
      ctx.fillStyle = "#fff6ee";
      ctx.beginPath();
      ctx.arc(px, miY, phase >= 2 ? 8 : 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#e3b341";
      ctx.stroke();
    }

    if (phase >= 2) {
      const i = demo.x.findIndex((v) => Math.abs(v - s.chosen) < 0.004);
      if (i >= 0) {
        const px = X(s.chosen);
        ctx.beginPath();
        ctx.arc(px, Y(demo.real[i]), mark + 8, 0, Math.PI * 2);
        ctx.lineWidth = 4;
        ctx.strokeStyle = "#ffe08a";
        ctx.stroke();
      }
    }

    const label = Math.max(22, Math.round(h * 0.055));
    ctx.fillStyle = "#f6f1ea";
    ctx.font = `${label}px "Source Sans 3", sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("objective", 12, 8);
    ctx.fillText("mutual information", 12, mid + 6);
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.font = `${Math.max(22, Math.round(h * 0.05))}px "Source Sans 3", sans-serif`;
    ctx.fillText("0", X(demo.x[0]), h - 4);
    ctx.font = `${Math.max(26, Math.round(h * 0.06))}px "Source Sans 3", sans-serif`;
    ctx.fillText("x", (padL + w - padR) / 2, h - 2);
    ctx.font = `${Math.max(22, Math.round(h * 0.05))}px "Source Sans 3", sans-serif`;
    ctx.fillText("0.44", X(demo.x[demo.x.length - 1]), h - 4);

    const before = miAt(s.mi, s.chosen);
    const after = miAt(s.miAfter, s.chosen);
    if (phase === 0) {
      readout.textContent = "Objective of the real system and the proxy. Large marks are inputs already acquired.";
    } else if (phase === 1) {
      readout.textContent = `Candidate x = ${round(s.chosen, 2)}. Mutual information there is ${round(before, 3)}.`;
    } else {
      readout.textContent = `Acquired x = ${round(s.chosen, 2)}. Mutual information there falls from ${round(before, 3)} to ${round(after, 3)}.`;
    }
  }

  function drawGeometry() {
    const { w, h } = setup(geoCanvas, geoCtx, 0.42);
    if (!demo || !demo.geometry) return;
    const g = demo.geometry;
    const curve = g.presets[preset];
    const padL = 54;
    const padR = 22;
    const top = 36;
    const bot = h - 40;
    const x0 = demo.x[0];
    const x1 = demo.x[demo.x.length - 1];
    const X = (x) => padL + ((x - x0) / (x1 - x0)) * (w - padL - padR);
    const miMax = Math.max(...g.presets.flatMap((p) => p.mi), 1e-6);
    const Y = (v) => top + ((miMax - v) / miMax) * (bot - top);
    geoCtx.beginPath();
    curve.mi.forEach((v, i) => {
      const px = X(demo.x[i]);
      const py = Y(v);
      if (i === 0) geoCtx.moveTo(px, py);
      else geoCtx.lineTo(px, py);
    });
    geoCtx.strokeStyle = "#e3b341";
    geoCtx.lineWidth = 3.5;
    geoCtx.stroke();
    const mark = Math.max(12, Math.round(w / 55));
    g.xData.forEach((x) => {
      geoCtx.beginPath();
      geoCtx.fillStyle = "#e4572e";
      geoCtx.arc(X(x), bot, mark, 0, Math.PI * 2);
      geoCtx.fill();
      geoCtx.lineWidth = 3;
      geoCtx.strokeStyle = "#fff6ee";
      geoCtx.stroke();
    });
    const label = Math.max(22, Math.round(h * 0.07));
    geoCtx.fillStyle = "#f6f1ea";
    geoCtx.font = `${label}px "Source Sans 3", sans-serif`;
    geoCtx.textAlign = "left";
    geoCtx.textBaseline = "top";
    geoCtx.fillText("mutual information", 12, 8);
    geoCtx.textAlign = "center";
    geoCtx.textBaseline = "bottom";
    geoCtx.fillText("x", (padL + w - padR) / 2, h - 4);
    geoReadout.textContent = `${curve.note}. Mutual information stays low near the acquired inputs and rises once x is farther than the novelty radius.`;
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  function advance() {
    phase += 1;
    if (phase > 2) {
      phase = 0;
      step += 1;
      if (step >= demo.steps.length) step = 0;
    }
    draw();
  }

  document.getElementById("toy-play").addEventListener("click", () => {
    stop();
    timer = setInterval(advance, 4800);
  });
  document.getElementById("toy-pause").addEventListener("click", stop);
  document.getElementById("toy-step").addEventListener("click", () => {
    stop();
    advance();
  });
  document.getElementById("toy-reset").addEventListener("click", () => {
    stop();
    step = 0;
    phase = 0;
    draw();
  });
  document.getElementById("mi-presets").addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    preset = Number(button.dataset.preset);
    document.querySelectorAll("#mi-presets button").forEach((el) => el.classList.remove("active"));
    button.classList.add("active");
    drawGeometry();
  });
  window.addEventListener("resize", () => {
    draw();
    drawGeometry();
  });

  fetch("assets/toy1d.json?v=3")
    .then((r) => r.json())
    .then((data) => {
      demo = data;
      draw();
      drawGeometry();
    })
    .catch(() => {
      readout.textContent = "The 1D example did not load.";
    });
})();
