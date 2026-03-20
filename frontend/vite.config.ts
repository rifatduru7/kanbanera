import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import mdx from '@mdx-js/rollup'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

function stripMdxFrontmatter() {
  return {
    name: 'strip-mdx-frontmatter',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      if (!id.endsWith('.mdx') || id.includes('?raw')) {
        return null
      }

      return code.replace(/^---[\s\S]*?---\s*/, '')
    },
  }
}

async function collectDocsFiles(rootDir: string, currentDir = rootDir): Promise<Record<string, string>> {
  const entries = await readdir(currentDir, { withFileTypes: true })
  const files: Record<string, string> = {}

  for (const entry of entries) {
    const entryPath = path.join(currentDir, entry.name)

    if (entry.isDirectory()) {
      Object.assign(files, await collectDocsFiles(rootDir, entryPath))
      continue
    }

    if (!entry.name.endsWith('.mdx')) {
      continue
    }

    const relativePath = path.relative(rootDir, entryPath).split(path.sep).join('/')
    const contents = await readFile(entryPath, 'utf8')
    files[`/src/content/docs/${relativePath}`] = contents
  }

  return files
}

function virtualDocsManifest() {
  const virtualId = 'virtual:docs-manifest'
  const resolvedVirtualId = '\0virtual:docs-manifest'

  return {
    name: 'virtual-docs-manifest',
    resolveId(source: string) {
      if (source === virtualId) {
        return resolvedVirtualId
      }

      return null
    },
    async load(id: string) {
      if (id !== resolvedVirtualId) {
        return null
      }

      const docsDir = path.resolve(process.cwd(), 'src/content/docs')
      const manifest = await collectDocsFiles(docsDir)
      return `export default ${JSON.stringify(manifest)};`
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    virtualDocsManifest(),
    stripMdxFrontmatter(),
    { enforce: 'pre', ...mdx({
      remarkPlugins: [remarkGfm],
      rehypePlugins: [
        rehypeSlug,
        [rehypeAutolinkHeadings, { behavior: 'wrap' }],
      ],
    }) },
    react(),
    tailwindcss(),
  ],
})
