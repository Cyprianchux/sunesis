/* Topics dropdown logic */
const topicsMenu = document.getElementById("topicsMenu");
const topicsDropdown = document.querySelector(".topics-dropdown");
if (topicsMenu && topicsDropdown) {
  // Toggle dropdown when clicking "Topics"
  topicsMenu.addEventListener("click", (e) => {
    e.stopPropagation();
    topicsDropdown.style.display =
      topicsDropdown.style.display === "block" ? "none" : "block";
  });

  // Prevent clicks inside dropdown from closing it
  topicsDropdown.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  // Close only when clicking truly outside
  document.addEventListener("click", () => {
    topicsDropdown.style.display = "none";
  });
}


/* ---------- AUTH GUARD ---------- */
function getActiveUser() {
  const sessionUser = sessionStorage.getItem("sunesis_user");
  const rememberUser = localStorage.getItem("sunesis_user");
  const isRemembered = localStorage.getItem("sunesis_remember");

  return sessionUser || (isRemembered ? rememberUser : null);
}

function requireAuth(redirectUrl = "/") {
  const activeUser = getActiveUser();
  console.log("Active user:", activeUser);

  if (!activeUser) {
    console.log("No active user, redirecting to", redirectUrl);
    window.location.href = redirectUrl;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  requireAuth();
});

function isAdminUser(user = getActiveUser()) {
  const users = JSON.parse(localStorage.getItem("sunesis_users")) || {};
  const localRole = users[user]?.role;
  const remoteRole =
    sessionStorage.getItem("sunesis_role") || localStorage.getItem("sunesis_role");
  return localRole === "admin" || remoteRole === "admin";
}

const LOCAL_ONLY_MODE_KEY = "sunesis_local_only_mode";

function setLocalOnlyMode(enabled) {
  if (enabled) {
    localStorage.setItem(LOCAL_ONLY_MODE_KEY, "true");
    sessionStorage.setItem(LOCAL_ONLY_MODE_KEY, "true");
  } else {
    localStorage.removeItem(LOCAL_ONLY_MODE_KEY);
    sessionStorage.removeItem(LOCAL_ONLY_MODE_KEY);
  }
}

function warnLocalOnlyMode(message = "Local-only mode active: this browser is storing the change locally until the connection returns.") {
  setLocalOnlyMode(true);
  showPopup(message, "info");
}

// Loading state management for buttons
function setButtonLoading(button, isLoading) {
  if (isLoading) {
    button.classList.add("loading");
    button.disabled = true;
    button.dataset.originalText = button.textContent;
    button.innerHTML = '<span class="button-text">Processing...</span>';
  } else {
    button.classList.remove("loading");
    button.disabled = false;
    button.textContent = button.dataset.originalText || button.textContent;
  }
}

async function getTopicByName(name) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("topics", "readonly");
    const store = tx.objectStore("topics");
    const request = store.get(name);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getAdminPageTopics() {
  const topics = await getAllTopics();
  if (isAdminUser()) return topics;
  const activeUser = getActiveUser();
  return topics.filter((topic) => topic.creator === activeUser);
}

async function getAdminPageSlides() {
  const slides = await getAllSlides();
  if (isAdminUser()) return slides;
  const visibleTopics = new Set((await getAdminPageTopics()).map((topic) => topic.name));
  const activeUser = getActiveUser();
  return slides.filter(
    (slide) =>
      slide.creator === activeUser || visibleTopics.has(slide.topic),
  );
}

function canManageTopic(topic) {
  const activeUser = getActiveUser();
  return isAdminUser() || topic?.creator === activeUser;
}

function canDeleteSlide(slide, topic) {
  const activeUser = getActiveUser();
  if (isAdminUser()) return true;
  if (slide?.creator === activeUser) return true;
  if (!slide?.creator && topic?.creator === activeUser) return true;
  return false;
}

// Menu Toggle function
function menuToggle() {
  const navLinks = document.getElementById("navLinks");

  if (navLinks) {
    navLinks.classList.toggle("show");
  }
}

// GLOBAL VARIABLES

let db;
let slides = [];
let currentSlideIndex = 0;
let selectedTopic = null;
let allSlidesCache = [];

// Detect page type
const pathname = window.location.pathname;
const isAdminPage = pathname.includes("slide-admin") || pathname.includes("slide-admin.html");

const isViewPage = pathname.includes("slide-view") || pathname.includes("slide-view.html");

const isAccountPage = pathname.includes("account") || pathname.includes("account.html");

const isWebPage = pathname.includes("web-view") || pathname.includes("web-view.html");

// INITIALIZE DATABASE

function initDB() {
  return new Promise((resolve, reject) => {
    const openRequest = indexedDB.open("Sunesis", 1);

    openRequest.onupgradeneeded = (event) => {
      db = event.target.result;

      // Topics store
      if (!db.objectStoreNames.contains("topics")) {
        db.createObjectStore("topics", { keyPath: "name" });
      }

      // Slides store
      if (!db.objectStoreNames.contains("slides")) {
        const slideStore = db.createObjectStore("slides", {
          keyPath: "id",
          autoIncrement: true,
        });
        slideStore.createIndex("topic", "topic", { unique: false });
      }
    };

    openRequest.onsuccess = (event) => {
      db = event.target.result;
      resolve();
    };

    openRequest.onerror = (event) => {
      const error = event.target.error;
      if (error && error.name === "VersionError") {
        const deleteRequest = indexedDB.deleteDatabase("Sunesis");
        deleteRequest.onsuccess = () => {
          initDB().then(resolve).catch(reject);
        };
        deleteRequest.onerror = () => reject(deleteRequest.error);
        deleteRequest.onblocked = () =>
          reject(new Error("Database delete blocked. Close other tabs and try again."));
        return;
      }
      reject(error);
    };
  });
}

