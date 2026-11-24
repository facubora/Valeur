from motor import *
add('<h1 id="indice" style="break-before:auto">Índice</h1><div class="toc">@@TOC@@</div>')
H1("1. Introducción")
H2("1.1 Qué es Valeur y para qué sirve")
p("Valeur es una aplicación web para seguir tus inversiones, el mercado y lo que recomienda tu gente, todo en un solo lugar. Está pensada para Argentina y para personas que quieren empezar a invertir, aunque nunca lo hayan hecho, y que buscan información clara y sin jerga.")
p("Con Valeur podés:")
ul("Cargar tus compras y ventas y ver cuánto vale hoy tu **portfolio**, en dólares o en pesos.",
   "Explorar el mercado: CEDEARs, acciones, cripto, monedas, índices y ETFs, con su precio y su variación del día.",
   "Ver el gráfico de velas de cualquier activo, con el histórico completo, y acercarlo o alejarlo con el mouse.",
   "Seguir activos sin comprarlos y recibir **alertas** cuando llegan a un precio o se mueven fuerte en el día.",
   "Publicar y leer **recomendaciones** en la Comunidad, seguir personas y hacerte amigos.",
   "Elegir quién ve tu portfolio. Nunca se muestran montos, solo porcentajes.",
   "Consultar el **Calendario** de resultados y dividendos, usar el **Simulador** y aprender los términos básicos en **Aprendé**.",
   "Usar la aplicación en modo claro o en modo oscuro, en pantallas grandes o chicas.")
nota("Valeur muestra información de mercado y lleva tus cuentas. No es un broker: no compra ni vende acciones ni maneja dinero real.")
H2("1.2 A quién está dirigido este manual")
p("Este manual está dirigido a cualquier persona que use Valeur, sin necesidad de conocimientos técnicos ni de programación. Explica **cómo se usa la aplicación pantalla por pantalla**: qué hay en cada ventana, para qué sirve cada botón y qué pasa después de cada acción.")
p("Cómo está construida la aplicación (código, base de datos, servidores) está en el Documento de Arquitectura. Cómo se probó y cómo se protege está en el Manual Técnico de Testing y Seguridad.")
p("Convenciones usadas en este documento:")
ul("Los nombres de botones, campos y menús aparecen en **negrita**, tal como se ven en pantalla.",
   "Las direcciones de cada ventana (por ejemplo, /login) se escriben después de la dirección principal de Valeur.",
   "Los globos numerados en rojo sobre las capturas se corresponden con la lista \"Elementos de la pantalla\" de cada ventana.",
   "Las capturas se hicieron con una cuenta de demostración (@manualdemo). Los precios que se ven son los del día en que se tomaron.",
   "Los números entre paréntesis, como (5.4), indican la sección del manual donde se explica ese tema.")
H2("1.3 Qué cambió respecto de la versión anterior")
p("La primera versión de este manual describía el MVP, con cinco ventanas y datos de ejemplo. En esta versión todo lo que estaba marcado como PLANIFICADO ya funciona y se sumaron ventanas nuevas.")
tabla(["Antes (versión 1.0)", "Ahora (versión 2.0)"], [
 ["Portfolio con datos de ejemplo.", "Portfolio real: se arma con las operaciones que cargás (5.3 y 5.4)."],
 ["Portfolio y watchlist planificados.", "Operaciones, posiciones y activos seguidos (5.2 a 5.6)."],
 ["Alertas planificadas.", "Alertas de precio y de variación, con notificaciones (5.7 y 5.8)."],
 ["Buscador de tickers con un gráfico.", "Mercado completo con pestañas, rubros e ideas, y una página por activo (4.5, 4.6, 5.5 y 5.6)."],
 ["Sin comunidad.", "Recomendaciones, seguidores, amigos, perfiles y verificados (5.9 a 5.12)."],
 ["No se podía cambiar la contraseña.", "Recuperar la contraseña por email y cambiarla desde la cuenta (4.4 y 5.12)."],
 ["Sin herramientas para aprender.", "Aprendé, Simulador y Calendario (4.7, 5.13 y 5.14)."],
 ["Sin administrador.", "Panel de administración (6.1)."],
 ["Había que levantar el proyecto a mano.", "Ejecutable para Windows y Mac, o un solo comando (2.2)."],
], [40, 60], 9.5)

