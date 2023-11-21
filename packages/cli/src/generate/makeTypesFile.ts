import {
  GraphQLEnumType,
  GraphQLField,
  GraphQLFieldConfig,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLOutputType,
  GraphQLScalarType,
  GraphQLSchema,
  GraphQLUnionType,
} from "graphql";
import path from "path";
import {
  ModuleDeclarationKind,
  Project,
  StatementStructures,
  StructureKind,
} from "ts-morph";
import { GQLBConfig } from "..";
import { getScalarTypes } from "../helpers/scalarTypes";
import prettier from "prettier";

function makeTypeString(
  type: GraphQLOutputType,
  parent: GraphQLOutputType | null = null
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

function makeFieldProperty(field: GraphQLField<any, any>) {
  return `readonly ${field.name}: ${makeTypeString(field.type)}`;
}

export async function makeTypesFile(
  schema: GraphQLSchema,
  config: GQLBConfig["generate"][string],
  project: Project,
  output: string
): Promise<string> {
  const file = project.createSourceFile(
    path.join(process.cwd(), output, "types.d.ts")
  );

  const statements: StatementStructures[] = [];

  for (const t of Object.values(schema.getTypeMap())) {
    if (t.name.startsWith("__")) continue;
    if (t instanceof GraphQLObjectType || t instanceof GraphQLInputObjectType) {
      statements.push({
        kind: StructureKind.TypeAlias,
        isExported: true,
        name: t.name,
        type: `{
          ${Object.values(t.getFields())
            .map((f) => makeFieldProperty(f))
            .join("\n")}
          }`,
      });
      continue;
    }
    if (t instanceof GraphQLUnionType) {
      statements.push({
        kind: StructureKind.TypeAlias,
        isExported: true,
        name: t.name,
        type: t
          .getTypes()
          .map((t) => t.name)
          .join(" | "),
      });
      continue;
    }
    if (t instanceof GraphQLScalarType) {
      const scalarTypes = getScalarTypes(config);
      statements.push({
        kind: StructureKind.TypeAlias,
        isExported: true,
        name: t.name,
        type: scalarTypes[t.name] ?? "unknown",
      });
      continue;
    }
    if (t instanceof GraphQLEnumType) {
      statements.push({
        kind: StructureKind.TypeAlias,
        isExported: true,
        name: t.name,
        type: t
          .getValues()
          .map((v) => `'${v.name}'`)
          .join(" | "),
      });
      continue;
    }
    if (t instanceof GraphQLInterfaceType) {
      statements.push({
        kind: StructureKind.TypeAlias,
        isExported: true,
        name: t.name,
        type: `{
          ${Object.values(t.getFields())
            .map((f) => makeFieldProperty(f))
            .join("\n")},
        } & (${schema
          .getPossibleTypes(t)
          .map((t) => t.name)
          .join(" | ")})`,
      });
    }
  }

  file.addStatements([
    {
      kind: StructureKind.Module,
      name: "types",
      isExported: true,
      statements,
      declarationKind: ModuleDeclarationKind.Namespace,
    },
  ]);

  let text = file.getText();

  text = await prettier.format(text, {
    parser: "typescript",
  });

  return text;
}
