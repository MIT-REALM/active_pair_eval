(function () {
  const canvas = document.getElementById("toy");
  const readout = document.getElementById("toy-readout");
  const ctx = canvas.getContext("2d");
  let demo = null;
  let step = 0;
  let phase = 0;
  let timer = null;

  const captions = [
    "Solid is the real system. Dashed is the proxy. Dots are labels already collected.",
    "The lower curve is mutual information. Ticks are the shortlist, the places those labels do not cover.",
    "The next real label is the shortlist point where the two curves separate.",
  ];

  function round(v, n) {
    const p = 10 ** n;
    return Math.round(v * p) / p;
  }

  function draw() {
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth || 900;
    const cssH = Math.round(cssW * 0.56);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = cssW;
    const h = cssH;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#16130f";
    ctx.fillRect(0, 0, w, h);
    if (!demo) {
      ctx.fillStyle = "#d9cfc3";
      ctx.font = "16px sans-serif";
      ctx.fillText("Loading the 1D example…", 24, 40);
      return;
    }

    const s = demo.steps[step];
    const padL = 46;
    const padR = 16;
    const top = 16;
    const mid = Math.round(h * 0.66);
    const bot = h - 28;
    const x0 = demo.x[0];
    const x1 = demo.x[demo.x.length - 1];
    const X = (x) => padL + ((x - x0) / (x1 - x0)) * (w - padL - padR);
    const ymin = Math.min(...demo.real, ...demo.sim) - 0.15;
    const ymax = Math.max(...demo.real, ...demo.sim) + 0.15;
    const Y = (v) => top + ((ymax - v) / (ymax - ymin)) * (mid - top - 18);
    const miMax = Math.max(...s.mi, 1e-6);
    const MY = (v) => mid + 22 + ((miMax - v) / miMax) * (bot - mid - 30);

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

    stroke(demo.sim, "#4c9be8", 2.4, [7, 5]);
    stroke(demo.real, "#e4572e", 2.8, []);

    s.clusters.forEach((c) => {
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      ctx.fillRect(X(c.left), top, Math.max(2, X(c.right) - X(c.left)), mid - top - 18);
    });

    s.x.forEach((x, i) => {
      ctx.fillStyle = "#e4572e";
      ctx.beginPath();
      ctx.arc(X(x), Y(s.yReal[i]), 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#4c9be8";
      ctx.lineWidth = 1.6;
      const px = X(x);
      const py = Y(s.ySim[i]);
      ctx.beginPath();
      ctx.moveTo(px - 4, py - 4);
      ctx.lineTo(px + 4, py + 4);
      ctx.moveTo(px + 4, py - 4);
      ctx.lineTo(px - 4, py + 4);
      ctx.stroke();
    });

    if (phase >= 1) {
      ctx.beginPath();
      s.mi.forEach((v, i) => {
        const px = X(demo.x[i]);
        const py = MY(v);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.strokeStyle = "#e3b341";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#e3b341";
      s.shortlist.forEach((x) => {
        const i = demo.x.findIndex((v) => Math.abs(v - x) < 0.003);
        if (i < 0) return;
        ctx.fillRect(X(x) - 1, MY(s.mi[i]) - 3, 2, 6);
      });
    }

    if (phase >= 2) {
      const i = demo.x.findIndex((v) => Math.abs(v - s.chosen) < 0.004);
      const px = X(s.chosen);
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(px, top);
      ctx.lineTo(px, mid - 18);
      ctx.stroke();
      ctx.setLineDash([]);
      if (i >= 0) {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(px, Y(demo.real[i]), 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#e4572e";
        ctx.stroke();
      }
    }

    const label = Math.max(18, Math.round(h * 0.055));
    ctx.fillStyle = "#f6f1ea";
    ctx.font = `${label}px "Source Sans 3", sans-serif`;
    ctx.fillText("value", 12, top + label);
    ctx.fillText("mutual information", 12, mid + label);
    ctx.fillText("0", X(demo.x[0]), h - 8);
    ctx.fillText("x", (padL + w - padR) / 2, h - 8);
    ctx.fillText("0.44", X(demo.x[demo.x.length - 1]) - 18, h - 8);

    const labelCount = s.x.length + (phase >= 2 ? 1 : 0);
    readout.textContent = `Label ${labelCount}. ${captions[phase]} Next x = ${round(s.chosen, 2)}.`;
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
    timer = setInterval(advance, 1400);
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
  window.addEventListener("resize", draw);

  fetch("assets/toy1d.json?v=2")
    .then((r) => r.json())
    .then((data) => {
      demo = data;
      draw();
    })
    .catch(() => {
      readout.textContent = "The 1D example did not load.";
    });
})();
