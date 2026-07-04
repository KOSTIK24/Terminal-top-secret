import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://iuwdigqwlntoktvtwobo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1d2RpZ3F3bG50b2t0dnR3b2JvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNzQ1NDYsImV4cCI6MjA5ODc1MDU0Nn0.bCJ4VRHNK3WBYS630UYzR7d8itRQkj9BxQoiw8o6mag";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const loginScreen = document.getElementById("loginScreen");
const appScreen = document.getElementById("appScreen");
const authStatus = document.getElementById("authStatus");
const notes = document.getElementById("notes");

async function checkUser() {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
        console.error(error);
        return;
    }

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

    authStatus.textContent = "";

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    const { data, error } = await supabase.auth.signUp({
        email,
        password
    });

    if (error) {
        console.error(error);
        authStatus.textContent = "> ERROR: " + error.message;
        return;
    }

    console.log(data);

    authStatus.textContent =
        "> Account created! Check your email if confirmation is enabled.";

    checkUser();
};

document.getElementById("loginBtn").onclick = async () => {

    authStatus.textContent = "";

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        console.error(error);
        authStatus.textContent = "> ERROR: " + error.message;
        return;
    }

    authStatus.textContent = "> Login successful.";

    checkUser();
};

document.getElementById("logoutBtn").onclick = async () => {

    await supabase.auth.signOut();

    checkUser();
};

document.getElementById("saveBtn").onclick = async () => {

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
        alert("Not logged in.");
        return;
    }

    const title = document.getElementById("title").value.trim();
    const content = document.getElementById("content").value.trim();

    if (!title || !content) {
        alert("Fill in both title and content.");
        return;
    }

    const { error } = await supabase
        .from("tricks")
        .insert({
            user_id: userData.user.id,
            title,
            content
        });

    if (error) {
        console.error(error);
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
        .order("created_at", {
            ascending: false
        });

    if (error) {
        console.error(error);
        notes.innerHTML = "> ERROR: " + error.message;
        return;
    }

    notes.innerHTML = "";

    data.forEach(note => {

        const div = document.createElement("div");
        div.className = "note";

        div.innerHTML = `
            <h3>> ${escapeHTML(note.title)}</h3>
            <pre>${escapeHTML(note.content)}</pre>
            <button class="delete">delete</button>
        `;

        div.querySelector("button").onclick = async () => {

            const { error } = await supabase
                .from("tricks")
                .delete()
                .eq("id", note.id);

            if (error) {
                console.error(error);
                alert(error.message);
                return;
            }

            loadNotes();
        };

        notes.appendChild(div);

    });

}

function escapeHTML(text) {

    return text.replace(/[&<>"']/g, function (m) {

        return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[m];

    });

}

checkUser();

supabase.auth.onAuthStateChange(() => {
    checkUser();
});
