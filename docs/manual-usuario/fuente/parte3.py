from motor import *
H1("7. Flujos completos", "7")
H2("7.1 Registrarse e iniciar sesión")
ol("Abrí la dirección de Valeur. Se abre la página de inicio.", "Hacé clic en **Crear cuenta**. Se abre la ventana Crear una cuenta.", "Completá **Usuario**, **Email**, **Contraseña** (mínimo 8 caracteres) y **Repetila**.", "Hacé clic en **Crear cuenta gratis**. Si te lo pide, confirmá el email con el enlace que te llega.", "Hacé clic en **Entrar**, ingresá tu email y tu contraseña y volvé a hacer clic en **Entrar**. Se abre tu Inicio con la lista Para arrancar.")
fig("inicio-nuevo-a", "Inicio de una cuenta recién creada.", 400)
H2("7.2 Recuperar la contraseña")
ol("En la ventana Entrar hacé clic en **¿La olvidaste?**.", "Ingresá tu email y hacé clic en **Mandame el enlace**.", "Abrí el enlace desde tu correo.", "Escribí la contraseña nueva dos veces y hacé clic en **Guardar contraseña**.", "Hacé clic en **Ir a mi inicio**.")
H2("7.3 Cargar una compra y ver mi portfolio")
ol("Iniciá sesión (7.1) y hacé clic en **Registrar operación**.", "Dejá **Compra** seleccionada, buscá el activo y elegilo.", "Ingresá la **Cantidad**, el **Precio** y la **Fecha**, y hacé clic en **Registrar compra**.", "Hacé clic en **Portfolio**. La compra aparece en Posiciones y en Operaciones, y el valor total se actualiza.")
fig("portfolio-posiciones-a", "La posición cargada, con su precio promedio y su ganancia.", 400)
H2("7.4 Registrar una venta o corregir un error")
ol("En **Portfolio → Posiciones**, pasá el mouse por el activo y hacé clic en **−**.", "Ingresá cuánto vendiste, a qué precio y cuándo, y hacé clic en **Registrar venta**.", "Si te equivocaste, bajá hasta **Operaciones**, pasá el mouse por la operación, hacé clic en el tacho y confirmá con **Borrar**. Después cargala de nuevo.")
H2("7.5 Buscar un activo y ver su gráfico")
ol("Hacé clic en **Mercado** (también está en la página de inicio, sin cuenta), o presioná **⌘K** (o **Ctrl K**) desde cualquier ventana.", "Escribí **Tesla** y elegí **TSLA**. Se abre su página.", "Pasá el cursor por el gráfico. Abajo aparecen fecha, apertura, máximo, mínimo, cierre y cambio de esa vela.", "Hacé clic en **1S** y después en **5A** para ver velas semanales de los últimos cinco años.", "Girá la rueda del mouse para acercar o alejar.")
H2("7.6 Seguir un activo y crear una alerta")
ol("Abrí la página del activo y hacé clic en **Seguir**.", "Hacé clic en **Alerta**, elegí **Sube a** o **Baja a**, y escribí el precio (o usá un atajo).", "Hacé clic en **Crear alerta**. Queda vigilando y aparece en Inicio con una barra que muestra cuánto falta.", "Cuando el precio llega, aparece un número en la campana. Hacé clic para ver el aviso.")
fig("notif-a", "El aviso llega a la campana.", 400)
H2("7.7 Publicar una recomendación")
ol("Hacé clic en **Comunidad** y después en **Recomendar**.", "Elegí el activo, la postura (**Comprar**, **Mantener** o **Vender**) y escribí por qué.", "Elegí si la ven **Todos** o solo tus **Amigos** y hacé clic en **Publicar**.", "Volvé otro día a la Comunidad para ver cómo le fue desde que la publicaste.")
H2("7.8 Hacerse amigos y compartir el portfolio")
ol("En **Comunidad**, buscá a la persona por su usuario y hacé clic en **Seguir**.", "Cuando esa persona también te sigue, el botón dice **Amigos**.", "Bajá hasta **Tu perfil** y elegí **Amigos** en ¿Quién ve tu portfolio?. Confirmá con **Compartir**.", "Tus amigos ven en tu perfil qué tenés y cómo te va, en porcentajes. Nunca los montos.")
H2("7.9 Pedir y aprobar una cuenta verificada")
ol("El usuario abre **Editar perfil → Verificado**, hace clic en **Pedir**, completa los datos y hace clic en **Enviar pedido**.", "El administrador abre **Panel admin**, revisa el enlace y el motivo, y hace clic en **Aprobar**.", "Al usuario le llega la notificación \"Tu cuenta está verificada\" y aparece la insignia azul al lado de su nombre.")
H2("7.10 Simular una inversión")
ol("Hacé clic en **Más → Simulador**.", "Elegí **BTC-USD**, escribí 1000 y hacé clic en **5 años**.", "Leé cuánto tendrías hoy y compará con **S&P 500** o con **Dólares**.", "Hacé clic en **Copiar link** para compartirlo.")
H2("7.11 Cambiar el tema y la moneda")
p("En la página de inicio y en las ventanas Entrar y Crear una cuenta, el botón de tema es el de la luna o el sol, arriba. Con la sesión iniciada, el tema y la moneda están en el menú de la cuenta.")
ol("Hacé clic en tu nombre, arriba a la derecha.", "En **Tema** (2), hacé clic en la **luna**. Toda la aplicación pasa a fondo oscuro. El **sol** vuelve al modo claro.", "En **Ver precios en** (1), hacé clic en **AR$**. Todos los precios y tu portfolio pasan a pesos, al dólar MEP.")
fig("pesos-menu-a", "Menú de la cuenta: moneda (1) y tema (2).", 400)
fig("oscuro-portfolio", "Portfolio en modo oscuro.", 400)
fig("oscuro-activo", "Página de un activo en modo oscuro: el gráfico también cambia de colores.", 400)
fig("landing-oscuro", "Página de inicio en modo oscuro.", 400)
fig("pesos-inicio", "Inicio con los precios en pesos.", 400)
nota("El tema queda guardado en el navegador. La moneda queda guardada en tu cuenta.")
H2("7.12 Exportar mis operaciones a Excel")
ol("Abrí **Portfolio** y bajá hasta **Operaciones**.", "Si querés, elegí **Compras** o **Ventas**, o filtrá por ticker. Se exporta solo lo que se ve.", "Hacé clic en **Exportar**. Se descarga un archivo CSV que se abre con Excel o Google Sheets.")

