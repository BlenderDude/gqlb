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
  ParameterDeclarationStructure,
  Project,
  StatementStructures,
  StructureKind,
  TypeParameterDeclarationStructure,
  VariableDeclarationKind,
} from "ts-morph";

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

function arg(name: string) {
  return process.argv
    .find((arg) => arg.startsWith(`--${name}`))
    ?.split("=", 2)[1];
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

function builderFunctionsForFields(
  name: string,
  fieldMap: GraphQLFieldMap<any, any>
): Record<string, InterfaceDeclarationStructure> {
  const builders: Record<string, InterfaceDeclarationStructure> = {};
  const fields = Object.values(fieldMap);

  for (const field of fields) {
    const ifaceName = `Builder_${name}_field_${field.name}`;
    const iface: InterfaceDeclarationStructure = {
      kind: StructureKind.Interface,
      name: ifaceName,
      callSignatures: [],
    };
    builders[field.name] = iface;

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
      return `FieldOutput<${wrap(output + " | null", type)}, "${field.name}">`;
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
        iface.callSignatures?.push({
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
        iface.callSignatures?.push({
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
        constraint: "readonly [any, ...any[]]",
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
        iface.callSignatures?.push({
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
          iface.callSignatures?.push({
            docs: [comment],
            typeParameters: [builderTypeParameter],
            parameters: [builderArgument],
            returnType: result(output, field.type),
          });
        }
      } else {
        iface.callSignatures?.push({
          docs: [comment],
          typeParameters: [builderTypeParameter],
          parameters: [builderArgument],
          returnType: result(output, field.type),
        });
      }
    }
  }

  return builders;
}

function builderFunctionsForInlineFragments(
  name: string,
  schema: GraphQLSchema,
  type: GraphQLObjectType | GraphQLInterfaceType | GraphQLUnionType
): Record<string, InterfaceDeclarationStructure> {
  const ifaceName = `Builder_${name}_inlineFragment`;
  const iface: InterfaceDeclarationStructure = {
    kind: StructureKind.Interface,
    name: ifaceName,
    callSignatures: [],
  };

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
    iface.callSignatures?.push({
      typeParameters: [
        {
          name: "Result",
          constraint: "readonly [any, ...any[]]",
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
      returnType: `
        {
          readonly kind: "inline_fragment";
          readonly _output: SelectionSetOutput<Result, ${outputPossibleTypes}>;
          readonly typeCondition: "${possibleType}";
          readonly possibleTypes: ${outputPossibleTypes};
        }
      `,
    });
  }

  return { __on: iface };
}

function buildObject(obj: Record<string, string>) {
  let objCode = "{";
  for (const [name, code] of Object.entries(obj)) {
    objCode += `readonly ${name}: ${code};\n`;
  }
  return objCode + "}";
}

function generateSelectionSetOutput() {
  return fs.readFile(path.join(__dirname, "output.ts"), "utf-8");
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

function buildOperationBuilder(
  type: GraphQLObjectType
): InterfaceDeclarationStructure {
  const { name } = type;
  return {
    kind: StructureKind.Interface,
    name: "Builder_Operation_" + name,
    callSignatures: [
      {
        typeParameters: [
          {
            name: "Result",
            constraint: "readonly [any, ...any[]]",
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
        returnType: `{
          document: () => TypedDocumentNode<SelectionSetOutput<Result, "${name}">, {}>;
          _output: SelectionSetOutput<Result, "${name}">;
        }`,
      },
      {
        typeParameters: [
          {
            name: "Result",
            constraint: "readonly [any, ...any[]]",
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
        returnType: `{
          document: () => TypedDocumentNode<SelectionSetOutput<Result, "${name}">, {
            [K in keyof Variables]: VariableInput<ParseVariableDef<Variables[K]>>;
          }>;
          _output: SelectionSetOutput<Result, "${name}">;
        }`,
      },
    ],
  };
}

async function main() {
  const schemaUrl = arg("url");
  const schemaPath = arg("path");
  let schema: GraphQLSchema;
  if (schemaUrl) {
    schema = await loadSchemaFromUrl(schemaUrl);
  } else if (schemaPath) {
    schema = await loadSchemaFromFile(schemaPath);
  } else {
    throw new Error("Expected --url or --path");
  }

  const output = arg("output");
  if (!output) {
    throw new Error("Expected --output");
  }

  const file = project.createSourceFile(
    path.join(process.cwd(), output),
    undefined,
    {
      overwrite: true,
    }
  );

  const pathToRuntime = path.relative(
    path.dirname(path.join(process.cwd(), output)),
    path.join(process.cwd(), "src", "runtime.ts")
  );

  file.addImportDeclaration({
    moduleSpecifier: "./" + pathToRuntime.replace(".ts", ""),
    namedImports: ["builder as builderRuntime"],
  });

  file.addImportDeclaration({
    moduleSpecifier: "@graphql-typed-document-node/core",
    namedImports: ["TypedDocumentNode"],
  });

  file.insertText(file.getEnd(), await generateSelectionSetOutput());

  file.insertText(
    file.getEnd(),
    `type FieldOutput<T, Name, Alias extends string | undefined = undefined> = {
      readonly kind: "field";
      readonly _output: T;
      readonly name: Name;
      readonly _alias: Alias;
      setAlias<Alias extends string>(alias: Alias): FieldOutput<T, Name, Alias>;
    }`
  );

  const statements: StatementStructures[] = [];

  const typeEntries = Object.entries(schema.getTypeMap()).filter(
    ([name]) => !name.startsWith("__")
  );

  console.log(`Parsing ${typeEntries.length} types...`);
  let completed = 0;

  for (const [name, type] of typeEntries) {
    completed++;
    console.log(
      `${completed
        .toString()
        .padStart(Math.ceil(Math.log10(typeEntries.length)), "0")}/${
        typeEntries.length
      } Parsing type ${name} `
    );

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

      const fieldBuilders = builderFunctionsForFields(name, type.getFields());
      const inlineFragmentBuilders = builderFunctionsForInlineFragments(
        name,
        schema,
        type
      );
      const builders: Record<string, string> = {};
      for (const b in fieldBuilders) {
        builders[b] = fieldBuilders[b].name;
      }
      for (const b in inlineFragmentBuilders) {
        builders[b] = inlineFragmentBuilders[b].name;
      }
      statements.push(
        ...Object.values(fieldBuilders),
        ...Object.values(inlineFragmentBuilders)
      );
      statements.push({
        kind: StructureKind.TypeAlias,
        name: `Builder_${name}`,
        type: buildObject(builders),
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
      statements.push(...Object.values(inlineFragmentBuilders));
      statements.push({
        kind: StructureKind.TypeAlias,
        name: `Builder_${name}`,
        type: buildObject(builders),
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
      // TODO make this more generic
      const baseTypes: Record<string, string> = {
        String: "string",
        Int: "number",
        Float: "number",
        Boolean: "boolean",
        ID: "string | number",
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
      : "Unknown variable type";
    `,
  });

  statements.push({
    kind: StructureKind.TypeAlias,
    name: "VariableInput",
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
      : "Unknown variable type";
    `,
  });

  const fragmentBuilderIfaceName = "Builder_Fragment";

  statements.push({
    kind: StructureKind.Interface,
    name: fragmentBuilderIfaceName,
    callSignatures: Object.values(schema.getTypeMap())
      .map((type): CallSignatureDeclarationStructure | undefined => {
        const resultTypeParameter = {
          name: "Result",
          constraint: "readonly [any, ...any[]]",
        };
        if (
          type instanceof GraphQLObjectType ||
          type instanceof GraphQLInterfaceType ||
          type instanceof GraphQLUnionType
        ) {
          if (type.name.startsWith("__")) {
            return undefined;
          }
          let possibleTypes = `Exclude<PossibleTypes_${type.name}, "${type.name}">`;
          if (type instanceof GraphQLObjectType) {
            possibleTypes = `PossibleTypes_${type.name}`;
          }
          return {
            kind: StructureKind.CallSignature,
            typeParameters: [resultTypeParameter],
            parameters: [
              {
                name: "name",
                type: "string",
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
            returnType: `{
              readonly kind: "fragment_definition";
              readonly _output: SelectionSetOutput<Result, ${possibleTypes}>;
              readonly typeCondition: "${type}";
              readonly possibleTypes: ${possibleTypes};
            }`,
          };
        }
        return undefined;
      })
      .filter((x): x is NonNullable<typeof x> => x !== undefined),
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
  });

  statements.push({
    kind: StructureKind.VariableStatement,
    isExported: true,
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
      {
        name: "b",
        initializer: "builderRuntime as any",
        type: "Builder",
      },
    ],
  });

  statements.push({
    kind: StructureKind.TypeAlias,
    isExported: true,
    name: "OutputOf",
    typeParameters: [
      {
        name: "T",
      },
    ],
    type: "T extends { readonly _output: infer Inner } ? Inner : never",
  });

  file.addStatements(statements);

  const diag = file.getPreEmitDiagnostics();
  const text = file.getFullText();

  if (diag.length > 0) {
    for (const d of diag) {
      const code = text.slice(d.getStart()!, d.getStart()! + d.getLength()!);
      console.log(code, " > ", d.getMessageText());
    }
  }
  console.log("Making it pretty!");

  const code = await prettier.format(file.getFullText(), {
    parser: "typescript",
  });

  const outputPath = path.join(process.cwd(), output);

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, code);
  console.log("Done!");
}

void main();
