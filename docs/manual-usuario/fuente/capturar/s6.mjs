import { launch } from "./cdp.mjs"; const P = await launch(9382);
await P.login("manual@valeur.test"); await P.go("/home", 7000);
await P.click(".bell", 900); await P.shot("notif-a", [[1,".bell",{at:"b"}],[2,".nf-tabs",{at:"l"}],[3,".nf-head-acts .lnk-btn",{at:"t"}],[4,".nf-group h4",{at:"l",pad:2}],[5,".nf-li",{at:"l",pad:0}],[6,".nf-foot",{at:"l",pad:-2}]]);
await P.hoverEl(".nf-li:has(.nf-lead.alert)"); await P.click(".nf-li:has(.nf-lead.alert) .nf-acts button", 900); await P.shot("notif-editar");
await P.login("nuevo@valeur.test"); await P.go("/home", 4000); await P.click(".bell", 900); await P.shot("notif-vacio");
await P.vp(390,844,true); await P.login("manual@valeur.test"); await P.go("/home",5000); await P.click(".vx-more-m",900); await P.shot("menu-movil"); P.close(); process.exit(0);
