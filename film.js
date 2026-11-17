// Baggle coming-soon page: the shop film plays as you scroll (16 Nov 2026).
//
// The video is stored as its 243 still frames and drawn on a canvas, which
// scrolls far more smoothly than seeking a video:
//   film/x/  2560x1440 (the full 2K film) for large and high-resolution screens
//   film/l/  1920x1080 for smaller screens; phones load every other frame
// The picture glides towards wherever you have scrolled to instead of jumping,
// so the movement stays smooth even with a mouse wheel.
// When the film reaches its last frame, the sign-up box and the phone fade in
// either side of the bag.
//
// Without JavaScript, or for people who have asked their device for reduced
// motion, none of this runs: the page shows the last frame as a still with the
// sign-up box already in place.
(function () {
  "use strict";
  var FRAMES = 243;
  var FILM_END = 0.82;     // the film finishes at 82% of the scroll...
  var REVEAL_LEN = 0.1;    // ...then the sign-up fades in over the next 10%
  var EASE = 0.14;         // how quickly the picture catches up with the scroll (0-1)

  var root = document.documentElement;
  var section = document.getElementById("scrolly");
  var stage = document.getElementById("stage");
  var canvas = document.getElementById("film");
  var final = document.getElementById("final");
  var cue = document.getElementById("cue");
  if (!section || !stage || !canvas || !final) return;

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var ctx = canvas.getContext && canvas.getContext("2d", { alpha: false });
  if (reduce || !ctx) return;

  root.classList.add("scrub");
  document.body.classList.remove("no-film");
  final.classList.remove("on");

  // Pick the frame size: the 2K frames when the screen really needs them.
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var phone = window.matchMedia("(pointer: coarse)").matches && Math.min(window.innerWidth, window.innerHeight) < 820;
  var needW = Math.max(window.innerWidth * dpr, window.innerHeight * dpr * 16 / 9);
  var dir = !phone && needW > 2000 ? "film/x/" : "film/l/";
  var STEP = phone ? 2 : 1;                 // phones: every other frame (half the download)

  var imgs = new Array(FRAMES);
  var target = 0;      // frame the scroll position asks for (can be fractional)
  var shown = 0;       // frame position currently on screen (eases towards target)
  var drawn = -1;      // index actually painted
  var running = false;

  function usable(i) { return i % STEP === 0 || i === FRAMES - 1; }
  function src(i) { return dir + String(i + 1).padStart(3, "0") + ".webp"; }
  function ready(im) { return im && im.complete && im.naturalWidth > 0; }

  function load(i) {
    if (imgs[i] || !usable(i)) return;
    var im = new Image();
    im.decoding = "async";
    im.onload = function () {
      // Decode ahead of time where the browser allows it, so drawing never stalls.
      if (im.decode) im.decode().catch(function () {});
      if (Math.abs(i - shown) < 8) { drawn = -1; kick(); }
    };
    im.src = src(i);
    imgs[i] = im;
  }

  // First and last frames first, then a rough pass, then the rest, so
  // scrolling works straight away and gets smoother as frames arrive.
  function preload() {
    load(0); load(FRAMES - 1);
    var order = [], seen = {};
    [16, 8, 4, 2, 1].forEach(function (s) {
      for (var i = 0; i < FRAMES; i += s) if (!seen[i] && usable(i)) { seen[i] = 1; order.push(i); }
    });
    var k = 0;
    (function next() {
      for (var n = 0; n < 8 && k < order.length; n++) load(order[k++]);
      if (k < order.length) setTimeout(next, 40);
    })();
  }

  function nearestReady(i) {
    for (var d = 0; d < FRAMES; d++) {
      if (ready(imgs[i - d])) return i - d;
      if (ready(imgs[i + d])) return i + d;
    }
    return -1;
  }

  function size() {
    // The canvas's own box (on upright phones it only fills the top of the screen).
    var w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
      ctx.imageSmoothingQuality = "high";
      drawn = -1;
    }
  }

  function paint(i) {
    var im = imgs[i];
    var cw = canvas.width, ch = canvas.height;
    var s = Math.max(cw / im.naturalWidth, ch / im.naturalHeight);
    var w = im.naturalWidth * s, h = im.naturalHeight * s;
    ctx.drawImage(im, (cw - w) / 2, (ch - h) / 2, w, h);
    drawn = i;
  }

  function progress() {
    var top = section.getBoundingClientRect().top;
    var stick = parseFloat(getComputedStyle(stage).top) || 0;
    var range = section.offsetHeight - stage.offsetHeight;
    return range > 0 ? Math.min(1, Math.max(0, (stick - top) / range)) : 1;
  }

  function readScroll() {
    var p = progress();
    target = Math.min(1, p / FILM_END) * (FRAMES - 1);
    var reveal = Math.min(1, Math.max(0, (p - FILM_END) / REVEAL_LEN));
    stage.style.setProperty("--reveal", reveal.toFixed(3));
    if (cue) cue.style.opacity = String(Math.max(0, 1 - p * 12));
    var on = reveal > 0.6;
    if (on !== final.classList.contains("on")) final.classList.toggle("on", on);
  }

  // One animation loop that runs only while the picture is still catching up.
  function tick() {
    var diff = target - shown;
    shown = Math.abs(diff) < 0.05 ? target : shown + diff * EASE;
    var i = nearestReady(Math.round(shown));
    if (i >= 0 && i !== drawn) paint(i);
    if (shown !== target || i < 0) { requestAnimationFrame(tick); }
    else { running = false; }
  }
  function kick() { if (!running) { running = true; requestAnimationFrame(tick); } }

  function onScroll() { readScroll(); kick(); }

  // Keyboard users who tab to the email box are taken to the end of the film.
  final.addEventListener("focusin", function () {
    if (final.classList.contains("on")) return;
    var end = section.offsetTop + (section.offsetHeight - stage.offsetHeight) * (FILM_END + REVEAL_LEN);
    window.scrollTo({ top: end, behavior: "smooth" });
  });

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", function () { size(); drawn = -1; onScroll(); });
  size();
  preload();
  readScroll();
  shown = target;      // start where the page is (e.g. after a reload half way down)
  kick();
})();
