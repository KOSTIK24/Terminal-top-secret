import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://iuwdigqwlntoktvtwobo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1d2RpZ3F3bG50b2t0dnR3b2JvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNzQ1NDYsImV4cCI6MjA5ODc1MDU0Nn0.bCJ4VRHNK3WBYS630UYzR7d8itRQkj9BxQoiw8o6mag";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginScreen = document.getElementById("loginScreen");
const appScreen = document.getElementById("appScreen");
const authStatus = document.getElementById("authStatus");
const notes = document.getElementById("notes");
const eventsBox = document.getElementById("events");
const commandInput = document.getElementById("commandInput");
const commandOutput = document.getElementById("commandOutput");

let currentUser = null;
let currentProfile = null;

function show(text) {
  commandOutput.textContent = text;
}

function html(text) {
  return String(text || "").replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[m]));
}

async function checkUser() {
  const { data } = await supabase.auth.getUser();
  currentUser = data.user;

  if (!currentUser) {
    loginScreen.hidden = false;
    appScreen.hidden = true;
    return;
  }

  loginScreen.hidden = true;
  appScreen.hidden = false;

  await loadProfile();
  await loadNotes();
  await loadEvents();
}

async function loadProfile() {
  let { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .single();

  if (!data) {
    await supabase.from("profiles").insert({
      id: currentUser.id,
      email: currentUser.email,
      role: "member",
      points: 0,
      badges: []
    });

    const result = await supabase
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .single();

    data = result.data;
  }

  currentProfile = data;

  document.getElementById("userEmail").textContent = currentUser.email;
  document.getElementById("userRole").textContent = data.role;
  document.getElementById("userPoints").textContent = `${data.points || 0} pts`;

  const adminPanels = document.querySelectorAll(".admin-only");
  adminPanels.forEach(panel => {
    panel.hidden = data.role !== "admin";
  });
}

document.getElementById("registerBtn").onclick = async () => {
  authStatus.textContent = "";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    authStatus.textContent = "> ERROR: " + error.message;
    console.error(error);
    return;
  }

  authStatus.textContent = "> Account created. Check confirmation email.";
};

document.getElementById("loginBtn").onclick = async () => {
  authStatus.textContent = "";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    authStatus.textContent = "> ERROR: " + error.message;
    console.error(error);
    return;
  }

  await checkUser();
};

document.getElementById("logoutBtn").onclick = async () => {
  await supabase.auth.signOut();
  currentUser = null;
  currentProfile = null;
  loginScreen.hidden = false;
  appScreen.hidden = true;
  authStatus.textContent = "> Logged out.";
};

document.getElementById("saveBtn").onclick = async () => {
  if (!currentUser) return alert("Not logged in.");

  const title = document.getElementById("title").value.trim();
  const content = document.getElementById("content").value.trim();

  if (!title || !content) return alert("Vyplň název i obsah.");

  const { error } = await supabase.from("tricks").insert({
    user_id: currentUser.id,
    title,
    content
  });

  if (error) {
    alert(error.message);
    console.error(error);
    return;
  }

  document.getElementById("title").value = "";
  document.getElementById("content").value = "";

  await loadNotes();
};

async function loadNotes() {
  const search = document.getElementById("searchInput").value.trim();

  let query = supabase
    .from("tricks")
    .select("*")
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    notes.innerHTML = "> ERROR: " + html(error.message);
    return;
  }

  notes.innerHTML = "";

  data.forEach(note => {
    const div = document.createElement("div");
    div.className = "note";
    div.innerHTML = `
      <h3>> ${html(note.title)}</h3>
      <pre>${html(note.content)}</pre>
      <button class="delete">delete</button>
    `;

    div.querySelector("button").onclick = async () => {
      await supabase.from("tricks").delete().eq("id", note.id);
      await loadNotes();
    };

    notes.appendChild(div);
  });
}

document.getElementById("searchInput").oninput = loadNotes;

