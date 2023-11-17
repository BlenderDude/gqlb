import { schema } from "./bin/helpers/config";

export * from "./helpers";
export * from "./runtime";
export type GQLBConfig = Zod.input<typeof schema>;
