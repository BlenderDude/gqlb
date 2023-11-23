import { describe, it } from "node:test";
import { b } from "../generated/test_01/b";
import { FragmentRef, OutputOf } from "@gqlb/core";

describe("Fragments refs", () => {
  it("should produce a fragment ref", () => {
    const f_b = b.fragment("B", "User", (b) => [b.id()]);
    const f_a = b.fragment("A", "User", (b) => [
      //
      b.id(),
      b.__fragment(f_b),
    ]);
    const q = b.query("Q", (b) => [
      //
      b.user({ id: "1" }, (b) => [
        //
        b.__fragment(f_a),
      ]),
    ]);
    const output = "" as any as OutputOf<typeof q>;
    function assertFragmentRef(_: FragmentRef<typeof f_a> | null) {}
    assertFragmentRef(output.user);
  });
  it("should not accept raw FragmentData when a ref is needed", () => {
    const f_a = b.fragment("A", "User", (b) => [
      //
      b.id(),
      b.name(),
      b.email(),
    ]);
    const q = b.query("Q", (b) => [
      b.user({ id: "1" }, (b) => [
        //
        b.id(),
        b.name(),
        b.email(),
      ]),
    ]);
    const output = "" as any as OutputOf<typeof q>;
    function assertFragmentRef(_: FragmentRef<typeof f_a> | null) {}
    // @ts-expect-error
    assertFragmentRef(output.user);
  });
  it("should accept mocked FragmentData when a ref is needed", () => {
    const f = b.fragment("F", "User", (b) => [
      //
      b.id(),
      b.name(),
      b.email(),
    ]);
    type Test = FragmentRef<typeof f>;
    function assertFragmentRef(_: Test | null) {}
    assertFragmentRef(
      f.mock({
        __typename: "User",
        id: "1",
        email: "text@example.com",
        name: "John Doe",
      })
    );
  });
  it("should not accept raw FragmentData when a ref is needed", () => {
    const f = b.fragment("F", "User", (b) => [
      //
      b.id(),
      b.name(),
      b.email(),
    ]);
    function assertFragmentRef(_: FragmentRef<typeof f> | null) {}
    // @ts-expect-error
    assertFragmentRef({
      __typename: "User",
      id: "1",
      email: "",
      name: "",
    });
  });
  it("should accept a mock fragment when the data matches, disregarding the ref", () => {
    const fb = b.fragment("FB", "User", (b) => [
      //
      b.id(),
    ]);

    const f = b.fragment("F", "User", (b) => [
      //
      b.id(),
      b.name(),
      b.email(),
      b.__fragment(fb),
    ]);
    function assertFragmentRef(_: FragmentRef<typeof f> | null) {}
    assertFragmentRef(
      f.mock({
        __typename: "User",
        id: "1",
        email: "",
        name: "",
      })
    );
  });
});