function getRemoteUserRole() {
  return (
    sessionStorage.getItem("sunesis_role") ||
    localStorage.getItem("sunesis_role") ||
    "user"
  );
}

function isRemoteAdmin() {
  return getRemoteUserRole() === "admin";
}

function getTopicByNameLocal(name) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("topics", "readonly");
    const store = tx.objectStore("topics");
    const request = store.get(name);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getSlideById(id) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized. Call initDB() first."));
      return;
    }

    const tx = db.transaction("slides", "readonly");
    const store = tx.objectStore("slides");
    const request = store.get(Number(id));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getSlideByRemoteId(remoteId) {
  const slides = await getAllSlides();
  return slides.find((item) => Number(item.remoteId) === Number(remoteId));
}

function saveLocalTopic(topic) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("topics", "readwrite");
    const store = tx.objectStore("topics");
    const request = store.put(topic);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function saveLocalSlide(slide) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("slides", "readwrite");
    const store = tx.objectStore("slides");
    const request = store.put(slide);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function syncLocalToRemote() {
  if (!isOnline()) return;
  const activeUser = getActiveUser();
  if (!activeUser) return;

  const topics = await getAllTopics();
  for (const topic of topics) {
    if (topic.creator !== activeUser || topic.remoteSynced) continue;

    try {
      await remoteCreateTopic(topic.name);
      topic.remoteSynced = true;
      await saveLocalTopic(topic);
    } catch (error) {
      if (error.message.includes("Topic already exists")) {
        topic.remoteSynced = true;
        await saveLocalTopic(topic);
      }
    }
  }

  const slides = await getAllSlides();
  for (const slide of slides) {
    if (slide.creator !== activeUser || slide.remoteSynced) continue;

    try {
      const created = await remoteCreateSlide({
        topic: slide.topic,
        title: slide.title,
        desc: slide.desc,
        media: slide.media,
        type: slide.type,
      });
      slide.remoteId = created.id;
      slide.remoteSynced = true;
      await saveLocalSlide(slide);
    } catch (error) {
      console.warn("Slide sync failed:", error.message);
    }
  }
}

async function syncRemoteToLocal() {
  if (!isOnline()) return;

  try {
    const remoteTopics = await remoteFetchTopics();
    for (const topic of remoteTopics) {
      await saveLocalTopic({
        ...topic,
        remoteSynced: true,
      });
    }

    const remoteSlides = await remoteFetchSlides();
    for (const slide of remoteSlides) {
      const existing = await getSlideByRemoteId(slide.id);
      const localSlide = {
        topic: slide.topic,
        title: slide.title,
        desc: slide.desc,
        media: slide.media,
        type: slide.type,
        creator: slide.creator,
        createdAt: slide.created_at,
        remoteId: slide.id,
        remoteSynced: true,
      };
      if (existing) {
        localSlide.id = existing.id;
      }
      await saveLocalSlide(localSlide);
    }
  } catch (error) {
    console.warn("Remote sync failed:", error.message);
  }
}

async function syncAllRemoteData() {
  if (!db) await initDB(); 
  if (!isOnline()) return;
  await syncLocalUsersToRemote();
  await syncLocalToRemote();
  await syncRemoteToLocal();
}

async function syncLocalUsersToRemote() {
  const users = JSON.parse(localStorage.getItem("sunesis_users")) || {};
  for (const [username, user] of Object.entries(users)) {
    try {
      await remoteRegisterLocalUser(username, user.password, user.role);
    } catch (error) {
      console.warn("Local user sync failed:", error.message);
    }
  }
}

// DATABASE FUNCTIONS

// ---- Topics ----
async function createTopic(name) {
  if (!db) await initDB();

  const activeUser = getActiveUser();
  const existing = await getTopicByNameLocal(name);
  if (existing) {
    showPopup("Topic already exists.", "error");
    return false;
  }

  await new Promise((resolve, reject) => {
    const tx = db.transaction("topics", "readwrite");
    const store = tx.objectStore("topics");
    const request = store.add({
      name,
      creator: activeUser,
      createdAt: new Date().toISOString(),
      remoteSynced: false,
    });

    request.onerror = () => reject(request.error);
    tx.oncomplete = () => resolve();
  });

  showPopup(`The topic "${name}" has been added successfully!`, "success");
  return true;
}

function getAllTopics() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("topics", "readonly");
    const store = tx.objectStore("topics");
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ---- Slides ----
async function addSlide(slide) {
  if (!db) await initDB();

  const activeUser = getActiveUser();
  const slideToSave = {
    ...slide,
    creator: activeUser,
    createdAt: new Date().toISOString(),
    remoteSynced: false,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction("slides", "readwrite");
    const store = tx.objectStore("slides");
    const request = store.add(slideToSave);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.onerror = () => reject(tx.error);
  });
}

async function getSlidesByTopic(topicName) {
  const allSlides = await getAllSlides();
  return allSlides.filter(s => s.topic === topicName);
}

