/* ---------- SHARED AUTH HELPERS ---------- */
function getActiveUser() {
  const sessionUser = sessionStorage.getItem("sunesis_user");
  const rememberUser = localStorage.getItem("sunesis_user");
  const isRemembered = localStorage.getItem("sunesis_remember");

  return sessionUser || (isRemembered ? rememberUser : null);
}

function logout() {
  sessionStorage.clear();
  localStorage.removeItem("sunesis_remember");
  localStorage.removeItem("sunesis_user");
  localStorage.removeItem("sunesis_token");
  localStorage.removeItem("sunesis_role");
  window.location.href = "index.html";
}

// Loading state management
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

// Reset validation colors to red (remove "valid" class)
function resetValidationColors(prefix) {
  const lengthRule = document.getElementById(prefix + "-length");
  const upperRule = document.getElementById(prefix + "-uppercase");
  const numberRule = document.getElementById(prefix + "-number");

  [lengthRule, upperRule, numberRule].forEach(rule => {
    if (rule) rule.classList.remove("valid");
  });
}

// Reset all validation colors for both register and login
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

function warnLocalOnlyMode(message) {
  setLocalOnlyMode(true);
  showPopup(message, "info");
}

async function saveLocalUser(username, password, role) {
  const users = JSON.parse(localStorage.getItem("sunesis_users")) || {};
  users[username] = {
    password: await hashPassword(password),
    role,
  };
  localStorage.setItem("sunesis_users", JSON.stringify(users));
}

function resetAllValidationColors() {
  resetValidationColors("reg");
  resetValidationColors("login");
}

//Event listeners for password typing
// REGISTER typing
regPass.addEventListener("input", () => {
  validatePassword(regPass.value, "reg");
});

confirmPass.addEventListener("input", () => {
  validatePassword(confirmPass.value, "reg");
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
  const username = regUser.value.trim().toLowerCase();
  const password = regPass.value;
  const confirmPassword = confirmPass.value;
  const registerBtn = document.querySelector("#registerBox button");

  if (!username || !password || !confirmPassword) {
    showPopup("All fields are required", "error");
    return;
  }

  if (
    password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)
  ) {
    showPopup(
      "Password must be at least 8 characters, include a number and an uppercase letter.", "info",
    );
    return;
  }

  if (password !== confirmPassword) {
    showPopup("Passwords do not match!", "error");
    clearInputs(regUser, regPass, confirmPass);

    return;
  }

  const role = "user";
  const users = JSON.parse(localStorage.getItem("sunesis_users")) || {};

  if (users[username]) {
    showPopup("User already exists", "error");
    return;
  }

  setButtonLoading(registerBtn, true);

  if (isOnline()) {
    try {
      await remoteRegister(username, password, role);
      setLocalOnlyMode(false);
      showPopup("Registration successful. Please login.", "success");
      clearInputs(regUser, regPass, confirmPass);
      setButtonLoading(registerBtn, false);
      showLogin();
      return;
    } catch (error) {
      if (error.message.includes("User already exists")) {
        showPopup(error.message, "error");
        setButtonLoading(registerBtn, false);
        return;
      }
      // Remote registration failed - fall through to local-only mode
      console.log("Remote registration failed:", error.message);
    }
  }

  // If remote failed or offline, save locally immediately (don't wait)
  await saveLocalUser(username, password, role);
  warnLocalOnlyMode(
    "Local-only mode active: the account was saved in this browser only and will not sync across devices until the connection returns.",
  );
  showPopup("Registration successful. Please login.", "success");
  clearInputs(regUser, regPass, confirmPass);
  setButtonLoading(registerBtn, false);
  showLogin();
}

// LOGIN
async function login() {
  const username = loginUser.value.trim().toLowerCase();
  const password = loginPass.value;
  const loginBtn = document.querySelector("#loginBox button");

  const users = JSON.parse(localStorage.getItem("sunesis_users")) || {};
  const hash = await hashPassword(password);
  let remoteLoginFailed = false;

  setButtonLoading(loginBtn, true);

  if (isOnline()) {
    try {
      const response = await remoteLogin(username, password);
      saveRemoteSession(response.user, response.token, rememberMe.checked);
      setLocalOnlyMode(false);
      if (rememberMe.checked) {
        localStorage.setItem("sunesis_remember", "true");
        localStorage.setItem("sunesis_user", username);
      }
      sessionStorage.setItem("sunesis_logged_in", "true");
      sessionStorage.setItem("sunesis_user", username);

      showPopup("Login successful", "success");
      clearInputs(loginUser, loginPass);
      setTimeout(() => {
        window.location.href = "frontend/account.html";
      }, 900);
      return;
    } catch (error) {
      remoteLoginFailed = true;
      if (error.message !== "Offline") {
        console.log("Remote login failed, checking local storage immediately:", error.message);
      }
    }
  }

  // Check local credentials immediately (no 8-second wait)
  if (!users[username] || hash !== users[username].password) {
    showPopup("Invalid username or password", "error");
    clearInputs(loginUser, loginPass);
    setButtonLoading(loginBtn, false);
    return;
  }

  // Local credentials are valid
  if (rememberMe.checked) {
    localStorage.setItem("sunesis_remember", "true");
    localStorage.setItem("sunesis_user", username);
    localStorage.setItem("sunesis_role", users[username].role);
  }

  sessionStorage.setItem("sunesis_logged_in", "true");
  sessionStorage.setItem("sunesis_user", username);
  sessionStorage.setItem("sunesis_role", users[username].role);

  if (remoteLoginFailed) {
    warnLocalOnlyMode(
      "Local-only mode active: using this browser's saved account. Changes will not sync across devices until the connection returns.",
    );
  }

  showPopup("Login successful", "success");
  clearInputs(loginUser, loginPass);

  setTimeout(() => {
    window.location.href = "frontend/account.html";
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

    clearInputs(loginUser, loginPass, regUser, regPass, confirmPass);
  }
});

// Onscreen popup for 5 seconds
function showPopup(message, type = "info") {
  const popup = document.getElementById("popup");

  popup.textContent = message;
  popup.className = `popup show ${type}`;

  // Reset validation colors if error popup
  if (type === "error") {
    resetAllValidationColors();
  }

  setTimeout(() => {
    popup.classList.remove("show");
  },5000);
}

// Function to clear inputs
function clearInputs(...inputs) {
  inputs.forEach(input => input.value = "");
}

function isOnline() {
  return navigator.onLine;
}