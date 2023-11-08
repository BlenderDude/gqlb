import { Builder } from "./generated";

const b: Builder = {} as any;

const res = b.query((b) => [
  b.resource({ url: "test" }, (b) => [
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
  b.repository({ name: "test", owner: "test" }, (b) => [
    //
    b.name(),
  ]),
]);

type Output = (typeof res._output)["resource"];

const { resource } = res._output;

if (resource?.__typename === "Issue") {
  const { state } = resource;
}
