import { launch } from "./cdp.mjs"; const P = await launch();
await P.login(null); await P.go("/", 4000);
await P.shot("landing-hero");
await P.shot("landing-hero-a", [[1,".tape",{at:"br"}],[2,".lx-nav .brand",{at:"bl"}],[3,[".lx-links a[href='#producto']",".lx-links a[href='#preguntas']"],{at:"bl"}],[4,[".lx-links a[href='/tickersearch']",".lx-links a[href='/aprende']"],{at:"br"}],[5,".lx-theme",{at:"bl"}],[6,".lx-in",{at:"b"}],[7,".lx-up",{at:"br"}],[8,".lx-hero .btn-pink",{at:"bl"}],[9,".lx-hero .btn-line",{at:"br"}],[10,".lx-proof",{at:"bl"}],[11,".lx-open",{at:"tl",pad:3}],[12,".lx-show",{at:"tr"}]]);
for (const [id, n] of [["#portfolio","portfolio"],["#mercado","mercado"],["#alertas","alertas"],["#comunidad","comunidad"]]) { await P.scrollTo(id, 130); await P.sleep(900); await P.shot("landing-"+n); }
await P.scrollTo("#producto", 60); await P.sleep(900); await P.shot("landing-producto");
await P.scrollTo("#como", 70); await P.sleep(900); await P.shot("landing-como");
await P.scrollTo("#privacidad", 70); await P.sleep(900); await P.shot("landing-privacidad");
await P.scrollTo("#gratis", 70); await P.sleep(900); await P.shot("landing-gratis");
await P.scrollTo("#preguntas", 70); await P.click("details:nth-of-type(2) summary", 900); await P.shot("landing-faq-a", [[1,".lx-faq details:nth-of-type(3)",{at:"l"}]]);
await P.scrollTo(".vx-foot", 420); await P.shot("landing-pie");
await P.go("/", 2500); await P.click(".lx-theme", 1200); await P.shot("landing-oscuro"); await P.click(".lx-theme");
await P.vp(390, 844, true); await P.go("/", 3000); await P.shot("landing-movil"); await P.click(".lx-burger", 900); await P.shot("landing-movil-menu"); await P.vp();
// entrar
await P.go("/login", 2500); await P.ev(()=>document.activeElement.blur());
await P.shot("login-a", [[1,".auth-top .brand",{at:"r"}],[2,".auth-top .icon-btn",{at:"l"}],[3,"#email",{at:"l"}],[4,"[name=password]",{at:"l"}],[5,".eye",{at:"r"}],[6,".field .link-btn",{at:"r"}],[7,".auth-form .btn-pink",{at:"l"}],[8,".auth-alt a",{at:"r"}],[9,".auth-show",{at:"tl",pad:-8}]]);
await P.type("#email","manual@valeur.test"); await P.type("[name=password]","Manual2026"); await P.ev(()=>document.activeElement.blur()); await P.shot("login-completo");
await P.type("[name=password]","incorrecta1"); await P.click(".auth-form .btn-pink", 1500); await P.shot("login-error-a", [[1,".form-err",{at:"l"}]]);
await P.ev(()=>fetch("/__auth?down=1")); await P.type("[name=password]","Manual2026"); await P.click(".auth-form .btn-pink", 3500); await P.shot("login-sinred-a", [[1,".form-err",{at:"l"}]]); await P.ev(()=>fetch("/__auth?down=0"));
// registro
await P.go("/register", 2500); await P.ev(()=>document.activeElement.blur());
await P.shot("registro-a", [[1,".auth-top .brand",{at:"r"}],[2,"#username",{at:"l"}],[3,"#email",{at:"l"}],[4,"[name=password]",{at:"l"}],[5,"[name=confirm]",{at:"r"}],[6,".pw-rules",{at:"l"}],[7,".auth-form .btn-pink",{at:"l"}],[8,".auth-alt a",{at:"r"}],[9,".auth-top .icon-btn",{at:"l"}]]);
await P.type("#username","tunombre"); await P.type("#email","tu@email.com"); await P.type("[name=password]","Inversor2026!"); await P.type("[name=confirm]","Inversor2026!"); await P.ev(()=>document.activeElement.blur()); await P.shot("registro-completo-a", [[1,".pw-meter",{at:"l"}],[2,".pw-rules ul",{at:"l"}]]);
await P.type("[name=confirm]","Inversor2025!"); await P.click(".auth-form .btn-pink", 900); await P.shot("registro-error-a", [[1,".form-err",{at:"l"}]]);
await P.type("#username","tunombre2"); await P.type("#email","confirmar@email.com"); await P.type("[name=confirm]","Inversor2026!"); await P.click(".auth-form .btn-pink", 1800); await P.shot("registro-mail");
// recuperar
await P.go("/recuperar", 2000); await P.ev(()=>document.activeElement.blur()); await P.shot("recuperar-a", [[1,".rs-list",{at:"tl",pad:8}],[2,"#email",{at:"l"}],[3,".auth-form .btn-pink",{at:"l"}],[4,".auth-alt a",{at:"r"}]]);
await P.type("#email","manual@valeur.test"); await P.click(".auth-form .btn-pink", 1500); await P.shot("recuperar-2");
await P.go("/nueva-clave#error_code=otp_expired&error=access_denied", 1800); await P.shot("recuperar-vencido");
await P.login("manual@valeur.test"); await P.go("/nueva-clave", 2500); await P.type("[name=password]","Inversor2026!"); await P.type("[name=confirm]","Inversor2026!"); await P.ev(()=>document.activeElement.blur()); await P.shot("recuperar-3-a", [[1,"[name=password]",{at:"l"}],[2,"[name=confirm]",{at:"r"}],[3,".pw-rules",{at:"l"}],[4,".auth-form .btn-pink",{at:"l"}]]);
await P.click(".auth-form .btn-pink", 1500); await P.shot("recuperar-4");
P.close(); process.exit(0);
