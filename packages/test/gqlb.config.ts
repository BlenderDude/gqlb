import type { GQLBConfig } from "@gqlb/cli";

export default {
	generate: {
		output: "src/generated/test_01/b",
		schema: {
			sdl: "schemas/test_01.graphql",
		},
	},
} satisfies GQLBConfig;
