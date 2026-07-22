/* global console */
import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const assetsDir = 'dist/assets'
const files = await readdir(assetsDir)
const assets = []

for (const file of files) {
  const path = join(assetsDir, file)
  const info = await stat(path)
  assets.push({ file, bytes: info.size })
}

assets.sort((a, b) => b.bytes - a.bytes)

const index = await readFile('dist/index.html', 'utf8')
const summary = {
  generatedAt: new Date().toISOString(),
  totalAssetBytes: assets.reduce((sum, asset) => sum + asset.bytes, 0),
  largestAssets: assets.slice(0, 10),
  initialScripts: [...index.matchAll(/<script[^>]+src="([^"]+)"/g)].map((match) => match[1]),
  initialStyles: [...index.matchAll(/<link[^>]+href="([^"]+\.css)"/g)].map((match) => match[1]),
}

await writeFile('dist/bundle-summary.json', `${JSON.stringify(summary, null, 2)}\n`)
console.log(JSON.stringify(summary, null, 2))
