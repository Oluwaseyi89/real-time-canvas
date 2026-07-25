/**
 * Canvas rendering engine with optimized object rendering
 * Handles rendering of all canvas objects with performance optimizations
 */

import { Canvas, Object as FabricObject } from 'fabric'
import { PERFORMANCE_CONFIG } from './fabricConfig'

/**
 * Rendering engine class responsible for managing canvas rendering
 * Optimized for 100+ objects with smooth interactions
 */
export class CanvasRenderer {
  private canvas: Canvas
  private renderInterval: NodeJS.Timeout | null = null
  private isRendering: boolean = false
  private objectCache: Map<string, FabricObject> = new Map()

  constructor(canvas: Canvas) {
    this.canvas = canvas
    this.setupPerformanceOptimizations()
  }

  /**
   * Set up performance optimizations for the canvas
   * - Enable object caching
   * - Set render interval
   * - Configure offscreen rendering
   */
  private setupPerformanceOptimizations(): void {
    // Enable caching for all objects
    this.canvas.renderOnAddRemove = true
    this.canvas.skipOffscreen = true
    this.canvas.preserveObjectStacking = true

    // Set up render loop for smooth animations
    this.renderInterval = setInterval(() => {
      if (!this.isRendering) {
        this.isRendering = true
        this.canvas.renderAll()
        this.isRendering = false
      }
    }, PERFORMANCE_CONFIG.renderIntervalMs)
  }

  /**
   * Add an object to the canvas with caching
   * @param object - Fabric.js object to add
   * @param cacheId - Optional cache ID for object
   */
  public addObject(object: FabricObject, cacheId?: string): void {
    if (cacheId) {
      this.objectCache.set(cacheId, object)
    }

    // Enable caching for performance
    object.objectCaching = true

    this.canvas.add(object)
    this.canvas.renderAll()
  }

  /**
   * Remove an object from the canvas
   * @param object - Fabric.js object to remove
   * @param cacheId - Optional cache ID to clear
   */
  public removeObject(object: FabricObject, cacheId?: string): void {
    if (cacheId) {
      this.objectCache.delete(cacheId)
    }

    this.canvas.remove(object)
    this.canvas.renderAll()
  }

  /**
   * Get an object from the cache
   * @param cacheId - Cache ID of the object
   * @returns The cached object or undefined
   */
  public getCachedObject(cacheId: string): FabricObject | undefined {
    return this.objectCache.get(cacheId)
  }

  /**
   * Batch add multiple objects for better performance
   * @param objects - Array of objects to add
   */
  public batchAddObjects(objects: FabricObject[]): void {
    // Disable rendering during batch operations
    this.canvas.renderOnAddRemove = false

    objects.forEach((obj) => {
      obj.objectCaching = true
      this.canvas.add(obj)
    })

    this.canvas.renderOnAddRemove = true
    this.canvas.renderAll()
  }

  /**
   * Batch remove multiple objects
   * @param objects - Array of objects to remove
   */
  public batchRemoveObjects(objects: FabricObject[]): void {
    this.canvas.renderOnAddRemove = false

    objects.forEach((obj) => {
      // Remove from cache if present
      for (const [key, cached] of this.objectCache) {
        if (cached === obj) {
          this.objectCache.delete(key)
          break
        }
      }
      this.canvas.remove(obj)
    })

    this.canvas.renderOnAddRemove = true
    this.canvas.renderAll()
  }

  /**
   * Clear all objects from the canvas
   */
  public clearAll(): void {
    this.objectCache.clear()
    this.canvas.clear()
    this.canvas.renderAll()
  }

  /**
   * Render the canvas immediately
   */
  public render(): void {
    this.canvas.renderAll()
  }

  /**
   * Dispose of the renderer and clean up resources
   */
  public dispose(): void {
    if (this.renderInterval) {
      clearInterval(this.renderInterval)
      this.renderInterval = null
    }
    this.objectCache.clear()
  }

  /**
   * Get all objects on the canvas
   * @returns Array of all objects
   */
  public getAllObjects(): FabricObject[] {
    return this.canvas.getObjects()
  }

  /**
   * Get objects of a specific type
   * @param type - Object type (e.g., 'rect', 'circle', 'text', 'image')
   * @returns Array of objects of the specified type
   */
  public getObjectsByType(type: string): FabricObject[] {
    return this.canvas.getObjects().filter((obj: FabricObject) => obj.type === type)
  }

  /**
   * Get the count of objects on the canvas
   */
  public getObjectCount(): number {
    return this.canvas.getObjects().length
  }

  /**
   * Check if the canvas has reached the optimization threshold
   */
  public needsOptimization(): boolean {
    return this.getObjectCount() > PERFORMANCE_CONFIG.maxObjectsBeforeOptimization
  }
}

/**
 * Create a new CanvasRenderer instance
 */
export function createRenderer(canvas: Canvas): CanvasRenderer {
  return new CanvasRenderer(canvas)
}
