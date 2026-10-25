/* ── Aprendé: los términos que aparecen en Valeur, explicados simple ──────
   [clave, término, en una línea, explicación, ejemplo, grupo] */
export const GROUPS = [
  ["basico", "Lo básico", "bi-book"],
  ["argentina", "Invertir desde Argentina", "bi-geo-alt"],
  ["medir", "Cómo se mide", "bi-rulers"],
  ["riesgo", "Riesgo y estrategia", "bi-shield-check"],
];

export const TERMS = [
  ["accion", "Acción", "Un pedacito de una empresa.", "Si comprás una acción de Apple, sos dueño de una parte (chiquitísima) de Apple. Si a la empresa le va bien y vale más, tu acción también.", "Comprar 1 acción de YPF a $46.800.", "basico"],
  ["portfolio", "Portfolio", "Todo lo que tenés invertido, junto.", "Es tu cartera: las acciones, CEDEARs, cripto o lo que sea que compraste. En Valeur lo ves en Portfolio, con cuánto vale hoy y cuánto ganaste.", "10 CEDEARs de Apple + 0,01 Bitcoin + 5 acciones de Galicia.", "basico"],
  ["cripto", "Criptomoneda", "Dinero digital que no emite ningún banco central.", "Bitcoin, Ethereum y otras. Se compran y venden las 24 horas, todos los días, y su precio se mueve mucho más que el de una acción.", "Bitcoin pasó de US$ 16.000 a más de US$ 100.000 en dos años.", "basico"],
  ["indice", "Índice", "Un número que resume cómo le va a un grupo de empresas.", "El S&P 500 sigue a las 500 empresas más grandes de EE.UU.; el Merval, a las principales de la bolsa argentina. Si el índice sube, en general al mercado le fue bien.", "\"El S&P 500 subió 1% hoy\".", "basico"],
  ["broker", "Broker (ALyC)", "La empresa por la que comprás y vendés.", "En Argentina se llaman ALyC (Agente de Liquidación y Compensación) y los controla la CNV. Valeur no es un broker: acá registrás lo que hiciste ahí para seguirlo.", "Balanz, IOL, Bull Market, Cocos.", "basico"],
  ["cedear", "CEDEAR", "Una acción de afuera que se compra en pesos en Argentina.", "Representa acciones de empresas extranjeras (Apple, Google, MercadoLibre) y cotiza en la bolsa argentina. Como su precio sigue a la acción en dólares, sirve también para cubrirse del dólar.", "AAPL.BA es el CEDEAR de Apple; AAPLD.BA es el mismo, pero en dólares.", "argentina"],
  ["mep", "Dólar MEP", "El dólar que sale de comprar y vender un bono o un CEDEAR.", "Comprás algo en pesos y lo vendés en dólares (o al revés), de forma legal y por tu broker. Valeur lo calcula con CEDEARs que cotizan en las dos monedas y lo usa para pasar todo a US$ o AR$.", "Si el MEP está a $1.557, US$ 100 son $155.700.", "argentina"],
  ["byma", "BYMA", "La bolsa de Buenos Aires.", "Es donde cotizan las acciones argentinas y los CEDEARs. Abre de lunes a viernes de 11 a 17 h (hora argentina). Cuando está cerrada, ves el último precio.", "GGAL.BA, YPFD.BA y MELI.BA cotizan en BYMA.", "argentina"],
  ["variacion", "Variación del día", "Cuánto subió o bajó algo desde el cierre de ayer.", "Se mide en %. Un +2% quiere decir que vale 2% más que al cierre anterior. Es lo que ves en verde o en rojo al lado de cada precio.", "Ayer cerró en $100 y hoy está en $103: +3%.", "medir"],
  ["rendimiento", "Rendimiento", "Cuánto ganaste (o perdiste) en relación a lo que pusiste.", "Se calcula como (lo que vale hoy − lo que pusiste) ÷ lo que pusiste. Sirve para comparar inversiones de distinto tamaño.", "Pusiste US$ 1.000 y hoy vale US$ 1.200: +20%.", "medir"],
  ["anual", "Rendimiento por año", "El rendimiento repartido parejo en cada año.", "Si algo creció mucho en 5 años, te dice cuánto equivale por año. Sirve para comparar con un plazo fijo o con la inflación.", "Duplicar la plata en 5 años es más o menos +15% por año.", "medir"],
  ["promedio", "Precio promedio", "Lo que te costó, en promedio, cada unidad que tenés.", "Si compraste en distintos momentos a distintos precios, el promedio pondera cuánto compraste en cada uno. Valeur lo usa para calcular tu ganancia.", "5 a $100 y 5 a $120: promedio $110.", "medir"],
  ["diversificar", "Diversificar", "No poner todos los huevos en la misma canasta.", "Repartir la plata entre distintas empresas, sectores, países o tipos de activo, así si a uno le va mal no se lleva todo.", "Tener tecnología, energía, un índice y algo de cripto.", "riesgo"],
  ["volatilidad", "Volatilidad", "Qué tanto se mueve un precio para arriba y para abajo.", "Más volátil quiere decir subidas y bajadas más grandes. No es ni bueno ni malo, pero hay que estar preparado para aguantar las caídas.", "Una cripto puede moverse 10% en un día; Coca-Cola, rara vez.", "riesgo"],
  ["largoplazo", "Largo plazo", "Invertir pensando en años, no en días.", "En el corto plazo los precios se mueven por cualquier cosa; en el largo, pesa más cómo le va a la empresa. Por eso el simulador te muestra el peor momento: aguantar es parte del resultado.", "Comprar todos los meses y no mirar el precio todos los días.", "riesgo"],
  ["promediar", "Comprar todos los meses", "Invertir lo mismo cada mes, sin importar el precio.", "Cuando está caro te llevás menos y cuando está barato, más. Así no hace falta adivinar el mejor momento para entrar. Probalo en el simulador con \"Todos los meses\".", "US$ 100 por mes en el S&P 500 durante 10 años.", "riesgo"],
  ["postura", "Comprar, mantener, vender", "Lo que alguien haría con un activo.", "En las recomendaciones de la comunidad: comprar es que lo ve barato o con futuro, mantener es que si lo tenés no lo vendas pero tampoco sumes, y vender es que ve más riesgo que ganancia.", "\"NVDA: comprar. El crecimiento la banca.\"", "riesgo"],
  ["alerta", "Alerta de precio", "Un aviso cuando un precio llega adonde querés.", "En vez de mirar el precio todo el día, le decís a Valeur \"avisame si MELI llega a $26.000\" o \"si cae más de 4% hoy\" y te llega la notificación.", "Avisame si Bitcoin baja a US$ 78.000.", "riesgo"],
];

// el ícono de cada término (Bootstrap Icons), para el frente de la tarjeta
const ICON = {
  accion: "bi-building",
  portfolio: "bi-briefcase",
  cripto: "bi-currency-bitcoin",
  indice: "bi-graph-up",
  broker: "bi-bank",
  cedear: "bi-globe-americas",
  mep: "bi-currency-exchange",
  byma: "bi-buildings",
  variacion: "bi-arrow-down-up",
  rendimiento: "bi-percent",
  anual: "bi-calendar3",
  promedio: "bi-calculator",
  diversificar: "bi-pie-chart",
  volatilidad: "bi-activity",
  largoplazo: "bi-hourglass-split",
  promediar: "bi-calendar-check",
  postura: "bi-signpost-split",
  alerta: "bi-bell",
};

export const TERM = Object.fromEntries(
  TERMS.map(([key, term, short, long, example, group]) => [key, { key, term, short, long, example, group, icon: ICON[key] || "bi-book" }]),
);

const norm = (s = "") =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

export const matchTerm = (t, q) => !q || norm([t.term, t.short, t.long].join(" ")).includes(norm(q));
