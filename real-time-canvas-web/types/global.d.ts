/// <reference types="next" />
/// <reference types="next/image-types/global" />

// Extend Window interface for custom properties
interface Window {
  __CANVAS_INITIALIZED__?: boolean
}
