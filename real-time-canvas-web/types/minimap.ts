/**
 * Minimap and radar types
 * Defines minimap configuration and user position tracking
 */

/**
 * Minimap configuration
 */
export interface MinimapConfig {
  width: number
  height: number
  scale: number
  backgroundColor: string
  borderColor: string
  borderWidth: number
  cornerRadius: number
  showGrid: boolean
  gridColor: string
  gridSize: number
  showUserLabels: boolean
  userDotRadius: number
  showObjectPreview: boolean
}

/**
 * Minimap position on screen
 */
export interface MinimapPosition {
  x: number
  y: number
  anchor: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}

/**
 * Radar data for a user
 */
export interface RadarUser {
  userId: string
  username: string
  position: { x: number; y: number }
  color: string
  isActive: boolean
}

/**
 * Radar object on canvas
 */
export interface RadarObject {
  id: string
  type: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  color: string
}

/**
 * Viewport rectangle for minimap
 */
export interface ViewportRect {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Minimap state
 */
export interface MinimapState {
  isVisible: boolean
  isCollapsed: boolean
  position: MinimapPosition
  zoom: number
  config: MinimapConfig
}
