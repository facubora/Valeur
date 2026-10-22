import { createContext, useContext } from "react";

/* Cerrar el <Modal> que contiene a un componente, con su animación de vuelta
   al botón. Fuera de un Modal devuelve null. */
export const ModalClose = createContext(null);
export const useModalClose = () => useContext(ModalClose);