H1("8. Problemas frecuentes", "8")
tabla(["Problema", "Causa probable", "Solución"], [
 ["Windows dice \"Windows protegió su PC\".", "El archivo no está firmado.", "Hacé clic en **Más información** y en **Ejecutar de todas formas**."],
 ["El Mac no deja abrir Valeur.", "El archivo no está firmado.", "Clic derecho → **Abrir**. Si no, **Ajustes del Sistema → Privacidad y seguridad → Abrir igualmente**."],
 ["El navegador no se abre solo.", "Tardó en arrancar o el navegador estaba cerrado.", "Esperá unos segundos y escribí la dirección que muestra la ventana negra."],
 ["Cerré la ventana negra y dejó de andar.", "Esa ventana es Valeur: al cerrarla se apaga.", "Volvé a abrir el archivo."],
 ["Aparece \"Email o contraseña incorrectos\".", "Los datos no coinciden con ninguna cuenta.", "Revisá mayúsculas y espacios. Si no te acordás, hacé clic en **¿La olvidaste?**."],
 ["Aparece \"Confirmá tu email antes de ingresar\".", "La cuenta se creó pero falta abrir el enlace.", "Buscá el email de confirmación (también en spam) y abrí el enlace."],
 ["Aparece \"No se pudo conectar con Supabase\".", "No hay conexión a internet o el servicio de cuentas no responde.", "Revisá la conexión y volvé a intentar."],
 ["Aparece \"Demasiados intentos, probá en un rato\".", "Hubo muchos pedidos seguidos.", "Esperá unos minutos."],
 ["Aparece \"Las contraseñas no coinciden\".", "Escribiste distinto en los dos campos.", "Borrá los dos y escribí la misma contraseña."],
 ["Aparece \"Esa contraseña es muy común\".", "Es una de las más usadas.", "Elegí otra: mezclá letras, números y algún símbolo."],
 ["Aparece \"Ese nombre de usuario ya está en uso\".", "Otra persona ya lo eligió.", "Probá con otro nombre de usuario."],
 ["Aparece \"El enlace ya no sirve\".", "El enlace de recuperación venció o ya se usó.", "Hacé clic en **Pedir otro enlace**."],
 ["Aparece \"No pudimos traer los precios del mercado\".", "El servidor de precios no responde o no hay conexión.", "Hacé clic en **Reintentar**. Verificá que Valeur siga abierto (la ventana negra)."],
 ["Aparece \"No encontramos…\" al abrir un activo.", "El ticker está mal escrito o no existe en Yahoo Finance.", "Buscalo por nombre. Los CEDEARs llevan .BA (por ejemplo, MELI.BA)."],
 ["El gráfico queda vacío.", "No hay datos para ese intervalo o falló la conexión.", "Hacé clic en **Recargar** o probá con el intervalo **1D**."],
 ["Un precio aparece como \"—\" o \"sin datos\".", "Yahoo Finance no lo informó en ese momento.", "Hacé clic en **Actualizar precios** o probá más tarde."],
 ["Aparece \"Solo tenés … para vender\".", "Querés vender más de lo que tenés cargado.", "Revisá la cantidad o cargá antes la compra que falta."],
 ["No puedo borrar una compra.", "Hay una venta posterior que la necesita.", "Borrá primero esa venta."],
 ["El valor de mi portfolio no coincide con mi broker.", "Precios con demora, o falta alguna operación, o la moneda es otra.", "Revisá Operaciones y la moneda elegida en el menú de la cuenta."],
 ["Una alerta no me avisó.", "Valeur estaba cerrado, o la alerta ya había avisado.", "Dejá Valeur abierto. Mirá **Ya avisaron** y hacé clic en **Reactivar**."],
 ["No veo el portfolio de alguien.", "Es privado, o es solo para amigos y no se siguen mutuamente.", "Seguilo y esperá a que te siga."],
 ["El Calendario está vacío.", "No tenés ni seguís empresas, o no hay eventos en 4 meses.", "Seguí empresas en el Mercado."],
 ["Escribo /dashboard y me manda a Entrar.", "No tenés la sesión iniciada en este navegador.", "Iniciá sesión."],
 ["No veo el Panel admin.", "Tu cuenta no tiene permiso de administración.", "Es lo esperado: solo lo ve el administrador."],
 ["Desapareció la cinta de cotizaciones.", "Se apagó desde el menú de la cuenta.", "Menú de la cuenta → **Cinta de cotizaciones**."],
], [32, 32, 36], 8.5)
fig("login-sinred-a", "Mensaje \"No se pudo conectar con Supabase\" (1): no hay conexión con el servicio de cuentas.", 400)