function getAllSlides() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("slides", "readonly");
    const store = tx.objectStore("slides");
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function deleteSlide(id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("slides", "readwrite");
    const store = tx.objectStore("slides");
    store.delete(id);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function deleteSlidesByTopic(topicName) {
  return new Promise(async (resolve, reject) => {
    const topicSlides = await getSlidesByTopic(topicName);
    const tx = db.transaction("slides", "readwrite");
    const store = tx.objectStore("slides");

    topicSlides.forEach((s) => store.delete(s.id));

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Delete Handlers
function deleteAllTopicsAndSlides() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["topics", "slides"], "readwrite");
    tx.objectStore("topics").clear();
    tx.objectStore("slides").clear();

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteSlideHandler(id) {
  const slide = await getSlideById(id);
  const topic = slide ? await getTopicByName(slide.topic) : null;
  if (!canDeleteSlide(slide, topic)) {
    showPopup("You are not authorized to delete this slide.", "error");
    return;
  }

  if (!(await showConfirm("Delete this slide?"))) return;
  showPopup("Deleting slide...", "info");

  if (isOnline() && slide?.remoteId) {
    try {
      await remoteDeleteSlide(slide.remoteId);
    } catch (error) {
      console.warn("Remote slide delete failed:", error.message);
    }
  }

  await deleteSlide(id);
  await displayAllTopics();
  await loadTopicsAdmin();
  showPopup("Slide deleted successfully.", "success");
}

async function deleteSlidesFromTopicHandler(topicName) {
  const topic = await getTopicByName(topicName);
  if (!canManageTopic(topic)) {
    showPopup("You are not authorized to delete slides for this topic.", "error");
    return;
  }

  if (!(await showConfirm(`Delete all slides from "${topicName}"?`))) return;
  showPopup(`Deleting all slides from "${topicName}"...`, "info");

  if (isOnline()) {
    try {
      await remoteDeleteSlidesByTopic(topicName);
    } catch (error) {
      console.warn("Remote delete slides by topic failed:", error.message);
    }
  }

  await deleteSlidesByTopic(topicName);
  await displayAllTopics();
  showPopup(`All slides from "${topicName}" deleted.`, "success");
}

async function deleteTopicHandler(topicName) {
  const topic = await getTopicByName(topicName);
  if (!canManageTopic(topic)) {
    showPopup("You are not authorized to delete this topic.", "error");
    return;
  }

  if (!(await showConfirm(`Delete the topic "${topicName}" and all its slides?`))) return;
  showPopup(`Deleting topic "${topicName}" and all its slides...`, "info");

  if (isOnline()) {
    try {
      await remoteDeleteTopic(topicName);
    } catch (error) {
      console.warn("Remote topic delete failed:", error.message);
    }
  }

  await deleteSlidesByTopic(topicName);

  const tx = db.transaction("topics", "readwrite");
  tx.objectStore("topics").delete(topicName);

  await new Promise((res, rej) => {
    tx.oncomplete = res;
    tx.onerror = () => rej(tx.error);
  });

  await displayAllTopics();
  await loadTopicsAdmin();
  renderTopicCards();

  showPopup(`Topic "${topicName}" and all its slides deleted.`, "success");
}
/*
async function loadTopicsAdmin() {
  const topics = await getAdminPageTopics();
  const select = document.getElementById("topicSelect");
  select.innerHTML = `<option value="">-- Choose a topic --</option>`;
  topics.forEach((topic) => {
    const opt = document.createElement("option");
    opt.value = topic.name;
    opt.textContent = topic.name;
    select.appendChild(opt);
  });
}
*/
// Load topics into both dropdown on admin page
async function loadTopicsAdmin() {
  const topics = await getAdminPageTopics();

  const select = document.getElementById("topicSelect"); // Add Slide select
  const navSelect = document.getElementById("navTopicSelect"); // Navbar select

  if (select) {
    select.innerHTML = `<option value="">-- Choose a topic --</option>`;
    topics.forEach((topic) => {
      const opt = document.createElement("option");
      opt.value = topic.name;
      opt.textContent = topic.name;
      select.appendChild(opt);
    });
  }

  if (navSelect) {
    navSelect.innerHTML = `<option value="">Choose a topic</option>`;
    topics.forEach((topic) => {
      const opt = document.createElement("option");
      opt.value = topic.name;
      opt.textContent = topic.name;
      navSelect.appendChild(opt);
    });
  }
}
// Display All Topics

async function displayAllTopics() {
  const container = document.getElementById("slideContainer");
  const topics = await getAdminPageTopics();
  const slides = await getAdminPageSlides();
  displayAdminTopics(topics, slides, container);
}

function displayAdminTopics(topics, allSlides, container = document.getElementById("slideContainer")) {
  if (!container) return;

  container.innerHTML = "";

  if (topics.length === 0) {
    container.innerHTML = "<p style='text-align:center;'>No topics available for account management.</p>";
    return;
  }

  for (const topic of topics) {
    const topicSlides = allSlides.filter((slide) => slide.topic === topic.name);
    const topicDiv = document.createElement("div");
    topicDiv.classList.add("topic-section");
    const manageTopic = canManageTopic(topic);

    topicDiv.innerHTML = `
      <h3>${topic.name}</h3>
      ${manageTopic ? `<button onclick="deleteTopicHandler('${topic.name}')">Delete Topic</button>` : ""}
      ${manageTopic ? `<button onclick="deleteSlidesFromTopicHandler('${topic.name}')">Delete All Slides</button>` : ""}
      <p style="font-size:0.9rem; color:#8c7073; margin-left:18px;">Created by <strong>${topic.creator || 'Unknown'}</strong></p>
    `;

    if (topicSlides.length === 0) {
      topicDiv.innerHTML += `<p style="margin-left:15px;">No slides yet.</p>`;
    } else {
      for (const slide of topicSlides) {
        const slideTitle = slide.title || "Untitled slide";
        const slideOwner = slide.creator || "Unknown";
        const canDelete = canDeleteSlide(slide, topic);

        topicDiv.innerHTML += `
          <div class="slide-item" style="margin:8px 0;padding:8px;border:1.5px solid #f0dfdd;border-radius:8px;">
            <h4>${slideTitle}</h4>
            <div class="slide-desc">
              ${formatDescription(slide.desc)}
            </div>
            ${
              slide.media
                ? slide.type === "image"
                  ? `<img src="${slide.media}" width="150">`
                  : `<video src="${slide.media}" width="160" controls></video>`
                : ""
            }
            ${canDelete ? `<button class="delete-slide-btn" data-id="${slide.id}">Delete Slide</button>` : `<p style="color:#8c7073; font-size:0.9rem; margin-top:8px;">Created by <strong>${slideOwner}</strong></p>`}
          </div>
        `;
      }
    }
    container.appendChild(topicDiv);
  }

  bindAdminActions();
}

async function displayAdminUserSearch(username) {
  const term = username.trim().toLowerCase();
  const topics = await getAdminPageTopics();
  const allSlides = await getAdminPageSlides();
  const matchingTopicNames = new Set(
    topics
      .filter((topic) => topic.creator?.toLowerCase().includes(term))
      .map((topic) => topic.name),
  );

  allSlides.forEach((slide) => {
    if (slide.creator?.toLowerCase().includes(term)) {
      matchingTopicNames.add(slide.topic);
    }
  });

  displayAdminTopics(
    topics.filter((topic) => matchingTopicNames.has(topic.name)),
    allSlides,
  );
}

// COMMON SEARCH FUNCTIONALITY

async function performSearch() {
  const searchInput = document.getElementById("searchInput");
  if (!searchInput) return;

  const term = searchInput.value.trim().toLowerCase();

  // RESET behavior
  /*  if (!term) {
    if (isViewPage) {
      displayCurrentSlide();
      renderCurrentSlide();
    }
    if (isAdminPage) displayAllTopics();
    return;
  }
*/

  if (!term) {
    if (isViewPage) {
      if (selectedTopic) {
        slides = allSlidesCache.filter((s) => s.topic === selectedTopic);
      } else {
        slides = [];
        document.getElementById("slideDisplay").innerHTML =
          "<p>Select a topic to view slides</p>";
        return;
      }
      currentSlideIndex = 0;
      renderCurrentSlide();
    }

    if (isAdminPage) {
      displayAllTopics();
    }

    if (isAccountPage) {
      renderTopicCards();
    }

    if (isWebPage) {
      const savedTopic = localStorage.getItem("sunesis_selected_topic");

      if (savedTopic) {
        selectedTopic = savedTopic;
        const filtered = allSlidesCache.filter((s) => s.topic === savedTopic);
        renderPageSlides(filtered);

        const select = document.getElementById("topicSelect");
        if (select) select.value = savedTopic;
      } else {
        renderPageSlides(allSlidesCache);
      }
    }

    return;
  }

  // VIEW PAGE SEARCH (within selected topic)
  if (isViewPage) {
    //const filtered = slides.filter(
    const filtered = allSlidesCache.filter(
      (s) =>
        s.title?.toLowerCase().includes(term) ||
        s.desc?.toLowerCase().includes(term) ||
        s.topic?.toLowerCase().includes(term),
    );

    // displayFilteredSlides(filtered);
    slides = filtered;
    currentSlideIndex = 0;
    renderCurrentSlide();
  }

  // ADMIN PAGE SEARCH (across allowed slides)
  if (isAdminPage) {
    if (!isAdminUser()) {
      const allSlides = await getAdminPageSlides();
      const filtered = allSlides.filter(
        (s) =>
          s.title?.toLowerCase().includes(term) ||
          s.desc?.toLowerCase().includes(term) ||
          s.topic?.toLowerCase().includes(term),
      );

      displayFilteredAdminSlides(filtered);
      return;
    }

    const topics = await getAdminPageTopics();
    const allSlides = await getAdminPageSlides();
    const matchesUsername = topics.some((topic) =>
      topic.creator?.toLowerCase().includes(term),
    ) || allSlides.some((slide) => slide.creator?.toLowerCase().includes(term));

    if (matchesUsername) {
      await displayAdminUserSearch(term);
      return;
    }

    const filtered = allSlides.filter(
      (s) =>
        s.title?.toLowerCase().includes(term) ||
        s.desc?.toLowerCase().includes(term) ||
        s.topic?.toLowerCase().includes(term),
    );

    displayFilteredAdminSlides(filtered);
  }

  // Web-view page search
  if (isWebPage) {
    const filtered = allSlidesCache.filter(
      (s) =>
        s.title?.toLowerCase().includes(term) ||
        s.desc?.toLowerCase().includes(term) ||
        s.topic?.toLowerCase().includes(term),
    );

    renderPageSlides(filtered);
  }

  // ACCOUNT PAGE SEARCH (topics and their associated slides)
  if (isAccountPage) {
    const topics = await getAllTopics();
    const allSlides = await getAllSlides();
    const matchingTopics = topics.filter((topic) => {
      const topicMatches = topic.name?.toLowerCase().includes(term);
      const topicSlides = allSlides.filter((slide) => slide.topic === topic.name);
      return (
        topicMatches ||
        topicSlides.some(
          (slide) =>
            slide.title?.toLowerCase().includes(term) ||
            slide.desc?.toLowerCase().includes(term),
        )
      );
    });

    renderTopicCards(matchingTopics);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const searchBtn = document.getElementById("searchBtn");
  const searchInput = document.getElementById("searchInput");
  if (searchBtn && searchInput) {
    if (isAdminPage && isAdminUser()) {
      searchInput.placeholder = "Search topics, slides, or username...";
    }
    searchBtn.addEventListener("click", performSearch);
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") performSearch();
    });
  }
});

// PAGE-SPECIFIC LOGIC

// VIEW PAGE (slide-view.html)
if (isViewPage) {
  document.addEventListener("DOMContentLoaded", async () => {
    await initDB();
    await syncAllRemoteData();
    allSlidesCache = await getAllSlides();
    await loadTopicsView();
    bindTopicSelection();

    function bindTopicSelection() {
      const select = document.getElementById("topicSelect");
      if (!select) return;

      select.addEventListener("change", async () => {
        const topicName = select.value;

        if (!topicName) {
          document.getElementById("slideDisplay").innerHTML =
            "<p>Select a topic to view slides</p>";
          return;
        }

        localStorage.setItem("sunesis_selected_topic", topicName); // <-- sync

        selectedTopic = topicName;
        slides = allSlidesCache.filter((s) => s.topic === topicName);

        currentSlideIndex = 0;
        renderCurrentSlide();
      });
    }

    async function loadTopicsView() {
      const topics = await getAllTopics();
      const select = document.getElementById("topicSelect");

      if (!select) return;

      select.innerHTML = `<option value="">Choose a topic </option>`;

      topics.forEach((topic) => {
        const opt = document.createElement("option");
        opt.value = topic.name;
        opt.textContent = topic.name;
        select.appendChild(opt);
      });
    }
    /*
    function updateButtons() {
      const prev = document.getElementById("prevArrow");
      const next = document.getElementById("nextArrow");
      prev.disabled = currentSlideIndex === 0 || slides.length === 0;
      next.disabled = currentSlideIndex === slides.length - 1 || slides.length === 0;
    }
*/
    const params = new URLSearchParams(window.location.search);
    let topicFromUrl = params.get("topic");

    // fallback to saved topic
    if (!topicFromUrl) {
      topicFromUrl = localStorage.getItem("sunesis_selected_topic");
    }

    if (topicFromUrl) {
      const select = document.getElementById("topicSelect");
      select.value = topicFromUrl;

      selectedTopic = topicFromUrl;
      slides = allSlidesCache.filter((s) => s.topic === topicFromUrl);

      currentSlideIndex = 0;
      renderCurrentSlide();
    } 

    /*const savedTopic = localStorage.getItem("sunesis_selected_topic");

    if (savedTopic) {
      const select = document.getElementById("topicSelect");
      select.value = savedTopic;
      slides = allSlidesCache.filter(s => s.topic === savedTopic);
      selectedTopic = savedTopic;
      currentSlideIndex = 0;
      renderCurrentSlide();
    }*/
  });
}

window.addEventListener("online", async () => {
  setLocalOnlyMode(false);
  showPopup("Connection restored. Syncing online content...", "success");
  await syncAllRemoteData();
});

window.addEventListener("offline", () => {
  setLocalOnlyMode(true);
  showPopup("You are offline. Local-only mode is active. Changes stay in this browser until connectivity returns.", "info");
});

function displayCurrentSlide() {
  const display = document.getElementById("slideDisplay");
  if (slides.length === 0) {
    display.innerHTML =
      '<p style="text-align:center;">No slides available for this topic.</p>';
    return;
  }

  const slide = slides[currentSlideIndex];
  let mediaHTML = "";
  if (slide.media) {
    mediaHTML =
      slide.type === "image"
        ? `<img src="${slide.media}" alt="${slide.title}" width="300">`
        : `<video src="${slide.media}" width="400" controls autoplay></video>`;
  }

  display.innerHTML = `
    <div class="slide-content">
      <h3>${slide.title}</h3>

      <div class="slide-desc">
        ${formatDescription(slide.desc)}
      </div>

      ${mediaHTML}

      <h1>
        Slide ${currentSlideIndex + 1} of ${slides.length}
      </h1>
    </div>
  `;
}

function renderCurrentSlide() {
  const display = document.getElementById("slideDisplay");
  const prev = document.getElementById("prevArrow");
  const next = document.getElementById("nextArrow");

  if (!slides.length) {
    display.innerHTML = "<p>No slide saved for this topic.</p>";
    prev.disabled = true;
    next.disabled = true;
    return;
  }

  const slide = slides[currentSlideIndex];

  display.innerHTML = `
    <div class="slide-content">
      <h4>${slide.title}</h4>
      <div class="slide-body">
        <div class="slide-desc">
          ${formatDescription(slide.desc)}
        </div>

        ${
          slide.media
            ? slide.type === "image"
              ? `<img src="${slide.media}">`
              : `<video src="${slide.media}" controls></video>`
            : ""
        }
      </div>

      <h1>Slide ${currentSlideIndex + 1} of ${slides.length}</h1>
    </div>
    
    <button id="prevArrow" class="arrow-btn">&#10094;</button>
    <button id="nextArrow" class="arrow-btn">&#10095;</button>
  `;

  prev.disabled = currentSlideIndex === 0;
  next.disabled = currentSlideIndex === slides.length - 1;

  document.getElementById("prevArrow").onclick = () => {
    if (currentSlideIndex > 0) {
      currentSlideIndex--;
      renderCurrentSlide();
    }
  };

  document.getElementById("nextArrow").onclick = () => {
    if (currentSlideIndex < slides.length - 1) {
      currentSlideIndex++;
      renderCurrentSlide();
    }
  };
}

function displayFilteredSlides(filteredSlides) {
  const display = document.getElementById("slideDisplay");
  if (filteredSlides.length === 0) {
    display.innerHTML = `<p>No results found.</p>`;
    return;
  }

  display.innerHTML = filteredSlides
    .map(
      (s) => `
      <div style="border:1px solid #f0dfdd; padding:10px; margin:8px; border-radius:8px;">
        <h4>${s.title}</h4>
        <div class="slide-body">
          <div class="slide-desc">
            ${formatDescription(s.desc)}
          </div>

          ${
            s.media
              ? s.type === "image"
                ? `<img src="${s.media}" width="500">`
                : `<video src="${s.media}" width="600" controls></video>`
              : ""
          }
        </div>
      </div>`,
    )
    .join("");
}

// ADMIN PAGE (slide-admin.html)
if (isAdminPage) {
  document.addEventListener("DOMContentLoaded", async () => {
    await initDB();
    await syncAllRemoteData();
    await loadTopicsAdmin();
    displayAllTopics();

    const deleteAllBtn = document.getElementById("deleteAllBtn");
    if (deleteAllBtn && !isAdminUser()) {
      deleteAllBtn.style.display = "none";
    }

    // Create topic
    document
      .getElementById("createTopicBtn")
      .addEventListener("click", async () => {
        const name = document.getElementById("topicName").value.trim();
        const createTopicBtn = document.getElementById("createTopicBtn");
        
        if (!name) {
          showPopup("Please enter a topic name.", "error");
          return;
        }

        setButtonLoading(createTopicBtn, true);

        const createdLocally = await createTopic(name);
        if (!createdLocally) {
          document.getElementById("topicName").value = "";
          await loadTopicsAdmin();
          displayAllTopics();
          setButtonLoading(createTopicBtn, false);
          return;
        }

        if (isOnline()) {
          try {
            await remoteCreateTopic(name);
            const topic = await getTopicByNameLocal(name);
            if (topic) {
              topic.remoteSynced = true;
              await saveLocalTopic(topic);
            }
          } catch (error) {
            warnLocalOnlyMode(
              "Local-only mode active: topic saved in this browser. It will sync when the connection returns.",
            );
          }
        } else {
          warnLocalOnlyMode(
            "Local-only mode active: topic saved in this browser. It will sync when the connection returns.",
          );
        }

        document.getElementById("topicName").value = "";
        await loadTopicsAdmin();
        displayAllTopics();
        setButtonLoading(createTopicBtn, false);
      });

    // Add slide
    document
      .getElementById("addSlideBtn")
      .addEventListener("click", async () => {
        const topic = document.getElementById("topicSelect").value;
        const title = document.getElementById("slide-title").value.trim();
        const desc = document.getElementById("slide-desc").value.trim();
        const mediaFile =
          document.getElementById("slide-media").files[0] || null;
        const addSlideBtn = document.getElementById("addSlideBtn");

        if (!topic || !title) {
          showPopup("Please select a topic and enter a title.", "error");
          return;
        }

        setButtonLoading(addSlideBtn, true);

        const slide = {
          topic,
          title,
          desc,
          type: mediaFile ? mediaFile.type.split("/")[0] : "text",
        };

        if (mediaFile) {
          const reader = new FileReader();
          reader.onload = async (e) => {
            slide.media = e.target.result;
            const localId = await addSlide(slide);
            if (isOnline()) {
              try {
                const created = await remoteCreateSlide(slide);
                const localSlide = await getSlideById(localId);
                if (localSlide) {
                  localSlide.remoteId = created.id;
                  localSlide.remoteSynced = true;
                  await saveLocalSlide(localSlide);
                }
              } catch (error) {
                warnLocalOnlyMode(
                  "Local-only mode active: slide saved in this browser. It will sync when the connection returns.",
                );
              }
            } else {
              warnLocalOnlyMode(
                "Local-only mode active: slide saved in this browser. It will sync when the connection returns.",
              );
            }
            displayAllTopics();
            showPopup("Slide added successfully!", "success");
            document.getElementById("slide-title").value = "";
            document.getElementById("slide-desc").value = "";
            document.getElementById("slide-media").value = "";
            setButtonLoading(addSlideBtn, false);
          };
          reader.readAsDataURL(mediaFile);
        } else {
          const localId = await addSlide(slide);
          if (isOnline()) {
            try {
              const created = await remoteCreateSlide(slide);
              const localSlide = await getSlideById(localId);
              if (localSlide) {
                localSlide.remoteId = created.id;
                localSlide.remoteSynced = true;
                await saveLocalSlide(localSlide);
              }
            } catch (error) {
              warnLocalOnlyMode(
                "Local-only mode active: slide saved in this browser. It will sync when the connection returns.",
              );
            }
          } else {
            warnLocalOnlyMode(
              "Local-only mode active: slide saved in this browser. It will sync when the connection returns.",
            );
          }
          displayAllTopics();
          showPopup("Slide added successfully!", "success");
          document.getElementById("slide-title").value = "";
          document.getElementById("slide-desc").value = "";
          document.getElementById("slide-media").value = "";
          setButtonLoading(addSlideBtn, false);
        }
      });

    // Delete all topics/slides
    const deleteAllButton = document.getElementById("deleteAllBtn");
    if (deleteAllButton) {
      deleteAllButton.addEventListener("click", async () => {
        if (!isAdminUser()) {
          showPopup("Only the admin account may delete everything.", "error");
          return;
        }

        if (await showConfirm("Delete ALL topics and slides? This cannot be undone.")) {
          showPopup("Deleting ALL topics and slides...", "error");
          if (isOnline()) {
            try {
              await remoteDeleteAll();
            } catch (error) {
              console.warn("Remote delete-all failed:", error.message);
              showPopup(
                "Unable to delete all content remotely. Local cleanup will continue.",
                "info",
              );
            }
          }
          await deleteAllTopicsAndSlides();
          await loadTopicsAdmin();
          displayAllTopics();
          showPopup("All topics and slides deleted.", "info");
        }
      });
    }

    // Floating Action Button - Show/Hide based on scroll
    const floatingBtn = document.getElementById("floatingAddBtn");
    const slideContainer = document.getElementById("slideContainer");
    const addSlideSection = document.querySelector(".add-slide");

    if (floatingBtn && slideContainer) {
      window.addEventListener("scroll", () => {
        const slideContainerRect = slideContainer.getBoundingClientRect();
        
        // If slideContainer reaches 90px from top of screen, show button
        if (slideContainerRect.top <= 90) {
          floatingBtn.style.opacity = "1";
          floatingBtn.style.pointerEvents = "auto";
        } else {
          floatingBtn.style.opacity = "0";
          floatingBtn.style.pointerEvents = "none";
        }
      });

      // Click handler - scroll to add slide section
      floatingBtn.addEventListener("click", () => {
        addSlideSection.scrollIntoView({ behavior: "smooth", block: "start" });
      });

      // Prevent default browser tooltip - show only custom tooltip 
      /*
      floatingBtn.addEventListener("mouseleave", () => {
        floatingBtn.removeAttribute("title");
      });

      floatingBtn.addEventListener("mouseenter", () => {
        floatingBtn.setAttribute("title", "Add a Slide or Topic");
      });
      */
    }
  }); 

  function bindAdminActions() {
    document.querySelectorAll(".delete-slide-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = Number(btn.dataset.id);

        deleteSlideHandler(id);
      });
    });
  }
}