H1("2. Cómo empezar con Valeur")
H2("2.1 Requisitos")
tabla(["Requisito", "Detalle"], [
 ["Computadora", "Windows 10 u 11, o Mac con chip Apple (M1 o posterior) para usar el ejecutable. Desde el código funciona en Windows, Mac o Linux."],
 ["Navegador", "Google Chrome, Firefox, Safari o Microsoft Edge en una versión actualizada."],
 ["Conexión a internet", "Necesaria: las cuentas están en la nube y los precios se descargan en el momento."],
 ["Pantalla", "La aplicación se adapta al tamaño de la ventana, desde un celular hasta un monitor."],
 ["Cuenta", "Opcional. Sin cuenta podés recorrer la página de inicio, el Mercado y Aprendé. Con cuenta accedés a todo lo demás."],
], [28, 72])
H2("2.2 Cómo acceder")
p("Hay dos formas de abrir Valeur. Las dos terminan en la misma dirección: **http://localhost:5173**.")
p("**Opción A: ejecutable (no hay que instalar nada).** Se descarga desde la página de versiones del proyecto: github.com/facubora/Valeur/releases/latest.")
tabla(["Sistema", "Archivo", "Cómo se abre"], [
 ["Windows", "Valeur-Windows.exe", "Doble clic. Si aparece \"Windows protegió su PC\", hacé clic en **Más información** y después en **Ejecutar de todas formas**."],
 ["Mac", "Valeur-Mac.zip", "Descomprimilo, hacé clic derecho en **Valeur** y elegí **Abrir**. Si el Mac no lo deja, andá a **Ajustes del Sistema → Privacidad y seguridad** y hacé clic en **Abrir igualmente**."],
], [15, 27, 58], 9.5)
ol("Abrí el archivo. Aparece una ventana negra con la dirección de la aplicación.",
   "Esperá unos segundos: el navegador se abre solo en la página de inicio de Valeur.",
   "Cuando termines, cerrá la ventana negra. Eso cierra Valeur.")
p("**Opción B: desde el código.** Hace falta tener instalados Python 3.9 o superior y Node.js 20 o superior.")
ol("Descargá o cloná el proyecto y abrí la carpeta Valeur.",
   "En Mac o Linux ejecutá **./iniciar.sh**; en Windows hacé doble clic en **iniciar.bat**.",
   "La primera vez instala todo (un par de minutos). Después se abre la página de inicio.")
fig("landing-hero", "Página de inicio de Valeur.")
nota("Todas las direcciones de este manual (por ejemplo, /login) se escriben a continuación de la dirección principal: http://localhost:5173/login.")
nota("Los avisos de Windows y de Mac aparecen porque el archivo no está firmado con un certificado pago. Es un proyecto escolar.")
H2("2.3 Crear una cuenta")
p("Registrarte es gratis. Solo necesitás un nombre de usuario, un email y una contraseña de al menos 8 caracteres.")
ol("Hacé clic en **Crear cuenta** (arriba a la derecha) o en **Crear cuenta gratis**. Se abre la ventana Crear una cuenta.",
   "Completá los cuatro campos y hacé clic en **Crear cuenta gratis**. Se abre tu Inicio con la sesión ya iniciada o, si hace falta, te pide confirmar el email.")
p("El detalle completo está en la sección 4.3.")
H2("2.4 Iniciar sesión")
ol("Hacé clic en **Entrar** (arriba a la derecha de la página de inicio). Se abre la ventana Entrar.",
   "Ingresá tu email y tu contraseña y hacé clic en **Entrar**. Se abre tu Inicio.")
p("El detalle completo está en la sección 4.2.")
nota("La sesión queda guardada en el navegador: si cerrás la pestaña y volvés a abrir Valeur, seguís adentro. Para salir tenés que hacer clic en **Cerrar sesión** (sección 5.15).")
H2("2.5 Cuenta de prueba")
p("Para recorrer la aplicación con datos ya cargados existe una cuenta de prueba con portfolio, activos seguidos, alertas, amigos y una comunidad con recomendaciones.")
ul("Email: **profe@demo.valeur.test**", "Contraseña: está en la entrega de Classroom.",
   "Es también **administrador**: usa Valeur como cualquier usuario y, además, tiene el **Panel admin** en el menú de la cuenta (6.1).")

