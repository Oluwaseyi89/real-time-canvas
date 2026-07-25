/**
 * Type definitions for canvas objects
 * Provides type-safe interfaces for all canvas object types
 */

import { FabricObject, Group, IText, Rect, Circle, Triangle, FabricImage } from 'fabric'

/**
 * Base custom properties for all canvas objects
 */
export interface BaseCanvasObjectProps {
  id: string
  type: CanvasObjectType
  createdAt: Date
  createdBy?: string
  metadata?: Record<string, unknown>
}

/**
 * All supported canvas object types
 */
export type CanvasObjectType = 
  | 'text'
  | 'rect'
  | 'circle'
  | 'triangle'
  | 'sticky'
  | 'sticky-group'
  | 'image'
  | 'audio'
  | 'custom'

/**
 * Extended Fabric Object with custom properties
 */
export type CanvasObject = FabricObject & BaseCanvasObjectProps

/**
 * Text object with custom properties
 */
export type CanvasTextObject = IText & BaseCanvasObjectProps & {
  type: 'text'
  text: string
  fontSize: number
  fontFamily: string
  fill: string
}

/**
 * Rectangle object with custom properties
 */
export type CanvasRectObject = Rect & BaseCanvasObjectProps & {
  type: 'rect'
  width: number
  height: number
  fill: string
  stroke?: string
  strokeWidth?: number
}

/**
 * Circle object with custom properties
 */
export type CanvasCircleObject = Circle & BaseCanvasObjectProps & {
  type: 'circle'
  radius: number
  fill: string
  stroke?: string
  strokeWidth?: number
}

/**
 * Triangle object with custom properties
 */
export type CanvasTriangleObject = Triangle & BaseCanvasObjectProps & {
  type: 'triangle'
  width: number
  height: number
  fill: string
  stroke?: string
  strokeWidth?: number
}

/**
 * Sticky note object (group of rect + text)
 */
export type CanvasStickyObject = Group & BaseCanvasObjectProps & {
  type: 'sticky-group'
  text: string
  color: string
}

/**
 * Image object with custom properties
 */
export type CanvasImageObject = FabricImage & BaseCanvasObjectProps & {
  type: 'image'
  src: string
  width: number
  height: number
}

/**
 * Audio object with custom properties
 */
export type CanvasAudioObject = Group & BaseCanvasObjectProps & {
  type: 'audio'
  audioUrl: string
  duration?: number
}

/**
 * Object creation options with custom metadata
 */
export interface ObjectCreationOptions<T = unknown> {
  createdBy?: string
  metadata?: Record<string, unknown>
  fabricOptions?: T
}

/**
 * Type guard to check if object has custom properties
 */
export function isCanvasObject(obj: FabricObject): obj is CanvasObject {
  const custom = obj as Partial<BaseCanvasObjectProps>
  return !!(
    custom.id &&
    custom.type &&
    custom.createdAt instanceof Date
  )
}

/**
 * Type guard for specific object types
 */
export function isObjectType<T extends CanvasObject>(
  obj: FabricObject,
  type: CanvasObjectType
): obj is T {
  return isCanvasObject(obj) && obj.type === type
}

/**
 * Utility to get object type safely
 */
export function getObjectType(obj: FabricObject): CanvasObjectType | null {
  if (isCanvasObject(obj)) {
    return obj.type
  }
  return null
}

/**
 * Utility to get object ID safely
 */
export function getObjectId(obj: FabricObject): string | null {
  if (isCanvasObject(obj)) {
    return obj.id
  }
  return null
}
