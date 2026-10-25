import { createContext, useContext } from "react";

/* Cerrar el <Modal> que contiene a un componente, con su animación de vuelta
   al botón. Fuera de un Modal devuelve null. */
export const ModalClose = createContext(null);
export const useModalClose = () => useContext(ModalClose);

/* De dónde nace el próximo Modal: el último botón o link que se apretó (lo
   anota Modal en captura) */
export const press = { last: null };
