import { launch } from "./cdp.mjs"; const P = await launch();
const tryit = async (n, f) => { try { await f(); } catch (e) { console.log("ERR", n, e.message); } };
await P.login(null);
// mercado visitante
await P.go("/tickersearch", 7000);
await tryit("mercado-v", async () => { await P.shot("mercado-visitante-a", [[1,".vx-nav",{at:"bl"}],[2,".vx-search",{at:"bl"}],[3,".vx-right .btn-pink",{at:"br"}],[4,".page-head .hpills",{at:"l"}],[5,".mkt-searchbar .search-form",{at:"l"}],[6,".recents",{at:"r"}],[7,".sort-seg",{at:"t"}],[8,".s-tools .icon-btn",{at:"r"}]]);
 await P.scrollTo("#explorar", 100); await P.sleep(800); await P.shot("mercado-lista-a", [[1,".mkt-tabs",{at:"l"}],[2,".chips.scroll",{at:"l"}],[3,".list-filters .search-form",{at:"l"}],[4,".sort-seg",{at:"t"}],[5,".asset-row",{at:"l"}]]);
 await P.click(".mkt-tabs button|Cripto", 4500); await P.shot("mercado-cripto"); await P.scrollTo(".mkt-searchbar", 260); await P.type(".mkt-searchbar input", "MERCADO", 2500); await P.shot("mercado-sugerencias-a", [[1,".mkt-searchbar input",{at:"l"}],[2,".suggest",{at:"l"}]]); });
// activo visitante
await P.go("/tickersearch?symbol=AAPL.BA", 6500);
await tryit("activo-v", async () => { await P.shot("activo-visitante-a", [[1,".ad-kicker button",{at:"tl"}],[2,".ad-title",{at:"l"}],[3,".ad-head .hpills",{at:"l"}],[4,".ad-price",{at:"l"}],[5,".ad-trade",{at:"b"}],[6,".chart-controls > .vx-tabs",{at:"l"}],[7,".chart-controls .right .vx-tabs",{at:"l"}],[8,".chart-reload",{at:"r"}]]);
 await P.scrollTo(".chart-card", 95); const b = await P.ev(()=>{const r=document.querySelector(".chart-wrap").getBoundingClientRect();return [r.x+r.width*0.62,r.y+r.height*0.45]}); await P.hover(b[0],b[1],700); await P.hover(b[0]+2,b[1],700);
 await P.shot("activo-vela-a", [[1,".chart-wrap",{at:"l",pad:0}],[2,".ohlc",{at:"l",pad:-2}],[3,".stats",{at:"l",pad:-2}]]); });
