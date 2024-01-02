---
title: Getting started
---

GQLB is a statically typed GraphQL query builder for TypeScript. It ensures the validity of every GraphQL operation you write, and adds type information to the input and output of your operations.

This guide will help you get started with GQLB, so you can experience the magic of _static_ type safety in a GraphQL app.

## Installation

Run the following command in your terminal to install the GQLB CLI and client runtime:

::: code-group
```bash [pnpm]
pnpm add -D @gqlb/cli
pnpm add @gqlb/core graphql
```

```bash [npm]
npm install -D @gqlb/cli
npm install @gqlb/core graphql
```

```bash [yarn]
yarn add -D @gqlb/cli
yarn add @gqlb/core graphql
```
:::

## Configuration

Next, create a file at your project root called `gqlb.config.ts`. This file will be used to configure the GQLB CLI.

We need to let GQLB know what GraphQL schema(s) we're going to be working with. In this guide, we'll use Trevor Blades's [Countries API](https://countries.trevorblades.com) as an example.

The default export of your config file should be an object with a `generate` property. This object maps unique strings to a configuration object for each API.

<<< @/gqlb.config.ts

In this example, we configure the Countries API under the key `countries` (this can be anything), and set the `schema.introspect` property to the API URL. The `output` property is also set to `src/gql`, indicating which directory the generated code will live in.

This directory should not be checked in to version control. Be sure to add any output directories to your `.gitignore` file.

## Usage

Add a script to your `package.json` that calls `gqlb generate`.

```json
// package.json
{
  "scripts": {
    "gql": "gqlb generate"
  }
}
```

Run the `generate` command using the GQLB CLI. This will read the type information from a GraphQL schema, and use it to generate a typed query builder at the configured `output` location.

::: code-group
```bash [pnpm]
pnpm gql
```

```bash [npm]
npm run gql
```

```bash [yarn]
yarn gql
```
:::

### Writing a query

Now, let's build a GraphQL query using the `b` object exported from the generated `src/gql` directory. We'll call the `query` function on the `b` object, supplying the query name `ListCountries` as the first parameter, and a function as the second parameter.

This function takes a scoped `b` instance and must return an array of field selections. If a field requires sub-selections, repeat this function pattern as an argument passed to that field.

<<< @/gql/index.ts

