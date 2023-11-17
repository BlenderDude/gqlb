import { Field, FragmentDefinition, InlineFragment } from "./runtime";

export type ResponseKey<F extends Field> = F extends Field<
  infer Name,
  infer Alias
>
  ? Alias extends string
    ? Alias
    : Name
  : never;

export type ResponseKeyObj<F extends Field, O> = {
  [K in ResponseKey<F>]: O;
};

export type ReadonlyIntersectionCollapse<T> = T extends Function
  ? never
  : {
      readonly [K in keyof T]: T[K];
    };

export type SelectionOutput<T> = T extends Field<any, any, infer O>
  ? O
  : T extends InlineFragment<any, any, infer O>
  ? O
  : T extends FragmentDefinition<any, any, infer O>
  ? O
  : never;

export type SelectionSetSelection = Field | InlineFragment | FragmentDefinition;

export type NeverToEmptyObj<T> = [T] extends [never] ? {} : T;

export type FragmentOutput<
  T extends InlineFragment | FragmentDefinition,
  PT extends string,
> = NeverToEmptyObj<Extract<SelectionOutput<T>, { readonly __typename: PT }>>;

export type BuildSelectionSet<
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
    ? BuildSelectionSet<
        Tail,
        PT,
        Acc & ResponseKeyObj<Head, SelectionOutput<Head>>
      >
    : Head extends InlineFragment | FragmentDefinition
    ? BuildSelectionSet<Tail, PT, Acc & FragmentOutput<Head, PT>>
    : never
  : Acc;

export type SelectionSetOutput<
  T extends ReadonlyArray<SelectionSetSelection>,
  PossibleTypes extends string,
> = PossibleTypes extends infer PT
  ? ReadonlyIntersectionCollapse<BuildSelectionSet<T, PT & string>>
  : never;
