(function () {
  const apiBase = window.SUNESIS_API_URL || `${window.location.origin}/api/server`;

  async function request(path, options = {}) {
    const token =
      sessionStorage.getItem("sunesis_token") ||
      localStorage.getItem("sunesis_token");
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;

    let response;
    try {
      response = await fetch(`${apiBase}${path}`, { ...options, headers });
    } catch {
      throw new Error("Offline");
    }

    let body = {};
    try {
      body = await response.json();
    } catch {
      body = {};
    }
    if (!response.ok) throw new Error(body.message || `Request failed (${response.status})`);
    return body;
  }

  function saveRemoteSession(user, token, remember) {
    sessionStorage.setItem("sunesis_token", token);
    sessionStorage.setItem("sunesis_role", user.role);
    if (remember) {
      localStorage.setItem("sunesis_token", token);
      localStorage.setItem("sunesis_role", user.role);
    } else {
      localStorage.removeItem("sunesis_token");
      localStorage.removeItem("sunesis_role");
    }
  }

  window.remoteRegister = async (username, password, role) =>
    request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password, role }),
    });

  window.remoteLogin = (username, password) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });

  window.remoteRegisterLocalUser = (username, passwordHash, role) =>
    request("/auth/register-local", {
      method: "POST",
      body: JSON.stringify({ username, passwordHash, role }),
    });

  window.remoteFetchTopics = () => request("/topics");
  window.remoteCreateTopic = (name) =>
    request("/topics", { method: "POST", body: JSON.stringify({ name }) });
  window.remoteDeleteTopic = (name) =>
    request(`/topics/${encodeURIComponent(name)}`, { method: "DELETE" });

  window.remoteFetchSlides = (topic) =>
    request(`/slides${topic ? `?topic=${encodeURIComponent(topic)}` : ""}`);
  window.remoteCreateSlide = (slide) =>
    request("/slides", {
      method: "POST",
      body: JSON.stringify({
        topic: slide.topic,
        title: slide.title,
        description: slide.description ?? slide.desc ?? "",
        media: slide.media || "",
        type: slide.type || "text",
      }),
    });
  window.remoteDeleteSlide = (id) =>
    request(`/slides/${encodeURIComponent(id)}`, { method: "DELETE" });
  window.remoteDeleteSlidesByTopic = (name) =>
    request(`/topics/${encodeURIComponent(name)}/slides`, { method: "DELETE" });
  window.remoteDeleteAll = () => request("/all", { method: "DELETE" });
  window.saveRemoteSession = saveRemoteSession;
})();
