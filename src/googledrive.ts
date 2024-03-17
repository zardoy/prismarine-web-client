import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google'
import { proxy, ref, subscribe } from 'valtio'
import React from 'react'

const CLIENT_ID = '137156026346-igv2gkjsj2hlid92rs3q7cjjnc77s132.apps.googleusercontent.com'
// const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const SCOPES = 'https://www.googleapis.com/auth/drive'

export const GoogleDriveProvider = ({ children }) => {
  return React.createElement(GoogleOAuthProvider, { clientId: CLIENT_ID } as any, children)
  // return <GoogleOAuthProvider clientId={CLIENT_ID}><Root /></GoogleOAuthProvider>
}

export const isGoogleDriveAvailable = () => {
  return !!CLIENT_ID
}

export const useGoogleLogIn = () => {
  const login = useGoogleLogin({
    onSuccess (tokenResponse) {
      localStorage.hasEverLoggedIn = true
      googleProviderData.accessToken = tokenResponse.access_token
      googleProviderData.expiresIn = ref(new Date(Date.now() + tokenResponse.expires_in * 1000))
      googleProviderData.hasEverLoggedIn = true
    },
    // interested in initial value only
    prompt: googleProviderData.hasEverLoggedIn ? 'none' : 'consent',
    scope: SCOPES,
    flow: 'implicit',
    onError (error) {
      const accessDenied = error.error === 'access_denied' || error.error === 'invalid_scope' || (error as any).error_subtype === 'access_denied'
      if (accessDenied) {
        googleProviderData.hasEverLoggedIn = false
      }
    }
  })
  return login
}

export const googleProviderData = proxy({
  accessToken: (localStorage.saveAccessToken ? localStorage.accessToken : null) as string | null,
  hasEverLoggedIn: !!(localStorage.hasEverLoggedIn),
  isReady: false,
  expiresIn: localStorage.saveAccessToken ? ref(new Date(Date.now() + 1000 * 60 * 60)) : null,
  readonlyMode: localStorage.googleReadonlyMode ? localStorage.googleReadonlyMode === 'true' : true,
  worldsPath: localStorage.googleWorldsPath || '/worlds/'
})

subscribe(googleProviderData, () => {
  localStorage.googleReadonlyMode = googleProviderData.readonlyMode
  localStorage.googleWorldsPath = googleProviderData.worldsPath
  if (googleProviderData.hasEverLoggedIn) {
    localStorage.hasEverLoggedIn = true
  } else {
    delete localStorage.hasEverLoggedIn
  }

  if (localStorage.saveAccessToken && googleProviderData) {
    // For testing only
    localStorage.accessToken = googleProviderData.accessToken || null
  } else {
    delete localStorage.accessToken
  }
})
