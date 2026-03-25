// UI TOGGLE
function showRegister() {
  loginBox.classList.add("hidden");
  registerBox.classList.remove("hidden");
}

function showLogin() {
  registerBox.classList.add("hidden");
  loginBox.classList.remove("hidden");
}

// Toggle password visibility
function togglePassword(inputId, icon) {
  const input = document.getElementById(inputId);

  if (input.type === "password") {
    input.type = "text";
    icon.classList.replace("fa-eye", "fa-eye-slash");
  } else {
    input.type = "password";
    icon.classList.replace("fa-eye-slash", "fa-eye");
  }
}

// live password validation
function validatePassword(password, prefix) {
  const lengthRule = document.getElementById(prefix + "-length");
  const upperRule = document.getElementById(prefix + "-uppercase");
  const numberRule = document.getElementById(prefix + "-number");

  // Length
  if (password.length >= 8) {
    lengthRule.classList.add("valid");
  } else {
    lengthRule.classList.remove("valid");
  }

  // Uppercase
  if (/[A-Z]/.test(password)) {
    upperRule.classList.add("valid");
  } else {
    upperRule.classList.remove("valid");
  }

  // Number
  if (/[0-9]/.test(password)) {
    numberRule.classList.add("valid");
  } else {
    numberRule.classList.remove("valid");
  }
}

//Event listeners for password typing
// REGISTER typing
regPass.addEventListener("input", () => {
  validatePassword(regPass.value, "reg");
});

// LOGIN typing
loginPass.addEventListener("input", () => {
  validatePassword(loginPass.value, "login");
});

// SECURITY
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// REGISTER
async function register() {
  const username = regUser.value.trim();
  const password = regPass.value;
  const confirmPassword = confirmPass.value;

  if (!username || !password || !confirmPassword) {
    showPopup("All fields are required", "error");
    return;
  }

  if (
    password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)
  ) {
    showPopup(
      "Password must be at least 8 characters, include a number and an uppercase letter.", "error",
    );
    return;
  }

  if (password !== confirmPassword) {
    showPopup("Passwords do not match!", "error");
    return;
  }

  const users = JSON.parse(localStorage.getItem("sunesis_users")) || {};

  if (users[username]) {
    showPopup("User already exists", "error");
    return;
  }

  users[username] = {
    password: await hashPassword(password),
  };

  localStorage.setItem("sunesis_users", JSON.stringify(users));

  showPopup("Registration successful. Please login.", "success");
  clearInputs(regUser, regPass, confirmPass);
  showLogin();
}

// LOGIN
async function login() {
  const username = loginUser.value.trim();
  const password = loginPass.value;

  const users = JSON.parse(localStorage.getItem("sunesis_users")) || {};

  if (!users[username]) {
    showPopup("Invalid username or password", "error");
    return;
  }

  const hash = await hashPassword(password);

  if (hash !== users[username].password) {
    showPopup("Invalid username or password", "error");
    return;
  }

  if (rememberMe.checked) {
    localStorage.setItem("sunesis_remember", "true");
    localStorage.setItem("sunesis_user", username);
  }

  sessionStorage.setItem("sunesis_logged_in", "true");
  sessionStorage.setItem("sunesis_user", username);

  showPopup("Login successful", "success");

  clearInputs(loginUser, loginPass);

  setTimeout(() => {
    window.location.href = "account.html";
  }, 900);
}

function scrollToAuth() {
  const target = document.getElementById("auth-section");
  if (!target) return;

  target.scrollIntoView({ behavior: "smooth", block: "center" });

  showRegister(); // switches UI automatically
}

// For 'enter' key pressing
// LOGIN - press Enter
/*  loginPass.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    login();
  }
});

loginUser.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    login();
  }
});

// REGISTER - press Enter
confirmPass.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    register();
  }
});

regPass.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    register();
  }
});

regUser.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    register();
  }
});
*/

// For 'Enter' key pressing
document.addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    // If login box is visible → login
    if (!loginBox.classList.contains("hidden")) {
      login();
    }

    // If register box is visible → register
    else if (!registerBox.classList.contains("hidden")) {
      register();
    }
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

// Function to clear inputs
function clearInputs(...inputs) {
  inputs.forEach(input => input.value = "");
}
