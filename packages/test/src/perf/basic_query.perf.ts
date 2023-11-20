import { b } from "../generated/test_01/b";

export const label = "Basic Query";

export default function () {
  const QUERY = b.query('BasicQuery', b => [
    //
    b.viewer(b => [
      //
      b.name(),
    ])
  ])

  return QUERY.document();
}