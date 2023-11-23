import {
  GraphQLEnumType,
  GraphQLField,
  GraphQLInterfaceType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLOutputType,
  GraphQLScalarType,
  GraphQLUnionType,
} from "graphql";
import {
  JSDocStructure,
  MethodSignatureStructure,
  ParameterDeclarationStructure,
  StructureKind,
  TypeParameterDeclarationStructure,
} from "ts-morph";
import { SelectionResultGenerator } from "./SelectionResultGenerator";
import { ArgumentGenerator } from "./ArgumentGenerator";

export class FieldGenerator {
  constructor(
    private readonly selectionResultGenerator: SelectionResultGenerator,
    private readonly argumentGenerator: ArgumentGenerator
  ) {}

  private resolveToRootType(type: GraphQLOutputType): GraphQLOutputType {
    if (type instanceof GraphQLNonNull || type instanceof GraphQLList) {
      return this.resolveToRootType(type.ofType);
    }
    return type;
  }

  generate(field: GraphQLField<any, any>): MethodSignatureStructure[] {
    const methods: MethodSignatureStructure[] = [];

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

    const rootType = this.resolveToRootType(field.type);
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
                return `readonly ${
                  arg.name
                }${optional}: ${this.argumentGenerator.generate(rootType)}`;
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
        constraint: this.selectionResultGenerator.generate(rootType),
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
                return `readonly ${
                  arg.name
                }${optional}: ${this.argumentGenerator.generate(arg.type)}`;
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

    return methods;
  }
}
