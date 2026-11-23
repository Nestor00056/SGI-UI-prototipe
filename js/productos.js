(function (global) {
  "use strict";

  const session = global.SGI.context.getSession();
  if (!session) {
    global.location.replace("../login.html");
    return;
  }

  const mockData = global.SGI.mockData;
  if (!mockData || !Array.isArray(mockData.products) || !Array.isArray(mockData.categories)) {
    global.location.replace("../login.html");
    return;
  }

  const PAGE_SIZE = 10;
  const state = {
    products: global.SGI.context.getMockCollection("products"),
    filtered: [],
    page: 1,
    search: "",
    category: "all",
    status: "all",
    dialogMode: "create",
    editingId: null,
    returnFocus: null
  };

  const elements = {
    sidebarAvatar: document.getElementById("sidebar-avatar"),
    sidebarName: document.getElementById("sidebar-user-name"),
    sidebarRole: document.getElementById("sidebar-user-role"),
    currentDate: document.getElementById("current-date"),
    profileToggle: document.getElementById("profile-menu-toggle"),
    profileMenu: document.getElementById("profile-menu"),
    notificationToggle: document.getElementById("notification-toggle"),
    notificationPanel: document.getElementById("notification-panel"),
    logoutButton: document.getElementById("logout-button"),
    newProductButton: document.getElementById("new-product-button"),
    filterForm: document.getElementById("product-filter-form"),
    search: document.getElementById("product-search"),
    categoryFilter: document.getElementById("category-filter"),
    statusFilter: document.getElementById("status-filter"),
    clearFilters: document.getElementById("clear-filters-button"),
    summaryTotal: document.getElementById("summary-total"),
    summaryActive: document.getElementById("summary-active"),
    summaryLowStock: document.getElementById("summary-low-stock"),
    summaryInactive: document.getElementById("summary-inactive"),
    tableBody: document.getElementById("products-table-body"),
    tableCount: document.getElementById("table-count"),
    paginationSummary: document.getElementById("pagination-summary"),
    pagination: document.getElementById("pagination"),
    productDialog: document.getElementById("product-dialog"),
    productForm: document.getElementById("product-form"),
    dialogTitle: document.getElementById("dialog-title"),
    dialogEyebrow: document.getElementById("dialog-eyebrow"),
    dialogDescription: document.getElementById("dialog-description"),
    dialogFeedback: document.getElementById("dialog-feedback"),
    dialogClose: document.getElementById("dialog-close"),
    dialogCancel: document.getElementById("dialog-cancel"),
    dialogSave: document.getElementById("dialog-save"),
    productId: document.getElementById("product-id"),
    productCode: document.getElementById("product-code"),
    productName: document.getElementById("product-name"),
    productDescription: document.getElementById("product-description"),
    productCategory: document.getElementById("product-category"),
    productUnit: document.getElementById("product-unit"),
    productPrice: document.getElementById("product-price"),
    productStock: document.getElementById("product-stock"),
    productMinStock: document.getElementById("product-min-stock"),
    productStatus: document.getElementById("product-status"),
    codeError: document.getElementById("code-error"),
    nameError: document.getElementById("name-error"),
    categoryError: document.getElementById("category-error"),
    priceError: document.getElementById("price-error"),
    stockError: document.getElementById("stock-error"),
    minStockError: document.getElementById("min-stock-error"),
    detailDialog: document.getElementById("detail-dialog"),
    detailContent: document.getElementById("detail-content"),
    detailClose: document.getElementById("detail-close"),
    detailDismiss: document.getElementById("detail-dismiss"),
    toast: document.getElementById("toast")
  };

  const numberFormat = new Intl.NumberFormat("es-CO");
  const currencyFormat = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
  let toastTimeout = null;

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
    });
  }

  function getCategoryName(categoryId) {
    const category = mockData.categories.find(function (entry) { return entry.id === categoryId; });
    return category ? category.name : "Sin categoría";
  }

  function getUnit(unitId) {
    return mockData.unitsOfMeasure.find(function (entry) { return entry.id === unitId; }) || null;
  }

  function stockStatus(product) {
    const stock = Number(product.stockActual) || 0;
    const minimum = Number(product.stockMinimo) || 0;
    if (stock <= 0) return { label: "Agotado", className: "out-of-stock" };
    if (stock <= minimum) return { label: "Stock bajo", className: "low-stock" };
    return { label: "Disponible", className: "in-stock" };
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.hidden = false;
    if (toastTimeout) global.clearTimeout(toastTimeout);
    toastTimeout = global.setTimeout(function () { elements.toast.hidden = true; }, 3200);
  }

  function setUserInformation() {
    const initials = session.name.trim().split(/\s+/).slice(0, 2).map(function (part) { return part.charAt(0).toUpperCase(); }).join("");
    elements.sidebarAvatar.textContent = initials || "U";
    elements.sidebarName.textContent = session.name;
    elements.sidebarRole.textContent = session.roleLabel;
    const adminLink = document.querySelector("[data-admin-only]");
    if (adminLink) adminLink.hidden = session.role !== "administrador";
    elements.currentDate.textContent = new Intl.DateTimeFormat("es-CO", { weekday: "short", day: "2-digit", month: "short", year: "numeric", timeZone: "America/Bogota" }).format(new Date());
  }

  function populateSelects() {
    const categoryOptions = mockData.categories.map(function (category) {
      return '<option value="' + escapeHtml(category.id) + '">' + escapeHtml(category.name) + '</option>';
    }).join("");
    elements.categoryFilter.insertAdjacentHTML("beforeend", categoryOptions);
    elements.productCategory.innerHTML = '<option value="">Selecciona una categoría</option>' + categoryOptions;
    elements.productUnit.innerHTML = mockData.unitsOfMeasure.map(function (unit) {
      return '<option value="' + escapeHtml(unit.id) + '">' + escapeHtml(unit.name) + ' (' + escapeHtml(unit.symbol) + ')</option>';
    }).join("");
  }

  function renderSummary() {
    const active = state.products.filter(function (product) { return product.status === "active"; });
    const inactive = state.products.length - active.length;
    const lowStock = active.filter(function (product) { return Number(product.stockActual) <= Number(product.stockMinimo); }).length;
    elements.summaryTotal.textContent = numberFormat.format(state.products.length);
    elements.summaryActive.textContent = numberFormat.format(active.length);
    elements.summaryLowStock.textContent = numberFormat.format(lowStock);
    elements.summaryInactive.textContent = numberFormat.format(inactive);
  }

  function applyFilters() {
    state.search = elements.search.value.trim().toLocaleLowerCase("es-CO");
    state.category = elements.categoryFilter.value;
    state.status = elements.statusFilter.value;
    const selected = state.products.filter(function (product) {
      const textMatches = !state.search || [product.code, product.name, product.description, getCategoryName(product.categoryId)].some(function (value) {
        return String(value || "").toLocaleLowerCase("es-CO").includes(state.search);
      });
      const categoryMatches = state.category === "all" || product.categoryId === state.category;
      const statusMatches = state.status === "all" || product.status === state.status;
      return textMatches && categoryMatches && statusMatches;
    });
    state.filtered = selected;
    state.page = 1;
    elements.clearFilters.hidden = !(state.search || state.category !== "all" || state.status !== "all");
    renderTable();
  }

  function renderTable() {
    const total = state.filtered.length;
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    state.page = Math.min(state.page, pages);
    const startIndex = (state.page - 1) * PAGE_SIZE;
    const pageRows = state.filtered.slice(startIndex, startIndex + PAGE_SIZE);

    if (pageRows.length === 0) {
      elements.tableBody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><span class="empty-state-icon" aria-hidden="true">⌕</span><strong>No encontramos productos</strong><span>Prueba con otro término o modifica los filtros.</span></div></td></tr>';
    } else {
      elements.tableBody.innerHTML = pageRows.map(function (product) {
        const stock = stockStatus(product);
        const unit = getUnit(product.unitMeasureId);
        const activeLabel = product.status === "active" ? "Activo" : "Inactivo";
        return '<tr>' +
          '<td class="code-cell"><span>' + escapeHtml(product.code) + '</span></td>' +
          '<td class="product-cell"><strong>' + escapeHtml(product.name) + '</strong><small>' + escapeHtml(product.description || "Sin descripción") + '</small></td>' +
          '<td><span class="category-pill">' + escapeHtml(getCategoryName(product.categoryId)) + '</span></td>' +
          '<td class="stock-cell"><strong>' + numberFormat.format(Number(product.stockActual) || 0) + '</strong><small>' + escapeHtml(unit ? unit.symbol : "unid.") + ' · <span class="' + stock.className + '">' + stock.label + '</span></small></td>' +
          '<td><span class="status-pill ' + (product.status === "active" ? "status-active" : "status-inactive") + '"><i aria-hidden="true"></i>' + activeLabel + '</span></td>' +
          '<td><div class="row-actions">' +
            '<button class="row-action" type="button" data-action="view" data-id="' + escapeHtml(product.id) + '" aria-label="Ver detalles de ' + escapeHtml(product.name) + '" title="Ver detalles"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="12" r="2.8" stroke="currentColor" stroke-width="1.7"/></svg></button>' +
            '<button class="row-action" type="button" data-action="edit" data-id="' + escapeHtml(product.id) + '" aria-label="Editar ' + escapeHtml(product.name) + '" title="Editar"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m14 5 5 5M4 20l4.2-.8L19 8.4a2.1 2.1 0 0 0-3-3L5.2 16.2 4 20Z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
            '<button class="row-action ' + (product.status === "active" ? "row-action-danger" : "") + '" type="button" data-action="toggle" data-id="' + escapeHtml(product.id) + '" aria-label="' + (product.status === "active" ? "Desactivar " : "Activar ") + escapeHtml(product.name) + '" title="' + (product.status === "active" ? "Desactivar" : "Activar") + '"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' + (product.status === "active" ? '<path d="M5 7h14M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>' : '<path d="M5 12a7 7 0 1 0 2-5M5 4v4h4M12 8v4l3 2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>') + '</svg></button>' +
          '</div></td></tr>';
      }).join("");
    }

    const first = total === 0 ? 0 : startIndex + 1;
    const last = Math.min(startIndex + PAGE_SIZE, total);
    elements.paginationSummary.textContent = "Mostrando " + numberFormat.format(first) + "–" + numberFormat.format(last) + " de " + numberFormat.format(total) + " productos";
    elements.tableCount.textContent = numberFormat.format(total) + (total === 1 ? " registro" : " registros");
    renderPagination(pages);
  }

  function renderPagination(totalPages) {
    let html = '<button class="page-button page-arrow" type="button" data-page="' + (state.page - 1) + '" aria-label="Página anterior" ' + (state.page <= 1 ? "disabled" : "") + '>‹</button>';
    const pagesToShow = new Set([1, totalPages, state.page - 1, state.page, state.page + 1]);
    const sorted = Array.from(pagesToShow).filter(function (page) { return page >= 1 && page <= totalPages; }).sort(function (a, b) { return a - b; });
    let previous = 0;
    sorted.forEach(function (page) {
      if (previous && page - previous > 1) html += '<span class="page-ellipsis" aria-hidden="true">…</span>';
      html += '<button class="page-button ' + (page === state.page ? "is-current" : "") + '" type="button" data-page="' + page + '" aria-label="Página ' + page + '" ' + (page === state.page ? 'aria-current="page"' : "") + '>' + page + '</button>';
      previous = page;
    });
    html += '<button class="page-button page-arrow" type="button" data-page="' + (state.page + 1) + '" aria-label="Página siguiente" ' + (state.page >= totalPages ? "disabled" : "") + '>›</button>';
    elements.pagination.innerHTML = html;
  }

  function clearFormErrors() {
    [elements.codeError, elements.nameError, elements.categoryError, elements.priceError, elements.stockError, elements.minStockError].forEach(function (element) { element.textContent = ""; });
    [elements.productCode, elements.productName, elements.productCategory, elements.productPrice, elements.productStock, elements.productMinStock].forEach(function (field) { field.setAttribute("aria-invalid", "false"); });
    elements.dialogFeedback.hidden = true;
    elements.dialogFeedback.textContent = "";
  }

  function setFormReadOnly(readOnly) {
    [elements.productCode, elements.productName, elements.productDescription, elements.productCategory, elements.productUnit, elements.productPrice, elements.productStock, elements.productMinStock, elements.productStatus].forEach(function (field) {
      field.disabled = readOnly;
    });
    elements.dialogSave.hidden = readOnly;
  }

  function openCreateDialog() {
    state.dialogMode = "create";
    state.editingId = null;
    state.returnFocus = document.activeElement;
    elements.productForm.reset();
    elements.productId.value = "";
    elements.productUnit.value = mockData.unitsOfMeasure[0] ? mockData.unitsOfMeasure[0].id : "";
    elements.productStatus.value = "active";
    elements.dialogEyebrow.textContent = "NUEVO REGISTRO";
    elements.dialogTitle.textContent = "Nuevo producto";
    elements.dialogDescription.textContent = "Completa la información del producto para agregarlo al catálogo.";
    elements.dialogSave.textContent = "Guardar producto";
    setFormReadOnly(false);
    clearFormErrors();
    elements.productDialog.showModal();
    elements.productCode.focus();
  }

  function openEditDialog(product) {
    state.dialogMode = "edit";
    state.editingId = product.id;
    state.returnFocus = document.activeElement;
    elements.productForm.reset();
    elements.productId.value = product.id;
    elements.productCode.value = product.code;
    elements.productName.value = product.name;
    elements.productDescription.value = product.description || "";
    elements.productCategory.value = product.categoryId;
    elements.productUnit.value = product.unitMeasureId || (mockData.unitsOfMeasure[0] && mockData.unitsOfMeasure[0].id) || "";
    elements.productPrice.value = product.price;
    elements.productStock.value = product.stockActual;
    elements.productMinStock.value = product.stockMinimo;
    elements.productStatus.value = product.status;
    elements.dialogEyebrow.textContent = "ACTUALIZAR REGISTRO";
    elements.dialogTitle.textContent = "Editar producto";
    elements.dialogDescription.textContent = "Modifica los datos del producto seleccionado.";
    elements.dialogSave.textContent = "Guardar cambios";
    setFormReadOnly(false);
    clearFormErrors();
    elements.productDialog.showModal();
    elements.productCode.focus();
  }

  function openDetailDialog(product) {
    state.returnFocus = document.activeElement;
    const unit = getUnit(product.unitMeasureId);
    const status = stockStatus(product);
    const fields = [
      ["Código", product.code], ["Nombre", product.name], ["Descripción", product.description || "Sin descripción"],
      ["Categoría", getCategoryName(product.categoryId)], ["Precio", currencyFormat.format(Number(product.price) || 0)],
      ["Stock actual", numberFormat.format(Number(product.stockActual) || 0) + " " + (unit ? unit.symbol : "")],
      ["Stock mínimo", numberFormat.format(Number(product.stockMinimo) || 0) + " " + (unit ? unit.symbol : "")],
      ["Estado", product.status === "active" ? "Activo" : "Inactivo"], ["Nivel de existencias", status.label],
      ["Unidad de medida", unit ? unit.name : "No especificada"]
    ];
    elements.detailContent.innerHTML = fields.map(function (field) { return '<div class="detail-item"><span>' + escapeHtml(field[0]) + '</span><strong>' + escapeHtml(field[1]) + '</strong></div>'; }).join("");
    elements.detailDialog.showModal();
    elements.detailClose.focus();
  }

  function validateForm() {
    clearFormErrors();
    const code = elements.productCode.value.trim();
    const name = elements.productName.value.trim();
    const categoryId = elements.productCategory.value;
    const price = Number(elements.productPrice.value);
    const stock = Number(elements.productStock.value);
    const minimum = Number(elements.productMinStock.value);
    let firstInvalid = null;

    const codeExists = state.products.some(function (product) {
      return product.code.toLocaleLowerCase("es-CO") === code.toLocaleLowerCase("es-CO") && product.id !== state.editingId;
    });
    if (!code) { elements.codeError.textContent = "Ingresa el código del producto."; elements.productCode.setAttribute("aria-invalid", "true"); firstInvalid = firstInvalid || elements.productCode; }
    else if (codeExists) { elements.codeError.textContent = "Ya existe un producto con ese código."; elements.productCode.setAttribute("aria-invalid", "true"); firstInvalid = firstInvalid || elements.productCode; }
    if (!name) { elements.nameError.textContent = "Ingresa el nombre del producto."; elements.productName.setAttribute("aria-invalid", "true"); firstInvalid = firstInvalid || elements.productName; }
    if (!categoryId) { elements.categoryError.textContent = "Selecciona una categoría."; elements.productCategory.setAttribute("aria-invalid", "true"); firstInvalid = firstInvalid || elements.productCategory; }
    if (elements.productPrice.value === "" || !Number.isFinite(price) || price < 0) { elements.priceError.textContent = "Ingresa un precio válido igual o superior a cero."; elements.productPrice.setAttribute("aria-invalid", "true"); firstInvalid = firstInvalid || elements.productPrice; }
    if (elements.productStock.value === "" || !Number.isInteger(stock) || stock < 0) { elements.stockError.textContent = "Ingresa una cantidad entera igual o superior a cero."; elements.productStock.setAttribute("aria-invalid", "true"); firstInvalid = firstInvalid || elements.productStock; }
    if (elements.productMinStock.value === "" || !Number.isInteger(minimum) || minimum < 0) { elements.minStockError.textContent = "Ingresa un mínimo entero igual o superior a cero."; elements.productMinStock.setAttribute("aria-invalid", "true"); firstInvalid = firstInvalid || elements.productMinStock; }

    if (firstInvalid) {
      elements.dialogFeedback.textContent = "Revisa los campos señalados antes de guardar.";
      elements.dialogFeedback.hidden = false;
      firstInvalid.focus();
      return false;
    }
    return true;
  }

  function persistProducts() {
    const saved = global.SGI.context.saveMockCollection("products", state.products);
    if (!saved) {
      showToast("Los cambios están visibles en esta sesión, pero el navegador no permitió guardarlos de forma persistente.");
    }
  }

  function handleProductSubmit(event) {
    event.preventDefault();
    if (!validateForm()) return;

    const product = {
      id: state.editingId || "PR-" + String(Date.now()).slice(-8),
      code: elements.productCode.value.trim(),
      name: elements.productName.value.trim(),
      description: elements.productDescription.value.trim(),
      categoryId: elements.productCategory.value,
      price: Number(elements.productPrice.value),
      stockActual: Number(elements.productStock.value),
      stockMinimo: Number(elements.productMinStock.value),
      unitMeasureId: elements.productUnit.value || null,
      status: elements.productStatus.value
    };

    if (state.dialogMode === "edit") {
      const index = state.products.findIndex(function (entry) { return entry.id === state.editingId; });
      if (index < 0) { elements.dialogFeedback.textContent = "No encontramos el producto que intentas modificar."; elements.dialogFeedback.hidden = false; return; }
      state.products[index] = product;
    } else {
      state.products.unshift(product);
    }

    persistProducts();
    elements.productDialog.close();
    renderSummary();
    applyFilters();
    showToast(state.dialogMode === "edit" ? "Producto actualizado correctamente." : "Producto agregado al catálogo.");
  }

  function toggleProductStatus(product) {
    const nextStatus = product.status === "active" ? "inactive" : "active";
    const actionText = nextStatus === "inactive" ? "desactivar" : "activar";
    const accepted = global.confirm("¿Deseas " + actionText + " el producto ‘" + product.name + "’? " + (nextStatus === "inactive" ? "El registro se conservará en el catálogo para mantener la trazabilidad." : "El producto volverá a estar disponible en el catálogo activo."));
    if (!accepted) return;
    product.status = nextStatus;
    persistProducts();
    renderSummary();
    applyFilters();
    showToast(nextStatus === "inactive" ? "Producto desactivado. El registro se conserva." : "Producto activado correctamente.");
  }

  function handleTableAction(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const product = state.products.find(function (entry) { return entry.id === button.dataset.id; });
    if (!product) { showToast("No encontramos el producto seleccionado."); return; }
    if (button.dataset.action === "view") openDetailDialog(product);
    if (button.dataset.action === "edit") openEditDialog(product);
    if (button.dataset.action === "toggle") toggleProductStatus(product);
  }

  function resetFilters() {
    elements.search.value = "";
    elements.categoryFilter.value = "all";
    elements.statusFilter.value = "all";
    applyFilters();
    elements.search.focus();
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
    elements.profileToggle.addEventListener("click", function () { toggle(elements.profileToggle, elements.profileMenu, elements.notificationToggle, elements.notificationPanel); });
    elements.notificationToggle.addEventListener("click", function () { toggle(elements.notificationToggle, elements.notificationPanel, elements.profileToggle, elements.profileMenu); });
    document.addEventListener("click", function (event) {
      if (!event.target.closest(".sidebar-user")) { elements.profileMenu.hidden = true; elements.profileToggle.setAttribute("aria-expanded", "false"); }
      if (!event.target.closest(".notification-wrap")) { elements.notificationPanel.hidden = true; elements.notificationToggle.setAttribute("aria-expanded", "false"); }
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

  elements.filterForm.addEventListener("submit", function (event) { event.preventDefault(); applyFilters(); });
  elements.search.addEventListener("keydown", function (event) { if (event.key === "Enter") { event.preventDefault(); applyFilters(); } });
  elements.clearFilters.addEventListener("click", resetFilters);
  elements.newProductButton.addEventListener("click", openCreateDialog);
  elements.tableBody.addEventListener("click", handleTableAction);
  elements.pagination.addEventListener("click", function (event) {
    const button = event.target.closest("button[data-page]");
    if (!button || button.disabled) return;
    const nextPage = Number(button.dataset.page);
    const maxPages = Math.max(1, Math.ceil(state.filtered.length / PAGE_SIZE));
    if (Number.isInteger(nextPage) && nextPage >= 1 && nextPage <= maxPages) {
      state.page = nextPage;
      renderTable();
      document.getElementById("products-table-heading").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
  elements.productForm.addEventListener("submit", handleProductSubmit);
  elements.dialogClose.addEventListener("click", function () { closeDialog(elements.productDialog); });
  elements.dialogCancel.addEventListener("click", function () { closeDialog(elements.productDialog); });
  elements.detailClose.addEventListener("click", function () { closeDialog(elements.detailDialog); });
  elements.detailDismiss.addEventListener("click", function () { closeDialog(elements.detailDialog); });
  elements.productDialog.addEventListener("click", function (event) { if (event.target === elements.productDialog) closeDialog(elements.productDialog); });
  elements.detailDialog.addEventListener("click", function (event) { if (event.target === elements.detailDialog) closeDialog(elements.detailDialog); });
  elements.logoutButton.addEventListener("click", function () {
    global.SGI.context.clearSession();
    global.location.replace("../login.html");
  });
  document.querySelectorAll("[data-coming-soon]").forEach(function (button) {
    button.addEventListener("click", function () { showToast("La vista de " + button.dataset.comingSoon + " se incorporará en la siguiente etapa del prototipo."); });
  });

  setUserInformation();
  populateSelects();
  renderSummary();
  state.filtered = state.products.slice();
  renderTable();
  initPopovers();
})(window);
