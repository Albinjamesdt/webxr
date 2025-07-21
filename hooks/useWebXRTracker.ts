"use client"

import { useState, useEffect, useRef, useCallback } from "react"

interface TrackedImage {
  bitmap: ImageBitmap | null
  width: number
}

interface WebXRTrackerResult {
  session: XRSession | null
  onResult: (callback: (index: number, tracked: boolean, pose?: XRPose) => void) => void
  isSupported: boolean
  error: string | null
}

export function useWebXRTracker(images: TrackedImage[]): WebXRTrackerResult {
  const [session, setSession] = useState<XRSession | null>(null)
  const [isSupported, setIsSupported] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const onResultCallback = useRef<((index: number, tracked: boolean, pose?: XRPose) => void) | null>(null)
  const frameId = useRef<number>()

  // Check WebXR support
  useEffect(() => {
    const checkSupport = async () => {
      if (!navigator.xr) {
        setIsSupported(false)
        setError("WebXR not available")
        return
      }

      try {
        const supported = await navigator.xr.isSessionSupported("immersive-ar")
        setIsSupported(supported)
        if (!supported) {
          setError("WebXR AR not supported")
        }
      } catch (err) {
        setIsSupported(false)
        setError("Error checking WebXR support")
        console.error("WebXR support check failed:", err)
      }
    }

    checkSupport()
  }, [])

  // Initialize WebXR session
  useEffect(() => {
    if (!isSupported || images.length === 0) return

    const initSession = async () => {
      try {
        // Prepare tracked images
        const trackedImages = images
          .filter((img) => img.bitmap)
          .map((img) => ({
            image: img.bitmap!,
            widthInMeters: img.width,
          }))

        if (trackedImages.length === 0) {
          setError("No valid images to track")
          return
        }

        const xrSession = await navigator.xr!.requestSession("immersive-ar", {
          requiredFeatures: ["image-tracking"],
          trackedImages,
        })

        setSession(xrSession)
        setError(null)

        // Set up render loop
        const canvas = document.createElement("canvas")
        const gl = canvas.getContext("webgl", { xrCompatible: true })

        if (!gl) {
          throw new Error("WebGL not available")
        }

        await gl.makeXRCompatible()

        const layer = new XRWebGLLayer(xrSession, gl)
        await xrSession.updateRenderState({ baseLayer: layer })

        const referenceSpace = await xrSession.requestReferenceSpace("local")

        const render = (time: number, frame: XRFrame) => {
          const session = frame.session

          // Get image tracking results
          const imageTrackingResults = frame.getImageTrackingResults()

          for (let i = 0; i < imageTrackingResults.length; i++) {
            const result = imageTrackingResults[i]
            const tracked = result.trackingState === "tracked"

            let pose: XRPose | undefined
            if (tracked) {
              pose = frame.getPose(result.imageSpace, referenceSpace)
            }

            onResultCallback.current?.(result.index, tracked, pose)
          }

          frameId.current = session.requestAnimationFrame(render)
        }

        frameId.current = xrSession.requestAnimationFrame(render)

        // Handle session end
        xrSession.addEventListener("end", () => {
          setSession(null)
          if (frameId.current) {
            xrSession.cancelAnimationFrame(frameId.current)
          }
        })
      } catch (err) {
        console.error("Failed to start WebXR session:", err)
        setError(`Failed to start AR: ${err instanceof Error ? err.message : "Unknown error"}`)
      }
    }

    initSession()

    return () => {
      if (session && frameId.current) {
        session.cancelAnimationFrame(frameId.current)
        session.end()
      }
    }
  }, [isSupported, images])

  const onResult = useCallback((callback: (index: number, tracked: boolean, pose?: XRPose) => void) => {
    onResultCallback.current = callback
  }, [])

  return {
    session,
    onResult,
    isSupported,
    error,
  }
}
