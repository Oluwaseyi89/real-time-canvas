/**
 * WebSocket event handlers for the canvas
 * Processes incoming WebSocket messages and updates canvas state
 */

import { 
  Canvas, 
  Object as FabricObject, 
  IText, 
  Rect, 
  Circle, 
  FabricImage,
  TPointerEvent,
} from 'fabric'
import type {
  WebSocketMessage,
  ObjectCreatePayload,
  ObjectUpdatePayload,
  ObjectDeletePayload,
  CanvasSyncPayload,
  PhysicsPayload,
  ErrorPayload,
} from '@/types/websocket'
import type { WebSocketClient } from './client'

/**
 * Canvas event handler context
 *
 * Presence/cursor/user-joined/user-left are handled separately by
 * useCollaboration (which writes directly to collaborationStore with
 * dedup + mutual-discovery logic) — this context only covers canvas
 * object and physics mutations, which is what WebSocketHandlers is for.
 */
export interface CanvasEventHandlerContext {
  canvas: Canvas
  addObject: (obj: FabricObject) => void
  removeObject: (id: string) => void
  updateObject: (id: string, props: Record<string, unknown>) => void
}

/**
 * WebSocket message handlers
 */
export class WebSocketHandlers {
  private context: CanvasEventHandlerContext
  private client: WebSocketClient

  constructor(context: CanvasEventHandlerContext, client: WebSocketClient) {
    this.context = context
    this.client = client
  }

  /**
   * Handle object creation message
   */
  handleObjectCreate(message: WebSocketMessage<ObjectCreatePayload>): void {
    const { objectId, type, data, position } = message.payload
    
    // Check if object already exists
    const existing = this.context.canvas.getObjects().find(
      (obj: any) => obj.id === objectId
    )
    if (existing) {
      console.warn('[WebSocketHandlers] Object already exists:', objectId)
      return
    }

    // Create object based on type
    try {
      let obj: FabricObject | null = null

      switch (type) {
        case 'text': {
          const textObj = new IText(data.text as string, {
            left: position.x,
            top: position.y,
            fontSize: data.fontSize as number || 24,
            fill: data.fill as string || '#1a1a1a',
            ...data,
          })
          obj = textObj
          break
        }
        case 'rect': {
          const rectObj = new Rect({
            left: position.x,
            top: position.y,
            width: data.width as number || 100,
            height: data.height as number || 100,
            fill: data.fill as string || '#3b82f6',
            ...data,
          })
          obj = rectObj
          break
        }
        case 'circle': {
          const circleObj = new Circle({
            left: position.x,
            top: position.y,
            radius: data.radius as number || 50,
            fill: data.fill as string || '#ef4444',
            ...data,
          })
          obj = circleObj
          break
        }
        case 'image': {
          // Fabric v6: fromURL expects (url, options) then returns Promise
          // Use the promise-based approach
          FabricImage.fromURL(data.src as string, {
            crossOrigin: 'anonymous',
          })
            .then((img: FabricImage) => {
              img.set({
                left: position.x,
                top: position.y,
                ...data,
              })
              // Add custom properties
              ;(img as any).id = objectId
              ;(img as any).createdBy = message.userId
              ;(img as any).createdAt = new Date()
              ;(img as any).synced = true
              this.context.addObject(img)
            })
            .catch((error: Error) => {
              console.error('[WebSocketHandlers] Failed to load image:', error)
            })
          return
        }
        default:
          console.warn('[WebSocketHandlers] Unknown object type:', type)
          return
      }

      if (obj) {
        // Add custom properties
        ;(obj as any).id = objectId
        ;(obj as any).createdBy = message.userId
        ;(obj as any).createdAt = new Date()
        ;(obj as any).synced = true
        
        this.context.addObject(obj)
      }
    } catch (error) {
      console.error('[WebSocketHandlers] Failed to create object:', error)
    }
  }

  /**
   * Handle object update message
   */
  handleObjectUpdate(message: WebSocketMessage<ObjectUpdatePayload>): void {
    const { objectId, updates } = message.payload
    
    const obj = this.context.canvas.getObjects().find(
      (o: any) => o.id === objectId
    )

    if (!obj) {
      console.warn('[WebSocketHandlers] Object not found for update:', objectId)
      return
    }

    try {
      obj.set(updates as Partial<FabricObject>)
      obj.setCoords()
      this.context.canvas.requestRenderAll()
    } catch (error) {
      console.error('[WebSocketHandlers] Failed to update object:', error)
    }
  }

