import {
    execSync as exec
  } from 'child_process'
  import fs from 'fs'
  import { createRequire } from 'module'

  const hardcodedIgnoreCommits = [
    '5300f0c',
    '6570e34'
  ]

  const lines = exec('git log --pretty=format:%h:%s --name-only HEAD ^upstream/master').toString().split('\n')

  type Commit = {
    hash: string
    msg: string
    files: string[]
  }

  const dropPaths = [
    'prismarine-viewer/',
  ]

  const isFileChangeShouldBeIgnored = (file: string) => {
    return dropPaths.some(path => file.startsWith(path))
  }

  const commits: Commit[] = []

  let isHeader = true
  for (const line of lines) {
    if (isHeader) {
      const [hash, ...msg] = line.split(':')
      commits.push({ hash, msg: msg.join(':'), files: [] })
      isHeader = false
      continue
    }

    if (line === '') {
      isHeader = true
      continue
    }

    commits[commits.length - 1].files.push(line)
  }

  let editCommits = []
  const dropCommits = []
  let newFeatures = []
  let newFixes = []
  const conventionalRegex = /(?:\[.+]\s)??(\w+)(\(\S+\))?:/g
  for (const commit of commits) {
    if (commit.files.some(isFileChangeShouldBeIgnored)) {
      if (commit.files.every(isFileChangeShouldBeIgnored)) {
        console.log('drop', commit.msg, commit.files)
        dropCommits.push(commit.hash)
      } else {
        console.log('edit', commit.msg, commit.files.filter(file => isFileChangeShouldBeIgnored(file)))
        editCommits.push(commit.hash)
      }
    }

    // for of matches
    const matches = [...commit.msg.matchAll(conventionalRegex)]
    for (const [i, match] of matches.entries()) {
      const [, type, scope] = match
      const nextMatchI = matches[i + 1]?.index ?? commit.msg.length
      const message = commit.msg.slice(match.index, nextMatchI)
      if (type === 'feat') {
        newFeatures.push(message)
      } else if (type === 'fix') {
        newFixes.push(message)
      }
    }
  }

  dropCommits.reverse()

  const currentActions = fs.readFileSync('./.git/rebase-merge/git-rebase-todo', 'utf8')
const newActions = currentActions.split('\n').map(line => {
    const [action, commit] = line.split(' ')
    if (dropCommits.includes(commit)) {
        return `drop ${commit}`
    }
})


//   let actions = ''
//   for (const commit of dropCommits) {
//     actions += `drop ${commit}\n`
//   }

  // const require = createRequire(import.meta.url)
  const onEachCommit = (dropPathsPerCommit) => {
    const fs = require('fs')
    const path = require('path')

    const commitFull = fs.readFileSync('.git/HEAD', 'utf8')
    const commit = commitFull.slice(0, 7)
    const dropPaths = dropPathsPerCommit[commit]
    if (!dropPaths) return
    for (const dropPath of dropPaths) {
      fs.rmSync(dropPath, { recursive: true, force: true })
    }
  }

  const dropPathsPerCommit = editCommits.reduce((acc, commit) => {
    acc[commit] = commits.find(c => c.hash === commit).files.filter(isFileChangeShouldBeIgnored)
    return acc
  }, {})

  const commandsExec = []

  const genCode = `(${onEachCommit.toString()})(${JSON.stringify(dropPathsPerCommit)})`
  for (const commit of editCommits) {
    // actions += `edit ${commit}\n`
    const filesToRemove = dropPathsPerCommit[commit]
      commandsExec.push([...filesToRemove.map(file => `rm ${file}`), 'git add .', 'git rebase --continue'].join(' && '))
}
  fs.writeFileSync('./actions', newActions, 'utf8')
  // const execOption = ' --exec "node eachCommit.js"'
//   const execOption = ''
//   exec(`git rebase -i --rebase-merges upstream/master${execOption}`, {
//     env: {
//       GIT_SEQUENCE_EDITOR: 'cat ./actions',
//     },
//   })

//   for (const command of commandsExec) {
//     exec(command)
//   }

  // console.log(editCommits)
  // console.log(newFeatures)
  // console.log(newFixes)
