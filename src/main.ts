import { Engine } from "./core/Engine";
import { MoveSystem } from "./systems/MoveSystem";
import { RenderSystem } from "./systems/RenderSystem";
import { PlayerControlSystem } from "./systems/PlayerControlSystem";
import { InvaderAiSystem } from "./systems/InvaderAiSystem";
import { CollisionSystem } from "./systems/CollisionSystem";
import { CleanupSystem } from "./systems/CleanupSystem";
import { ParticleSystem } from "./systems/ParticleSystem";
import { PowerUpSystem } from "./systems/PowerUpSystem";
import { ActDirectorSystem } from "./systems/ActDirectorSystem";

import { Position } from "./components/Position";
import { Renderable } from "./components/Renderable";
import { Collider } from "./components/Collider";
import { Gun } from "./components/Gun";
import { Health } from "./components/Health";
import { sfx } from "./core/AudioEngine";

const canvas = document.createElement("canvas");
document.body.appendChild(canvas);
document.body.style.backgroundColor = "#020204";
document.body.style.margin = "0";
document.body.style.overflow = "hidden";

const game = new Engine(canvas);

// Sound Aktivierung durch User-Interaktion (SOTA Browser Security Compliance)
window.addEventListener("click", () => {
  sfx.playSpaceAmbient();
}, { once: true });

// Registrierung aller hochentwickelten Subsysteme
game.addSystem(new ActDirectorSystem());   // Kontrolliert Fortschritt und Akte
game.addSystem(new PlayerControlSystem()); // Steuert Schiff & Schüsse
game.addSystem(new PowerUpSystem());       // Modifiziert Buffs/Waffen
game.addSystem(new InvaderAiSystem());     // Berechnet feindliche Formationen
game.addSystem(new MoveSystem());          // Vektor-Physik
game.addSystem(new CollisionSystem());     // Hitboxen & Feedback
game.addSystem(new ParticleSystem());      // Explosionen & Background-Sterne
game.addSystem(new CleanupSystem());       // GC / Speicherbereinigung
game.addSystem(new RenderSystem());        // Canvas Zeichnung

// Player Instanziierung (Discovery One)
const player = game.em.createEntity();
game.em.addComponent(player, new Position(window.innerWidth / 2 - 20, window.innerHeight - 120));
game.em.addComponent(player, new Renderable("#ffffff", 42, "ship"));
game.em.addComponent(player, new Collider(42, 42, "PLAYER"));
game.em.addComponent(player, new Gun(0.25, 750)); 
game.em.addComponent(player, new Health(3, 3));

game.start();