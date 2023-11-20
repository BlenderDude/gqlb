import {describe, test, it} from "node:test"
import {parse} from "graphql";
import { b } from "../generated/test_01/b";
import assert from "node:assert/strict";

test('basic query operation', () => {
  const QUERY = b.query('BasicQuery', b => [
    //
    b.viewer(b => [
      //
      b.name(),
    ])
  ])

  const expected = parse(`
    query BasicQuery {
      __typename
      viewer {
        __typename
        name
      }
    }
  `, {
    noLocation: true
  });

  assert.deepEqual(QUERY.document(), expected);
});

test('basic query operation with variables', () => {
  const QUERY = b.query('BasicQuery', { id: "String!" }, (b,v) => [
    //
    b.user({ id: v.id }, b => [
      //
      b.name(),
    ])
  ])

  const expected = parse(`
    query BasicQuery($id: String!) {
      __typename
      user(id: $id) {
        __typename
        name
      }
    }
  `, {
    noLocation: true
  });

  assert.deepEqual(QUERY.document(), expected);
});