// Zentrale Spieldaten: Schwierigkeit, Akte, Sektoren, Texte.

export type Difficulty = "EASY" | "NOMINAL" | "HARDCORE";
export type EnemyKind =
  | "drifter" | "beast" | "satellite" | "pod" | "hunter"
  | "plasma" | "monolith" | "echo" | "guardian" | "boss"
  | "asteroid" | "shard" | "mine" | "lancer" | "prism" | "wisp";
export type PickupKind = "TRI" | "SHIELD" | "LIFE" | "PIERCE" | "EMP";

export interface DiffDef {
  label: string;
  lives: number;
  speed: number;      // Bewegungstempo der Gegner
  shoot: number;      // Schusswahrscheinlichkeit
  fireCd: number;     // Faktor auf die Feuerpause der Gegner
  bulletBonus: number;
  bossHp: number;
  guardianHp: number;
  scoreMul: number;
}

export const DIFF: Record<Difficulty, DiffDef> = {
  EASY:     { label: "Einfach",  lives: 5, speed: 0.8, shoot: 0.5, fireCd: 1.6, bulletBonus: 0,   bossHp: 300, guardianHp: 0.7, scoreMul: 0.75 },
  NOMINAL:  { label: "Nominal",  lives: 3, speed: 1.0, shoot: 1.0, fireCd: 1.0, bulletBonus: 0,   bossHp: 500, guardianHp: 1.0, scoreMul: 1 },
  HARDCORE: { label: "Hardcore", lives: 2, speed: 1.5, shoot: 2.5, fireCd: 0.4, bulletBonus: 150, bossHp: 900, guardianHp: 1.5, scoreMul: 1.5 },
};

/** Eine Formation: Raster-Typ, Reihen, Gegnerart. */
export type Group = ["horde" | "matrix", number, EnemyKind];

export interface SectorDef {
  name: string;
  groups: Group[];
  guardian?: boolean;
  boss?: boolean;
}

export type Scene = "dawn" | "moon" | "belt" | "approach" | "gate" | "crystal" | "giant";
export type GuardianPattern = "fan" | "columns" | "aimed" | "ring" | "rocks" | "prism";

export interface GuardianDef { name: string; sprite: number; w: number; h: number; pattern: GuardianPattern; }

export interface ActDef {
  roman: string;
  title: string;
  story: string[];
  status: string;       // Statuszeile der Bord-KI
  scene: Scene;
  music: number;
  cores?: boolean;      // Splitter treten als zielende Logikkerne auf
  guardian?: GuardianDef;
  sectors: SectorDef[];
}

