import {
  ArgumentNode,
  DocumentNode,
  FieldNode,
  FragmentDefinitionNode,
  InlineFragmentNode,
  Kind,
  NameNode,
  OperationTypeNode,
  SelectionNode,
  SelectionSetNode,
  ValueNode,
  VariableDefinitionNode,
  VariableNode,
  parseType,
} from "graphql";

type Field_ArgumentsArg = Record<string, unknown>;
type Field_BuilderArg = (b: BuilderObject) => BuilderOutput;
type Field_AliasArg = string;

type BuilderObject_Field = (
  arg1?: Field_ArgumentsArg | Field_BuilderArg | Field_AliasArg,
  arg2?: Field_BuilderArg | Field_AliasArg,
  arg3?: Field_AliasArg
) => [FieldNode, FragmentMap];

type BuilderObject_Inline = (
  typeCondition: string,
  builder: Field_BuilderArg
) => [InlineFragmentNode, FragmentMap];

type BuilderObject = {
  [fieldName: string]: BuilderObject_Field;
} & {
  __on: BuilderObject_Inline;
};

type FragmentMap = Map<string, FragmentDefinitionNode>;

type BuilderOutput = ReadonlyArray<
  [SelectionNode, FragmentMap] | [FragmentDefinitionNode, FragmentMap]
>;

function buildSelectionSet(
  output: BuilderOutput
): [SelectionSetNode, FragmentMap] {
  const fragments: FragmentMap = new Map();
  const selections: SelectionNode[] = [
    {
      kind: Kind.FIELD,
      name: {
        kind: Kind.NAME,
        value: "__typename",
      },
    },
  ];
  for (const [elem, f] of output) {
    for (const [k, v] of f) {
      fragments.set(k, v);
    }
    if (elem.kind === Kind.FRAGMENT_DEFINITION) {
      selections.push({
        kind: Kind.FRAGMENT_SPREAD,
        name: elem.name,
      });
      fragments.set(elem.name.value, elem);
      continue;
    }
    selections.push(elem);
  }
  return [
    {
      kind: Kind.SELECTION_SET,
      selections,
    },
    fragments,
  ];
}

function makeValueNode(value: unknown): ValueNode {
  if (value === null) {
    return {
      kind: Kind.NULL,
    };
  }
  if (typeof value === "string") {
    return {
      kind: Kind.STRING,
      value,
    };
  }
  if (typeof value === "number") {
    return {
      kind: Kind.INT,
      value: value.toString(),
    };
  }
  if (typeof value === "boolean") {
    return {
      kind: Kind.BOOLEAN,
      value,
    };
  }
  if (Array.isArray(value)) {
    return {
      kind: Kind.LIST,
      values: value.map((v) => makeValueNode(v)),
    };
  }
  if (typeof value === "object") {
    if (variableSymbol in value) {
      return value[variableSymbol] as VariableNode;
    }
    return {
      kind: Kind.OBJECT,
      fields: Object.entries(value).map(([name, value]) => ({
        kind: Kind.OBJECT_FIELD,
        name: {
          kind: Kind.NAME,
          value: name,
        },
        value: makeValueNode(value),
      })),
    };
  }
  throw new Error(`Unsupported value: ${value}`);
}