H1("9. Preguntas frecuentes (FAQ)", "9")
for q, a in [
 ("¿Necesito saber de inversiones para usar Valeur?", "No. Valeur está pensado para quien nunca invirtió. Aprendé (4.7) y el glosario (sección 10) explican los términos que aparecen en pantalla."),
 ("¿Cuánto cuesta?", "Nada. Valeur es gratis: sin planes pagos ni tarjeta."),
 ("¿Puedo comprar o vender acciones desde Valeur?", "No. Valeur no es un broker. Operás donde ya operás y acá registrás lo que hiciste."),
 ("¿Los precios son en tiempo real?", "Se actualizan solos cada minuto con datos de Yahoo Finance, con la demora habitual de cada mercado."),
 ("¿Qué es el dólar MEP y por qué lo usa Valeur?", "Es el dólar que sale de comprar y vender un activo en las dos monedas. Valeur lo usa para pasar todo a US$ o a AR$. Cada operación se convierte con el MEP de su día."),
 ("¿Qué activos puedo buscar?", "Cualquiera que exista en Yahoo Finance: CEDEARs y acciones argentinas (con .BA), acciones de EE.UU., cripto, monedas, índices y ETFs."),
 ("¿Necesito una cuenta para ver gráficos?", "No. El Mercado y Aprendé son públicos. La cuenta hace falta para el resto."),
 ("¿Quién ve mi portfolio?", "Nadie, salvo que vos lo elijas. Podés compartirlo con tus amigos o con todos, y aun así nunca se ven montos."),
 ("¿Qué diferencia hay entre seguir a alguien y ser amigos?", "Seguir es de un solo lado. Son amigos cuando se siguen mutuamente."),
 ("¿Cómo consigo la insignia de verificado?", "Pedila en Editar perfil → Verificado. La aprueba un administrador."),
 ("¿Las recomendaciones son consejos financieros?", "No. Son opiniones de los usuarios. Valeur muestra cómo le fue a cada una para que saques tus conclusiones."),
 ("¿Me avisa una alerta con Valeur cerrado?", "Con el ejecutable, no: se revisan mientras Valeur está abierto en alguna ventana. Si el servidor funciona con su configuración completa, también las revisa él y el aviso te espera en la campana."),
 ("¿Cómo cambio mi contraseña?", "Menú de la cuenta → **Contraseña y seguridad**. Si no te la acordás, con **¿La olvidaste?** en la ventana Entrar."),
 ("¿Cómo cambio mi email o mi nombre de usuario?", "Por ahora no se puede desde la aplicación. Sí podés cambiar tu nombre visible en Editar perfil."),
 ("¿Se guarda mi sesión?", "Sí, en el navegador que usaste. Para salir hacé clic en **Cerrar sesión**."),
 ("¿Puedo instalar Valeur como una aplicación?", "Sí, con el ejecutable abierto: en Chrome o Edge, usá el ícono de instalar de la barra de direcciones. Se abre en su propia ventana, pero el ejecutable tiene que seguir abierto."),
 ("¿Qué significan las velas verdes y rojas?", "Verde: el precio cerró más alto que abrió en ese período. Roja: cerró más bajo. Ver \"vela japonesa\" en el glosario."),
]: h3(q); p(a)

