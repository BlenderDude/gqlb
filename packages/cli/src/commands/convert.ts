import {
  FragmentDefinitionNode,
  Kind,
  OperationDefinitionNode,
  SelectionSetNode,
  TypeNode,
  ValueNode,
  parse,
} from "graphql";
import prettier from "prettier";
import { loadConfig } from "../helpers/config";
import { copyToClipboard } from "../helpers/copy";

function makeScreamingSnakeCase(name: string) {
  return name
    .split(/(?=[A-Z])/)
    .join("_")
    .toUpperCase();
}

function printType(type: TypeNode): string {
  switch (type.kind) {
    case Kind.NAMED_TYPE:
      return type.name.value;
    case Kind.LIST_TYPE:
      return `[${printType(type.type)}]`;
    case Kind.NON_NULL_TYPE:
      return `${printType(type.type)}!`;
  }
}

function printValue(value: ValueNode): string {
  switch (value.kind) {
    case Kind.INT:
      return value.value;
    case Kind.FLOAT:
      return value.value;
    case Kind.STRING:
      return `"${value.value}"`;
    case Kind.BOOLEAN:
      return String(value.value);
    case Kind.NULL:
      return "null";
    case Kind.ENUM:
      return value.value;
    case Kind.LIST:
      return `[${value.values.map(printValue).join(", ")}]`;
    case Kind.OBJECT:
      return `{${value.fields
        .map((f) => `${f.name.value}: ${printValue(f.value)}`)
        .join(", ")}}`;
    case Kind.VARIABLE:
      return `v.${value.name.value}`;
  }
}

function makeSelections(
  selectionSet: SelectionSetNode,
  formatComment: boolean
) {
  const elements: string[] = [];
  for (const s of selectionSet.selections) {
    if (s.kind === Kind.FIELD) {
      if (s.name.value === "__typename") {
        continue;
      }
      const name = s.name.value;
      const fieldArgs: string[] = [];
      if (s.arguments && s.arguments.length > 0) {
        fieldArgs.push(`
          { ${s.arguments
            .map((arg) => `${arg.name.value}: ${printValue(arg.value)}`)
            .join(",\n")} }
        `);
      }
      if (s.selectionSet && s.selectionSet.selections.length > 0) {
        fieldArgs.push(`b => ${makeSelections(s.selectionSet, formatComment)}`);
      }
      let alias = "";
      if (s.alias) {
        alias = `.alias("${s.alias.value}")`;
      }
      elements.push(`b.${name}(${fieldArgs.join(", ")})${alias}`);
      continue;
    }
    if (s.kind === Kind.INLINE_FRAGMENT) {
      elements.push(
        `b.__on("${s.typeCondition!.name.value}", b => ${makeSelections(
          s.selectionSet,
          formatComment
        )})`
      );
      continue;
    }
    if (s.kind === Kind.FRAGMENT_SPREAD) {
      elements.push(
        `b.__fragment(${makeScreamingSnakeCase(s.name.value) + "_FRAGMENT"})`
      );
      continue;
    }
  }
  return `[
    ${formatComment ? "//" : ""}
    ${elements.join(",\n")}
  ]`;
}

function getFragmentNames(selectionSet: SelectionSetNode): Set<string> {
  const fragments = new Set<string>();
  for (const s of selectionSet.selections) {
    if (s.kind === Kind.FRAGMENT_SPREAD) {
      fragments.add(s.name.value);
    }
    if (
      (s.kind === Kind.FIELD || s.kind === Kind.INLINE_FRAGMENT) &&
      s.selectionSet
    ) {
      for (const f of getFragmentNames(s.selectionSet)) {
        fragments.add(f);
      }
    }
  }
  return fragments;
}

function isValidDocument(str: string) {
  try {
    const doc = parse(str);
    const fragments = new Set<string>();
    const requiredFragments = new Set<string>();
    for (const def of doc.definitions) {
      if (def.kind === Kind.FRAGMENT_DEFINITION) {
        fragments.add(def.name.value);
        for (const f of getFragmentNames(def.selectionSet)) {
          requiredFragments.add(f);
        }
      }
      if (def.kind === Kind.OPERATION_DEFINITION) {
        for (const f of getFragmentNames(def.selectionSet)) {
          requiredFragments.add(f);
        }
      }
    }
    for (const rf of requiredFragments) {
      if (!fragments.has(rf)) {
        return false;
      }
    }
    return doc.definitions.some((d) => d.kind === Kind.OPERATION_DEFINITION);
  } catch {
    return false;
  }
}

export async function convert() {
  const config = await loadConfig();
  console.log("Paste GraphQL query below and press Ctrl+D when done:");

  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
    if (isValidDocument(Buffer.concat(chunks).toString())) {
      break;
    }
  }

  const query = Buffer.concat(chunks).toString();
  const ast = parse(query, { noLocation: true });

  const results: string[] = [];

  const fragments = ast.definitions.filter(
    (def) => def.kind === Kind.FRAGMENT_DEFINITION
  ) as FragmentDefinitionNode[];

  for (const fragment of fragments) {
    const name = fragment.name.value;
    const typeCondition = fragment.typeCondition!.name.value;
    const selections = makeSelections(
      fragment.selectionSet,
      config.convert?.formatComment ?? true
    );
    results.push(`
      const ${makeScreamingSnakeCase(
        name.replace(/Fragment$/, "")
      )}_FRAGMENT = b.fragment("${name}", "${typeCondition}", b => ${selections});
    `);
  }

  const operations = ast.definitions.filter(
    (def) => def.kind === Kind.OPERATION_DEFINITION
  ) as OperationDefinitionNode[];
  if (operations.length > 1) {
    throw new Error("Only one operation is supported");
  }

  for (const operation of operations) {
    const name = operation.name?.value ?? "Unnamed";
    const operationType = operation.operation;
    const selections = makeSelections(
      operation.selectionSet,
      config.convert?.formatComment ?? true
    );

    const operationArgs: string[] = [];

    operationArgs.push(`"${name}"`);
    if (
      operation.variableDefinitions &&
      operation.variableDefinitions.length > 0
    ) {
      operationArgs.push(
        `{ ${operation.variableDefinitions
          .map((v) => `${v.variable.name.value}: "${printType(v.type)}"`)
          .join(", ")} }`
      );
      operationArgs.push(`(b, v) => ${selections}`);
    } else {
      operationArgs.push(`(b) => ${selections}`);
    }

    results.push(`
      const ${makeScreamingSnakeCase(
        name.replace(/(Query|Mutation|Subscription)$/, "")
      )}_${operationType.toUpperCase()} = b.${operationType}(${operationArgs.join(
        ", "
      )});
    `);
  }

  const code = await prettier.format(results.join("\n\n"), {
    parser: "typescript",
  });

  console.log("==== Output ====\n");

  console.log(code);

  console.log("\n==== End Output ====");
  if (copyToClipboard(code)) {
    console.log("Copied to clipboard!");
  }
}
