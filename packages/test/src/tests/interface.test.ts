import { describe, test, it } from "node:test";
import { parse, print } from "graphql";
import { b } from "../generated/test_01/b";
import assert from "node:assert/strict";

test("field selection", () => {
  const QUERY = b.query("BasicQuery", (b) => [
    //
    b.node({ id: "1" }, (b) => [
      //
      b.id(),
    ]),
  ]);

  const expected = parse(
    `
    query BasicQuery {
      __typename
      node(id: "1") {
        __typename
        id
      }
    }
  `,
    {
      noLocation: true,
    }
  );

  assert.strictEqual(print(QUERY.document()), print(expected));
});

test("inline fragment", () => {
  const QUERY = b.query("BasicQuery", (b) => [
    //
    b.node({ id: "1" }, (b) => [
      //
      b.id(),
      b.__on("User", (b) => [
        //
        b.name(),
      ]),
    ]),
  ]);

  const expected = parse(
    `
    query BasicQuery {
      __typename
      node(id: "1") {
        __typename
        id
        ... on User {
          __typename
          name
        }
      }
    }
  `,
    {
      noLocation: true,
    }
  );

  assert.strictEqual(print(QUERY.document()), print(expected));
});