H1("10. Glosario", "10", big=True)
tabla(["Término", "Qué significa"], [
 ["Acción", "Una parte pequeña de una empresa. Quien tiene acciones es dueño de una porción de esa empresa."],
 ["Aciertos", "Recomendaciones de comprar o vender que fueron para el lado que dijo la persona."],
 ["Activo", "Algo que se puede comprar y vender en el mercado: acciones, CEDEARs, cripto, monedas o ETFs."],
 ["Administrador", "Usuario con permiso para revisar verificados y reportes."],
 ["Alerta", "Aviso automático que se dispara cuando un activo cumple una condición que definiste."],
 ["Amigos", "Dos personas que se siguen mutuamente en Valeur."],
 ["Apertura / Máximo / Mínimo / Cierre", "Los cuatro precios de una vela: al empezar el período, el más alto, el más bajo y al terminar."],
 ["Broker (ALyC)", "La empresa por la que se compran y venden activos. Valeur no es un broker."],
 ["BYMA", "La bolsa de Buenos Aires. Abre de lunes a viernes de 11 a 17 h."],
 ["CEDEAR", "Una acción de afuera que se compra en pesos en Argentina. Su ticker termina en .BA."],
 ["Cierre anterior", "Precio al que terminó de operar el activo el día anterior."],
 ["Composición", "Qué porcentaje del portfolio representa cada activo."],
 ["Corte del dividendo", "Día hasta el que hay que tener la acción para cobrar el dividendo."],
 ["Cotización", "Precio actual de un activo."],
 ["Criptomoneda", "Dinero digital que no emite ningún banco central, como Bitcoin o Ethereum."],
 ["Cuenta verificada", "Cuenta con insignia azul, aprobada por el administrador."],
 ["Dirección (URL)", "Texto que se escribe en la barra del navegador para abrir una página."],
 ["Dividendo", "Parte de la ganancia que una empresa reparte entre sus accionistas."],
 ["Dólar MEP", "El dólar que sale de comprar y vender un activo en pesos y en dólares. Valeur lo usa para convertir."],
 ["Ejecutable", "Archivo que abre Valeur sin instalar nada más."],
 ["ETF", "Fondo que cotiza como una acción y agrupa muchos activos."],
 ["Histórico", "Todos los precios pasados de un activo."],
 ["Índice", "Número que resume cómo le va a un grupo de empresas (S&P 500, Merval)."],
 ["Intervalo", "Cuánto tiempo representa cada vela: 30 minutos, una hora, un día, una semana o un mes."],
 ["Invertido", "Lo que pusiste en lo que hoy tenés."],
 ["Me sirve", "Marca que le ponés a una recomendación que te resultó útil."],
 ["Modo claro / oscuro", "Aspecto de la aplicación con fondo claro o con fondo oscuro."],
 ["Notificación", "Aviso que llega a la campana."],
 ["NYSE", "La bolsa de Nueva York."],
 ["Operación", "Una compra o una venta cargada en Valeur."],
 ["Página de inicio", "Primera pantalla de Valeur para quien no inició sesión."],
 ["Portfolio", "Conjunto de activos que tiene una persona."],
 ["Posición", "Cada activo dentro del portfolio, con su cantidad."],
 ["Postura", "Lo que alguien haría con un activo: comprar, mantener o vender."],
 ["Precio promedio", "Lo que costó, en promedio, cada unidad que tenés."],
 ["Rango", "Cuánto histórico se muestra en el gráfico."],
 ["Recomendación", "Opinión publicada en la Comunidad sobre un activo."],
 ["Rendimiento", "Cuánto se ganó o se perdió en relación con lo que se puso, en porcentaje."],
 ["Reporte", "Aviso al administrador sobre una recomendación inadecuada."],
 ["Resultados (balance)", "Cuando la empresa cuenta cuánto vendió y cuánto ganó, en general cada tres meses."],
 ["Rubro", "Sector de una empresa: tecnología, energía, finanzas y otros."],
 ["Seguidos", "Activos que mirás sin necesidad de tenerlos."],
 ["Sesión", "Período en el que estás identificado con tu cuenta. Empieza al entrar y termina al cerrar sesión."],
 ["Supabase", "Servicio de internet donde se guardan las cuentas y los datos de Valeur."],
 ["Ticker", "Código corto que identifica a un activo. Ejemplos: AAPL, MELI.BA, BTC-USD."],
 ["Variación del día", "Cuánto subió o bajó el precio respecto del cierre anterior. Verde si sube, rojo si baja."],
 ["Vela japonesa", "Forma de dibujar el precio en un período: el cuerpo va de la apertura al cierre y las mechas marcan el máximo y el mínimo."],
 ["Volumen", "Cantidad de unidades que se operaron en el período."],
 ["Yahoo Finance", "Servicio de internet del que Valeur obtiene precios, gráficos y fechas."],
], [32, 68], 8.5)

