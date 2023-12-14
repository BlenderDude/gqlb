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
  type ValueNode,
  SelectionSetNode,
  SelectionNode,
  print,
} from "graphql";
import { SelectionSetSelection, EnumValueSymbol, EnumValue } from "./helpers";

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
  fragments = new Set<FragmentDefinition | FragmentDefinitionWithVariables>();

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

    this.fragments.add(fragment);
    super.set(fragment.name, fragment);
    return this;
  }

  has(
    nameOrFragment:
      | string
      | FragmentDefinition
      | FragmentDefinitionWithVariables
  ) {
    if (typeof nameOrFragment === "string") {
      return super.has(nameOrFragment);
    }
    return this.fragments.has(nameOrFragment);
  }

  clear(): void {
    throw new Error("Cannot clear fragment map");
  }

  delete(): boolean {
    throw new Error("Cannot delete from fragment map");
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
      block: false,
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
    if (EnumValueSymbol in value) {
      return {
        kind: "EnumValue" as Kind.ENUM,
        value: String(value[EnumValueSymbol]),
      };
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

function createSelectionSet(
  selections: ReadonlyArray<SelectionSetSelection>
): SelectionSetNode {
  const nodes: SelectionNode[] = [
    {
      kind: "Field" as Kind.FIELD,
      arguments: [],
      directives: [],
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

abstract class Selection {
  abstract collectFragments(map: FragmentMap): void;
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

  collectFragments(map: FragmentMap): void {
    for (const selection of this.selections ?? []) {
      selection.collectFragments(map);
    }
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
      directives: [],
      ...(this._alias
        ? {
            alias: {
              kind: "Name" as Kind.NAME,
              value: this._alias,
            },
          }
        : {}),
      arguments: this.args,
      ...(this.selections
        ? { selectionSet: createSelectionSet(this.selections) }
        : {}),
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

  collectFragments(map: FragmentMap): void {
    for (const selection of this.selections) {
      selection.collectFragments(map);
    }
  }

  document(): InlineFragmentNode {
    return {
      kind: "InlineFragment" as Kind.INLINE_FRAGMENT,
      directives: [],
      typeCondition: {
        kind: "NamedType" as Kind.NAMED_TYPE,
        name: {
          kind: "Name" as Kind.NAME,
          value: this.typeCondition,
        },
      },
      selectionSet: createSelectionSet(this.selections)!,
    };
  }
}

class KeyedCache<T> {
  private cache:
    | {
        value: T;
        cacheKey: any[] | undefined;
      }
    | undefined = undefined;

  constructor(private cacheKeyFn: undefined | (() => any[])) {}

  get(): T | undefined {
    const cacheKey = this.cacheKeyFn?.();
    if (!this.cache) {
      return undefined;
    }
    if (cacheKey === undefined && this.cache.cacheKey === undefined) {
      return this.cache.value;
    }
    if (
      cacheKey !== undefined &&
      cacheKey.length !== 0 &&
      cacheKey.every((v, i) => v === this.cache!.cacheKey![i])
    ) {
      return this.cache.value;
    }
    return undefined;
  }
  set(value: T) {
    const cacheKey = this.cacheKeyFn?.();
    this.cache = {
      value,
      cacheKey,
    };
  }
}

export class FragmentDefinition<
  const Name extends string = any,
  const PossibleTypes extends string = any,
  const TypeCondition extends string = any,
  const Output = any,
> extends Selection {
  private readonly _output!: Output;
  public readonly _possibleTypes!: PossibleTypes;

  private cache = new KeyedCache<TypedDocumentNode<Output, {}>>(undefined);

  constructor(
    public readonly name: Name,
    public readonly typeCondition: TypeCondition,
    private selections: () => ReadonlyArray<SelectionSetSelection>
  ) {
    super();
  }

  collectFragments(map: FragmentMap): void {
    if (map.has(this)) {
      return;
    }
    map.set(this.name, this);
    for (const selection of this.selections()) {
      selection.collectFragments(map);
    }
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
      selectionSet: createSelectionSet(this.selections())!,
    };
  }

  document(): TypedDocumentNode<Output, {}> {
    const cached = this.cache.get();
    if (cached) {
      return cached;
    }
    const fragmentMap = new FragmentMap();
    this.collectFragments(fragmentMap);
    const fragments = Array.from(fragmentMap.values());
    const doc: TypedDocumentNode<Output, {}> = {
      kind: "Document" as Kind.DOCUMENT,
      definitions: fragments.map((f) => f.definition()),
    };
    this.cache.set(doc);
    return doc;
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

  dynamic(cacheKey?: () => any[]) {
    this.cache = new KeyedCache(cacheKey ?? (() => []));
    return this;
  }

  static() {
    this.cache = new KeyedCache(undefined);
    return this;
  }
}

export class FragmentDefinitionWithVariables<
  const Name extends string = any,
  const PossibleTypes extends string = any,
  const TypeCondition extends string = any,
  const Variables = any,
  const Output = any,
  const VariableInput = any,
> extends Selection {
  _variables!: Variables;
  private readonly _output!: Output;
  public readonly _possibleTypes!: PossibleTypes;

  private cache = new KeyedCache<TypedDocumentNode<Output, VariableInput>>(
    undefined
  );

  constructor(
    public readonly name: Name,
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

  collectFragments(map: FragmentMap): void {
    if (map.has(this)) {
      return;
    }
    map.set(this.name, this);
    for (const selection of this.builder(this.variables)) {
      selection.collectFragments(map);
    }
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
      selectionSet: createSelectionSet(this.builder(variables))!,
    };
  }

  document(): TypedDocumentNode<Output, VariableInput> {
    const cached = this.cache.get();
    if (cached) {
      return cached;
    }
    const fragmentMap = new FragmentMap();
    this.collectFragments(fragmentMap);

    const doc: TypedDocumentNode<Output, VariableInput> = {
      kind: "Document" as Kind.DOCUMENT,
      definitions: Array.from(fragmentMap.values()).map((f) => f.definition()),
    };
    this.cache.set(doc);
    return doc;
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

  dynamic(cacheKey?: () => any[]) {
    this.cache = new KeyedCache(cacheKey ?? (() => []));
    return this;
  }

  static() {
    this.cache = new KeyedCache(undefined);
    return this;
  }
}

export class FragmentSpread<
  F extends FragmentDefinition | FragmentDefinitionWithVariables,
> extends Selection {
  constructor(public readonly def: F) {
    super();
  }

  collectFragments(map: FragmentMap): void {
    this.def.collectFragments(map);
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
  private cache = new KeyedCache<TypedDocumentNode<Output, Variables>>(
    undefined
  );

  constructor(
    public readonly name: string,
    public readonly type: "query" | "mutation" | "subscription",
    public readonly variableDefinitions: ReadonlyArray<VariableDefinitionNode>,
    public readonly selections: () => ReadonlyArray<SelectionSetSelection>
  ) {}

  document(): TypedDocumentNode<Output, Variables> {
    const cached = this.cache.get();
    if (cached) {
      return cached;
    }
    const fragmentMap = new FragmentMap();
    for (const selection of this.selections()) {
      selection.collectFragments(fragmentMap);
    }
    const document = {
      kind: "Document" as Kind.DOCUMENT,
      definitions: [
        ...Array.from(fragmentMap.values()).map((f) => f.definition()),
        {
          directives: [],
          kind: "OperationDefinition" as Kind.OPERATION_DEFINITION,
          name: {
            kind: "Name" as Kind.NAME,
            value: this.name,
          },
          operation: this.type as OperationTypeNode,
          variableDefinitions: this.variableDefinitions,
          selectionSet: createSelectionSet(this.selections()),
        },
      ],
    } as TypedDocumentNode<Output, Variables>;
    this.cache.set(document);
    return document;
  }

  /**
   *
   * @param cacheKey A cache key that describes what values are used to build the query. No cache key or an empty array means the query will regenerate every time.
   */
  dynamic(cacheKey?: () => any[]) {
    this.cache = new KeyedCache(cacheKey ?? (() => []));
    return this;
  }

  static() {
    this.cache = new KeyedCache(undefined);
    return this;
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

export function enumValue<T extends string>(value: T): EnumValue<T> {
  return {
    [EnumValueSymbol]: value,
  };
}

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
          directives: [],
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

    return new Operation(name, type, variableDefinitions, () =>
      builder(makeBuilderObject(), variables)
    );
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
    return new FragmentDefinition(name, typeCondition, () =>
      builder(makeBuilderObject(), variables)
    );
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
