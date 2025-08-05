import fs from "node:fs/promises";
import path from "node:path";
import {
	buildClientSchema,
	buildSchema,
	GraphQLEnumType,
	type GraphQLField,
	type GraphQLFieldMap,
	GraphQLInputObjectType,
	type GraphQLInputType,
	GraphQLInterfaceType,
	GraphQLList,
	type GraphQLNamedType,
	GraphQLNonNull,
	GraphQLObjectType,
	type GraphQLOutputType,
	GraphQLScalarType,
	GraphQLSchema,
	type GraphQLType,
	GraphQLUnionType,
	getIntrospectionQuery,
	type IntrospectionQuery,
	isRequiredArgument,
} from "graphql";
import request from "graphql-request";
import { loadConfig, type SchemaGenerationConfig } from "../helpers/config";
import { getScalarTypes } from "../helpers/scalarTypes";

function makeTypeString(
	type: GraphQLOutputType,
	parent: GraphQLOutputType | null = null,
): string {
	if (type instanceof GraphQLList) {
		if (parent instanceof GraphQLNonNull) {
			return `readonly ${makeTypeString(type.ofType, type)}[]`;
		}
		return `readonly ${makeTypeString(type.ofType, type)}[] | null`;
	}
	if (type instanceof GraphQLNonNull) {
		return makeTypeString(type.ofType, type);
	}
	if (parent instanceof GraphQLNonNull) {
		return type.name;
	}
	return `${type.name} | null`;
}

function makeFieldProperty(field: GraphQLField<unknown, unknown>) {
	return `readonly ${field.name}: ${makeTypeString(field.type)}`;
}

async function makeTypesFile(
	schema: GraphQLSchema,
	config: SchemaGenerationConfig,
): Promise<string> {
	const typeAliases: string[] = [];

	for (const t of Object.values(schema.getTypeMap())) {
		if (t.name.startsWith("__")) continue;

		if (t instanceof GraphQLObjectType || t instanceof GraphQLInputObjectType) {
			const fields = Object.values(t.getFields())
				.map((f) => `  ${makeFieldProperty(f)};`)
				.join("\n");

			typeAliases.push(`export type ${t.name} = {
${fields}
};`);
			continue;
		}

		if (t instanceof GraphQLUnionType) {
			const unionTypes = t
				.getTypes()
				.map((t) => t.name)
				.join(" | ");

			typeAliases.push(`export type ${t.name} = ${unionTypes};`);
			continue;
		}

		if (t instanceof GraphQLScalarType) {
			const scalarTypes = getScalarTypes(config);
			const scalarType = scalarTypes[t.name] ?? "unknown";

			typeAliases.push(`export type ${t.name} = ${scalarType};`);
			continue;
		}

		if (t instanceof GraphQLEnumType) {
			const enumValues = t
				.getValues()
				.map((v) => `'${v.name}'`)
				.join(" | ");

			typeAliases.push(`export type ${t.name} = ${enumValues};`);
			continue;
		}

		if (t instanceof GraphQLInterfaceType) {
			const fields = Object.values(t.getFields())
				.map((f) => `  ${makeFieldProperty(f)};`)
				.join("\n");

			const possibleTypes = schema
				.getPossibleTypes(t)
				.map((t) => t.name)
				.join(" | ");

			typeAliases.push(`export type ${t.name} = {
${fields}
} & (${possibleTypes});`);
		}
	}

	return `export namespace types {
${typeAliases.map((alias) => `  ${alias.replace(/\n/g, "\n  ")}`).join("\n\n")}
}`;
}

function makePossibleTypes(schema: GraphQLSchema) {
	const possibleTypes = Object.fromEntries(
		Object.values(schema.getTypeMap())
			.filter(
				(t): t is GraphQLInterfaceType | GraphQLUnionType =>
					t instanceof GraphQLInterfaceType || t instanceof GraphQLUnionType,
			)
			.map((t) => {
				if (t instanceof GraphQLInterfaceType) {
					return [
						t.name,
						schema.getPossibleTypes(t).map((t) => t.name),
					] as const;
				}
				if (t instanceof GraphQLUnionType) {
					return [t.name, t.getTypes().map((t) => t.name)] as const;
				}
				throw new Error("Expected interface or union type");
			}),
	);

	return `export const possibleTypes = ${JSON.stringify(possibleTypes)};`;
}