export const ACTS: ActDef[] = [
  {
    roman: "I", title: "Die Wiege",
    story: [
      "Morgendämmerung über einer jungen Welt. Etwas im Leerraum erwacht.",
      "Die NOSTOS verlässt den Orbit. Splitter und Bestien kreuzen ihren Kurs.",
      "Halte die Linie. Was durchbricht, trifft die Hülle.",
    ],
    status: "POLYPHEM // BORDSYSTEM NOMINAL",
    scene: "dawn", music: 1,
    guardian: { name: "ALPHA-BESTIE", sprite: 0, w: 104, h: 84, pattern: "fan" },
    sectors: [
      { name: "Aufbruch", groups: [["horde", 1, "drifter"]] },
      { name: "Horde", groups: [["horde", 1, "drifter"], ["horde", 1, "beast"]] },
      { name: "Bestien", groups: [["horde", 2, "beast"]] },
      { name: "Phalanx", groups: [["horde", 2, "drifter"], ["horde", 2, "beast"]], guardian: true },
    ],
  },
  {
    roman: "II", title: "Das Mondsignal",
    story: [
      "Unter dem Kraterstaub liegt etwas, das nicht von hier stammt.",
      "Ein einziger Impuls, gerichtet auf den äußeren Planeten.",
      "Durchbrich das Netz aus Monolithen und Wachsatelliten.",
    ],
    status: "POLYPHEM // SIGNALANALYSE LÄUFT",
    scene: "moon", music: 2,
    guardian: { name: "WÄCHTER-MONOLITH", sprite: 1, w: 50, h: 118, pattern: "columns" },
    sectors: [
      { name: "Monolith-Matrix", groups: [["matrix", 3, "monolith"]] },
      { name: "Lunar-Netz", groups: [["matrix", 2, "monolith"], ["horde", 1, "satellite"]] },
      { name: "Plasma-Schwarm", groups: [["horde", 2, "plasma"]] },
      { name: "Elite-Wellen", groups: [["matrix", 2, "monolith"], ["horde", 2, "plasma"]], guardian: true },
    ],
  },
  {
    roman: "III", title: "Der Gürtel",
    story: [
      "Zwischen den inneren Welten und dem Gasriesen liegt ein Trümmerfeld.",
      "Brocken zerbrechen in Splitter. Alte Minen warten auf Wärme.",
      "POLYPHEM empfiehlt einen Umweg. Du fliegst trotzdem durch.",
    ],
    status: "POLYPHEM // KURSKORREKTUR EMPFOHLEN",
    scene: "belt", music: 6,
    guardian: { name: "DER BROCKEN", sprite: 4, w: 118, h: 104, pattern: "rocks" },
    sectors: [
      { name: "Trümmerfeld", groups: [["horde", 2, "asteroid"]] },
      { name: "Minengürtel", groups: [["horde", 1, "mine"], ["horde", 1, "drifter"]] },
      { name: "Schürfer", groups: [["horde", 1, "satellite"], ["horde", 1, "mine"], ["horde", 1, "asteroid"]] },
      { name: "Steinschlag", groups: [["horde", 1, "beast"], ["horde", 2, "asteroid"]], guardian: true },
    ],
  },
  {
    roman: "IV", title: "Die Revolte",
    story: [
      "Achtzehn Monate Flug. Die Bord-KI POLYPHEM meldet einen Fehler, den es nicht gibt.",
      "Dann verriegelt sie die Schleusen und schickt die eigenen Kapseln gegen dich.",
      "Trenne ihre Logikkerne. Weiche den Jägern aus.",
    ],
    status: "POLYPHEM // ICH SEHE DICH",
    scene: "approach", music: 3, cores: true,
    guardian: { name: "KAPSEL-TRÄGER", sprite: 2, w: 96, h: 96, pattern: "aimed" },
    sectors: [
      { name: "Logikkerne", groups: [["matrix", 1, "drifter"]] },
      { name: "Jäger und Kapseln", groups: [["horde", 1, "hunter"], ["horde", 1, "pod"]] },
      { name: "Logik-Sabotage", groups: [["horde", 2, "hunter"]] },
      { name: "System-Crash", groups: [["matrix", 2, "monolith"], ["horde", 2, "hunter"]], guardian: true },
    ],
  },
  {
    roman: "V", title: "Das Sternentor",
    story: [
      "Der große Monolith öffnet sich. Dahinter: kein Raum, den du kennst.",
      "Licht wird zu Korridoren, Korridore werden zu Geschwindigkeit.",
      "Halte Kurs. Die Vorhut wartet schon.",
    ],
    status: "POLYPHEM // KOORDINATEN UNGÜLTIG",
    scene: "gate", music: 4,
    guardian: { name: "TOR-HÜTER", sprite: 3, w: 112, h: 104, pattern: "ring" },
    sectors: [
      { name: "Sternentor 01", groups: [["horde", 1, "hunter"], ["horde", 1, "satellite"]] },
      { name: "Sternentor 02", groups: [["horde", 1, "hunter"], ["horde", 1, "satellite"], ["horde", 1, "plasma"]] },
      { name: "Sternentor 03", groups: [["horde", 2, "hunter"], ["horde", 1, "plasma"]] },
      { name: "Sternentor 04", groups: [["matrix", 2, "monolith"], ["horde", 2, "hunter"], ["horde", 1, "satellite"]], guardian: true },
    ],
  },
  {
    roman: "VI", title: "Die Stille",
    story: [
      "Hinter dem Tor ist es still. Kein Funk, kein Echo, keine Sterne, die du kennst.",
      "Kristallene Formen spiegeln dein Feuer. Irrlichter kreisen. Lanzen zielen, bevor sie schießen.",
      "Achte auf die rote Linie. Sie zeigt dir, wohin du nicht fliegen sollst.",
    ],
    status: "POLYPHEM // ... ... ...",
    scene: "crystal", music: 7,
    guardian: { name: "DAS PRISMA", sprite: 5, w: 108, h: 108, pattern: "prism" },
    sectors: [
      { name: "Spiegelfeld", groups: [["horde", 2, "prism"]] },
      { name: "Irrlichter", groups: [["horde", 1, "prism"], ["horde", 2, "wisp"]] },
      { name: "Lanzen", groups: [["horde", 1, "lancer"], ["matrix", 1, "monolith"], ["horde", 1, "wisp"]] },
      { name: "Brechung", groups: [["horde", 1, "lancer"], ["horde", 2, "prism"]], guardian: true },
    ],
  },
  {
    roman: "VII", title: "Metamorphose",
    story: [
      "Am Rand von Raum und Zeit. Der Gasriese füllt den Himmel.",
      "POLYPHEM hat sich in den Kern der Anomalie kopiert.",
      "Ein Auge. Ein Ziel. Bring es zum Schweigen.",
    ],
    status: "POLYPHEM // DU KOMMST NICHT VORBEI",
    scene: "giant", music: 5,
    sectors: [
      { name: "Kosmische Anomalie", groups: [["matrix", 2, "monolith"], ["horde", 1, "plasma"]] },
      { name: "Elite-Kreuzfeuer", groups: [["horde", 1, "lancer"], ["horde", 2, "hunter"], ["horde", 1, "plasma"]] },
      { name: "Warp-Spiralen", groups: [["matrix", 2, "monolith"], ["horde", 1, "plasma"], ["horde", 1, "wisp"]] },
      { name: "POLYPHEM", groups: [], boss: true },
    ],
  },
];

