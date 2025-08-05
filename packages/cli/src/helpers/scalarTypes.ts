import type { SchemaGenerationConfig } from "./config";

export function getScalarTypes(config: SchemaGenerationConfig) {
	const { scalarTypes } = config;
	const baseTypes: Record<string, string> = {
		String: "string",
		Int: "number",
		Float: "number",
		Boolean: "boolean",
		ID: "string | number",
		...scalarTypes,
	};
	return baseTypes;
}
