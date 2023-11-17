import { TypedDocumentNode } from "@graphql-typed-document-node/core";
import {
  parseType,
  type ArgumentNode,
  type FieldNode,
  type FragmentDefinitionNode,
  type FragmentSpreadNode,
  type InlineFragmentNode,
  type Kind,
  type OperationDefinitionNode,
  type OperationTypeNode,
  type VariableDefinitionNode,
  type VariableNode,
  ValueNode,
  SelectionSetNode,
  SelectionNode,
} from "graphql";
import { SelectionSetSelection } from "./helpers";

type Field_ArgumentsArg = Record<string, unknown>;
type Field_BuilderArg = (
  b: BuilderObject
) => ReadonlyArray<SelectionSetSelection>;
type Field_AliasArg = string;

type BuilderObject_Field = (
  arg1?: Field_ArgumentsArg | Field_BuilderArg | Field_AliasArg,
  arg2?: Field_BuilderArg | Field_AliasArg,
  arg3?: Field_AliasArg
) => Field;

type BuilderObject_Inline = (
  typeCondition: string,
  builder: Field_BuilderArg
) => InlineFragment;

type BuilderObject = {
  [fieldName: string]: BuilderObject_Field;
} & {
  __on: BuilderObject_Inline;
};

function makeValueNode(value: unknown): ValueNode {
  if (value === null) {
    return {
      kind: "NullValue" as Kind.NULL,
    };
  }
  if (typeof value === "string") {
    return {
      kind: "StringValue" as Kind.STRING,
      value,
    };
  }
  if (typeof value === "number") {
    return {
      kind: "IntValue" as Kind.INT,
      value: value.toString(),
    };
  }
  if (typeof value === "boolean") {
    return {
      kind: "BooleanValue" as Kind.BOOLEAN,
      value,
    };
  }
  if (Array.isArray(value)) {
    return {
      kind: "ListValue" as Kind.LIST,
      values: value.map((v) => makeValueNode(v)),
    };
  }
  if (typeof value === "object") {
    if (variableSymbol in value) {
      return value[variableSymbol] as VariableNode;
    }
    return {
      kind: "ObjectValue" as Kind.OBJECT,
      fields: Object.entries(value).map(([name, value]) => ({
        kind: "ObjectField" as Kind.OBJECT_FIELD,
        name: {
          kind: "Name" as Kind.NAME,
          value: name,
        },
        value: makeValueNode(value),
      })),
    };
  }
  throw new Error(`Unsupported value: ${value}`);
}

abstract class Selection {
  abstract subFragments(): Map<string, FragmentDefinition<any, any, any>>;

  createSelectionSet(
    selections: ReadonlyArray<SelectionSetSelection>
  ): SelectionSetNode {
    const nodes: SelectionNode[] = [
      {
        kind: "Field" as Kind.FIELD,
        name: {
          kind: "Name" as Kind.NAME,
          value: "__typename",
        },
      },
    ];
    nodes.push(...selections.map((s) => s.document()));

    return {
      kind: "SelectionSet" as Kind.SELECTION_SET,
      selections: nodes,
    };
  }
}

export class Field<
  const Name extends string = any,
  const Alias extends string | undefined = any,
  const Output = any,
> extends Selection {
  private readonly _output!: Output;
  private readonly _alias!: Alias;

  constructor(
    public readonly name: Name,
    public readonly args: ArgumentNode[],
    private selections: ReadonlyArray<SelectionSetSelection> | undefined
  ) {
    super();
  }

  subFragments(): Map<string, FragmentDefinition<any, any, any>> {
    const map = new Map<string, FragmentDefinition<any, any, any>>();
    for (const selection of this.selections ?? []) {
      for (const fragment of selection.subFragments()) {
        map.set(fragment[0], fragment[1]);
      }
    }
    return map;
  }

  alias<A extends string>(name: A): Field<Name, A, Output> {
    (this as any)._alias = name as any;
    return this as any;
  }

  document(): FieldNode {
    return {
      kind: "Field" as Kind.FIELD,
      name: {
        kind: "Name" as Kind.NAME,
        value: this.name,
      },
      alias: this._alias
        ? {
            kind: "Name" as Kind.NAME,
            value: this._alias,
          }
        : undefined,
      arguments: this.args,
      selectionSet: this.selections
        ? this.createSelectionSet(this.selections)
        : undefined,
    };
  }
}

export class InlineFragment<
  const PossibleTypes extends string = any,
  const TypeCondition extends string = any,
  const Output = any,
> extends Selection {
  private readonly _output!: Output;
  private readonly _possibleTypes!: PossibleTypes;

  constructor(
    public readonly typeCondition: TypeCondition,
    private selections: ReadonlyArray<SelectionSetSelection>
  ) {
    super();
  }

  subFragments(): Map<string, FragmentDefinition<any, any, any>> {
    const map = new Map<string, FragmentDefinition<any, any, any>>();
    for (const selection of this.selections) {
      for (const fragment of selection.subFragments()) {
        map.set(fragment[0], fragment[1]);
      }
    }
    return map;
  }

  document(): InlineFragmentNode {
    return {
      kind: "InlineFragment" as Kind.INLINE_FRAGMENT,
      typeCondition: {
        kind: "NamedType" as Kind.NAMED_TYPE,
        name: {
          kind: "Name" as Kind.NAME,
          value: this.typeCondition,
        },
      },
      selectionSet: this.createSelectionSet(this.selections)!,
    };
  }
}

