import { StatementStructures } from "ts-morph";

export interface StatementGenerator {
  generate(): StatementStructures[];
}
