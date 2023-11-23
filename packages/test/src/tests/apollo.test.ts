import { useMutation } from "@apollo/client";
import { describe, test, mock } from "node:test";
import { b } from "../generated/test_01/b";

const mockUseMutation = mock.fn(useMutation, () => {});

describe("Apollo", () => {
  test("optimistic updates", () => {
    const sf = b.fragment("SF", "CartConnection", (b) => [
      b.pageInfo((b) => [b.hasNextPage(), b.hasPreviousPage()]),
    ]);
    const f = b.fragment("F", "User", (b) => [
      //
      b.id(),
      b.cart({ first: 1 }, (b) => [
        //
        b.__fragment(sf),
      ]),
    ]);
    const fb = b.fragment("FB", "User", (b) => [
      //
      b.name(),
      b.email(),
    ]);
    const q = b.query("Q", (b) => [
      //
      b.user({ id: "1" }, (b) => [
        //
        b.__fragment(f),
        b.__fragment(fb),
      ]),
    ]);
    useMutation(q.document(), {
      optimisticResponse: {
        __typename: "Query",
        user: {
          ...b.anyFragment,
          __typename: "User",
          id: "1",
          email: "",
          name: "John",
          cart: {
            ...b.anyFragment,
            __typename: "CartConnection",
            pageInfo: {
              __typename: "PageInfo",
              hasNextPage: false,
              hasPreviousPage: false,
            },
          },
        },
      },
    });
  });
});
