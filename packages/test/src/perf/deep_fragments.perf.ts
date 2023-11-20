import { FragmentDefinition } from "@gqlb/core";
import { b } from "../generated/test_01/b";


function makeRecursiveFragment(depth: number): FragmentDefinition {
  let lastFragment: null | FragmentDefinition = null;
  while(depth > 0) {
    if(lastFragment === null) {
      lastFragment = b.fragment(`RecursiveFragment_${depth}`, 'User', b => [
        //
        b.name(),
      ]);
    }else {
      lastFragment = b.fragment(`RecursiveFragment_${depth}`, 'User', b => [
        //
        b.name(),
        b.__fragment(lastFragment!)
      ]);
    }
    depth--;
  }
  return lastFragment!;
}

export const label = "Deep Fragments";

export default function() {
  const QUERY = b.query('DeepFragments', b => [
    b.__fragment(makeRecursiveFragment(500)),
  ])
  return QUERY.document();
}