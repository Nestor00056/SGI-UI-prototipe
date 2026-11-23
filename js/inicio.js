(function (global) {
  "use strict";

  const session = global.SGI.context.getSession();
  if (!session) {
    global.location.replace("../login.html");
    return;
  }

  const data = global.SGI.mockData && global.SGI.mockData.dashboard;
  if (!data) {
    global.location.replace("../login.html");
    return;
  }

  const elements = {
    sidebarAvatar: document.getElementById("sidebar-avatar"),
    sidebarName: document.getElementById("sidebar-user-name"),
    sidebarRole: document.getElementById("sidebar-user-role"),
    currentDate: document.getElementById("current-date"),
    totalProducts: document.getElementById("total-products"),
    productsInStock: document.getElementById("products-in-stock"),
    lowStockProducts: document.getElementById("low-stock-products"),
    inventoryValue: document.getElementById("inventory-value"),
    periodSelect: document.getElementById("period-select"),
    chart: document.getElementById("movement-chart"),
    chartDescription: document.getElementById("chart-description"),
    chartTable: document.getElementById("chart-data-table"),
    alertsList: document.getElementById("alerts-list"),
    topProductsBody: document.getElementById("top-products-body"),
    notificationToggle: document.getElementById("notification-toggle"),
    notificationPanel: document.getElementById("notification-panel"),
    notificationList: document.getElementById("notification-list"),
    profileToggle: document.getElementById("profile-menu-toggle"),
    profileMenu: document.getElementById("profile-menu"),
    logoutButton: document.getElementById("logout-button"),
    toast: document.getElementById("toast")
  };

  const numberFormat = new Intl.NumberFormat("es-CO");
  const currencyFormat = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  });
  let toastTimeout = null;

  function setUserInformation() {
    const initials = session.name.trim().split(/\s+/).slice(0, 2).map(function (part) {
      return part.charAt(0).toUpperCase();
    }).join("");

    elements.sidebarAvatar.textContent = initials || "U";
    elements.sidebarName.textContent = session.name;
    elements.sidebarRole.textContent = session.roleLabel;

    const userManagementLink = document.querySelector("[data-admin-only]");
    if (userManagementLink) {
      userManagementLink.hidden = session.role !== "administrador";
    }

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

  function renderSummary() {
    elements.totalProducts.textContent = numberFormat.format(data.summary.totalProducts);
    elements.productsInStock.textContent = numberFormat.format(data.summary.productsWithStock);
    elements.lowStockProducts.textContent = numberFormat.format(data.summary.lowStockProducts);
    elements.inventoryValue.textContent = currencyFormat.format(data.summary.inventoryValue);
  }

  function pointsFor(values, plot, maxValue) {
    return values.map(function (value, index) {
      const x = plot.left + (values.length === 1 ? plot.width / 2 : index * plot.width / (values.length - 1));
      const y = plot.top + plot.height - (value / maxValue) * plot.height;
      return { x: x, y: y, value: value };
    });
  }

  function renderChart(periodKey) {
    const series = data.movementSeries[periodKey] || data.movementSeries["30d"];
    const plot = { left: 48, top: 18, width: 594, height: 218 };
    const highest = Math.max.apply(null, series.entries.concat(series.exits));
    const maxValue = Math.ceil(highest / 50) * 50 || 50;
    const ticks = 4;
    const entryPoints = pointsFor(series.entries, plot, maxValue);
    const exitPoints = pointsFor(series.exits, plot, maxValue);
    const entryCoords = entryPoints.map(function (point) { return point.x + "," + point.y; }).join(" ");
    const exitCoords = exitPoints.map(function (point) { return point.x + "," + point.y; }).join(" ");
    const first = entryPoints[0];
    const last = entryPoints[entryPoints.length - 1];
    const areaPath = "M " + first.x + " " + (plot.top + plot.height) + " L " + entryPoints.map(function (point) { return point.x + " " + point.y; }).join(" L ") + " L " + last.x + " " + (plot.top + plot.height) + " Z";

    let grid = "";
    for (let index = 0; index <= ticks; index += 1) {
      const value = maxValue - (maxValue / ticks) * index;
      const y = plot.top + (plot.height / ticks) * index;
      grid += '<line class="chart-grid-line" x1="' + plot.left + '" y1="' + y + '" x2="' + (plot.left + plot.width) + '" y2="' + y + '"></line>';
      grid += '<text class="chart-axis-label" x="' + (plot.left - 13) + '" y="' + (y + 4) + '" text-anchor="end">' + numberFormat.format(value) + '</text>';
    }

    let xLabels = "";
    series.labels.forEach(function (label, index) {
      const x = plot.left + (series.labels.length === 1 ? plot.width / 2 : index * plot.width / (series.labels.length - 1));
      xLabels += '<text class="chart-x-label" x="' + x + '" y="' + (plot.top + plot.height + 28) + '" text-anchor="middle">' + label + '</text>';
    });

    const entryDots = entryPoints.map(function (point, index) {
      return '<circle class="entry-point" cx="' + point.x + '" cy="' + point.y + '" r="4.2"><title>' + series.labels[index] + ': ' + numberFormat.format(point.value) + ' entradas</title></circle>';
    }).join("");
    const exitDots = exitPoints.map(function (point, index) {
      return '<circle class="exit-point" cx="' + point.x + '" cy="' + point.y + '" r="3.7"><title>' + series.labels[index] + ': ' + numberFormat.format(point.value) + ' salidas</title></circle>';
    }).join("");

    elements.chart.innerHTML = '<defs><linearGradient id="entryAreaGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#3478e5" stop-opacity=".18"></stop><stop offset="100%" stop-color="#3478e5" stop-opacity="0"></stop></linearGradient></defs>' +
      '<title id="chart-title">Movimiento de inventario: ' + series.label + '</title>' +
      '<desc id="chart-description">Gráfico de líneas que compara entradas y salidas de productos durante ' + series.label.toLowerCase() + '. Los valores también están disponibles en una tabla.</desc>' +
      grid +
      '<path class="entry-area" d="' + areaPath + '"></path>' +
      '<polyline class="exit-line" points="' + exitCoords + '"></polyline>' +
      '<polyline class="entry-line" points="' + entryCoords + '"></polyline>' +
      exitDots + entryDots + xLabels;

    elements.chartTable.innerHTML = '<table class="chart-table"><caption class="visually-hidden">Datos del gráfico de movimiento de inventario para ' + series.label + '</caption><thead><tr><th scope="col">Periodo</th><th scope="col">Entradas</th><th scope="col">Salidas</th></tr></thead><tbody>' +
      series.labels.map(function (label, index) {
        return '<tr><th scope="row">' + label + '</th><td>' + numberFormat.format(series.entries[index]) + '</td><td>' + numberFormat.format(series.exits[index]) + '</td></tr>';
      }).join("") + '</tbody></table>';
  }

  function renderAlerts() {
    elements.alertsList.innerHTML = data.alerts.map(function (alert) {
      return '<article class="alert-row ' + alert.type + '">' +
        '<span class="alert-icon ' + alert.type + '" aria-hidden="true">' + alert.icon + '</span>' +
        '<span class="alert-copy"><strong>' + alert.title + '</strong><small>' + alert.description + '</small></span>' +
        '<span class="alert-value">' + alert.value + '</span>' +
        '</article>';
    }).join("");
  }

  function renderTopProducts() {
    elements.topProductsBody.innerHTML = data.topMovingProducts.map(function (product, index) {
      const safeShare = Math.max(0, Math.min(100, Number(product.share) || 0));
      return '<tr>' +
        '<td class="rank-cell">' + (index + 1) + '</td>' +
        '<td class="product-name-cell">' + product.name + '</td>' +
        '<td class="brand-cell">' + product.brand + '</td>' +
        '<td class="units-cell">' + numberFormat.format(product.unitsMoved) + '</td>' +
        '<td class="share-cell"><div class="share-wrap"><span>' + safeShare.toLocaleString("es-CO", { maximumFractionDigits: 1 }) + '%</span><div class="share-track" role="meter" aria-label="Participación de ' + product.name + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + safeShare + '"><span class="share-fill" style="width:' + safeShare + '%"></span></div></div></td>' +
        '</tr>';
    }).join("");
  }

  function renderNotifications() {
    elements.notificationList.innerHTML = data.notifications.map(function (notification) {
      const symbol = notification.type === "warning" ? "!" : "i";
      return '<article class="notification-item">' +
        '<span class="notification-symbol ' + notification.type + '" aria-hidden="true">' + symbol + '</span>' +
        '<span class="notification-copy"><strong>' + notification.title + '</strong><small>' + notification.description + '</small></span>' +
        '</article>';
    }).join("");
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.hidden = false;
    if (toastTimeout) global.clearTimeout(toastTimeout);
    toastTimeout = global.setTimeout(function () {
      elements.toast.hidden = true;
    }, 3200);
  }

  function closePopovers() {
    elements.profileMenu.hidden = true;
    elements.profileToggle.setAttribute("aria-expanded", "false");
    elements.notificationPanel.hidden = true;
    elements.notificationToggle.setAttribute("aria-expanded", "false");
  }

  function togglePopover(button, panel, otherButton, otherPanel) {
    const shouldOpen = panel.hidden;
    otherPanel.hidden = true;
    otherButton.setAttribute("aria-expanded", "false");
    panel.hidden = !shouldOpen;
    button.setAttribute("aria-expanded", String(shouldOpen));
  }

  elements.periodSelect.addEventListener("change", function () {
    renderChart(elements.periodSelect.value);
  });

  elements.notificationToggle.addEventListener("click", function () {
    togglePopover(elements.notificationToggle, elements.notificationPanel, elements.profileToggle, elements.profileMenu);
  });

  elements.profileToggle.addEventListener("click", function () {
    togglePopover(elements.profileToggle, elements.profileMenu, elements.notificationToggle, elements.notificationPanel);
  });

  document.addEventListener("click", function (event) {
    if (!event.target.closest(".notification-wrap") && !event.target.closest(".sidebar-user")) {
      closePopovers();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closePopovers();
  });

  document.querySelectorAll("[data-coming-soon]").forEach(function (button) {
    button.addEventListener("click", function () {
      closePopovers();
      showToast("La vista de " + button.dataset.comingSoon + " se incorporará en la siguiente etapa del prototipo.");
    });
  });

  elements.logoutButton.addEventListener("click", function () {
    global.SGI.context.clearSession();
    global.location.replace("../login.html");
  });

  setUserInformation();
  renderSummary();
  renderChart(elements.periodSelect.value);
  renderAlerts();
  renderTopProducts();
  renderNotifications();
})(window);
