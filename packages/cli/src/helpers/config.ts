import { cosmiconfig, defaultLoaders } from "cosmiconfig";
import { GraphQLSchema } from "graphql";
import jiti from "jiti";
import { z } from "zod";

const schemaGenerationConfig = z.strictObject({
	name: z.string().optional(),
	schema: z.union([
		z.instanceof(GraphQLSchema),
		z.strictObject({
			sdl: z.string(),
		}),
		z.strictObject({
			introspect: z.string(),
		}),
	]),
	output: z.string(),
	scalarTypes: z.record(z.string(), z.string()).optional(),
	possibleTypes: z.boolean().default(false),
	emitTypes: z.boolean().default(true),
});

export type SchemaGenerationConfig = z.infer<typeof schemaGenerationConfig>;

export const schema = z.object({
	generate: z.union([schemaGenerationConfig, z.array(schemaGenerationConfig)]),
	convert: z
		.strictObject({
			formatComment: z.boolean().optional().default(true),
		})
		.default({})
		.optional(),
});

export async function loadConfig() {
	const result = await cosmiconfig("gqlb", {
		loaders: {
			...defaultLoaders,
			".ts": (filepath) => {
				const jitiLoader = jiti("", { interopDefault: true });
				return jitiLoader(filepath);
			},
		},
	}).search(process.cwd());
	if (!result) {
		// list out the valid file names
		console.log(
			`No config file found. Please create a gqlb.config.ts file at the root of your project.`,
		);
		process.exit(1);
	}
	const parsed = schema.safeParse(result.config);
	if (!parsed.success) {
		console.log(`Encountered the following errors while parsing config:`);
		for (const err of parsed.error.errors) {
			console.log(`${err.path.join(".")}: ${err.message}`);
		}
		process.exit(1);
	}
	return parsed.data;
}