await tryit("intradia", async () => { await P.click(".chart-controls button|1H", 4000); await P.shot("activo-hora"); });
await P.go("/tickersearch?symbol=ZZZZZZ", 5000); await P.shot("activo-noexiste");
await P.ev(()=>fetch("/__market?down=1")); await P.go("/tickersearch?symbol=NVDA", 5000); await tryit("sinserv", async()=>{ await P.scrollTo(".chart-card", 150); await P.shot("activo-sinservidor-a", [[1,".overlay .btn",{at:"r"}]]); }); await P.ev(()=>fetch("/__market?down=0"));
// aprendé
await P.go("/aprende", 2500); await P.shot("aprende-a", [[1,".page-head .hpills",{at:"l"}],[2,".lr-search",{at:"l"}],[3,".lr-prog",{at:"l"}],[4,".lr-prog-acts .btn",{at:"t"}],[5,".lr-flip",{at:"tl"}]]);
await tryit("aprende2", async () => { await P.click("#accion", 900); await P.click("#cripto", 900); await P.scrollTo("#basico", 100); await P.shot("aprende-vuelta-a", [[1,"#accion",{at:"tl"}],[2,"#portfolio",{at:"tr"}]]); await P.ev(()=>scrollTo(0,0)); await P.type(".lr-search input","dólar",900); await P.shot("aprende-buscar"); });
await P.go("/cualquier-cosa", 2500); await P.shot("e404-a", [[1,".e404-acts .btn-pink",{at:"b"}],[2,".e404-acts .btn:nth-child(2)",{at:"b"}],[3,".e404-acts .btn:nth-child(3)",{at:"b"}]]);
// registrado: barra
await P.login("manual@valeur.test"); await P.go("/home", 7000);
await tryit("barra", async () => { await P.shot("barra-a", [[1,".tape",{at:"br"}],[2,".vx-bar .brand",{at:"bl"}],[3,".vx-nav",{at:"bl"}],[4,".vx-more",{at:"b"}],[5,".vx-search",{at:"bl"}],[6,".bell",{at:"b"}],[7,".vx-me",{at:"br"}]], {x:0,y:0,width:1280,height:330});
 await P.click(".vx-more", 900); await P.shot("barra-mas-a", [[1,".vx-dr-grid",{at:"tl",pad:2}],[2,".dr-tools-row",{at:"bl"}]]); await P.key("Escape","Escape",27);
 await P.click(".vx-me", 900); await P.shot("barra-cuenta-a", [[1,".mp-who",{at:"l"}],[2,[".mp-list a:first-child",".mp-list a:nth-of-type(6)"],{at:"l"}],[3,".mp-switch",{at:"l"}],[4,".mp-cur",{at:"l"}],[5,".mp-cur ~ .mp-cur",{at:"l"}],[6,".mp-out",{at:"l"}]]);
 await P.shot("cerrar-sesion-a", [[1,".mp-out",{at:"l"}]]); await P.key("Escape","Escape",27);
 await P.click(".vx-search", 2600); await P.shot("buscador"); await P.type(".cmdk-in input","ap",2200); await P.shot("buscador-a", [[1,".cmdk-in",{at:"l"}],[2,".cmdk-group:nth-child(1)",{at:"l"}],[3,".cmdk-group:nth-child(2)",{at:"l"}],[4,".cmdk-foot",{at:"l"}]]); await P.key("Escape","Escape",27);
 await P.click(".bell", 900); await P.shot("notif-a", [[1,".bell",{at:"b"}],[2,".nf-tabs",{at:"l"}],[3,".nf-head-acts .lnk-btn",{at:"t"}],[4,".nf-li",{at:"l"}],[5,".nf-group h4",{at:"l"}]]); 
 await tryit("notif-ed", async()=>{ await P.hoverEl(".nf-li:has(.nf-lead.alert)"); await P.click(".nf-li:has(.nf-lead.alert) .nf-acts button", 900); await P.shot("notif-editar"); }); });
// inicio
await P.go("/home", 6000);
await tryit("home", async () => { await P.shot("inicio-a", [[1,".home-hero .kicker",{at:"l"}],[2,".home-hero h1",{at:"l"}],[3,".home-hero .hpills",{at:"l"}],[4,"#resumen .btn-pink",{at:"t"}],[5,"#resumen .card, #resumen .pfx",{at:"l"}]]);
 await P.scrollTo("#movimientos",100); await P.shot("inicio-mov-a", [[1,".mvx-col.up",{at:"l"}],[2,".mvx-col.down",{at:"r"}],[3,"#vx-sub-slot .vx-sub",{at:"r"}]]);
 await P.scrollTo("#alertas",100); await P.hoverEl("#alertas .nrx-list li"); await P.shot("inicio-alertas");
 await P.scrollTo("#seguidos",150); await P.hoverEl(".wlt-tile"); await P.shot("inicio-seg-a", [[1,".wlt-tile",{at:"l"}],[2,".wlt-x",{at:"tr"}],[3,"#seguidos .s-tools .btn",{at:"t"}]]);
 await P.click(".wlt-tile .wlt-x", 600); await P.shot("inicio-seg-confirma"); });
await P.login("nuevo@valeur.test"); await P.go("/home", 5000); await P.shot("inicio-nuevo-a", [[1,".onboard-prog",{at:"t"}],[2,".onboard-steps li:nth-child(1)",{at:"l"}],[3,".onboard-steps li:nth-child(2)",{at:"l"}],[4,".onboard-steps li:nth-child(3)",{at:"l"}]]);
await P.go("/dashboard", 4000); await P.shot("portfolio-vacio"); await P.scrollTo(".pfd-ghost",120); await P.shot("portfolio-vacio2");
await P.vp(390,844,true); await P.login("manual@valeur.test"); await P.go("/home", 5500); await P.shot("inicio-movil"); await P.go("/tickersearch?symbol=AAPL.BA", 5500); await P.shot("activo-movil"); await P.go("/dashboard", 5500); await P.shot("portfolio-movil");
P.close(); process.exit(0);
