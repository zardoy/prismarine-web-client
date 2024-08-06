export function buildCleanupDecorator (cleanupMethod: string) {
  return function () {
    return function (_target: { snapshotInitialValues }, propertyKey: string) {
      const target = _target as any
      // Store the initial value of the property
      if (!target._snapshotMethodPatched) {
        target.snapshotInitialValues = function () {
          this._initialValues = {}
          for (const key of target._toCleanup) {
            this._initialValues[key] = this[key]
          }
        }
        target._snapshotMethodPatched = true
      }
      (target._toCleanup ??= []).push(propertyKey)
      if (!target._cleanupPatched) {
        const originalMethod = target[cleanupMethod]
        target[cleanupMethod] = function () {
          for (const key of target._toCleanup) {
            this[key] = this._initialValues[key]
          }
          // eslint-disable-next-line prefer-rest-params
          Reflect.apply(originalMethod, this, arguments)
        }
      }
      target._cleanupPatched = true
    }
  }
}
