import { OutputOf, b } from "./generated";
import { print } from "graphql";
import request from "graphql-request";

const frag = b.fragment("Countries", "Country", (b) => [
  //
  b.capital(),
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
]);

const COUNTRIES_QUERY = b.query("CountriesQuery", (b) => [
  //
  b.countries((b) => [
    //
    b.capital(),
  ]),
]);

type CountriesOutput = OutputOf<typeof COUNTRIES_QUERY>;

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
