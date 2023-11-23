import { GraphQLSchema } from "graphql";
import { z } from "zod";
import { FileWriter } from "./FileWriter";
import { Project } from "ts-morph";

export const GeneratorOptionsSchema = z.strictObject({
  schema: z.union([
    z.instanceof(GraphQLSchema),
    z.strictObject({
      sdl: z.string(),
    }),
    z.strictObject({
      introspect: z.string(),
    }),
  ]),
  output: z.string(),
  scalarTypes: z.record(z.string(), z.string()).optional(),
  possibleTypes: z.boolean().default(false),
  emitTypes: z.boolean().default(true),
});

export class Generator {
  constructor(
    private options: z.output<typeof GeneratorOptionsSchema>,
    private readonly writer: FileWriter
  ) {}

  generate(schema: GraphQLSchema) {
    const project = new Project({
      compilerOptions: {
        strict: true,
      },
    });
  }
}
