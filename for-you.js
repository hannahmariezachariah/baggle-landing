  // Logged-out visitors only ever get teaser data (bag name, owner's display
  // name, counts, a few photos) from two SECURITY DEFINER functions; no table
  // is opened to the anon role. Everything is inserted with textContent / style
  // props, never innerHTML, since names and image URLs come from other people.
  const baggleSupabase = supabase.createClient(
    "https://wndqubtncxtbninmojpx.supabase.co",
    "sb_publishable_vfYfD-LtUoJEbjkvhEdckg_PbAEr-PJ",
    { auth: { storageKey: "baggle_dashboard_session_v1", persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } }
  );

  (function () {
    const lock = document.getElementById("lockBackdrop");
    const openLock = () => { lock.hidden = false; };
    const closeLock = () => { lock.hidden = true; };
    document.getElementById("lockClose").addEventListener("click", closeLock);
    lock.addEventListener("click", (e) => { if (e.target === lock) closeLock(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeLock(); });
    document.getElementById("searchBtn").addEventListener("click", openLock);

    function el(tag, cls, text) {
      const n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text != null) n.textContent = text;
      return n;
    }
    function safeUrl(u) { return /^https?:\/\//i.test(u || "") ? u : null; }
    function bg(node, url) {
      const ok = safeUrl(url);
      if (ok) node.style.backgroundImage = "url(" + JSON.stringify(ok) + ")";
    }

    function bagTile(b) {
      const tile = el("button", "bag-tile");
      tile.type = "button";
      const photos = (b.photos || []).filter(safeUrl).slice(0, 4);
      const collage = el("div", "bag-collage" + (photos.length <= 1 ? " one" : photos.length === 2 ? " two" : ""));
      if (photos.length === 0) collage.appendChild(el("div", "ph"));
      photos.forEach((p) => { const ph = el("div", "ph"); bg(ph, p); collage.appendChild(ph); });
      const meta = el("div", "bag-meta");
      meta.appendChild(el("p", "bag-name", b.bag_name));
      meta.appendChild(el("p", "bag-owner", "by " + b.owner_name));
      const stats = el("div", "bag-stats");
      const likes = el("span", null);
      likes.appendChild(el("span", "heart", "♥"));
      likes.appendChild(document.createTextNode(" " + b.like_count + " this week"));
      stats.appendChild(likes);
      stats.appendChild(el("span", null, b.item_count + (Number(b.item_count) === 1 ? " item" : " items")));
      meta.appendChild(stats);
      tile.appendChild(collage);
      tile.appendChild(meta);
      tile.addEventListener("click", openLock);
      return tile;
    }

    function initials(name) {
      const parts = String(name || "").trim().split(" ").filter(Boolean);
      if (parts.length === 0) return "?";
      return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
    }

    function acctTile(a) {
      const tile = el("button", "acct-tile");
      tile.type = "button";
      // Public accounts only (the function never returns private ones). The
      // picture must be one of Baggle's own stored profile pictures; otherwise
      // the circle shows initials.
      const avatarOk = typeof a.avatar_url === "string" &&
        a.avatar_url.indexOf("https://wndqubtncxtbninmojpx.supabase.co/storage/v1/object/public/avatars/") === 0;
      const photo = el("div", "acct-photo" + (avatarOk ? " has-img" : ""), avatarOk ? "" : initials(a.owner_name));
      if (avatarOk) bg(photo, a.avatar_url);
      const info = el("div", null);
      info.appendChild(el("p", "acct-name", a.owner_name));
      const bags = Number(a.bag_count), fol = Number(a.follower_count);
      // a.is_public is undefined until the database function is updated: treat that as public
      info.appendChild(el("div", "acct-stats", a.is_public === false
        ? "Private account"
        : bags + (bags === 1 ? " bag" : " bags") + " · " + fol + (fol === 1 ? " follower" : " followers")));
      tile.appendChild(photo);
      tile.appendChild(info);
      tile.addEventListener("click", openLock);
      return tile;
    }

    // < > buttons: scroll one "page" of tiles; hide a button when there is nothing more that way.
    function wireCarousel(root) {
      const track = root.querySelector(".track");
      const prev = root.querySelector(".arrow.prev"), next = root.querySelector(".arrow.next");
      function update() {
        const max = track.scrollWidth - track.clientWidth;
        prev.hidden = track.scrollLeft <= 2;
        next.hidden = track.scrollLeft >= max - 2;
      }
      prev.addEventListener("click", () => track.scrollBy({ left: -track.clientWidth * 0.9, behavior: "smooth" }));
      next.addEventListener("click", () => track.scrollBy({ left: track.clientWidth * 0.9, behavior: "smooth" }));
      track.addEventListener("scroll", update, { passive: true });
      window.addEventListener("resize", update);
      update();
      return update;
    }

    (async function load() {
      const loading = document.getElementById("loadingMsg");
      try {
        const [hot, acc] = await Promise.all([
          baggleSupabase.rpc("get_hot_bags", { max_rows: 12 }),
          baggleSupabase.rpc("get_suggested_accounts", { max_rows: 12 })
        ]);
        loading.hidden = true;
        if (hot.error || acc.error) {
          console.warn("Discovery unavailable", hot.error || acc.error);
          document.getElementById("emptyMsg").hidden = false;
          return;
        }
        const bags = hot.data || [], accts = acc.data || [];
        const hotEl = document.getElementById("hotBags"), acctEl = document.getElementById("suggestedAccounts");
        bags.forEach((b) => hotEl.appendChild(bagTile(b)));
        accts.forEach((a) => acctEl.appendChild(acctTile(a)));
        document.getElementById("hotBlock").hidden = bags.length === 0;
        document.getElementById("acctBlock").hidden = accts.length === 0;
        if (bags.length + accts.length === 0) {
          document.getElementById("emptyMsg").hidden = false;
        } else {
          document.getElementById("content").hidden = false;
          wireCarousel(document.getElementById("hotCarousel"));
          wireCarousel(document.getElementById("acctCarousel"));
        }
      } catch (err) {
        console.warn("Discovery unavailable", err);
        loading.hidden = true;
        document.getElementById("emptyMsg").hidden = false;
      }
    })();
  })();
