import { openDB } from 'idb'
import * as react from 'react'
import { gt } from 'semver'
import { proxy } from 'valtio'
import { options } from './optionsStorage'
import { getStoredValue, setStoredValue } from './react/storageProvider'
import { showOptionsModal } from './react/SelectOption'

// #region Database
const dbPromise = openDB('mods-db', 1, {
  upgrade (db) {
    db.createObjectStore('mods', {
      keyPath: 'name',
    })
    db.createObjectStore('repositories', {
      keyPath: 'url',
    })
  },
})

// mcraft-repo.json
export interface Repository {
  url: string
  packages: ClientModDefinition[]
  prefix?: string
  name?: string // display name
  description?: string
  mirrorUrls?: string[]
  autoUpdateOverride?: boolean
  lastUpdated?: number
}

export interface ClientMod {
  repo: string
  name: string; // unique identifier like owner.name
  version: string
  enabled?: boolean

  scriptMainUnstable?: string;
  // workerScript?: string
  stylesGlobal?: string
  // stylesLocal?: string

  description?: string
  author?: string
  section?: string
  autoUpdateOverride?: boolean
  lastUpdated?: number
  // todo depends, hashsum
}

const cleanupFetchedModData = (mod: ClientModDefinition | Record<string, any>) => {
  delete mod.enabled
  delete mod.repo
  delete mod.autoUpdateOverride
  delete mod.lastUpdated
  return mod
}

export type ClientModDefinition = ClientMod & {
  scriptMainUnstable?: boolean
  stylesGlobal?: boolean
}

async function savePlugin (data: ClientMod) {
  const db = await dbPromise
  data.lastUpdated = Date.now()
  await db.put('mods', data)
}

async function getPlugin (name: string) {
  const db = await dbPromise
  return db.get('mods', name) as Promise<ClientMod | undefined>
}

async function getAllMods () {
  const db = await dbPromise
  return db.getAll('mods') as Promise<ClientMod[]>
}

async function deletePlugin (name) {
  const db = await dbPromise
  await db.delete('mods', name)
}

async function clearPlugins () {
  const db = await dbPromise
  await db.clear('mods')
}

// ---

async function saveRepository (data: Repository) {
  const db = await dbPromise
  data.lastUpdated = Date.now()
  await db.put('repositories', data)
}

async function getRepository (url: string) {
  const db = await dbPromise
  return db.get('repositories', url) as Promise<Repository | undefined>
}

async function getAllRepositories () {
  const db = await dbPromise
  return db.getAll('repositories') as Promise<Repository[]>
}

async function deleteRepository (url) {
  const db = await dbPromise
  await db.delete('repositories', url)
}

// ---

// #endregion

window.mcraft = {
  version: process.env.RELEASE_TAG,
  build: process.env.BUILD_VERSION,
  ui: {},
  react,
  // openDB
}

const activateMod = async (mod: ClientMod, reason: string) => {
  console.debug(`Activating mod ${mod.name} (${reason})...`)
  if (window.loadedMods[mod.name]) {
    console.warn(`Mod is ${mod.name} already loaded, skipping activation...`)
    return false
  }
  if (mod.stylesGlobal) {
    const style = document.createElement('style')
    style.textContent = mod.stylesGlobal
    style.id = `mod-${mod.name}`
    document.head.appendChild(style)
  }
  if (mod.scriptMainUnstable) {
    const blob = new Blob([mod.scriptMainUnstable], { type: 'application/javascript' })
    const url = URL.createObjectURL(blob)
    try {
      const module = await import(url)
      module.default?.(structuredClone(mod))
      window.loadedMods[mod.name] = module
    } catch (e) {
      console.error(`Error loading mod ${mod.name}:`, e)
    }
  }
  return true
}

export const appStartup = async () => {
  void checkModsUpdates()

  const mods = await getAllMods()
  for (const mod of mods) {
    // eslint-disable-next-line no-await-in-loop
    await activateMod(mod, 'autostart')
  }
}

export const modsUpdateStatus = proxy({} as Record<string, [string, string]>)
export const modsWaitingReloadStatus = proxy({} as Record<string, boolean>)