function displayFilteredAdminSlides(filteredSlides) {
  const container = document.getElementById("slideContainer");
  if (filteredSlides.length === 0) {
    container.innerHTML = `<p style="text-align:center;">No matching slides found.</p>`;
    return;
  }
  container.innerHTML = filteredSlides
    .map(
      (s) => `
      <div class="slide-item">
        <h4>${s.title}</h4>
        <div class="slide-desc">
          ${formatDescription(s.desc)}
        </div>

        ${
          s.media
            ? s.type === "image"
              ? `<img src="${s.media}" width="120">`
              : `<video src="${s.media}" width="160" controls></video>`
            : ""
        }
      </div>`,
    )
    .join("");
}

// Formatted text (newline and bullet points) function

function formatDescription(rawText = "") {
  // Normalize Windows newlines
  const text = rawText.replace(/\r\n/g, "\n").trim();

  const lines = text.split("\n");

  let html = "";
  let inList = false;

  for (let line of lines) {
    const trimmed = line.trim();

    // Bullet detection: -, *, •
    if (/^([-*•])\s+/.test(trimmed)) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      html += `<li>${trimmed.replace(/^([-*•])\s+/, "")}</li>`;
      continue;
    }

    // Close list if switching back to text
    if (inList) {
      html += "</ul>";
      inList = false;
    }

    // Empty line = spacing
    if (trimmed === "") {
      html += "<br>";
    } else {
      html += `<p>${trimmed}</p>`;
    }
  }

  if (inList) html += "</ul>";

  return html;
}

