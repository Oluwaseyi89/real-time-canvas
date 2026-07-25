/**
 * Factory for creating canvas objects with consistent configurations
 * Provides methods to create text, shapes, images, sticky notes, and audio objects
 */

import { fabric } from 'fabric'
import { OBJECT_DEFAULTS } from './fabricConfig'
import { v4 as uuidv4 } from 'uuid'

/**
 * Base interface for all canvas objects
 * Extends Fabric.js object with custom properties
 */
export interface CanvasObject extends fabric.Object {
  id: string
  type: string
  createdAt: Date
  createdBy?: string
  metadata?: Record<string, any>
}

/**
 * Factory class for creating canvas objects
 */
export class ObjectFactory {
  /**
   * Create a text object with consistent styling
   * @param text - Text content
   * @param options - Additional options
   * @returns Fabric.js text object with custom properties
   */
  static createText(
    text: string,
    options: Partial<fabric.ITextOptions> = {}
  ): fabric.IText {
    const id = uuidv4()
    const defaults = OBJECT_DEFAULTS.text

    return new fabric.IText(text, {
      ...defaults,
      ...options,
      id,
      type: 'text',
      createdAt: new Date(),
      metadata: options.metadata || {},
    }) as fabric.IText & CanvasObject
  }

  /**
   * Create a rectangle shape
   * @param options - Shape options
   * @returns Fabric.js rectangle with custom properties
   */
  static createRectangle(
    options: Partial<fabric.IRectOptions> = {}
  ): fabric.Rect {
    const id = uuidv4()
    const defaults = OBJECT_DEFAULTS.shape

    return new fabric.Rect({
      ...defaults,
      ...options,
      id,
      type: 'rect',
      createdAt: new Date(),
      metadata: options.metadata || {},
    }) as fabric.Rect & CanvasObject
  }

  /**
   * Create a circle shape
   * @param options - Shape options
   * @returns Fabric.js circle with custom properties
   */
  static createCircle(
    options: Partial<fabric.ICircleOptions> = {}
  ): fabric.Circle {
    const id = uuidv4()
    const defaults = OBJECT_DEFAULTS.shape

    return new fabric.Circle({
      ...defaults,
      ...options,
      id,
      type: 'circle',
      createdAt: new Date(),
      metadata: options.metadata || {},
    }) as fabric.Circle & CanvasObject
  }

  /**
   * Create a triangle shape
   * @param options - Shape options
   * @returns Fabric.js triangle with custom properties
   */
  static createTriangle(
    options: Partial<fabric.ITriangleOptions> = {}
  ): fabric.Triangle {
    const id = uuidv4()
    const defaults = OBJECT_DEFAULTS.shape

    return new fabric.Triangle({
      ...defaults,
      ...options,
      id,
      type: 'triangle',
      createdAt: new Date(),
      metadata: options.metadata || {},
    }) as fabric.Triangle & CanvasObject
  }

  /**
   * Create a sticky note object
   * @param text - Sticky note text content
   * @param options - Additional options
   * @returns Fabric.js rect with sticky note styling
   */
  static createStickyNote(
    text: string,
    options: Partial<fabric.IRectOptions> = {}
  ): fabric.Rect {
    const id = uuidv4()
    const defaults = OBJECT_DEFAULTS.sticky

    const rect = new fabric.Rect({
      ...defaults,
      ...options,
      id,
      type: 'sticky',
      createdAt: new Date(),
      metadata: options.metadata || {},
    }) as fabric.Rect & CanvasObject

    // Add text to sticky note
    const textObj = new fabric.IText(text, {
      fontSize: 14,
      fontFamily: 'Inter, sans-serif',
      fill: '#1a1a1a',
      left: 10,
      top: 10,
      width: defaults.width - 20,
      textAlign: 'left',
      lineHeight: 1.5,
      hasControls: false,
      hasBorders: false,
      selectable: false,
      evented: false,
    })

    const group = new fabric.Group([rect, textObj], {
      ...options,
      id,
      type: 'sticky-group',
      createdAt: new Date(),
      subTargetCheck: true,
      metadata: options.metadata || {},
    }) as fabric.Group & CanvasObject

    return group
  }

  /**
   * Create an image object from a URL
   * @param url - Image URL
   * @param options - Image options
   * @returns Promise with Fabric.js image
   */
  static async createImage(
    url: string,
    options: Partial<fabric.IImageOptions> = {}
  ): Promise<fabric.Image> {
    const id = uuidv4()
    const defaults = OBJECT_DEFAULTS.image

    return new Promise((resolve, reject) => {
      fabric.Image.fromURL(
        url,
        (img) => {
          img.set({
            ...defaults,
            ...options,
            id,
            type: 'image',
            createdAt: new Date(),
            metadata: options.metadata || {},
          } as any)
          resolve(img as fabric.Image & CanvasObject)
        },
        { crossOrigin: 'anonymous' }
      )
    })
  }

  /**
   * Create an audio object with waveform visualization
   * @param audioData - Audio data or URL
   * @param options - Audio object options
   * @returns Fabric.js group with audio representation
   */
  static createAudioObject(
    audioData: string | Blob,
    options: Partial<fabric.IRectOptions> = {}
  ): fabric.Group {
    const id = uuidv4()
    const audioUrl = typeof audioData === 'string' ? audioData : URL.createObjectURL(audioData)

    // Create audio icon
    const icon = new fabric.Text('🔊', {
      fontSize: 32,
      left: 15,
      top: 20,
      hasControls: false,
      hasBorders: false,
      selectable: false,
      evented: false,
    })

    // Create background rectangle
    const bg = new fabric.Rect({
      width: 120,
      height: 80,
      fill: '#e0e7ff',
      stroke: '#6366f1',
      strokeWidth: 2,
      rx: 8,
      ry: 8,
      ...options,
    })

    // Create audio label
    const label = new fabric.IText('🎵 Audio', {
      fontSize: 12,
      fontFamily: 'Inter, sans-serif',
      fill: '#4338ca',
      left: 55,
      top: 55,
      hasControls: false,
      hasBorders: false,
      selectable: false,
      evented: false,
    })

    const group = new fabric.Group([bg, icon, label], {
      id,
      type: 'audio',
      createdAt: new Date(),
      metadata: {
        audioUrl,
        ...options.metadata,
      },
      subTargetCheck: true,
    }) as fabric.Group & CanvasObject

    return group
  }

  /**
   * Create a generic object with custom type
   * @param type - Object type
   * @param options - Object options
   * @returns Fabric.js object with custom properties
   */
  static createCustomObject(
    type: string,
    options: Partial<fabric.IObjectOptions> = {}
  ): fabric.Object {
    const id = uuidv4()

    const obj = new fabric.Object({
      ...options,
      id,
      type,
      createdAt: new Date(),
      metadata: options.metadata || {},
    }) as fabric.Object & CanvasObject

    return obj
  }
}

/**
 * Utility to extract custom properties from Fabric.js objects
 */
export function getCanvasObjectProperties(
  obj: fabric.Object
): Partial<CanvasObject> | null {
  const customObj = obj as any
  if (customObj.id && customObj.type && customObj.createdAt) {
    return {
      id: customObj.id,
      type: customObj.type,
      createdAt: customObj.createdAt,
      createdBy: customObj.createdBy,
      metadata: customObj.metadata,
    }
  }
  return null
}

/**
 * Utility to check if an object is a custom canvas object
 */
export function isCanvasObject(obj: fabric.Object): boolean {
  const customObj = obj as any
  return !!(customObj.id && customObj.type && customObj.createdAt)
}
