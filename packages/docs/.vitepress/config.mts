import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
	title: "GQLB",
	description: "A TypeScript-first GraphQL query builder with full type safety",
	themeConfig: {
		// https://vitepress.dev/reference/default-theme-config
		nav: [
			{ text: "Home", link: "/" },
			{ text: "Guide", link: "/guide/getting-started" },
			{ text: "API Reference", link: "/api/overview" },
			{ text: "Examples", link: "/examples/basic-queries" },
		],

		sidebar: [
			{
				text: "Getting Started",
				items: [
					{ text: "Introduction", link: "/guide/getting-started" },
					{ text: "Installation", link: "/guide/installation" },
					{ text: "Configuration", link: "/guide/configuration" },
					{ text: "Code Generation", link: "/guide/code-generation" },
				],
			},
			{
				text: "Core Concepts",
				items: [
					{ text: "Query Building", link: "/guide/query-building" },
					{ text: "Type Safety", link: "/guide/type-safety" },
					{ text: "Variables", link: "/guide/variables" },
					{ text: "Fragments", link: "/guide/fragments" },
					{ text: "Inline Fragments", link: "/guide/inline-fragments" },
				],
			},
			{
				text: "Advanced Features",
				items: [
					{ text: "Custom Scalars", link: "/guide/custom-scalars" },
					{ text: "Schema Introspection", link: "/guide/schema-introspection" },
					{ text: "Performance", link: "/guide/performance" },
				],
			},
			{
				text: "API Reference",
				items: [
					{ text: "Overview", link: "/api/overview" },
					{ text: "Builder API", link: "/api/builder" },
					{ text: "Runtime API", link: "/api/runtime" },
					{ text: "CLI Commands", link: "/api/cli" },
					{ text: "Configuration", link: "/api/configuration" },
				],
			},
			{
				text: "Examples",
				items: [
					{ text: "Basic Queries", link: "/examples/basic-queries" },
					{ text: "Complex Queries", link: "/examples/complex-queries" },
					{ text: "Mutations", link: "/examples/mutations" },
					{ text: "Subscriptions", link: "/examples/subscriptions" },
					{ text: "Fragment Usage", link: "/examples/fragments" },
				],
			},
		],

		socialLinks: [
			{ icon: "github", link: "https://github.com/BlenderDude/gqlb" },
		],

		footer: {
			message: "Released under the MIT License.",
			copyright: "Copyright © 2025 GQLB Contributors",
		},

		search: {
			provider: "local",
		},
	},
});
