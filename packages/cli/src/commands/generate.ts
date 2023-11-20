import fs from "fs/promises";
import {
  GraphQLEnumType,
  GraphQLFieldMap,
  GraphQLInputObjectType,
  GraphQLInputType,
  GraphQLInterfaceType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLOutputType,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLType,
  GraphQLUnionType,
  IntrospectionQuery,
  buildClientSchema,
  buildSchema,
  getIntrospectionQuery,
} from "graphql";
import request from "graphql-request";
import path from "path";
import prettier from "prettier";
import {
  CallSignatureDeclarationStructure,
  InterfaceDeclarationStructure,
  JSDocStructure,
  MethodSignatureStructure,
  ModuleDeclarationKind,
  ParameterDeclarationStructure,
  Project,
  StatementStructures,
  StructureKind,
  TypeParameterDeclarationStructure,
} from "ts-morph";
import { z } from "zod";
import { loadConfig, schema } from "../helpers/config";

function resolveToRootType(type: GraphQLType) {
  if (type instanceof GraphQLList || type instanceof GraphQLNonNull) {
    return resolveToRootType(type.ofType);
  }
  return type;
}

const project = new Project({
  compilerOptions: {
    strict: true,
  },
});

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
    return `Enum_${type.name}["_input"] | null`;
  }
  if (type instanceof GraphQLInputObjectType) {
    return `InputObject_${type.name}_Variables | null`;
  }
  throw new Error("Unknown input type");
}

