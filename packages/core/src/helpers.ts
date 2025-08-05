/** biome-ignore-all lint/suspicious/noExplicitAny: Many complex types that need these */
/** biome-ignore-all lint/complexity/noBannedTypes: Many complex types that need these */
import type {
	AnyFragmentDefinition,
	Field,
	FragmentDefinition,
	FragmentDefinitionWithVariables,
	FragmentSpread,
	InlineFragment,
	Operation,
} from "./runtime";

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

type InterfaceCollapse<T> = T extends Record<string, any>
	? {
			readonly [K in keyof T]: T[K] extends ReadonlyArray<Record<string, any>>
				? readonly InterfaceCollapse<T[K][number]>[]
				: InterfaceCollapse<T[K]>;
		}
	: T extends ReadonlyArray<infer U>
		? ReadonlyArray<InterfaceCollapse<U>>
		: T;

export type SelectionOutput<T> = T extends Field<any, any, infer O>
	? O
	: T extends InlineFragment<any, any, infer O>
		? O
		: T extends FragmentDefinition<any, any, any, infer O>
			? O
			: T extends FragmentDefinitionWithVariables<
						any,
						any,
						any,
						any,
						infer O,
						any
					>
				? O
				: T extends FragmentSpread<infer F>
					? SelectionOutput<F>
					: never;

export type SelectionSetSelection<PossibleTypes extends string = string> =
	| Field
	| InlineFragment<PossibleTypes>
	| FragmentSpread<
			| FragmentDefinition<any, PossibleTypes, any, any>
			| FragmentDefinitionWithVariables<any, PossibleTypes, any, any, any, any>
	  >;

export type NeverToEmptyObj<T> = [T] extends [never] ? {} : T;

export type FragmentName<T extends AnyFragmentDefinition> = T extends
	| FragmentDefinition<infer N, any, any, any>
	// biome-ignore lint/suspicious/noRedeclare: Not a redeclaration
	| FragmentDefinitionWithVariables<infer N, any, any, any, any, any>
	? N
	: never;

export type FragmentData<T extends AnyFragmentDefinition> =
	T extends FragmentDefinition<any, any, any, infer O>
		? O
		: T extends FragmentDefinitionWithVariables<
					any,
					any,
					any,
					any,
					infer O,
					any
				>
			? O
			: never;

export type FragmentOutput<
	T extends InlineFragment | AnyFragmentDefinition,
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
		: Head extends FragmentSpread<infer F extends AnyFragmentDefinition>
			? BuildSelectionSet<Tail, PT, Acc & FragmentOutput<F, PT>>
			: Head extends InlineFragment
				? BuildSelectionSet<Tail, PT, Acc & FragmentOutput<Head, PT>>
				: never
	: Acc;

export type SelectionSetOutput<
	T extends ReadonlyArray<SelectionSetSelection>,
	PossibleTypes extends string,
> = InterfaceCollapse<
	T extends Function
		? never
		: PossibleTypes extends infer PT
			? BuildSelectionSet<T, PT & string>
			: never
>;

export type OutputOf<T> = T extends Operation<infer Output, any>
	? Output
	: SelectionOutput<T>;

export type VariablesOf<T> = T extends Operation<any, infer Variables>
	? Variables
	: T extends FragmentDefinitionWithVariables<
				any,
				any,
				any,
				infer Variables,
				any,
				any
			>
		? Variables
		: never;

export const EnumValueSymbol = Symbol("EnumValue");
export type EnumValue<T> = {
	readonly [EnumValueSymbol]: T;
};
