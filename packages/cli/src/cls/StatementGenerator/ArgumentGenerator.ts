import {
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLInputType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLScalarType,
} from "graphql";

export class ArgumentGenerator {
  private printVariableType(type: GraphQLInputType): string {
    if (type instanceof GraphQLNonNull) {
      return `{
        readonly kind: "non_null";
        readonly inner: ${this.printVariableType(type.ofType)};
      }`;
    }
    if (type instanceof GraphQLList) {
      return `{
        readonly kind: "list";
        readonly inner: ${this.printVariableType(type.ofType)};
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

  private argumentUnion(type: GraphQLInputType): string {
    if (type instanceof GraphQLNonNull) {
      return `Exclude<${this.argumentUnion(type.ofType)}, null>`;
    }
    if (type instanceof GraphQLList) {
      return `ReadonlyArray<${this.argumentUnion(type.ofType)}> | null`;
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

  private variableUnion(type: GraphQLInputType): string {
    const union = [];

    if (type instanceof GraphQLNonNull) {
      union.push(this.printVariableType(type));
      if (type.ofType instanceof GraphQLList) {
        union.push(this.variableUnion(type.ofType.ofType));
      }
    } else if (type instanceof GraphQLList) {
      union.push(
        `Array<${this.printVariableType(type.ofType)}>`,
        this.printVariableType(type),
        this.printVariableType(new GraphQLNonNull(type))
      );
    } else {
      union.push(
        this.printVariableType(type),
        this.printVariableType(new GraphQLNonNull(type))
      );
    }

    return union.join(" | ");
  }

  generate(type: GraphQLInputType): string {
    return [this.argumentUnion(type), this.variableUnion(type)].join(" | ");
  }
}
