import type { Metadata } from "next";
import SeparacionModulo from "@/components/SeparacionModulo";

export const metadata: Metadata = {
  title: "Separación y Gamificación · EcoRoute AI",
  description:
    "Guía interactiva de separación de residuos, registro ciudadano de reciclaje y panel de gamificación con puntos y recompensas.",
};

export default function SeparacionPage() {
  return <SeparacionModulo />;
}