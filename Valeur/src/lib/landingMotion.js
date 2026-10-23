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

/* Movimiento de la landing con GSAP: el hero se aleja al bajar, cada sección
   entra cuando aparece (títulos que se destapan, filas y tarjetas en
   cascada, las caras de la comunidad que saltan) y los botones principales
   se acercan un poco al mouse. Con "reducir movimiento" no se anima nada. */
export function useLandingMotion(rootRef) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const q = (sel) => gsap.utils.toArray(root.querySelectorAll(sel));
      const enter = (trigger, start = "top 85%") => ({ trigger, start, once: true });

      // hero: al bajar, el texto sube y se apaga y la órbita gira y se achica
      const hero = root.querySelector(".hero");
      if (hero) {
        const scrub = { trigger: hero, start: "top top", end: "bottom top", scrub: 0.6 };
        gsap.to(hero.querySelector(".hero-copy"), { yPercent: -18, opacity: 0.25, ease: "none", scrollTrigger: scrub });
        gsap.to(hero.querySelector(".orbit"), { y: -140, rotation: 28, scale: 0.86, ease: "none", scrollTrigger: scrub });
        gsap.from(hero.querySelectorAll(".orbit .node"), { scale: 0, duration: 1.1, ease: "back.out(2.2)", stagger: 0.12, delay: 0.5 });
      }

      // títulos: se destapan de abajo hacia arriba; la bajada llega atrás
      q(".head-2, .comm, .free-head, .closing .wrap").forEach((block) => {
        const h2 = block.querySelector("h2");
        if (!h2) return;
        const tl = gsap.timeline({ scrollTrigger: enter(block) });
        tl.from(h2, { yPercent: 40, opacity: 0, clipPath: "inset(0 0 100% 0)", duration: 1.1, ease: EASE });
        const sub = h2.nextElementSibling;
        if (sub?.tagName === "P") tl.from(sub, { y: 18, opacity: 0, duration: 0.9, ease: EASE }, 0.15);
      });

      // funciones: cada fila entra y su ícono hace un giro corto
      q(".frow").forEach((row) => {
        const tl = gsap.timeline({ scrollTrigger: enter(row, "top 88%") });
        tl.from(row, { y: 40, opacity: 0, duration: 1, ease: EASE }).from(row.querySelector(".fico"), { scale: 0.6, rotation: -14, duration: 0.9, ease: "back.out(2)" }, 0.1);
      });

      // pasos: las tarjetas caen en cascada, inclinadas, y el número se corre
      const steps = q(".steps-grid .step");
      if (steps.length) {
        gsap.from(steps, { y: 60, opacity: 0, rotationX: -18, transformOrigin: "50% 0%", duration: 1.1, ease: EASE, stagger: 0.12, scrollTrigger: enter(steps[0].parentElement) });
        gsap.from(q(".steps-grid .step .n"), { x: -16, opacity: 0, duration: 0.8, ease: EASE, stagger: 0.12, delay: 0.25, scrollTrigger: enter(steps[0].parentElement) });
      }

      // comunidad: las caras saltan una atrás de otra
      const faces = q(".cluster > *");
      if (faces.length) gsap.from(faces, { scale: 0, y: 24, duration: 0.9, ease: "back.out(2.4)", stagger: 0.07, ...handOff(faces), scrollTrigger: enter(faces[0].parentElement, "top 90%") });

      // gratis: la etiqueta aparece, los puntos suben y el brillo respira con el scroll
      const tag = root.querySelector(".free-tag");
      if (tag) gsap.from(tag, { scale: 0.8, opacity: 0, duration: 0.8, ease: "back.out(2)", scrollTrigger: enter(tag) });
      const points = q(".free-points .fp");
      if (points.length) gsap.from(points, { y: 40, opacity: 0, duration: 1, ease: EASE, stagger: 0.1, ...handOff(points), scrollTrigger: enter(points[0].parentElement) });
      const glow = root.querySelector(".free-glow");
      if (glow) gsap.fromTo(glow, { scale: 0.7 }, { scale: 1.15, ease: "none", scrollTrigger: { trigger: glow.parentElement, start: "top bottom", end: "bottom top", scrub: true } });

      // preguntas: en cascada
      const faq = q(".faq details");
      if (faq.length) gsap.from(faq, { y: 24, opacity: 0, duration: 0.8, ease: EASE, stagger: 0.08, scrollTrigger: enter(faq[0].parentElement) });

      // cierre: el título crece mientras llega
      const closing = root.querySelector(".closing h2");
      if (closing) gsap.fromTo(closing, { scale: 0.9 }, { scale: 1, ease: "none", scrollTrigger: { trigger: closing, start: "top bottom", end: "center center", scrub: 0.6 } });
    });

    // botones principales: se acercan apenas al puntero (solo con mouse)
    mm.add("(prefers-reduced-motion: no-preference) and (hover: hover)", () => {
      const off = [];
      root.querySelectorAll(".btn-pink").forEach((btn) => {
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
