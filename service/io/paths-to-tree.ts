export type TreeNode = { name: string; children: TreeNode[] }

export const pathsToTree = (paths: string[][]) => {
  const tree: TreeNode[] = []

  for (let i = 0; i < paths.length; i++) {
    const path = paths[i]
    let currentLevel = tree
    for (let j = 0; j < path.length; j++) {
      const part = path[j]

      const existingPath = findWhere(currentLevel, part)

      if (existingPath) {
        currentLevel = existingPath.children
      } else {
        const newPart = {
          name: part,
          children: [],
        }

        currentLevel.sort((a, b) => b.children.length - a.children.length)
        currentLevel.push(newPart)
        currentLevel = newPart.children
      }
    }
  }
  return tree

  function findWhere(array: TreeNode[], value: string) {
    let t = 0

    while (t < array.length && array[t].name !== value) {
      t++
    }

    if (t < array.length) {
      return array[t]
    } else {
      return false
    }
  }
}