// Account page  topics generated functionality

if (isAccountPage) {
  document.addEventListener("DOMContentLoaded", async () => {
    /* ---------- AUTH GUARD ---------- */
    const sessionUser = sessionStorage.getItem("sunesis_user");
    const rememberUser = localStorage.getItem("sunesis_user");
    const isRemembered = localStorage.getItem("sunesis_remember");

    const activeUser = sessionUser || (isRemembered ? rememberUser : null);

    if (!activeUser) {
      showPopup("Access denied. Please login.", "error");
      window.location.href = "/";
      return;
    }

    /* ---------- DISPLAY USERNAME ---------- */
    const formattedName =
      activeUser.charAt(0).toUpperCase() + activeUser.slice(1);

    document.getElementById("loginUser").textContent = formattedName;

    await initDB();
    await syncAllRemoteData();
    renderTopicCards();
  });
}

async function renderTopicCards(topics = null) {
  const container = document.getElementById("topicsContainer");
  if (!container) return;

  const visibleTopics = topics || (await getAllTopics());
  container.innerHTML = "";

  if (visibleTopics.length === 0) {
    if (topics) {
      container.innerHTML = "<p style='text-align:center;'>No matching topics or slides found.</p>";
    } else {
      renderDefaultTopics();
    }
    return;
  }

  for (const topic of visibleTopics) {
    const slides = await getSlidesByTopic(topic.name);

    // Skip empty topics (optional – remove if you want empty topics visible)
    //  if (slides.length === 0) continue;

    const card = document.createElement("div");
    card.className = "topic-card";

    card.innerHTML = `
      <h3>${topic.name}</h3>
      <p class="slide-count">${slides.length} slide${slides.length > 1 ? "s" : ""}</p>
      <button onclick="openTopic('${topic.name}')">View</button>
      <p class="creator-info">created by <strong>${topic.creator || 'Unknown'}</strong>.</p>
    `;

    container.appendChild(card);
  }
}

