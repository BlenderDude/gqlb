import React from "react";
import { useQuery, useFragment } from "@apollo/client";
import request from "graphql-request";
import { OutputOf, b } from "./generated";

const BOT_FRAGMENT = b.fragment("BotFragment", "Bot", (b) => [
  //
  b.login(),
  b.avatarUrl(),
]);

const EXAMPLE_GITHUB_QUERY = b.query(
  "ExampleGithub",
  { url: "URI!" },
  (b, v) => [
    b.resource({ url: v.url }, (b) => [
      //
      b.url(),
      b.resourcePath(),
      b.__on("Issue", (b) => [
        //
        b.state(),
      ]),
      b.__on("Bot", (b) => [
        b.avatarUrl(),
        b.createdAt(),
        b.databaseId(),
        b.id(),
        b.login(),
        b.resourcePath(),
        b.url(),
      ]),
      b.__on("CheckRun", (b) => [
        b.id(),
        b.name(),
        b.conclusion(),
        b.detailsUrl(),
        b.isRequired(),
        b.summary(),
        b.conclusion(),
        b.deployment((b) => [
          //
          b.commit((b) => [
            //
            b.authors((b) => [
              //
              b.nodes((b) => [
                //
                b.name(),
              ]),
            ]),
          ]),
        ]),
        b.completedAt(),
        b.externalId(),
      ]),
      b.url(),
      b.__on("PullRequest", (b) => [
        //
        b.id(),
      ]),
    ]),
  ]
);

const FragmentData: React.FC<{
  data: OutputOf<typeof BOT_FRAGMENT>;
}> = ({ data }) => {
  return <div>{data.login}</div>;
};

const UseFragment: React.FC = () => {
  const result = useFragment({
    fragment: BOT_FRAGMENT.tdn(),
    fragmentName: BOT_FRAGMENT.name,
    from: {
      __typename: "Bot",
      id: "test",
    },
  });
  if (!result.complete) {
    return "Loading...";
  }
  return <pre>{result.data.login}</pre>;
};

const Component: React.FC = () => {
  const { data } = useQuery(EXAMPLE_GITHUB_QUERY.document());

  return (
    <div>
      <pre>{JSON.stringify(data, null, 2)}</pre>
      {data?.resource?.__typename === "Bot" && (
        <FragmentData data={data.resource} />
      )}
    </div>
  );
};

async function main() {
  const data = await request({
    url: "https://api.github.com/graphql",
    document: EXAMPLE_GITHUB_QUERY.document(),
    variables: {
      url: "test",
    },
  });
  const { resource } = data;
  if (resource?.__typename === "Bot") {
    console.log(resource.login);
  }
  if (resource?.__typename === "Issue") {
    console.log(resource.state);
  }
}

void main();
