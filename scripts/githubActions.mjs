const fns = {
  async getAlias () {
    const aliasesRaw = process.env.ALIASES
    if (!aliasesRaw) throw new Error('No aliases found')
    const aliases = aliasesRaw.split('\n').map((x) => x.search('='))
    const githubActionsPull = process.env.GITHUB_REF.match(/refs\/pull\/(\d+)\/merge/)
    if (!githubActionsPull) throw new Error(`Not a pull request, got ${process.env.GITHUB_REF}`)
    const prNumber = githubActionsPull[1]
    const alias = aliases.find((x) => x[0] === prNumber)
    if (alias) {
      console.log('Found alias', alias[1])
      // set github output
      console.log(`::set-output name=alias::${alias[1]}`)
    }
  }
}

const fn = fns[process.argv[2]]
if (fn) {
  fn()
} else {
  console.error('Function not found')
}
