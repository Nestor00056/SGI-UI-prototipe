(function (global) {
  "use strict";

  const context = global.SGI && global.SGI.context;
  const mock = global.SGI && global.SGI.mockData;
  const session = context && context.getSession();
  if (!session) {
    global.location.replace("../login.html");
    return;
  }
  if (!mock || !Array.isArray(mock.movements) || !Array.isArray(mock.auditEvents)) {
    document.body.innerHTML = '<main style="font-family: sans-serif; padding: 2rem"><h1>No se pudieron cargar los datos de demostración.</h1><p>Comprueba que mock-data.js se encuentre en la carpeta js.</p></main>';
    return;
  }

  const products = mock.products || [];
  const categories = mock.categories || [];
  const movements = mock.movements.slice().sort(function (a, b) { return b.dateTime.localeCompare(a.dateTime); });
  const auditEvents = mock.auditEvents.slice().sort(function (a, b) { return b.dateTime.localeCompare(a.dateTime); });
  const productById = new Map(products.map(function (product) { return [product.id, product]; }));
  const categoryById = new Map(categories.map(function (category) { return [category.id, category]; }));
  const numberFormat = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
  const currencyFormat = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
  const pageSize = 8;
  let toastTimer = null;
  let activeContrast = [];

  const $ = function (id) { return document.getElementById(id); };
  const el = {
    sidebarAvatar: $("sidebar-avatar"), sidebarName: $("sidebar-user-name"), sidebarRole: $("sidebar-user-role"),
    currentDate: $("current-date"), logout: $("logout-button"), profileToggle: $("profile-menu-toggle"), profileMenu: $("profile-menu"),
    notificationToggle: $("notification-toggle"), notificationPanel: $("notification-panel"), notificationList: $("notification-list"), toast: $("toast"),
    tabs: Array.from(document.querySelectorAll("[data-tab]")), panels: Array.from(document.querySelectorAll("[role='tabpanel']")),
    movementForm: $("movement-filter-form"), movementFrom: $("movement-from"), movementTo: $("movement-to"), movementType: $("movement-type-filter"), movementProduct: $("movement-product-filter"), movementError: $("movement-filter-error"), movementBody: $("movement-table-body"), movementPagination: $("movement-pagination"),
    auditForm: $("audit-filter-form"), auditFrom: $("audit-from"), auditTo: $("audit-to"), auditAction: $("audit-action-filter"), auditProduct: $("audit-product-filter"), auditError: $("audit-filter-error"), auditBody: $("audit-table-body"), auditPagination: $("audit-pagination"),
    contrastForm: $("contrast-filter-form"), contrastFrom: $("contrast-from"), contrastTo: $("contrast-to"), contrastProduct: $("contrast-product-filter"), contrastError: $("contrast-filter-error"), contrastBody: $("contrast-table-body"),
    reportForm: $("report-form"), reportType: $("report-type"), reportFrom: $("report-from"), reportTo: $("report-to"), reportDateRange: $("report-date-range"), reportDateToWrap: $("report-date-to-wrap"), reportError: $("report-filter-error"), reportOutput: $("report-output"), reportTitle: $("report-output-title"), reportDescription: $("report-output-description")
  };

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character];
    });
  }

  function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Fecha no disponible";
    return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "America/Bogota" }).format(date);
  }

  function formatDate(value) {
    if (!value) return "—";
    const parts = value.split("-").map(Number);
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", year: "numeric" }).format(date);
  }

  function dateOnly(value) { return String(value || "").slice(0, 10); }

  function getProduct(productId) {
    return productById.get(productId) || { id: productId || "—", code: "—", name: "Producto no encontrado", categoryId: "", stockActual: 0, stockMinimo: 0, price: 0, status: "inactive" };
  }

  function getCategoryName(product) {
    const category = categoryById.get(product.categoryId);
    return category ? category.name : "Sin categoría";
  }

  function movementImpact(movement) {
    if (movement.type === "ENTRADA") return Number(movement.quantity) || 0;
    if (movement.type === "SALIDA") return -(Number(movement.quantity) || 0);
    return movement.adjustmentDirection === "increase" ? Number(movement.quantity) || 0 : -(Number(movement.quantity) || 0);
  }

  function signedNumber(value) {
    const amount = Number(value) || 0;
    if (amount > 0) return "+" + numberFormat.format(amount);
    if (amount < 0) return "−" + numberFormat.format(Math.abs(amount));
    return "0";
  }

  function setUserInformation() {
    const initials = String(session.name || "Usuario").trim().split(/\s+/).slice(0, 2).map(function (part) { return part.charAt(0).toUpperCase(); }).join("");
    el.sidebarAvatar.textContent = initials || "U";
    el.sidebarName.textContent = session.name || "Usuario";
    el.sidebarRole.textContent = session.roleLabel || "Usuario";
    const adminLink = document.querySelector("[data-admin-only]");
    if (adminLink) adminLink.hidden = session.role !== "administrador";
    try {
      el.currentDate.textContent = new Intl.DateTimeFormat("es-CO", { weekday: "short", day: "2-digit", month: "short", year: "numeric", timeZone: "America/Bogota" }).format(new Date());
    } catch (error) { el.currentDate.textContent = new Date().toLocaleDateString("es-CO"); }
  }

  function showToast(message) {
    el.toast.textContent = message;
    el.toast.hidden = false;
    if (toastTimer) global.clearTimeout(toastTimer);
    toastTimer = global.setTimeout(function () { el.toast.hidden = true; }, 3000);
  }

  function closePopovers() {
    el.profileMenu.hidden = true;
    el.profileToggle.setAttribute("aria-expanded", "false");
    el.notificationPanel.hidden = true;
    el.notificationToggle.setAttribute("aria-expanded", "false");
  }

  function togglePopover(button, panel, otherButton, otherPanel) {
    const shouldOpen = panel.hidden;
    otherPanel.hidden = true;
    otherButton.setAttribute("aria-expanded", "false");
    panel.hidden = !shouldOpen;
    button.setAttribute("aria-expanded", String(shouldOpen));
  }

  function setOptions(select, includeAllLabel) {
    const options = ['<option value="all">' + escapeHtml(includeAllLabel) + '</option>'];
    products.forEach(function (product) {
      options.push('<option value="' + escapeHtml(product.id) + '">' + escapeHtml(product.code + " · " + product.name) + '</option>');
    });
    select.innerHTML = options.join("");
  }

  function getDateDefaults() {
    const latest = movements.reduce(function (current, item) { return item.dateTime > current ? item.dateTime : current; }, "2026-11-22T00:00:00-05:00");
    const end = dateOnly(latest);
    const date = new Date(end + "T12:00:00");
    date.setDate(date.getDate() - 21);
    const start = date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
    return { from: start, to: end };
  }

  const defaults = getDateDefaults();

  function applyDateDefaults() {
    [el.movementFrom, el.auditFrom, el.contrastFrom, el.reportFrom].forEach(function (input) { input.value = defaults.from; });
    [el.movementTo, el.auditTo, el.contrastTo, el.reportTo].forEach(function (input) { input.value = defaults.to; });
  }

  function validateRange(from, to, errorElement) {
    if (!from.value || !to.value) {
      errorElement.textContent = "Selecciona una fecha de inicio y una fecha de fin.";
      errorElement.hidden = false;
      return false;
    }
    if (from.value > to.value) {
      errorElement.textContent = "La fecha inicial no puede ser posterior a la fecha final.";
      errorElement.hidden = false;
      from.focus();
      return false;
    }
    errorElement.textContent = "";
    errorElement.hidden = true;
    return true;
  }

  function inDateRange(dateTime, from, to) {
    const date = dateOnly(dateTime);
    return (!from || date >= from) && (!to || date <= to);
  }

  function paginate(items, page) {
    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
    const safePage = Math.min(Math.max(page, 1), totalPages);
    return { page: safePage, totalPages: totalPages, items: items.slice((safePage - 1) * pageSize, safePage * pageSize), start: items.length ? (safePage - 1) * pageSize + 1 : 0, end: Math.min(safePage * pageSize, items.length) };
  }

  function renderPagination(container, currentPage, totalPages, onPage) {
    if (totalPages <= 1) { container.innerHTML = ""; return; }
    const buttons = [];
    function button(label, page, disabled, current) {
      return '<button class="page-button' + (current ? ' is-current' : '') + '" type="button" data-page="' + page + '"' + (disabled ? ' disabled' : '') + (current ? ' aria-current="page"' : '') + '>' + label + '</button>';
    }
    buttons.push(button("‹", currentPage - 1, currentPage <= 1, false));
    let pages = [];
    if (totalPages <= 5) {
      for (let p = 1; p <= totalPages; p += 1) pages.push(p);
    } else {
      pages = Array.from(new Set([1, currentPage - 1, currentPage, currentPage + 1, totalPages].filter(function (p) { return p >= 1 && p <= totalPages; }))).sort(function (a, b) { return a - b; });
    }
    let previous = 0;
    pages.forEach(function (page) {
      if (page - previous > 1) buttons.push('<span class="pagination-ellipsis" aria-hidden="true">…</span>');
      buttons.push(button(String(page), page, false, page === currentPage));
      previous = page;
    });
    buttons.push(button("›", currentPage + 1, currentPage >= totalPages, false));
    container.innerHTML = buttons.join("");
    container.querySelectorAll("button[data-page]").forEach(function (control) {
      control.addEventListener("click", function () { onPage(Number(control.dataset.page)); });
    });
  }

  let movementFiltered = movements.slice();
  let movementPage = 1;
  function getMovementFilters() {
    return { from: el.movementFrom.value, to: el.movementTo.value, type: el.movementType.value, productId: el.movementProduct.value };
  }

  function filterMovements(filters) {
    return movements.filter(function (movement) {
      return inDateRange(movement.dateTime, filters.from, filters.to) &&
        (filters.type === "all" || movement.type === filters.type) &&
        (filters.productId === "all" || movement.productId === filters.productId);
    }).sort(function (a, b) { return b.dateTime.localeCompare(a.dateTime); });
  }

  function renderMovementSummary(items) {
    const entries = items.filter(function (item) { return item.type === "ENTRADA"; }).reduce(function (sum, item) { return sum + item.quantity; }, 0);
    const exits = items.filter(function (item) { return item.type === "SALIDA"; }).reduce(function (sum, item) { return sum + item.quantity; }, 0);
    const adjustments = items.filter(function (item) { return item.type === "AJUSTE"; }).length;
    $("movement-entry-total").textContent = numberFormat.format(entries);
    $("movement-exit-total").textContent = numberFormat.format(exits);
    $("movement-adjustment-total").textContent = numberFormat.format(adjustments);
    $("movement-event-total").textContent = numberFormat.format(items.length);
    $("movement-total").textContent = numberFormat.format(items.length) + " movimientos";
    $("movement-count").textContent = numberFormat.format(items.length) + " registros";
  }

  function movementTypeLabel(type) { return type === "ENTRADA" ? "Entrada" : type === "SALIDA" ? "Salida" : "Ajuste"; }
  function movementTypeClass(type) { return type === "ENTRADA" ? "entry" : type === "SALIDA" ? "exit" : "adjustment"; }

  function renderMovementTable(page) {
    const result = paginate(movementFiltered, page);
    movementPage = result.page;
    if (!result.items.length) {
      el.movementBody.innerHTML = '<tr><td colspan="7" class="empty-state">No se encontraron movimientos con los filtros seleccionados.</td></tr>';
    } else {
      el.movementBody.innerHTML = result.items.map(function (movement) {
        const product = getProduct(movement.productId);
        const quantityText = movement.type === "AJUSTE" ? signedNumber(movementImpact(movement)) : (movement.type === "SALIDA" ? "−" : "+") + numberFormat.format(movement.quantity);
        return '<tr>' +
          '<td class="date-cell">' + escapeHtml(formatDateTime(movement.dateTime)) + '</td>' +
          '<td><span class="movement-type-pill ' + movementTypeClass(movement.type) + '">' + movementTypeLabel(movement.type) + '</span></td>' +
          '<td class="movement-product-cell"><strong>' + escapeHtml(product.name) + '</strong><small>' + escapeHtml(product.code) + '</small></td>' +
          '<td class="quantity-cell ' + (movement.type === "ENTRADA" || (movement.type === "AJUSTE" && movement.adjustmentDirection === "increase") ? 'positive-value' : 'negative-value') + '">' + escapeHtml(quantityText) + '</td>' +
          '<td><span class="stock-change-pill">Existencias</span></td>' +
          '<td class="user-cell">' + escapeHtml(movement.userName) + '</td>' +
          '<td class="description-cell">' + escapeHtml(movement.description) + '</td>' +
          '</tr>';
      }).join("");
    }
    $("movement-pagination-summary").textContent = result.items.length ? "Mostrando " + numberFormat.format(result.start) + "–" + numberFormat.format(result.end) + " de " + numberFormat.format(movementFiltered.length) + " movimientos" : "Mostrando 0 movimientos";
    renderPagination(el.movementPagination, result.page, result.totalPages, renderMovementTable);
  }

  function runMovementFilters(resetPage) {
    const filters = getMovementFilters();
    if (!validateRange(el.movementFrom, el.movementTo, el.movementError)) return;
    movementFiltered = filterMovements(filters);
    renderMovementSummary(movementFiltered);
    renderMovementTable(resetPage ? 1 : movementPage);
  }

  let auditFiltered = auditEvents.slice();
  let auditPage = 1;
  function filterAudit() {
    const from = el.auditFrom.value;
    const to = el.auditTo.value;
    const action = el.auditAction.value;
    const productId = el.auditProduct.value;
    return auditEvents.filter(function (event) {
      return inDateRange(event.dateTime, from, to) && (action === "all" || event.action === action) && (productId === "all" || event.productId === productId);
    }).sort(function (a, b) { return b.dateTime.localeCompare(a.dateTime); });
  }

  function auditActionClass(action) { return action === "CREAR" ? "create" : action === "MODIFICAR" ? "update" : "deactivate"; }
  function auditActionLabel(action) { return action === "CREAR" ? "Crear" : action === "MODIFICAR" ? "Modificar" : "Desactivar"; }

  function renderAuditTable(page) {
    const result = paginate(auditFiltered, page);
    auditPage = result.page;
    if (!result.items.length) {
      el.auditBody.innerHTML = '<tr><td colspan="6" class="empty-state">No se encontraron acciones de auditoría con los filtros seleccionados.</td></tr>';
    } else {
      el.auditBody.innerHTML = result.items.map(function (event) {
        const product = getProduct(event.productId);
        return '<tr>' +
          '<td class="date-cell">' + escapeHtml(formatDateTime(event.dateTime)) + '</td>' +
          '<td><span class="audit-action-pill ' + auditActionClass(event.action) + '">' + auditActionLabel(event.action) + '</span></td>' +
          '<td class="audit-product-cell"><strong>' + escapeHtml(product.name) + '</strong><small>' + escapeHtml(product.code) + ' · ' + escapeHtml(event.id) + '</small></td>' +
          '<td class="user-cell">' + escapeHtml(event.userName) + '</td>' +
          '<td class="description-cell">' + escapeHtml(event.description) + '</td>' +
          '<td><button class="row-detail-button" type="button" data-audit-detail="' + escapeHtml(event.id) + '">Ver cambios</button></td>' +
          '</tr>';
      }).join("");
      el.auditBody.querySelectorAll("[data-audit-detail]").forEach(function (button) {
        button.addEventListener("click", function () { openAuditDetail(button.dataset.auditDetail); });
      });
    }
    $("audit-total").textContent = numberFormat.format(auditFiltered.length) + " acciones";
    $("audit-count").textContent = numberFormat.format(auditFiltered.length) + " acciones";
    $("audit-pagination-summary").textContent = result.items.length ? "Mostrando " + numberFormat.format(result.start) + "–" + numberFormat.format(result.end) + " de " + numberFormat.format(auditFiltered.length) + " acciones" : "Mostrando 0 acciones";
    renderPagination(el.auditPagination, result.page, result.totalPages, renderAuditTable);
  }

  function runAuditFilters(resetPage) {
    if (!validateRange(el.auditFrom, el.auditTo, el.auditError)) return;
    auditFiltered = filterAudit();
    renderAuditTable(resetPage ? 1 : auditPage);
  }

  function renderChangeColumns(before, after) {
    const beforeEntries = Object.entries(before || {});
    const afterEntries = Object.entries(after || {});
    function card(title, entries, className, emptyText) {
      const rows = entries.length ? entries.map(function (pair) {
        return '<div class="audit-change-row"><span>' + escapeHtml(pair[0]) + '</span><span>' + escapeHtml(pair[1]) + '</span></div>';
      }).join("") : '<p class="empty-state">' + emptyText + '</p>';
      return '<section class="audit-change-card ' + className + '"><h3>' + title + '</h3>' + rows + '</section>';
    }
    return '<div class="audit-change-grid">' + card("Valores anteriores", beforeEntries, "before", "No existían valores previos.") + card("Valores nuevos", afterEntries, "after", "No se registraron valores nuevos.") + '</div>';
  }

  function openAuditDetail(eventId) {
    const event = auditEvents.find(function (item) { return item.id === eventId; });
    if (!event) return;
    const product = getProduct(event.productId);
    $("audit-detail-title").textContent = "Detalle de " + event.id;
    $("audit-detail-description").textContent = event.description;
    $("audit-detail-body").innerHTML = '<div class="dialog-meta"><div class="dialog-meta-item"><small>Producto afectado</small><strong>' + escapeHtml(product.name) + '</strong></div><div class="dialog-meta-item"><small>Fecha y hora</small><strong>' + escapeHtml(formatDateTime(event.dateTime)) + '</strong></div><div class="dialog-meta-item"><small>Acción</small><strong>' + auditActionLabel(event.action) + '</strong></div><div class="dialog-meta-item"><small>Usuario responsable</small><strong>' + escapeHtml(event.userName) + '</strong></div></div>' + renderChangeColumns(event.valuesBefore, event.valuesAfter);
    $("audit-detail-dialog").showModal();
  }

  function buildContrast(from, to, productId) {
    const selected = movements.filter(function (movement) {
      return inDateRange(movement.dateTime, from, to) && (productId === "all" || movement.productId === productId);
    });
    const groups = new Map();
    selected.forEach(function (movement) {
      if (!groups.has(movement.productId)) groups.set(movement.productId, []);
      groups.get(movement.productId).push(movement);
    });
    const result = [];
    groups.forEach(function (items, id) {
      items.sort(function (a, b) { return a.dateTime.localeCompare(b.dateTime); });
      const first = items[0];
      const last = items[items.length - 1];
      const entries = items.filter(function (item) { return item.type === "ENTRADA"; }).reduce(function (sum, item) { return sum + item.quantity; }, 0);
      const exits = items.filter(function (item) { return item.type === "SALIDA"; }).reduce(function (sum, item) { return sum + item.quantity; }, 0);
      const adjustmentsPositive = items.filter(function (item) { return item.type === "AJUSTE" && item.adjustmentDirection === "increase"; }).reduce(function (sum, item) { return sum + item.quantity; }, 0);
      const adjustmentsNegative = items.filter(function (item) { return item.type === "AJUSTE" && item.adjustmentDirection === "decrease"; }).reduce(function (sum, item) { return sum + item.quantity; }, 0);
      const stockStart = Number(first.stockBefore);
      const stockEnd = Number(last.stockAfter);
      const computedEnd = stockStart + entries - exits + adjustmentsPositive - adjustmentsNegative;
      result.push({ productId: id, movements: items, stockStart: stockStart, entries: entries, exits: exits, adjustmentPositive: adjustmentsPositive, adjustmentNegative: adjustmentsNegative, adjustments: adjustmentsPositive - adjustmentsNegative, stockEnd: stockEnd, variation: stockEnd - stockStart, computedEnd: computedEnd });
    });
    return result.sort(function (a, b) { return getProduct(a.productId).name.localeCompare(getProduct(b.productId).name, "es"); });
  }

  function renderContrast(from, to, productId) {
    activeContrast = buildContrast(from, to, productId);
    const totals = activeContrast.reduce(function (sum, row) {
      sum.entries += row.entries; sum.exits += row.exits; sum.adjustments += row.adjustments; sum.operations += row.movements.length; return sum;
    }, { entries: 0, exits: 0, adjustments: 0, operations: 0 });
    $("contrast-entry-total").textContent = numberFormat.format(totals.entries);
    $("contrast-exit-total").textContent = numberFormat.format(totals.exits);
    $("contrast-adjustment-total").textContent = signedNumber(totals.adjustments);
    $("contrast-operation-total").textContent = numberFormat.format(totals.operations);
    $("contrast-products-count").textContent = numberFormat.format(activeContrast.length) + " productos con movimiento";
    $("contrast-count").textContent = numberFormat.format(activeContrast.length) + " productos";
    if (!activeContrast.length) {
      el.contrastBody.innerHTML = '<tr><td colspan="8" class="empty-state">No hay productos con movimientos en el intervalo seleccionado.</td></tr>';
      $("contrast-result-summary").textContent = "No se encontraron movimientos entre " + formatDate(from) + " y " + formatDate(to) + ".";
      return;
    }
    el.contrastBody.innerHTML = activeContrast.map(function (row) {
      const product = getProduct(row.productId);
      const adjustmentClass = row.adjustments > 0 ? "positive-value" : row.adjustments < 0 ? "negative-value" : "neutral-value";
      const variationClass = row.variation > 0 ? "positive-value" : row.variation < 0 ? "negative-value" : "neutral-value";
      return '<tr>' +
        '<td class="contrast-product"><strong>' + escapeHtml(product.name) + '</strong><small>' + escapeHtml(product.code) + ' · ' + escapeHtml(getCategoryName(product)) + '</small></td>' +
        '<td class="neutral-value">' + numberFormat.format(row.stockStart) + '</td>' +
        '<td class="positive-value">+' + numberFormat.format(row.entries) + '</td>' +
        '<td class="negative-value">−' + numberFormat.format(row.exits) + '</td>' +
        '<td class="' + adjustmentClass + '" title="Ajustes positivos: ' + numberFormat.format(row.adjustmentPositive) + '; ajustes negativos: ' + numberFormat.format(row.adjustmentNegative) + '">' + signedNumber(row.adjustments) + '</td>' +
        '<td class="neutral-value">' + numberFormat.format(row.stockEnd) + '</td>' +
        '<td class="' + variationClass + '">' + signedNumber(row.variation) + '</td>' +
        '<td><button class="row-detail-button" type="button" data-contrast-detail="' + escapeHtml(row.productId) + '">Ver movimientos</button></td>' +
        '</tr>';
    }).join("");
    el.contrastBody.querySelectorAll("[data-contrast-detail]").forEach(function (button) {
      button.addEventListener("click", function () { openContrastDetail(button.dataset.contrastDetail); });
    });
    $("contrast-result-summary").textContent = "Comparación de " + numberFormat.format(activeContrast.length) + " productos con movimientos entre " + formatDate(from) + " y " + formatDate(to) + ".";
  }

  function runContrast() {
    if (!validateRange(el.contrastFrom, el.contrastTo, el.contrastError)) return;
    renderContrast(el.contrastFrom.value, el.contrastTo.value, el.contrastProduct.value);
  }

  function openContrastDetail(productId) {
    const row = activeContrast.find(function (item) { return item.productId === productId; });
    if (!row) return;
    const product = getProduct(productId);
    $("contrast-detail-title").textContent = product.name;
    $("contrast-detail-description").textContent = "Operaciones que explican la variación de existencias del producto.";
    const rows = row.movements.map(function (movement) {
      const impact = movementImpact(movement);
      return '<tr><td>' + escapeHtml(formatDateTime(movement.dateTime)) + '</td><td><span class="movement-type-pill ' + movementTypeClass(movement.type) + '">' + movementTypeLabel(movement.type) + '</span></td><td class="' + (impact > 0 ? 'positive-value' : 'negative-value') + '">' + signedNumber(impact) + '</td><td>' + escapeHtml(movement.userName) + '</td><td>' + escapeHtml(movement.description) + '</td></tr>';
    }).join("");
    $("contrast-detail-body").innerHTML = '<div class="dialog-meta"><div class="dialog-meta-item"><small>Stock al inicio</small><strong>' + numberFormat.format(row.stockStart) + '</strong></div><div class="dialog-meta-item"><small>Stock al final</small><strong>' + numberFormat.format(row.stockEnd) + '</strong></div><div class="dialog-meta-item"><small>Variación neta</small><strong>' + signedNumber(row.variation) + '</strong></div><div class="dialog-meta-item"><small>Operaciones registradas</small><strong>' + numberFormat.format(row.movements.length) + '</strong></div></div><div class="dialog-movement-list"><table><thead><tr><th>Fecha y hora</th><th>Operación</th><th>Impacto</th><th>Usuario</th><th>Descripción</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    $("contrast-detail-dialog").showModal();
  }

  function totalInventoryValue() {
    return products.reduce(function (sum, product) { return sum + (Number(product.stockActual) || 0) * (Number(product.price) || 0); }, 0);
  }

  function getLowStockProducts() {
    return products.filter(function (product) { return product.status === "active" && Number(product.stockActual) <= Number(product.stockMinimo); })
      .sort(function (a, b) { return (a.stockActual - a.stockMinimo) - (b.stockActual - b.stockMinimo); });
  }

  function reportKpis(items) {
    return '<div class="report-kpi-grid">' + items.map(function (item) {
      return '<div class="report-kpi"><small>' + escapeHtml(item.label) + '</small><strong>' + escapeHtml(item.value) + '</strong></div>';
    }).join("") + '</div>';
  }

  function reportTable(headers, rows, caption) {
    if (!rows.length) return '<p class="empty-state">No hay información para mostrar en este reporte.</p>';
    return '<div class="report-table-wrap"><table class="report-table"><caption class="visually-hidden">' + escapeHtml(caption) + '</caption><thead><tr>' + headers.map(function (header) { return '<th scope="col">' + escapeHtml(header) + '</th>'; }).join("") + '</tr></thead><tbody>' + rows.map(function (row) { return '<tr>' + row.map(function (cell) { return '<td>' + cell + '</td>'; }).join("") + '</tr>'; }).join("") + '</tbody></table></div>';
  }

  function setReportHeading(title, description) {
    el.reportTitle.textContent = title;
    el.reportDescription.textContent = description;
  }

  function renderOverviewReport() {
    const active = products.filter(function (product) { return product.status === "active"; });
    const lowStock = getLowStockProducts();
    const units = active.reduce(function (sum, product) { return sum + Number(product.stockActual || 0); }, 0);
    const value = active.reduce(function (sum, product) { return sum + Number(product.stockActual || 0) * Number(product.price || 0); }, 0);
    setReportHeading("Resumen general del inventario", "Estado actual del catálogo, las existencias y el valor estimado del inventario.");
    const categoryRows = categories.map(function (category) {
      const rows = active.filter(function (product) { return product.categoryId === category.id; });
      if (!rows.length) return null;
      return [escapeHtml(category.name), numberFormat.format(rows.length), numberFormat.format(rows.reduce(function (sum, product) { return sum + Number(product.stockActual || 0); }, 0)), currencyFormat.format(rows.reduce(function (sum, product) { return sum + Number(product.stockActual || 0) * Number(product.price || 0); }, 0))];
    }).filter(Boolean);
    el.reportOutput.innerHTML = '<div class="report-output-body">' + reportKpis([
      { label: "Productos registrados", value: numberFormat.format(products.length) },
      { label: "Productos activos", value: numberFormat.format(active.length) },
      { label: "Productos con stock bajo", value: numberFormat.format(lowStock.length) },
      { label: "Valor estimado", value: currencyFormat.format(value) }
    ]) + '<h4 class="report-subheading">Existencias por categoría</h4>' + reportTable(["Categoría", "Productos activos", "Unidades disponibles", "Valor estimado"], categoryRows, "Resumen de inventario agrupado por categoría") + '<p class="table-footnote">Unidades disponibles: ' + numberFormat.format(units) + '. Los valores se calculan con los datos ficticios del catálogo.</p></div>';
  }

  function renderTopMovingReport() {
    const top = (mock.dashboard && mock.dashboard.topMovingProducts) ? mock.dashboard.topMovingProducts.slice() : [];
    setReportHeading("Productos con mayor movimiento", "Mismo conjunto de productos y cifras agregadas que se presenta en el widget del Dashboard.");
    const highest = Math.max.apply(null, top.map(function (product) { return Number(product.unitsMoved) || 0; }).concat([1]));
    const items = top.map(function (product, index) {
      const share = Math.max(0, Math.min(100, Number(product.share) || 0));
      return '<div class="report-highlight"><span class="report-rank">' + (index + 1) + '</span><span class="report-highlight-copy"><strong>' + escapeHtml(product.name) + '</strong><small>' + escapeHtml(product.brand || "Sin marca") + ' · ' + share.toLocaleString("es-CO", { maximumFractionDigits: 1 }) + '% de participación</small></span><span class="report-highlight-value">' + numberFormat.format(product.unitsMoved) + ' uds.</span></div>';
    }).join("");
    const rows = top.map(function (product) { return [escapeHtml(product.name), escapeHtml(product.brand || "—"), numberFormat.format(product.unitsMoved), (Number(product.share) || 0).toLocaleString("es-CO", { maximumFractionDigits: 1 }) + "%"]; });
    el.reportOutput.innerHTML = '<div class="report-output-body">' + reportKpis([{ label: "Productos destacados", value: numberFormat.format(top.length) }, { label: "Unidades del top", value: numberFormat.format(top.reduce(function (sum, product) { return sum + Number(product.unitsMoved || 0); }, 0)) }, { label: "Producto líder", value: top.length ? top[0].name : "—" }, { label: "Mayor participación", value: top.length ? (Number(top[0].share) || 0).toLocaleString("es-CO", { maximumFractionDigits: 1 }) + "%" : "—" }]) + '<h4 class="report-subheading">Ranking de productos</h4>' + items + '<h4 class="report-subheading" style="margin-top:16px">Detalle tabular</h4>' + reportTable(["Producto", "Marca", "Unidades movidas", "Participación"], rows, "Productos con mayor movimiento") + '<p class="table-footnote">Estas cifras son datos agregados de demostración del Dashboard; no corresponden a una venta ni transacción real individual.</p></div>';
  }

  function renderLowStockReport() {
    const low = getLowStockProducts();
    setReportHeading("Alertas de stock", "Productos activos cuyo stock actual alcanzó o quedó por debajo del nivel mínimo configurado.");
    const rows = low.map(function (product) {
      const difference = Number(product.stockActual) - Number(product.stockMinimo);
      return [escapeHtml(product.code), escapeHtml(product.name), escapeHtml(getCategoryName(product)), numberFormat.format(product.stockActual), numberFormat.format(product.stockMinimo), '<span class="' + (difference < 0 ? 'negative-value' : 'neutral-value') + '">' + signedNumber(difference) + '</span>'];
    });
    el.reportOutput.innerHTML = '<div class="report-output-body">' + reportKpis([{ label: "Productos en alerta", value: numberFormat.format(low.length) }, { label: "Sin existencias", value: numberFormat.format(low.filter(function (p) { return Number(p.stockActual) === 0; }).length) }, { label: "Con stock en mínimo", value: numberFormat.format(low.filter(function (p) { return Number(p.stockActual) === Number(p.stockMinimo); }).length) }, { label: "Productos activos revisados", value: numberFormat.format(products.filter(function (p) { return p.status === "active"; }).length) }]) + '<h4 class="report-subheading">Productos que requieren atención</h4>' + reportTable(["Código", "Producto", "Categoría", "Stock actual", "Stock mínimo", "Diferencia"], rows, "Productos con stock igual o inferior al mínimo") + '</div>';
  }

  function renderMovementSummaryReport(from, to) {
    const subset = filterMovements({ from: from, to: to, type: "all", productId: "all" });
    const byType = ["ENTRADA", "SALIDA", "AJUSTE"].map(function (type) {
      const records = subset.filter(function (item) { return item.type === type; });
      const quantity = records.reduce(function (sum, item) { return sum + (type === "AJUSTE" ? Math.abs(movementImpact(item)) : item.quantity); }, 0);
      return [movementTypeLabel(type), numberFormat.format(records.length), numberFormat.format(quantity)];
    });
    const affected = new Set(subset.map(function (item) { return item.productId; }));
    const totalDelta = subset.reduce(function (sum, item) { return sum + movementImpact(item); }, 0);
    setReportHeading("Movimientos por período", "Resumen de operaciones entre " + formatDate(from) + " y " + formatDate(to) + ".");
    el.reportOutput.innerHTML = '<div class="report-output-body">' + reportKpis([{ label: "Operaciones registradas", value: numberFormat.format(subset.length) }, { label: "Productos afectados", value: numberFormat.format(affected.size) }, { label: "Unidades de entrada", value: numberFormat.format(subset.filter(function (m) { return m.type === "ENTRADA"; }).reduce(function (s, m) { return s + m.quantity; }, 0)) }, { label: "Variación neta", value: signedNumber(totalDelta) }]) + '<h4 class="report-subheading">Resumen por tipo de movimiento</h4>' + reportTable(["Tipo de movimiento", "Operaciones", "Unidades"], byType, "Resumen de movimientos por tipo") + '</div>';
  }

  function updateReportDateVisibility() {
    const needsRange = el.reportType.value === "movement-summary";
    el.reportDateRange.hidden = !needsRange;
    el.reportDateToWrap.hidden = !needsRange;
  }

  function renderReport() {
    const reportType = el.reportType.value;
    if (reportType !== "movement-summary") { el.reportError.textContent = ""; el.reportError.hidden = true; }
    el.reportOutput.setAttribute("aria-busy", "true");
    if (reportType === "overview") renderOverviewReport();
    else if (reportType === "top-moving") renderTopMovingReport();
    else if (reportType === "low-stock") renderLowStockReport();
    else if (reportType === "movement-summary") {
      if (!validateRange(el.reportFrom, el.reportTo, el.reportError)) { el.reportOutput.setAttribute("aria-busy", "false"); return; }
      renderMovementSummaryReport(el.reportFrom.value, el.reportTo.value);
    }
    el.reportOutput.setAttribute("aria-busy", "false");
  }

  function activateTab(tabName, shouldFocus) {
    const valid = ["movimientos", "auditoria", "contraste", "reportes"].includes(tabName) ? tabName : "movimientos";
    el.tabs.forEach(function (tab) {
      const active = tab.dataset.tab === valid;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
      if (active && shouldFocus) tab.focus();
    });
    el.panels.forEach(function (panel) { panel.hidden = panel.id !== "panel-" + valid; });
    if (valid === "contraste" && !activeContrast.length) runContrast();
    if (valid === "reportes") renderReport();
  }

  el.tabs.forEach(function (tab, index) {
    tab.addEventListener("click", function () { activateTab(tab.dataset.tab, false); });
    tab.addEventListener("keydown", function (event) {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      let next = index;
      if (event.key === "ArrowRight") next = (index + 1) % el.tabs.length;
      if (event.key === "ArrowLeft") next = (index - 1 + el.tabs.length) % el.tabs.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = el.tabs.length - 1;
      activateTab(el.tabs[next].dataset.tab, true);
    });
  });

  el.movementForm.addEventListener("submit", function (event) { event.preventDefault(); runMovementFilters(true); });
  el.movementForm.addEventListener("reset", function () {
    global.setTimeout(function () { el.movementFrom.value = defaults.from; el.movementTo.value = defaults.to; el.movementType.value = "all"; el.movementProduct.value = "all"; runMovementFilters(true); }, 0);
  });
  el.auditForm.addEventListener("submit", function (event) { event.preventDefault(); runAuditFilters(true); });
  el.auditForm.addEventListener("reset", function () {
    global.setTimeout(function () { el.auditFrom.value = defaults.from; el.auditTo.value = defaults.to; el.auditAction.value = "all"; el.auditProduct.value = "all"; runAuditFilters(true); }, 0);
  });
  el.contrastForm.addEventListener("submit", function (event) { event.preventDefault(); runContrast(); });
  el.contrastForm.addEventListener("reset", function () {
    global.setTimeout(function () { el.contrastFrom.value = defaults.from; el.contrastTo.value = defaults.to; el.contrastProduct.value = "all"; runContrast(); }, 0);
  });
  el.reportType.addEventListener("change", updateReportDateVisibility);
  el.reportForm.addEventListener("submit", function (event) { event.preventDefault(); renderReport(); });

  el.notificationToggle.addEventListener("click", function () { togglePopover(el.notificationToggle, el.notificationPanel, el.profileToggle, el.profileMenu); });
  el.profileToggle.addEventListener("click", function () { togglePopover(el.profileToggle, el.profileMenu, el.notificationToggle, el.notificationPanel); });
  document.addEventListener("click", function (event) {
    if (!event.target.closest(".notification-wrap") && !event.target.closest(".sidebar-user")) closePopovers();
  });
  document.addEventListener("keydown", function (event) { if (event.key === "Escape") closePopovers(); });
  document.querySelectorAll("[data-close-dialog]").forEach(function (button) {
    button.addEventListener("click", function () { const dialog = $(button.dataset.closeDialog); if (dialog && dialog.open) dialog.close(); });
  });
  [$("audit-detail-dialog"), $("contrast-detail-dialog")].forEach(function (dialog) {
    dialog.addEventListener("click", function (event) { if (event.target === dialog) dialog.close(); });
  });
  document.querySelectorAll("[data-coming-soon]").forEach(function (button) {
    button.addEventListener("click", function (event) { event.preventDefault(); closePopovers(); showToast("La vista de " + button.dataset.comingSoon + " se incorporará en la siguiente etapa del prototipo."); });
  });
  el.logout.addEventListener("click", function () { context.clearSession(); global.location.replace("../login.html"); });

  function renderNotifications() {
    const notifications = (mock.dashboard && mock.dashboard.notifications) || [];
    el.notificationList.innerHTML = notifications.map(function (item) {
      const symbol = item.type === "warning" ? "!" : "i";
      return '<article class="notification-item"><span class="notification-symbol ' + escapeHtml(item.type) + '" aria-hidden="true">' + symbol + '</span><span class="notification-copy"><strong>' + escapeHtml(item.title) + '</strong><small>' + escapeHtml(item.description) + '</small></span></article>';
    }).join("");
  }

  // Init.
  setUserInformation();
  setOptions(el.movementProduct, "Todos los productos");
  setOptions(el.auditProduct, "Todos los productos");
  setOptions(el.contrastProduct, "Todos los productos con movimiento");
  applyDateDefaults();
  renderNotifications();
  runMovementFilters(true);
  runAuditFilters(true);
  runContrast();

  const params = new URLSearchParams(global.location.search);
  const requestedTab = params.get("tab") || "movimientos";
  const requestedReport = params.get("report");
  if (requestedReport && ["overview", "top-moving", "low-stock", "movement-summary"].includes(requestedReport)) {
    el.reportType.value = requestedReport;
  }
  updateReportDateVisibility();
  activateTab(requestedTab, false);
  if (requestedTab === "reportes") renderReport();
})(window);
