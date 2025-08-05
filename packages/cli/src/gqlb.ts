#!/usr/bin/env node
import { program } from "commander";

async function main() {
	program.name("gqlb").description("GraphQL Build tool").version("0.1.0");

	program
		.command("generate")
		.description("Generate TypeScript types from GraphQL schema")
		.action(async () => {
			const { generate } = await import("./commands/generate");
			await generate();
		});

	await program.parseAsync(process.argv);
}

void main();
