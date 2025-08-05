import { describe, it } from "node:test";
import type { OutputOf } from "@gqlb/core";
import { b } from "../generated/test_01/b";

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
		const _output = "" as any as OutputOf<typeof q>;
		// function assertFragmentRef(_: FragmentRef<typeof f_a> | null) {}
		// assertFragmentRef(output.user);
	});
});
