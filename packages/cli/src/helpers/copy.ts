import { execSync } from "child_process";

function run(command: string, input: string): boolean {
  try {
    execSync(command, { stdio: ["pipe", "ignore", "ignore"], input });
    return true;
  } catch (e) {
    return false;
  }
}

export function copyToClipboard(value: string): boolean {
  return (
    run("pbcopy", value) ||
    run("xclip", value) ||
    run("xsel", value) ||
    run("clip.exe", value)
  );
}