  /**
   * Handle object deletion message
   */
  handleObjectDelete(message: WebSocketMessage<ObjectDeletePayload>): void {
    const { objectId } = message.payload
    
    const obj = this.context.canvas.getObjects().find(
      (o: any) => o.id === objectId
    )

    if (obj) {
      this.context.removeObject(objectId)
    }
  }

  /**
   * Handle canvas sync (bulk hydration of objects, e.g. on room join)
   * Reuses handleObjectCreate per object so we don't duplicate the
   * type-to-Fabric-object construction logic.
   */
  handleCanvasSync(message: WebSocketMessage<CanvasSyncPayload>): void {
    const { objects } = message.payload

    for (const obj of objects) {
      const existing = this.context.canvas.getObjects().find(
        (o: any) => o.id === obj.id
      )
      if (existing) continue

      this.handleObjectCreate({
        ...message,
        type: 'object:create',
        payload: {
          objectId: obj.id,
          type: obj.type,
          data: obj.data,
          position: {
            x: (obj.data.left as number) || 0,
            y: (obj.data.top as number) || 0,
          },
        },
      })
    }
  }

  /**
   * Handle physics events
   */
  handlePhysicsEvent(message: WebSocketMessage<PhysicsPayload>): void {
    const { objectId, type, velocity, force, targetId } = message.payload
    
    const obj = this.context.canvas.getObjects().find(
      (o: any) => o.id === objectId
    )

    if (!obj) return

    // Store animation frame ID for cleanup
    let animationFrameId: number | null = null

    switch (type) {
      case 'throw': {
        // Apply velocity to object
        if (velocity) {
          const animateThrow = () => {
            const currentLeft = obj.left || 0
            const currentTop = obj.top || 0
            
            obj.set({
              left: currentLeft + velocity.x * 0.1,
              top: currentTop + velocity.y * 0.1,
            })
            obj.setCoords()
            this.context.canvas.requestRenderAll()
            
            // Continue animation with damping and gravity
            const newVelocityX = velocity.x * 0.99
            const newVelocityY = velocity.y * 0.99 + 0.1 // gravity
            
            if (Math.abs(newVelocityX) > 0.1 || Math.abs(newVelocityY) > 0.1) {
              velocity.x = newVelocityX
              velocity.y = newVelocityY
              animationFrameId = requestAnimationFrame(animateThrow)
            } else {
              // Final position
              obj.set({
                left: (obj.left || 0) + velocity.x * 0.1,
                top: (obj.top || 0) + velocity.y * 0.1,
              })
              obj.setCoords()
              this.context.canvas.requestRenderAll()
            }
          }
          animateThrow()
        }
        break
      }
      case 'collision': {
        // Handle object collision
        if (targetId) {
          const target = this.context.canvas.getObjects().find(
            (o: any) => o.id === targetId
          )
          if (target) {
            // Apply bounce effect
            const objLeft = obj.left || 0
            const objTop = obj.top || 0
            const targetLeft = target.left || 0
            const targetTop = target.top || 0
            
            const dx = objLeft - targetLeft
            const dy = objTop - targetTop
            const distance = Math.sqrt(dx * dx + dy * dy)
            
            if (distance > 0) {
              const forceMagnitude = force || 10
              const pushX = (dx / distance) * forceMagnitude
              const pushY = (dy / distance) * forceMagnitude
              
              obj.set({
                left: objLeft + pushX,
                top: objTop + pushY,
              })
              obj.setCoords()
              this.context.canvas.requestRenderAll()
            }
          }
        }
        break
      }
      default:
        console.debug('[WebSocketHandlers] Unhandled physics event:', type)
    }
  }

  /**
   * Handle error messages
   */
  handleError(message: WebSocketMessage<ErrorPayload>): void {
    console.error('[WebSocketHandlers] Server error:', message.payload)
    // Display error to user (could trigger a toast notification)
  }
}

/**
 * Create WebSocket handlers
 */
export function createWebSocketHandlers(
  context: CanvasEventHandlerContext,
  client: WebSocketClient
): WebSocketHandlers {
  return new WebSocketHandlers(context, client)
}
