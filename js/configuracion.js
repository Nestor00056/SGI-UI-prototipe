(function (global) {
  "use strict";

  const SGI = global.SGI;
  const context = SGI && SGI.context;

  if (!context) {
    global.location.replace("../login.html");
    return;
  }

  const session = context.getSession();
  if (!session) {
    global.location.replace("../login.html");
    return;
  }

  const elements = {
    avatar: document.getElementById("sidebar-avatar"),
    userName: document.getElementById("sidebar-user-name"),
    userRole: document.getElementById("sidebar-user-role"),
    adminLink: document.querySelector("[data-admin-only]"),
    profileToggle: document.getElementById("profile-menu-toggle"),
    profileMenu: document.getElementById("profile-menu"),
    notificationToggle: document.getElementById("notification-toggle"),
    notificationPanel: document.getElementById("notification-panel"),
    notificationList: document.getElementById("notification-list"),
    currentDate: document.getElementById("current-date"),
    logoutButton: document.getElementById("logout-button"),
    helpButton: document.querySelector('[data-coming-soon="Ayuda"]'),
    toast: document.getElementById("toast"),
    form: document.getElementById("config-form"),
    feedback: document.getElementById("config-feedback"),
    saveButton: document.getElementById("save-config-button")
  };

  let savedTheme = "light";
  let toastTimer = null;

  function initials(name) {
    return String(name || "Usuario")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(function (part) { return part.charAt(0).toLocaleUpperCase("es-CO"); })
      .join("") || "U";
  }

  function getCurrentUser() {
    const directory = SGI.mockData && Array.isArray(SGI.mockData.users) ? SGI.mockData.users : [];
    const record = directory.find(function (user) { return user.id === session.userId; }) || null;

    // La sesión es la fuente principal: puede contener cambios hechos desde Perfil.
    return {
      name: session.name || (record && record.name) || "Usuario",
      email: session.email || (record && record.email) || "",
      role: session.role || (record && record.role) || "empleado",
      roleLabel: session.roleLabel || (record && record.roleLabel) || "Empleado"
    };
  }

  function renderAccount() {
    const user = getCurrentUser();
    elements.avatar.textContent = initials(user.name);
    elements.userName.textContent = user.name;
    elements.userRole.textContent = user.roleLabel;
    elements.avatar.setAttribute("aria-label", "Avatar de " + user.name);

    if (elements.adminLink) {
      elements.adminLink.hidden = user.role !== "administrador";
    }
  }

  function renderCurrentDate() {
    try {
      const date = new Intl.DateTimeFormat("es-CO", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "America/Bogota"
      }).format(new Date());
      elements.currentDate.textContent = date.charAt(0).toLocaleUpperCase("es-CO") + date.slice(1);
    } catch (error) {
      elements.currentDate.textContent = new Date().toLocaleDateString("es-CO");
    }
  }

  function renderNotifications() {
    const notifications = SGI.mockData && SGI.mockData.dashboard && Array.isArray(SGI.mockData.dashboard.notifications)
      ? SGI.mockData.dashboard.notifications
      : [];

    elements.notificationList.replaceChildren();

    if (notifications.length === 0) {
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

  function showToast(message) {
    if (!elements.toast) return;
    elements.toast.textContent = message;
    elements.toast.hidden = false;
    if (toastTimer) global.clearTimeout(toastTimer);
    toastTimer = global.setTimeout(function () { elements.toast.hidden = true; }, 3000);
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

  function initializeThemeControls() {
    const preferences = context.getPreferences();
    savedTheme = preferences.theme === "dark" ? "dark" : "light";
    const selected = elements.form.querySelector('input[name="theme"][value="' + savedTheme + '"]');
    if (selected) selected.checked = true;

    elements.form.querySelectorAll('input[name="theme"]').forEach(function (radio) {
      radio.addEventListener("change", function () {
        elements.feedback.classList.remove("is-error");
        elements.feedback.textContent = radio.value === savedTheme
          ? ""
          : "Hay un cambio de apariencia pendiente por guardar.";
      });
    });

    elements.form.addEventListener("submit", function (event) {
      event.preventDefault();
      const selectedTheme = elements.form.querySelector('input[name="theme"]:checked');
      if (!selectedTheme) {
        elements.feedback.classList.add("is-error");
        elements.feedback.textContent = "Selecciona un tema antes de guardar.";
        return;
      }

      try {
        const nextPreferences = context.savePreferences({ theme: selectedTheme.value });
        context.applyTheme(nextPreferences);
        savedTheme = nextPreferences.theme === "dark" ? "dark" : "light";
        elements.feedback.classList.remove("is-error");
        elements.feedback.textContent = "Preferencia de apariencia guardada correctamente.";
      } catch (error) {
        elements.feedback.classList.add("is-error");
        elements.feedback.textContent = "No fue posible guardar la preferencia. Inténtalo nuevamente.";
      }
    });
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

  renderAccount();
  renderCurrentDate();
  renderNotifications();
  initializeThemeControls();
})(window);
