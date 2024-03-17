import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { b } from "../generated/test_01/b";
import { parse, print } from "graphql";

describe("default args", () => {
  test("no value provided", () => {
    const QUERY = b.query("DefaultArgs", (b) => [
      //
      b.fieldWithDefaultArgs(),
    ]);

    const expected = parse(
      `query DefaultArgs {
        __typename
        fieldWithDefaultArgs
      }`,
      {
        noLocation: true,
      }
    );

    assert.strictEqual(print(QUERY.document()), print(expected));
  });

  test("value provided", () => {
    const QUERY = b.query("DefaultArgs", (b) => [
      //
      b.fieldWithDefaultArgs({ arg1: "value" }),
    ]);

    const expected = parse(
      `query DefaultArgs {
        __typename
        fieldWithDefaultArgs(arg1: "value")
      }`,
      {
        noLocation: true,
      }
    );

    assert.strictEqual(print(QUERY.document()), print(expected));
  });

  test("optional variable provided", () => {
    const QUERY = b.query("DefaultArgs", { var1: "String" }, (b, v) => [
      //
      b.fieldWithDefaultArgs({ arg1: v.var1 }),
    ]);

    const expected = parse(
      `query DefaultArgs($var1: String) {
        __typename
        fieldWithDefaultArgs(arg1: $var1)
      }`,
      {
        noLocation: true,
      }
    );

    assert.strictEqual(print(QUERY.document()), print(expected));
  });

  test("non-null variable provided", () => {
    const QUERY = b.query("DefaultArgs", { var1: "String!" }, (b, v) => [
      //
      b.fieldWithDefaultArgs({ arg1: v.var1 }),
    ]);

    const expected = parse(
      `query DefaultArgs($var1: String!) {
        __typename
        fieldWithDefaultArgs(arg1: $var1)
      }`,
      {
        noLocation: true,
      }
    );

    assert.strictEqual(print(QUERY.document()), print(expected));
  });
});
