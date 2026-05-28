/**
 * Inicia o Firebase Emulator Suite com persistência de dados e roda o seed
 * automaticamente quando os emuladores ficarem prontos.
 *
 * Uso: npm run emu
 */

import { spawn } from "node:child_process";

const EMULATOR_ARGS = [
  "emulators:start",
  "--import=./emulator-data",
  "--export-on-exit=./emulator-data",
];

const READY_SIGNAL = "All emulators ready!";

const emu = spawn("firebase", EMULATOR_ARGS, {
  shell: true,
  stdio: ["inherit", "pipe", "pipe"],
});

let seeded = false;
let buffer = "";

function tryRunSeed(chunk: string) {
  if (seeded) return;
  buffer += chunk;
  if (!buffer.includes(READY_SIGNAL)) return;
  seeded = true;

  console.log("\n[start-emu] Emuladores prontos — iniciando seed...\n");

  const seed = spawn(
    "npx",
    ["tsx", "--tsconfig", "tsconfig.scripts.json", "scripts/seed-emulator.ts"],
    { shell: true, stdio: "inherit" },
  );

  seed.on("exit", (code) => {
    if (code !== 0) {
      console.error(`\n[start-emu] Seed saiu com código ${code}`);
    }
  });
}

emu.stdout?.on("data", (chunk: Buffer) => {
  const text = chunk.toString();
  process.stdout.write(text);
  tryRunSeed(text);
});

emu.stderr?.on("data", (chunk: Buffer) => {
  process.stderr.write(chunk);
});

// Repassa SIGINT/SIGTERM ao processo filho para que o export-on-exit rode
for (const sig of ["SIGINT", "SIGTERM"] as NodeJS.Signals[]) {
  process.on(sig, () => {
    emu.kill(sig);
  });
}

emu.on("exit", (code) => {
  process.exit(code ?? 0);
});
