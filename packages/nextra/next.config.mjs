import nextra from 'nextra';
import remarkCodeImport from 'remark-code-import'
import remarkFolderImport from '@locoworks/remark-folder-import'
import rehypeShikiji from 'rehype-shikiji'
import { transformerTwoSlash, rendererRich } from "shikiji-twoslash";

const withNextra = nextra({
  codeHighlight: false,
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.jsx',
  mdxOptions: {
    rehypePlugins: [[rehypeShikiji, {
      theme: 'vitesse-dark',
      transformers: [
        transformerTwoSlash({
          explicitTrigger: true,
          renderer: rendererRich(),
        })
      ]
    }]],
    remarkPlugins: [
      remarkFolderImport,
    ],
  },
})

export default withNextra()