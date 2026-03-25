/* ---------- AUTH GUARD ---------- 
const sessionUser = sessionStorage.getItem("sunesis_user");
const rememberUser = localStorage.getItem("sunesis_user");
const isRemembered = localStorage.getItem("sunesis_remember");

const activeUser = sessionUser || (isRemembered ? rememberUser : null);

if (!activeUser) {
  alert("Access denied. Please login.");
  window.location.href = "index.html";
  return;
}
*/
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
const isAdminPage = window.location.pathname.includes("slide-admin.html");

const isViewPage = window.location.pathname.includes("slide-view.html");

const isAccountPage = window.location.pathname.includes("account.html");

const isWebPage = window.location.pathname.includes("web-view.html");

// INITIALIZE DATABASE

function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("Sunesis", 1);

    request.onupgradeneeded = (event) => {
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

    request.onsuccess = (event) => {
      db = event.target.result;
      resolve();
    };

    request.onerror = (event) => reject(event.target.error);
  });
}

// DATABASE FUNCTIONS

// ---- Topics ----
function createTopic(name) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("topics", "readwrite");
    const store = tx.objectStore("topics");

    const request = store.add({ name });

    request.onerror = () => {
      alert("Topic already exists.");
      reject(request.error);
    };

    tx.oncomplete = resolve;
    alert(`The topic "${name}" has been added succesfully!`);
  });
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
function addSlide(slide) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("slides", "readwrite");
    const store = tx.objectStore("slides");
    store.add(slide);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

function getSlidesByTopic(topicName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("slides", "readonly");
    const store = tx.objectStore("slides");
    const index = store.index("topic");
    const request = index.getAll(IDBKeyRange.only(topicName));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
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
  if (!confirm("Delete this slide?")) return;
  await deleteSlide(id);
  await displayAllTopics();
  await loadTopicsAdmin();
}

async function deleteSlidesFromTopicHandler(topicName) {
  if (!confirm(`Delete all slides from "${topicName}"?`)) return;
  await deleteSlidesByTopic(topicName);
  await displayAllTopics();
}

async function deleteTopicHandler(topicName) {
  if (!confirm(`Delete the topic "${topicName}" and all its slides?`)) return;

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
}

async function loadTopicsAdmin() {
  const topics = await getAllTopics();
  const select = document.getElementById("topicSelect");
  select.innerHTML = `<option value="">-- Choose a topic --</option>`;
  topics.forEach((topic) => {
    const opt = document.createElement("option");
    opt.value = topic.name;
    opt.textContent = topic.name;
    select.appendChild(opt);
  });
}

// Display All Topics

