export const versionToNumber = (ver: string) => {
  const [x, y = '0', z = '0'] = ver.split('.')
  return +`${x.padStart(2, '0')}${y.padStart(2, '0')}${z.padStart(2, '0')}`
}

export const versionToMajor = (version: string) => {
  const [x, y = '0'] = version.split('.')
  return `${x.padStart(2, '0')}.${y.padStart(2, '0')}`
}

export const versionsMapToMajor = <T> (versionsMap: Record<string, T>) => {
  const majorVersions = {} as Record<string, T>
  for (const [ver, data] of Object.entries(versionsMap)) {
    const major = versionToMajor(ver)
    majorVersions[major] = data
  }
  return majorVersions
}
