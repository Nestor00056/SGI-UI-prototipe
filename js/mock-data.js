/*
 * Datos simulados centrales del SGI.
 * Este archivo se carga antes de app-context.js y de los scripts propios de cada vista.
 * Las contraseñas incluidas aquí son ficticias y solo sirven para probar el prototipo.
 */
(function (global) {
  "use strict";

  global.SGI = global.SGI || {};

  const demoPassword = "Demo123!";
  const users = [
    {
      id: "USR-001",
      demoKey: "admin",
      name: "Laura Martínez",
      email: "admin@sgi.demo",
      password: demoPassword,
      role: "administrador",
      roleLabel: "Administrador",
      status: "active"
    },
    {
      id: "USR-002",
      demoKey: "supervisor",
      name: "Andrés Ramírez",
      email: "supervisor@sgi.demo",
      password: demoPassword,
      role: "supervisor",
      roleLabel: "Supervisor",
      status: "active"
    },
    {
      id: "USR-003",
      demoKey: "empleado",
      name: "Valentina Gómez",
      email: "empleado@sgi.demo",
      password: demoPassword,
      role: "empleado",
      roleLabel: "Empleado",
      status: "active"
    }
  ].map(function (user) {
    return Object.freeze(user);
  });



  // Directorio ficticio para la vista Usuarios.
  // Se mantiene separado de las credenciales de demostración utilizadas por el login.
  const extraUserNames = [
    "María Fernanda López",
    "Carlos Andrés Pérez",
    "Diana Carolina Torres",
    "Julián Esteban Gómez",
    "Paola Andrea Ramírez",
    "Santiago Herrera",
    "Camila Rodríguez",
    "Sebastián Muñoz",
    "Natalia Restrepo",
    "Felipe Cárdenas",
    "Laura Sofía Castro",
    "Daniela Morales",
    "Juan David Rojas",
    "Valeria Ospina",
    "Miguel Ángel Vargas",
    "Isabella Martínez",
    "Nicolás Giraldo",
    "Luisa Fernanda Ortiz",
    "Mateo Jiménez",
    "Sara Valentina Mejía",
    "David Alejandro Ruiz",
    "Manuela Franco",
    "Samuel Arias",
    "Gabriela Valencia",
    "Tomás Duque",
    "Juliana Montoya",
    "Esteban Marín",
    "Angélica Pardo",
    "Emiliano Restrepo",
    "Mariana Vélez",
    "Simón Cardona",
    "Alejandra Silva",
    "Cristian Bedoya",
    "Paula Andrea Gil",
    "Jerónimo Cano",
    "Tatiana Castaño",
    "Kevin Alexander Mora",
    "Melissa Quintero",
    "Oscar Eduardo León",
    "Valentina Salazar",
    "Andrés Felipe Soto",
    "Lina Marcela Rincón",
    "Juan Sebastián Osorio",
    "Mónica Patricia Reyes",
    "Diego Fernando Acosta",
    "Catalina Escobar",
    "Ricardo Beltrán"
  ];

  const roleLabels = { administrador: "Administrador", supervisor: "Supervisor", empleado: "Empleado" };
  const inactiveUserNumbers = new Set([8, 16, 24, 32, 40, 48]);
  const userDirectory = users.map(function (user) {
    return Object.freeze({
      id: user.id, name: user.name, email: user.email,
      username: user.demoKey, role: user.role, roleLabel: user.roleLabel, status: user.status
    });
  }).concat(extraUserNames.map(function (name, index) {
    const number = index + 4;
    const role = index < 7 ? "administrador" : index < 18 ? "supervisor" : "empleado";
    const numberText = String(number).padStart(3, "0");
    return Object.freeze({
      id: "USR-" + numberText,
      name: name,
      email: "usuario" + numberText + "@sgi.demo",
      username: "usuario" + numberText,
      role: role,
      roleLabel: roleLabels[role],
      status: inactiveUserNumbers.has(number) ? "inactive" : "active"
    });
  }));

  const dashboard = Object.freeze({
    summary: Object.freeze({
      totalProducts: 248,
      productsWithStock: 176,
      lowStockProducts: 32,
      inventoryValue: 2580000
    }),
    movementSeries: Object.freeze({
      "7d": Object.freeze({
        label: "Últimos 7 días",
        labels: Object.freeze(["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]),
        entries: Object.freeze([75, 110, 85, 140, 118, 165, 130]),
        exits: Object.freeze([58, 86, 72, 103, 91, 122, 98])
      }),
      "30d": Object.freeze({
        label: "Últimos 30 días",
        labels: Object.freeze(["Sem. 1", "Sem. 2", "Sem. 3", "Sem. 4"]),
        entries: Object.freeze([420, 510, 465, 590]),
        exits: Object.freeze([350, 420, 390, 470])
      }),
      "90d": Object.freeze({
        label: "Últimos 90 días",
        labels: Object.freeze(["Sep", "Oct", "Nov"]),
        entries: Object.freeze([1480, 1720, 1890]),
        exits: Object.freeze([1210, 1390, 1510])
      })
    }),
    alerts: Object.freeze([
      Object.freeze({
        id: "AL-001",
        type: "warning",
        icon: "!",
        title: "Productos con stock bajo",
        description: "Hay productos que requieren reposición.",
        value: "32 productos",
        action: "Revisar productos"
      }),
      Object.freeze({
        id: "AL-002",
        type: "info",
        icon: "i",
        title: "Productos próximos a agotarse",
        description: "Algunos productos se acercan a su nivel mínimo.",
        value: "12 productos",
        action: "Consultar existencias"
      }),
      Object.freeze({
        id: "AL-003",
        type: "success",
        icon: "✓",
        title: "Inventario al día",
        description: "No hay procesos generales pendientes.",
        value: "Todo en orden",
        action: "Ver estado"
      })
    ]),
    topMovingProducts: Object.freeze([
      Object.freeze({
        id: "PR-DEMO-001",
        name: "Coca-Cola Original 330 ml – Lata",
        brand: "Coca-Cola",
        unitsMoved: 450,
        share: 18.5
      }),
      Object.freeze({
        id: "PR-DEMO-002",
        name: "Agua Cristal 600 ml – Plástico",
        brand: "Cristal",
        unitsMoved: 380,
        share: 15.6
      }),
      Object.freeze({
        id: "PR-DEMO-003",
        name: "Galletas Festival x6",
        brand: "Festival",
        unitsMoved: 320,
        share: 13.2
      })
    ]),
    notifications: Object.freeze([
      Object.freeze({
        id: "NT-001",
        title: "Productos con stock bajo",
        description: "32 productos requieren revisión.",
        type: "warning"
      }),
      Object.freeze({
        id: "NT-002",
        title: "Productos próximos a agotarse",
        description: "12 productos están cerca del nivel mínimo.",
        type: "info"
      })
    ])
  });


  const productCategories = [
    { id: "CAT-001", name: "Bebidas", description: "Bebidas listas para consumir.", status: "active" },
    { id: "CAT-002", name: "Abarrotes", description: "Productos básicos de despensa.", status: "active" },
    { id: "CAT-003", name: "Lácteos", description: "Leches y derivados lácteos.", status: "active" },
    { id: "CAT-004", name: "Snacks", description: "Mecatos y productos para picar.", status: "active" },
    { id: "CAT-005", name: "Aseo y limpieza", description: "Productos para limpieza y cuidado del hogar.", status: "active" },
    { id: "CAT-006", name: "Cuidado personal", description: "Artículos de higiene y cuidado personal.", status: "active" },
    { id: "CAT-007", name: "Papelería", description: "Útiles y elementos de oficina.", status: "active" },
    { id: "CAT-008", name: "Congelados", description: "Productos que requieren conservación en frío.", status: "active" }
  ].map(function (category) { return Object.freeze(category); });

  const unitsOfMeasure = [
    { id: "UNI-001", name: "Unidad", symbol: "und" },
    { id: "UNI-002", name: "Paquete", symbol: "paq" },
    { id: "UNI-003", name: "Caja", symbol: "cja" },
    { id: "UNI-004", name: "Botella", symbol: "bot" },
    { id: "UNI-005", name: "Bolsa", symbol: "bol" },
    { id: "UNI-006", name: "Kilogramo", symbol: "kg" },
    { id: "UNI-007", name: "Litro", symbol: "L" }
  ].map(function (unit) { return Object.freeze(unit); });

  // El catálogo de productos utiliza los atributos conceptuales definidos para Producto:
  // producto_id, código, nombre, descripción, precio, stock_actual, stock_mínimo,
  // estado, categoría y unidad de medida.
  const productRows = [
    ["PR-0001", "7501001", "Arroz blanco 1 kg", "Arroz blanco de grano largo, presentación de un kilogramo.", "CAT-002", 4200, 36, 12, "UNI-005", "active"],
    ["PR-0002", "7501002", "Azúcar blanca 1 kg", "Azúcar refinada en bolsa de un kilogramo.", "CAT-002", 4800, 22, 10, "UNI-005", "active"],
    ["PR-0003", "7501003", "Aceite vegetal 900 ml", "Aceite vegetal para preparación de alimentos.", "CAT-002", 8900, 8, 10, "UNI-004", "active"],
    ["PR-0004", "7501004", "Sal refinada 500 g", "Sal refinada para uso alimentario.", "CAT-002", 1900, 54, 15, "UNI-005", "active"],
    ["PR-0005", "7501005", "Harina de maíz 1 kg", "Harina de maíz precocida en bolsa.", "CAT-002", 5200, 17, 8, "UNI-005", "active"],
    ["PR-0006", "7501006", "Pasta larga 500 g", "Pasta alimenticia tipo spaghetti.", "CAT-002", 3500, 41, 12, "UNI-005", "active"],
    ["PR-0007", "7501007", "Lenteja 500 g", "Lenteja seca seleccionada.", "CAT-002", 4300, 6, 10, "UNI-005", "active"],
    ["PR-0008", "7501008", "Fríjol cargamanto 500 g", "Fríjol seco en presentación de medio kilogramo.", "CAT-002", 6900, 14, 8, "UNI-005", "active"],
    ["PR-0009", "7501009", "Atún en agua 160 g", "Atún en conserva, presentación individual.", "CAT-002", 7800, 0, 6, "UNI-001", "active"],
    ["PR-0010", "7501010", "Café molido 250 g", "Café tostado y molido en empaque de 250 gramos.", "CAT-002", 12500, 19, 8, "UNI-005", "active"],
    ["PR-0011", "7702001", "Agua natural 600 ml", "Agua potable en botella individual.", "CAT-001", 1800, 72, 20, "UNI-004", "active"],
    ["PR-0012", "7702002", "Gaseosa cola 1.5 L", "Bebida gaseosa sabor cola.", "CAT-001", 6200, 9, 12, "UNI-004", "active"],
    ["PR-0013", "7702003", "Jugo de naranja 1 L", "Bebida de naranja en envase de un litro.", "CAT-001", 5400, 25, 10, "UNI-004", "active"],
    ["PR-0014", "7702004", "Bebida hidratante 500 ml", "Bebida para hidratación en presentación individual.", "CAT-001", 3900, 4, 8, "UNI-004", "active"],
    ["PR-0015", "7702005", "Té frío limón 500 ml", "Bebida de té sabor limón.", "CAT-001", 3200, 16, 8, "UNI-004", "active"],
    ["PR-0016", "7702006", "Agua con gas 300 ml", "Agua carbonatada en botella.", "CAT-001", 2100, 31, 10, "UNI-004", "active"],
    ["PR-0017", "7702007", "Leche entera 1 L", "Leche entera pasteurizada.", "CAT-003", 4700, 18, 10, "UNI-004", "active"],
    ["PR-0018", "7702008", "Yogur fresa 200 ml", "Yogur sabor fresa en presentación individual.", "CAT-003", 2600, 7, 12, "UNI-004", "active"],
    ["PR-0019", "7702009", "Queso campesino 500 g", "Queso fresco tipo campesino.", "CAT-003", 14500, 11, 5, "UNI-005", "active"],
    ["PR-0020", "7702010", "Mantequilla 250 g", "Mantequilla en presentación de 250 gramos.", "CAT-003", 7900, 13, 6, "UNI-005", "active"],
    ["PR-0021", "7703001", "Galletas de vainilla", "Galletas dulces sabor vainilla.", "CAT-004", 2800, 45, 15, "UNI-002", "active"],
    ["PR-0022", "7703002", "Papas onduladas 150 g", "Papas fritas sabor natural.", "CAT-004", 2500, 3, 10, "UNI-002", "active"],
    ["PR-0023", "7703003", "Maní salado 150 g", "Maní tostado con sal.", "CAT-004", 3900, 21, 8, "UNI-005", "active"],
    ["PR-0024", "7703004", "Barra de cereal", "Barra de cereal con frutos y avena.", "CAT-004", 2200, 0, 12, "UNI-001", "active"],
    ["PR-0025", "7703005", "Chocolate de mesa 250 g", "Chocolate de mesa tradicional.", "CAT-004", 8500, 9, 6, "UNI-005", "active"],
    ["PR-0026", "7703006", "Galletas rellenas", "Galletas dulces con relleno sabor chocolate.", "CAT-004", 3100, 33, 12, "UNI-002", "active"],
    ["PR-0027", "7704001", "Detergente en polvo 1 kg", "Detergente para lavado de ropa.", "CAT-005", 11200, 16, 8, "UNI-005", "active"],
    ["PR-0028", "7704002", "Jabón líquido 500 ml", "Jabón líquido multiuso para el hogar.", "CAT-005", 7600, 5, 8, "UNI-004", "active"],
    ["PR-0029", "7704003", "Desinfectante 1 L", "Desinfectante para superficies.", "CAT-005", 6900, 28, 10, "UNI-004", "active"],
    ["PR-0030", "7704004", "Esponja multiuso", "Esponja para limpieza de superficies.", "CAT-005", 1800, 64, 20, "UNI-001", "active"],
    ["PR-0031", "7704005", "Bolsa para residuos 10 und", "Paquete de bolsas para residuos.", "CAT-005", 4200, 12, 8, "UNI-002", "active"],
    ["PR-0032", "7704006", "Limpiavidrios 500 ml", "Limpiador líquido para superficies de vidrio.", "CAT-005", 5900, 2, 6, "UNI-004", "active"],
    ["PR-0033", "7705001", "Jabón de tocador", "Jabón en barra para higiene personal.", "CAT-006", 2600, 39, 12, "UNI-001", "active"],
    ["PR-0034", "7705002", "Crema dental 100 ml", "Crema dental para higiene oral.", "CAT-006", 6300, 15, 8, "UNI-004", "active"],
    ["PR-0035", "7705003", "Champú 400 ml", "Champú de uso diario.", "CAT-006", 12400, 7, 8, "UNI-004", "active"],
    ["PR-0036", "7705004", "Papel higiénico x4", "Paquete de cuatro rollos de papel higiénico.", "CAT-006", 8900, 23, 10, "UNI-002", "active"],
    ["PR-0037", "7705005", "Desodorante roll-on", "Desodorante de aplicación roll-on.", "CAT-006", 9800, 10, 6, "UNI-001", "active"],
    ["PR-0038", "7705006", "Cepillo dental", "Cepillo dental de uso personal.", "CAT-006", 4200, 29, 10, "UNI-001", "active"],
    ["PR-0039", "7706001", "Cuaderno cuadriculado", "Cuaderno de uso escolar con hojas cuadriculadas.", "CAT-007", 6500, 26, 10, "UNI-001", "active"],
    ["PR-0040", "7706002", "Bolígrafo tinta azul", "Bolígrafo de tinta azul.", "CAT-007", 1800, 83, 25, "UNI-001", "active"],
    ["PR-0041", "7706003", "Lápiz HB", "Lápiz de grafito tipo HB.", "CAT-007", 1200, 48, 20, "UNI-001", "active"],
    ["PR-0042", "7706004", "Resaltador amarillo", "Marcador resaltador de color amarillo.", "CAT-007", 3100, 5, 8, "UNI-001", "active"],
    ["PR-0043", "7706005", "Carpeta tamaño carta", "Carpeta plástica tamaño carta.", "CAT-007", 2400, 34, 12, "UNI-001", "active"],
    ["PR-0044", "7706006", "Papel carta resma", "Resma de papel tamaño carta.", "CAT-007", 18500, 6, 5, "UNI-003", "active"],
    ["PR-0045", "7707001", "Vegetales mixtos congelados", "Mezcla de vegetales para preparación de alimentos.", "CAT-008", 9400, 12, 6, "UNI-005", "active"],
    ["PR-0046", "7707002", "Papas prefritas 1 kg", "Papas prefritas congeladas.", "CAT-008", 12800, 4, 8, "UNI-005", "active"],
    ["PR-0047", "7707003", "Pulpa de mango 500 g", "Pulpa de mango congelada.", "CAT-008", 5500, 18, 8, "UNI-005", "active"],
    ["PR-0048", "7707004", "Helado de vainilla 1 L", "Helado sabor vainilla en presentación de un litro.", "CAT-008", 16800, 9, 5, "UNI-004", "active"],
    ["PR-0049", "7708001", "Producto de temporada", "Artículo temporal conservado en el catálogo para consulta histórica.", "CAT-004", 3900, 0, 0, "UNI-001", "inactive"],
    ["PR-0050", "7708002", "Presentación promocional", "Presentación promocional actualmente fuera de operación.", "CAT-001", 7200, 14, 5, "UNI-001", "inactive"]
  ];

  const products = productRows.map(function (row) {
    return Object.freeze({
      id: row[0],
      code: row[1],
      name: row[2].replace(/\s{2,}/g, " ").trim(),
      description: row[3],
      categoryId: row[4],
      price: row[5],
      stockActual: row[6],
      stockMinimo: row[7],
      unitMeasureId: row[8],
      status: row[9]
    });
  });

  // Proveedores ficticios para la demostración del módulo.
  // Los campos siguen la entidad conceptual Proveedor: nombre, contacto,
  // teléfono, correo, dirección y estado.
  const providers = [
    { id: "PV-001", name: "Distribuciones Andinas Demo S.A.S.", contact: "Laura Restrepo", phone: "300 555 0101", email: "contacto@andinas-demo.example", address: "Medellín, Antioquia", status: "active" },
    { id: "PV-002", name: "Alimentos del Valle Demo", contact: "Carlos Mejía", phone: "300 555 0102", email: "ventas@alimentosvalle-demo.example", address: "Cali, Valle del Cauca", status: "active" },
    { id: "PV-003", name: "Bebidas y Sabores Demo S.A.S.", contact: "Mariana Torres", phone: "300 555 0103", email: "pedidos@bebidasysabores-demo.example", address: "Bogotá D. C.", status: "active" },
    { id: "PV-004", name: "Aseo Integral Demo", contact: "Julián Cárdenas", phone: "300 555 0104", email: "comercial@aseointegral-demo.example", address: "Itagüí, Antioquia", status: "active" },
    { id: "PV-005", name: "Lácteos La Montaña Demo", contact: "Diana Gómez", phone: "300 555 0105", email: "ventas@lacteosmontana-demo.example", address: "Rionegro, Antioquia", status: "active" },
    { id: "PV-006", name: "Papelería Central Demo", contact: "Andrés Ospina", phone: "300 555 0106", email: "contacto@papeleriacentral-demo.example", address: "Manizales, Caldas", status: "active" },
    { id: "PV-007", name: "Congelados del Norte Demo", contact: "Paula Ríos", phone: "300 555 0107", email: "pedidos@congeladosnorte-demo.example", address: "Bello, Antioquia", status: "active" },
    { id: "PV-008", name: "Snacks y Pasabocas Demo", contact: "Felipe Marín", phone: "300 555 0108", email: "ventas@snacksdemo.example", address: "Pereira, Risaralda", status: "active" },
    { id: "PV-009", name: "Comercializadora Horizonte Demo", contact: "Natalia Vélez", phone: "300 555 0109", email: "info@horizonte-demo.example", address: "Envigado, Antioquia", status: "active" },
    { id: "PV-010", name: "Suministros del Centro Demo", contact: "Sergio Parra", phone: "300 555 0110", email: "contacto@suministroscentro-demo.example", address: "Armenia, Quindío", status: "active" },
    { id: "PV-011", name: "Distribuciones Temporales Demo", contact: "Camila Ruiz", phone: "300 555 0111", email: "archivo@temporal-demo.example", address: "Bucaramanga, Santander", status: "inactive" },
    { id: "PV-012", name: "Proveedor de Temporada Demo", contact: "Miguel Salazar", phone: "300 555 0112", email: "consulta@temporada-demo.example", address: "Popayán, Cauca", status: "inactive" }
  ].map(function (provider) { return Object.freeze(provider); });



  // Movimientos ficticios del inventario para la vista Registros.
  // quantity siempre expresa una magnitud positiva. Para AJUSTE, adjustmentDirection
  // determina si las existencias aumentan o disminuyen.
  const movements = [
    { id: "MOV-001", dateTime: "2026-11-14T08:30:00-05:00", type: "ENTRADA", productId: "PR-0012", quantity: 12, adjustmentDirection: null, stockBefore: 5, stockAfter: 17, userId: "USR-001", userName: "Laura Martínez", description: "Reposición de bebidas recibida del proveedor." },
    { id: "MOV-002", dateTime: "2026-11-16T12:10:00-05:00", type: "SALIDA", productId: "PR-0012", quantity: 7, adjustmentDirection: null, stockBefore: 17, stockAfter: 10, userId: "USR-003", userName: "Valentina Gómez", description: "Salida por venta en punto de atención." },
    { id: "MOV-003", dateTime: "2026-11-20T16:35:00-05:00", type: "SALIDA", productId: "PR-0012", quantity: 4, adjustmentDirection: null, stockBefore: 10, stockAfter: 6, userId: "USR-003", userName: "Valentina Gómez", description: "Salida por venta en punto de atención." },
    { id: "MOV-004", dateTime: "2026-11-22T09:15:00-05:00", type: "AJUSTE", productId: "PR-0012", quantity: 3, adjustmentDirection: "increase", stockBefore: 6, stockAfter: 9, userId: "USR-002", userName: "Andrés Ramírez", description: "Ajuste positivo después de verificar unidades recibidas." },

    { id: "MOV-005", dateTime: "2026-11-14T09:00:00-05:00", type: "ENTRADA", productId: "PR-0011", quantity: 20, adjustmentDirection: null, stockBefore: 60, stockAfter: 80, userId: "USR-001", userName: "Laura Martínez", description: "Ingreso de cajas de agua natural." },
    { id: "MOV-006", dateTime: "2026-11-17T13:42:00-05:00", type: "SALIDA", productId: "PR-0011", quantity: 5, adjustmentDirection: null, stockBefore: 80, stockAfter: 75, userId: "USR-003", userName: "Valentina Gómez", description: "Salida por venta." },
    { id: "MOV-007", dateTime: "2026-11-21T19:02:00-05:00", type: "SALIDA", productId: "PR-0011", quantity: 3, adjustmentDirection: null, stockBefore: 75, stockAfter: 72, userId: "USR-003", userName: "Valentina Gómez", description: "Salida por venta al cierre de jornada." },

    { id: "MOV-008", dateTime: "2026-11-15T10:22:00-05:00", type: "ENTRADA", productId: "PR-0021", quantity: 25, adjustmentDirection: null, stockBefore: 30, stockAfter: 55, userId: "USR-001", userName: "Laura Martínez", description: "Reposición de paquetes de galletas." },
    { id: "MOV-009", dateTime: "2026-11-18T14:05:00-05:00", type: "SALIDA", productId: "PR-0021", quantity: 8, adjustmentDirection: null, stockBefore: 55, stockAfter: 47, userId: "USR-003", userName: "Valentina Gómez", description: "Salida por venta." },
    { id: "MOV-010", dateTime: "2026-11-21T16:40:00-05:00", type: "SALIDA", productId: "PR-0021", quantity: 2, adjustmentDirection: null, stockBefore: 47, stockAfter: 45, userId: "USR-003", userName: "Valentina Gómez", description: "Salida por venta." },

    { id: "MOV-011", dateTime: "2026-11-12T11:15:00-05:00", type: "SALIDA", productId: "PR-0003", quantity: 9, adjustmentDirection: null, stockBefore: 15, stockAfter: 6, userId: "USR-003", userName: "Valentina Gómez", description: "Salida por venta." },
    { id: "MOV-012", dateTime: "2026-11-19T10:14:00-05:00", type: "AJUSTE", productId: "PR-0003", quantity: 2, adjustmentDirection: "increase", stockBefore: 6, stockAfter: 8, userId: "USR-002", userName: "Andrés Ramírez", description: "Corrección positiva por diferencia verificada." },

    { id: "MOV-013", dateTime: "2026-11-16T09:15:00-05:00", type: "SALIDA", productId: "PR-0017", quantity: 4, adjustmentDirection: null, stockBefore: 20, stockAfter: 16, userId: "USR-003", userName: "Valentina Gómez", description: "Salida por venta." },
    { id: "MOV-014", dateTime: "2026-11-20T09:25:00-05:00", type: "ENTRADA", productId: "PR-0017", quantity: 2, adjustmentDirection: null, stockBefore: 16, stockAfter: 18, userId: "USR-001", userName: "Laura Martínez", description: "Ingreso de unidades de reposición." },

    { id: "MOV-015", dateTime: "2026-11-18T16:50:00-05:00", type: "SALIDA", productId: "PR-0022", quantity: 6, adjustmentDirection: null, stockBefore: 9, stockAfter: 3, userId: "USR-003", userName: "Valentina Gómez", description: "Salida por venta." },
    { id: "MOV-016", dateTime: "2026-11-20T12:20:00-05:00", type: "SALIDA", productId: "PR-0009", quantity: 8, adjustmentDirection: null, stockBefore: 8, stockAfter: 0, userId: "USR-003", userName: "Valentina Gómez", description: "Salida de las últimas unidades disponibles." },

    { id: "MOV-017", dateTime: "2026-11-19T12:50:00-05:00", type: "SALIDA", productId: "PR-0028", quantity: 5, adjustmentDirection: null, stockBefore: 12, stockAfter: 7, userId: "USR-003", userName: "Valentina Gómez", description: "Salida por venta." },
    { id: "MOV-018", dateTime: "2026-11-21T09:30:00-05:00", type: "SALIDA", productId: "PR-0028", quantity: 2, adjustmentDirection: null, stockBefore: 7, stockAfter: 5, userId: "USR-003", userName: "Valentina Gómez", description: "Salida por venta." },

    { id: "MOV-019", dateTime: "2026-11-17T15:05:00-05:00", type: "ENTRADA", productId: "PR-0044", quantity: 4, adjustmentDirection: null, stockBefore: 10, stockAfter: 14, userId: "USR-001", userName: "Laura Martínez", description: "Ingreso de resmas de papel." },
    { id: "MOV-020", dateTime: "2026-11-22T10:00:00-05:00", type: "SALIDA", productId: "PR-0044", quantity: 8, adjustmentDirection: null, stockBefore: 14, stockAfter: 6, userId: "USR-003", userName: "Valentina Gómez", description: "Salida por venta institucional." },

    { id: "MOV-021", dateTime: "2026-11-20T11:10:00-05:00", type: "AJUSTE", productId: "PR-0046", quantity: 1, adjustmentDirection: "decrease", stockBefore: 7, stockAfter: 6, userId: "USR-002", userName: "Andrés Ramírez", description: "Ajuste negativo por producto averiado." },
    { id: "MOV-022", dateTime: "2026-11-21T14:00:00-05:00", type: "SALIDA", productId: "PR-0046", quantity: 2, adjustmentDirection: null, stockBefore: 6, stockAfter: 4, userId: "USR-003", userName: "Valentina Gómez", description: "Salida por venta." },

    { id: "MOV-023", dateTime: "2026-11-13T10:15:00-05:00", type: "SALIDA", productId: "PR-0035", quantity: 5, adjustmentDirection: null, stockBefore: 10, stockAfter: 5, userId: "USR-003", userName: "Valentina Gómez", description: "Salida por venta." },
    { id: "MOV-024", dateTime: "2026-11-19T13:10:00-05:00", type: "ENTRADA", productId: "PR-0035", quantity: 2, adjustmentDirection: null, stockBefore: 5, stockAfter: 7, userId: "USR-001", userName: "Laura Martínez", description: "Ingreso de champú para reposición." }
  ].map(function (movement) { return Object.freeze(movement); });

  // Auditoría ficticia de acciones administrativas sobre productos.
  // No sustituye los movimientos ENTRADA/SALIDA/AJUSTE, que se consultan aparte.
  const auditEvents = [
    { id: "AUD-001", dateTime: "2026-11-22T11:50:00-05:00", action: "MODIFICAR", productId: "PR-0012", userId: "USR-001", userName: "Laura Martínez", description: "Se actualizó el precio de venta del producto.", valuesBefore: { "Precio": "$5.900" }, valuesAfter: { "Precio": "$6.200" } },
    { id: "AUD-002", dateTime: "2026-11-21T15:14:00-05:00", action: "MODIFICAR", productId: "PR-0011", userId: "USR-002", userName: "Andrés Ramírez", description: "Se modificó la descripción del producto.", valuesBefore: { "Descripción": "Agua potable en botella individual." }, valuesAfter: { "Descripción": "Agua natural purificada en botella individual de 600 ml." } },
    { id: "AUD-003", dateTime: "2026-11-20T12:45:00-05:00", action: "DESACTIVAR", productId: "PR-0049", userId: "USR-001", userName: "Laura Martínez", description: "Se desactivó el producto de temporada al finalizar su disponibilidad.", valuesBefore: { "Estado": "Activo" }, valuesAfter: { "Estado": "Inactivo" } },
    { id: "AUD-004", dateTime: "2026-11-19T10:40:00-05:00", action: "MODIFICAR", productId: "PR-0003", userId: "USR-002", userName: "Andrés Ramírez", description: "Se actualizó el nivel mínimo de existencias.", valuesBefore: { "Stock mínimo": "8" }, valuesAfter: { "Stock mínimo": "10" } },
    { id: "AUD-005", dateTime: "2026-11-17T09:15:00-05:00", action: "MODIFICAR", productId: "PR-0021", userId: "USR-001", userName: "Laura Martínez", description: "Se corrigió el nombre comercial del producto.", valuesBefore: { "Nombre": "Galletas vainilla" }, valuesAfter: { "Nombre": "Galletas de vainilla" } },
    { id: "AUD-006", dateTime: "2026-11-15T08:55:00-05:00", action: "CREAR", productId: "PR-0050", userId: "USR-001", userName: "Laura Martínez", description: "Se registró una nueva presentación promocional en el catálogo.", valuesBefore: {}, valuesAfter: { "Código": "7708002", "Nombre": "Presentación promocional", "Categoría": "Bebidas", "Estado": "Activo" } },
    { id: "AUD-007", dateTime: "2026-11-12T14:20:00-05:00", action: "MODIFICAR", productId: "PR-0017", userId: "USR-002", userName: "Andrés Ramírez", description: "Se ajustó el precio registrado para el producto.", valuesBefore: { "Precio": "$4.500" }, valuesAfter: { "Precio": "$4.700" } },
    { id: "AUD-008", dateTime: "2026-11-16T16:05:00-05:00", action: "DESACTIVAR", productId: "PR-0050", userId: "USR-002", userName: "Andrés Ramírez", description: "Se desactivó una presentación promocional que dejó de comercializarse.", valuesBefore: { "Estado": "Activo" }, valuesAfter: { "Estado": "Inactivo" } }
  ].map(function (event) { return Object.freeze(event); });

  global.SGI.mockData = Object.freeze({
    users: Object.freeze(users),
    userDirectory: Object.freeze(userDirectory),
    categories: Object.freeze(productCategories),
    unitsOfMeasure: Object.freeze(unitsOfMeasure),
    products: Object.freeze(products),
    providers: Object.freeze(providers),
    movements: Object.freeze(movements),
    auditEvents: Object.freeze(auditEvents),
    dashboard: dashboard,
    // Los datos agregados de esta pantalla son ficticios y exclusivos del prototipo.
    // Los modelos detallados de cada módulo se incorporarán en sus respectivas vistas.
    demoPassword: demoPassword
  });
})(window);
