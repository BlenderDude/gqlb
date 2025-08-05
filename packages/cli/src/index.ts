import type { z } from "zod";
import type { schema } from "./helpers/config";
export type GQLBConfig = z.input<typeof schema>;
