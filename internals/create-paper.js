const io = require('./io')
const reading = require('./reading')
const resize = require('./resize')

;(async function createPaper() {
  const paper = process.argv[2]

  if (!paper) {
    throw Error(
      `No 'paper' is provided. Try 'yarn tool:create-paper {paper_name}'`,
    )
  }

  const dir = io.abs(`pages/papers/${paper}`)
  const now = new Date().toISOString()
  const meta = {
    createdAt: now,
    excerpt: '',
    og: '',
    slug: paper,
    title: '',
    updatedAt: now,
    images: {},
    minutes: 0,
    categories: [],
  }

  if (!(await io.exists(dir))) {
    await Promise.all([
      io.mkdir(dir),
      io.write(
        `${dir}/index.mdx`,
        `export const meta = require('./metadata.json')`,
        false,
      ),
    ])
  }

  await io.write(`${dir}/metadata.json`, meta)

  for (file of await io.dir(`/pages/papers/${paper}`)) {
    if (file.match(/[\/.](gif|jpg|jpeg|tiff|png)$/i)) {
      await resize(file)
    }

    if (file.match(/[\/.](mdx)$/i)) {
      await reading(file)
    }
  }
})()