function makeBuilderObject(): BuilderObject {
  return new Proxy(
    {},
    {
      get(_, prop) {
        if (prop === "__on") {
          const builder: BuilderObject_Inline = (typeCondition, builder) => {
            const [selectionSet, fragments] = buildSelectionSet(
              builder(makeBuilderObject())
            );
            return [
              {
                kind: Kind.INLINE_FRAGMENT,
                typeCondition: {
                  kind: Kind.NAMED_TYPE,
                  name: {
                    kind: Kind.NAME,
                    value: typeCondition,
                  },
                },
                selectionSet,
              },
              fragments,
            ];
          };
          return builder;
        }
        const builder: BuilderObject_Field = (arg1, arg2, arg3) => {
          let builder: Field_BuilderArg | undefined = undefined;
          let args: Field_ArgumentsArg | undefined = undefined;
          let alias: Field_AliasArg | undefined = undefined;
          if (typeof arg1 === "object") {
            args = arg1;
            if (typeof arg2 === "string") {
              alias = arg2;
            } else {
              builder = arg2;
              alias = arg3;
            }
          } else if (arg1 instanceof Function) {
            builder = arg1;
            if (typeof arg2 === "string") {
              alias = arg2;
            }
          }

          const argumentNodes: ArgumentNode[] = [];
          if (args) {
            for (const [name, value] of Object.entries(args)) {
              argumentNodes.push({
                kind: Kind.ARGUMENT,
                name: {
                  kind: Kind.NAME,
                  value: name,
                },
                value: makeValueNode(value),
              });
            }
          }

          let selectionSet: SelectionSetNode | undefined = undefined;
          let fragments: FragmentMap = new Map();
          if (builder) {
            const result = buildSelectionSet(builder(makeBuilderObject()));
            selectionSet = result[0];
            fragments = result[1];
          }

          let aliasNode: NameNode | undefined = undefined;
          if (alias) {
            aliasNode = {
              kind: Kind.NAME,
              value: alias,
            };
          }

          return [
            {
              kind: Kind.FIELD,
              name: {
                kind: Kind.NAME,
                value: prop as string,
              },
              arguments: argumentNodes,
              selectionSet,
              alias: aliasNode,
            },
            fragments,
          ];
        };
        return builder;
      },
    }
  ) as any;
}

const variableSymbol = Symbol.for("variable");

type Operation_VariablesArg = Record<string, string>;
type Operation_BuilderArg = (
  b: BuilderObject,
  variables: Record<string, { [variableSymbol]: VariableNode }>
) => BuilderOutput;

function makeOperationBuilder(type: OperationTypeNode) {
  return function builderOperation(
    name: string,
    arg1: Operation_VariablesArg | Operation_BuilderArg,
    arg2?: Operation_BuilderArg
  ): { document: () => DocumentNode } {
    const variableDefinitions: VariableDefinitionNode[] = [];
    const variables: Record<string, { [variableSymbol]: VariableNode }> = {};
    let builder: Operation_BuilderArg;
    if (typeof arg1 === "object") {
      for (const [name, type] of Object.entries(arg1)) {
        variableDefinitions.push({
          kind: Kind.VARIABLE_DEFINITION,
          variable: {
            kind: Kind.VARIABLE,
            name: {
              kind: Kind.NAME,
              value: name,
            },
          },
          type: parseType(type, {
            noLocation: true,
          }),
        });
      }
      builder = arg2!;
      for (const def of variableDefinitions) {
        variables[def.variable.name.value] = { [variableSymbol]: def.variable };
      }
    } else {
      builder = arg1;
    }

    let builtDocument: DocumentNode | undefined = undefined;

    return {
      document() {
        if (builtDocument) {
          return builtDocument;
        }
        const [selectionSet, fragments] = buildSelectionSet(
          builder(makeBuilderObject(), variables)
        );
        builtDocument = {
          kind: Kind.DOCUMENT,
          definitions: [
            ...fragments.values(),
            {
              kind: Kind.OPERATION_DEFINITION,
              name: {
                kind: Kind.NAME,
                value: name,
              },
              operation: type,
              variableDefinitions,
              selectionSet,
            },
          ],
        };
        return builtDocument;
      },
    };
  };
}

function makeFragmentBuilder() {
  return function (
    name: string,
    typeCondition: string,
    builder: (b: BuilderObject) => BuilderOutput
  ): [FragmentDefinitionNode, FragmentMap] {
    const [selectionSet, fragments] = buildSelectionSet(
      builder(makeBuilderObject())
    );
    const result = [
      {
        kind: Kind.FRAGMENT_DEFINITION,
        name: {
          kind: Kind.NAME,
          value: name,
        },
        typeCondition: {
          kind: Kind.NAMED_TYPE,
          name: {
            kind: Kind.NAME,
            value: typeCondition,
          },
        },
        selectionSet,
      },
      fragments,
    ] as const;

    (result as any).document = () => {
      const [fragment, fragments] = result;
      return {
        kind: Kind.DOCUMENT,
        definitions: [...fragments.values(), fragment],
      };
    };

    (result as any).name = name;

    return result as any;
  };
}

export const builder = {
  query: makeOperationBuilder(OperationTypeNode.QUERY),
  mutation: makeOperationBuilder(OperationTypeNode.MUTATION),
  subscription: makeOperationBuilder(OperationTypeNode.SUBSCRIPTION),
  fragment: makeFragmentBuilder(),
};
