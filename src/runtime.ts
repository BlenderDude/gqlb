import {
  ArgumentNode,
  DocumentNode,
  FieldNode,
  FragmentDefinitionNode,
  InlineFragmentNode,
  Kind,
  OperationTypeNode,
  SelectionNode,
  SelectionSetNode,
  VariableDefinitionNode,
  VariableNode,
  parseType,
} from "graphql";

type Field_ArgumentsArg = Record<string, any>;
type Field_BuilderArg = (b: BuilderObject) => BuilderOutput;

type BuilderObject_Field = (
  arg1?: Field_ArgumentsArg | Field_BuilderArg,
  arg2?: Field_BuilderArg
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
        const builder: BuilderObject_Field = (arg1, arg2) => {
          let builder: Field_BuilderArg | undefined = undefined;
          let args: Field_ArgumentsArg | undefined = undefined;
          if (typeof arg1 === "object") {
            args = arg1;
            builder = arg2;
          } else if (arg1 instanceof Function) {
            builder = arg1;
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
                value: value,
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

          return [
            {
              kind: Kind.FIELD,
              name: {
                kind: Kind.NAME,
                value: prop as string,
              },
              arguments: argumentNodes,
              selectionSet,
              setAlias(alias: string) {
                (this as any).alias = {
                  kind: Kind.NAME,
                  value: alias,
                };
                return this;
              },
            },
            fragments,
          ];
        };
        return builder;
      },
    }
  ) as any;
}

type Operation_VariablesArg = Record<string, string>;
type Operation_BuilderArg = (
  b: BuilderObject,
  variables: Record<string, VariableNode>
) => BuilderOutput;

function makeOperationBuilder(type: OperationTypeNode) {
  return function builderOperation(
    name: string,
    arg1: Operation_VariablesArg | Operation_BuilderArg,
    arg2?: Operation_BuilderArg
  ): { document: () => DocumentNode } {
    const variableDefinitions: VariableDefinitionNode[] = [];
    const variables: Record<string, VariableNode> = {};
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
        variables[def.variable.name.value] = def.variable;
      }
    } else {
      builder = arg1;
    }

    return {
      document() {
        const [selectionSet, fragments] = buildSelectionSet(
          builder(makeBuilderObject(), variables)
        );
        return {
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
    return [
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
    ];
  };
}

export const builder = {
  query: makeOperationBuilder(OperationTypeNode.QUERY),
  mutation: makeOperationBuilder(OperationTypeNode.MUTATION),
  subscription: makeOperationBuilder(OperationTypeNode.SUBSCRIPTION),
  fragment: makeFragmentBuilder(),
};