H1("3. Tipos de usuario y permisos")
H2("3.1 Descripción de cada rol")
p("En Valeur existen tres tipos de usuario.")
tabla(["Rol", "Quién es", "Qué puede hacer"], [
 ["Visitante", "Cualquier persona que entra a Valeur sin haber iniciado sesión.", "Recorrer la página de inicio, crear una cuenta, iniciar sesión, recuperar su contraseña, explorar el mercado, ver cotizaciones y gráficos, usar Aprendé y cambiar el tema claro/oscuro."],
 ["Usuario registrado", "Persona que creó una cuenta e inició sesión.", "Todo lo del visitante y, además: cargar operaciones y ver su portfolio, seguir activos, crear alertas, recibir notificaciones, participar de la comunidad, editar su perfil y su privacidad, y usar el Calendario y el Simulador."],
 ["Administrador", "Usuario registrado con permiso de administración. Usa la misma cuenta para todo.", "Todo lo del usuario registrado y, además: aprobar o rechazar pedidos de verificado, revisar recomendaciones reportadas y ver los números de la aplicación."],
], [19, 30, 51])
detalle("Una **cuenta verificada** es un usuario registrado con una insignia azul al lado del nombre (analistas, asesores, brokers, creadores, periodistas). Tiene los mismos permisos que cualquier usuario registrado.")
H2("3.2 Matriz de roles por funcionalidad")
p("· ✔ significa que puede hacerlo.")
p("· ✘ significa que no puede hacerlo.")
V, X = "✔", "✘"
tabla(["Funcionalidad", "Ventana", "Visitante", "Registrado", "Admin."], [
 ["Ver la página de inicio", "/", V, V, V],
 ["Crear una cuenta", "/register", V, X, X],
 ["Iniciar sesión", "/login", V, X, X],
 ["Recuperar la contraseña", "/recuperar", V, V, V],
 ["Explorar el mercado y buscar activos", "/tickersearch", V, V, V],
 ["Ver cotización y gráfico de velas", "/tickersearch", V, V, V],
 ["Aprender los términos", "/aprende", V, V, V],
 ["Cambiar entre modo claro y oscuro", "todas", V, V, V],
 ["Ver el Inicio propio", "/home", "✘ (lleva a /login)", V, V],
 ["Ver el portfolio", "/dashboard", "✘ (lleva a /login)", V, V],
 ["Registrar y borrar operaciones", "/dashboard", X, V, V],
 ["Exportar operaciones a Excel", "/dashboard", X, V, V],
 ["Seguir activos y rubros", "/tickersearch", X, V, V],
 ["Crear, editar y borrar alertas", "/tickersearch", X, V, V],
 ["Recibir notificaciones", "todas", X, V, V],
 ["Leer y publicar recomendaciones", "/comunidad", "✘ (lleva a /login)", V, V],
 ["Seguir personas y hacer amigos", "/comunidad", X, V, V],
 ["Ver perfiles", "/u/usuario", "✘ (lleva a /login)", V, V],
 ["Editar perfil, privacidad y contraseña", "/u/usuario", X, "✔ (el propio)", "✔ (el propio)"],
 ["Pedir la cuenta verificada", "/u/usuario", X, V, V],
 ["Reportar una recomendación", "/comunidad", X, V, V],
 ["Ver el calendario", "/calendario", "✘ (lleva a /login)", V, V],
 ["Usar el simulador", "/simulador", "✘ (lleva a /login)", V, V],
 ["Aprobar o rechazar verificados", "/admin", X, X, V],
 ["Revisar recomendaciones reportadas", "/admin", X, X, V],
 ["Ver los números de Valeur", "/admin", "✘ (lleva a /login)", "✘ (lleva a /home)", V],
], [37, 17, 18, 15, 13], 9.5, 482)
add('<div style="break-before:page"></div>')
H2("3.3 Mapa de navegación")
p("El siguiente esquema muestra todas las ventanas de Valeur y cómo se pasa de una a otra.")
def box(x, y, title, route, cls="", w=150):
    return f'<g class="{cls}"><rect x="{x}" y="{y}" width="{w}" height="50" rx="8"/><text x="{x+12}" y="{y+21}" class="bt">{title}</text><text x="{x+12}" y="{y+38}" class="br">{route}</text></g>'
