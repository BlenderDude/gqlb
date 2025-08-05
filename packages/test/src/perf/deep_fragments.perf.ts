/** biome-ignore-all lint/suspicious/noExplicitAny: Any casting for dynamic fragments */
import type { AnyFragmentDefinition } from "@gqlb/core";
import type { DocumentNode } from "graphql";
import { b } from "../generated/test_01/b";

function makeRecursiveFragment(depth: number) {
	let lastFragment: null | AnyFragmentDefinition = null;
	while (depth > 0) {
		if (lastFragment === null) {
			lastFragment = b.fragment(`RecursiveFragment_${depth}`, "User", (b) => [
				//
				b.name(),
			]);
		} else {
			lastFragment = b.fragment(`RecursiveFragment_${depth}`, "User", (b) => [
				//
				b.name(),
				b.__fragment(lastFragment) as any,
			]);
		}
		depth--;
	}
	return lastFragment;
}

export const label = "Deep Fragments";

export default function (): DocumentNode {
	const QUERY = b.query("DeepFragments", (b) => [
		b.__fragment(makeRecursiveFragment(500)) as any,
	]);
	return QUERY.document();
}
