const crypto = require("crypto");

const TEST_JWT_SECRET = "test-jwt-secret-key-for-unit-tests-only";
const TEST_SUPABASE_URL = "https://test.supabase.co";
const TEST_SUPABASE_KEY = "test-service-role-key";

const db = {
  users: new Map(),
  topics: new Map(),
  slides: new Map(),
};

function hashPassword(password) {
  return crypto.createHash("sha256").update(password, "utf8").digest("hex");
}

function resetMockDb() {
  db.users.clear();
  db.topics.clear();
  db.slides.clear();
}

function seedMockUser(username, password, role = "user") {
  const normalized = String(username).trim().toLowerCase();
  db.users.set(normalized, {
    username: normalized,
    password_hash: hashPassword(password),
    role,
    created_at: new Date().toISOString(),
  });
}

function seedMockTopic(name, creator) {
  db.topics.set(name, {
    name,
    creator,
    created_at: new Date().toISOString(),
  });
}

function seedMockSlide(topic, title, creator, overrides = {}) {
  const id = db.slides.size + 1;
  const slide = {
    id,
    topic,
    title,
    description: overrides.desc || overrides.description || "",
    media: overrides.media || "",
    type: overrides.type || "text",
    creator,
    created_at: new Date().toISOString(),
  };
  db.slides.set(id, slide);
  return slide;
}

function createMockSupabaseClient() {
  let slideIdCounter = 1;

  function from(table) {
    return new QueryBuilder(table);
  }

  class QueryBuilder {
    constructor(table) {
      this.table = table;
      this.filters = [];
      this.orderField = null;
      this.orderAsc = true;
      this._selectFields = [];
      this._single = false;
      this._maybeSingle = false;
      this._deleteMode = false;
      this._insertData = null;
      this._notNullFilter = null;
    }

    select(fields) {
      this._selectFields =
        typeof fields === "string" ? fields.split(",").map((s) => s.trim()) : fields;
      return this;
    }

    eq(field, value) { this.filters.push({ field, op: "eq", value }); return this; }
    not(field, op, value) { this._notNullFilter = { field, op, value }; return this; }
    order(field, opts) { this.orderField = field; this.orderAsc = opts?.ascending ?? true; return this; }
    single() { this._single = true; return this; }
    maybeSingle() { this._maybeSingle = true; return this; }
    insert(data) { this._insertData = Array.isArray(data) ? data : [data]; this._deleteMode = false; return this; }
    delete() { this._deleteMode = true; return this; }

    _getStore() {
      if (this.table === "users") return db.users;
      if (this.table === "topics") return db.topics;
      if (this.table === "slides") return db.slides;
      return new Map();
    }

    _applyFilters(items) {
      return items.filter((item) =>
        this.filters.every(({ field, op, value }) => {
          if (op === "eq") return item[field] === value;
          return true;
        })
      );
    }

    _project(item) {
      if (!item) return item;
      if (!this._selectFields || this._selectFields.length === 0) return item;
      const out = {};
      for (const f of this._selectFields) {
        if (f in item) out[f] = item[f];
      }
      return out;
    }

    async execute() {
      const store = this._getStore();

      if (this._deleteMode) {
        if (this._notNullFilter) {
          store.clear();
        } else {
          const toDelete = this._applyFilters([...store.values()]);
          const deleteKeys = new Set(toDelete.map((item) => {
            for (const [key, val] of store) {
              if (val === item) return key;
            }
            return null;
          }));
          for (const key of deleteKeys) {
            if (key !== null) store.delete(key);
          }
        }
        return { data: null, error: null };
      }

      if (this._insertData) {
        const results = [];
        for (const item of this._insertData) {
          if (this.table === "slides") {
            const newItem = { ...item, id: slideIdCounter++, created_at: new Date().toISOString() };
            db.slides.set(newItem.id, newItem);
            results.push(newItem);
          } else if (this.table === "users") {
            if (db.users.has(item.username)) {
              return { data: null, error: { code: "23505", message: "Unique violation" } };
            }
            const newItem = { ...item, created_at: item.created_at || new Date().toISOString() };
            db.users.set(item.username, newItem);
            results.push(newItem);
          } else if (this.table === "topics") {
            if (db.topics.has(item.name)) {
              return { data: null, error: { code: "23505", message: "Unique violation" } };
            }
            const newItem = { ...item, created_at: item.created_at || new Date().toISOString() };
            db.topics.set(item.name, newItem);
            results.push(newItem);
          } else {
            results.push(item);
          }
        }
        const projected = results.map((r) => this._project(r));
        if (this._single || this._maybeSingle) return { data: projected[0] || null, error: null };
        return { data: projected, error: null };
      }

      let items = [...store.values()];
      items = this._applyFilters(items);

      if (this.orderField) {
        items.sort((a, b) => {
          const aVal = a[this.orderField];
          const bVal = b[this.orderField];
          return this.orderAsc ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
        });
      }

      const projected = items.map((r) => this._project(r));
      if (this._single) return { data: projected[0] || null, error: null };
      if (this._maybeSingle) return { data: projected[0] || null, error: null };
      return { data: projected, error: null };
    }

    then(resolve, reject) {
      return this.execute().then(resolve, reject);
    }
  }

  return { from };
}

module.exports = {
  createMockSupabaseClient,
  resetMockDb,
  seedMockUser,
  seedMockTopic,
  seedMockSlide,
  hashPassword,
  db,
  TEST_JWT_SECRET,
  TEST_SUPABASE_URL,
  TEST_SUPABASE_KEY,
};