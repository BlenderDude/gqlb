import { GQLBConfig } from "..";

export function getScalarTypes(config: GQLBConfig["generate"][string]) {
  const { scalarTypes } = config;
  const baseTypes: Record<string, string> = {
    String: "string",
    Int: "number",
    Float: "number",
    Boolean: "boolean",
    ID: "string | number",
    ...scalarTypes,
  };
  return baseTypes;
}