const installOrUpdateMod = async (repo: Repository, mod: ClientModDefinition, activate = true) => {
  try {
    const fetchData = async (urls: string[]) => {
      const errored = [] as string[]
      for (const urlTemplate of urls) {
        const url = new URL(`${mod.name.split('.').pop()}/${urlTemplate}`, repo.url).href
        try {
          // eslint-disable-next-line no-await-in-loop
          return await fetch(url).then(async res => res.text())
        } catch (e) {
          errored.push(String(e))
        }
      }
      console.warn(`[${mod.name}] Error installing component of ${urls[0]}: ${errored.join(', ')}`)
      return undefined
    }
    if (mod.stylesGlobal) mod.stylesGlobal = await fetchData(['global.css']) as any
    if (mod.scriptMainUnstable) mod.scriptMainUnstable = await fetchData(['mainUnstable.js']) as any
    await savePlugin(mod)
    delete modsUpdateStatus[mod.name]
  } catch (e) {
    console.error(`Error installing mod ${mod.name}:`, e)
  }
  if (activate) {
    const result = await activateMod(mod, 'install')
    if (!result) {
      modsWaitingReloadStatus[mod.name] = true
    }
  }
}

const checkRepositoryUpdates = async (repo: Repository) => {
  for (const mod of repo.packages) {
    // eslint-disable-next-line no-await-in-loop
    const modExisting = await getPlugin(mod.name)
    if (modExisting?.version && gt(mod.version, modExisting.version)) {
      modsUpdateStatus[mod.name] = [modExisting.version, mod.version]
      if (options.modsAutoUpdate === 'always' && (!repo.autoUpdateOverride && !modExisting.autoUpdateOverride)) {
        void installOrUpdateMod(repo, mod)
      }
    }
  }

}

const fetchRepository = async (urlOriginal: string, url: string, hasMirrors = false) => {
  const fetchUrl = !url.startsWith('https://') && url.includes('/') ? `https://raw.githubusercontent.com/${url}/master/mcraft-repo.json` : url
  try {
    const response = await fetch(fetchUrl).then(async res => res.json())
    if (!response.packages) throw new Error(`No packages field in the response json of the repository: ${fetchUrl}`)
    response.autoUpdateOverride = (await getRepository(urlOriginal))?.autoUpdateOverride
    void saveRepository(response)
    return true
  } catch (e) {
    console[hasMirrors ? 'warn' : 'error'](`Error fetching repository (trying other mirrors) ${url}:`, e)
    return false
  }
}

const fetchAllRepositories = async () => {
  const repositories = await getAllRepositories()
  return Promise.all(repositories.map(async (repo) => {
    const allUrls = [repo.url, ...(repo.mirrorUrls || [])]
    for (const [i, url] of allUrls.entries()) {
      const isLast = i === allUrls.length - 1
      // eslint-disable-next-line no-await-in-loop
      if (await fetchRepository(repo.url, url, !isLast)) break
    }
  }))
}

const checkModsUpdates = async () => {
  await refreshModRepositories()
  for (const repo of await getAllRepositories()) {
    // eslint-disable-next-line no-await-in-loop
    await checkRepositoryUpdates(repo)
  }
}

const refreshModRepositories = async () => {
  if (options.modsAutoUpdate === 'never') return
  const lastCheck = getStoredValue('modsAutoUpdateLastCheck')
  if (lastCheck && Date.now() - lastCheck < 1000 * 60 * 60 * options.modsUpdatePeriodCheck) return
  await fetchAllRepositories()
  // todo think of not updating check timestamp on offline access
  setStoredValue('modsAutoUpdateLastCheck', Date.now())
}

export const installModByName = async (repoUrl: string, name: string) => {
  const repo = await getRepository(repoUrl)
  if (!repo) throw new Error(`Repository ${repoUrl} not found`)
  const mod = repo.packages.find(m => m.name === name)
  if (!mod) throw new Error(`Mod ${name} not found in repository ${repoUrl}`)
  return installOrUpdateMod(repo, mod)
}

export const uninstallModAction = async (name: string) => {
  const choice = await showOptionsModal(`Uninstall mod ${name}?`, ['Yes'])
  if (!choice) return
  await deletePlugin(name)
  if (window.loadedMods[name]) {
    // window.loadedMods[name].default?.(null)
    delete window.loadedMods[name]
    modsWaitingReloadStatus[name] = true
  }
}

export const getAllModsDisplayList = async () => {
  const repos = await getAllRepositories()
  const mods = await getAllMods()
  const modsWithoutRepos = mods.filter(mod => !repos.some(repo => repo.packages.some(m => m.name === mod.name)))
  const mapMods = (mods: ClientMod[]) => mods.map(mod => ({
    ...mod,
    installed: mods.some(m => m.name === mod.name),
  }))
  return {
    repos: repos.map(repo => ({
      ...repo,
      packages: mapMods(repo.packages),
    })),
    modsWithoutRepos: mapMods(modsWithoutRepos),
  }
}

export const removeRepositoryAction = async (url: string) => {
  const choice = await showOptionsModal('Remove repository? Installed mods won\' be automatically removed.', ['Yes'])
  if (!choice) return
  await deleteRepository(url)
}

// export const getAllMods = () => {}
