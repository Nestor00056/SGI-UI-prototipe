(function (global) {
  "use strict";

  const SGI = global.SGI;
  const context = SGI && SGI.context;
  if (!context) {
    global.location.replace("../login.html");
    return;
  }

  let session = context.getSession();
  if (!session) {
    global.location.replace("../login.html");
    return;
  }

  const $ = function (id) { return document.getElementById(id); };
  const elements = {
    avatar: $("sidebar-avatar"),
    sidebarName: $("sidebar-user-name"),
    sidebarRole: $("sidebar-user-role"),
    adminLink: document.querySelector("[data-admin-only]"),
    currentDate: $("current-date"),
    profileToggle: $("profile-menu-toggle"),
    profileMenu: $("profile-menu"),
    notificationToggle: $("notification-toggle"),
    notificationPanel: $("notification-panel"),
    notificationList: $("notification-list"),
    logoutButton: $("logout-button"),
    helpButton: document.querySelector('[data-coming-soon="Ayuda"]'),
    form: $("profile-form"),
    name: $("profile-name"),
    email: $("profile-email"),
    role: $("profile-role"),
    status: $("profile-status"),
    displayName: $("profile-display-name"),
    displayEmail: $("profile-display-email"),
    displayRole: $("profile-display-role"),
    avatarLarge: $("profile-avatar"),
    statusPill: $("profile-status-pill"),
    cancel: $("profile-cancel"),
    feedback: $("profile-feedback"),
    toast: $("toast")
  };

  let toastTimer = null;

  function initials(value) {
    return String(value || "Usuario")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(function (part) { return part.charAt(0).toLocaleUpperCase("es-CO"); })
      .join("") || "U";
  }

  function getCurrentProfile() {
    const storedProfile = typeof context.getUserProfile === "function"
      ? context.getUserProfile(session.userId)
      : null;
    return Object.assign({}, storedProfile || {}, session, {
      status: session.status || (storedProfile && storedProfile.status) || "active"
    });
  }

  function renderAccount(profile) {
    const name = profile.name || "Usuario";
    const roleLabel = profile.roleLabel || "Usuario";
    const userInitials = initials(name);

    elements.avatar.textContent = userInitials;
    elements.sidebarName.textContent = name;
    elements.sidebarRole.textContent = roleLabel;
    elements.avatar.setAttribute("aria-label", "Avatar de " + name);
    if (elements.adminLink) elements.adminLink.hidden = profile.role !== "administrador";

    elements.displayName.textContent = name;
    elements.displayEmail.textContent = profile.email || "Correo no disponible";
    elements.displayRole.textContent = roleLabel;
    elements.avatarLarge.textContent = userInitials;
    elements.avatarLarge.setAttribute("aria-label", "Avatar de " + name);

    const isActive = profile.status !== "inactive";
    elements.statusPill.textContent = isActive ? "Activo" : "Inactivo";
    elements.statusPill.classList.toggle("is-active", isActive);
    elements.statusPill.classList.toggle("is-inactive", !isActive);

    elements.name.value = name;
    elements.email.value = profile.email || "";
    elements.role.value = roleLabel;
    elements.status.value = isActive ? "Activo" : "Inactivo";
  }

  function renderCurrentDate() {
    try {
      const value = new Intl.DateTimeFormat("es-CO", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "America/Bogota"
      }).format(new Date());
      elements.currentDate.textContent = value.charAt(0).toLocaleUpperCase("es-CO") + value.slice(1);
    } catch (error) {
      elements.currentDate.textContent = new Date().toLocaleDateString("es-CO");
    }
  }

  function renderNotifications() {
    const notifications = SGI.mockData && SGI.mockData.dashboard && Array.isArray(SGI.mockData.dashboard.notifications)
      ? SGI.mockData.dashboard.notifications
      : [];
    elements.notificationList.replaceChildren();

    if (!notifications.length) {
      const empty = document.createElement("p");
      empty.className = "notification-empty";
      empty.textContent = "No hay notificaciones pendientes.";
      elements.notificationList.appendChild(empty);
      return;
    }

    notifications.forEach(function (notification) {
      const item = document.createElement("article");
      item.className = "notification-item";
      const symbol = document.createElement("span");
      symbol.className = "notification-symbol " + (notification.type === "warning" ? "warning" : "info");
      symbol.setAttribute("aria-hidden", "true");
      symbol.textContent = notification.type === "warning" ? "!" : "i";
      const copy = document.createElement("span");
      copy.className = "notification-copy";
      const title = document.createElement("strong");
      title.textContent = notification.title || "Notificación";
      const description = document.createElement("small");
      description.textContent = notification.description || "";
      copy.append(title, description);
      item.append(symbol, copy);
      elements.notificationList.appendChild(item);
    });
  }

  function closePopovers(returnFocus) {
    const profileWasOpen = !elements.profileMenu.hidden;
    const notificationsWereOpen = !elements.notificationPanel.hidden;
    elements.profileMenu.hidden = true;
    elements.notificationPanel.hidden = true;
    elements.profileToggle.setAttribute("aria-expanded", "false");
    elements.notificationToggle.setAttribute("aria-expanded", "false");
    if (returnFocus && profileWasOpen) elements.profileToggle.focus();
    if (returnFocus && notificationsWereOpen) elements.notificationToggle.focus();
  }

  function togglePopover(button, panel, otherButton, otherPanel) {
    const shouldOpen = panel.hidden;
    otherPanel.hidden = true;
    otherButton.setAttribute("aria-expanded", "false");
    panel.hidden = !shouldOpen;
    button.setAttribute("aria-expanded", String(shouldOpen));
  }

  function showToast(message) {
    if (!elements.toast) return;
    elements.toast.textContent = message;
    elements.toast.hidden = false;
    if (toastTimer) global.clearTimeout(toastTimer);
    toastTimer = global.setTimeout(function () { elements.toast.hidden = true; }, 3000);
  }

  function normalizeEmail(value) {
    return String(value || "").trim().toLocaleLowerCase("es-CO");
  }

  function emailAlreadyUsed(email) {
    const directory = SGI.mockData && (SGI.mockData.userDirectory || SGI.mockData.users) || [];
    return directory.some(function (record) {
      if (record.id === session.userId) return false;
      const profile = typeof context.getUserProfile === "function"
        ? (context.getUserProfile(record.id) || record)
        : record;
      return normalizeEmail(profile.email) === normalizeEmail(email);
    });
  }

  function resetForm() {
    session = context.getSession() || session;
    renderAccount(getCurrentProfile());
    elements.feedback.textContent = "";
    elements.feedback.classList.remove("is-error");
  }

  function saveProfile(event) {
    event.preventDefault();
    elements.feedback.textContent = "";
    elements.feedback.classList.remove("is-error");

    if (!elements.form.reportValidity()) return;

    const nextName = elements.name.value.trim();
    const nextEmail = normalizeEmail(elements.email.value);
    if (nextName.length < 3) {
      elements.feedback.textContent = "Introduce un nombre de al menos tres caracteres.";
      elements.feedback.classList.add("is-error");
      elements.name.focus();
      return;
    }
    if (emailAlreadyUsed(nextEmail)) {
      elements.feedback.textContent = "Ese correo ya está asignado a otra cuenta del directorio.";
      elements.feedback.classList.add("is-error");
      elements.email.focus();
      return;
    }

    const updated = context.updateSession({ name: nextName, email: nextEmail });
    if (!updated) {
      elements.feedback.textContent = "No fue posible actualizar la información de la cuenta.";
      elements.feedback.classList.add("is-error");
      return;
    }

    session = updated;
    renderAccount(getCurrentProfile());
    elements.feedback.textContent = "Los datos de tu cuenta se actualizaron correctamente.";
    showToast("Perfil actualizado. Los cambios ya se reflejan en el SGI.");
  }

  elements.profileToggle.addEventListener("click", function () {
    togglePopover(elements.profileToggle, elements.profileMenu, elements.notificationToggle, elements.notificationPanel);
  });

  elements.notificationToggle.addEventListener("click", function () {
    togglePopover(elements.notificationToggle, elements.notificationPanel, elements.profileToggle, elements.profileMenu);
  });

  document.addEventListener("click", function (event) {
    if (!event.target.closest(".sidebar-user") && !event.target.closest(".notification-wrap")) {
      closePopovers(false);
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closePopovers(true);
  });

  elements.logoutButton.addEventListener("click", function () {
    context.clearSession();
    global.location.replace("../login.html");
  });

  if (elements.helpButton) {
    elements.helpButton.addEventListener("click", function () {
      closePopovers(false);
      showToast("La guía de ayuda se incorporará en la siguiente etapa del prototipo.");
    });
  }

  elements.form.addEventListener("submit", saveProfile);
  elements.cancel.addEventListener("click", resetForm);

  renderAccount(getCurrentProfile());
  renderCurrentDate();
  renderNotifications();
})(window);
