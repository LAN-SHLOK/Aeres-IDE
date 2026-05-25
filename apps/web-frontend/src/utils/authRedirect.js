/**
 * Post–sign-in path stored for SPA navigation after Clerk on /auth.
 */
const STORAGE_KEY = 'aeres_post_auth_redirect'

export function redirectToAuth(redirectPath = '/dashboard') {
  try {
    sessionStorage.setItem(STORAGE_KEY, redirectPath)
  } catch {
    /* ignore quota / private mode */
  }
  window.location.href = '/auth'
}

/** Download flow: persist return URL and send user to Clerk with ?redirect=download */
export function redirectToAuthForDownload() {
  try {
    sessionStorage.setItem(STORAGE_KEY, '/?download=true')
  } catch {
    /* ignore */
  }
  window.location.href = '/auth?redirect=download'
}

export function getPostAuthRedirect() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) || '/dashboard'
  } catch {
    return '/dashboard'
  }
}

export function clearPostAuthRedirect() {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * Deep link into the Electron app — protocol handler registers aeres://
 */
export function redirectToIDE(token, email) {
  const params = new URLSearchParams({
    token: token ?? '',
    email: email ?? '',
  })
  window.location.href = `aeres://auth?${params.toString()}`
}
