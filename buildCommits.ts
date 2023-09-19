import {
  execSync as exec
} from 'child_process'
import fs from 'fs'

const isOnGoingMode = process.argv[2] === 'on'

const targetBranch = 'main-light'
// const sourceBranch = 'main'
const sourceBranch = 'origin/next'

// show message of last commit on branch next
const lastTargetMessage = exec(`git log -2 --pretty=format:%s ${targetBranch}`).toString().split('\n').find(x => !x.startsWith('Merge '))
if (!lastTargetMessage) throw new Error('no last target message')
const sourceCommits = exec(`git log --pretty=format:%h:%s ${sourceBranch}`).toString().split('\n')
// find the commit hash of the commit with the same message on branch

type Config = {
  parent: string,
  hardcodedDropCommits: string[],
  hardcodedRemoveFilesCommits: Record<string, string[]>,
}

const {hardcodedDropCommits, hardcodedRemoveFilesCommits, parent}: Config = {
  parent: 'upstream/master' || process.argv[3],
  hardcodedDropCommits: [],
  hardcodedRemoveFilesCommits: {}
}

const lines = exec(`git log --pretty=format:%h:%s --name-only ${sourceBranch}`).toString().split('\n')

type Commit = {
  hash: string
  msg: string
  files: string[]
}

const commits: Commit[] = []

let isHeader = true
for (const line of lines) {
  if (isHeader) {
    const [hash, ...msg] = line.split(':')
    const message = msg.join(':');
    if (message === lastTargetMessage) break
    console.log('Picking', message)
    commits.push({ hash, msg: message, files: [] })
    isHeader = false
    continue
  }

  if (line === '') {
    isHeader = true
    continue
  }

  commits[commits.length - 1].files.push(line)
}

const dropPaths = [
  'prismarine-viewer/',
  '.github/workflows/cherry-pick-upstream.yml',
  '.github/workflows/sync-upstream.yml',
]

const isFileChangeShouldBeIgnored = (file: string) => {
  return dropPaths.some(path => file.startsWith(path))
}

let editCommits: string[] = []
const dropCommits: string[] = []
let newFeatures: string[] = []
let newFixes: string[] = []
const conventionalRegex = /(?:\[.+]\s)??(\w+)(\(\S+\))?:/g
for (const commit of commits) {
  const fileShouldBeIgnored = (file) => {
    if (isFileChangeShouldBeIgnored(file)) return true
    if (hardcodedRemoveFilesCommits[commit.hash]?.includes(file)) return true
  }

  const forcefullyDrop = hardcodedDropCommits.includes(commit.hash);
  if (forcefullyDrop || commit.files.some(fileShouldBeIgnored)) {
    if (forcefullyDrop || commit.files.every(fileShouldBeIgnored)) {
      console.log('drop', commit.msg, commit.files)
      dropCommits.push(commit.hash)
    } else {
      console.log('edit', commit.msg, commit.files.filter(file => fileShouldBeIgnored(file)))
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

console.log(commits, dropCommits, editCommits)

for (const commit of commits) {
  if (dropCommits.includes(commit.hash)) continue
  if (editCommits.includes(commit.hash)) {
    throw new Error('not implemented')
    // exec('git cherry-pick --no-commit ' + commit.hash)
    continue
  }
  exec('git cherry-pick ' + commit.hash)
}

throw new Error('stop')

// dropCommits.reverse()

// let actions = ''
// for (const commit of dropCommits) {
//   actions += `drop ${commit}\n`
// }

// const dropPathsPerCommit = editCommits.reduce((acc, commit) => {
//   acc[commit] = commits.find(c => c.hash === commit)!.files.filter(isFileChangeShouldBeIgnored)
//   return acc
// }, {})

// // const commandsExec = []
// const filesToRemove = editCommits.map(commit => dropPathsPerCommit[commit])

// for (const commit of editCommits) {
//   // actions += `edit ${commit}\n`
//   const filesToRemove = dropPathsPerCommit[commit]
//   // commandsExec.push([...filesToRemove.map(file => `rm ${file}`), 'git add .', 'git rebase --continue'].join(' && '))
// }
// if (!isOnGoingMode) {
//   const newActions = [...editCommits.map(editCommit => `edit ${editCommit}`), ...dropCommits.map(dropCommit => `drop ${dropCommit}`)].join('\n') + '\n'
//   fs.writeFileSync('./actions', newActions, 'utf8')
//   exec(`git rebase -i --rebase-merges ${parent}`, {
//     env: {
//       GIT_SEQUENCE_EDITOR: 'tsx replaceScript.ts',
//     },
//   })
// }

// for (const commit of filesToRemove) {
//   const headCommit = fs.readFileSync('./.git/HEAD', 'utf8').trim().slice(0, 7)
//   const files = dropPathsPerCommit[headCommit]
//   console.log('removing', files.join(', '))
//   files.forEach(file => fs.unlinkSync(file))
//   exec('git add -u')
//   exec('git rebase --continue', {
//     env: {
//       GIT_EDITOR: 'true',
//     },
//   })
// }