async function loadEvents() {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    eventsBox.innerHTML = "> ERROR: " + html(error.message);
    return;
  }

  eventsBox.innerHTML = "";

  data.forEach(event => {
    const div = document.createElement("div");
    div.className = "event";
    div.innerHTML = `
      <h3>> ${html(event.title)}</h3>
      <p>${html(event.description)}</p>
      <p>Reward: ${event.reward_points} pts</p>
      <button>complete challenge</button>
    `;

    div.querySelector("button").onclick = async () => {
      const { error } = await supabase.from("event_completions").insert({
        event_id: event.id,
        user_id: currentUser.id
      });

      if (error) {
        alert("Už máš splněno, nebo error: " + error.message);
        return;
      }

      alert("Challenge completed. Admin ti může dát points/badge.");
    };

    eventsBox.appendChild(div);
  });
}

document.getElementById("createEventBtn").onclick = async () => {
  if (currentProfile?.role !== "admin") return alert("Admin only.");

  const title = document.getElementById("eventTitle").value.trim();
  const description = document.getElementById("eventDesc").value.trim();
  const reward_points = Number(document.getElementById("eventReward").value || 0);

  if (!title || !description) return alert("Vyplň event.");

  const { error } = await supabase.from("events").insert({
    title,
    description,
    reward_points,
    created_by: currentUser.id
  });

  if (error) {
    alert(error.message);
    return;
  }

  document.getElementById("eventTitle").value = "";
  document.getElementById("eventDesc").value = "";
  await loadEvents();
};

document.getElementById("awardBtn").onclick = async () => {
  if (currentProfile?.role !== "admin") return alert("Admin only.");

  const email = document.getElementById("awardEmail").value.trim();
  const points = Number(document.getElementById("awardPoints").value || 0);
  const badge = document.getElementById("awardBadge").value.trim();

  const { data: profile, error: findError } = await supabase
    .from("profiles")
    .select("*")
    .eq("email", email)
    .single();

  if (findError || !profile) {
    alert("User not found.");
    return;
  }

  const badges = Array.isArray(profile.badges) ? profile.badges : [];
  if (badge && !badges.includes(badge)) badges.push(badge);

  const { error } = await supabase
    .from("profiles")
    .update({
      points: (profile.points || 0) + points,
      badges
    })
    .eq("id", profile.id);

  if (error) {
    alert(error.message);
    return;
  }

  alert("Award sent.");
};

commandInput.addEventListener("keydown", async e => {
  if (e.key !== "Enter") return;

  const cmd = commandInput.value.trim();
  commandInput.value = "";
  await runCommand(cmd);
});

document.querySelectorAll("[data-cmd]").forEach(btn => {
  btn.onclick = () => runCommand(btn.dataset.cmd);
});

async function runCommand(cmd) {
  if (!cmd) return;

  if (cmd === "/help") {
    show(`Available commands:
/help - show commands
/notes - reload notes
/events - show events
/profile - show profile
/admin - show admin menu
/clear - clear output`);
    return;
  }

  if (cmd === "/notes") {
    await loadNotes();
    show("Notes reloaded.");
    return;
  }

  if (cmd === "/events") {
    await loadEvents();
    show("Events reloaded.");
    return;
  }

  if (cmd === "/profile") {
    const badges = currentProfile?.badges?.length
      ? currentProfile.badges.map(b => `[${b}]`).join(" ")
      : "none";

    show(`Email: ${currentUser.email}
Role: ${currentProfile.role}
Points: ${currentProfile.points}
Badges: ${badges}`);
    return;
  }

  if (cmd === "/admin") {
    if (currentProfile?.role !== "admin") {
      show("Access denied. Admin only.");
      return;
    }

    show(`Admin menu:
- create events
- award points
- award badges
- manage CTF/safe challenges
- delete own notes
- view dashboard in Supabase`);
    return;
  }

  if (cmd === "/clear") {
    show("");
    return;
  }

  show("Unknown command. Try /help");
}

supabase.auth.onAuthStateChange(() => {
  checkUser();
});

checkUser();