def ar(d, cls=""): return f'<path d="{d}" class="ar {cls}" marker-end="url(#m{cls})"/>'
def lb(x, y, s, a="middle"): return f'<text x="{x}" y="{y}" class="lb" text-anchor="{a}">{s}</text>'
def frame(x, y, w, h, s): return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10" class="fr"/><text x="{x+22}" y="{y+4}" class="fl">{s}</text>'
svg = '<svg viewBox="0 0 780 660" xmlns="http://www.w3.org/2000/svg"><style>.fr{fill:none;stroke:#cbd5e1;stroke-dasharray:5 4;stroke-width:1.4}.fl{font:700 10px \'DM Sans\';letter-spacing:.06em;fill:#64748b;paint-order:stroke;stroke:#fff;stroke-width:8px}g rect{fill:#fff;stroke:#1e3a8a;stroke-width:1.5}g.ad rect{fill:#fffbeb;stroke:#f59e0b;stroke-dasharray:5 3}.bt{font:700 12px \'DM Sans\';fill:#0f172a}.br{font:10.5px Menlo,monospace;fill:#2563eb}.ar{fill:none;stroke:#1e3a8a;stroke-width:1.4}.ar.o{stroke:#f59e0b;stroke-dasharray:4 3}.lb{font:600 9.5px \'DM Sans\';fill:#334155;paint-order:stroke;stroke:#fff;stroke-width:5px}.nt{font:9.5px \'DM Sans\';fill:#334155}</style><defs><marker id="m" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" fill="#1e3a8a"/></marker><marker id="mo" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0 10 5 0 10z" fill="#f59e0b"/></marker></defs>'
svg += frame(10, 20, 760, 196, "VISITANTE (SIN CUENTA)") + frame(10, 244, 760, 196, "USUARIO REGISTRADO").replace('x="32" y="248"', 'x="470" y="248"') + frame(10, 468, 760, 112, "CON O SIN CUENTA")
svg += ar("M180 75H220") + lb(200, 44, "Entrar") + ar("M105 100V140") + lb(111, 124, "Crear cuenta", "start")
svg += f'<path d="M180 165H250V100" class="ar" marker-end="url(#m)" marker-start="url(#m)"/>' + lb(215, 136, "¿Ya tenés cuenta?", "start")
svg += ar("M370 75H410") + lb(390, 44, "¿La olvidaste?") + ar("M560 75H600") + lb(580, 44, "email")
svg += ar("M318 100V270") + lb(324, 135, "sesión iniciada", "start") + ar("M105 190V295H220") + lb(111, 232, "cuenta creada", "start") + ar("M675 100V228H352V270") + lb(675, 190, "contraseña guardada")
svg += ar("M370 295H420", "o") + lb(395, 286, "admin")
svg += '<path d="M295 320V346" class="ar"/><path d="M105 346H675" class="ar"/>' + ar("M105 346V372") + ar("M295 346V372") + ar("M485 346V372") + ar("M675 346V372") + ar("M720 372V320")
svg += ar("M200 346V525H220") + ar("M580 346V525H600") + ar("M370 525H410") + lb(390, 516, "elegir")
svg += ar("M30 75H20V564H275V550") + ar("M275 564H655V550") + lb(120, 558, "Mercado y Aprendé")
for a in [(30,50,"Página de inicio","/"),(220,50,"Entrar","/login"),(410,50,"Recuperar contraseña","/recuperar"),(600,50,"Contraseña nueva","/nueva-clave"),(30,140,"Crear una cuenta","/register"),(220,270,"Inicio","/home"),(600,270,"Perfil","/u/usuario"),(30,372,"Portfolio","/dashboard"),(220,372,"Calendario","/calendario"),(410,372,"Simulador","/simulador"),(600,372,"Comunidad","/comunidad"),(220,500,"Mercado","/tickersearch"),(410,500,"Un activo","/tickersearch?symbol="),(600,500,"Aprendé","/aprende")]: svg += box(*a)
svg += box(420, 270, "Panel admin", "/admin", "ad")
svg += '<text x="20" y="606" class="nt">Con la sesión iniciada, la barra de arriba lleva a Inicio, Portfolio, Mercado y Comunidad desde cualquier ventana; Más abre el resto.</text><text x="20" y="623" class="nt">El logo Valeur vuelve a Inicio (con sesión) o a la página de inicio (sin sesión). El buscador (⌘K o Ctrl K) llega a casi todas las ventanas.</text><text x="20" y="640" class="nt">Sin sesión iniciada, las ventanas de usuario registrado llevan a /login. Una dirección que no existe muestra la ventana de error 404.</text></svg>'
figsvg(svg, "Mapa de navegación de Valeur. En amarillo, la ventana exclusiva del administrador.")

H1("4. Guía por ventana — Visitante", "4")
p("Ventanas que puede usar cualquier persona sin iniciar sesión. Cada ventana se describe con los mismos ocho puntos.")
H2("4.1 Conocer Valeur (Página de inicio)")
win("Conocer Valeur y elegir entre crear una cuenta o entrar", "/", "Presenta qué es Valeur y qué ofrece, con pedazos de la aplicación que se pueden tocar. Desde acá se llega a crear una cuenta o a iniciar sesión.", "Visitante, Usuario registrado y Administrador (es pública).",
 ["Al abrir la dirección de Valeur en el navegador.", "Sin sesión iniciada, desde cualquier otra ventana, haciendo clic en el logo **Valeur** (arriba a la izquierda)."])
fig("landing-hero-a", "Parte superior de la página de inicio con sus elementos numerados.")
elementos()
els("**Cinta de cotizaciones** — dice si BYMA y NYSE están abiertos y muestra los precios del momento. Hacé clic en uno para ver ese activo.",
 "**Logo Valeur** — vuelve al comienzo de la página.",
 "**Menú de secciones** (Producto · Cómo funciona · Privacidad · Preguntas) — al hacer clic, la página se desplaza hasta esa sección.",
 "**Mercado** y **Aprendé** — abren esas ventanas sin necesidad de crear una cuenta (4.5 y 4.7).",
 "Botón de **tema** (luna/sol) — cambia entre modo claro y oscuro.",
 "**Entrar** — abre la ventana Entrar (4.2).",
 "**Crear cuenta** — abre la ventana Crear una cuenta (4.3).",
 "**Crear cuenta gratis** — también abre Crear una cuenta.",
 "**Ver qué hay adentro** — baja hasta la sección Producto.",
 "**Estado del día** — mercados abiertos o cerrados, moneda y privacidad.",
 "**Mirá sin crear cuenta** — dos tarjetas que también llevan a Mercado y a Aprendé.",
 "**Adelanto** — ejemplos de lo que se ve adentro de Valeur, que van rotando.")