function resolveToRootType(type: GraphQLType) {
	if (type instanceof GraphQLList || type instanceof GraphQLNonNull) {
		return resolveToRootType(type.ofType);
	}
	return type;
}

async function loadSchemaFromUrl(url: string) {
	const result = await request<IntrospectionQuery>({
		url,
		document: getIntrospectionQuery({
			descriptions: true,
		}),
	});
	return buildClientSchema(result);
}

async function loadSchemaFromFile(path: string) {
	const schema = await fs.readFile(path, "utf-8");
	return buildSchema(schema);
}

function argumentUnion(type: GraphQLInputType): string {
	if (type instanceof GraphQLNonNull) {
		return `Exclude<${argumentUnion(type.ofType)}, null>`;
	}
	if (type instanceof GraphQLList) {
		return `ReadonlyArray<${argumentUnion(type.ofType)}> | null`;
	}
	if (type instanceof GraphQLScalarType) {
		return `Scalar_${type.name}["_input"] | null`;
	}
	if (type instanceof GraphQLEnumType) {
		return `EnumValue<Enum_${type.name}["_input"]> | null`;
	}
	if (type instanceof GraphQLInputObjectType) {
		return `InputObject_${type.name}_Variables | null`;
	}
	throw new Error("Unknown input type");
}

function methodsForFields(fieldMap: GraphQLFieldMap<unknown, unknown>): string {
	const methods: string[] = [];
	const fields = Object.values(fieldMap);

	for (const field of fields) {
		let jsdocComment = "";
		if (field.description || field.deprecationReason) {
			jsdocComment = "/**\n";
			if (field.description) {
				jsdocComment += `   * ${field.description}\n`;
			}
			if (field.deprecationReason) {
				jsdocComment += `   * @deprecated ${field.deprecationReason}\n`;
			}
			jsdocComment += "   */\n  ";
		}

		const rootType = resolveToRootType(field.type);
		const hasRequiredArg = field.args.some(
			(arg) => arg.type instanceof GraphQLNonNull,
		);
		const hasAnyArgs = field.args.length > 0;

		const wrap = (result: string, type: GraphQLOutputType): string => {
			if (type instanceof GraphQLList) {
				return `ReadonlyArray<${wrap(result, type.ofType)}> | null`;
			}
			if (type instanceof GraphQLNonNull) {
				return `Exclude<${wrap(result, type.ofType)}, null>`;
			}
			return result;
		};

		const result = (output: string, type: GraphQLOutputType) => {
			return `Field<"${field.name}", undefined, ${wrap(
				`${output} | null`,
				type,
			)}>`;
		};

		if (
			rootType instanceof GraphQLScalarType ||
			rootType instanceof GraphQLEnumType
		) {
			let output: string;
			if (rootType instanceof GraphQLEnumType) {
				output = `Enum_${rootType.name}["_output"]`;
			} else if (rootType instanceof GraphQLScalarType) {
				output = `Scalar_${rootType.name}["_output"]`;
			} else {
				throw new Error("Expected scalar or enum type");
			}

			if (hasAnyArgs) {
				const argumentType = `{
            ${field.args
							.map((arg) => {
								const optional = isRequiredArgument(arg) ? "" : "?";
								return `readonly ${arg.name}${optional}: ${argumentUnion(
									arg.type,
								)} | ${variableUnion(arg.type)}`;
							})
							.join(";\n            ")}
          }`;
				methods.push(
					`${jsdocComment}${field.name}(args?: ${argumentType}): ${result(output, field.type)};`,
				);
			} else {
				methods.push(
					`${jsdocComment}${field.name}(): ${result(output, field.type)};`,
				);
			}
		}
		if (
			rootType instanceof GraphQLObjectType ||
			rootType instanceof GraphQLUnionType ||
			rootType instanceof GraphQLInterfaceType
		) {
			const output = `SelectionSetOutput<BuilderResult, PossibleTypes_${rootType.name}>`;

			if (hasAnyArgs) {
				const argumentType = `{
          ${field.args
						.map((arg) => {
							const optional = arg.type instanceof GraphQLNonNull ? "" : "?";
							return `readonly ${arg.name}${optional}: ${argumentUnion(
								arg.type,
							)} | ${variableUnion(arg.type)}`;
						})
						.join(";\n          ")}
        }`;
				methods.push(
					`${jsdocComment}${field.name}<const BuilderResult extends ${makeSelectionResult(rootType)}>(args: ${argumentType}, builder: (b: Builder_${rootType.name}) => BuilderResult): ${result(output, field.type)};`,
				);
				if (!hasRequiredArg) {
					methods.push(
						`${jsdocComment}${field.name}<const BuilderResult extends ${makeSelectionResult(rootType)}>(builder: (b: Builder_${rootType.name}) => BuilderResult): ${result(output, field.type)};`,
					);
				}
			} else {
				methods.push(
					`${jsdocComment}${field.name}<const BuilderResult extends ${makeSelectionResult(rootType)}>(builder: (b: Builder_${rootType.name}) => BuilderResult): ${result(output, field.type)};`,
				);
			}
		}
	}

	return methods.join("\n  ");
}

