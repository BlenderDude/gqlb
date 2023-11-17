#!/usr/bin/env node
import { convert } from "./commands/convert";
import { generate } from "./commands/generate";

async function main() {
  const command = process.argv[2];
  if (!command) {
    console.error("No command specified");
    console.log("Usage: gqlb <generate|convert>");
    process.exit(1);
  }

  switch (command) {
    case "generate":
      return generate();
    case "convert":
      return convert();
    default:
      console.error(`Unknown command: ${command}`);
      console.log("Usage: gqlb <generate|convert>");
      process.exit(1);
  }
}

void main();
