import type { BoardTheme } from "./types";

export const BOARD_THEMES: { id: BoardTheme; label: string; light: string; dark: string }[] = [
  { id: "marble", label: "Marble", light: "#e8eef3", dark: "#7a9eb5" },
  { id: "green", label: "Green", light: "#eeeed2", dark: "#769656" },
  { id: "brown", label: "Brown", light: "#f0d9b5", dark: "#b58863" },
];
