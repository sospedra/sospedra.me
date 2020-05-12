const sharp = require('sharp')
const { promisify } = require('util')
const { join } = require('path')
const fs = require('fs')

const root = join(process.cwd(), '_papers')
const readdir = promisify(fs.readdir)
const writeFile = promisify(fs.writeFile)

sharp.cache(false)

// module.exports = async (e) => {
//   console.log('run', e)
//   for (const paper of await readdir(root)) {
//     for (const file of await readdir(join(root, paper))) {
//       if (file.match(/[\/.](gif|jpg|jpeg|tiff|png)$/i)) {
//         const image = sharp(join(root, paper, file))

//         image
//           .metadata()
//           .then(({ width }) => (width > 672 ? image.resize(672) : image))
//           .then((data) => data.jpeg().toBuffer())
//           .then((data) => {
//             writeFile(
//               join(root, paper, file.replace(/\.[^.]+$/, '.jpeg')),
//               data,
//             )
//           })
//       }
//     }
//   }
// }

module.exports = (filename) => {
  const image = sharp(filename)

  return image
    .metadata()
    .then(({ width }) => (width > 672 ? image.resize(672) : image))
    .then((data) => data.jpeg().toBuffer())
    .then((data) => {
      writeFile(join(filename.replace(/\.[^.]+$/, '.jpeg')), data)
    })
}
