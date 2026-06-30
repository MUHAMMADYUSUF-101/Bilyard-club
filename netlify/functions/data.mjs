import { getStore } from "@netlify/blobs";

const STORE_NAME = "bilyard-club";
const STATE_KEY = "state";
const MAX_TOKENS = 60;

const FIXED_USERNAME = "bilyardclub1";
const FIXED_PASSWORD = "bilyardklub2";

function randomToken() {
  return (
    Math.random().toString(36).slice(2) +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2)
  );
}

function json(status, body) {
  return {
    statusCode: status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

async function loadState(store) {
  const data = await store.get(STATE_KEY, { type: "json" });
  if (data) return data;
  const initial = { tokens: [], tables: [], sessions: [] };
  await store.setJSON(STATE_KEY, initial);
  return initial;
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return json(200, { ok: true });
  }

  const store = getStore(STORE_NAME);
  const state = await loadState(store);

  let body = {};
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch (e) {
    body = {};
  }

  const action = body.action;

  function isValidToken(token) {
    return !!token && state.tokens.includes(token);
  }

  try {
    if (action === "login") {
      const { username, password } = body;
      if (username === FIXED_USERNAME && password === FIXED_PASSWORD) {
        const token = randomToken();
        state.tokens.push(token);
        if (state.tokens.length > MAX_TOKENS) {
          state.tokens = state.tokens.slice(-MAX_TOKENS);
        }
        await store.setJSON(STATE_KEY, state);
        return json(200, { ok: true, token, username: FIXED_USERNAME });
      }
      return json(401, { ok: false, error: "Login yoki parol noto'g'ri" });
    }

    if (action === "logout") {
      const { token } = body;
      state.tokens = state.tokens.filter((t) => t !== token);
      await store.setJSON(STATE_KEY, state);
      return json(200, { ok: true });
    }

    if (action === "getState") {
      if (!isValidToken(body.token)) return json(401, { ok: false, error: "unauthorized" });
      return json(200, {
        ok: true,
        tables: state.tables,
        sessions: state.sessions,
        username: FIXED_USERNAME,
      });
    }

    if (action === "save") {
      if (!isValidToken(body.token)) return json(401, { ok: false, error: "unauthorized" });
      if (!Array.isArray(body.tables) || !Array.isArray(body.sessions)) {
        return json(400, { ok: false, error: "Noto'g'ri ma'lumot formati" });
      }
      state.tables = body.tables;
      state.sessions = body.sessions;
      await store.setJSON(STATE_KEY, state);
      return json(200, { ok: true });
    }

    return json(400, { ok: false, error: "Noma'lum amal" });
  } catch (err) {
    return json(500, { ok: false, error: String((err && err.message) || err) });
  }
};

