// Task Manager - plain JavaScript + Supabase REST API (PostgREST)

let API_URL = "";
let API_KEY = "";
let editingId = null;

const form = document.getElementById("task-form");
const titleInput = document.getElementById("task-title");
const descInput = document.getElementById("task-description");
const submitBtn = document.getElementById("task-submit");
const listEl = document.getElementById("task-list");
const statusEl = document.getElementById("status-message");

function showMessage(text, isError) {
  statusEl.textContent = text;
  statusEl.className = isError ? "error" : "ok";
}

// Publishable keys must be sent in the apikey header only.
function headers(extra) {
  return Object.assign(
    { apikey: API_KEY, "Content-Type": "application/json" },
    extra || {}
  );
}

async function request(path, options) {
  const res = await fetch(API_URL + path, options);
  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body.message || JSON.stringify(body);
    } catch (e) {
      detail = res.statusText;
    }
    throw new Error("HTTP " + res.status + ": " + detail);
  }
  return res.status === 204 ? null : res.text().then(t => (t ? JSON.parse(t) : null));
}

async function loadConfig() {
  const res = await fetch("config.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Cannot load config.json");
  const cfg = await res.json();
  API_URL = cfg.supabaseUrl.replace(/\/$/, "") + "/rest/v1/" + cfg.tableName;
  API_KEY = cfg.supabasePublishableKey;
}

// GET /tasks?select=*
async function fetchTasks() {
  return request("?select=*&order=id.asc", { headers: headers() });
}

// POST /tasks
async function createTask(title, description) {
  return request("", {
    method: "POST",
    headers: headers({ Prefer: "return=representation" }),
    body: JSON.stringify({ title, description, completed: false })
  });
}

// PATCH /tasks?id=eq.X
async function updateTask(id, fields) {
  return request("?id=eq." + encodeURIComponent(id), {
    method: "PATCH",
    headers: headers({ Prefer: "return=representation" }),
    body: JSON.stringify(fields)
  });
}

// DELETE /tasks?id=eq.X
async function deleteTask(id) {
  return request("?id=eq." + encodeURIComponent(id), {
    method: "DELETE",
    headers: headers()
  });
}

function renderTasks(tasks) {
  listEl.textContent = "";
  if (!tasks || tasks.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No tasks yet.";
    listEl.appendChild(empty);
    return;
  }
  tasks.forEach(task => {
    const item = document.createElement("div");
    item.className = "task-item" + (task.completed ? " completed" : "");
    item.dataset.id = task.id;

    const title = document.createElement("h3");
    title.className = "task-title";
    title.textContent = task.title;

    const desc = document.createElement("p");
    desc.className = "task-description";
    desc.textContent = task.description || "";

    const status = document.createElement("span");
    status.className = "task-status";
    status.textContent = task.completed ? "Completed" : "Not completed";

    const toggle = document.createElement("button");
    toggle.className = "toggle-task";
    toggle.type = "button";
    toggle.textContent = task.completed ? "Mark incomplete" : "Mark complete";

    const edit = document.createElement("button");
    edit.className = "edit-task";
    edit.type = "button";
    edit.textContent = "Edit";

    const del = document.createElement("button");
    del.className = "delete-task";
    del.type = "button";
    del.textContent = "Delete";

    item.append(title, desc, status, toggle, edit, del);
    listEl.appendChild(item);
  });
}

let currentTasks = [];

async function refresh() {
  try {
    currentTasks = await fetchTasks();
    renderTasks(currentTasks);
  } catch (err) {
    showMessage("Could not load tasks: " + err.message, true);
  }
}

function resetForm() {
  editingId = null;
  form.reset();
  submitBtn.textContent = "Add task";
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  const title = titleInput.value.trim();
  const description = descInput.value.trim();
  if (!title) {
    showMessage("Title is required.", true);
    return;
  }
  try {
    if (editingId !== null) {
      await updateTask(editingId, { title, description });
      showMessage("Task updated.", false);
    } else {
      await createTask(title, description);
      showMessage("Task added.", false);
    }
    resetForm();
    await refresh();
  } catch (err) {
    showMessage("Operation failed: " + err.message, true);
  }
});

listEl.addEventListener("click", async event => {
  const btn = event.target.closest("button");
  if (!btn) return;
  const item = btn.closest(".task-item");
  if (!item) return;
  const id = item.dataset.id;
  const task = currentTasks.find(t => String(t.id) === String(id));

  try {
    if (btn.classList.contains("toggle-task")) {
      await updateTask(id, { completed: !task.completed });
      showMessage("Status changed.", false);
      await refresh();
    } else if (btn.classList.contains("delete-task")) {
      await deleteTask(id);
      if (String(editingId) === String(id)) resetForm();
      showMessage("Task deleted.", false);
      await refresh();
    } else if (btn.classList.contains("edit-task")) {
      editingId = id;
      titleInput.value = task.title;
      descInput.value = task.description || "";
      submitBtn.textContent = "Save changes";
      titleInput.focus();
      showMessage("Editing task " + id + ".", false);
    }
  } catch (err) {
    showMessage("Operation failed: " + err.message, true);
  }
});

(async function init() {
  try {
    await loadConfig();
    await refresh();
  } catch (err) {
    showMessage("Startup error: " + err.message, true);
  }
})();
