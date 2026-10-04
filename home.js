  // Same Supabase project and the same session storage key as the dashboard
  // (web-dashboard/dashboard.js), so logging in here carries straight over to
  // /dashboard/ -- they're both on baggle.net. This is the public "anon" key,
  // safe in a static page because Row Level Security is what protects data.
  const baggleSupabase = supabase.createClient(
    "https://wndqubtncxtbninmojpx.supabase.co",
    "sb_publishable_vfYfD-LtUoJEbjkvhEdckg_PbAEr-PJ",
    { auth: { storageKey: "baggle_dashboard_session_v1", persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } }
  );

  const $ = (id) => document.getElementById(id);
  const views = { login: $("viewLogin"), signup: $("viewSignup"), session: $("viewSession") };
  function show(name) {
    Object.keys(views).forEach((k) => { views[k].hidden = k !== name; });
    const first = views[name].querySelector("input");
    if (first && name !== "session") first.focus();
  }
  function setStatus(el, msg, isError) {
    el.textContent = msg || "";
    el.classList.toggle("error", !!isError);
  }

  $("showSignup").addEventListener("click", () => show("signup"));
  $("showLogin").addEventListener("click", () => show("login"));
  if (location.hash === "#signup") show("signup"); else show("login");

  // Already logged in? Offer a way back into the dashboard instead of the form.
  baggleSupabase.auth.getSession().then(({ data }) => {
    if (data && data.session) {
      $("sessionEmail").textContent = data.session.user.email || "";
      show("session");
    }
  }).catch(() => {});

  $("logoutBtn").addEventListener("click", async () => {
    try { await baggleSupabase.auth.signOut(); } catch (e) { console.error(e); }
    show("login");
  });

  // ---- log in ----
  $("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = $("loginStatus"), btn = $("loginBtn");
    const email = $("loginEmail").value.trim(), password = $("loginPassword").value;
    setStatus(status, "");
    if (!email || !password) { setStatus(status, "Enter your email and password.", true); return; }
    btn.disabled = true; const label = btn.textContent; btn.textContent = "Logging in…";
    try {
      const { error } = await baggleSupabase.auth.signInWithPassword({ email, password });
      if (error) { setStatus(status, error.message, true); return; }
      window.location.href = "/dashboard/";
    } catch (err) {
      console.error(err);
      setStatus(status, "Something went wrong. Check your connection and try again.", true);
    } finally {
      btn.disabled = false; btn.textContent = label;
    }
  });

  // ---- forgot password (same email + redirect the dashboard uses) ----
  $("forgotBtn").addEventListener("click", async () => {
    const status = $("loginStatus");
    const email = $("loginEmail").value.trim();
    if (!email) { setStatus(status, "Type your email above first, then tap Forgot password.", true); return; }
    try {
      const { error } = await baggleSupabase.auth.resetPasswordForEmail(email, {
        redirectTo: "https://baggle.net/dashboard/reset-password.html"
      });
      if (error) { setStatus(status, error.message, true); return; }
      setStatus(status, "If that email has an account, a reset link is on its way.");
    } catch (err) {
      console.error(err);
      setStatus(status, "Something went wrong. Check your connection and try again.", true);
    }
  });

  // ---- sign up ----
  $("signupForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = $("signupStatus"), btn = $("signupBtn");
    const first = $("signupFirst").value.trim(), last = $("signupLast").value.trim();
    const email = $("signupEmail").value.trim(), password = $("signupPassword").value;
    setStatus(status, "");
    if (!first || !last) { setStatus(status, "Enter your first and last name.", true); return; }
    if (!email) { setStatus(status, "Enter your email address.", true); return; }
    if (password.length < 6) { setStatus(status, "Password must be at least 6 characters.", true); return; }
    btn.disabled = true; const label = btn.textContent; btn.textContent = "Signing up…";
    try {
      const { data, error } = await baggleSupabase.auth.signUp({
        email, password,
        options: {
          data: { first_name: first, last_name: last, full_name: first + " " + last },
          emailRedirectTo: "https://baggle.net/dashboard/"
        }
      });
      if (error) { setStatus(status, error.message, true); return; }
      if (data.session) { window.location.href = "/dashboard/"; return; }
      $("signupForm").reset();
      setStatus(status, "Check your email to confirm your account, then log in.");
    } catch (err) {
      console.error(err);
      setStatus(status, "Something went wrong. Check your connection and try again.", true);
    } finally {
      btn.disabled = false; btn.textContent = label;
    }
  });
