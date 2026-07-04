import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://iuwdigqwlntoktvtwobo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1d2RpZ3F3bG50b2t0dnR3b2JvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNzQ1NDYsImV4cCI6MjA5ODc1MDU0Nn0.bCJ4VRHNK3WBYS630UYzR7d8itRQkj9BxQoiw8o6mag";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginScreen = document.getElementById("loginScreen");
const appScreen = document.getElementById("appScreen");
const authStatus = document.getElementById("authStatus");
const notes = document.getElementById("notes");

async function checkUser() {
  const { data } = await supabase.auth.getUser();

  if (data.user) {
    loginScreen.hidden = true;
    appScreen.hidden = false;
    loadNotes();
  } else {
    loginScreen.hidden = false;
    appScreen.hidden = true;
  }
}

document.getElementById("registerBtn").onclick = async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { error } = await supabase.auth.signUp({ email, password });

  authStatus.textContent = error
    ? "> ERROR: " + error.message
    : "> ACCOUNT CREATED";
};

document.getElementById("loginBtn").onclick = async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    authStatus.textContent = "> ERROR: " + error.message;
    return;
  }

  checkUser();
};

document.getElementById("logoutBtn").onclick = async () => {
  await supabase.auth.signOut();
  checkUser();
};

document.getElementById("saveBtn").onclick = async () => {
  const { data } = await supabase.auth.getUser();

  const title = document.getElementById("title").value.trim();
  const content = document.getElementById("content").value.trim();

  if (!title || !content) {
    alert("Vyplň název i obsah.");
    return;
  }

  const { error } = await supabase.from("tricks").insert({
    user_id: data.user.id,
    title,
    content
  });

  if (error) {
    alert(error.message);
    return;
  }

  document.getElementById("title").value = "";
  document.getElementById("content").value = "";

  loadNotes();
};

async function loadNotes() {
  const { data, error } = await supabase
    .from("tricks")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    notes.innerHTML = "> ERROR: " + error.message;
    return;
  }

  notes.innerHTML = data.map(note => `
    <div class="note">
      <h3>> ${escapeHtml(note.title)}</h3>
      <pre>${escapeHtml(note.content)}</pre>
      <button class="delete" onclick="deleteNote('${note.id}')">delete</button>
    </div>
  `).join("");
}

window.deleteNote = async id => {
  await supabase.from("tricks").delete().eq("id", id);
  loadNotes();
};

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

checkUser();
