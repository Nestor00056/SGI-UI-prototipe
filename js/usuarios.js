(function (global) {
  "use strict";

  const app = global.SGI;
  if (!app || !app.context || !app.mockData) {
    global.location.replace("../login.html");
    return;
  }

  const session = app.context.getSession();
  if (!session) {
    global.location.replace("../login.html");
    return;
  }
  if (session.role !== "administrador") {
    global.location.replace("inicio.html?access=restricted");
    return;
  }

  const $ = function (id) { return document.getElementById(id); };
  const roleLabels = { administrador: "Administrador", supervisor: "Supervisor", empleado: "Empleado" };
  const pageSize = 10;
  const numberFormat = new Intl.NumberFormat("es-CO");
  const state = {
    users: (app.mockData.userDirectory || app.mockData.users || []).map(function (user) {
      const currentProfile = typeof app.context.getUserProfile === "function"
        ? app.context.getUserProfile(user.id)
        : null;
      return Object.assign({}, user, currentProfile || {});
    }),
    filtered: [],
    page: 1,
    editingId: null,
    lastFocused: null,
    toastTimer: null
  };

  const el = {
    avatar: $("sidebar-avatar"), userName: $("sidebar-user-name"), userRole: $("sidebar-user-role"), currentDate: $("current-date"),
    profileToggle: $("profile-menu-toggle"), profileMenu: $("profile-menu"), notificationToggle: $("notification-toggle"), notificationPanel: $("notification-panel"),
    logout: $("logout-button"), filterForm: $("user-filter-form"), search: $("user-search"), roleFilter: $("user-role-filter"), statusFilter: $("user-status-filter"),
    clearFilters: $("clear-user-filters"), newButton: $("new-user-button"), tableBody: $("users-table-body"), totalLabel: $("users-total-label"),
    paginationSummary: $("users-pagination-summary"), pagination: $("users-pagination"), dialog: $("user-dialog"), form: $("user-form"),
    dialogTitle: $("user-dialog-title"), dialogDescription: $("user-dialog-description"), nameInput: $("user-name-input"), emailInput: $("user-email-input"),
    roleInput: $("user-role-input"), statusInput: $("user-status-input"), nameError: $("user-name-error"), emailError: $("user-email-error"),
    formSubmit: $("user-form-submit"), dialogClose: $("user-dialog-close"), dialogCancel: $("user-dialog-cancel"), toast: $("toast")
  };

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character];
    });
  }

  function normalize(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-CO").trim();
  }

  function setUserInformation() {
    const initials = String(session.name || "Usuario").trim().split(/\s+/).slice(0, 2).map(function (part) { return part.charAt(0).toUpperCase(); }).join("");
    el.avatar.textContent = initials || "U";
    el.userName.textContent = session.name || "Usuario";
    el.userRole.textContent = session.roleLabel || "Administrador";
    const adminLink = document.querySelector("[data-admin-only]");
    if (adminLink) adminLink.hidden = false;
    try {
      const date = new Intl.DateTimeFormat("es-CO", { weekday: "short", day: "2-digit", month: "short", year: "numeric", timeZone: "America/Bogota" }).format(new Date());
      el.currentDate.textContent = date.charAt(0).toLocaleUpperCase("es-CO") + date.slice(1);
    } catch (error) {
      el.currentDate.textContent = new Date().toLocaleDateString("es-CO");
    }
  }

  function showToast(message) {
    el.toast.textContent = message;
    el.toast.hidden = false;
    if (state.toastTimer) global.clearTimeout(state.toastTimer);
    state.toastTimer = global.setTimeout(function () { el.toast.hidden = true; }, 3200);
  }

  function togglePopover(button, panel, otherButton, otherPanel) {
    const open = panel.hidden;
    otherPanel.hidden = true;
    otherButton.setAttribute("aria-expanded", "false");
    panel.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
  }

  function closePopovers() {
    el.profileMenu.hidden = true;
    el.profileToggle.setAttribute("aria-expanded", "false");
    el.notificationPanel.hidden = true;
    el.notificationToggle.setAttribute("aria-expanded", "false");
  }

  function getFilteredUsers() {
    const term = normalize(el.search.value);
    const role = el.roleFilter.value;
    const status = el.statusFilter.value;
    return state.users.filter(function (user) {
      const matchesTerm = !term || [user.name, user.email, user.username, user.id].some(function (value) { return normalize(value).includes(term); });
      const matchesRole = role === "all" || user.role === role;
      const matchesStatus = status === "all" || user.status === status;
      return matchesTerm && matchesRole && matchesStatus;
    }).sort(function (a, b) { return a.name.localeCompare(b.name, "es", { sensitivity: "base" }); });
  }

  function roleClass(role) {
    if (role === "administrador") return "admin";
    if (role === "supervisor") return "supervisor";
    return "employee";
  }

  function renderPagination() {
    const totalPages = Math.max(1, Math.ceil(state.filtered.length / pageSize));
    state.page = Math.min(Math.max(state.page, 1), totalPages);
    if (totalPages <= 1) {
      el.pagination.innerHTML = "";
      return;
    }
    const pages = new Set([1, state.page - 1, state.page, state.page + 1, totalPages]);
    const validPages = Array.from(pages).filter(function (page) { return page >= 1 && page <= totalPages; }).sort(function (a, b) { return a - b; });
    const buttons = [];
    function addButton(label, target, disabled, current) {
      buttons.push('<button class="page-button' + (current ? ' is-current' : '') + '" type="button" data-page="' + target + '"' + (disabled ? ' disabled' : '') + (current ? ' aria-current="page"' : '') + '>' + label + '</button>');
    }
    addButton("‹", state.page - 1, state.page === 1, false);
    let previous = 0;
    validPages.forEach(function (page) {
      if (page - previous > 1) buttons.push('<span class="pagination-ellipsis" aria-hidden="true">…</span>');
      addButton(String(page), page, false, page === state.page);
      previous = page;
    });
    addButton("›", state.page + 1, state.page === totalPages, false);
    el.pagination.innerHTML = buttons.join("");
    el.pagination.querySelectorAll("button[data-page]").forEach(function (button) {
      button.addEventListener("click", function () {
        state.page = Number(button.dataset.page);
        renderTable();
      });
    });
  }

  function renderTable() {
    const total = state.filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    state.page = Math.min(state.page, totalPages);
    const startIndex = (state.page - 1) * pageSize;
    const visible = state.filtered.slice(startIndex, startIndex + pageSize);
    el.totalLabel.textContent = numberFormat.format(total) + (total === 1 ? " usuario" : " usuarios");

    if (!visible.length) {
      el.tableBody.innerHTML = '<tr><td class="users-empty-state" colspan="5">No se encontraron usuarios con los criterios seleccionados.</td></tr>';
      el.paginationSummary.textContent = "Mostrando 0 usuarios";
    } else {
      el.tableBody.innerHTML = visible.map(function (user) {
        const active = user.status === "active";
        const statusText = active ? "Activo" : "Inactivo";
        const toggleLabel = active ? "Desactivar a " + user.name : "Activar a " + user.name;
        const toggleIcon = active
          ? '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v9M7 5.8a8 8 0 1 0 10 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
          : '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v9M7 5.8a8 8 0 1 0 10 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="m8.5 12.5 2.2 2.2 4.8-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        return '<tr data-user-id="' + escapeHtml(user.id) + '">' +
          '<td class="user-name-cell">' + escapeHtml(user.name) + '</td>' +
          '<td class="user-email-cell">' + escapeHtml(user.email) + '</td>' +
          '<td><span class="user-role-pill ' + roleClass(user.role) + '">' + escapeHtml(user.roleLabel || roleLabels[user.role] || "Empleado") + '</span></td>' +
          '<td><span class="user-status-pill ' + (active ? 'active' : 'inactive') + '">' + statusText + '</span></td>' +
          '<td><div class="user-actions"><button class="user-action-button" type="button" data-action="edit" data-user-id="' + escapeHtml(user.id) + '" aria-label="Editar a ' + escapeHtml(user.name) + '" title="Editar usuario"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m14 5 5 5M4 20l4.2-.8L19 8.4a2.1 2.1 0 0 0-3-3L5.2 16.2 4 20Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
          '<button class="user-action-button ' + (active ? 'is-danger' : 'is-success') + '" type="button" data-action="toggle" data-user-id="' + escapeHtml(user.id) + '" aria-label="' + escapeHtml(toggleLabel) + '" title="' + (active ? 'Desactivar usuario' : 'Activar usuario') + '">' + toggleIcon + '</button></div></td>' +
          '</tr>';
      }).join("");
      const from = startIndex + 1;
      const to = Math.min(startIndex + pageSize, total);
      el.paginationSummary.textContent = "Mostrando " + numberFormat.format(from) + "–" + numberFormat.format(to) + " de " + numberFormat.format(total) + " usuarios";
    }
    renderPagination();
  }

  function applyFilters(resetPage) {
    state.filtered = getFilteredUsers();
    if (resetPage !== false) state.page = 1;
    renderTable();
  }

  function clearValidation() {
    el.nameError.textContent = "";
    el.emailError.textContent = "";
    el.nameInput.removeAttribute("aria-invalid");
    el.emailInput.removeAttribute("aria-invalid");
  }

  function openDialog(user) {
    state.editingId = user ? user.id : null;
    state.lastFocused = document.activeElement;
    clearValidation();
    el.form.reset();
    el.dialogTitle.textContent = user ? "Editar usuario" : "Añadir usuario";
    el.dialogDescription.textContent = user ? "Actualiza los datos y el rol de esta cuenta." : "Completa los datos de la cuenta y asigna un rol.";
    el.formSubmit.textContent = user ? "Guardar cambios" : "Guardar usuario";
    el.nameInput.value = user ? user.name : "";
    el.emailInput.value = user ? user.email : "";
    el.roleInput.value = user ? user.role : "empleado";
    el.statusInput.value = user ? user.status : "active";
    if (typeof el.dialog.showModal === "function") {
      el.dialog.showModal();
      el.nameInput.focus();
    } else {
      showToast("Tu navegador no admite el formulario modal de esta demostración.");
    }
  }

  function closeDialog() {
    if (el.dialog.open) el.dialog.close();
  }

  function validateForm() {
    clearValidation();
    let valid = true;
    const name = el.nameInput.value.trim().replace(/\s+/g, " ");
    const email = el.emailInput.value.trim().toLowerCase();
    if (name.length < 3) {
      el.nameError.textContent = "Ingresa un nombre de al menos 3 caracteres.";
      el.nameInput.setAttribute("aria-invalid", "true");
      valid = false;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      el.emailError.textContent = "Ingresa un correo electrónico válido.";
      el.emailInput.setAttribute("aria-invalid", "true");
      valid = false;
    } else {
      const duplicated = state.users.some(function (user) {
        return user.email.toLowerCase() === email && user.id !== state.editingId;
      });
      if (duplicated) {
        el.emailError.textContent = "Ya existe una cuenta registrada con ese correo.";
        el.emailInput.setAttribute("aria-invalid", "true");
        valid = false;
      }
    }
    if (!valid) {
      const firstInvalid = el.form.querySelector('[aria-invalid="true"]');
      if (firstInvalid) firstInvalid.focus();
    }
    return valid;
  }

  function nextUserId() {
    const nextNumber = state.users.reduce(function (max, user) {
      const match = /^USR-(\d+)$/.exec(user.id);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0) + 1;
    return "USR-" + String(nextNumber).padStart(3, "0");
  }

  function saveUser(event) {
    event.preventDefault();
    if (!validateForm()) return;
    const role = el.roleInput.value;
    const payload = {
      name: el.nameInput.value.trim().replace(/\s+/g, " "),
      email: el.emailInput.value.trim().toLowerCase(),
      role: role,
      roleLabel: roleLabels[role],
      status: el.statusInput.value
    };
    if (state.editingId) {
      const index = state.users.findIndex(function (user) { return user.id === state.editingId; });
      if (index < 0) {
        showToast("No encontramos la cuenta que intentas modificar.");
        closeDialog();
        return;
      }
      state.users[index] = Object.assign({}, state.users[index], payload);
      showToast("Los datos del usuario se actualizaron en esta demostración.");
    } else {
      payload.id = nextUserId();
      payload.username = "usuario" + payload.id.slice(-3);
      state.users.unshift(payload);
      showToast("El usuario se añadió al listado de demostración.");
    }
    closeDialog();
    applyFilters(true);
  }

  function handleTableAction(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const user = state.users.find(function (item) { return item.id === button.dataset.userId; });
    if (!user) return;
    if (button.dataset.action === "edit") {
      openDialog(user);
      return;
    }
    if (button.dataset.action === "toggle") {
      if (user.id === session.userId && user.status === "active") {
        showToast("No puedes desactivar la cuenta con la que tienes abierta esta sesión.");
        return;
      }
      const nextStatus = user.status === "active" ? "inactive" : "active";
      const verb = nextStatus === "inactive" ? "desactivar" : "activar";
      if (!global.confirm("¿Deseas " + verb + " la cuenta de " + user.name + "?")) return;
      user.status = nextStatus;
      showToast("La cuenta de " + user.name + " ahora está " + (nextStatus === "active" ? "activa" : "inactiva") + ".");
      applyFilters(false);
    }
  }

  function initEvents() {
    el.filterForm.addEventListener("submit", function (event) { event.preventDefault(); applyFilters(true); });
    el.search.addEventListener("input", function () { applyFilters(true); });
    el.clearFilters.addEventListener("click", function () {
      el.search.value = "";
      el.roleFilter.value = "all";
      el.statusFilter.value = "all";
      applyFilters(true);
      el.search.focus();
    });
    el.newButton.addEventListener("click", function () { openDialog(null); });
    el.tableBody.addEventListener("click", handleTableAction);
    el.form.addEventListener("submit", saveUser);
    el.dialogClose.addEventListener("click", closeDialog);
    el.dialogCancel.addEventListener("click", closeDialog);
    el.dialog.addEventListener("click", function (event) { if (event.target === el.dialog) closeDialog(); });
    el.dialog.addEventListener("close", function () {
      clearValidation();
      if (state.lastFocused && typeof state.lastFocused.focus === "function") state.lastFocused.focus();
    });
    el.profileToggle.addEventListener("click", function () { togglePopover(el.profileToggle, el.profileMenu, el.notificationToggle, el.notificationPanel); });
    el.notificationToggle.addEventListener("click", function () { togglePopover(el.notificationToggle, el.notificationPanel, el.profileToggle, el.profileMenu); });
    document.addEventListener("click", function (event) {
      if (!event.target.closest(".sidebar-user") && !event.target.closest(".notification-wrap")) closePopovers();
    });
    document.addEventListener("keydown", function (event) { if (event.key === "Escape") closePopovers(); });
    document.querySelectorAll("[data-coming-soon]").forEach(function (button) {
      button.addEventListener("click", function () { showToast("La vista de " + button.dataset.comingSoon + " se incorporará en una siguiente etapa del prototipo."); });
    });
    el.logout.addEventListener("click", function () {
      app.context.clearSession();
      global.location.replace("../login.html");
    });
  }

  setUserInformation();
  initEvents();
  state.filtered = state.users.slice();
  renderTable();
})(window);
