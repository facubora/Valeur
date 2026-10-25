import { useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const EASE = "expo.out";

/* para elementos que ya tienen transition de transform en el CSS (hover):
   se apaga mientras entra y al final se devuelve el control al CSS */
const handOff = (targets) => ({
  onStart: () => targets.forEach((t) => (t.style.transition = "none")),
  clearProps: "transition,transform",
});

/* Movimiento de la landing con GSAP: el hero entra en cascada, cada sección
   entra cuando aparece (títulos que se destapan, maquetas que suben y se
   enderezan, el aviso que cae en las alertas, la línea de los pasos que se
   dibuja) y los botones principales se acercan un poco al mouse. Con
   "reducir movimiento" no se anima nada. */
export function useLandingMotion(rootRef) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const q = (sel, el = root) => gsap.utils.toArray(el.querySelectorAll(sel));
      const enter = (trigger, start = "top 85%") => ({ trigger, start, once: true });

      // hero: kicker, título, bajada, botones y pastillas, uno atrás de otro
      const copy = root.querySelector(".lx-hero-copy");
      if (copy) gsap.from(copy.children, { y: 26, opacity: 0, duration: 1.1, ease: EASE, stagger: 0.08, delay: 0.05 });
      const show = root.querySelector(".lx-show");
      if (show) {
        gsap.from(show, { scale: 0.96, opacity: 0, duration: 1.2, ease: EASE, delay: 0.1 });
        // al bajar, el adelanto se queda un poco atrás
        gsap.to(show, { yPercent: 8, ease: "none", scrollTrigger: { trigger: ".lx-hero", start: "top top", end: "bottom top", scrub: 0.6 } });
      }

      // títulos de sección: se destapan de abajo hacia arriba; la bajada llega atrás
      q(".lx-head").forEach((head) => {
        const tl = gsap.timeline({ scrollTrigger: enter(head) });
        const [kicker, h2, ...rest] = head.children;
        tl.from(kicker, { y: 12, opacity: 0, duration: 0.7, ease: EASE })
          .from(h2, { yPercent: 40, opacity: 0, clipPath: "inset(0 0 100% 0)", duration: 1.1, ease: EASE }, 0.05)
          .from(rest, { y: 18, opacity: 0, duration: 0.9, ease: EASE }, 0.2);
      });

      // producto: el texto entra de costado y la maqueta sube enderezándose
      q(".lx-feat").forEach((feat) => {
        const flip = feat.classList.contains("flip");
        const tl = gsap.timeline({ scrollTrigger: enter(feat, "top 78%") });
        tl.from(feat.querySelector(".lx-feat-copy"), { x: flip ? 40 : -40, opacity: 0, duration: 1.1, ease: EASE })
          .from(q(".lx-feat-copy li", feat), { x: flip ? 16 : -16, opacity: 0, duration: 0.7, ease: EASE, stagger: 0.07 }, 0.25)
          .from(feat.querySelector(".lx-feat-mock"), { y: 70, rotation: flip ? -2.5 : 2.5, opacity: 0, duration: 1.3, ease: EASE }, 0.05);
        const hint = feat.querySelector(".lx-hint");
        if (hint) tl.from(hint, { scale: 0.6, opacity: 0, duration: 0.7, ease: "back.out(2.2)" }, 0.9);
        // y mientras pasa, la maqueta se mueve apenas más lento que la página
        gsap.fromTo(feat.querySelector(".lx-feat-mock"), { yPercent: 6 }, { yPercent: -6, ease: "none", scrollTrigger: { trigger: feat, start: "top bottom", end: "bottom top", scrub: true } });
      });

      // alertas: las barritas se llenan y después cae el aviso
      const al = root.querySelector(".lx-al-wrap");
      if (al) {
        const tl = gsap.timeline({ scrollTrigger: enter(al, "top 75%") });
        tl.from(q(".lx-bar i", al), { width: 0, duration: 1.4, ease: EASE, stagger: 0.12 }, 0.4).from(al.querySelector(".lx-toast"), { y: -30, scale: 0.9, opacity: 0, duration: 0.9, ease: "back.out(1.8)" }, 1.4);
      }

      // portfolio: la barra de composición se arma
      const alloc = root.querySelector(".lx-alloc");
      if (alloc) gsap.from(alloc.children, { scaleX: 0, transformOrigin: "left center", duration: 1, ease: EASE, stagger: 0.1, scrollTrigger: enter(alloc, "top 80%") });

      // pasos: la línea se dibuja con el scroll y las tarjetas caen en cascada
      const steps = root.querySelector(".lx-steps");
      if (steps) {
        gsap.from(steps.querySelector(".lx-steps-line"), { scaleX: 0, ease: "none", scrollTrigger: { trigger: steps, start: "top 80%", end: "bottom 60%", scrub: 0.6 } });
        gsap.from(q(".lx-step", steps), { y: 60, opacity: 0, rotationX: -18, transformOrigin: "50% 0%", duration: 1.1, ease: EASE, stagger: 0.14, scrollTrigger: enter(steps) });
        gsap.from(q(".lx-step-n", steps), { scale: 0.4, rotation: -20, duration: 0.9, ease: "back.out(2.4)", stagger: 0.14, delay: 0.2, scrollTrigger: enter(steps) });
      }

      // privacidad: las tres opciones suben
      const vis = q(".lx-vis-opt");
      if (vis.length) gsap.from(vis, { y: 40, opacity: 0, duration: 1, ease: EASE, stagger: 0.1, ...handOff(vis), scrollTrigger: enter(vis[0].parentElement) });

      // gratis: la tarjeta crece un poco al llegar y los puntos suben
      const free = root.querySelector(".lx-free");
      if (free) {
        gsap.fromTo(free, { scale: 0.94 }, { scale: 1, ease: "none", scrollTrigger: { trigger: free, start: "top bottom", end: "top 40%", scrub: 0.6 } });
        gsap.from(q(".lx-free-pt", free), { y: 36, opacity: 0, duration: 1, ease: EASE, stagger: 0.1, scrollTrigger: enter(free, "top 65%") });
      }

      // preguntas: en cascada
      const faq = q(".lx-faq details");
      if (faq.length) gsap.from(faq, { y: 24, opacity: 0, duration: 0.8, ease: EASE, stagger: 0.08, scrollTrigger: enter(faq[0].parentElement) });

      // cierre: la tarjeta tinta se abre desde el centro
      const close = root.querySelector(".lx-close");
      if (close) {
        gsap.fromTo(close, { clipPath: "inset(12% 8% 12% 8% round 28px)" }, { clipPath: "inset(0% 0% 0% 0% round 28px)", ease: "none", scrollTrigger: { trigger: close, start: "top bottom", end: "center 60%", scrub: 0.6 } });
        gsap.from(close.children, { y: 24, opacity: 0, duration: 0.9, ease: EASE, stagger: 0.08, scrollTrigger: enter(close, "top 70%") });
      }
    });

    // botones principales: se acercan apenas al puntero (solo con mouse)
    mm.add("(prefers-reduced-motion: no-preference) and (hover: hover)", () => {
      const off = [];
      root.querySelectorAll(".lx-cta").forEach((btn) => {
        const move = (e) => {
          const r = btn.getBoundingClientRect();
          gsap.to(btn, { x: (e.clientX - r.left - r.width / 2) * 0.18, y: (e.clientY - r.top - r.height / 2) * 0.3, duration: 0.5, ease: "power3.out" });
        };
        const leave = () => gsap.to(btn, { x: 0, y: 0, duration: 0.8, ease: "elastic.out(1, 0.45)" });
        btn.addEventListener("pointermove", move);
        btn.addEventListener("pointerleave", leave);
        off.push(() => {
          btn.removeEventListener("pointermove", move);
          btn.removeEventListener("pointerleave", leave);
        });
      });
      return () => off.forEach((f) => f());
    });

    return () => mm.revert();
  }, [rootRef]);
}
