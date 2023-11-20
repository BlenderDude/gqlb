import {GQLBConfig} from "@gqlb/cli";

export default {
  generate: {
    test_01: {
      output: "src/generated/test_01/b",
      schema: {
        sdl: "schemas/test_01.graphql"
      },
    }
  }
} satisfies GQLBConfig;