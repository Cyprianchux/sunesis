
const boardScreen = document.getElementById("boardScreen");

const saveBoardBtn = document.getElementById("saveBoardBtn");
const deleteLastBtn = document.getElementById("deleteLastBtn");
const clearAllBtn = document.getElementById("clearAllBtn");

const lightToggleBtn = document.getElementById("lightToggleBtn");
const fontIncreaseBtn = document.getElementById("fontIncreaseBtn");
const fontDecreaseBtn = document.getElementById("fontDecreaseBtn");

const alignLeftBtn = document.getElementById("alignLeftBtn");
const alignCenterBtn = document.getElementById("alignCenterBtn");

let boardEntries = JSON.parse(localStorage.getItem("sunesisWordBoard")) || [];

let fontSize = parseInt(localStorage.getItem("sunesisWordFontSize")) || 55;
let isLightMode = localStorage.getItem("sunesisWordLightMode") === "true";

let currentLoadedIndex = null;


// APPLY SETTINGS

function applySettings() {
  boardScreen.style.fontSize = fontSize + "px";

  if (isLightMode) {
    boardScreen.classList.add("light-mode");
  } else {
    boardScreen.classList.remove("light-mode");
  }
}


// LOAD SAVED CONTENT

function loadBoard() {
  if (boardEntries.length > 0) {
    boardScreen.innerText = boardEntries.join("\n\n");
  } else {
    boardScreen.innerText = "";
  }
}


// SAVE CONTENT (Enter button)

function saveBoard() {
  const currentText = boardScreen.innerText.trim();
  if (!currentText) return;

  boardEntries.push(currentText);

  localStorage.setItem("sunesisWordBoard", JSON.stringify(boardEntries));

  refreshSavedList();
}

function confirmSave() {
  const currentText = boardScreen.innerText.trim();
  if (!currentText) return;

  if (confirm("Save this write-up?")) {
    saveBoard();
    showPopup("Write-up saved successfully!", "info");
  }
}

saveBoardBtn.addEventListener("click", () => {
  confirmSave();
});


// SHIFT + ENTER = SAVE
// ENTER = NEW LINE

boardScreen.addEventListener("keydown", (e) => {
  handleAutoBullet(e);

  // If Shift + Enter, save the board instead of adding a new line
  if (e.key === "Enter" && e.shiftKey) {
    e.preventDefault();
    confirmSave();
  }
});

// Load saved write-ups into dropdown

const savedNotesSelect = document.getElementById("savedNotesSelect");

function refreshSavedList() {
  savedNotesSelect.innerHTML = `<option value="">-- Load Write-ups --</option>`;

  boardEntries.forEach((entry, index) => {
    const option = document.createElement("option");
    option.value = index;

    // Show first 30 chars as preview title
    option.textContent = entry.substring(0, 30) + (entry.length > 30 ? "..." : "");
    savedNotesSelect.appendChild(option);
  });
}

savedNotesSelect.addEventListener("change", () => {
  const index = savedNotesSelect.value;
  if (index === "") return;

  currentLoadedIndex = parseInt(index);
  boardScreen.innerText = boardEntries[currentLoadedIndex];
  boardScreen.focus();
});


// DELETE LAST SAVED ENTRY

deleteLastBtn.addEventListener("click", () => {
  if (boardEntries.length === 0) {
    showPopup("No saved write-ups found.", "info");
    return;
  }

  let indexToDelete;

  // If user loaded something, delete that one
  if (currentLoadedIndex !== null) {
    indexToDelete = currentLoadedIndex;
  } else {
    // Otherwise delete last
    indexToDelete = boardEntries.length - 1;
  }

  if (confirm("Delete the last saved write-up?")) {
    boardEntries.splice(indexToDelete, 1);
    localStorage.setItem("sunesisWordBoard", JSON.stringify(boardEntries));

    currentLoadedIndex = null;
    boardScreen.innerText = "";

    refreshSavedList();
    showPopup("Deleted successfully!", "info");
  }
});

// CLEAR ALL
clearAllBtn.addEventListener("click", () => {
  if (confirm("Clear all saved write-ups permanently?")) {
    boardEntries = [];
    localStorage.removeItem("sunesisWordBoard");

    currentLoadedIndex = null;
    boardScreen.innerText = "";

    refreshSavedList();
    showPopup("All saved write-ups cleared!", "info");
  }
});


// LIGHT MODE TOGGLE

lightToggleBtn.addEventListener("click", () => {
  isLightMode = !isLightMode;
  localStorage.setItem("sunesisWordLightMode", isLightMode);
  applySettings();
});


// FONT SIZE CONTROLS

fontIncreaseBtn.addEventListener("click", () => {
  fontSize += 5;
  localStorage.setItem("sunesisWordFontSize", fontSize);
  applySettings();
});

fontDecreaseBtn.addEventListener("click", () => {
  if (fontSize > 20) {
    fontSize -= 5;
    localStorage.setItem("sunesisWordFontSize", fontSize);
    applySettings();
  }
});


// ALIGNMENT (works like MS Word)

/*
alignLeftBtn.addEventListener("click", () => {
  document.execCommand("justifyLeft", false, null);
  boardScreen.focus();
});

alignCenterBtn.addEventListener("click", () => {
  document.execCommand("justifyCenter", false, null);
  boardScreen.focus();
});
*/

alignLeftBtn.addEventListener("click", () => {
  alignSelection("left");
  boardScreen.focus();
});

alignCenterBtn.addEventListener("click", () => {
  alignSelection("center");
  boardScreen.focus();
});

// Modern alignment helper function
function alignSelection(alignment) {
  const selection = window.getSelection();
  if (!selection.rangeCount) return;

  const range = selection.getRangeAt(0);

  // If no selection, apply alignment to entire editor
  if (selection.isCollapsed) {
    boardScreen.style.textAlign = alignment;
    return;
  }

  // Wrap selected text in a span
  const span = document.createElement("span");
  span.style.display = "inline-block";
  span.style.width = "100%";
  span.style.textAlign = alignment;

  span.appendChild(range.extractContents());
  range.insertNode(span);

  selection.removeAllRanges();
}

// Bullet Points (Inserted manually at cursor position)
function insertBulletPoint() {
  const selection = window.getSelection();
  if (!selection.rangeCount) return;

  const range = selection.getRangeAt(0);

  const bullet = document.createTextNode("• ");
  range.insertNode(bullet);

  // Move cursor after bullet
  range.setStartAfter(bullet);
  range.setEndAfter(bullet);

  selection.removeAllRanges();
  selection.addRange(range);

  boardScreen.focus();
}

const bulletBtn = document.getElementById("bulletBtn");

bulletBtn.addEventListener("click", () => {
  insertBulletPoint();
});

function handleAutoBullet(e) {
  if (e.key !== "Enter" || e.shiftKey) return;

  const selection = window.getSelection();
  if (!selection.rangeCount) return;

  const range = selection.getRangeAt(0);

  // Get text before cursor in current line
  const textBeforeCursor = range.startContainer.textContent?.substring(0, range.startOffset) || "";

  // If current line contains bullet "•"
  if (textBeforeCursor.trim().startsWith("•")) {
    setTimeout(() => {
      insertBulletPoint();
    }, 0);
  }
}



// INIT

applySettings();
loadBoard();
refreshSavedList();