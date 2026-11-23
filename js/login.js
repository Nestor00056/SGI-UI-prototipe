(function (global) {
  "use strict";

  const elements = {
    form: document.getElementById("login-form"),
    email: document.getElementById("email"),
    password: document.getElementById("password"),
    togglePassword: document.getElementById("toggle-password"),
    forgotPassword: document.getElementById("forgot-password"),
    helpLink: document.getElementById("help-link"),
    feedback: document.getElementById("form-feedback"),
    emailError: document.getElementById("email-error"),
    passwordError: document.getElementById("password-error"),
    announcer: document.getElementById("announcer")
  };

  function announce(message) {
    elements.announcer.textContent = "";
    window.setTimeout(function () {
      elements.announcer.textContent = message;
    }, 20);
  }

  function clearErrors() {
    elements.emailError.textContent = "";
    elements.passwordError.textContent = "";
    elements.email.closest(".input-wrap").classList.remove("has-error");
    elements.password.closest(".input-wrap").classList.remove("has-error");
    elements.feedback.hidden = true;
    elements.feedback.textContent = "";
  }

  function showFeedback(message) {
    elements.feedback.textContent = message;
    elements.feedback.hidden = false;
    announce(message);
  }

  function validateFields() {
    let firstInvalidField = null;
    const emailValue = elements.email.value.trim();
    const passwordValue = elements.password.value;

    if (!emailValue) {
      elements.emailError.textContent = "Ingresa tu correo electrónico.";
      elements.email.closest(".input-wrap").classList.add("has-error");
      firstInvalidField = elements.email;
    } else if (!elements.email.validity.valid) {
      elements.emailError.textContent = "Ingresa un correo electrónico con un formato válido.";
      elements.email.closest(".input-wrap").classList.add("has-error");
      firstInvalidField = elements.email;
    }

    if (!passwordValue) {
      elements.passwordError.textContent = "Ingresa tu contraseña.";
      elements.password.closest(".input-wrap").classList.add("has-error");
      firstInvalidField = firstInvalidField || elements.password;
    }

    if (firstInvalidField) {
      firstInvalidField.focus();
      return false;
    }

    return true;
  }

  function findUser(email, password) {
    const users = global.SGI && global.SGI.mockData && global.SGI.mockData.users;
    if (!Array.isArray(users)) {
      throw new Error("No fue posible cargar los datos simulados del sistema.");
    }

    const context = global.SGI.context;
    const profiles = users.map(function (user) {
      return context && typeof context.getUserProfile === "function"
        ? (context.getUserProfile(user.id) || user)
        : user;
    });

    return profiles.find(function (user) {
      return String(user.email || "").toLowerCase() === email.toLowerCase() && user.password === password;
    }) || null;
  }

  function handleSubmit(event) {
    event.preventDefault();
    clearErrors();

    if (!validateFields()) return;

    try {
      const user = findUser(elements.email.value.trim(), elements.password.value);

      if (!user) {
        showFeedback("No pudimos validar las credenciales. Revisa el correo y la contraseña e inténtalo nuevamente.");
        elements.password.value = "";
        elements.password.focus();
        return;
      }

      if (user.status !== "active") {
        showFeedback("Esta cuenta se encuentra inactiva. Comunícate con el administrador del sistema.");
        return;
      }

      global.SGI.context.createSession(user);
      announce("Sesión iniciada correctamente. Abriendo el panel principal.");
      window.location.assign("vistas/inicio.html");
    } catch (error) {
      showFeedback(error.message || "Ocurrió un problema al iniciar la sesión.");
    }
  }

  function togglePasswordVisibility() {
    const shouldShow = elements.password.type === "password";
    elements.password.type = shouldShow ? "text" : "password";
    elements.togglePassword.setAttribute("aria-pressed", String(shouldShow));
    elements.togglePassword.setAttribute("aria-label", shouldShow ? "Ocultar contraseña" : "Mostrar contraseña");
    elements.password.focus();
  }

  function fillDemoAccount(demoKey) {
    const seedUser = global.SGI.mockData.users.find(function (entry) {
      return entry.demoKey === demoKey;
    });
    const user = seedUser && global.SGI.context.getUserProfile
      ? (global.SGI.context.getUserProfile(seedUser.id) || seedUser)
      : seedUser;

    if (!user) {
      showFeedback("No encontramos esa cuenta de demostración.");
      return;
    }

    clearErrors();
    elements.email.value = user.email;
    elements.password.value = user.password;
    elements.password.type = "password";
    elements.togglePassword.setAttribute("aria-pressed", "false");
    elements.togglePassword.setAttribute("aria-label", "Mostrar contraseña");
    elements.password.focus();
    announce("Credenciales de demostración cargadas para el perfil " + user.roleLabel + ".");
  }

  function showRecoveryMessage() {
    showFeedback("La recuperación de contraseña no está conectada en este prototipo. Para la demostración, utiliza una de las cuentas de prueba.");
  }

  function showHelpMessage() {
    showFeedback("Esta es una demostración. Las solicitudes de soporte se definirán en una versión posterior del sistema.");
    elements.email.focus();
  }

  // Si ya existe una sesión de demostración, no es necesario volver a autenticarse.
  if (global.SGI.context.getSession()) {
    window.location.replace("vistas/inicio.html");
    return;
  }

  elements.form.addEventListener("submit", handleSubmit);
  elements.togglePassword.addEventListener("click", togglePasswordVisibility);
  elements.forgotPassword.addEventListener("click", showRecoveryMessage);
  elements.helpLink.addEventListener("click", showHelpMessage);

  document.querySelectorAll("[data-demo-user]").forEach(function (button) {
    button.addEventListener("click", function () {
      fillDemoAccount(button.dataset.demoUser);
    });
  });

  [elements.email, elements.password].forEach(function (input) {
    input.addEventListener("input", function () {
      input.closest(".input-wrap").classList.remove("has-error");
      if (input === elements.email) elements.emailError.textContent = "";
      if (input === elements.password) elements.passwordError.textContent = "";
      if (!elements.feedback.hidden) {
        elements.feedback.hidden = true;
        elements.feedback.textContent = "";
      }
    });
  });
})(window);