function builderFunctionsForInlineFragments(
	_name: string,
	schema: GraphQLSchema,
	type: GraphQLObjectType | GraphQLInterfaceType | GraphQLUnionType,
): string {
	const methods: string[] = [];
	let possibleTypes: Array<
		GraphQLObjectType | GraphQLInterfaceType | GraphQLUnionType
	>;
	if (type instanceof GraphQLObjectType) {
		possibleTypes = [type];
	} else if (type instanceof GraphQLInterfaceType) {
		possibleTypes = [type, ...schema.getPossibleTypes(type)];
	} else if (type instanceof GraphQLUnionType) {
		possibleTypes = [type, ...type.getTypes()];
	} else {
		throw new Error("Expected object, interface, or union type");
	}
	for (const possibleType of possibleTypes) {
		const ptType = `PossibleTypes_${possibleType.name}`;
		methods.push(
			`__on<const Result extends ${makeSelectionResult(possibleType)}>(typeCondition: "${possibleType.name}", builder: (b: Builder_${possibleType.name}) => Result): InlineFragment<${ptType}, "${possibleType.name}", SelectionSetOutput<Result, ${ptType}>>;`,
		);
		methods.push(
			`__fragment<Fragment extends FragmentDefinition>(fragment: Fragment): FragmentSpread<Fragment>;`,
		);
		methods.push(
			`__fragment<Fragment extends FragmentDefinitionWithVariables>(fragment: Fragment, variables: Fragment extends FragmentDefinitionWithVariables<any, any, any, infer V, any> ? V : never): FragmentSpread<Fragment>;`,
		);
	}

	return methods.join("\n  ");
}

function printVariableType(type: GraphQLInputType): string {
	if (type instanceof GraphQLNonNull) {
		return `{
      readonly kind: "non_null";
      readonly inner: ${printVariableType(type.ofType)};
    }`;
	}
	if (type instanceof GraphQLList) {
		return `{
      readonly kind: "list";
      readonly inner: ${printVariableType(type.ofType)};
    }`;
	}
	if (type instanceof GraphQLScalarType) {
		return `{
      readonly kind: "scalar";
      readonly name: "${type.name}";
    }`;
	}
	if (type instanceof GraphQLEnumType) {
		return `{
      readonly kind: "enum";
      readonly name: "${type.name}";
    }`;
	}
	if (type instanceof GraphQLInputObjectType) {
		return `{
      readonly kind: "input_object";
      readonly name: "${type.name}";
    }`;
	}
	throw new Error("Unknown input type");
}

function variableUnion(type: GraphQLInputType): string {
	const union = [];

	if (type instanceof GraphQLNonNull) {
		union.push(printVariableType(type));
		if (type.ofType instanceof GraphQLList) {
			union.push(variableUnion(type.ofType.ofType));
		}
	} else if (type instanceof GraphQLList) {
		union.push(
			`Array<${printVariableType(type.ofType)}>`,
			printVariableType(type),
			printVariableType(new GraphQLNonNull(type)),
		);
	} else {
		union.push(
			printVariableType(type),
			printVariableType(new GraphQLNonNull(type)),
		);
	}

	return union.join(" | ");
}

