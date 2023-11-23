import { GraphQLObjectType } from "graphql";
import {
  InterfaceDeclarationStructure,
  MethodSignatureStructure,
  StructureKind,
} from "ts-morph";
import { FieldGenerator } from "./FieldGenerator";

export class ObjectGenerator {
  constructor(
    private fieldGenerator: FieldGenerator,
    private inlineFragmentGenerator: InlineFragmentGenerator
  ) {}

  generate(object: GraphQLObjectType): InterfaceDeclarationStructure {
    const methods: MethodSignatureStructure[] = [];
    for (const field of Object.values(object.getFields())) {
      methods.push(...this.fieldGenerator.generate(field));
    }

    return {
      name: `Builder_${object.name}`,
      kind: StructureKind.Interface,
    };
  }
}
