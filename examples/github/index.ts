import { print } from "graphql";
import { b } from "./generated";

const query = b.query("ExampleGithub", { url: "URL!" }, (b, v) => [
  b.resource({ url: v.url }, (b) => [
    //
    b.url(),
    b.resourcePath(),
    b.__on("Issue", (b) => [
      //
      b.state(),
    ]),
    b.__on("Bot", (b) => [
      //
      b.login(),
      b.avatarUrl(),
    ]),
  ]),
]);

async function main() {
  const doc = query.document();
  console.log(print(doc));
}

void main();
