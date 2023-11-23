import {
  GraphQLInterfaceType,
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLUnionType,
} from "graphql";

export class SelectionResultGenerator {
  generate(type: GraphQLNamedType) {
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
}
