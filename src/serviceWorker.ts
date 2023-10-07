import { isCypress } from './utils'

export const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) return
  if (!isCypress() && process.env.NODE_ENV !== 'development') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js').then(registration => {
        console.log('SW registered:', registration)
      }).catch(registrationError => {
        console.log('SW registration failed:', registrationError)
      })
    })
  } else {
    // force unregister service worker in development mode
    const registrations = await navigator.serviceWorker.getRegistrations()
    for (const registration of registrations) {
      await registration.unregister() // eslint-disable-line no-await-in-loop
    }
    if (registrations.length) {
      location.reload()
    }
  }
}
