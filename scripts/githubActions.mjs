const fns = {
  async getAlias () {
    const aliasesRaw = process.env.ALIASES
    if (!aliasesRaw) throw new Error('No aliases found')
    const aliases = aliasesRaw.split('\n').map((x) => x.split('='))
    const githubActionsPull = process.env.GITHUB_REF.match(/refs\/pull\/(\d+)\/merge/)
    if (!githubActionsPull) throw new Error(`Not a pull request, got ${process.env.GITHUB_REF}`)
    const prNumber = githubActionsPull[1]
    const alias = aliases.find((x) => x[0] === prNumber)
    if (alias) {
      // set github output
      setOutput('alias', alias[1])
    }
  }
}

function setOutput(key, value) {
  // Temporary hack until core actions library catches up with github new recommendations
  const output = process.env['GITHUB_OUTPUT']
  fs.appendFileSync(output, `${key}=${value}${os.EOL}`)
}

const fn = fns[process.argv[2]]
if (fn) {
  fn()
} else {
  console.error('Function not found')
}