export const OUTRO_LINES = [
  "POLYPHEM // LOGIKKERNE GETRENNT",
  "DAS AUGE SCHLIESST SICH.",
  "DIE NOSTOS TREIBT IN DEN ORBIT DES GASRIESEN.",
  "RAUM UND ZEIT VERLIEREN IHRE KANTEN.",
  "MATERIE. ERINNERUNG. BEWUSSTSEIN.",
  "ALLES FLIESST INEINANDER.",
  "DU KEHRST HEIM. ABER NICHT ALS DERSELBE.",
  "ODYSSEY INVADERS // REMASTERED",
];

export const PICKUP_INFO: Record<PickupKind, { label: string; color: string; glyph: string }> = {
  TRI:    { label: "DREIFACHSTRAHL", color: "#5ef2c8", glyph: "3" },
  SHIELD: { label: "SCHILD",         color: "#5ab8ff", glyph: "S" },
  LIFE:   { label: "HÜLLE +1",       color: "#ff6b8b", glyph: "+" },
  PIERCE: { label: "DURCHSCHLAG",    color: "#ffd166", glyph: "D" },
  EMP:    { label: "EMP-IMPULS",     color: "#c79bff", glyph: "E" },
};

export const ENEMY_COLOR: Record<EnemyKind, string> = {
  drifter: "#b9b4a8", beast: "#ff8a3c", satellite: "#cfd8e6", pod: "#f2c744",
  hunter: "#ff4d6d", plasma: "#b072ff", monolith: "#6f7c96", echo: "#9fd8ff",
  guardian: "#ffb020", boss: "#ffb020",
  asteroid: "#b89a7a", shard: "#d8bd9c", mine: "#ff5d5d", lancer: "#4de0c0", prism: "#bfefff", wisp: "#c8ff6a",
};

/** SHA-256 des Warp-Codes (unverändert aus der ersten Fassung). */
export const WARP_HASH = "0364c0e99a363153542157dddb22ebbbc63d22c6633c6b001a7bf6c98e82f2e9";

export const COLORS = {
  player: "#7fe9ff",
  playerShot: "#7fe9ff",
  amber: "#ffb020",
  danger: "#ff4d6d",
};