async function displayAllTopics() {
  const container = document.getElementById("slideContainer");
  const topics = await getAllTopics();
  container.innerHTML = "";

  for (const topic of topics) {
    const topicSlides = await getSlidesByTopic(topic.name);
    const topicDiv = document.createElement("div");
    topicDiv.classList.add("topic-section");

    topicDiv.innerHTML = `
      <h3>${topic.name}</h3>
      <button onclick="deleteTopicHandler('${topic.name}')">Delete Topic</button>
      <button onclick="deleteSlidesFromTopicHandler('${topic.name}')">Delete All Slides</button>
    `;

    if (topicSlides.length === 0) {
      topicDiv.innerHTML += `<p style="margin-left:15px;">No slides yet.</p>`;
    } else {
      topicSlides.forEach((slide) => {
        topicDiv.innerHTML += `
          <div class="slide-item" style="margin:8px 0;padding:8px;border:1.5px solid #ccc;border-radius:8px;">
            <h4>${slide.title}</h4>
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
            <button class="delete-slide-btn" data-id="${slide.id}">Delete Slide</button>
          </div>
        `;
      });
    }
    container.appendChild(topicDiv);
  }

  bindAdminActions();
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

  // ADMIN PAGE SEARCH (across ALL slides)
  if (isAdminPage) {
    const allSlides = await getAllSlides();

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
}

document.addEventListener("DOMContentLoaded", () => {
  const searchBtn = document.getElementById("searchBtn");
  const searchInput = document.getElementById("searchInput");
  if (searchBtn && searchInput) {
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
      <div style="border:1px solid #ccc; padding:10px; margin:8px; border-radius:8px;">
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
    await loadTopicsAdmin();
    displayAllTopics();

    // Create topic
    document
      .getElementById("createTopicBtn")
      .addEventListener("click", async () => {
        const name = document.getElementById("topicName").value.trim();
        if (!name) return alert("Please enter a topic name.");
        await createTopic(name);
        document.getElementById("topicName").value = "";
        await loadTopicsAdmin();
        displayAllTopics();
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

        if (!topic || !title)
          return alert("Please select a topic and enter a title.");

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
            await addSlide(slide);
            displayAllTopics();
            alert("Slide added successfully!");
          };
          reader.readAsDataURL(mediaFile);
        } else {
          await addSlide(slide);
          displayAllTopics();
          alert("Slide added successfully!");
        }

        document.getElementById("slide-title").value = "";
        document.getElementById("slide-desc").value = "";
        document.getElementById("slide-media").value = "";
      });

    // Delete all topics/slides
    document
      .getElementById("deleteAllBtn")
      .addEventListener("click", async () => {
        if (confirm("⚠ Delete ALL topics and slides? This cannot be undone.")) {
          await deleteAllTopicsAndSlides();
          await loadTopicsAdmin();
          displayAllTopics();
          alert("All topics and slides deleted.");
        }
      });
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
      <div class="slide-item" style="margin:8px;padding:8px;border:1px solid #ccc;border-radius:8px;">
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
      alert("Access denied. Please login.");
      window.location.href = "index.html";
      return;
    }

    /* ---------- DISPLAY USERNAME ---------- */
    const formattedName =
      activeUser.charAt(0).toUpperCase() + activeUser.slice(1);

    document.getElementById("loginUser").textContent = formattedName;

    await initDB();
    renderTopicCards();
  });
}

async function renderTopicCards() {
  const container = document.getElementById("topicsContainer");
  if (!container) return;

  const topics = await getAllTopics();
  container.innerHTML = "";

  if (topics.length === 0) {
    container.innerHTML = "<p>No topics available.</p>";
    return;
  }

  for (const topic of topics) {
    const slides = await getSlidesByTopic(topic.name);

    // Skip empty topics (optional – remove if you want empty topics visible)
    //  if (slides.length === 0) continue;

    const card = document.createElement("div");
    card.className = "topic-card";

    card.innerHTML = `
      <h3>${topic.name}</h3>
      <p>${slides.length} slide${slides.length > 1 ? "s" : ""}</p>
      <button onclick="openTopic('${topic.name}')">View</button>
    `;

    container.appendChild(card);
  }
}

function openTopic(topicName) {
  // Save globally
  localStorage.setItem("sunesis_selected_topic", topicName);

  // Navigate
  window.location.href = `slide-view.html?topic=${encodeURIComponent(topicName)}`;
}

// Protect pages (Access control)
/*function requireAuth() {
  if (!sessionStorage.getItem("sunesis_logged_in")) {
    window.location.replace("login.html");
  }
}
console.log("auth check");


if (!sessionStorage.getItem("sunesis_logged_in")) {
  window.location.href = "login.html";
}
*/

/* ---------- LOGOUT GUARD ---------- */
function logout() {
  sessionStorage.clear();
  localStorage.removeItem("sunesis_remember");
  localStorage.removeItem("sunesis_user");
  window.location.href = "index.html";
}

function renderPageSlides(list) {
  const slideContainer = document.querySelector(".js-slide-container");

  if (!slideContainer) return;

  if (!list.length) {
    slideContainer.innerHTML = "<p>No slides found.</p>";
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
      renderPageSlides(allSlidesCache);
    }

    function bindTopicSelection() {
      const select = document.getElementById("topicSelect");
      if (!select) return;

      select.addEventListener("change", async () => {
        const topicName = select.value;
        localStorage.setItem("sunesis_selected_topic", topicName); // sync to other pages
        if (!topicName) {
          renderPageSlides(allSlidesCache);
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