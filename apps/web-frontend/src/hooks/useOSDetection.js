import { useMemo } from 'react'

/**
 * @returns {'mac' | 'windows' | 'linux' | 'unknown'}
 */
export default function useOSDetection() {
  return useMemo(() => {
    let platform = ''
    if (typeof navigator === 'undefined') return 'unknown'

    const uaData = navigator.userAgentData
    if (uaData?.platform) {
      platform = String(uaData.platform)
    } else {
      platform = navigator.platform || ''
    }

    const p = platform.toLowerCase()
    if (p.includes('mac') || p.includes('darwin')) return 'mac'
    if (p.includes('win')) return 'windows'
    if (p.includes('linux')) return 'linux'

    const ua = (navigator.userAgent || '').toLowerCase()
    if (ua.includes('mac os') || ua.includes('macintosh')) return 'mac'
    if (ua.includes('windows')) return 'windows'
    if (ua.includes('linux')) return 'linux'

    return 'unknown'
  }, [])
}
