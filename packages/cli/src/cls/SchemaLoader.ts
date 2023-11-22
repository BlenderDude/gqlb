import {
  GraphQLSchema,
  IntrospectionQuery,
  buildClientSchema,
  buildSchema,
  getIntrospectionQuery,
} from "graphql";
import request from "graphql-request";
import fs from "fs/promises";

export interface SchemaLoader {
  loadSchema(): Promise<GraphQLSchema>;
}

export class IntrospectionSchemaLoader implements SchemaLoader {
  constructor(
    private readonly url: string,
    private readonly headers: Record<string, string>
  ) {}

  async loadSchema(): Promise<GraphQLSchema> {
    const data = await request<IntrospectionQuery>({
      url: this.url,
      requestHeaders: this.headers,
      document: getIntrospectionQuery({
        descriptions: true,
      }),
    });
    return buildClientSchema(data);
  }
}

export class FileSchemaLoader {
  constructor(private readonly path: string) {}

  async loadSchema(): Promise<GraphQLSchema> {
    const schema = await fs.readFile(this.path, "utf8");
    return buildSchema(schema);
  }
}