p("Al bajar por la página encontrás además estas secciones:")
ul("**Producto** — Portfolio, Mercado, Alertas y Comunidad, cada uno con una muestra que se puede tocar. En Mercado está el botón **Abrir el mercado**.",
   "**Cómo funciona** — los tres pasos para empezar.", "**Privacidad** — quién puede ver tu portfolio.",
   "**Sin costo** — por qué Valeur es gratis.", "**Preguntas** — preguntas desplegables: hacé clic en una para ver la respuesta.",
   "**Cierre** — botón **Crear cuenta gratis** y pie de página con enlaces.")
fig("landing-producto", "Sección Producto: la muestra del portfolio permite cambiar entre US$ y AR$.")
fig("landing-como", "Sección Cómo funciona, con los tres pasos para empezar.")
fig("landing-gratis", "Sección Sin costo.")
pasos()
ol("Abrí la dirección de Valeur en el navegador. Aparece la página de inicio con el título \"Tu plata, el mercado y tu gente, en un solo lugar\".",
   "Hacé clic en **Cómo funciona** en el menú. La página baja hasta los tres pasos.",
   "Hacé clic en **Preguntas** y después en una pregunta. Se despliega la respuesta debajo.")
fig("landing-faq-a", "Preguntas: hacé clic en una pregunta (1) para desplegar la respuesta.")
ol("Hacé clic en **Volver arriba**, en el pie de página. La página vuelve al comienzo.",
   "Hacé clic en **Mercado** o en **Aprendé** si querés mirar antes de registrarte.", "Hacé clic en **Crear cuenta** si no tenés cuenta, o en **Entrar** si ya tenés una.", cont=True)
conecta("**Crear cuenta / Crear cuenta gratis** se conectan con la ventana Crear una cuenta (/register).", "**Entrar** se conecta con la ventana Entrar (/login).",
 "El menú de secciones y **Ver qué hay adentro** son secciones de la misma página.", "**Mercado**, **Abrir el mercado** y **Aprendé** se conectan con /tickersearch y /aprende.", "Los precios de la cinta se conectan con la página de cada activo (4.6).", "El botón de tema cambia el aspecto de toda la aplicación (ver flujo 7.11).")
fig2("landing-movil", "landing-movil-menu", "La misma página vista en una pantalla de celular, con el menú cerrado y abierto.")

H2("4.2 Entrar (iniciar sesión)")
win("Iniciar sesión con una cuenta existente", "/login", "Permite entrar a tu cuenta con tu email y contraseña.", "Visitante (que ya tiene cuenta). Si ya tenés la sesión iniciada, te lleva directo a tu Inicio.",
 ["Página de inicio → **Entrar** (arriba a la derecha).", "Ventana Crear una cuenta → enlace **Entrar** (abajo).", "Mercado o Aprendé sin sesión → botón **Iniciar sesión** (arriba a la derecha).", "Después de hacer clic en **Cerrar sesión**.", "Automáticamente, si intentás abrir una ventana que necesita cuenta (por ejemplo, /dashboard)."])
fig("login-a", "Ventana Entrar con sus elementos numerados.")
elementos()
els("**Logo Valeur** — vuelve a la página de inicio.", "Botón de **tema** (luna/sol) — cambia entre modo claro y oscuro.", "Campo **Email** — el email con el que te registraste.", "Campo **Contraseña** — se muestra con puntos para que nadie la vea.",
 "Botón del **ojo** — muestra u oculta la contraseña que escribiste.", "Enlace **¿La olvidaste?** — abre Recuperar la contraseña (4.4).", "Botón **Entrar** — envía los datos. Mientras se procesa dice \"Entrando…\".", "Enlace **Creala gratis** — si todavía no tenés cuenta, te lleva a Crear una cuenta.", "**Adelanto** de la aplicación.")
pasos()
ol("Ingresá tu email en el campo **Email**.", "Ingresá tu contraseña en el campo **Contraseña**. Se ve como una fila de puntos.")
fig("login-completo", "Formulario completo, listo para enviar.")
ol("Hacé clic en **Entrar** (o presioná **Enter**). El botón cambia a \"Entrando…\" y, si los datos son correctos, se abre tu Inicio.",
   "Si aparece el mensaje rojo \"Email o contraseña incorrectos\", revisá los dos campos y volvé a intentar. El mensaje desaparece apenas modificás un campo.", cont=True)
fig("login-error-a", "Mensaje de error (1) cuando el email o la contraseña no coinciden.")
conecta("Datos correctos se conecta con la ventana Inicio (/home). La sesión queda guardada en tu navegador.", "**¿La olvidaste?** se conecta con Recuperar la contraseña (/recuperar).", "**Creala gratis** se conecta con Crear una cuenta (/register).", "**Logo Valeur** → página de inicio (/).")
nota("Los dos campos son obligatorios. Si dejás uno vacío aparece \"Completá el email y la contraseña\".")

