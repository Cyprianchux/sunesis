const boardInput = document.getElementById("boardInput");
const boardScreen = document.getElementById("boardScreen");
const boardPlaceholder = document.getElementById("boardPlaceholder");

const addBoardBtn = document.getElementById("addBoardBtn");
const deleteLastBtn = document.getElementById("deleteLastBtn");
const clearAllBtn = document.getElementById("clearAllBtn");

let boardEntries = JSON.parse(localStorage.getItem("sunesisBoard")) || [];

// Render board
function renderBoard() {
  boardScreen.innerHTML = "";

  if (boardEntries.length === 0 && boardInput.value.trim() === "") {
    boardScreen.appendChild(boardPlaceholder);
    boardPlaceholder.style.display = "block";
    return;
  }

  boardPlaceholder.style.display = "none";

  // Render saved entries
  boardEntries.forEach((text, index) => {
    const line = document.createElement("div");
    line.className = "board-line";
    line.textContent = text;
    line.dataset.index = index;

    line.addEventListener("click", () => {
      if (confirm("Delete this line?")) {
        boardEntries.splice(index, 1);
        saveBoard();
        renderBoard();
      }
    });

    boardScreen.appendChild(line);
  });

  // Render live typing preview (not saved yet)
  if (boardInput.value.trim() !== "") {
    const preview = document.createElement("div");
    preview.className = "board-preview";
    preview.textContent = boardInput.value;
    boardScreen.appendChild(preview);
  }

  boardScreen.scrollTop = boardScreen.scrollHeight;
}

// Save board
function saveBoard() {
  localStorage.setItem("sunesisBoard", JSON.stringify(boardEntries));
}

// Live preview typing
boardInput.onkeyup = function () {
  renderBoard();
};

// Add text permanently
function addToBoard() {
  const text = boardInput.value.trim();
  if (!text) return;

  boardEntries.push(text);
  saveBoard();
  renderBoard();

  boardInput.value = "";
  renderBoard();
  boardInput.focus();
}

addBoardBtn.addEventListener("click", addToBoard);

// Press Enter to submit (Shift+Enter allows newline)
boardInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    addToBoard();
  }
});

// Delete last entry
deleteLastBtn.addEventListener("click", () => {
  if (boardEntries.length === 0) return;

  boardEntries.pop();
  saveBoard();
  renderBoard();
});

// Clear all
clearAllBtn.addEventListener("click", () => {
  if (confirm("Clear the entire board?")) {
    boardEntries = [];
    saveBoard();
    renderBoard();
  }
});

// Initial render
renderBoard();