H1("Anexo A — Checklist de ventanas", "AnexoA", big=True)
I = "Implementada"
rows = [("Página de inicio","/","Todos","4.1"),("Entrar","/login","Visitante","4.2"),("Crear una cuenta","/register","Visitante","4.3"),("Recuperar la contraseña","/recuperar","Visitante, Registrado","4.4"),("Contraseña nueva","/nueva-clave","Visitante, Registrado","4.4"),("Mercado","/tickersearch","Todos","4.5 y 5.5"),("Un activo","/tickersearch ?symbol=","Todos","4.6 y 5.6"),("Aprendé","/aprende","Todos","4.7"),("Página no encontrada","otras","Todos","4.8"),("Barra, cajón Más y cuenta","todas","Registrado","5.1"),("Buscador general","todas","Todos","5.1"),("Inicio","/home","Registrado","5.2"),("Portfolio","/dashboard","Registrado","5.3"),("Formulario Registrar operación","/dashboard","Registrado","5.4"),("Alertas","/tickersearch #alertas","Registrado","5.7"),("Notificaciones","todas","Registrado","5.8"),("Comunidad","/comunidad","Registrado","5.9"),("Formulario Recomendar","/comunidad","Registrado","5.10"),("Perfil","/u/usuario","Registrado","5.11"),("Editar perfil","/u/usuario","Registrado","5.12"),("Calendario","/calendario","Registrado","5.13"),("Simulador","/simulador","Registrado","5.14"),("Cerrar sesión","todas","Registrado","5.15"),("Panel admin","/admin","Administrador","6.1")]
tabla(["#","Ventana","Dirección","Rol","Estado","Sección","Captura"], [[str(i+1),a,b,c,I,d,"✔"] for i,(a,b,c,d) in enumerate(rows)], [5,24,17,18,17,10,9], 8.5, 482)
p("Todas las ventanas de Valeur, con su estado en esta versión y la sección del manual donde se explican. \"Registrado\" incluye al administrador.")
p("Estados de pantalla documentados: carga, vacío (cuenta nueva), error (mensaje en rojo con **Reintentar**), sin sesión (lleva a Entrar), modo claro y modo oscuro, y vista de celular.")
H1("Anexo B — Historial de versiones", "AnexoB", big=True)
tabla(["Versión","Fecha","Autor/es","Cambios"], [["1.0","16/09/2026","Aguilar, Borassi, Seralvo","Primera versión del manual para el TP3. Cubre las 5 ventanas del MVP, la sección Explorar mercado, Cerrar sesión y los bocetos de Mi portfolio y Mis alertas."],
 ["2.0","24/11/2026","Aguilar, Borassi, Seralvo","Manual nuevo para la entrega final. Cubre todas las ventanas de la aplicación: portfolio real, mercado, alertas, notificaciones, comunidad, perfiles, calendario, simulador, Aprendé, recuperación de contraseña y panel de administración. Se suman el ejecutable, los flujos nuevos, el rol Administrador y todas las capturas."]], [12,16,25,47], 8.5)
