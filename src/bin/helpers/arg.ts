export function arg(name: string) {
  return process.argv
    .find((arg) => arg.startsWith(`--${name}`))
    ?.split("=", 2)[1];
}
