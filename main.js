// main.js


const firebaseConfig = {
  apiKey: "GOOGLE_API_KEY",
  authDomain: "auth_domain",
  databaseURL: "https://time-tracker-app-d3b84-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "time-tracker-app-d3b84",
  storageBucket: "time-tracker-app-d3b84.firebasestorage.app",
  messagingSenderId: "sender_id",
  appId: "app_id",
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

// 2. DOM refs
const viewLanding = document.getElementById("view-landing");
const viewApp = document.getElementById("view-app");

const navAuth = document.getElementById("nav-auth");
const btnGoogleLogin = document.getElementById("btn-google-login");

const inputDate = document.getElementById("input-date");
const textTotalMinutes = document.getElementById("text-total-minutes");
const textRemainingMinutes = document.getElementById("text-remaining-minutes");

const formActivity = document.getElementById("form-activity");
const inputActivityName = document.getElementById("input-activity-name");
const selectCategory = document.getElementById("select-category");
const inputDuration = document.getElementById("input-duration");
const textFormError = document.getElementById("text-form-error");
const btnSaveActivity = document.getElementById("btn-save-activity");
const btnSaveActivityIcon = document.getElementById("btn-save-activity-icon");
const btnSaveActivityText = document.getElementById("btn-save-activity-text");
const btnCancelEdit = document.getElementById("btn-cancel-edit");

const tbodyActivities = document.getElementById("tbody-activities");
const emptyActivities = document.getElementById("empty-activities");
const textActivityCount = document.getElementById("text-activity-count");

const btnAnalyse = document.getElementById("btn-analyse");

const dashboardSummary = document.getElementById("dashboard-summary");
const dashTotalTime = document.getElementById("dash-total-time");
const dashActivityCount = document.getElementById("dash-activity-count");
const dashCategoryCount = document.getElementById("dash-category-count");

const dashboardNoData = document.getElementById("dashboard-no-data");
const dashboardCharts = document.getElementById("dashboard-charts");

const chartPieCanvas = document.getElementById("chart-pie");
const chartBarCanvas = document.getElementById("chart-bar");

let currentUser = null;
let currentDate = null;
let currentActivities = [];
let totalMinutes = 0;

// edit state
let editingActivityId = null;
let editingOriginalDuration = 0;

// charts instances
let pieChart = null;
let barChart = null;

// --------- UTILITIES ----------
function formatDateToKey(date) {
  // YYYY-MM-DD
  return date.toISOString().slice(0, 10);
}

function minutesToHM(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function showError(msg) {
  textFormError.textContent = msg;
  textFormError.classList.remove("hidden");
}

function clearError() {
  textFormError.textContent = "";
  textFormError.classList.add("hidden");
}

function updateTotals() {
  totalMinutes = currentActivities.reduce((sum, a) => sum + a.duration, 0);
  const remaining = 1440 - totalMinutes;

  textTotalMinutes.textContent = `${totalMinutes} minutes`;
  textRemainingMinutes.textContent = `${remaining} minutes`;

  if (remaining < 0) {
    textRemainingMinutes.classList.add("remaining-negative");
  } else {
    textRemainingMinutes.classList.remove("remaining-negative");
  }

  btnAnalyse.disabled = currentActivities.length === 0;
}

function renderActivitiesTable() {
  tbodyActivities.innerHTML = "";

  if (currentActivities.length === 0) {
    emptyActivities.classList.remove("hidden");
  } else {
    emptyActivities.classList.add("hidden");
  }

  currentActivities.forEach((activity) => {
    const tr = document.createElement("tr");
    tr.className = "activity-row";

    const tdName = document.createElement("td");
    tdName.textContent = activity.name;

    const tdCat = document.createElement("td");
    tdCat.textContent = activity.category;

    const tdDur = document.createElement("td");
    tdDur.className = "right";
    tdDur.textContent = activity.duration;

    const tdActions = document.createElement("td");
    tdActions.className = "right";

    const btnEdit = document.createElement("button");
    btnEdit.className = "btn btn-secondary small";
    btnEdit.textContent = "Edit";
    btnEdit.style.marginRight = "0.3rem";
    btnEdit.addEventListener("click", () => startEditActivity(activity));

    const btnDelete = document.createElement("button");
    btnDelete.className = "btn btn-secondary small";
    btnDelete.style.borderColor = "#fb7185";
    btnDelete.style.color = "#fecaca";
    btnDelete.textContent = "Delete";
    btnDelete.addEventListener("click", () => deleteActivity(activity));

    tdActions.appendChild(btnEdit);
    tdActions.appendChild(btnDelete);

    tr.appendChild(tdName);
    tr.appendChild(tdCat);
    tr.appendChild(tdDur);
    tr.appendChild(tdActions);

    tbodyActivities.appendChild(tr);
  });

  textActivityCount.textContent = `${currentActivities.length} ${
    currentActivities.length === 1 ? "activity" : "activities"
  }`;

  updateTotals();
}

// --------- FIRESTORE ----------
function getActivitiesRef(uid, dateKey) {
  return db
    .collection("users")
    .doc(uid)
    .collection("days")
    .doc(dateKey)
    .collection("activities");
}

async function loadActivitiesForDate(dateKey) {
  if (!currentUser) return;

  const ref = getActivitiesRef(currentUser.uid, dateKey);

  const snap = await ref.orderBy("createdAt", "asc").get();
  currentActivities = snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  renderActivitiesTable();
  resetDashboard(); // reset dashboard when date changes
}

async function addActivity(name, category, duration) {
  const dateKey = currentDate;
  const ref = getActivitiesRef(currentUser.uid, dateKey);

  await ref.add({
    name,
    category,
    duration,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });

  await loadActivitiesForDate(dateKey);
}

async function updateActivity(id, name, category, duration) {
  const dateKey = currentDate;
  const ref = getActivitiesRef(currentUser.uid, dateKey).doc(id);

  await ref.update({
    name,
    category,
    duration,
  });

  await loadActivitiesForDate(dateKey);
}

async function deleteActivity(activity) {
  const confirmDelete = confirm(
    `Delete activity "${activity.name}" (${activity.duration} mins)?`
  );
  if (!confirmDelete) return;

  const dateKey = currentDate;
  const ref = getActivitiesRef(currentUser.uid, dateKey).doc(activity.id);
  await ref.delete();

  await loadActivitiesForDate(dateKey);
}

// --------- EDIT MODE ----------
function startEditActivity(activity) {
  editingActivityId = activity.id;
  editingOriginalDuration = activity.duration;

  inputActivityName.value = activity.name;
  selectCategory.value = activity.category || "Other";
  inputDuration.value = activity.duration;

  btnSaveActivityText.textContent = "Save changes";
  btnSaveActivityIcon.textContent = "✎";
  btnCancelEdit.classList.remove("hidden");
}

function resetEditMode() {
  editingActivityId = null;
  editingOriginalDuration = 0;

  formActivity.reset();
  selectCategory.value = "Work";

  btnSaveActivityText.textContent = "Add activity";
  btnSaveActivityIcon.textContent = "＋";
  btnCancelEdit.classList.add("hidden");
  clearError();
}

// --------- DASHBOARD / CHARTS ----------
function resetDashboard() {
  dashboardNoData.classList.remove("hidden");
  dashboardSummary.classList.add("hidden");
  dashboardCharts.classList.add("hidden");
  destroyCharts();
}

function destroyCharts() {
  if (pieChart) {
    pieChart.destroy();
    pieChart = null;
  }
  if (barChart) {
    barChart.destroy();
    barChart = null;
  }
}

function buildDashboard() {
  if (currentActivities.length === 0) {
    resetDashboard();
    return;
  }

  const total = totalMinutes;
  const activityCount = currentActivities.length;

  // category totals
  const categoryTotals = {};
  currentActivities.forEach((a) => {
    const cat = a.category || "Other";
    categoryTotals[cat] = (categoryTotals[cat] || 0) + a.duration;
  });

  const categoryNames = Object.keys(categoryTotals);
  const categoryValues = Object.values(categoryTotals);

  const hoursText = minutesToHM(total);

  dashTotalTime.textContent = hoursText;
  dashActivityCount.textContent = String(activityCount);
  dashCategoryCount.textContent = String(categoryNames.length);

  dashboardSummary.classList.remove("hidden");
  dashboardNoData.classList.add("hidden");
  dashboardCharts.classList.remove("hidden");

  // charts
  destroyCharts();

  // Pie chart: category distribution
  pieChart = new Chart(chartPieCanvas.getContext("2d"), {
    type: "pie",
    data: {
      labels: categoryNames,
      datasets: [
        {
          data: categoryValues,
        },
      ],
    },
    options: {
      plugins: {
        legend: {
          labels: {
            color: "#cbd5f5",
            font: { size: 10 },
          },
        },
      },
    },
  });

  // Bar chart: each activity
  barChart = new Chart(chartBarCanvas.getContext("2d"), {
    type: "bar",
    data: {
      labels: currentActivities.map((a) => a.name),
      datasets: [
        {
          label: "Minutes",
          data: currentActivities.map((a) => a.duration),
        },
      ],
    },
    options: {
      plugins: {
        legend: { labels: { color: "#cbd5f5", font: { size: 10 } } },
      },
      scales: {
        x: {
          ticks: {
            color: "#94a3b8",
            font: { size: 9 },
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: "#94a3b8",
            font: { size: 9 },
          },
        },
      },
    },
  });
}

// --------- AUTH UI ----------
function renderNavAuth(user) {
  navAuth.innerHTML = "";

  if (!user) {
    const span = document.createElement("span");
    span.textContent = "Not signed in";
    navAuth.appendChild(span);
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "nav-user";

  const avatar = document.createElement("div");
  avatar.className = "nav-avatar";
  const initials = (user.displayName || user.email || "?")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  avatar.textContent = initials;

  const info = document.createElement("div");
  info.className = "nav-user-info";

  const name = document.createElement("span");
  name.className = "nav-user-name";
  name.textContent = user.displayName || "User";

  const email = document.createElement("span");
  email.className = "nav-user-email";
  email.textContent = user.email;

  info.appendChild(name);
  info.appendChild(email);

  const btnLogout = document.createElement("button");
  btnLogout.className = "btn btn-secondary small";
  btnLogout.textContent = "Logout";
  btnLogout.addEventListener("click", () => auth.signOut());

  wrapper.appendChild(avatar);
  wrapper.appendChild(info);
  wrapper.appendChild(btnLogout);

  navAuth.appendChild(wrapper);
}

// --------- AUTH HANDLERS ----------
btnGoogleLogin?.addEventListener("click", async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    await auth.signInWithPopup(provider);
  } catch (err) {
    alert("Login failed: " + err.message);
  }
});

auth.onAuthStateChanged(async (user) => {
  currentUser = user;
  renderNavAuth(user);

  if (!user) {
    viewLanding.classList.remove("hidden");
    viewApp.classList.add("hidden");
    return;
  }

  viewLanding.classList.add("hidden");
  viewApp.classList.remove("hidden");

  if (!currentDate) {
    const today = new Date();
    const key = formatDateToKey(today);
    currentDate = key;
    inputDate.value = key;
  }

  await loadActivitiesForDate(currentDate);
});

// --------- DATE PICKER ----------
inputDate.addEventListener("change", async () => {
  const val = inputDate.value;
  if (!val) return;
  currentDate = val;
  resetEditMode();
  await loadActivitiesForDate(currentDate);
});

// --------- FORM SUBMIT ----------
formActivity.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();

  if (!currentUser) {
    showError("You must be logged in to add activities.");
    return;
  }

  const name = inputActivityName.value.trim();
  const category = selectCategory.value || "Other";
  const duration = parseInt(inputDuration.value, 10);

  if (!name) {
    showError("Activity name is required.");
    return;
  }
  if (!duration || duration <= 0) {
    showError("Duration must be a positive number.");
    return;
  }

  const remaining = 1440 - totalMinutes;

  if (editingActivityId) {
    const totalWithoutThis = totalMinutes - editingOriginalDuration;
    const newTotal = totalWithoutThis + duration;

    if (newTotal > 1440) {
      showError(
        `This change would exceed 1440 minutes. You have ${
          1440 - totalWithoutThis
        } minutes left for this day.`
      );
      return;
    }

    try {
      await updateActivity(editingActivityId, name, category, duration);
      resetEditMode();
    } catch (err) {
      showError("Failed to update activity: " + err.message);
    }
  } else {
    if (duration > remaining) {
      showError(
        `Not enough remaining time. You have only ${remaining} minutes left for this day.`
      );
      return;
    }

    try {
      await addActivity(name, category, duration);
      formActivity.reset();
      selectCategory.value = "Work";
    } catch (err) {
      showError("Failed to add activity: " + err.message);
    }
  }
});

// Cancel edit
btnCancelEdit.addEventListener("click", () => {
  resetEditMode();
});

// --------- ANALYSE BUTTON ----------
btnAnalyse.addEventListener("click", () => {
  if (currentActivities.length === 0) {
    resetDashboard();
    return;
  }

  buildDashboard();

  dashboardSummary.scrollIntoView({ behavior: "smooth", block: "start" });
});

// --------- INITIAL SETUP ----------
(function init() {
  const today = new Date();
  const key = formatDateToKey(today);
  inputDate.value = key;
  currentDate = key;
  resetDashboard();
})();
