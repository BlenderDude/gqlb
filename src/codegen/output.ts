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
  F extends InlineFragment,
  T extends string,
> = F["possibleTypes"] extends infer Inner
  ? Inner extends T
    ? true
    : false
  : never;

type ReadonlyMerge<A, B> = A extends Function
  ? never
  : {
      readonly [K in keyof A | keyof B]: K extends keyof A
        ? A[K & keyof A]
        : K extends keyof B
        ? B[K & keyof B]
        : never;
    };

type Field = {
  kind: "field";
  _output: any;
  name: string;
  _alias: string | undefined;
};

type InlineFragment = {
  kind: "inline_fragment";
  _output: any;
  typeCondition: string;
  possibleTypes: string;
};

type SelectionSetSelection = Field | InlineFragment;

type SelectionSetOutput<
  T extends ReadonlyArray<SelectionSetSelection>,
  PossibleTypes extends string,
> = T extends Function
  ? never
  : PossibleTypes extends infer PT
  ? ReadonlyMerge<
      {
        readonly __typename: PT;
      },
      T extends readonly [
        infer Head extends SelectionSetSelection,
        ...infer Tail extends ReadonlyArray<SelectionSetSelection>,
      ]
        ? Head extends Field
          ? ReadonlyMerge<
              ResponseKeyObj<Head, Head["_output"]>,
              SelectionSetOutput<Tail, PT & string>
            >
          : Head extends InlineFragment
          ? true extends DoesFragmentApply<Head, PT & string>
            ? ReadonlyMerge<
                Extract<Head["_output"], { __typename: PT }>,
                SelectionSetOutput<Tail, PT & string>
              >
            : SelectionSetOutput<Tail, PT & string>
          : // : Head extends ast.FragmentDef
            // ? true extends DoesFragmentApply<Head, PT & string>
            //   ? Merge<
            //       Extract<Head["_output"], { __typename: PT }>,
            //       SelectionSetOutput<Tail, PT & string>
            //     >
            //   : SelectionSetOutput<Tail, PT & string>
            never
        : {}
    >
  : never;
