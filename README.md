# GQLB (Name WIP)

Statically typed query builder without fully auto-typed input and output.

### Getting Started w/ Examples

To build the codegen'd files, run `pnpm generate:github && pnpm generate:countries`. This runs the CLI to build the `generated.ts`
files for each schema.

Once complete, the typing will be available for the example schemas found under `examples/github` and `examples/countries`

### Basic Query

Once codegen is complete, an operation can be built from the root builder (`b`). The root builder has
properties for `query`, `mutation`, `subscription`, depending on the types in your schema. `fragment` is
always available and will be used to create fragment definitions.

With the `b` object imported, we can call `.query()` on it to begin our build. The first argument is the
name, while the second argument is a builder function to select fields. See this basic structure below:

```ts
import { b } from "./generated";

const COUNTRIES_QUERY = b.query("CountriesQuery", (b) => [
  //
  // ^ Use a comment here to force the formatter to break the array line
  //   giving consistent formatting for all selections
]);
```

Once written, the TS compiler will complain that the selection set must have at least one element. This is
true because our query must have at least one field selected! Let's select the field `countries`, from the
`b` field selector.

```ts
import { b } from "./generated";

const COUNTRIES_QUERY = b.query("CountriesQuery", (b) => [
  //
  b.countries(),
]);
```

Oh no! Once again the compiler is warning us that `b.countries()` needs a `builder` argument. Let's make it
happy by selecting the `capital` field in the sub-builder.

```ts
import { b } from "./generated";

const COUNTRIES_QUERY = b.query("CountriesQuery", (b) => [
  //
  b.countries((b) => [
    //
    b.capital(),
  ]),
]);
```

Yay! The compiler is all happy--but how does it know that `capital` doesn't need a builder but `countries` does?

During the codegen process, a unique interface is generated for each GraphQL type that defines its fields and subtypes.
These are then parsed by Typescript and allows for autocomplete and full type checking!

### Output Typing

As the query builder is fully aware of the GraphQL schema, output typing is dynamic and _instant_ with every change (no more watch commands!). Taking our `CountriesQuery` from before, we can use `OutputOf` to observe it's output.

```ts
import { b, OutputOf } from "./generated";

const COUNTRIES_QUERY = b.query("CountriesQuery", (b) => [...]);

type CountriesOutput = OutputOf<typeof COUNTRIES_QUERY>;
/*
{
  readonly __typename: "Query";
  readonly countries: readonly {
      readonly capital: string | null;
      readonly __typename: "Country";
  }[];
}
*/
```

Not only does the typing information match the query we built, but it also pulls additional
information from the schema, like `__typename`, Lists, and NonNull!

### Variables

Sometimes, we need to pass data into our queries. Instead of accessing all countries, let's pick one
by using the `country` field!

```ts
import { b } from "./generated";

const COUNTRY_QUERY = b.query("CountryQuery", (b) => [
  //
  b.country((b) => [
    //
    b.capital(),
  ]),
]);
```

Typescript tells us that our current query is not satisfactory, and that we need two arguments to `b.country`!
The argument that we are missing is the arguments! The arguments are strictly typed again and can be defined before the builder.

```ts
import { b } from "./generated";

const COUNTRY_QUERY = b.query("CountryQuery", (b) => [
  //
  b.country({code: /*???*/},(b) => [
    //
    b.capital(),
  ]),
]);
```

As mentioned earlier, we want to use a variable for this query, so how do we make one? There is another optional argument for `query` that comes before the builder we can provide. This let's us define variables we wish to use in the query.

```ts
import { b } from "./generated";

const COUNTRY_QUERY = b.query("CountryQuery", {code: "String!"}, (b) => [
  ...
]);
```

Typescript will now lexicographically parse your variable types and compare them against your schema to assure they are real!
If you, for example, passed `{code: "NotAType!"}`, Typescript will fail to parse this into a variable definition and it will be unusable. Speaking of using... how _do_ we use this variable?

By adding the variables definition to the query, this unlocks a second parameter for our operation builder which allows us to access the variables! With that, let's complete our query!

```ts
import { b } from "./generated";

const COUNTRY_QUERY = b.query("CountryQuery", { code: "String!" }, (b, v) => [
  //
  b.country({ code: v.code }, (b) => [
    //
    b.capital(),
  ]),
]);
```

Usage of the variable in `{code: v.code}` will also be type-checked and will throw compiler errors if it is invalid. It is even smart enough to know a field that wants a `String` will accept a variable type of `String!`!

### Inline Fragments

To define an inline fragment you can use the special `__on` property of the builder to access type-safe fragment building. After selecting the
property and writing the following `__on("`, intellisense will kick in and tell you all of the available types for inline fragments that are valid _at that exact point in your query_. It knows whether you are on an interface, union, or object type!

For our countries, we can hoist our `b.capital()` into an inline fragment for a brief example!

```ts
import { b } from "./generated";

const COUNTRIES_QUERY = b.query("CountriesQuery", (b) => [
  //
  b.countries((b) => [
    //
    b.__on("Country", (b) => [
      //
      b.capital(),
    ]),
  ]),
]);
```

This will produce the following GraphQL document:

```graphql
query CountriesQuery {
  __typename
  countries {
    __typename
    ... on Country {
      capital
    }
  }
}
```

Note the output typing will remain, and is still correct with the inline fragment!

### Defined Fragments

It is useful to have a fragment that is defined outside of the main query. This might be for a component, or to make re-usable
building blocks for large queries. What does that look like in GQLB?

Defining a fragment is as simple as calling the `b.fragment()` property on the root builder. From there, it will expect a name as the first argument, typeCondition as the second, and a builder as the third

`b.fragment(name: string, typeCondition: PossibleTypes, builder: Builder)`

Let's define our `b.capital` field inside of a defined fragment and then use it in the query. First, let's define it!

```ts
import { b } from "./generated";

const COUNTRY_FRAGMENT = b.fragment("CountryFragment", "Country", (b) => [
  //
  b.capital(),
]);
```

Note that `Country` is on the list of allowed possible types for a fragment, not just a simple string! The builder is as strict and type-safe
as possible! Furthermore, the builder is aware of your type condition, and provides intellisense and type checking for every selection.

With the fragment defined, we can just drop it into our query and we are off to the races!

```ts
import { b } from "./generated";

const COUNTRY_FRAGMENT = b.fragment("CountryFragment", "Country", (b) => [
  //
  b.capital(),
]);

const COUNTRIES_QUERY = b.query("CountriesQuery", (b) => [
  //
  b.countries((b) => [
    //
    COUNTRY_FRAGMENT,
  ]),
]);
```

All done! But, if you need typing information for that specific fragment, it can be pulled using the same `OutputOf` helper!

```ts
import { b } from "./generated";

const COUNTRY_FRAGMENT = b.fragment("CountryFragment", "Country", (b) => [
  //
  b.capital(),
]);

type CountryFragmentOutput = OutputOf<typeof COUNTRY_FRAGMENT>;
/*{
  readonly capital: string | null;
  readonly __typename: "Country";
}*/
```

### Field Comments and Deprecation

If a field you go to select is deprecated, your editor will display this deprecation in the same way it shows any other JSDoc deprecation.
In the case of VSCode, this would be a strikethrough and you can hover for the deprecation reason. Ex. `b.`~~`countries()`~~

For field definitions, any selected field can be hovered and its definition will be available just like any other JSDoc signature!