```ts twoslash
// @filename: gql/builder.ts
import type {
  Field,
  InlineFragment,
  FragmentSpread,
  FragmentDefinition,
  FragmentDefinitionWithVariables,
  Operation,
  SelectionSetOutput,
  SelectionOutput,
  SelectionSetSelection,
  EnumValue,
} from "@gqlb/core";
declare module "./builder" {
  interface Scalar_Boolean {
    kind: "scalar";
    _input: boolean;
    _output: boolean;
  }

  type PossibleTypes_Continent = "Continent";

  interface Builder_Continent {
    /** */
    code(): Field<
      "code",
      undefined,
      Exclude<Scalar_ID["_output"] | null, null>
    >;
    /** */
    countries<
      const BuilderResult extends ReadonlyArray<
        SelectionSetSelection<PossibleTypes_Country>
      >,
    >(
      builder: (b: Builder_Country) => BuilderResult,
    ): Field<
      "countries",
      undefined,
      Exclude<
        ReadonlyArray<
          Exclude<
            SelectionSetOutput<BuilderResult, PossibleTypes_Country> | null,
            null
          >
        > | null,
        null
      >
    >;
    /** */
    name(): Field<
      "name",
      undefined,
      Exclude<Scalar_String["_output"] | null, null>
    >;
    __on<
      const Result extends ReadonlyArray<
        SelectionSetSelection<PossibleTypes_Continent>
      >,
    >(
      typeCondition: "Continent",
      builder: (b: Builder_Continent) => Result,
    ): InlineFragment<
      PossibleTypes_Continent,
      "Continent",
      SelectionSetOutput<Result, PossibleTypes_Continent>
    >;
    __fragment<Fragment extends FragmentDefinition>(
      fragment: Fragment,
    ): FragmentSpread<Fragment>;
    __fragment<Fragment extends FragmentDefinitionWithVariables>(
      fragment: Fragment,
      variables: Fragment extends FragmentDefinitionWithVariables<
        any,
        any,
        any,
        infer V,
        any
      >
        ? V
        : never,
    ): FragmentSpread<Fragment>;
  }

  interface InputObject_ContinentFilterInput {
    readonly code?: InputObject_StringQueryOperatorInput_Variables | null;
  }

  interface InputObject_ContinentFilterInput_Variables {
    readonly code?:
      | InputObject_StringQueryOperatorInput_Variables
      | null
      | {
          readonly kind: "input_object";
          readonly name: "StringQueryOperatorInput";
        }
      | {
          readonly kind: "non_null";
          readonly inner: {
            readonly kind: "input_object";
            readonly name: "StringQueryOperatorInput";
          };
        };
  }

  type PossibleTypes_Country = "Country";

  interface Builder_Country {
    /** */
    awsRegion(): Field<
      "awsRegion",
      undefined,
      Exclude<Scalar_String["_output"] | null, null>
    >;
    /** */
    capital(): Field<"capital", undefined, Scalar_String["_output"] | null>;
    /** */
    code(): Field<
      "code",
      undefined,
      Exclude<Scalar_ID["_output"] | null, null>
    >;
    /** */
    continent<
      const BuilderResult extends ReadonlyArray<
        SelectionSetSelection<PossibleTypes_Continent>
      >,
    >(
      builder: (b: Builder_Continent) => BuilderResult,
    ): Field<
      "continent",
      undefined,
      Exclude<
        SelectionSetOutput<BuilderResult, PossibleTypes_Continent> | null,
        null
      >
    >;
    /** */
    currencies(): Field<
      "currencies",
      undefined,
      Exclude<
        ReadonlyArray<Exclude<Scalar_String["_output"] | null, null>> | null,
        null
      >
    >;
    /** */
    currency(): Field<"currency", undefined, Scalar_String["_output"] | null>;
    /** */
    emoji(): Field<
      "emoji",
      undefined,
      Exclude<Scalar_String["_output"] | null, null>
    >;
    /** */
    emojiU(): Field<
      "emojiU",
      undefined,
      Exclude<Scalar_String["_output"] | null, null>
    >;
    /** */
    languages<
      const BuilderResult extends ReadonlyArray<
        SelectionSetSelection<PossibleTypes_Language>
      >,
    >(
      builder: (b: Builder_Language) => BuilderResult,
    ): Field<
      "languages",
      undefined,
      Exclude<
        ReadonlyArray<
          Exclude<
            SelectionSetOutput<BuilderResult, PossibleTypes_Language> | null,
            null
          >
        > | null,
        null
      >
    >;
    /** */
    name(args?: {
      readonly lang?:
        | Scalar_String["_input"]
        | null
        | {
            readonly kind: "scalar";
            readonly name: "String";
          }
        | {
            readonly kind: "non_null";
            readonly inner: {
              readonly kind: "scalar";
              readonly name: "String";
            };
          };
    }): Field<
      "name",
      undefined,
      Exclude<Scalar_String["_output"] | null, null>
    >;
    /** */
    native(): Field<
      "native",
      undefined,
      Exclude<Scalar_String["_output"] | null, null>
    >;
    /** */
    phone(): Field<
      "phone",
      undefined,
      Exclude<Scalar_String["_output"] | null, null>
    >;
    /** */
    phones(): Field<
      "phones",
      undefined,
      Exclude<
        ReadonlyArray<Exclude<Scalar_String["_output"] | null, null>> | null,
        null
      >
    >;
    /** */
    states<
      const BuilderResult extends ReadonlyArray<
        SelectionSetSelection<PossibleTypes_State>
      >,
    >(
      builder: (b: Builder_State) => BuilderResult,
    ): Field<
      "states",
      undefined,
      Exclude<
        ReadonlyArray<
          Exclude<
            SelectionSetOutput<BuilderResult, PossibleTypes_State> | null,
            null
          >
        > | null,
        null
      >
    >;
    /** */
    subdivisions<
      const BuilderResult extends ReadonlyArray<
        SelectionSetSelection<PossibleTypes_Subdivision>
      >,
    >(
      builder: (b: Builder_Subdivision) => BuilderResult,
    ): Field<
      "subdivisions",
      undefined,
      Exclude<
        ReadonlyArray<
          Exclude<
            SelectionSetOutput<BuilderResult, PossibleTypes_Subdivision> | null,
            null
          >
        > | null,
        null
      >
    >;
    __on<
      const Result extends ReadonlyArray<
        SelectionSetSelection<PossibleTypes_Country>
      >,
    >(
      typeCondition: "Country",
      builder: (b: Builder_Country) => Result,
    ): InlineFragment<
      PossibleTypes_Country,
      "Country",
      SelectionSetOutput<Result, PossibleTypes_Country>
    >;
    __fragment<Fragment extends FragmentDefinition>(
      fragment: Fragment,
    ): FragmentSpread<Fragment>;
    __fragment<Fragment extends FragmentDefinitionWithVariables>(
      fragment: Fragment,
      variables: Fragment extends FragmentDefinitionWithVariables<
        any,
        any,
        any,
        infer V,
        any
      >
        ? V
        : never,
    ): FragmentSpread<Fragment>;
  }

  interface InputObject_CountryFilterInput {
    readonly code?: InputObject_StringQueryOperatorInput_Variables | null;
    readonly continent?: InputObject_StringQueryOperatorInput_Variables | null;
    readonly currency?: InputObject_StringQueryOperatorInput_Variables | null;
    readonly name?: InputObject_StringQueryOperatorInput_Variables | null;
  }

  interface InputObject_CountryFilterInput_Variables {
    readonly code?:
      | InputObject_StringQueryOperatorInput_Variables
      | null
      | {
          readonly kind: "input_object";
          readonly name: "StringQueryOperatorInput";
        }
      | {
          readonly kind: "non_null";
          readonly inner: {
            readonly kind: "input_object";
            readonly name: "StringQueryOperatorInput";
          };
        };
    readonly continent?:
      | InputObject_StringQueryOperatorInput_Variables
      | null
      | {
          readonly kind: "input_object";
          readonly name: "StringQueryOperatorInput";
        }
      | {
          readonly kind: "non_null";
          readonly inner: {
            readonly kind: "input_object";
            readonly name: "StringQueryOperatorInput";
          };
        };
    readonly currency?:
      | InputObject_StringQueryOperatorInput_Variables
      | null
      | {
          readonly kind: "input_object";
          readonly name: "StringQueryOperatorInput";
        }
      | {
          readonly kind: "non_null";
          readonly inner: {
            readonly kind: "input_object";
            readonly name: "StringQueryOperatorInput";
          };
        };
    readonly name?:
      | InputObject_StringQueryOperatorInput_Variables
      | null
      | {
          readonly kind: "input_object";
          readonly name: "StringQueryOperatorInput";
        }
      | {
          readonly kind: "non_null";
          readonly inner: {
            readonly kind: "input_object";
            readonly name: "StringQueryOperatorInput";
          };
        };
  }

  interface Scalar_Float {
    kind: "scalar";
    _input: number;
    _output: number;
  }

  interface Scalar_ID {
    kind: "scalar";
    _input: string | number;
    _output: string | number;
  }

  interface Scalar_Int {
    kind: "scalar";
    _input: number;
    _output: number;
  }

  type PossibleTypes_Language = "Language";

  interface Builder_Language {
    /** */
    code(): Field<
      "code",
      undefined,
      Exclude<Scalar_ID["_output"] | null, null>
    >;
    /** */
    name(): Field<
      "name",
      undefined,
      Exclude<Scalar_String["_output"] | null, null>
    >;
    /** */
    native(): Field<
      "native",
      undefined,
      Exclude<Scalar_String["_output"] | null, null>
    >;
    /** */
    rtl(): Field<
      "rtl",
      undefined,
      Exclude<Scalar_Boolean["_output"] | null, null>
    >;
    __on<
      const Result extends ReadonlyArray<
        SelectionSetSelection<PossibleTypes_Language>
      >,
    >(
      typeCondition: "Language",
      builder: (b: Builder_Language) => Result,
    ): InlineFragment<
      PossibleTypes_Language,
      "Language",
      SelectionSetOutput<Result, PossibleTypes_Language>
    >;
    __fragment<Fragment extends FragmentDefinition>(
      fragment: Fragment,
    ): FragmentSpread<Fragment>;
    __fragment<Fragment extends FragmentDefinitionWithVariables>(
      fragment: Fragment,
      variables: Fragment extends FragmentDefinitionWithVariables<
        any,
        any,
        any,
        infer V,
        any
      >
        ? V
        : never,
    ): FragmentSpread<Fragment>;
  }

  interface InputObject_LanguageFilterInput {
    readonly code?: InputObject_StringQueryOperatorInput_Variables | null;
  }

  interface InputObject_LanguageFilterInput_Variables {
    readonly code?:
      | InputObject_StringQueryOperatorInput_Variables
      | null
      | {
          readonly kind: "input_object";
          readonly name: "StringQueryOperatorInput";
        }
      | {
          readonly kind: "non_null";
          readonly inner: {
            readonly kind: "input_object";
            readonly name: "StringQueryOperatorInput";
          };
        };
  }

  type PossibleTypes_Query = "Query";

  interface Builder_Query {
    /** */
    continent<
      const BuilderResult extends ReadonlyArray<
        SelectionSetSelection<PossibleTypes_Continent>
      >,
    >(
      args: {
        readonly code:
          | Exclude<Scalar_ID["_input"] | null, null>
          | {
              readonly kind: "non_null";
              readonly inner: {
                readonly kind: "scalar";
                readonly name: "ID";
              };
            };
      },
      builder: (b: Builder_Continent) => BuilderResult,
    ): Field<
      "continent",
      undefined,
      SelectionSetOutput<BuilderResult, PossibleTypes_Continent> | null
    >;
    /** */
    continents<
      const BuilderResult extends ReadonlyArray<
        SelectionSetSelection<PossibleTypes_Continent>
      >,
    >(
      args: {
        readonly filter?:
          | InputObject_ContinentFilterInput_Variables
          | null
          | {
              readonly kind: "input_object";
              readonly name: "ContinentFilterInput";
            }
          | {
              readonly kind: "non_null";
              readonly inner: {
                readonly kind: "input_object";
                readonly name: "ContinentFilterInput";
              };
            };
      },
      builder: (b: Builder_Continent) => BuilderResult,
    ): Field<
      "continents",
      undefined,
      Exclude<
        ReadonlyArray<
          Exclude<
            SelectionSetOutput<BuilderResult, PossibleTypes_Continent> | null,
            null
          >
        > | null,
        null
      >
    >;
    /** */
    continents<
      const BuilderResult extends ReadonlyArray<
        SelectionSetSelection<PossibleTypes_Continent>
      >,
    >(
      builder: (b: Builder_Continent) => BuilderResult,
    ): Field<
      "continents",
      undefined,
      Exclude<
        ReadonlyArray<
          Exclude<
            SelectionSetOutput<BuilderResult, PossibleTypes_Continent> | null,
            null
          >
        > | null,
        null
      >
    >;
    /** */
    countries<
      const BuilderResult extends ReadonlyArray<
        SelectionSetSelection<PossibleTypes_Country>
      >,
    >(
      args: {
        readonly filter?:
          | InputObject_CountryFilterInput_Variables
          | null
          | {
              readonly kind: "input_object";
              readonly name: "CountryFilterInput";
            }
          | {
              readonly kind: "non_null";
              readonly inner: {
                readonly kind: "input_object";
                readonly name: "CountryFilterInput";
              };
            };
      },
      builder: (b: Builder_Country) => BuilderResult,
    ): Field<
      "countries",
      undefined,
      Exclude<
        ReadonlyArray<
          Exclude<
            SelectionSetOutput<BuilderResult, PossibleTypes_Country> | null,
            null
          >
        > | null,
        null
      >
    >;
    /** */
    countries<
      const BuilderResult extends ReadonlyArray<
        SelectionSetSelection<PossibleTypes_Country>
      >,
    >(
      builder: (b: Builder_Country) => BuilderResult,
    ): Field<
      "countries",
      undefined,
      Exclude<
        ReadonlyArray<
          Exclude<
            SelectionSetOutput<BuilderResult, PossibleTypes_Country> | null,
            null
          >
        > | null,
        null
      >
    >;
    /** */
    country<
      const BuilderResult extends ReadonlyArray<
        SelectionSetSelection<PossibleTypes_Country>
      >,
    >(
      args: {
        readonly code:
          | Exclude<Scalar_ID["_input"] | null, null>
          | {
              readonly kind: "non_null";
              readonly inner: {
                readonly kind: "scalar";
                readonly name: "ID";
              };
            };
      },
      builder: (b: Builder_Country) => BuilderResult,
    ): Field<
      "country",
      undefined,
      SelectionSetOutput<BuilderResult, PossibleTypes_Country> | null
    >;
    /** */
    language<
      const BuilderResult extends ReadonlyArray<
        SelectionSetSelection<PossibleTypes_Language>
      >,
    >(
      args: {
        readonly code:
          | Exclude<Scalar_ID["_input"] | null, null>
          | {
              readonly kind: "non_null";
              readonly inner: {
                readonly kind: "scalar";
                readonly name: "ID";
              };
            };
      },
      builder: (b: Builder_Language) => BuilderResult,
    ): Field<
      "language",
      undefined,
      SelectionSetOutput<BuilderResult, PossibleTypes_Language> | null
    >;
    /** */
    languages<
      const BuilderResult extends ReadonlyArray<
        SelectionSetSelection<PossibleTypes_Language>
      >,
    >(
      args: {
        readonly filter?:
          | InputObject_LanguageFilterInput_Variables
          | null
          | {
              readonly kind: "input_object";
              readonly name: "LanguageFilterInput";
            }
          | {
              readonly kind: "non_null";
              readonly inner: {
                readonly kind: "input_object";
                readonly name: "LanguageFilterInput";
              };
            };
      },
      builder: (b: Builder_Language) => BuilderResult,
    ): Field<
      "languages",
      undefined,
      Exclude<
        ReadonlyArray<
          Exclude<
            SelectionSetOutput<BuilderResult, PossibleTypes_Language> | null,
            null
          >
        > | null,
        null
      >
    >;
    /** */
    languages<
      const BuilderResult extends ReadonlyArray<
        SelectionSetSelection<PossibleTypes_Language>
      >,
    >(
      builder: (b: Builder_Language) => BuilderResult,
    ): Field<
      "languages",
      undefined,
      Exclude<
        ReadonlyArray<
          Exclude<
            SelectionSetOutput<BuilderResult, PossibleTypes_Language> | null,
            null
          >
        > | null,
        null
      >
    >;
    __on<
      const Result extends ReadonlyArray<
        SelectionSetSelection<PossibleTypes_Query>
      >,
    >(
      typeCondition: "Query",
      builder: (b: Builder_Query) => Result,
    ): InlineFragment<
      PossibleTypes_Query,
      "Query",
      SelectionSetOutput<Result, PossibleTypes_Query>
    >;
    __fragment<Fragment extends FragmentDefinition>(
      fragment: Fragment,
    ): FragmentSpread<Fragment>;
    __fragment<Fragment extends FragmentDefinitionWithVariables>(
      fragment: Fragment,
      variables: Fragment extends FragmentDefinitionWithVariables<
        any,
        any,
        any,
        infer V,
        any
      >
        ? V
        : never,
    ): FragmentSpread<Fragment>;
  }

  type PossibleTypes_State = "State";

  interface Builder_State {
    /** */
    code(): Field<"code", undefined, Scalar_String["_output"] | null>;
    /** */
    country<
      const BuilderResult extends ReadonlyArray<
        SelectionSetSelection<PossibleTypes_Country>
      >,
    >(
      builder: (b: Builder_Country) => BuilderResult,
    ): Field<
      "country",
      undefined,
      Exclude<
        SelectionSetOutput<BuilderResult, PossibleTypes_Country> | null,
        null
      >
    >;
    /** */
    name(): Field<
      "name",
      undefined,
      Exclude<Scalar_String["_output"] | null, null>
    >;
    __on<
      const Result extends ReadonlyArray<
        SelectionSetSelection<PossibleTypes_State>
      >,
    >(
      typeCondition: "State",
      builder: (b: Builder_State) => Result,
    ): InlineFragment<
      PossibleTypes_State,
      "State",
      SelectionSetOutput<Result, PossibleTypes_State>
    >;
    __fragment<Fragment extends FragmentDefinition>(
      fragment: Fragment,
    ): FragmentSpread<Fragment>;
    __fragment<Fragment extends FragmentDefinitionWithVariables>(
      fragment: Fragment,
      variables: Fragment extends FragmentDefinitionWithVariables<
        any,
        any,
        any,
        infer V,
        any
      >
        ? V
        : never,
    ): FragmentSpread<Fragment>;
  }

  interface Scalar_String {
    kind: "scalar";
    _input: string;
    _output: string;
  }

  interface InputObject_StringQueryOperatorInput {
    readonly eq?: Scalar_String["_input"] | null;
    readonly in?: ReadonlyArray<
      Exclude<Scalar_String["_input"] | null, null>
    > | null;
    readonly ne?: Scalar_String["_input"] | null;
    readonly nin?: ReadonlyArray<
      Exclude<Scalar_String["_input"] | null, null>
    > | null;
    readonly regex?: Scalar_String["_input"] | null;
  }

  interface InputObject_StringQueryOperatorInput_Variables {
    readonly eq?:
      | Scalar_String["_input"]
      | null
      | {
          readonly kind: "scalar";
          readonly name: "String";
        }
      | {
          readonly kind: "non_null";
          readonly inner: {
            readonly kind: "scalar";
            readonly name: "String";
          };
        };
    readonly in?:
      | ReadonlyArray<Exclude<Scalar_String["_input"] | null, null>>
      | null
      | Array<{
          readonly kind: "non_null";
          readonly inner: {
            readonly kind: "scalar";
            readonly name: "String";
          };
        }>
      | {
          readonly kind: "list";
          readonly inner: {
            readonly kind: "non_null";
            readonly inner: {
              readonly kind: "scalar";
              readonly name: "String";
            };
          };
        }
      | {
          readonly kind: "non_null";
          readonly inner: {
            readonly kind: "list";
            readonly inner: {
              readonly kind: "non_null";
              readonly inner: {
                readonly kind: "scalar";
                readonly name: "String";
              };
            };
          };
        };
    readonly ne?:
      | Scalar_String["_input"]
      | null
      | {
          readonly kind: "scalar";
          readonly name: "String";
        }
      | {
          readonly kind: "non_null";
          readonly inner: {
            readonly kind: "scalar";
            readonly name: "String";
          };
        };
    readonly nin?:
      | ReadonlyArray<Exclude<Scalar_String["_input"] | null, null>>
      | null
      | Array<{
          readonly kind: "non_null";
          readonly inner: {
            readonly kind: "scalar";
            readonly name: "String";
          };
        }>
      | {
          readonly kind: "list";
          readonly inner: {
            readonly kind: "non_null";
            readonly inner: {
              readonly kind: "scalar";
              readonly name: "String";
            };
          };
        }
      | {
          readonly kind: "non_null";
          readonly inner: {
            readonly kind: "list";
            readonly inner: {
              readonly kind: "non_null";
              readonly inner: {
                readonly kind: "scalar";
                readonly name: "String";
              };
            };
          };
        };
    readonly regex?:
      | Scalar_String["_input"]
      | null
      | {
          readonly kind: "scalar";
          readonly name: "String";
        }
      | {
          readonly kind: "non_null";
          readonly inner: {
            readonly kind: "scalar";
            readonly name: "String";
          };
        };
  }

  type PossibleTypes_Subdivision = "Subdivision";

  interface Builder_Subdivision {
    /** */
    code(): Field<
      "code",
      undefined,
      Exclude<Scalar_ID["_output"] | null, null>
    >;
    /** */
    emoji(): Field<"emoji", undefined, Scalar_String["_output"] | null>;
    /** */
    name(): Field<
      "name",
      undefined,
      Exclude<Scalar_String["_output"] | null, null>
    >;
    __on<
      const Result extends ReadonlyArray<
        SelectionSetSelection<PossibleTypes_Subdivision>
      >,
    >(
      typeCondition: "Subdivision",
      builder: (b: Builder_Subdivision) => Result,
    ): InlineFragment<
      PossibleTypes_Subdivision,
      "Subdivision",
      SelectionSetOutput<Result, PossibleTypes_Subdivision>
    >;
    __fragment<Fragment extends FragmentDefinition>(
      fragment: Fragment,
    ): FragmentSpread<Fragment>;
    __fragment<Fragment extends FragmentDefinitionWithVariables>(
      fragment: Fragment,
      variables: Fragment extends FragmentDefinitionWithVariables<
        any,
        any,
        any,
        infer V,
        any
      >
        ? V
        : never,
    ): FragmentSpread<Fragment>;
  }

  type VariableScalarTypes = {
    readonly Boolean: Scalar_Boolean["_input"];
    readonly Float: Scalar_Float["_input"];
    readonly ID: Scalar_ID["_input"];
    readonly Int: Scalar_Int["_input"];
    readonly String: Scalar_String["_input"];
  };
  type VariableEnumTypes = {};
  type VariableInputObjectTypes = {
    readonly ContinentFilterInput: InputObject_ContinentFilterInput;
    readonly CountryFilterInput: InputObject_CountryFilterInput;
    readonly LanguageFilterInput: InputObject_LanguageFilterInput;
    readonly StringQueryOperatorInput: InputObject_StringQueryOperatorInput;
  };
  type ParseVariableDef<T> = T extends `[${infer Inner}]`
    ? {
        readonly kind: "list";
        readonly inner: ParseVariableDef<Inner>;
      }
    : T extends `${infer Inner}!`
      ? {
          readonly kind: "non_null";
          readonly inner: ParseVariableDef<Inner>;
        }
      : T extends keyof VariableScalarTypes
        ? {
            readonly kind: "scalar";
            readonly name: T;
            readonly _input: VariableScalarTypes[T];
          }
        : T extends keyof VariableEnumTypes
          ? {
              readonly kind: "enum";
              readonly name: T;
              readonly _input: VariableEnumTypes[T];
            }
          : T extends keyof VariableInputObjectTypes
            ? {
                readonly kind: "input_object";
                readonly name: T;
                readonly _input: VariableInputObjectTypes[T];
              }
            : "Unknown variable type";
  export type VariableInput<T> = T extends {
    readonly kind: "non_null";
    readonly inner: infer Inner;
  }
    ? Exclude<VariableInput<Inner>, null>
    : T extends { readonly kind: "list"; readonly inner: infer Inner }
      ? ReadonlyArray<VariableInput<Inner>> | null
      : T extends { readonly kind: "scalar"; readonly name: infer Name }
        ? VariableScalarTypes[Name & keyof VariableScalarTypes] | null
        : T extends { readonly kind: "enum"; readonly name: infer Name }
          ? VariableEnumTypes[Name & keyof VariableEnumTypes] | null
          : T extends {
                readonly kind: "input_object";
                readonly name: infer Name;
              }
            ?
                | VariableInputObjectTypes[Name &
                    keyof VariableInputObjectTypes]
                | null
            : "Unknown variable type";
  type AllowNonNullableVariables<T> = T extends { readonly kind: "non_null" }
    ? T
    : T extends { readonly kind: "list"; readonly inner: infer Inner }
      ? { readonly kind: "non_null"; readonly inner: Inner }
      : T;

  interface Builder_Fragment {
    <
      const Result extends ReadonlyArray<
        SelectionSetSelection<PossibleTypes_Continent>
      >,
      Name extends string,
    >(
      name: Name,
      typeCondition: "Continent",
      builder: (b: Builder_Continent) => Result,
    ): FragmentDefinition<
      Name,
      PossibleTypes_Continent,
      "Continent",
      SelectionSetOutput<Result, PossibleTypes_Continent>
    >;
    <
      const Result extends ReadonlyArray<
        SelectionSetSelection<PossibleTypes_Continent>
      >,
      Name extends string,
      const Variables extends Record<string, string>,
    >(
      name: Name,
      typeCondition: "Continent",
      variables: Variables,
      builder: (
        b: Builder_Continent,
        v: {
          [K in keyof Variables]: ParseVariableDef<Variables[K]>;
        },
      ) => Result,
    ): FragmentDefinitionWithVariables<
      Name,
      PossibleTypes_Continent,
      "Continent",
      {
        [K in keyof Variables]: AllowNonNullableVariables<
          ParseVariableDef<Variables[K]>
        >;
      },
      SelectionSetOutput<Result, PossibleTypes_Continent>,
      {
        [K in keyof Variables]: VariableInput<ParseVariableDef<Variables[K]>>;
      }
    >;
    <
      const Result extends ReadonlyArray<
        SelectionSetSelection<PossibleTypes_Country>
      >,
      Name extends string,
    >(
      name: Name,
      typeCondition: "Country",
      builder: (b: Builder_Country) => Result,
    ): FragmentDefinition<
      Name,
      PossibleTypes_Country,
      "Country",
      SelectionSetOutput<Result, PossibleTypes_Country>
    >;
    <
      const Result extends ReadonlyArray<
        SelectionSetSelection<PossibleTypes_Country>
      >,
      Name extends string,
      const Variables extends Record<string, string>,
    >(
      name: Name,
      typeCondition: "Country",
      variables: Variables,
      builder: (
        b: Builder_Country,
        v: {
          [K in keyof Variables]: ParseVariableDef<Variables[K]>;
        },
      ) => Result,
    ): FragmentDefinitionWithVariables<
      Name,
      PossibleTypes_Country,
      "Country",
      {
        [K in keyof Variables]: AllowNonNullableVariables<
          ParseVariableDef<Variables[K]>
        >;
      },
      SelectionSetOutput<Result, PossibleTypes_Country>,
      {
        [K in keyof Variables]: VariableInput<ParseVariableDef<Variables[K]>>;
      }
    >;
    <
      const Result extends ReadonlyArray<
        SelectionSetSelection<PossibleTypes_Language>
      >,
      Name extends string,
    >(
      name: Name,
      typeCondition: "Language",
      builder: (b: Builder_Language) => Result,
    ): FragmentDefinition<
      Name,
      PossibleTypes_Language,
      "Language",
      SelectionSetOutput<Result, PossibleTypes_Language>
    >;
    <
      const Result extends ReadonlyArray<
        SelectionSetSelection<PossibleTypes_Language>
      >,
      Name extends string,
      const Variables extends Record<string, string>,
    >(
      name: Name,
      typeCondition: "Language",
      variables: Variables,
      builder: (
        b: Builder_Language,
        v: {
          [K in keyof Variables]: ParseVariableDef<Variables[K]>;
        },
      ) => Result,
    ): FragmentDefinitionWithVariables<
      Name,
      PossibleTypes_Language,
      "Language",
      {
        [K in keyof Variables]: AllowNonNullableVariables<
          ParseVariableDef<Variables[K]>
        >;
      },
      SelectionSetOutput<Result, PossibleTypes_Language>,
      {
        [K in keyof Variables]: VariableInput<ParseVariableDef<Variables[K]>>;
      }
    >;
    <
      const Result extends ReadonlyArray<
        SelectionSetSelection<PossibleTypes_Query>
      >,
      Name extends string,
    >(
      name: Name,
      typeCondition: "Query",
      builder: (b: Builder_Query) => Result,
    ): FragmentDefinition<
      Name,
      PossibleTypes_Query,
      "Query",
      SelectionSetOutput<Result, PossibleTypes_Query>
    >;
    <
      const Result extends ReadonlyArray<
        SelectionSetSelection<PossibleTypes_Query>
      >,
      Name extends string,
      const Variables extends Record<string, string>,
    >(
      name: Name,
      typeCondition: "Query",
      variables: Variables,
      builder: (
        b: Builder_Query,
        v: {
          [K in keyof Variables]: ParseVariableDef<Variables[K]>;
        },
      ) => Result,
    ): FragmentDefinitionWithVariables<
      Name,
      PossibleTypes_Query,
      "Query",
      {
        [K in keyof Variables]: AllowNonNullableVariables<
          ParseVariableDef<Variables[K]>
        >;
      },
      SelectionSetOutput<Result, PossibleTypes_Query>,
      {
        [K in keyof Variables]: VariableInput<ParseVariableDef<Variables[K]>>;
      }
    >;
    <
      const Result extends ReadonlyArray<
        SelectionSetSelection<PossibleTypes_State>
      >,
      Name extends string,
    >(
      name: Name,
      typeCondition: "State",
      builder: (b: Builder_State) => Result,
    ): FragmentDefinition<
      Name,
      PossibleTypes_State,
      "State",
      SelectionSetOutput<Result, PossibleTypes_State>
    >;
    <
      const Result extends ReadonlyArray<
        SelectionSetSelection<PossibleTypes_State>
      >,
      Name extends string,
      const Variables extends Record<string, string>,
    >(
      name: Name,
      typeCondition: "State",
      variables: Variables,
      builder: (
        b: Builder_State,
        v: {
          [K in keyof Variables]: ParseVariableDef<Variables[K]>;
        },
      ) => Result,
    ): FragmentDefinitionWithVariables<
      Name,
      PossibleTypes_State,
      "State",
      {
        [K in keyof Variables]: AllowNonNullableVariables<
          ParseVariableDef<Variables[K]>
        >;
      },
      SelectionSetOutput<Result, PossibleTypes_State>,
      {
        [K in keyof Variables]: VariableInput<ParseVariableDef<Variables[K]>>;
      }
    >;
    <
      const Result extends ReadonlyArray<
        SelectionSetSelection<PossibleTypes_Subdivision>
      >,
      Name extends string,
    >(
      name: Name,
      typeCondition: "Subdivision",
      builder: (b: Builder_Subdivision) => Result,
    ): FragmentDefinition<
      Name,
      PossibleTypes_Subdivision,
      "Subdivision",
      SelectionSetOutput<Result, PossibleTypes_Subdivision>
    >;
    <
      const Result extends ReadonlyArray<
        SelectionSetSelection<PossibleTypes_Subdivision>
      >,
      Name extends string,
      const Variables extends Record<string, string>,
    >(
      name: Name,
      typeCondition: "Subdivision",
      variables: Variables,
      builder: (
        b: Builder_Subdivision,
        v: {
          [K in keyof Variables]: ParseVariableDef<Variables[K]>;
        },
      ) => Result,
    ): FragmentDefinitionWithVariables<
      Name,
      PossibleTypes_Subdivision,
      "Subdivision",
      {
        [K in keyof Variables]: AllowNonNullableVariables<
          ParseVariableDef<Variables[K]>
        >;
      },
      SelectionSetOutput<Result, PossibleTypes_Subdivision>,
      {
        [K in keyof Variables]: VariableInput<ParseVariableDef<Variables[K]>>;
      }
    >;
  }

  interface Builder_Operation_Query {
    <
      const Result extends ReadonlyArray<
        SelectionSetSelection<PossibleTypes_Query>
      >,
    >(
      name: string,
      builder: (b: Builder_Query) => Result,
    ): Operation<SelectionSetOutput<Result, "Query">, {}>;
    <
      const Result extends ReadonlyArray<
        SelectionSetSelection<PossibleTypes_Query>
      >,
      const Variables extends Record<string, string>,
    >(
      name: string,
      variables: Variables,
      builder: (
        b: Builder_Query,
        v: {
          [K in keyof Variables]: ParseVariableDef<Variables[K]>;
        },
      ) => Result,
    ): Operation<
      SelectionSetOutput<Result, "Query">,
      {
        [K in keyof Variables]: VariableInput<ParseVariableDef<Variables[K]>>;
      }
    >;
  }

  export type Builder = {
    readonly fragment: Builder_Fragment;
    readonly query: Builder_Operation_Query;
  };
}

// @filename: types.d.ts
export namespace types {
  export type Boolean = boolean;
  export type Continent = {
    readonly code: ID;
    readonly countries: readonly Country[];
    readonly name: String;
  };
  export type ContinentFilterInput = {
    readonly code: StringQueryOperatorInput | null;
  };
  export type Country = {
    readonly awsRegion: String;
    readonly capital: String | null;
    readonly code: ID;
    readonly continent: Continent;
    readonly currencies: readonly String[];
    readonly currency: String | null;
    readonly emoji: String;
    readonly emojiU: String;
    readonly languages: readonly Language[];
    readonly name: String;
    readonly native: String;
    readonly phone: String;
    readonly phones: readonly String[];
    readonly states: readonly State[];
    readonly subdivisions: readonly Subdivision[];
  };
  export type CountryFilterInput = {
    readonly code: StringQueryOperatorInput | null;
    readonly continent: StringQueryOperatorInput | null;
    readonly currency: StringQueryOperatorInput | null;
    readonly name: StringQueryOperatorInput | null;
  };
  export type Float = number;
  export type ID = string | number;
  export type Int = number;
  export type Language = {
    readonly code: ID;
    readonly name: String;
    readonly native: String;
    readonly rtl: Boolean;
  };
  export type LanguageFilterInput = {
    readonly code: StringQueryOperatorInput | null;
  };
  export type Query = {
    readonly continent: Continent | null;
    readonly continents: readonly Continent[];
    readonly countries: readonly Country[];
    readonly country: Country | null;
    readonly language: Language | null;
    readonly languages: readonly Language[];
  };
  export type State = {
    readonly code: String | null;
    readonly country: Country;
    readonly name: String;
  };
  export type String = string;
  export type StringQueryOperatorInput = {
    readonly eq: String | null;
    readonly in: readonly String[] | null;
    readonly ne: String | null;
    readonly nin: readonly String[] | null;
    readonly regex: String | null;
  };
  export type Subdivision = {
    readonly code: ID;
    readonly emoji: String | null;
    readonly name: String;
  };
}

// @filename: gql/index.ts
import type { Builder } from "./builder";
import { builder } from "@gqlb/core";
export const b = builder as any as Builder;

export type { types } from "./types";

// @noErrors
// @filename: index.ts
// ---cut---
import { b } from "./gql";

const LIST_COUNTRIES_QUERY = b.query("ListCountries", (b) => [
  b.countries((b) => [
    b.code(),
    b.name(),
    b.c
//     ^|
  ]),
]);
```

