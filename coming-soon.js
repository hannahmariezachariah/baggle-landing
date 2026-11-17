// Coming-soon page: adds an email to the waitlist table.
// Same Supabase project and public key as home.js. Row Level Security lets
// anyone add an email but nobody read the list from the website.
(function () {
  const db = supabase.createClient(
    "https://wndqubtncxtbninmojpx.supabase.co",
    "sb_publishable_vfYfD-LtUoJEbjkvhEdckg_PbAEr-PJ",
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
  );
  const $ = (id) => document.getElementById(id);
  const form = $("waitForm"), input = $("waitEmail"), btn = $("waitBtn"), status = $("waitStatus");
  function say(msg, kind) {
    status.textContent = msg || "";
    status.className = "status" + (kind ? " " + kind : "");
  }
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = input.value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 254) {
      say("Please enter a valid email address.", "error");
      input.focus();
      return;
    }
    btn.disabled = true;
    say("");
    const { error } = await db.from("waitlist").insert({ email, source: "website" });
    btn.disabled = false;
    // 23505 = already on the list, which counts as success.
    if (error && error.code !== "23505") {
      say("Sorry, that didn't work. Please try again.", "error");
      return;
    }
    input.value = "";
    say("You're on the list. We'll email you when we launch.", "ok");
    if (navigator.vibrate) { try { navigator.vibrate(12); } catch (_) {} }
  });
})();