H2("4.3 Crear una cuenta")
win("Crear una cuenta nueva en Valeur", "/register", "Permite registrarte gratis con un nombre de usuario, un email y una contraseña.", "Visitante.", ["Página de inicio → **Crear cuenta** o **Crear cuenta gratis**.", "Ventana Entrar → enlace **Creala gratis**.", "Ventana de error 404 sin sesión → **Crear cuenta**."])
fig("registro-a", "Ventana Crear una cuenta con sus elementos numerados.")
elementos()
els("**Logo Valeur** — vuelve a la página de inicio.", "Campo **Usuario** — el nombre con el que te van a ver en Valeur (por ejemplo, @tunombre). Tiene que ser único y tener de 3 a 30 letras, números o guiones bajos.", "Campo **Email** — tu correo electrónico. Tiene que ser único.", "Campo **Contraseña** — mínimo 8 caracteres.", "Campo **Repetila** — volvé a escribir la misma contraseña.",
 "**Requisitos** — una barra muestra qué tan fuerte es la contraseña y tres tildes se marcan mientras escribís.", "Botón **Crear cuenta gratis** — envía los datos. Mientras se procesa dice \"Creando cuenta…\".", "Enlace **Entrar** — si ya tenés cuenta, te lleva a Entrar.", "Botón de **tema** (luna/sol) — cambia entre modo claro y oscuro.")
pasos()
ol("Ingresá un nombre de usuario en **Usuario**.", "Ingresá tu correo en **Email**.", "Ingresá una contraseña en **Contraseña** y repetila en **Repetila**. Los tres requisitos tienen que quedar con el tilde verde.")
fig("registro-completo-a", "Formulario completo: fuerza de la contraseña (1) y requisitos cumplidos (2).")
ol("Hacé clic en **Crear cuenta gratis**. Si la cuenta necesita confirmación, aparece \"Revisá tu email\": abrí el enlace que te llega y después entrá (4.2). Si no, se abre tu Inicio con la sesión ya iniciada.", cont=True)
fig("registro-mail", "Aviso para confirmar el email antes de entrar por primera vez.")
p("Si algo no está bien, aparece un mensaje rojo arriba del botón. Los más comunes son los siguientes:")
ul("\"Las contraseñas no coinciden\" → los dos campos son distintos. Volvé a escribirlos.", "\"La contraseña debe tener al menos 8 caracteres\" → elegí una más larga.", "\"Esa contraseña es muy común, elegí otra\" → evitá las del tipo 12345678 o qwerty123.", "\"Ese nombre de usuario ya está en uso\" → probá con otro.", "\"Ese email ya está registrado\" → iniciá sesión si esa cuenta es tuya.", "\"El usuario debe tener 3 a 30 caracteres: letras, números o guión bajo\" → sacá espacios y símbolos.")
fig("registro-error-a", "Mensaje de error (1) cuando las contraseñas no coinciden.")
conecta("Registro correcto se conecta con Inicio (/home), o con la confirmación por email.", "**Entrar** se conecta con la ventana Entrar (/login).", "**Logo Valeur** con la página de inicio (/).")

H2("4.4 Recuperar la contraseña")
win("Elegir una contraseña nueva cuando no te acordás la actual", "/recuperar y /nueva-clave", "Manda un enlace a tu email para que elijas una contraseña nueva. Son tres pasos y el panel de la izquierda muestra en cuál estás.", "Visitante (que ya tiene cuenta) y Usuario registrado.", ["Ventana Entrar → enlace **¿La olvidaste?**.", "Editar perfil → **Seguridad** → **¿No te la acordás?** (5.12).", "El paso 3 se abre solo, desde el enlace del email."])
fig("recuperar-a", "Paso 1: pedir el enlace.")
elementos()
els("**Pasos** — el que estás haciendo aparece resaltado con \"Ahora\" y los terminados, con un tilde.", "Campo **Email** — el email de tu cuenta.", "Botón **Mandame el enlace** — envía el email.", "Enlace **Entrar** — si te acordaste, vuelve a la ventana Entrar.")
pasos()
ol("Ingresá tu email y hacé clic en **Mandame el enlace**. Aparece \"Revisá tu email\".")
fig("recuperar-2", "Paso 2: el enlace llega al email. Si no llegó, se puede pedir de nuevo.")
ol("Abrí tu correo (fijate también en spam) y hacé clic en el enlace. Se abre la ventana para elegir la contraseña nueva.", "Escribí la **Contraseña nueva** (1) y repetila (2). Cuando los requisitos (3) estén cumplidos, se habilita **Guardar contraseña** (4).", cont=True)
fig("recuperar-3-a", "Paso 3: elegir la contraseña nueva.")
ol("Hacé clic en **Guardar contraseña** y después en **Ir a mi inicio**.", cont=True)
fig("recuperar-4", "Contraseña cambiada: los tres pasos quedan tildados.")
conecta("**Mandame el enlace** envía un email con un enlace a /nueva-clave.", "**Ir a mi inicio** se conecta con Inicio (/home).", "**Pedir otro enlace** y **Probá de nuevo** vuelven al paso 1.")
nota("El enlace sirve una sola vez y vence. Si ya no funciona, aparece \"El enlace ya no sirve\" con el botón **Pedir otro enlace**.")
fig("recuperar-vencido", "Aviso cuando el enlace venció o ya se usó.")

