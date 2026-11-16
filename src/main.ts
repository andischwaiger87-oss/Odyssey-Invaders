import "@fontsource/michroma/latin-400.css";
import "@fontsource/chakra-petch/latin-500.css";
import "@fontsource/chakra-petch/latin-600.css";
import "@fontsource/chakra-petch/latin-700.css";
import "./style.css";
import { Game } from "./game";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const game = new Game(canvas);
game.start();

// Diagnose-Zugriff für Tests und die Browser-Konsole
(window as unknown as { __oi: Game }).__oi = game;