function methodsForFields(
  fieldMap: GraphQLFieldMap<any, any>
): MethodSignatureStructure[] {
  const methods: MethodSignatureStructure[] = [];
  const fields = Object.values(fieldMap);

  for (const field of fields) {
    // const ifaceName = `Builder_${name}_field_${field.name}`;
    // const iface: InterfaceDeclarationStructure = {
    //   kind: StructureKind.Interface,
    //   name: ifaceName,
    //   callSignatures: [],
    // };

    // builders[field.name] = iface;

    const comment: JSDocStructure = {
      kind: StructureKind.JSDoc,
      description: field.description ?? "",
      tags: [],
    };
    if (field.deprecationReason) {
      comment.tags?.push({
        tagName: "deprecated",
        text: field.deprecationReason,
      });
    }

    const rootType = resolveToRootType(field.type);
    const hasRequiredArg = field.args.some(
      (arg) => arg.type instanceof GraphQLNonNull
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
        output + " | null",
        type
      )}>`;
    };

    if (
      rootType instanceof GraphQLScalarType ||
      rootType instanceof GraphQLEnumType
    ) {
      let output;
      if (rootType instanceof GraphQLEnumType) {
        output = `Enum_${rootType.name}["_output"]`;
      } else if (rootType instanceof GraphQLScalarType) {
        output = `Scalar_${rootType.name}["_output"]`;
      } else {
        throw new Error("Expected scalar or enum type");
      }

      if (hasAnyArgs) {
        const argumentType = `{
            ${field.args.map((arg) => {
              const optional = arg.type instanceof GraphQLNonNull ? "" : "?";
              return `readonly ${arg.name}${optional}: ${argumentUnion(
                arg.type
              )} | ${variableUnion(arg.type)}`;
            })}
          }`;
        methods.push({
          kind: StructureKind.MethodSignature,
          name: field.name,
          docs: [comment],
          parameters: [
            {
              name: "args",
              type: argumentType,
              hasQuestionToken: true,
            },
          ],
          returnType: result(output, field.type),
        });
      } else {
        methods.push({
          kind: StructureKind.MethodSignature,
          name: field.name,
          docs: [comment],
          returnType: result(output, field.type),
        });
      }
    }
    if (
      rootType instanceof GraphQLObjectType ||
      rootType instanceof GraphQLUnionType ||
      rootType instanceof GraphQLInterfaceType
    ) {
      const builderTypeParameter: TypeParameterDeclarationStructure = {
        kind: StructureKind.TypeParameter,
        name: "BuilderResult",
        constraint: makeSelectionResult(`PossibleTypes_${rootType.name}`),
        isConst: true,
      };

      const builderArgument: ParameterDeclarationStructure = {
        kind: StructureKind.Parameter,
        name: "builder",
        type: `(b: Builder_${rootType.name}) => BuilderResult`,
      };

      const output = `SelectionSetOutput<BuilderResult, PossibleTypes_${rootType.name}>`;

      if (hasAnyArgs) {
        const argumentType = `{
          ${field.args
            .map((arg) => {
              const optional = arg.type instanceof GraphQLNonNull ? "" : "?";
              return `readonly ${arg.name}${optional}: ${argumentUnion(
                arg.type
              )} | ${variableUnion(arg.type)}`;
            })
            .join(",\n")}
        }`;
        methods.push({
          kind: StructureKind.MethodSignature,
          name: field.name,
          docs: [comment],
          typeParameters: [builderTypeParameter],
          parameters: [
            {
              name: "args",
              type: argumentType,
            },
            builderArgument,
          ],
          returnType: result(output, field.type),
        });
        if (!hasRequiredArg) {
          methods.push({
            kind: StructureKind.MethodSignature,
            name: field.name,
            docs: [comment],
            typeParameters: [builderTypeParameter],
            parameters: [builderArgument],
            returnType: result(output, field.type),
          });
        }
      } else {
        methods.push({
          kind: StructureKind.MethodSignature,
          name: field.name,
          docs: [comment],
          typeParameters: [builderTypeParameter],
          parameters: [builderArgument],
          returnType: result(output, field.type),
        });
      }
    }
  }

  return methods;
}

function builderFunctionsForInlineFragments(
  name: string,
  schema: GraphQLSchema,
  type: GraphQLObjectType | GraphQLInterfaceType | GraphQLUnionType
): MethodSignatureStructure[] {
  const methods: MethodSignatureStructure[] = [];
  let possibleTypes: string[];
  if (type instanceof GraphQLObjectType) {
    possibleTypes = [type.name];
  } else if (type instanceof GraphQLInterfaceType) {
    possibleTypes = [
      type.name,
      ...schema.getPossibleTypes(type).map((t) => t.name),
    ];
  } else if (type instanceof GraphQLUnionType) {
    possibleTypes = [type.name, ...type.getTypes().map((t) => t.name)];
  } else {
    throw new Error("Expected object, interface, or union type");
  }
  for (const possibleType of possibleTypes) {
    let outputPossibleTypes = `Exclude<PossibleTypes_${type.name}, "${type.name}">`;
    if (type instanceof GraphQLObjectType) {
      outputPossibleTypes = `PossibleTypes_${type.name}`;
    }
    methods.push({
      kind: StructureKind.MethodSignature,
      name: "__on",
      typeParameters: [
        {
          name: "Result",
          constraint: makeSelectionResult(`PossibleTypes_${possibleType}`),
          isConst: true,
        },
      ],
      parameters: [
        {
          name: "typeCondition",
          type: `"${possibleType}"`,
        },
        {
          name: "builder",
          type: `(b: Builder_${possibleType}) => Result`,
        },
      ],
      returnType: `InlineFragment<${outputPossibleTypes}, "${possibleType}", SelectionSetOutput<Result, ${outputPossibleTypes}>>`,
    });
    methods.push({
      kind: StructureKind.MethodSignature,
      name: "__fragment",
      typeParameters: [
        {
          name: "Fragment",
          constraint: "FragmentDefinition<any, any, any>",
        },
      ],
      parameters: [
        {
          name: "fragment",
          type: "Fragment",
        },
      ],
      returnType: `FragmentSpread<Fragment>`,
    });
    methods.push({
      kind: StructureKind.MethodSignature,
      name: "__fragment",
      typeParameters: [
        {
          name: "Fragment",
          constraint: "FragmentDefinitionWithVariables<any, any, any>",
        },
      ],
      parameters: [
        {
          name: "fragment",
          type: "Fragment",
        },
        {
          name: "variables",
          type: "Fragment extends FragmentDefinitionWithVariables<any, any, infer V, any> ? V : never",
        },
      ],
      returnType: `FragmentSpread<Fragment>`,
    });
  }

  return methods;
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
      printVariableType(new GraphQLNonNull(type))
    );
  } else {
    union.push(
      printVariableType(type),
      printVariableType(new GraphQLNonNull(type))
    );
  }

  return union.join(" | ");
}

function makeSelectionResult(possibleTypes: string) {
  return `ReadonlyArray<SelectionSetSelection<${possibleTypes}>>`;
}

function buildOperationBuilder(
  type: GraphQLObjectType
): InterfaceDeclarationStructure {
  const { name } = type;
  const selectionSetResult = makeSelectionResult(`PossibleTypes_${name}`);
  return {
    kind: StructureKind.Interface,
    name: "Builder_Operation_" + name,
    callSignatures: [
      {
        typeParameters: [
          {
            name: "Result",
            constraint: selectionSetResult,
            isConst: true,
          },
        ],
        parameters: [
          {
            name: "name",
            type: "string",
          },
          {
            name: "builder",
            type: `(b: Builder_${name}) => Result`,
          },
        ],
        returnType: `Operation<SelectionSetOutput<Result, "${name}">, {}>`,
      },
      {
        typeParameters: [
          {
            name: "Result",
            constraint: selectionSetResult,
            isConst: true,
          },
          {
            name: "Variables",
            constraint: "Record<string, string>",
            isConst: true,
          },
        ],
        parameters: [
          {
            name: "name",
            type: "string",
          },
          {
            name: "variables",
            type: "Variables",
          },
          {
            name: "builder",
            type: `
                (b: Builder_${name}, v: {
                  [K in keyof Variables]: ParseVariableDef<Variables[K]>
                }) => Result
              `,
          },
        ],
        returnType: `Operation<SelectionSetOutput<Result, "${name}">, {
          [K in keyof Variables]: VariableInput<ParseVariableDef<Variables[K]>>
        }>`,
      },
    ],
  };
}

async function generateForSchema(
  name: string,
  config: z.output<typeof schema>["generate"][string]
) {
  let schema: GraphQLSchema;
  if ("introspect" in config.schema) {
    schema = await loadSchemaFromUrl(config.schema.introspect);
  } else {
    schema = await loadSchemaFromFile(config.schema.sdl);
  }

  const { output } = config;

  const file = project.createSourceFile(
    path.join(process.cwd(), output, "types.d.ts"),
    undefined,
    {
      overwrite: true,
    }
  );

  file.addImportDeclaration({
    moduleSpecifier: "@gqlb/core",
    namedImports: [
      "Field",
      "InlineFragment",
      "FragmentSpread",
      "FragmentDefinition",
      "FragmentDefinitionWithVariables",
      "Operation",
      "SelectionSetOutput",
      "SelectionOutput",
      "SelectionSetSelection",
    ],
    isTypeOnly: true,
  });

  const statements: StatementStructures[] = [];

  const typeEntries = Object.entries(schema.getTypeMap()).filter(
    ([name]) => !name.startsWith("__")
  );

  console.log(`Parsing ${typeEntries.length} types...`);
  for (const [name, type] of typeEntries) {
    if (
      type instanceof GraphQLObjectType ||
      type instanceof GraphQLInterfaceType
    ) {
      if (type instanceof GraphQLObjectType) {
        statements.push({
          kind: StructureKind.TypeAlias,
          name: `PossibleTypes_${name}`,
          type: `"${type.name}"`,
        });
      } else if (type instanceof GraphQLInterfaceType) {
        statements.push({
          kind: StructureKind.TypeAlias,
          name: `PossibleTypes_${name}`,
          type: [
            `"${name}"`,
            ...schema.getPossibleTypes(type).map((t) => `"${t.name}"`),
          ].join(" | "),
        });
      }

      const fieldMethods = methodsForFields(type.getFields());
      const inlineFragmentMethods = builderFunctionsForInlineFragments(
        name,
        schema,
        type
      );
      statements.push({
        kind: StructureKind.Interface,
        name: `Builder_${name}`,
        methods: fieldMethods.concat(inlineFragmentMethods),
      });
    } else if (type instanceof GraphQLEnumType) {
      const values = type
        .getValues()
        .map((v) => `"${v.name}"`)
        .join(" | ");
      statements.push({
        kind: StructureKind.Interface,
        name: `Enum_${name}`,
        properties: [
          {
            name: "kind",
            type: `"enum"`,
          },
          {
            name: "_input",
            type: values,
          },
          {
            name: "_output",
            type: values,
          },
        ],
      });
    } else if (type instanceof GraphQLUnionType) {
      statements.push({
        kind: StructureKind.TypeAlias,
        name: `PossibleTypes_${name}`,
        type: [`"${name}"`, ...type.getTypes().map((t) => `"${t.name}"`)].join(
          " | "
        ),
      });

      const inlineFragmentBuilders = builderFunctionsForInlineFragments(
        name,
        schema,
        type
      );
      const builders: Record<string, string> = {};
      for (const b in inlineFragmentBuilders) {
        builders[b] = inlineFragmentBuilders[b].name;
      }
      statements.push({
        kind: StructureKind.Interface,
        name: `Builder_${name}`,
        methods: inlineFragmentBuilders,
      });
    } else if (type instanceof GraphQLInputObjectType) {
      statements.push({
        kind: StructureKind.Interface,
        name: `InputObject_${name}`,
        properties: Object.values(type.getFields()).map((f) => ({
          name: f.name,
          type: argumentUnion(f.type),
          isReadonly: true,
          hasQuestionToken: !(f.type instanceof GraphQLNonNull),
        })),
      });

      statements.push({
        kind: StructureKind.Interface,
        name: `InputObject_${name}_Variables`,
        properties: Object.values(type.getFields()).map((f) => ({
          name: f.name,
          type: `${argumentUnion(f.type)} | ${variableUnion(f.type)}`,
          isReadonly: true,
          hasQuestionToken: !(f.type instanceof GraphQLNonNull),
        })),
      });
    } else if (type instanceof GraphQLScalarType) {
      const { scalarTypes } = config;
      const baseTypes: Record<string, string> = {
        String: "string",
        Int: "number",
        Float: "number",
        Boolean: "boolean",
        ID: "string | number",
        ...scalarTypes,
      };
      statements.push({
        kind: StructureKind.Interface,
        name: `Scalar_${name}`,
        properties: [
          {
            name: "kind",
            type: `"scalar"`,
          },
          {
            name: "_input",
            type: baseTypes[name] ?? "unknown",
          },
          {
            name: "_output",
            type: baseTypes[name] ?? "unknown",
          },
        ],
      });
    }
  }
  console.log(`Parsed ${typeEntries.length} types successfully`);

  statements.push({
    kind: StructureKind.TypeAlias,
    name: "VariableScalarTypes",
    type: `{
      ${Object.values(schema.getTypeMap())
        .filter((t) => t instanceof GraphQLScalarType)
        .map((t) => `readonly ${t.name}: Scalar_${t.name}["_input"]`)
        .join(";\n")}
    }`,
  });

  statements.push({
    kind: StructureKind.TypeAlias,
    name: "VariableEnumTypes",
    type: `{
      ${Object.values(schema.getTypeMap())
        .filter((t) => t instanceof GraphQLEnumType && !t.name.startsWith("__"))
        .map((t) => `readonly ${t.name}: Enum_${t.name}["_input"]`)
        .join(";\n")}
    }`,
  });

  statements.push({
    kind: StructureKind.TypeAlias,
    name: "VariableInputObjectTypes",
    type: `{
      ${Object.values(schema.getTypeMap())
        .filter((t) => t instanceof GraphQLInputObjectType)
        .map((t) => `readonly ${t.name}: InputObject_${t.name}`)
        .join(";\n")}
    }`,
  });

  statements.push({
    kind: StructureKind.TypeAlias,
    name: "ParseVariableDef",
    typeParameters: [
      {
        name: "T",
      },
    ],
    type: `
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
      : "Unknown variable type"
    `,
  });

  statements.push({
    kind: StructureKind.TypeAlias,
    name: "VariableInput",
    isExported: true,
    typeParameters: [{ name: "T" }],
    type: `
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
      : "Unknown variable type"
    `,
  });

  statements.push({
    kind: StructureKind.TypeAlias,
    name: "AllowNonNullableVariables",
    typeParameters: [{ name: "T" }],
    type: `
      T extends { readonly kind: "non_null" }
      ? T
      : T extends { readonly kind: "list"; readonly inner: infer Inner }
      ? { readonly kind: "non_null"; readonly inner: Inner }
      : T
    `,
  });

  const fragmentBuilderIfaceName = "Builder_Fragment";

  statements.push({
    kind: StructureKind.Interface,
    name: fragmentBuilderIfaceName,
    callSignatures: Object.values(schema.getTypeMap())
      .map((type): CallSignatureDeclarationStructure[] => {
        const resultTypeParameter = {
          name: "Result",
          constraint: makeSelectionResult(`PossibleTypes_${type.name}`),
          isConst: true,
        };
        if (
          type instanceof GraphQLObjectType ||
          type instanceof GraphQLInterfaceType ||
          type instanceof GraphQLUnionType
        ) {
          if (type.name.startsWith("__")) {
            return [];
          }
          let possibleTypes = `Exclude<PossibleTypes_${type.name}, "${type.name}">`;
          if (type instanceof GraphQLObjectType) {
            possibleTypes = `PossibleTypes_${type.name}`;
          }
          const callSignatures: CallSignatureDeclarationStructure[] = [];
          callSignatures.push({
            kind: StructureKind.CallSignature,
            typeParameters: [
              resultTypeParameter,
              {
                name: "Name",
                constraint: "string",
              },
            ],
            parameters: [
              {
                name: "name",
                type: "Name",
              },
              {
                name: "typeCondition",
                type: `"${type.name}"`,
              },
              {
                name: "builder",
                type: `(b: Builder_${type.name}) => Result`,
              },
            ],
            returnType: `FragmentDefinition<${possibleTypes}, "${type.name}", SelectionSetOutput<Result, ${possibleTypes}>>`,
          });
          callSignatures.push({
            kind: StructureKind.CallSignature,
            typeParameters: [
              resultTypeParameter,
              {
                name: "Name",
                constraint: "string",
              },
              {
                name: "Variables",
                constraint: "Record<string, string>",
                isConst: true,
              },
            ],
            parameters: [
              {
                name: "name",
                type: "Name",
              },
              {
                name: "typeCondition",
                type: `"${type.name}"`,
              },
              {
                name: "variables",
                type: "Variables",
              },
              {
                name: "builder",
                type: `
                  (b: Builder_${type.name}, v: {
                    [K in keyof Variables]: ParseVariableDef<Variables[K]>
                  }) => Result
                `,
              },
            ],
            returnType: `FragmentDefinitionWithVariables<${possibleTypes}, "${type.name}", {
              [K in keyof Variables]: AllowNonNullableVariables<ParseVariableDef<Variables[K]>>
            }, SelectionSetOutput<Result, ${possibleTypes}>, {
              [K in keyof Variables]: VariableInput<ParseVariableDef<Variables[K]>>
            }>`,
          });
          return callSignatures;
        }
        return [];
      })
      .flat(),
  });

  const rootBuilderTypes: Record<string, string> = {
    fragment: fragmentBuilderIfaceName,
  };

  const queryType = schema.getQueryType();
  if (queryType) {
    const iface = buildOperationBuilder(queryType);
    statements.push(iface);
    rootBuilderTypes.query = iface.name;
  }

  const mutationType = schema.getMutationType();
  if (mutationType) {
    const iface = buildOperationBuilder(mutationType);
    statements.push(iface);
    rootBuilderTypes.mutation = iface.name;
  }

  const subscriptionType = schema.getSubscriptionType();
  if (subscriptionType) {
    const iface = buildOperationBuilder(subscriptionType);
    statements.push(iface);
    rootBuilderTypes.subscription = iface.name;
  }

  statements.push({
    kind: StructureKind.TypeAlias,
    name: "Builder",
    type: `{
      ${Object.entries(rootBuilderTypes)
        .map(([k, v]) => `readonly ${k}: ${v}`)
        .join(";\n")}
    }`,
    isExported: true,
  });

  file.addStatements([
    {
      kind: StructureKind.Module,
      name: `"./types"`,
      hasDeclareKeyword: true,
      declarationKind: ModuleDeclarationKind.Module,
      statements,
    },
  ]);

  const diag = file.getPreEmitDiagnostics();
  let text = file.getFullText();

  // if (diag.length > 0) {
  //   for (const d of diag) {
  //     const code = text.slice(d.getStart()!, d.getStart()! + d.getLength()!);
  //     console.log(`${code} > [${d.getLineNumber()}] ${d.getMessageText()}`);
  //   }
  //   console.log(`Skipping prettier due to ${diag.length} errors`);
  // }

  text = await prettier.format(file.getFullText(), {
    parser: "typescript",
  });

  const outputDir = path.join(process.cwd(), output);

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(path.join(outputDir, "types.d.ts"), text);

  await fs.writeFile(
    path.join(outputDir, "index.ts"),
    await prettier.format(
      `
        /* eslint-disable */
        import type {Builder} from "./types";
        import {builder} from "@gqlb/core"
        export const b = builder as any as Builder;
      `,
      {
        parser: "typescript",
      }
    )
  );
}

export async function generate() {
  const { generate } = await loadConfig();
  for (const [name, config] of Object.entries(generate)) {
    console.log(`Generating types for ${name}...`);
    await generateForSchema(name, config);
  }
}