function makeSelectionResult(type: GraphQLNamedType) {
	let possibleTypes: string;
	if (type instanceof GraphQLObjectType) {
		possibleTypes = `PossibleTypes_${type.name}`;
	} else if (type instanceof GraphQLInterfaceType) {
		possibleTypes = `PossibleTypes_${type.name} | "${type.name}"`;
	} else if (type instanceof GraphQLUnionType) {
		possibleTypes = `PossibleTypes_${type.name} | "${type.name}"`;
	} else {
		throw new Error("Expected object, interface, or union type");
	}
	return `ReadonlyArray<SelectionSetSelection<${possibleTypes}>>`;
}

function buildOperationBuilder(type: GraphQLObjectType): string {
	const { name } = type;
	const selectionSetResult = makeSelectionResult(type);
	return `interface Builder_Operation_${name} {
  <const Result extends ${selectionSetResult}>(name: string, builder: (b: Builder_${name}) => Result): Operation<SelectionSetOutput<Result, "${name}">, {}>;
  <const Result extends ${selectionSetResult}, const Variables extends Record<string, string>>(name: string, variables: Variables, builder: (b: Builder_${name}, v: {
    [K in keyof Variables]: ParseVariableDef<Variables[K]>
  }) => Result): Operation<SelectionSetOutput<Result, "${name}">, {
    [K in keyof Variables]: VariableInput<ParseVariableDef<Variables[K]>>
  }>;
}`;
}

