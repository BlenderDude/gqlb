import { GraphQLInterfaceType, GraphQLSchema, GraphQLUnionType } from "graphql";

export function makePossibleTypes(schema: GraphQLSchema) {
  const possibleTypes = Object.fromEntries(
    Object.values(schema.getTypeMap())
      .filter(
        (t): t is GraphQLInterfaceType | GraphQLUnionType =>
          t instanceof GraphQLInterfaceType || t instanceof GraphQLUnionType
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
      })
  );

  return `export const possibleTypes = ${JSON.stringify(possibleTypes)};`;
}
