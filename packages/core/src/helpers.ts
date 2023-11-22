import {
  Field,
  FragmentDefinition,
  FragmentDefinitionWithVariables as FragmentDefinitionWithVariables,
  InlineFragment,
  FragmentSpread,
  Operation,
} from "./runtime";

declare const FragmentRefKey: unique symbol;

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
    : T extends FragmentDefinition<any, any, any, infer O>
      ? O
      : T extends FragmentDefinitionWithVariables<any, any, any, any, infer O>
        ? O
        : T extends FragmentSpread<infer F>
          ? SelectionOutput<F>
          : never;

export type SelectionSetSelection<PossibleTypes extends string = string> =
  | Field
  | InlineFragment<PossibleTypes>
  | FragmentSpread<
      | FragmentDefinition<any, PossibleTypes>
      | FragmentDefinitionWithVariables<any, PossibleTypes>
    >;

export type NeverToEmptyObj<T> = [T] extends [never] ? {} : T;

export type FragmentName<
  T extends FragmentDefinition | FragmentDefinitionWithVariables,
> = T extends
  | FragmentDefinition<infer N>
  | FragmentDefinitionWithVariables<infer N>
  ? N
  : never;

export type FragmentRefObj<
  T extends FragmentDefinition | FragmentDefinitionWithVariables,
> = {
  readonly [FragmentRefKey]: FragmentName<T>;
};

export type FragmentRef<
  T extends FragmentDefinition | FragmentDefinitionWithVariables,
> = FragmentData<T> extends infer U
  ? IntersectWithFragmentRefUnion<U, FragmentRefObj<T>>
  : never;

export type FragmentData<
  T extends FragmentDefinition | FragmentDefinitionWithVariables,
> = T extends FragmentDefinition<any, any, any, infer O>
  ? O
  : T extends FragmentDefinitionWithVariables<any, any, any, any, infer O>
    ? O
    : never;

export type FragmentOutput<
  T extends
    | InlineFragment
    | FragmentDefinition
    | FragmentDefinitionWithVariables,
  PT extends string,
> = NeverToEmptyObj<
  Extract<
    IntersectWithFragmentRefUnion<
      SelectionOutput<T>,
      T extends FragmentDefinition | FragmentDefinitionWithVariables
        ? FragmentRefObj<T>
        : {}
    >,
    { readonly __typename: PT }
  >
>;

type IntersectWithFragmentRefUnion<A, B> = Omit<A, typeof FragmentRefKey> &
  Omit<B, typeof FragmentRefKey> & {
    [FragmentRefKey]:
      | A[typeof FragmentRefKey & keyof A]
      | B[typeof FragmentRefKey & keyof B];
  };

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
    : Head extends FragmentSpread<
          infer F extends FragmentDefinition | FragmentDefinitionWithVariables
        >
      ? BuildSelectionSet<
          Tail,
          PT,
          IntersectWithFragmentRefUnion<Acc, FragmentOutput<F, PT>>
        >
      : Head extends InlineFragment
        ? BuildSelectionSet<Tail, PT, Acc & FragmentOutput<Head, PT>>
        : never
  : Acc;

export type SelectionSetOutput<
  T extends ReadonlyArray<SelectionSetSelection>,
  PossibleTypes extends string,
> = T extends Function
  ? never
  : PossibleTypes extends infer PT
    ? ReadonlyIntersectionCollapse<BuildSelectionSet<T, PT & string>>
    : never;

export type OutputOf<T> = T extends Operation<infer Output>
  ? Output
  : SelectionOutput<T>;
export type VariablesOf<T> = T extends Operation<any, infer Variables>
  ? Variables
  : T extends FragmentDefinitionWithVariables<any, any, any, infer Variables>
    ? Variables
    : never;
