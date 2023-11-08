import { Builder } from "./generated";
import request from "graphql-request";

const b: Builder = {} as any;

const res = b.query({ code: "ID!" }, (b, v) => [
  //
  b.country({ code: v.code }, (b) => [
    //
    b.capital(),
  ]),
]);

async function main() {
  const document = res.document();
  const data = await request({
    url: "https://countries.trevorblades.com/",
    document,
    variables: {
      code: "US",
    },
  });
}

void main();
