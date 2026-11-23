(function (global) {
  "use strict";

  const session = global.SGI.context.getSession();
  if (!session) {
    global.location.replace("../login.html");
    return;
  }

  const mockData = global.SGI.mockData;
  if (!mockData || !Array.isArray(mockData.providers)) {
    global.console.error("No se encontraron los datos simulados de proveedores.");
    global.location.replace("inicio.html");
    return;
  }

  const state = {
    providers: mockData.providers.map(function (provider) { return { ...provider }; }),
    filtered: [],
    page: 1,
    pageSize: 8,
    dialogMode: "create",
    editingId: null,
    returnFocus: null,
    toastTimer: null
  };

  const elements = {
    sidebarAvatar: document.getElementById("sidebar-avatar"),
    sidebarName: document.getElementById("sidebar-user-name"),
    sidebarRole: document.getElementById("sidebar-user-role"),
    currentDate: document.getElementById("current-date"),
    notificationToggle: document.getElementById("notification-toggle"),
    notificationPanel: document.getElementById("notification-panel"),
    notificationList: document.getElementById("notification-list"),
    profileToggle: document.getElementById("profile-menu-toggle"),
    profileMenu: document.getElementById("profile-menu"),
    logoutButton: document.getElementById("logout-button"),
    newButton: document.getElementById("new-provider-button"),
    filterForm: document.getElementById("provider-filter-form"),
    search: document.getElementById("provider-search"),
    statusFilter: document.getElementById("provider-status-filter"),
    clearFilters: document.getElementById("clear-provider-filters"),
    summaryTotal: document.getElementById("summary-total"),
    summaryActive: document.getElementById("summary-active"),
    summaryInactive: document.getElementById("summary-inactive"),
    summaryEmail: document.getElementById("summary-email"),
    tableCount: document.getElementById("table-count"),
    tableBody: document.getElementById("providers-table-body"),
    paginationSummary: document.getElementById("pagination-summary"),
    pagination: document.getElementById("pagination"),
    providerDialog: document.getElementById("provider-dialog"),
    providerForm: document.getElementById("provider-form"),
    dialogTitle: document.getElementById("dialog-title"),
    dialogDescription: document.getElementById("dialog-description"),
    dialogClose: document.getElementById("dialog-close"),
    dialogCancel: document.getElementById("dialog-cancel"),
    dialogSave: document.getElementById("dialog-save"),
    name: document.getElementById("provider-name"),
    contact: document.getElementById("provider-contact"),
    phone: document.getElementById("provider-phone"),
    email: document.getElementById("provider-email"),
    address: document.getElementById("provider-address"),
    status: document.getElementById("provider-status"),
    feedback: document.getElementById("dialog-feedback"),
    detailDialog: document.getElementById("detail-dialog"),
    detailContent: document.getElementById("detail-content"),
    detailClose: document.getElementById("detail-close"),
    detailDismiss: document.getElementById("detail-dismiss"),
    toast: document.getElementById("toast")
  };

  const numberFormat = new Intl.NumberFormat("es-CO");

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character];
    });
  }

  function setUserInformation() {
    const initials = session.name.trim().split(/\s+/).slice(0, 2).map(function (part) {
      return part.charAt(0).toUpperCase();
    }).join("");
    elements.sidebarAvatar.textContent = initials || "U";
    elements.sidebarName.textContent = session.name;
    elements.sidebarRole.textContent = session.roleLabel;

    const userManagementLink = document.querySelector("[data-admin-only]");
    if (userManagementLink) userManagementLink.hidden = session.role !== "administrador";

    try {
      const date = new Intl.DateTimeFormat("es-CO", {
        weekday: "short", day: "2-digit", month: "short", year: "numeric", timeZone: "America/Bogota"
      }).format(new Date());
      elements.currentDate.textContent = date.charAt(0).toLocaleUpperCase("es-CO") + date.slice(1);
    } catch (error) {
      elements.currentDate.textContent = new Date().toLocaleDateString("es-CO");
    }
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.hidden = false;
    if (state.toastTimer) global.clearTimeout(state.toastTimer);
    state.toastTimer = global.setTimeout(function () { elements.toast.hidden = true; }, 3200);
  }

  function renderSummary() {
    elements.summaryTotal.textContent = numberFormat.format(state.providers.length);
    elements.summaryActive.textContent = numberFormat.format(state.providers.filter(function (provider) { return provider.status === "active"; }).length);
    elements.summaryInactive.textContent = numberFormat.format(state.providers.filter(function (provider) { return provider.status === "inactive"; }).length);
    elements.summaryEmail.textContent = numberFormat.format(state.providers.filter(function (provider) { return Boolean(provider.email); }).length);
  }

  function statusMarkup(status) {
    const active = status === "active";
    return '<span class="status-pill ' + (active ? "status-active" : "status-inactive") + '"><i aria-hidden="true"></i>' + (active ? "Activo" : "Inactivo") + "</span>";
  }

  function renderRows() {
    const start = (state.page - 1) * state.pageSize;
    const pageItems = state.filtered.slice(start, start + state.pageSize);

    if (!pageItems.length) {
      elements.tableBody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><span class="empty-state-icon" aria-hidden="true">⌕</span><strong>No se encontraron proveedores</strong><span>Prueba con otro término o modifica los filtros.</span></div></td></tr>';
      return;
    }

    elements.tableBody.innerHTML = pageItems.map(function (provider) {
      const id = escapeHtml(provider.id);
      const name = escapeHtml(provider.name);
      const contact = provider.contact ? escapeHtml(provider.contact) : '<span class="provider-muted">Sin contacto</span>';
      const phone = provider.phone ? escapeHtml(provider.phone) : '<span class="provider-muted">No registrado</span>';
      const email = provider.email
        ? '<a href="mailto:' + escapeHtml(provider.email) + '">' + escapeHtml(provider.email) + '</a>'
        : '<span class="provider-muted">No registrado</span>';
      const toggleLabel = provider.status === "active" ? "Desactivar" : "Activar";
      const toggleTitle = toggleLabel + " proveedor " + name;
      return '<tr>' +
        '<td><span class="provider-row-code">' + id + '</span></td>' +
        '<td class="provider-name-cell"><strong>' + name + '</strong><small>' + escapeHtml(provider.address || "Dirección no registrada") + '</small></td>' +
        '<td class="provider-contact-cell">' + contact + '</td>' +
        '<td class="provider-contact-cell">' + phone + '</td>' +
        '<td class="provider-contact-cell">' + email + '</td>' +
        '<td>' + statusMarkup(provider.status) + '</td>' +
        '<td><div class="row-actions">' +
          '<button class="row-action" type="button" data-action="view" data-id="' + id + '" aria-label="Consultar ' + name + '" title="Consultar"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2.5 12s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6Z" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="2.7" stroke="currentColor" stroke-width="1.8"/></svg></button>' +
          '<button class="row-action" type="button" data-action="edit" data-id="' + id + '" aria-label="Editar ' + name + '" title="Editar"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m14 5 5 5M4 20l4.2-.8L19 8.4 15.6 5 4.8 15.8 4 20Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
          '<button class="row-action ' + (provider.status === "active" ? "row-action-danger" : "") + '" type="button" data-action="toggle" data-id="' + id + '" aria-label="' + escapeHtml(toggleTitle) + '" title="' + escapeHtml(toggleLabel) + '"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' + (provider.status === "active" ? '<path d="M5 5 19 19M19 5 5 19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' : '<path d="M5 12h14M12 5v14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>') + '</svg></button>' +
        '</div></td></tr>';
    }).join("");
  }

  function renderPagination() {
    const totalPages = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
    state.page = Math.min(state.page, totalPages);
    const start = state.filtered.length ? (state.page - 1) * state.pageSize + 1 : 0;
    const end = Math.min(state.page * state.pageSize, state.filtered.length);
    elements.paginationSummary.textContent = state.filtered.length
      ? "Mostrando " + numberFormat.format(start) + "–" + numberFormat.format(end) + " de " + numberFormat.format(state.filtered.length) + " proveedores"
      : "Mostrando 0 proveedores";
    elements.tableCount.textContent = numberFormat.format(state.filtered.length) + (state.filtered.length === 1 ? " registro" : " registros");

    let buttons = '<button class="page-button" type="button" data-page="prev" aria-label="Página anterior" ' + (state.page === 1 ? "disabled" : "") + '>‹</button>';
    for (let page = 1; page <= totalPages; page += 1) {
      if (totalPages > 5 && page > 2 && page < totalPages - 1 && Math.abs(page - state.page) > 1) {
        if (page === 3 || page === totalPages - 2) buttons += '<span class="page-ellipsis" aria-hidden="true">…</span>';
        continue;
      }
      buttons += '<button class="page-button ' + (page === state.page ? "is-current" : "") + '" type="button" data-page="' + page + '" aria-label="Página ' + page + '" ' + (page === state.page ? 'aria-current="page"' : "") + '>' + page + '</button>';
    }
    buttons += '<button class="page-button" type="button" data-page="next" aria-label="Página siguiente" ' + (state.page === totalPages ? "disabled" : "") + '>›</button>';
    elements.pagination.innerHTML = buttons;
  }

  function applyFilters() {
    const query = elements.search.value.trim().toLocaleLowerCase("es-CO");
    const status = elements.statusFilter.value;
    state.filtered = state.providers.filter(function (provider) {
      const haystack = [provider.id, provider.name, provider.contact, provider.phone, provider.email, provider.address].join(" ").toLocaleLowerCase("es-CO");
      return (!query || haystack.includes(query)) && (status === "all" || provider.status === status);
    });
    state.page = 1;
    elements.clearFilters.hidden = !query && status === "all";
    renderRows();
    renderPagination();
  }

  function generateProviderId() {
    const highest = state.providers.reduce(function (max, provider) {
      const match = String(provider.id).match(/(\d+)$/);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    return "PV-" + String(highest + 1).padStart(3, "0");
  }

  function clearFormErrors() {
    ["provider-name", "provider-phone", "provider-email"].forEach(function (id) {
      const input = document.getElementById(id);
      const error = document.getElementById(id + "-error");
      input.setAttribute("aria-invalid", "false");
      if (error) error.textContent = "";
    });
    elements.feedback.hidden = true;
    elements.feedback.textContent = "";
  }

  function openCreateDialog() {
    state.dialogMode = "create";
    state.editingId = null;
    state.returnFocus = document.activeElement;
    elements.providerForm.reset();
    clearFormErrors();
    elements.dialogTitle.textContent = "Nuevo proveedor";
    elements.dialogDescription.textContent = "Completa la información básica y los datos de contacto.";
    elements.dialogSave.textContent = "Guardar proveedor";
    elements.providerDialog.showModal();
    elements.name.focus();
  }

  function openEditDialog(provider) {
    state.dialogMode = "edit";
    state.editingId = provider.id;
    state.returnFocus = document.activeElement;
    clearFormErrors();
    elements.dialogTitle.textContent = "Editar proveedor";
    elements.dialogDescription.textContent = "Actualiza la información del proveedor seleccionado.";
    elements.dialogSave.textContent = "Guardar cambios";
    elements.name.value = provider.name || "";
    elements.contact.value = provider.contact || "";
    elements.phone.value = provider.phone || "";
    elements.email.value = provider.email || "";
    elements.address.value = provider.address || "";
    elements.status.value = provider.status || "active";
    elements.providerDialog.showModal();
    elements.name.focus();
  }

  function validateForm() {
    clearFormErrors();
    let valid = true;
    const name = elements.name.value.trim();
    const phone = elements.phone.value.trim();
    const email = elements.email.value.trim();
    const phoneDigits = phone.replace(/\D/g, "");

    if (!name) {
      document.getElementById("provider-name-error").textContent = "Ingresa el nombre del proveedor.";
      elements.name.setAttribute("aria-invalid", "true");
      valid = false;
    }
    if (phone && (phoneDigits.length < 7 || phoneDigits.length > 15)) {
      document.getElementById("provider-phone-error").textContent = "Revisa el número de teléfono (entre 7 y 15 dígitos).";
      elements.phone.setAttribute("aria-invalid", "true");
      valid = false;
    }
    if (email && !elements.email.checkValidity()) {
      document.getElementById("provider-email-error").textContent = "Ingresa un correo electrónico válido.";
      elements.email.setAttribute("aria-invalid", "true");
      valid = false;
    }
    if (!valid) {
      elements.feedback.textContent = "Revisa los campos señalados antes de continuar.";
      elements.feedback.hidden = false;
      const firstInvalid = elements.providerForm.querySelector('[aria-invalid="true"]');
      if (firstInvalid) firstInvalid.focus();
    }
    return valid;
  }

  function saveProvider(event) {
    event.preventDefault();
    if (!validateForm()) return;

    const provider = {
      id: state.editingId || generateProviderId(),
      name: elements.name.value.trim(),
      contact: elements.contact.value.trim(),
      phone: elements.phone.value.trim(),
      email: elements.email.value.trim(),
      address: elements.address.value.trim(),
      status: elements.status.value
    };

    if (state.dialogMode === "edit") {
      const index = state.providers.findIndex(function (item) { return item.id === state.editingId; });
      if (index < 0) {
        elements.feedback.textContent = "No encontramos el proveedor que intentas modificar.";
        elements.feedback.hidden = false;
        return;
      }
      state.providers[index] = provider;
    } else {
      state.providers.unshift(provider);
    }

    elements.providerDialog.close();
    renderSummary();
    applyFilters();
    showToast(state.dialogMode === "edit" ? "Proveedor actualizado en el prototipo." : "Proveedor agregado al prototipo.");
    if (state.returnFocus && typeof state.returnFocus.focus === "function") state.returnFocus.focus();
  }

  function openDetailDialog(provider) {
    state.returnFocus = document.activeElement;
    const items = [
      ["Código", provider.id],
      ["Nombre del proveedor", provider.name],
      ["Persona de contacto", provider.contact || "No registrada"],
      ["Teléfono", provider.phone || "No registrado"],
      ["Correo electrónico", provider.email || "No registrado"],
      ["Dirección", provider.address || "No registrada"],
      ["Estado", provider.status === "active" ? "Activo" : "Inactivo"]
    ];
    elements.detailContent.innerHTML = items.map(function (item) {
      return '<div class="detail-item"><span>' + escapeHtml(item[0]) + '</span><strong>' + escapeHtml(item[1]) + '</strong></div>';
    }).join("");
    elements.detailDialog.showModal();
    elements.detailClose.focus();
  }

  function toggleProviderStatus(provider) {
    const nextStatus = provider.status === "active" ? "inactive" : "active";
    const action = nextStatus === "inactive" ? "desactivar" : "activar";
    if (!global.confirm("¿Deseas " + action + " a ‘" + provider.name + "’? El registro se conservará en el directorio.")) return;
    provider.status = nextStatus;
    renderSummary();
    applyFilters();
    showToast(nextStatus === "inactive" ? "Proveedor desactivado en el prototipo." : "Proveedor activado en el prototipo.");
  }

  function handleTableAction(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const provider = state.providers.find(function (item) { return item.id === button.dataset.id; });
    if (!provider) return;
    if (button.dataset.action === "view") openDetailDialog(provider);
    if (button.dataset.action === "edit") openEditDialog(provider);
    if (button.dataset.action === "toggle") toggleProviderStatus(provider);
  }

  function closeDialog(dialog) {
    if (dialog.open) dialog.close();
    if (state.returnFocus && typeof state.returnFocus.focus === "function") state.returnFocus.focus();
  }

  function initPopovers() {
    function toggle(button, panel, otherButton, otherPanel) {
      const open = panel.hidden;
      otherPanel.hidden = true;
      otherButton.setAttribute("aria-expanded", "false");
      panel.hidden = !open;
      button.setAttribute("aria-expanded", String(open));
    }
    elements.profileToggle.addEventListener("click", function () {
      toggle(elements.profileToggle, elements.profileMenu, elements.notificationToggle, elements.notificationPanel);
    });
    elements.notificationToggle.addEventListener("click", function () {
      toggle(elements.notificationToggle, elements.notificationPanel, elements.profileToggle, elements.profileMenu);
    });
    document.addEventListener("click", function (event) {
      if (!event.target.closest(".sidebar-user")) {
        elements.profileMenu.hidden = true;
        elements.profileToggle.setAttribute("aria-expanded", "false");
      }
      if (!event.target.closest(".notification-wrap")) {
        elements.notificationPanel.hidden = true;
        elements.notificationToggle.setAttribute("aria-expanded", "false");
      }
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        elements.profileMenu.hidden = true;
        elements.notificationPanel.hidden = true;
        elements.profileToggle.setAttribute("aria-expanded", "false");
        elements.notificationToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  function renderNotifications() {
    const notifications = mockData.dashboard && mockData.dashboard.notifications ? mockData.dashboard.notifications : [];
    elements.notificationList.innerHTML = notifications.map(function (notification) {
      const symbol = notification.type === "warning" ? "!" : "i";
      return '<article class="notification-item"><span class="notification-symbol ' + escapeHtml(notification.type) + '" aria-hidden="true">' + symbol + '</span><span class="notification-copy"><strong>' + escapeHtml(notification.title) + '</strong><small>' + escapeHtml(notification.description) + '</small></span></article>';
    }).join("");
  }

  elements.filterForm.addEventListener("submit", function (event) { event.preventDefault(); applyFilters(); });
  elements.search.addEventListener("input", applyFilters);
  elements.statusFilter.addEventListener("change", applyFilters);
  elements.clearFilters.addEventListener("click", function () {
    elements.search.value = "";
    elements.statusFilter.value = "all";
    applyFilters();
    elements.search.focus();
  });
  elements.newButton.addEventListener("click", openCreateDialog);
  elements.providerForm.addEventListener("submit", saveProvider);
  elements.dialogClose.addEventListener("click", function () { closeDialog(elements.providerDialog); });
  elements.dialogCancel.addEventListener("click", function () { closeDialog(elements.providerDialog); });
  elements.detailClose.addEventListener("click", function () { closeDialog(elements.detailDialog); });
  elements.detailDismiss.addEventListener("click", function () { closeDialog(elements.detailDialog); });
  elements.tableBody.addEventListener("click", handleTableAction);
  elements.pagination.addEventListener("click", function (event) {
    const button = event.target.closest("button[data-page]");
    if (!button || button.disabled) return;
    const totalPages = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
    if (button.dataset.page === "prev") state.page -= 1;
    else if (button.dataset.page === "next") state.page += 1;
    else state.page = Number(button.dataset.page);
    state.page = Math.max(1, Math.min(totalPages, state.page));
    renderRows();
    renderPagination();
  });

  document.querySelectorAll("[data-coming-soon]").forEach(function (button) {
    button.addEventListener("click", function () {
      showToast("La vista de " + button.dataset.comingSoon + " se incorporará en la siguiente etapa del prototipo.");
    });
  });

  elements.logoutButton.addEventListener("click", function () {
    global.SGI.context.clearSession();
    global.location.replace("../login.html");
  });

  setUserInformation();
  renderSummary();
  renderNotifications();
  initPopovers();
  applyFilters();
})(window);