function renderDefaultTopics() {
  const container = document.getElementById("topicsContainer");
  if (!container) return;

  container.innerHTML = `
    <div class="default-topics-container">
      <h2 class="default-topics-title">Welcome to Sunesis!</h2>
      <p class="default-topics-text">
        You don't have any topics yet. Learn how Sunesis works to create your
        first one.
      </p>
      <div class="topic-card default-topic-card">
        <h3>Getting Started</h3>
        <p>
          New here? Discover the simple flow behind topics and slides on
          Sunesis.
        </p>
        <button
          onclick="window.location.href='/src/footer-pages?page=how-it-works'"
        >
          View
        </button>
      </div>
    </div>
  `;
}

function openTopic(topicName) {
  // Save globally
  localStorage.setItem("sunesis_selected_topic", topicName);

  // Navigate
  window.location.href = `/src/slide-view?topic=${encodeURIComponent(topicName)}`;
}

// Protect pages (Access control)
/*function requireAuth() {
  if (!sessionStorage.getItem("sunesis_logged_in")) {
    window.location.replace("/");
  }
}
console.log("auth check");


if (!sessionStorage.getItem("sunesis_logged_in")) {
  window.location.href = "/";
}
*/

/* ---------- LOGOUT GUARD ---------- */
function logout() {
  sessionStorage.clear();
  localStorage.removeItem("sunesis_remember");
  localStorage.removeItem("sunesis_user");
  localStorage.removeItem("sunesisBoard");
  window.location.href = "/";
}

