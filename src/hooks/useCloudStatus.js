import { useState, useEffect } from 'react'
import { getCloudStatus, subscribeCloudStatus } from '../utils/cloudStatus.js'

// Subscribe a component to the app-wide cloud sync status (#145).
export function useCloudStatus() {
  const [status, setStatus] = useState(getCloudStatus)
  useEffect(() => subscribeCloudStatus(setStatus), [])
  return status
}
