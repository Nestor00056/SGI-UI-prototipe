/*
 * Contexto compartido de la aplicación SGI.
 * sessionStorage: sesión simulada de la pestaña actual.
 * localStorage: preferencias que deben conservarse entre visitas.
 */
(function (global) {
  "use strict";

  global.SGI = global.SGI || {};

  const SESSION_KEY = "sgi.session.v1";
  const PREFERENCES_KEY = "sgi.preferences.v1";
  const USER_PROFILES_KEY = "sgi.userProfiles.v1";
  let memorySession = null;
  const memoryCollections = Object.create(null);

  const defaultPreferences = Object.freeze({
    theme: "light",
    interfaceSize: "medium"
  });

  function getStorage(storageName) {
    try {
      return global[storageName] || null;
    } catch (error) {
      return null;
    }
  }

  function parseStoredValue(storage, key) {
    if (!storage) return null;
    try {
      const rawValue = storage.getItem(key);
      return rawValue ? JSON.parse(rawValue) : null;
    } catch (error) {
      return null;
    }
  }

  function writeStoredValue(storage, key, value) {
    if (!storage) return false;
    try {
      storage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  function getUserProfile(userId) {
    if (typeof userId !== "string" || !userId.trim()) return null;

    const mockData = global.SGI.mockData || {};
    const authUser = Array.isArray(mockData.users)
      ? mockData.users.find(function (user) { return user.id === userId; })
      : null;
    const directoryUser = Array.isArray(mockData.userDirectory)
      ? mockData.userDirectory.find(function (user) { return user.id === userId; })
      : null;
    const baseUser = Object.assign({}, directoryUser || {}, authUser || {});
    if (!baseUser.id) return null;

    const overrides = parseStoredValue(getStorage("sessionStorage"), USER_PROFILES_KEY) || {};
    const override = overrides[userId] && typeof overrides[userId] === "object" ? overrides[userId] : {};
    return Object.freeze(Object.assign({}, baseUser, override));
  }

  function saveUserProfileOverride(userId, changes) {
    const storage = getStorage("sessionStorage");
    if (!storage) return false;

    const overrides = parseStoredValue(storage, USER_PROFILES_KEY) || {};
    const current = overrides[userId] && typeof overrides[userId] === "object" ? overrides[userId] : {};
    const next = Object.assign({}, overrides, {
      [userId]: Object.assign({}, current, changes)
    });
    return writeStoredValue(storage, USER_PROFILES_KEY, next);
  }

  function createSession(user) {
    if (!user || !user.id || !user.role) {
      throw new TypeError("No se puede crear una sesión sin un usuario y un rol válidos.");
    }

    const currentProfile = getUserProfile(user.id) || user;
    const mergedUser = Object.assign({}, user, currentProfile);

    // Nunca se guarda la contraseña dentro del objeto de sesión.
    const session = {
      userId: mergedUser.id,
      name: mergedUser.name,
      email: mergedUser.email,
      role: mergedUser.role,
      roleLabel: mergedUser.roleLabel,
      status: mergedUser.status || "active",
      startedAt: new Date().toISOString()
    };

    memorySession = session;
    writeStoredValue(getStorage("sessionStorage"), SESSION_KEY, session);
    return Object.freeze({ ...session });
  }

  function getSession() {
    const storedSession = parseStoredValue(getStorage("sessionStorage"), SESSION_KEY);
    const session = storedSession || memorySession;

    if (!session || !session.userId || !session.role) {
      return null;
    }

    const profile = getUserProfile(session.userId) || {};
    const enrichedSession = {
      ...session,
      name: session.name || profile.name || "Usuario",
      email: session.email || profile.email || "",
      roleLabel: session.roleLabel || profile.roleLabel || "Usuario",
      status: session.status || profile.status || "active"
    };
    memorySession = enrichedSession;
    return Object.freeze({ ...enrichedSession });
  }

  function clearSession() {
    memorySession = null;
    const storage = getStorage("sessionStorage");
    if (!storage) return;
    try {
      storage.removeItem(SESSION_KEY);
    } catch (error) {
      // El prototipo sigue funcionando durante la sesión en memoria.
    }
  }

  function applyTheme(preferences) {
    const selected = preferences && preferences.theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", selected);
  }

  function updateSession(changes) {
    const current = getSession();
    if (!current || !changes || typeof changes !== "object" || Array.isArray(changes)) return null;

    const nextName = typeof changes.name === "string" && changes.name.trim()
      ? changes.name.trim()
      : current.name;
    const nextEmail = typeof changes.email === "string" && changes.email.trim()
      ? changes.email.trim()
      : current.email;

    const profileChanges = { name: nextName, email: nextEmail };
    saveUserProfileOverride(current.userId, profileChanges);

    const next = { ...current, ...profileChanges };
    memorySession = next;
    writeStoredValue(getStorage("sessionStorage"), SESSION_KEY, next);
    return Object.freeze({ ...next });
  }

  function getPreferences() {
    const savedPreferences = parseStoredValue(getStorage("localStorage"), PREFERENCES_KEY);
    return Object.freeze({ ...defaultPreferences, ...(savedPreferences || {}) });
  }

  function savePreferences(changes) {
    if (!changes || typeof changes !== "object" || Array.isArray(changes)) {
      throw new TypeError("Las preferencias deben proporcionarse como un objeto.");
    }

    const currentPreferences = getPreferences();
    const nextPreferences = { ...currentPreferences, ...changes };
    writeStoredValue(getStorage("localStorage"), PREFERENCES_KEY, nextPreferences);
    return Object.freeze({ ...nextPreferences });
  }


  function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function getMockCollection(collectionName) {
    if (typeof collectionName !== "string" || !/^[a-zA-Z]+$/.test(collectionName)) {
      throw new TypeError("El nombre de la colección no es válido.");
    }

    const mockData = global.SGI.mockData;
    const seed = mockData && mockData[collectionName];
    if (!Array.isArray(seed)) {
      throw new Error("No existe una colección simulada llamada " + collectionName + ".");
    }

    const storageKey = "sgi.mock." + collectionName + ".v1";
    const stored = parseStoredValue(getStorage("localStorage"), storageKey);
    if (Array.isArray(stored)) {
      memoryCollections[collectionName] = cloneJson(stored);
      return cloneJson(stored);
    }

    if (Array.isArray(memoryCollections[collectionName])) {
      return cloneJson(memoryCollections[collectionName]);
    }

    const initial = cloneJson(seed);
    memoryCollections[collectionName] = initial;
    return cloneJson(initial);
  }

  function saveMockCollection(collectionName, records) {
    if (typeof collectionName !== "string" || !/^[a-zA-Z]+$/.test(collectionName) || !Array.isArray(records)) {
      throw new TypeError("La colección y sus registros no tienen un formato válido.");
    }

    const mockData = global.SGI.mockData;
    if (!mockData || !Array.isArray(mockData[collectionName])) {
      throw new Error("No se puede guardar una colección que no exista en los datos simulados.");
    }

    const safeCopy = cloneJson(records);
    memoryCollections[collectionName] = safeCopy;
    return writeStoredValue(getStorage("localStorage"), "sgi.mock." + collectionName + ".v1", safeCopy);
  }

  function resetMockCollection(collectionName) {
    if (typeof collectionName !== "string" || !/^[a-zA-Z]+$/.test(collectionName)) return false;
    delete memoryCollections[collectionName];
    const storage = getStorage("localStorage");
    if (!storage) return false;
    try {
      storage.removeItem("sgi.mock." + collectionName + ".v1");
      return true;
    } catch (error) {
      return false;
    }
  }

  global.SGI.context = Object.freeze({
    createSession: createSession,
    getSession: getSession,
    clearSession: clearSession,
    getPreferences: getPreferences,
    savePreferences: savePreferences,
    applyTheme: applyTheme,
    updateSession: updateSession,
    getUserProfile: getUserProfile,
    getMockCollection: getMockCollection,
    saveMockCollection: saveMockCollection,
    resetMockCollection: resetMockCollection
  });

  applyTheme(getPreferences());
})(window);
