import { System, Entity } from "../core/ECS";
import { Engine } from "../core/Engine";
import { Position } from "../components/Position";
import { Gun } from "../components/Gun";
import { Renderable } from "../components/Renderable";
import { Collider } from "../components/Collider";
import { Velocity } from "../components/Velocity";
import { Modifier } from "../components/Modifier";
import { sfx } from "../core/AudioEngine";

export class PlayerControlSystem implements System {
  private keys: { [key: string]: boolean } = {};
  private targetX: number | null = null;

  constructor() {
    // Tastatur-Ereignisse registrieren
    window.addEventListener("keydown", (e) => this.keys[e.code] = true);
    window.addEventListener("keyup", (e) => this.keys[e.code] = false);

    // Maus- & Touch-Tracking für ein flüssiges, lerp-interpoliertes Game-Feel
    const updatePointer = (x: number) => {
      this.targetX = x;
    };

    window.addEventListener("mousemove", (e) => updatePointer(e.clientX));
    window.addEventListener("touchmove", (e) => {
      if (e.touches.length > 0) updatePointer(e.touches[0].clientX);
    }, { passive: true });
  }

  update(entities: Entity[], engine: Engine, delta: number): void {
    for (const entity of entities) {
      if (
        engine.em.hasComponent(entity, "Gun") && 
        engine.em.hasComponent(entity, "Collider") && 
        engine.em.hasComponent(entity, "Position")
      ) {
        const pos = engine.em.getComponent<Position>(entity, "Position")!;
        const gun = engine.em.getComponent<Gun>(entity, "Gun")!;
        
        if (gun.cooldownTimer > 0) gun.cooldownTimer -= delta;

        // --- INPUT INTERFACE A: Maus / Touch (Lerp-Interpolation) ---
        if (this.targetX !== null) {
          const dx = this.targetX - (pos.x + 21); // Zentriert auf Schiffsmitte (42px / 2)
          pos.x += dx * 16 * delta; 
        } 
        
        // --- INPUT INTERFACE B: Tastatur (A/D oder Pfeiltasten) ---
        const speed = 550;
        if (this.keys["ArrowLeft"] || this.keys["KeyA"]) {
          pos.x -= speed * delta;
          this.targetX = null; // Tastatur bricht den Maus-Fokus auf
        }
        if (this.keys["ArrowRight"] || this.keys["KeyD"]) {
          pos.x += speed * delta;
          this.targetX = null;
        }

        // Sichtbare Canvas-Grenzen absichern
        if (pos.x < 15) pos.x = 15;
        if (pos.x > engine.ctx.canvas.width - 57) pos.x = engine.ctx.canvas.width - 57;

        // --- SCHUSSAUSLÖSUNG & MODIFIER LOGIK ---
        if (gun.cooldownTimer <= 0 && engine.state === "PLAYING") {
          
          // Prüfen, ob das Tri-Beam Upgrade im ECS-Speicher aktiv ist
          const hasTriBeam = engine.em.hasComponent(entity, "Modifier") && 
                             engine.em.getComponent<Modifier>(entity, "Modifier")!.type === "TRI_BEAM";

          if (hasTriBeam) {
            // Drei Laser fächerförmig abfeuern
            this.fireLaser(engine, pos.x + 21, pos.y - 10, gun.projectileSpeed, 0);     // Zentrum
            this.fireLaser(engine, pos.x + 5, pos.y - 5, gun.projectileSpeed, -120);   // Links abgewinkelt
            this.fireLaser(engine, pos.x + 37, pos.y - 5, gun.projectileSpeed, 120);    // Rechts abgewinkelt
          } else {
            // Standard-Einzelstrahl
            this.fireLaser(engine, pos.x + 21, pos.y - 10, gun.projectileSpeed, 0);
          }
          
          gun.cooldownTimer = gun.fireRate;
        }
      }
    }
  }

  private fireLaser(engine: Engine, x: number, y: number, speed: number, vx: number): void {
    const laser = engine.em.createEntity();
    engine.em.addComponent(laser, new Position(x, y));
    engine.em.addComponent(laser, new Velocity(vx, -speed)); // Negativer Y-Vektor schießt nach oben
    
    // KORREKTUR: Typ auf \"laser\" geändert (Strich statt Kästchen) und Farbe auf Cyber-Neon-Blau umgestellt
    engine.em.addComponent(laser, new Renderable("#00f0ff", 16, "laser"));
    engine.em.addComponent(laser, new Collider(4, 16, "PLAYER_LASER"));
    
    sfx.playLaserSound(true);
  }
}