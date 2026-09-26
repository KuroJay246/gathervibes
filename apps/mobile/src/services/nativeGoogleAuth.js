import { GoogleSignin } from '@react-native-google-signin/google-signin'
import { GoogleAuthProvider, signInWithCredential } from '@react-native-firebase/auth'

let configuredClientId = ''

function configureGoogleSignIn(webClientId) {
  if (!webClientId) {
    const error = new Error('Google sign-in configuration is incomplete.')
    error.code = 'auth/google-configuration-missing'
    throw error
  }
  if (configuredClientId === webClientId) return
  GoogleSignin.configure({ webClientId, offlineAccess: false })
  configuredClientId = webClientId
}

export async function signInWithNativeGoogle(auth, webClientId) {
  configureGoogleSignIn(webClientId)
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
  const response = await GoogleSignin.signIn()
  if (response.type === 'cancelled') {
    const error = new Error('Google sign-in was cancelled.')
    error.code = 'auth/cancelled-by-user'
    throw error
  }
  const idToken = response.data?.idToken
  if (!idToken) {
    const error = new Error('Google did not return an identity token.')
    error.code = 'auth/google-token-missing'
    throw error
  }
  return signInWithCredential(auth, GoogleAuthProvider.credential(idToken))
}

export async function signOutFromNativeGoogle() {
  if (!GoogleSignin.hasPreviousSignIn()) return
  await GoogleSignin.signOut()
}
