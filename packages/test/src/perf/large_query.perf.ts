import type { AnyFragmentDefinition } from "@gqlb/core";
import { b } from "../generated/test_01/b";

export const label = "Large Query";

export default function () {
	const productFragments: AnyFragmentDefinition[] = [];
	for (let i = 0; i < 1000; i++) {
		productFragments.push(
			b.fragment(`ProductFragment${i}`, "Product", (b) => [
				//
				b.id(),
				b.price(),
				b.name(),
			]),
		);
	}

	const fragments: AnyFragmentDefinition[] = [];
	for (let i = 0; i < 1000; i++) {
		fragments.push(
			b.fragment(`Fragment${i}`, "User", (b) => [
				//
				b.name(),
				b.cart((b) => [
					//
					b.edges((b) => [
						//
						b.node((b) => [
							//
							//
							// biome-ignore lint/suspicious/noExplicitAny: Any casting for dynamic fragments
							b.__fragment(productFragments[i]) as any,
						]),
					]),
					b.pageInfo((b) => [
						//
						b.endCursor(),
						b.hasNextPage(),
					]),
				]),
			]),
		);
	}

	const LARGE_QUERY = b.query("LargeQuery", (b) => [
		b.viewer((b) => {
			// biome-ignore lint/suspicious/noExplicitAny: Any casting for dynamic fragments
			return [...fragments.map((f) => b.__fragment(f))] as any;
		}),
	]);

	return LARGE_QUERY.document();
}
