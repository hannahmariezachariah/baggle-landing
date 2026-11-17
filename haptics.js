// Baggle coming-soon page: a satisfying "press" on the Sign up button (16 Nov 2026).
//
// Pressing: the button squashes down, then springs back with a bounce, a soft
// ripple spreads from where you touched, and a little burst of pink and white
// sparkles pops out. Android phones also give a tiny buzz (iPhone browsers don't
// allow websites to vibrate).
// Afterwards: if the email is wrong the box gives a little shake; once you're
// on the list the button turns into "You're in ✓" with a bigger burst.
// Everything visual is skipped for people who've asked for reduced motion.
(function () {
  "use strict";
  var btn = document.getElementById("waitBtn");
  var form = document.getElementById("waitForm");
  var status = document.getElementById("waitStatus");
  if (!btn || !form) return;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var COLOURS = ["#FF4F8B", "#FF86AE", "#FFFFFF", "#FFD1E1", "#FFB3CB"];

  function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }

  function ripple(x, y) {
    var r = btn.getBoundingClientRect();
    var d = Math.max(r.width, r.height) * 2.2;
    var el = document.createElement("span");
    el.className = "hx-ripple";
    el.style.width = el.style.height = d + "px";
    el.style.left = (x - r.left - d / 2) + "px";
    el.style.top = (y - r.top - d / 2) + "px";
    btn.appendChild(el);
    setTimeout(function () { el.remove(); }, 700);
  }

  function burst(x, y, count, spread) {
    for (var i = 0; i < count; i++) {
      var p = document.createElement("span");
      p.className = "hx-spark" + (i % 3 === 0 ? " star" : "");
      var a = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      var dist = spread * (0.55 + Math.random() * 0.6);
      p.style.left = x + "px";
      p.style.top = y + "px";
      p.style.background = COLOURS[i % COLOURS.length];
      p.style.setProperty("--dx", Math.cos(a) * dist + "px");
      p.style.setProperty("--dy", Math.sin(a) * dist - spread * 0.25 + "px");
      p.style.setProperty("--rot", (Math.random() * 540 - 270) + "deg");
      p.style.animationDuration = (520 + Math.random() * 260) + "ms";
      document.body.appendChild(p);
      (function (n) { setTimeout(function () { n.remove(); }, 900); })(p);
    }
  }

  function centre(el) {
    var r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  btn.addEventListener("pointerdown", function (e) {
    buzz(8);
    if (reduce) return;
    btn.classList.remove("hx-release");
    btn.classList.add("hx-press");
    ripple(e.clientX, e.clientY);
  });

  function release() {
    if (!btn.classList.contains("hx-press")) return;
    btn.classList.remove("hx-press");
    void btn.offsetWidth;            // restart the spring animation
    btn.classList.add("hx-release");
  }
  btn.addEventListener("pointerup", release);
  btn.addEventListener("pointerleave", release);
  btn.addEventListener("pointercancel", release);

  btn.addEventListener("click", function (e) {
    if (reduce) return;
    var c = e.clientX || e.clientY ? { x: e.clientX, y: e.clientY } : centre(btn);
    burst(c.x, c.y, 14, 70);
  });

  // React to the result that coming-soon.js writes into the status line.
  if (status && window.MutationObserver) {
    new MutationObserver(function () {
      if (status.classList.contains("error")) {
        buzz([10, 40, 10]);
        if (reduce) return;
        form.classList.remove("hx-shake"); void form.offsetWidth; form.classList.add("hx-shake");
      } else if (status.classList.contains("ok")) {
        buzz([12, 60, 24]);
        var label = btn.textContent;
        btn.classList.add("hx-done");
        btn.textContent = "You're in ✓";
        if (!reduce) { var c = centre(btn); burst(c.x, c.y, 26, 120); }
        setTimeout(function () { btn.classList.remove("hx-done"); btn.textContent = label; }, 3200);
      }
    }).observe(status, { attributes: true, attributeFilter: ["class"], childList: true });
  }
})();
