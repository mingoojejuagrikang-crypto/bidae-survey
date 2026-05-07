import type { DeviceInfo } from '../types'
import { getSpeechRecognition } from './speechRecognition'

export function getDeviceInfo(): DeviceInfo {
  const ua = navigator.userAgent

  let osName = 'Unknown'
  let osVersion = ''
  if (/Android/.test(ua)) {
    osName = 'Android'
    const m = ua.match(/Android ([0-9.]+)/)
    osVersion = m ? m[1] : ''
  } else if (/iPhone|iPad|iPod/.test(ua)) {
    osName = 'iOS'
    const m = ua.match(/OS ([0-9_]+)/)
    osVersion = m ? m[1].replace(/_/g, '.') : ''
  } else if (/Mac/.test(ua)) {
    osName = 'macOS'
  } else if (/Windows/.test(ua)) {
    osName = 'Windows'
  } else if (/Linux/.test(ua)) {
    osName = 'Linux'
  }

  let browserName = 'Unknown'
  let browserVersion = ''
  if (/Chrome\//.test(ua) && !/Chromium\//.test(ua) && !/Edg\//.test(ua)) {
    browserName = 'Chrome'
    const m = ua.match(/Chrome\/([0-9.]+)/)
    browserVersion = m ? m[1] : ''
  } else if (/Firefox\//.test(ua)) {
    browserName = 'Firefox'
    const m = ua.match(/Firefox\/([0-9.]+)/)
    browserVersion = m ? m[1] : ''
  } else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) {
    browserName = 'Safari'
    const m = ua.match(/Version\/([0-9.]+)/)
    browserVersion = m ? m[1] : ''
  } else if (/Edg\//.test(ua)) {
    browserName = 'Edge'
    const m = ua.match(/Edg\/([0-9.]+)/)
    browserVersion = m ? m[1] : ''
  }

  return {
    userAgent: ua,
    osName,
    osVersion,
    browserName,
    browserVersion,
    screenSize: `${window.screen.width}x${window.screen.height}`,
    speechRecognitionSupported: getSpeechRecognition() !== null,
    speechSynthesisSupported: 'speechSynthesis' in window,
    mediaRecorderSupported: 'MediaRecorder' in window,
    indexedDBSupported: 'indexedDB' in window,
    serviceWorkerSupported: 'serviceWorker' in navigator,
  }
}
