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

  const dir = io.abs(`content/papers/${paper}`)
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
    await io.mkdir(dir)
    await io.write(`${dir}/index.mdx`, '', false)
  }

  await io.write(`${dir}/metadata.json`, meta)

  for (file of await io.dir(`/content/papers/${paper}`)) {
    if (file.match(/[\/.](gif|jpg|jpeg|tiff|png)$/i)) {
      await resize(file)
    }

    if (file.match(/[\/.](mdx)$/i)) {
      await reading(file)
    }
  }
})()
