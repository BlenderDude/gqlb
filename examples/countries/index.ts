import { OutputOf, b } from "./generated";
import { print } from "graphql";
import request from "graphql-request";

const subFragment = b.fragment("SubFragment", "Country", (b) => [
  //
  b.capital(),
]);

const frag = b.fragment("Countries", "Country", (b) => [
  //
  subFragment,
  b.currency(),
]);

type CountryOutput = OutputOf<typeof frag>;

const res = b.query("CountriesQuery", { code: "ID!" }, (b, v) => [
  //
  b.country({ code: v.code }, (b) => [
    //
    frag,
    b.__on("Country", (b) => [
      //
      b.emoji(),
    ]),
    b.awsRegion(),
  ]),
  b.country(
    { code: "US" },
    (b) => [
      //
      b.name(),
    ],
    "unitedStates"
  ),
]);

async function main() {
  const document = res.document();
  console.log(print(document));
  const data = await request({
    url: "https://countries.trevorblades.com/",
    document,
    variables: {
      code: "US",
    },
  });
  console.log(JSON.stringify(data, null, 2));
}

void main();
