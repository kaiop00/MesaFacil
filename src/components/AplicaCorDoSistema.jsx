import { useEffect, useRef } from "react";
import { useCorDoRestaurante } from "@/hooks/useCorDoRestaurante";

export function AplicaCorDoSistema() {
  const corBase = useCorDoRestaurante();
  const jaAplicado = useRef(false); // garante que só roda uma vez

  useEffect(() => {
    if (!corBase || jaAplicado.current) return;

    function hexToRgb(hex) {
      const cleanHex = hex.replace("#", "");
      const bigint = parseInt(cleanHex, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return `${r}, ${g}, ${b}`;
    }

    const corFinal = corBase.startsWith("#") ? hexToRgb(corBase) : corBase;

    document.documentElement.style.setProperty("--color-primary", corFinal);
    localStorage.setItem("cor-primary", corFinal);

    jaAplicado.current = true;
  }, [corBase]);

  return null;
}
