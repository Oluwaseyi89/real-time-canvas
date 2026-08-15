/**
 * Factory for creating canvas objects with consistent configurations
 * Provides methods to create text, shapes, images, sticky notes, and audio objects
 */

import { 
  FabricObject, 
  IText, 
  Rect, 
  Circle, 
  Triangle, 
  Group, 
  FabricImage,
  TOptions,
  ITextProps,
  RectProps,
  CircleProps,
  ImageProps,
  FabricObjectProps,
  TMat2D,
} from 'fabric'
import { OBJECT_DEFAULTS } from './fabricConfig'
import { v4 as uuidv4 } from 'uuid'

/**
 * Base custom properties appended to Fabric.js canvas objects
 */
export interface CustomObjectProps {
  id: string
  type: string
  createdAt: Date
  createdBy?: string
  metadata?: Record<string, unknown>
}

/**
 * Extended Fabric.js Object with custom canvas fields
 */
export type CanvasObject = FabricObject & CustomObjectProps

/**
 * Options helper that allows passing custom metadata during creation
 */
export type WithCustomProps<T> = TOptions<T> & {
  createdBy?: string
  metadata?: Record<string, unknown>
}

/**
 * Helper function to attach custom application properties to a Fabric object
 */
function attachCustomProps<T extends FabricObject>(
  obj: T,
  type: string,
  options: { createdBy?: string; metadata?: Record<string, unknown> } = {}
): T & CustomObjectProps {
  const customObj = obj as T & CustomObjectProps
  customObj.id = uuidv4()
  // Fabric v6 made `type` a read-only getter derived from the object's
  // class (e.g. "i-text", "group") — a plain assignment throws
  // "Cannot set property type of [object Object] which has only a getter",
  // which was silently aborting every add*() call (createText/
  // createRectangle/... all route through here). Redefining it as an own,
  // writable property shadows the prototype getter for just this instance,
  // letting the app tag it with its own type string ("text", "sticky-group",
  // ...) without touching Fabric's own rendering, which dispatches through
  // each class's own prototype methods rather than by re-reading `.type`.
  Object.defineProperty(customObj, 'type', {
    value: type,
    writable: true,
    configurable: true,
    enumerable: true,
  })
  customObj.createdAt = new Date()
  if (options.createdBy) customObj.createdBy = options.createdBy
  if (options.metadata) customObj.metadata = options.metadata
  return customObj
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
    options: WithCustomProps<ITextProps> = {}
  ): IText & CustomObjectProps {
    const defaults = OBJECT_DEFAULTS.text
    const { createdBy, metadata, ...fabricOptions } = options

    const textObj = new IText(text, {
      ...defaults,
      ...fabricOptions,
    })

    return attachCustomProps(textObj, 'text', { createdBy, metadata })
  }

  /**
   * Create a rectangle shape
   * @param options - Shape options
   * @returns Fabric.js rectangle with custom properties
   */
  static createRectangle(
    options: WithCustomProps<RectProps> = {}
  ): Rect & CustomObjectProps {
    const defaults = OBJECT_DEFAULTS.shape
    const { createdBy, metadata, ...fabricOptions } = options

    const rectObj = new Rect({
      ...defaults,
      ...fabricOptions,
    })

    return attachCustomProps(rectObj, 'rect', { createdBy, metadata })
  }

  /**
   * Create a circle shape
   * @param options - Shape options
   * @returns Fabric.js circle with custom properties
   */
  static createCircle(
    options: WithCustomProps<CircleProps> = {}
  ): Circle & CustomObjectProps {
    const defaults = OBJECT_DEFAULTS.shape
    const { createdBy, metadata, ...fabricOptions } = options

    const circleObj = new Circle({
      ...defaults,
      ...fabricOptions,
    })

    return attachCustomProps(circleObj, 'circle', { createdBy, metadata })
  }

  /**
   * Create a triangle shape
   * @param options - Shape options
   * @returns Fabric.js triangle with custom properties
   */
  static createTriangle(
    options: WithCustomProps<FabricObjectProps> = {}
  ): Triangle & CustomObjectProps {
    const defaults = OBJECT_DEFAULTS.shape
    const { createdBy, metadata, ...fabricOptions } = options

    const triangleObj = new Triangle({
      ...defaults,
      ...fabricOptions,
    })

    return attachCustomProps(triangleObj, 'triangle', { createdBy, metadata })
  }

  /**
   * Create a sticky note object
   * @param text - Sticky note text content
   * @param options - Additional options
   * @returns Fabric.js group with sticky note styling
   */
  static createStickyNote(
    text: string,
    options: WithCustomProps<RectProps> = {}
  ): Group & CustomObjectProps {
    const defaults = OBJECT_DEFAULTS.sticky
    const { createdBy, metadata, ...fabricOptions } = options

    const rect = new Rect({
      ...defaults,
      ...fabricOptions,
    })

    // Add text to sticky note
    const textObj = new IText(text, {
      fontSize: 14,
      fontFamily: 'Inter, sans-serif',
      fill: '#1a1a1a',
      left: 10,
      top: 10,
      width: (defaults.width || 200) - 20,
      textAlign: 'left',
      lineHeight: 1.5,
      hasControls: false,
      hasBorders: false,
      selectable: false,
      evented: false,
    })

    const group = new Group([rect, textObj], {
      ...fabricOptions,
      subTargetCheck: true,
    })

    return attachCustomProps(group, 'sticky-group', { createdBy, metadata })
  }

  /**
   * Create an image object from a URL (Fabric v6 Promise-based API)
   * @param url - Image URL
   * @param options - Image options
   * @returns Promise with Fabric.js image
   */
  static async createImage(
    url: string,
    options: WithCustomProps<ImageProps> = {}
  ): Promise<FabricImage & CustomObjectProps> {
    const defaults = OBJECT_DEFAULTS.image
    const { createdBy, metadata, ...fabricOptions } = options

    try {
      const img = await FabricImage.fromURL(url, {
        crossOrigin: 'anonymous',
      })

      img.set({
        ...defaults,
        ...fabricOptions,
      })

      return attachCustomProps(img, 'image', { 
        createdBy, 
        metadata: {
          src: url,
          ...metadata,
        }
      })
    } catch (error) {
      console.error('[ObjectFactory] Failed to create image:', error)
      throw new Error(`Failed to load image from URL: ${url}`)
    }
  }

  /**
   * Create an audio object with waveform visualization
   * @param audioData - Audio data or URL
   * @param options - Audio object options
   * @returns Fabric.js group with audio representation
   */
  static createAudioObject(
    audioData: string | Blob,
    options: WithCustomProps<RectProps> = {}
  ): Group & CustomObjectProps {
    const audioUrl = typeof audioData === 'string' ? audioData : URL.createObjectURL(audioData)
    const { createdBy, metadata, ...fabricOptions } = options

    // Create audio icon
    const icon = new IText('🔊', {
      fontSize: 32,
      left: 15,
      top: 20,
      hasControls: false,
      hasBorders: false,
      selectable: false,
      evented: false,
    })

    // Create background rectangle
    const bg = new Rect({
      width: 120,
      height: 80,
      fill: '#e0e7ff',
      stroke: '#6366f1',
      strokeWidth: 2,
      rx: 8,
      ry: 8,
      ...fabricOptions,
    })

    // Create audio label
    const label = new IText('🎵 Audio', {
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

    const group = new Group([bg, icon, label], {
      subTargetCheck: true,
    })

    // Double-click (not single-click) so selecting/dragging the note like
    // any other object doesn't also trigger playback on every click.
    group.on('mousedblclick', () => {
      const player = new Audio(audioUrl)
      player.play().catch((error) => {
        console.error('[ObjectFactory] Failed to play audio:', error)
      })
    })

    return attachCustomProps(group, 'audio', {
      createdBy,
      metadata: {
        audioUrl,
        duration: 0,
        ...metadata,
      },
    })
  }

  /**
   * Create a custom object with arbitrary type
   * @param type - Object type
   * @param options - Object options
   * @returns Fabric.js object with custom properties
   */
  static createCustomObject(
    type: string,
    options: WithCustomProps<FabricObjectProps> = {}
  ): FabricObject & CustomObjectProps {
    const { createdBy, metadata, ...fabricOptions } = options

    const obj = new FabricObject({
      ...fabricOptions,
    })

    return attachCustomProps(obj, type, { createdBy, metadata })
  }

  /**
   * Create a shape with specified geometry
   * @param shapeType - Type of shape to create
   * @param options - Shape options
   * @returns Fabric.js object with custom properties
   */
  static createShape(
    shapeType: 'rect' | 'circle' | 'triangle',
    options: WithCustomProps<RectProps & CircleProps & FabricObjectProps> = {}
  ): FabricObject & CustomObjectProps {
    switch (shapeType) {
      case 'rect':
        return this.createRectangle(options)
      case 'circle':
        return this.createCircle(options)
      case 'triangle':
        return this.createTriangle(options)
      default:
        throw new Error(`Unsupported shape type: ${shapeType}`)
    }
  }
}

/**
 * Utility to extract custom properties from Fabric.js objects safely
 */
export function getCanvasObjectProperties(
  obj: FabricObject
): CustomObjectProps | null {
  if (isCanvasObject(obj)) {
    const custom = obj as Partial<CustomObjectProps>
    return {
      id: custom.id as string,
      type: custom.type as string,
      createdAt: custom.createdAt as Date,
      createdBy: custom.createdBy,
      metadata: custom.metadata,
    }
  }
  return null
}

/**
 * Type guard utility to check if a Fabric object has custom canvas properties
 */
export function isCanvasObject(obj: FabricObject): obj is CanvasObject {
  const custom = obj as Partial<CustomObjectProps>
  return (
    'id' in obj &&
    typeof custom.id === 'string' &&
    'type' in obj &&
    typeof custom.type === 'string' &&
    'createdAt' in obj &&
    custom.createdAt instanceof Date
  )
}

/**
 * Get object type safely
 */
export function getObjectType(obj: FabricObject): string | null {
  if (isCanvasObject(obj)) {
    return (obj as CanvasObject).type
  }
  return null
}

/**
 * Get object ID safely
 */
export function getObjectId(obj: FabricObject): string | null {
  if (isCanvasObject(obj)) {
    return (obj as CanvasObject).id
  }
  return null
}