The query above would produce the following GraphQL query:

```graphql
query ListCountries {
  countries {
    code
    name
  }
}
```

At each stage of this query, the `b` object is fully typed and scoped to and will only allow you to call functions that correspond to actual fields in the API's schema. This makes it impossible to write invalid queries.

```ts
// @errors: 2304 7006
const LIST_COUNTRIES_QUERY = b.query("ListCountries", (b) => [
  b.countries((b) => [
    b.code(),
    b.numChipotleLocations(), // this would result in a TS error
  ]),
]);
```

### Making a request

To execute a query, call the `document` function on the query object and pass that to your preferred GraphQL client. In this example, we're using the `graphql-request` library to make a one-off request to the Countries API.

```ts
// @errors: 2307 1109
import { b } from "./gql";
import { request } from "graphql-request";

const LIST_COUNTRIES_QUERY = b.query(...)

const data = await request(
  "https://countries.trevorblades.com",
  LIST_COUNTRIES_QUERY.document()
);

console.log(data.countries[0]); // { name: "Andorra", code: "AD" }
```

The `data` object in the code above is fully typed to match the response you'd get back from the API server. If you hovered over it in VS Code, you'd see the following type definition in its tooltip:

```ts
// @errors: 1155
const data: {
  readonly __typename: "Query";
  readonly countries: {
    readonly __typename: "Country";
    readonly code: string;
    readonly name: string;
  }[];
}
```

If you tried to access `data.whatever`, TypeScript would bark at you, saying "Property 'whatever' does not exist...". This is a huge developer experience win, because it prevents you
from writing certain types of faulty code without having to define any types manually.

## Next steps

That wraps up the very basics of installing, configuring, and using GQLB in a TypeScript project. Next, we'll discuss using variables in your GraphQL queries.