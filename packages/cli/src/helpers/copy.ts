import { execSync } from "child_process";

export function copyToClipboard(value: string): boolean {
  let copied = false;
  try {
    execSync("pbcopy", { input: value });
    copied = true;
  } catch {}
  try {
    execSync("xclip", { input: value });
    copied = true;
  } catch {}
  try {
    execSync("xsel", { input: value });
    copied = true;
  } catch {}
  try {
    execSync("clip.exe", { input: value });
    copied = true;
  } catch {}

  return copied;
}
