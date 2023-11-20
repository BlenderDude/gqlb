import { schema } from "./helpers/config";
import { z } from "zod";
export type GQLBConfig = z.input<typeof schema>;
