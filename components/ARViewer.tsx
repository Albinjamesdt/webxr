"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Camera, Scan, Settings, AlertCircle, Play } from "lucide-react"
import { useWebXRTracker } from "@/hooks/useWebXRTracker"
import type { Marker } from "@/lib/supabase"
import { toast } from "@/hooks/use-toast"

export default function ARViewer() {
  const [markers, setMarkers] = useState<Marker[]>([])
  const [loading, setLoading] = useState(true)
  const [isARActive, setIsARActive] = useState(false)
  const [detectedMarkers, setDetectedMarkers] = useState<Set<string>>(new Set())
  const [sessionId] = useState(() => Math.random().toString(36).substr(2, 9))
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map())
  // ImageBitmaps that will be sent to the WebXR hook once they are prepared
  const [trackedImages, setTrackedImages] = useState<{ bitmap: ImageBitmap; width: number }[]>([])

  // Fetch markers on component mount
  useEffect(() => {
    fetchMarkers()
  }, [])

  const fetchMarkers = async () => {
    try {
      const response = await fetch("/api/markers")
      if (response.ok) {
        const data = await response.json()
        setMarkers(data)
      } else {
        throw new Error("Failed to fetch markers")
      }
    } catch (error) {
      console.error("Error fetching markers:", error)
      toast({
        title: "Error",
        description: "Failed to load AR markers",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const logAnalytics = async (markerId: string, eventType: string) => {
    try {
      await fetch("/api/analytics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          marker_id: markerId,
          event_type: eventType,
          session_id: sessionId,
        }),
      })
    } catch (error) {
      console.error("Error logging analytics:", error)
    }
  }

  // Prepare image bitmaps for WebXR
  const prepareImageBitmaps = async () => {
    const imageBitmaps = []
    for (const marker of markers) {
      try {
        const response = await fetch(marker.marker_image_url)
        const blob = await response.blob()
        const bitmap = await createImageBitmap(blob)
        imageBitmaps.push({
          bitmap,
          width: marker.physical_width,
        })
      } catch (error) {
        console.error(`Error loading image for marker ${marker.id}:`, error)
      }
    }
    return imageBitmaps
  }

  const { session, onResult, isSupported, error } = useWebXRTracker(trackedImages)

  // Handle tracking results
  useEffect(() => {
    if (!session) return

    onResult((index: number, tracked: boolean, pose?: any) => {
      const marker = markers[index]
      if (!marker) return

      const markerId = marker.id

      if (tracked && !detectedMarkers.has(markerId)) {
        setDetectedMarkers((prev) => new Set([...prev, markerId]))
        toast({
          title: "Marker Detected",
          description: `Found: ${marker.title}`,
        })
        logAnalytics(markerId, "scan")

        // Play video
        const video = videoRefs.current.get(markerId)
        if (video) {
          video.play()
          logAnalytics(markerId, "play")
        }
      } else if (!tracked && detectedMarkers.has(markerId)) {
        setDetectedMarkers((prev) => {
          const newSet = new Set(prev)
          newSet.delete(markerId)
          return newSet
        })

        // Pause video
        const video = videoRefs.current.get(markerId)
        if (video) {
          video.pause()
          logAnalytics(markerId, "pause")
        }
      }
    })
  }, [session, markers, detectedMarkers])

  const startAR = async () => {
    if (markers.length === 0) {
      toast({
        title: "No Markers",
        description: "No AR markers available. Please add markers in the admin panel.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsARActive(true)
      const imageBitmaps = await prepareImageBitmaps()
      setTrackedImages(imageBitmaps)
      // WebXR session will be handled by the hook once trackedImages state updates
    } catch (error) {
      console.error("Error starting AR:", error)
      toast({
        title: "AR Error",
        description: "Failed to start AR session",
        variant: "destructive",
      })
      setIsARActive(false)
    }
  }

  const stopAR = () => {
    setIsARActive(false)
    setDetectedMarkers(new Set())
    if (session) {
      session.end()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading AR markers...</p>
        </div>
      </div>
    )
  }

  if (!isSupported) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white p-4">
        <Card className="bg-gray-900 border-gray-700 text-white max-w-md">
          <div className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">WebXR Not Supported</h2>
            <p className="text-gray-300 mb-4">
              Your browser doesn't support WebXR Image Tracking. Please use Chrome on Android for the best AR
              experience.
            </p>
            <Button asChild variant="outline">
              <a href="/admin">Go to Admin Panel</a>
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* AR Canvas */}
      <canvas ref={canvasRef} className="ar-canvas" style={{ display: isARActive ? "block" : "none" }} />

      {/* Video elements for each marker */}
      {markers.map((marker) => (
        <video
          key={marker.id}
          ref={(el) => {
            if (el) {
              videoRefs.current.set(marker.id, el)
            }
          }}
          src={marker.video_url}
          className="ar-video"
          style={{ display: "none" }}
          loop
          muted
          playsInline
        />
      ))}

      {/* UI Overlay */}
      <div className="ar-ui">
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/50 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isARActive && (
                <Badge variant="destructive" className="animate-pulse">
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                  LIVE
                </Badge>
              )}
              <Badge variant="secondary">
                {detectedMarkers.size} / {markers.length} detected
              </Badge>
            </div>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" asChild>
              <a href="/admin">
                <Settings className="w-5 h-5" />
              </a>
            </Button>
          </div>
        </div>

        {/* Center Content */}
        {!isARActive && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white p-8">
              <div className="mb-8">
                <Camera className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h1 className="text-2xl font-bold mb-2">WebAR Ad Player</h1>
                <p className="text-gray-300 mb-6">Scan any printed ad to play the corresponding video in AR</p>
              </div>

              {markers.length > 0 ? (
                <Button onClick={startAR} size="lg" className="bg-blue-600 hover:bg-blue-700">
                  <Scan className="w-5 h-5 mr-2" />
                  Start AR Scanner
                </Button>
              ) : (
                <div className="text-center">
                  <p className="text-gray-400 mb-4">No AR markers available</p>
                  <Button asChild variant="outline">
                    <a href="/admin">Add Markers</a>
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AR Active UI */}
        {isARActive && (
          <>
            {/* Scanning indicator */}
            {detectedMarkers.size === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center text-white">
                  <div className="w-48 h-48 border-2 border-white/50 rounded-lg mb-4 relative">
                    <div className="absolute inset-2 border border-white/30 rounded animate-pulse"></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                      <Scan className="w-8 h-8 text-white/70" />
                    </div>
                  </div>
                  <p className="text-lg">Scan any marker to begin</p>
                </div>
              </div>
            )}

            {/* Bottom Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent">
              <div className="flex items-center justify-center">
                <Button onClick={stopAR} variant="destructive" size="lg">
                  Stop AR
                </Button>
              </div>
            </div>

            {/* Detected markers list */}
            {detectedMarkers.size > 0 && (
              <div className="absolute top-20 right-4 space-y-2">
                {Array.from(detectedMarkers).map((markerId) => {
                  const marker = markers.find((m) => m.id === markerId)
                  return marker ? (
                    <Badge key={markerId} className="bg-green-600">
                      <Play className="w-3 h-3 mr-1" />
                      {marker.title}
                    </Badge>
                  ) : null
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
