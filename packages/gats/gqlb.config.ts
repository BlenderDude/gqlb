import type { GQLBConfig } from "@gqlb/cli";

export default {
  generate: {
    countries: {
      schema: {
        introspect: "https://countries.trevorblades.com",
      },
      output: "src/gql",
    },
  },
} satisfies GQLBConfig;