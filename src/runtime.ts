import type { TypedDocumentNode } from "@graphql-typed-document-node/core";
import {
  parseType,
  type ArgumentNode,
  type FieldNode,
  type FragmentDefinitionNode,
  type FragmentSpreadNode,
  type InlineFragmentNode,
  type Kind,
  type OperationTypeNode,
  type VariableDefinitionNode,
  type VariableNode,
  ValueNode,
  SelectionSetNode,
  SelectionNode,
  print,
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

type BuilderObject_Fragment = (
  fragment: FragmentDefinition | FragmentDefinitionWithVariables,
  variables?: Record<
    string,
    {
      [variableSymbol]: VariableNode;
    }
  >
) => FragmentDefinition | FragmentDefinitionWithVariables;

type BuilderObject = {
  [fieldName: string]: BuilderObject_Field;
} & {
  __on: BuilderObject_Inline;
  __fragment: BuilderObject_Fragment;
};

class FragmentMap extends Map<
  string,
  FragmentDefinition | FragmentDefinitionWithVariables
> {
  constructor() {
    super();
  }

  set(
    name: string,
    fragment: FragmentDefinition | FragmentDefinitionWithVariables
  ) {
    const existing = this.get(name);

    if (
      existing?.name === fragment.name &&
      fragment instanceof FragmentDefinitionWithVariables &&
      existing instanceof FragmentDefinitionWithVariables
    ) {
      const variables = new Set<string>(
        Object.values(fragment["variables"]).map(
          (v) => v[variableSymbol].name.value
        )
      );
      for (const v of Object.values(existing["variables"]).map(
        (v) => v[variableSymbol].name.value
      )) {
        if (!variables.has(v)) {
          throw new Error(
            `Fragment with name ${fragment.name} already exists with different variables`
          );
        }
        variables.delete(v);
      }
      if (variables.size > 0) {
        throw new Error(
          `Fragment with name ${fragment.name} already exists with different variables`
        );
      }
    } else if (
      existing &&
      JSON.stringify(existing) !== JSON.stringify(fragment)
    ) {
      const lines = [
        `Fragment with name ${fragment.name} already exists with a different structure:`,
        `Existing:\n${print(existing.definition())}`,
        `Incoming:\n${print(fragment.definition())}`,
      ];
      throw new Error(lines.join("\n"));
    }

    super.set(fragment.name, fragment);
    return this;
  }
}

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
  abstract subFragments(): FragmentMap;

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
    nodes.push(
      ...selections.map((s) => {
        if (
          s instanceof FragmentDefinition ||
          s instanceof FragmentDefinitionWithVariables
        ) {
          return s.spread();
        }
        return s.document();
      })
    );

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

  subFragments(): FragmentMap {
    const map = new FragmentMap();
    for (const selection of this.selections ?? []) {
      for (const [name, fragment] of selection.subFragments()) {
        map.set(name, fragment);
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
  public readonly _possibleTypes!: PossibleTypes;

  constructor(
    public readonly typeCondition: TypeCondition,
    private selections: ReadonlyArray<SelectionSetSelection>
  ) {
    super();
  }

  subFragments(): FragmentMap {
    const map = new FragmentMap();
    for (const selection of this.selections) {
      for (const [name, fragment] of selection.subFragments()) {
        map.set(name, fragment);
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
  public readonly _possibleTypes!: PossibleTypes;

  constructor(
    public readonly name: string,
    public readonly typeCondition: TypeCondition,
    private selections: ReadonlyArray<SelectionSetSelection>
  ) {
    super();
  }

  subFragments(): FragmentMap {
    const map = new FragmentMap();
    map.set(this.name, this);
    for (const selection of this.selections) {
      for (const [name, fragment] of selection.subFragments()) {
        map.set(name, fragment);
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

  document(): TypedDocumentNode<Output, any> {
    const fragments = [...this.subFragments().values()];
    return {
      kind: "Document" as Kind.DOCUMENT,
      definitions: [...fragments.map((f) => f.definition())],
    };
  }

  spread(): FragmentSpreadNode {
    return {
      kind: "FragmentSpread" as Kind.FRAGMENT_SPREAD,
      name: {
        kind: "Name" as Kind.NAME,
        value: this.name,
      },
    };
  }
}

export class FragmentDefinitionWithVariables<
  const PossibleTypes extends string = any,
  const TypeCondition extends string = any,
  const Variables = any,
  const Output = any,
  const VariableInput = any,
> extends Selection {
  _variables!: Variables;
  private readonly _output!: Output;
  public readonly _possibleTypes!: PossibleTypes;

  constructor(
    public readonly name: string,
    public readonly typeCondition: TypeCondition,
    private variables: Record<
      keyof Variables,
      {
        [variableSymbol]: VariableNode;
      }
    >,
    private builder: (
      variables: Record<
        string,
        {
          [variableSymbol]: VariableNode;
        }
      >
    ) => ReadonlyArray<SelectionSetSelection>
  ) {
    super();
  }

  setVariables(
    variables: Record<
      string,
      {
        [variableSymbol]: VariableNode;
      }
    >
  ): FragmentDefinitionWithVariables {
    const variablesAreEqual = Object.entries(this.variables).every(
      ([name, variable]) => {
        const otherVariable = variables[name];
        if (!otherVariable) {
          return false;
        }
        return (
          otherVariable[variableSymbol].name.value ===
          (
            variable as {
              [variableSymbol]: VariableNode;
            }
          )[variableSymbol].name.value
        );
      }
    );
    if (variablesAreEqual) {
      return this;
    }
    return new FragmentDefinitionWithVariables(
      this.name,
      this.typeCondition,
      Object.fromEntries(
        Object.entries(variables).map(([name, variable]) => {
          return [name, variable];
        })
      ),
      this.builder
    );
  }

  subFragments(): FragmentMap {
    const map = new FragmentMap();
    map.set(this.name, this);
    for (const selection of this.builder(this.variables)) {
      for (const [name, fragment] of selection.subFragments()) {
        map.set(name, fragment);
      }
    }
    return map;
  }

  definition(
    variableNameOverride: Record<string, string> = {}
  ): FragmentDefinitionNode {
    const variables = {
      ...this.variables,
      ...Object.fromEntries(
        Object.entries(variableNameOverride).map(([name, newName]) => {
          return [
            newName,
            {
              [variableSymbol]: {
                kind: "Variable" as Kind.VARIABLE,
                name: {
                  kind: "Name" as Kind.NAME,
                  value: name,
                },
              },
            },
          ];
        })
      ),
    };
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
      selectionSet: this.createSelectionSet(this.builder(variables))!,
    };
  }

  document(): TypedDocumentNode<Output, VariableInput> {
    const fragments = [...this.subFragments().values()];
    return {
      kind: "Document" as Kind.DOCUMENT,
      definitions: [...fragments.map((f) => f.definition())],
    };
  }

  spread(): FragmentSpreadNode {
    return {
      kind: "FragmentSpread" as Kind.FRAGMENT_SPREAD,
      name: {
        kind: "Name" as Kind.NAME,
        value: this.name,
      },
    };
  }
}

export class FragmentSpread<
  F extends FragmentDefinition | FragmentDefinitionWithVariables,
> extends Selection {
  constructor(public readonly def: F) {
    super();
  }

  subFragments(): FragmentMap {
    return this.def.subFragments();
  }

  document(): FragmentSpreadNode {
    return {
      kind: "FragmentSpread" as Kind.FRAGMENT_SPREAD,
      name: {
        kind: "Name" as Kind.NAME,
        value: this.def.name,
      },
    };
  }
}

export class Operation<const Output = any, const Variables = any> {
  constructor(
    public readonly name: string,
    public readonly type: "query" | "mutation" | "subscription",
    public readonly variableDefinitions: ReadonlyArray<VariableDefinitionNode>,
    public readonly selections: ReadonlyArray<SelectionSetSelection>
  ) {}

  document(): TypedDocumentNode<Output, Variables> {
    const fragments = new FragmentMap();
    const variables = Object.fromEntries(
      this.variableDefinitions.map((def) => {
        return [
          def.variable.name.value,
          {
            [variableSymbol]: def.variable,
          },
        ];
      })
    );
    for (const selection of this.selections) {
      for (const fragment of selection.subFragments().values()) {
        fragments.set(fragment.name, fragment);
      }
    }
    return {
      kind: "Document" as Kind.DOCUMENT,
      definitions: [
        ...Array.from(fragments.values()).map((f) => f.definition()),
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
            selections: this.selections.map((s) => {
              if (
                s instanceof FragmentDefinition ||
                s instanceof FragmentDefinitionWithVariables
              ) {
                return s.spread();
              }
              return s.document();
            }),
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
        if (prop === "__fragment") {
          const builder: BuilderObject_Fragment = (fragment, variables) => {
            if (
              fragment instanceof FragmentDefinitionWithVariables &&
              variables
            ) {
              return fragment.setVariables(variables);
            }
            return fragment;
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

type Fragment_BuilderArg = (
  b: BuilderObject,
  v?: Record<
    string,
    {
      [variableSymbol]: VariableNode;
    }
  >
) => ReadonlyArray<SelectionSetSelection>;
type Fragment_VariablesArg = Record<string, string>;

function makeFragmentBuilder() {
  return function (
    name: string,
    typeCondition: string,
    arg3: Fragment_BuilderArg | Fragment_VariablesArg,
    arg4?: Fragment_BuilderArg
  ): FragmentDefinition | FragmentDefinitionWithVariables {
    let builder: Fragment_BuilderArg;
    let variables:
      | Record<
          string,
          {
            [variableSymbol]: VariableNode;
          }
        >
      | undefined = undefined;
    if (typeof arg3 === "object") {
      variables = Object.fromEntries(
        Object.keys(arg3).map((name) => {
          return [
            name,
            {
              [variableSymbol]: {
                kind: "Variable" as Kind.VARIABLE,
                name: {
                  kind: "Name" as Kind.NAME,
                  value: name,
                },
              },
            },
          ];
        })
      );
      builder = arg4!;
    } else {
      builder = arg3;
    }
    if (variables) {
      return new FragmentDefinitionWithVariables(
        name,
        typeCondition,
        variables,
        (v) => builder(makeBuilderObject(), v)
      );
    }
    const selections = builder(makeBuilderObject(), variables);
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
