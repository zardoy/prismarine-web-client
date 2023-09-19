import fs from 'fs'

let file = fs.readFileSync('./.git/rebase-merge/git-rebase-todo', 'utf8')

const actions = fs.readFileSync('./actions', 'utf8')

actions.split('\n').forEach(action => {
    const [type, commit] = action.split(' ')
    // if (!file.includes(`pick ${commit}`)) throw new Error(`Commit ${commit} not found`)
    file = file.replace(`pick ${commit}`, `${type} ${commit}`)
})

fs.writeFileSync('./actions2', file, 'utf8')

fs.writeFileSync('./.git/rebase-merge/git-rebase-todo', file, 'utf8')
