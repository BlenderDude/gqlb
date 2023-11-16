type ResponseKey<
  F extends {
    _alias: string | undefined;
    name: string;
  },
> = F["_alias"] extends string ? F["_alias"] : F["name"];

type ResponseKeyObj<
  F extends { name: string; _alias: string | undefined },
  O,
> = {
  [K in ResponseKey<F>]: O;
};

type DoesFragmentApply<
  F extends InlineFragment | FragmentDefinition,
  T extends string,
> = F["possibleTypes"] extends infer Inner
  ? Inner extends T
    ? true
    : false
  : never;

type ReadonlyIntersectionCollapse<T> = T extends Function
  ? never
  : {
      readonly [K in keyof T]: T[K];
    };

type Field = {
  readonly kind: "field";
  readonly _output: any;
  readonly name: string;
  readonly _alias: string | undefined;
};

type InlineFragment = {
  readonly kind: "inline_fragment";
  readonly _output: any;
  readonly typeCondition: string;
  readonly possibleTypes: string;
};

type FragmentDefinition = {
  readonly kind: "fragment_definition";
  readonly _output: any;
  readonly typeCondition: string;
  readonly possibleTypes: string;
};

type SelectionSetSelection = Field | InlineFragment | FragmentDefinition;

type NeverToEmptyObj<T> = [T] extends [never] ? {} : T;

type FragmentOutput<
  T extends InlineFragment | FragmentDefinition,
  PT extends string,
> = NeverToEmptyObj<Extract<T["_output"], { readonly __typename: PT }>>;

type BuildSelectionSet<
  T extends ReadonlyArray<SelectionSetSelection>,
  PT extends string,
  Acc = {
    readonly __typename: PT;
  },
> = T extends readonly [
  infer Head extends SelectionSetSelection,
  ...infer Tail extends ReadonlyArray<SelectionSetSelection>,
]
  ? Head extends Field
    ? BuildSelectionSet<Tail, PT, Acc & ResponseKeyObj<Head, Head["_output"]>>
    : Head extends InlineFragment | FragmentDefinition
      ? BuildSelectionSet<Tail, PT, Acc & FragmentOutput<Head, PT>>
      : never
  : Acc;

type SelectionSetOutput<
  T extends ReadonlyArray<SelectionSetSelection>,
  PossibleTypes extends string,
> = PossibleTypes extends infer PT
  ? ReadonlyIntersectionCollapse<BuildSelectionSet<T, PT & string>>
  : never;
