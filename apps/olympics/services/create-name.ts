export const createName = (noc: string) => {
  switch (noc) {
    case 'Chinese Taipei':
      return 'Taiwan'
    case 'Hong Kong, China':
      return 'Hong Kong'
    default:
      return noc
  }
}