H2("4.5 Explorar el mercado")
win("Explorar el mercado y buscar activos", "/tickersearch", "Muestra los activos ordenados por tipo y por rubro, con su precio, su variación del día y cómo les fue en el último mes. Desde acá se busca y se abre cualquier activo.", "Visitante, Usuario registrado y Administrador. Con cuenta aparecen más secciones (5.5).", ["Página de inicio → **Mercado** (en la barra o en la tarjeta) o **Abrir el mercado**.", "Escribiendo /tickersearch a continuación de la dirección de Valeur.", "Barra superior → **Mercado**.", "Página de un activo → **← Mercado**."])
fig("mercado-visitante-a", "Ventana Mercado sin sesión iniciada, con sus elementos numerados.")
elementos()
els("**Barra de navegación** — Inicio, Portfolio, Mercado y Comunidad. Sin cuenta, solo Mercado está disponible; los otros llevan a Entrar.", "**Buscador general** — busca activos, personas y ventanas (5.1).", "**Iniciar sesión** — abre la ventana Entrar.", "**Cómo viene el día** — cuántos suben y cuántos bajan, y el que más sube y el que más baja. Hacé clic en uno para verlo.", "**Buscador de activos** — escribí un ticker, una empresa, una cripto o una moneda.", "**Recientes** — los últimos activos que abriste.", "**Orden** — Populares, los que más suben o los que más bajan.", "Botón **Actualizar precios**.")
fig("mercado-lista-a", "Lista de activos del Mercado con sus filtros numerados.")
p("En la lista **Explorar**:")
els("**Pestañas** — CEDEARs, Acciones, Cripto, Monedas, e Índices y ETFs.", "**Rubros** — Tecnología, Chips, Finanzas, Energía y otros. Se pueden deslizar hacia el costado.", "**Filtro** — escribí parte del nombre o del ticker para achicar la lista.", "**Orden** — igual que en la captura anterior.", "**Fila de un activo** — nombre, ticker, rubro, variación del último mes con su minigráfico, precio y variación de hoy. Hacé clic para abrirlo.")
pasos()
ol("Hacé clic en **Mercado**. Se abre la lista de CEDEARs.", "Escribí lo que buscás en el buscador de activos (por ejemplo, mercado). Aparecen sugerencias debajo.", "Elegí una con el mouse o con las flechas y **Enter**. Se abre la página del activo.")
fig("mercado-sugerencias-a", "Al escribir en el buscador (1) aparecen las sugerencias (2).")
ol("Hacé clic en una pestaña, por ejemplo **Cripto**. La lista cambia.", "Hacé clic en **Suben** para ver primero los que más subieron hoy.", "Hacé clic en **Ver los…** (al final de la lista) para mostrar todos los activos.", cont=True)
fig("mercado-cripto", "Pestaña Cripto del Mercado.")
conecta("Cada fila, sugerencia o reciente se conecta con la página de ese activo (4.6).", "Los precios se descargan de Yahoo Finance.", "**Iniciar sesión** se conecta con Entrar (/login).")
nota("Los tickers de la bolsa argentina llevan \".BA\": AAPL es la acción de Apple en EE.UU. y AAPL.BA es su CEDEAR en pesos.")

