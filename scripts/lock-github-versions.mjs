import fs from 'fs'

const depsPaths = ['dependencies', 'devDependencies', 'peerDependencies', ['pnpm', 'overrides']]

const packageJsonPath = './package.json'
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath))

const gitDeps = {}
for (const _path of depsPaths) {
  const path = Array.isArray(_path) ? _path : [_path]
  const deps = path.reduce((acc, key) => acc[key], packageJson)
  if (!deps) continue
  for (const [name, version] of Object.entries(deps)) {
    const isGithub = version.startsWith('github:')
    if (!isGithub) continue
    // wether it is locked with specific sha commit
    const isLockedVersion = version.match(/#([a-f0-9]{40})$/)
    if (isLockedVersion) continue
    const repo = version.replace('github:', '').replace(/#.*$/, '')
    // get actual path
    const realPath = fs.realpathSync(`./node_modules/${name}`)
    const sha = realPath.replace(/.+?@/, '').replace(/(\/|\\|_).+/, '')

    deps[name] = `github:${repo}#${sha}`
    gitDeps[repo] = version.match(/#.*$/)?.[0] ?? ''
  }
}

fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8')
fs.writeFileSync('.git-deps.json', JSON.stringify(gitDeps, null, 2), 'utf8')
