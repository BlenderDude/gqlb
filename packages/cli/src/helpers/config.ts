import { cosmiconfig } from "cosmiconfig";
import { z } from "zod";

export const schema = z.object({
  generate: z.record(
    z.string(),
    z.strictObject({
      schema: z.union([
        z.strictObject({
          sdl: z.string(),
        }),
        z.strictObject({
          introspect: z.string(),
        }),
      ]),
      output: z.string(),
      scalarTypes: z.record(z.string(), z.string()).optional(),
    })
  ),
  convert: z
    .strictObject({
      formatComment: z.boolean().optional().default(true),
    })
    .default({})
    .optional(),
});

export async function loadConfig() {
  const result = await cosmiconfig("gqlb").search(process.cwd());
  if (!result) {
    // list out the valid file names
    console.log(
      `No config file found. Please create a gqlb.config.ts file at the root of your project.`
    );
    process.exit(1);
  }
  const parsed = schema.safeParse(result.config);
  if (!parsed.success) {
    console.log(`Encountered the following errors while parsing config:`);
    for (const err of parsed.error.errors) {
      console.log(`${err.path.join(".")}: ${err.message}`);
    }
    process.exit(1);
  }
  return parsed.data;
}
