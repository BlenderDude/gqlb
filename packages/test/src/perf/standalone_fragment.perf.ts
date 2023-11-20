import { b } from "../generated/test_01/b";

export const label = "Standalone Fragment";

export default function () {
  const FRAGMENT = b.fragment('StandaloneFragment', 'User', b => [
    //
    b.name(),
    b.cart(b => [
      //
      b.edges(b => [
        //
        b.node(b => [
          //
          b.id(),
          b.price(),
          b.name(),
        ])
      ]),
      b.pageInfo(b => [
        //
        b.endCursor(),
        b.hasNextPage(),
      ])
    ])
  ])

  FRAGMENT.document();
}