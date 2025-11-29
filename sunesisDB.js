// Menu Toggle function

function menuToggle() {
  const navLinks = document.getElementById('navLinks');

  if (navLinks) {
    navLinks.classList.toggle('show');
  }
}

// Topics functionality

const topicsMenu = document.getElementById("topicsMenu");
const topicsDropdown = document.querySelector(".topics-dropdown");

topicsMenu.addEventListener("click", (e) => {
  e.stopPropagation();
  topicsDropdown.style.display =
    topicsDropdown.style.display === "block" ? "none" : "block";
});

// Close dropdown when clicking outside
document.addEventListener("click", () => {
  topicsDropdown.style.display = "none";
});
