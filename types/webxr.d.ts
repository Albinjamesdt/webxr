// WebXR Image Tracking API type definitions
type XRSessionMode = "inline" | "immersive-vr" | "immersive-ar"

interface XRImageTrackingResult {
  readonly index: number
  readonly trackingState: XRImageTrackingState
  readonly imageSpace: XRSpace
}

type XRImageTrackingState = "tracked" | "emulated" | "limited"

interface XRFrame {
  getImageTrackingResults(): XRImageTrackingResult[]
}

interface XRSessionInit {
  trackedImages?: {
    image: ImageBitmap
    widthInMeters: number
  }[]
}

interface Navigator {
  xr?: XRSystem
}

interface XRSystem {
  isSessionSupported(mode: XRSessionMode): Promise<boolean>
  requestSession(mode: XRSessionMode, options?: XRSessionInit): Promise<XRSession>
}