export class FragmentDefinition<
  const PossibleTypes extends string = any,
  const TypeCondition extends string = any,
  const Output = any,
> extends Selection {
  private readonly _output!: Output;
  private readonly _possibleTypes!: PossibleTypes;

  constructor(
    public readonly name: string,
    public readonly typeCondition: TypeCondition,
    private selections: ReadonlyArray<SelectionSetSelection>
  ) {
    super();
  }

  subFragments(): Map<string, FragmentDefinition<any, any, any>> {
    const map = new Map<string, FragmentDefinition<any, any, any>>();
    map.set(this.name, this);
    for (const selection of this.selections) {
      for (const fragment of selection.subFragments()) {
        map.set(fragment[0], fragment[1]);
      }
    }
    return map;
  }

  definition(): FragmentDefinitionNode {
    return {
      kind: "FragmentDefinition" as Kind.FRAGMENT_DEFINITION,
      name: {
        kind: "Name" as Kind.NAME,
        value: this.name,
      },
      typeCondition: {
        kind: "NamedType" as Kind.NAMED_TYPE,
        name: {
          kind: "Name" as Kind.NAME,
          value: this.typeCondition,
        },
      },
      selectionSet: this.createSelectionSet(this.selections)!,
    };
  }

  tdn(): TypedDocumentNode<Output, any> {
    const fragments = [...this.subFragments().values()];
    return {
      kind: "Document" as Kind.DOCUMENT,
      definitions: [...fragments.map((f) => f.definition())],
    };
  }

  document(): FragmentSpreadNode {
    return {
      kind: "FragmentSpread" as Kind.FRAGMENT_SPREAD,
      name: {
        kind: "Name" as Kind.NAME,
        value: this.name,
      },
    };
  }
}

export class Operation<const Output = any, const Variables = any> {
  constructor(
    public readonly name: string,
    public readonly type: "query" | "mutation" | "subscription",
    public readonly variableDefinitions: ReadonlyArray<VariableDefinitionNode>,
    public readonly selectionSet: ReadonlyArray<SelectionSetSelection>
  ) {}

  document(): TypedDocumentNode<Output, Variables> {
    const fragments: FragmentDefinitionNode[] = [];
    for (const selection of this.selectionSet) {
      for (const fragment of selection.subFragments().values()) {
        fragments.push(fragment.definition());
      }
    }
    return {
      kind: "Document" as Kind.DOCUMENT,
      definitions: [
        ...fragments,
        {
          kind: "OperationDefinition" as Kind.OPERATION_DEFINITION,
          name: {
            kind: "Name" as Kind.NAME,
            value: this.name,
          },
          operation: this.type as OperationTypeNode,
          variableDefinitions: this.variableDefinitions,
          selectionSet: {
            kind: "SelectionSet" as Kind.SELECTION_SET,
            selections: this.selectionSet.map((s) => s.document()),
          },
        },
      ],
    };
  }
}

function makeBuilderObject(): BuilderObject {
  return new Proxy(
    {},
    {
      get(_, prop) {
        if (prop === "__on") {
          const builder: BuilderObject_Inline = (typeCondition, builder) => {
            const selections = builder(makeBuilderObject());
            return new InlineFragment(typeCondition, selections);
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
                kind: "Argument" as Kind.ARGUMENT,
                name: {
                  kind: "Name" as Kind.NAME,
                  value: name,
                },
                value: makeValueNode(value),
              });
            }
          }

          let selections: ReadonlyArray<SelectionSetSelection> | undefined =
            undefined;
          if (builder) {
            selections = builder(makeBuilderObject());
          }

          return new Field(prop as string, argumentNodes, selections);
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
) => ReadonlyArray<SelectionSetSelection>;

function makeOperationBuilder(type: OperationTypeNode) {
  return function builderOperation(
    name: string,
    arg1: Operation_VariablesArg | Operation_BuilderArg,
    arg2?: Operation_BuilderArg
  ): Operation {
    const variableDefinitions: VariableDefinitionNode[] = [];
    const variables: Record<string, { [variableSymbol]: VariableNode }> = {};
    let builder: Operation_BuilderArg;
    if (typeof arg1 === "object") {
      for (const [name, type] of Object.entries(arg1)) {
        variableDefinitions.push({
          kind: "VariableDefinition" as Kind.VARIABLE_DEFINITION,
          variable: {
            kind: "Variable" as Kind.VARIABLE,
            name: {
              kind: "Name" as Kind.NAME,
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

    const selections = builder(makeBuilderObject(), variables);
    return new Operation(name, type, variableDefinitions, selections);
  };
}

function makeFragmentBuilder() {
  return function (
    name: string,
    typeCondition: string,
    builder: (b: BuilderObject) => ReadonlyArray<SelectionSetSelection>
  ): FragmentDefinition {
    const selections = builder(makeBuilderObject());
    return new FragmentDefinition(name, typeCondition, selections);
  };
}

export const builder = {
  query: makeOperationBuilder("query" as OperationTypeNode.QUERY),
  mutation: makeOperationBuilder("mutation" as OperationTypeNode.MUTATION),
  subscription: makeOperationBuilder(
    "subscription" as OperationTypeNode.SUBSCRIPTION
  ),
  fragment: makeFragmentBuilder(),
};