async function generateForSchema(config: SchemaGenerationConfig) {
	let schema: GraphQLSchema;

	if (config.schema instanceof GraphQLSchema) {
		schema = config.schema;
	} else if ("introspect" in config.schema) {
		schema = await loadSchemaFromUrl(config.schema.introspect);
	} else {
		schema = await loadSchemaFromFile(config.schema.sdl);
	}

	const { output } = config;

	// Build the import statement
	const imports = `import type {
  Field,
  InlineFragment,
  FragmentSpread,
  FragmentDefinition,
  FragmentDefinitionWithVariables,
  Operation,
  SelectionSetOutput,
  SelectionOutput,
  SelectionSetSelection,
  EnumValue,
} from "@gqlb/core";`;

	const statements: string[] = [];

	const typeEntries = Object.entries(schema.getTypeMap()).filter(
		([name]) => !name.startsWith("__"),
	);

	console.log(`Parsing ${typeEntries.length} types...`);
	for (const [name, type] of typeEntries) {
		if (
			type instanceof GraphQLObjectType ||
			type instanceof GraphQLInterfaceType
		) {
			if (type instanceof GraphQLObjectType) {
				statements.push(`type PossibleTypes_${name} = "${type.name}";`);
			} else if (type instanceof GraphQLInterfaceType) {
				const possibleTypeNames = schema
					.getPossibleTypes(type)
					.map((t) => `"${t.name}"`);
				statements.push(
					`type PossibleTypes_${name} = ${possibleTypeNames.join(" | ")};`,
				);
			}

			const fieldMethods = methodsForFields(type.getFields());
			const inlineFragmentMethods = builderFunctionsForInlineFragments(
				name,
				schema,
				type,
			);
			statements.push(`interface Builder_${name} {
  ${fieldMethods}
  ${inlineFragmentMethods}
}`);
		} else if (type instanceof GraphQLEnumType) {
			const values = type
				.getValues()
				.map((v) => `"${v.name}"`)
				.join(" | ");
			statements.push(`interface Enum_${name} {
  readonly kind: "enum";
  readonly _input: ${values};
  readonly _output: ${values};
}`);
		} else if (type instanceof GraphQLUnionType) {
			const unionTypes = type
				.getTypes()
				.map((t) => `"${t.name}"`)
				.join(" | ");
			statements.push(`type PossibleTypes_${name} = ${unionTypes};`);

			const inlineFragmentBuilders = builderFunctionsForInlineFragments(
				name,
				schema,
				type,
			);
			statements.push(`interface Builder_${name} {
  ${inlineFragmentBuilders}
}`);
		} else if (type instanceof GraphQLInputObjectType) {
			const properties = Object.values(type.getFields())
				.map((f) => {
					const optional = f.type instanceof GraphQLNonNull ? "" : "?";
					return `readonly ${f.name}${optional}: ${argumentUnion(f.type)};`;
				})
				.join("\n  ");

			statements.push(`interface InputObject_${name} {
  ${properties}
}`);

			const variableProperties = Object.values(type.getFields())
				.map((f) => {
					const optional = f.type instanceof GraphQLNonNull ? "" : "?";
					return `readonly ${f.name}${optional}: ${argumentUnion(f.type)} | ${variableUnion(f.type)};`;
				})
				.join("\n  ");

			statements.push(`interface InputObject_${name}_Variables {
  ${variableProperties}
}`);
		} else if (type instanceof GraphQLScalarType) {
			const scalarTypes = getScalarTypes(config);
			const scalarType = scalarTypes[name] ?? "unknown";
			statements.push(`interface Scalar_${name} {
  readonly kind: "scalar";
  readonly _input: ${scalarType};
  readonly _output: ${scalarType};
}`);
		}
	}
	console.log(`Parsed ${typeEntries.length} types successfully`);

	// Add variable types
	const scalarVariableTypes = Object.values(schema.getTypeMap())
		.filter((t) => t instanceof GraphQLScalarType)
		.map((t) => `readonly ${t.name}: Scalar_${t.name}["_input"];`)
		.join("\n    ");

	statements.push(`type VariableScalarTypes = {
    ${scalarVariableTypes}
  };`);

	const enumVariableTypes = Object.values(schema.getTypeMap())
		.filter((t) => t instanceof GraphQLEnumType && !t.name.startsWith("__"))
		.map((t) => `readonly ${t.name}: Enum_${t.name}["_input"];`)
		.join("\n    ");

	statements.push(`type VariableEnumTypes = {
    ${enumVariableTypes}
  };`);

	const inputObjectVariableTypes = Object.values(schema.getTypeMap())
		.filter((t) => t instanceof GraphQLInputObjectType)
		.map((t) => `readonly ${t.name}: InputObject_${t.name};`)
		.join("\n    ");

	statements.push(`type VariableInputObjectTypes = {
    ${inputObjectVariableTypes}
  };`);

	statements.push(`type ParseVariableDef<T> =
    T extends \`[\${infer Inner}]\`
    ? {
        readonly kind: "list";
        readonly inner: ParseVariableDef<Inner>;
      }
    : T extends \`\${infer Inner}!\`
    ? {
        readonly kind: "non_null";
        readonly inner: ParseVariableDef<Inner>;
      }
    : T extends keyof VariableScalarTypes
    ? {
        readonly kind: "scalar";
        readonly name: T;
        readonly _input: VariableScalarTypes[T];
      }
    : T extends keyof VariableEnumTypes
    ? {
        readonly kind: "enum";
        readonly name: T;
        readonly _input: VariableEnumTypes[T];
      }
    : T extends keyof VariableInputObjectTypes
    ? {
        readonly kind: "input_object";
        readonly name: T;
        readonly _input: VariableInputObjectTypes[T];
      }
    : "Unknown variable type";`);

	statements.push(`export type VariableInput<T> =
    T extends { readonly kind: "non_null"; readonly inner: infer Inner }
    ? Exclude<VariableInput<Inner>, null>
    : T extends { readonly kind: "list"; readonly inner: infer Inner }
    ? ReadonlyArray<VariableInput<Inner>> | null
    : T extends { readonly kind: "scalar"; readonly name: infer Name }
    ? VariableScalarTypes[Name & keyof VariableScalarTypes] | null
    : T extends { readonly kind: "enum"; readonly name: infer Name }
    ? VariableEnumTypes[Name & keyof VariableEnumTypes] | null
    : T extends { readonly kind: "input_object"; readonly name: infer Name }
    ? VariableInputObjectTypes[Name & keyof VariableInputObjectTypes] | null
    : "Unknown variable type";`);

	statements.push(`type AllowNonNullableVariables<T> =
    T extends { readonly kind: "non_null" }
    ? T
    : T extends { readonly kind: "list"; readonly inner: infer Inner }
    ? { readonly kind: "non_null"; readonly inner: Inner }
    : T;`);

	// Generate fragment builder interface
	const fragmentCallSignatures: string[] = [];
	for (const type of Object.values(schema.getTypeMap())) {
		if (
			(type instanceof GraphQLObjectType ||
				type instanceof GraphQLInterfaceType ||
				type instanceof GraphQLUnionType) &&
			!type.name.startsWith("__")
		) {
			const resultConstraint = makeSelectionResult(type);
			let possibleTypes = `Exclude<PossibleTypes_${type.name}, "${type.name}">`;
			if (type instanceof GraphQLObjectType) {
				possibleTypes = `PossibleTypes_${type.name}`;
			}

			fragmentCallSignatures.push(
				`<const Result extends ${resultConstraint}, Name extends string>(name: Name, typeCondition: "${type.name}", builder: (b: Builder_${type.name}) => Result): FragmentDefinition<Name, ${possibleTypes}, "${type.name}", SelectionSetOutput<Result, ${possibleTypes}>>;`,
			);

			fragmentCallSignatures.push(
				`<const Result extends ${resultConstraint}, Name extends string, const Variables extends Record<string, string>>(name: Name, typeCondition: "${type.name}", variables: Variables, builder: (b: Builder_${type.name}, v: {
          [K in keyof Variables]: ParseVariableDef<Variables[K]>
        }) => Result): FragmentDefinitionWithVariables<Name, ${possibleTypes}, "${type.name}", {
          [K in keyof Variables]: AllowNonNullableVariables<ParseVariableDef<Variables[K]>>
        }, SelectionSetOutput<Result, ${possibleTypes}>, {
          [K in keyof Variables]: VariableInput<ParseVariableDef<Variables[K]>>
        }>;`,
			);
		}
	}

	statements.push(`interface Builder_Fragment {
  ${fragmentCallSignatures.join("\n  ")}
}`);

	const rootBuilderTypes: Record<string, string> = {
		fragment: "Builder_Fragment",
	};

	const queryType = schema.getQueryType();
	if (queryType) {
		const iface = buildOperationBuilder(queryType);
		statements.push(iface);
		rootBuilderTypes.query = `Builder_Operation_${queryType.name}`;
	}

	const mutationType = schema.getMutationType();
	if (mutationType) {
		const iface = buildOperationBuilder(mutationType);
		statements.push(iface);
		rootBuilderTypes.mutation = `Builder_Operation_${mutationType.name}`;
	}

	const subscriptionType = schema.getSubscriptionType();
	if (subscriptionType) {
		const iface = buildOperationBuilder(subscriptionType);
		statements.push(iface);
		rootBuilderTypes.subscription = `Builder_Operation_${subscriptionType.name}`;
	}

	const builderTypeEntries = Object.entries(rootBuilderTypes)
		.map(([k, v]) => `readonly ${k}: ${v};`)
		.join("\n  ");

	statements.push(`export type Builder = {
  ${builderTypeEntries}
};`);

	// Generate the module declaration
	const moduleContent = `declare module "./builder" {
  ${statements.join("\n\n  ")}
}`;

	const finalContent = `${imports}

${moduleContent}`;

	const outputDir = path.join(process.cwd(), output);

	await fs.mkdir(outputDir, { recursive: true });
	await fs.writeFile(path.join(outputDir, "builder.d.ts"), finalContent);
	if (config.emitTypes) {
		await fs.writeFile(
			path.join(outputDir, "types.d.ts"),
			await makeTypesFile(schema, config),
		);
	}

	await fs.writeFile(
		path.join(outputDir, "index.ts"),
		`/* eslint-disable */
import type {Builder} from "./builder";
import {builder} from "@gqlb/core"
export const b = builder as any as Builder;
${config.possibleTypes ? makePossibleTypes(schema) : ""}
${config.emitTypes ? `export type { types } from "./types";` : ""}
`,
	);
}

export async function generate() {
	const { generate } = await loadConfig();
	let configs: SchemaGenerationConfig[];
	if (Array.isArray(generate)) {
		configs = generate;
	} else {
		configs = [generate];
	}

	for (const [index, config] of configs.entries()) {
		const name = config.name ?? `schema #${index + 1}`;
		console.log(`Generating types for ${name}:`);
		await generateForSchema(config);
	}
}