H2("4.6 Ver un activo y su gráfico")
win("Ver la cotización y el gráfico de velas de un activo", "/tickersearch?symbol=AAPL.BA", "Muestra el precio actual, la variación del día y un gráfico de velas con todo el histórico disponible.", "Visitante, Usuario registrado y Administrador. Con cuenta se suman las acciones Seguir, Alerta, Recomendar, Simular y Operar (5.6).", ["Mercado → clic en un activo.", "Buscador general (⌘K o Ctrl K) → elegir un activo.", "Cinta de cotizaciones → clic en un precio.", "Escribiendo /tickersearch?symbol=TSLA (o cualquier otro ticker)."])
fig("activo-visitante-a", "Página de un activo sin sesión iniciada, con sus elementos numerados.")
elementos()
els("**← Mercado** — vuelve a la lista. Al lado se ve el tipo de activo, el rubro y la moneda en que cotiza.", "**Nombre y ticker** del activo.", "**Datos del día** — variación en porcentaje y en plata, y el próximo evento de la empresa si lo hay.", "**Precio actual**.", "**Iniciá sesión para operar** — abre Entrar.", "**Intervalo** (30m · 1H · 1D · 1S · 1M) — cuánto tiempo representa cada vela.", "**Rango** (1M · 6M · 1A · 5A · Máx) — cuánto histórico se muestra. Con 30m o 1H las opciones pasan a ser 1D · 5D · 1M.", "Botón **Recargar** — vuelve a descargar los datos.")
fig("activo-vela-a", "Al pasar el cursor por el gráfico (1) aparecen los datos de la vela (2). Abajo, las estadísticas del día (3).")
ul("**Gráfico de velas** — cada vela es un período: verde si cerró más alto que abrió, roja si cerró más bajo. Las barras claras de abajo son el volumen operado.", "**Datos de la vela señalada** — Fecha, Apertura, Máximo, Mínimo, Cierre y Cambio.", "**Estadísticas** — Volumen, Cierre anterior, Cambio y Última sesión.", "**Del mismo rubro** — debajo del gráfico. Hacé clic para desplegar activos parecidos.")
pasos()
ol("Abrí un activo desde el Mercado. Aparece un círculo de carga y, en unos segundos, el gráfico y la cotización.", "Pasá el cursor por encima del gráfico. Una cruz punteada sigue al mouse y abajo aparecen los valores de esa vela.", "Girá la rueda del mouse sobre el gráfico para acercar o alejar. Arrastralo hacia la derecha para ver fechas más antiguas.", "Hacé clic en **1H**. Cada vela pasa a representar una hora y el rango cambia solo a 5D.")
fig("activo-hora", "Gráfico con velas de una hora y rango de 5 días.")
ol("Si escribís un ticker que no existe, aparece \"No encontramos…\" con tickers parecidos, si los hay. Hacé clic en **Volver al mercado** para seguir buscando.", cont=True)
fig("activo-noexiste", "Aviso cuando el ticker no existe.")
ol("Si el servidor de precios no responde, aparece \"No se pudo conectar al servidor\". Hacé clic en **Reintentar**.", cont=True)
fig("activo-sinservidor-a", "Aviso cuando no hay conexión con el servidor de precios. El botón Reintentar (1) vuelve a consultar.")
conecta("El gráfico y la cotización se consultan a Yahoo Finance a través del servidor de Valeur.", "**← Mercado** se conecta con la lista (4.5).", "**Iniciá sesión para operar** se conecta con Entrar (/login).", "Los activos **Del mismo rubro** se conectan con sus propias páginas.")

H2("4.7 Aprender los términos (Aprendé)")
win("Aprender los términos básicos de inversión", "/aprende", "Explica 20 términos que aparecen en Valeur (CEDEAR, dólar MEP, diversificar y otros) en tarjetas que se dan vuelta, cada una con un ejemplo.", "Visitante, Usuario registrado y Administrador.", ["Página de inicio → **Aprendé** (en la barra o en la tarjeta).", "Escribiendo /aprende a continuación de la dirección de Valeur.", "Barra superior → **Más** → **Aprendé** (con sesión).", "Pie de página → **Aprendé**.", "Desde cualquier término con signo de pregunta → **Ver más en Aprendé**."])
fig("aprende-a", "Ventana Aprendé con sus elementos numerados.")
elementos()
els("**Progreso** — cuántos términos viste, y un acceso al Simulador.", "**Buscar un término** — filtra las tarjetas.", "**Barra de progreso** — se llena a medida que das vuelta tarjetas.", "**Ver todas** — da vuelta todas las tarjetas juntas.", "**Tarjeta** — tocala para darla vuelta.")
p("Las tarjetas están separadas en cuatro grupos: **Lo básico**, **Invertir desde Argentina**, **Cómo se mide** y **Riesgo y estrategia**.")
pasos()
ol("Hacé clic en una tarjeta. Se da vuelta y muestra qué es, la explicación y un ejemplo. Queda con un tilde.", "Hacé clic de nuevo para volver a verla de frente.")
fig("aprende-vuelta-a", "Una tarjeta dada vuelta (1) y otra de frente (2).")
ol("Escribí una palabra en **Buscar un término** (por ejemplo, dólar). Quedan solo las tarjetas que coinciden.", "Hacé clic en **Empezar de nuevo** si querés borrar el progreso.", cont=True)
fig("aprende-buscar", "Resultado de buscar \"dólar\" en Aprendé.")
conecta("**Simulador** se conecta con la ventana 5.14.", "El progreso se guarda en este navegador.")

H2("4.8 Página no encontrada (error 404)")
win("Aviso de que la dirección no existe", "cualquier dirección mal escrita", "Avisa que la dirección no existe y ofrece a dónde ir.", "Visitante, Usuario registrado y Administrador.", ["Escribiendo una dirección que no existe o abriendo un enlace viejo."])
fig("e404-a", "Ventana de error 404 con sus botones numerados.", 390)
elementos()
els("**Ir al inicio** — página de inicio o, con sesión, tu Inicio.", "**Entrar** — con sesión, este botón es **Mercado**.", "**Crear cuenta** — con sesión, este botón es **Portfolio**.")
pasos()
ol("Leé la dirección que aparece en el mensaje para ver si está mal escrita.", "Hacé clic en **Ir al inicio** o en alguno de los otros botones.")
conecta("Se conecta con las ventanas de cada botón.")
