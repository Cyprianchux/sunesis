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

// Detect page type
const isAdminPage = window.location.pathname.includes("slide-admin.html");

const isViewPage = window.location.pathname.includes("slide-view.html");


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

async function deleteSlideHandler(slideId) {
  if (!confirm("Delete this slide?")) return;
  await deleteSlide(slideId);
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
            <p>${slide.desc}</p>
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
    bindAdminActions();
  }
}

// COMMON SEARCH FUNCTIONALITY

function performSearch() {
  const searchInput = document.getElementById("searchInput");
  if (!searchInput) return;

  const term = searchInput.value.trim().toLowerCase();
  if (!term) {
    if (isViewPage) displayCurrentSlide();
    if (isAdminPage) displayAllTopics();
    return;
  }

  const filtered = slides.filter(
    (s) =>
      s.title?.toLowerCase().includes(term) ||
      s.desc?.toLowerCase().includes(term) ||
      s.topic?.toLowerCase().includes(term)
  );

  if (isViewPage) {
    displayFilteredSlides(filtered);
  } else if (isAdminPage) {
    displayFilteredAdminSlides(filtered);
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

// VIEW PAGE (slide-admin.html) 
if (isViewPage) {
  document.addEventListener("DOMContentLoaded", async () => {
    await initDB();
    await loadTopicsView();

    const topicDropdown = document.getElementById("topicDropdown");
    const prevBtn = document.getElementById("prevArrow");
    const nextBtn = document.getElementById("nextArrow");

    topicDropdown.addEventListener("change", async (e) => {
      const topicName = e.target.value;
      if (topicName) {
        slides = await getSlidesByTopic(topicName);
        currentSlideIndex = 0;
        displayCurrentSlide();
      } else {
        slides = [];
        document.getElementById("slideDisplay").innerHTML =
          '<p style="text-align:center; font-weight:bold;">Select a topic to view slides</p>';
      }
      updateButtons();
    });

    prevBtn.addEventListener("click", () => {
      if (currentSlideIndex > 0) {
        currentSlideIndex--;
        displayCurrentSlide();
      }
      updateButtons();
    });

    nextBtn.addEventListener("click", () => {
      if (currentSlideIndex < slides.length - 1) {
        currentSlideIndex++;
        displayCurrentSlide();
      }
      updateButtons();
    });
  });

  async function loadTopicsView() {
    const topics = await getAllTopics();
    const dropdown = document.getElementById("topicDropdown");
    dropdown.innerHTML = `<option value="">-- Choose a topic --</option>`;
    topics.forEach((topic) => {
      const opt = document.createElement("option");
      opt.value = topic.name;
      opt.textContent = topic.name;
      dropdown.appendChild(opt);
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
      <div class="slide-content" style="text-align: center;">
        <h3>${slide.title}</h3>
        <p>${slide.desc}</p>
        ${mediaHTML}
        <p style="margin-top:10px;">Slide ${currentSlideIndex + 1} of ${slides.length}</p>
      </div>
    `;
  }

  function displayFilteredSlides(filteredSlides) {
    const display = document.getElementById("slideDisplay");
    if (filteredSlides.length === 0) {
      display.innerHTML = `<p style="text-align:center;">No results found.</p>`;
      return;
    }

    display.innerHTML = filteredSlides
      .map(
        (s) => `
        <div style="border:1px solid #ccc; padding:10px; margin:8px; border-radius:8px;">
          <h4>${s.title}</h4>
          <p>${s.desc}</p>
          ${
            s.media
              ? s.type === "image"
                ? `<img src="${s.media}" width="200">`
                : `<video src="${s.media}" width="250" controls></video>`
              : ""
          }
        </div>`
      )
      .join("");
  }

  function updateButtons() {
    const prev = document.getElementById("prevSlideBtn");
    const next = document.getElementById("nextSlideBtn");
    prev.disabled = currentSlideIndex === 0 || slides.length === 0;
    next.disabled = currentSlideIndex === slides.length - 1 || slides.length === 0;
  }
}

// ADMIN PAGE (slide-admin.html) 
if (isAdminPage) {
  document.addEventListener("DOMContentLoaded", async () => {
    await initDB();
    await loadTopicsAdmin();
    displayAllTopics();

    // Create topic
    document.getElementById("createTopicBtn").addEventListener("click", async () => {
      const name = document.getElementById("topicName").value.trim();
      if (!name) return alert("Please enter a topic name.");
      await createTopic(name);
      document.getElementById("topicName").value = "";
      await loadTopicsAdmin();
      displayAllTopics();
    });

    // Add slide
    document.getElementById("addSlideBtn").addEventListener("click", async () => {
      const topic = document.getElementById("topicSelect").value;
      const title = document.getElementById("slide-title").value.trim();
      const desc = document.getElementById("slide-desc").value.trim();
      const mediaFile = document.getElementById("slide-media").files[0] || null;

      if (!topic || !title) return alert("Please select a topic and enter a title.");

      const slide = { topic, title, desc, type: mediaFile ? mediaFile.type.split("/")[0] : "text" };

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
    document.getElementById("deleteAllBtn").addEventListener("click", async () => {
      if (confirm("⚠ Delete ALL topics and slides? This cannot be undone.")) {
        await deleteAllTopicsAndSlides();
        await loadTopicsAdmin();
        displayAllTopics();
        alert("All topics and slides deleted.");
      }
    });
  });

  

  function bindAdminActions() {
    document.querySelectorAll(".delete-slide-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = Number(btn.dataset.id);
      });
    });
  }

  bindAdminActions();

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
          <p>${s.desc}</p>
          ${
            s.media
              ? s.type === "image"
                ? `<img src="${s.media}" width="120">`
                : `<video src="${s.media}" width="160" controls></video>`
              : ""
          }
        </div>`
      )
      .join("");
  }



  