const USERS_KEY = 'spacecraft-auth-users';
const SESSION_KEY = 'spacecraft-auth-session';

function readUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  return !!getCurrentUser();
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export function registerAndLogin({ username, password }) {
  const normalizedUsername = String(username || '').trim().toLowerCase();
  const normalizedPassword = String(password || '').trim();

  if (!normalizedUsername || !normalizedPassword) {
    return { success: false, error: 'Username and password are required.' };
  }

  const users = readUsers();
  const exists = users.some((user) => user.username === normalizedUsername);

  if (exists) {
    return { success: false, error: 'User already exists. Please login instead.' };
  }

  const newUser = {
    id: `user-${Date.now()}`,
    username: normalizedUsername,
    password: normalizedPassword,
    createdAt: new Date().toISOString()
  };

  writeUsers([newUser, ...users]);

  const session = {
    id: newUser.id,
    username: newUser.username,
    loggedInAt: new Date().toISOString()
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));

  return { success: true, user: session };
}

export function login({ username, password }) {
  const normalizedUsername = String(username || '').trim().toLowerCase();
  const normalizedPassword = String(password || '').trim();

  if (!normalizedUsername || !normalizedPassword) {
    return { success: false, error: 'Username and password are required.' };
  }

  const users = readUsers();
  const found = users.find(
    (user) => user.username === normalizedUsername && user.password === normalizedPassword
  );

  if (!found) {
    return { success: false, error: 'Invalid username or password.' };
  }

  const session = {
    id: found.id,
    username: found.username,
    loggedInAt: new Date().toISOString()
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return { success: true, user: session };
}