function renderPageSlides(list) {
  const slideContainer = document.querySelector(".js-slide-container");

  if (!slideContainer) return;

  if (!list.length) {
    slideContainer.innerHTML = "<p style='text-align:center; font-size:22px; font-weight:bold;'>No slides found</p>";
    return;
  }

  slideContainer.innerHTML = list
    .map((slide) => {
      const media = slide.media
        ? slide.type === "image"
          ? `<img src="${slide.media}" alt="">`
          : `<video src="${slide.media}" controls></video>`
        : "";

      return `
      <section class="page-slide">
        <div class="header">
          <div class="header-text">
            <h2>${slide.title}</h2>
            <div class="slide-desc">
              ${formatDescription(slide.desc)}
            </div>
          </div>

          <div class="header-img">
            ${media}
          </div>

        </div>

        <small>${slide.topic}</small>
      </section>
    `;
    })
    .join("");
}

// WEB PAGE (web-view.html)
if (isWebPage) {
  document.addEventListener("DOMContentLoaded", async () => {
    await initDB();
    allSlidesCache = await getAllSlides();
    await loadTopicsView();
    bindTopicSelection();

    const savedTopic = localStorage.getItem("sunesis_selected_topic");
    if (savedTopic) {
      const filtered = allSlidesCache.filter(s => s.topic === savedTopic);
      renderPageSlides(filtered);
      document.getElementById("topicSelect").value = savedTopic;
    } else {
      renderPageSlides([]);
      const select = document.getElementById("topicSelect");
      if (select) select.value = "";
    }

    function bindTopicSelection() {
      const select = document.getElementById("topicSelect");
      if (!select) return;

      select.addEventListener("change", async () => {
        const topicName = select.value;
        localStorage.setItem("sunesis_selected_topic", topicName); // sync to other pages
        if (!topicName) {
          selectedTopic = null;
          renderPageSlides([]);
          return;
        }
        selectedTopic = topicName;
        const filtered = allSlidesCache.filter(s => s.topic === topicName);
        renderPageSlides(filtered);
      });

    }

    async function loadTopicsView() {
      const topics = await getAllTopics();
      const select = document.getElementById("topicSelect");

      if (!select) return;

      select.innerHTML = `<option value="">Choose a topic </option>`;

      topics.forEach((topic) => {
        const opt = document.createElement("option");
        opt.value = topic.name;
        opt.textContent = topic.name;
        select.appendChild(opt);
      });
    }
  });
}

// For real time sync across all tabs
window.addEventListener("storage", (e) => {
  if (e.key === "sunesis_selected_topic") {
    location.reload();
  }
});

// Onscreen popup for 5 seconds
function showPopup(message, type = "info") {
  const popup = document.getElementById("popup");

  popup.textContent = message;
  popup.className = `popup show ${type}`;

  setTimeout(() => {
    popup.classList.remove("show");
  },5000);
}

// Custom confirm function that returns a promise
function showConfirm(message) {
  return new Promise((resolve) => {
    const popup = document.getElementById("popup");

    popup.innerHTML = `${message}<br><div class="confirm-buttons"><button id="confirmYes">Yes</button><button id="confirmNo">No</button></div>`;
    popup.className = `popup show info`;

    document.getElementById("confirmYes").addEventListener("click", () => {
      popup.classList.remove("show");
      popup.innerHTML = "";
      resolve(true);
    });

    document.getElementById("confirmNo").addEventListener("click", () => {
      popup.classList.remove("show");
      popup.innerHTML = "";
      resolve(false);
    });
  });
}

// Function to clear inputs
function clearInputs(...inputs) {
  inputs.forEach(input => input.value = "");
}

function isOnline() {
  return navigator.onLine;
}