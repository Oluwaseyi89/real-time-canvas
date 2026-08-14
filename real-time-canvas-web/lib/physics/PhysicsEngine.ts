/**
 * Physics engine wrapper for Matter.js
 * Manages physics bodies, interactions, and rendering
 */

import {
  Engine,
  World,
  Bodies,
  Body,
  Composite,
  Events,
  Runner,
  Vector,
  Pair,
} from 'matter-js'
import type {
  PhysicsBodyConfig,
  PhysicsConfig,
  ThrowConfig,
  ForceConfig,
  CollisionEvent,
} from '@/types/physics'
import { Canvas, Object as FabricObject } from 'fabric'

/**
 * Physics engine class with full Matter.js integration
 */
export class PhysicsEngine {
  private engine: Engine
  private runner: Runner | null = null
  private bodies: Map<string, Body> = new Map()
  private fabricObjects: Map<string, FabricObject> = new Map()
  private isRunning: boolean = false
  private isPaused: boolean = false
  private animationFrame: number | null = null
  private canvas: Canvas | null = null
  
  // Event callbacks
  private collisionCallbacks: Array<(event: CollisionEvent) => void> = []
  private bodyRemovedCallbacks: Array<(bodyId: string) => void> = []
  private bodyAddedCallbacks: Array<(body: Body) => void> = []

  constructor(config: PhysicsConfig = {}) {
    this.engine = Engine.create({
      gravity: {
        x: config.gravity?.x || 0,
        y: config.gravity?.y || 1,
      },
    })
    
    // Configure engine
    this.engine.enableSleeping = config.enableSleeping || false
    this.engine.timing.timeScale = config.timeScale || 1

    // Set up collision events
    Events.on(this.engine, 'collisionStart', this.handleCollision.bind(this))
    Events.on(this.engine, 'afterUpdate', this.syncFabricObjects.bind(this))
  }

  /**
   * Set the canvas for rendering
   */
  setCanvas(canvas: Canvas): void {
    this.canvas = canvas
  }

  /**
   * Start the physics engine
   */
  start(): void {
    if (this.isRunning) return
    
    this.isRunning = true
    this.isPaused = false
    
    // Create runner
    this.runner = Runner.create()
    Runner.run(this.runner, this.engine)
    
    // Start render loop
    this.renderLoop()
    
    console.log('[PhysicsEngine] Started')
  }

  /**
   * Stop the physics engine
   */
  stop(): void {
    if (!this.isRunning) return
    
    this.isRunning = false
    
    if (this.runner) {
      Runner.stop(this.runner)
      this.runner = null
    }
    
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
      this.animationFrame = null
    }
    
    console.log('[PhysicsEngine] Stopped')
  }

  /**
   * Pause the physics engine
   */
  pause(): void {
    this.isPaused = true
    if (this.runner) {
      Runner.stop(this.runner)
    }
  }

  /**
   * Resume the physics engine
   */
  resume(): void {
    if (!this.isPaused) return
    
    this.isPaused = false
    if (this.runner) {
      Runner.run(this.runner, this.engine)
    }
  }

  /**
   * Add a physics body
   */
  addBody(config: PhysicsBodyConfig): Body {
    let body: Body

    switch (config.type) {
      case 'rectangle':
        body = Bodies.rectangle(
          config.x,
          config.y,
          config.width || 50,
          config.height || 50,
          {
            angle: config.angle || 0,
            isStatic: config.isStatic || false,
            isSensor: config.isSensor || false,
            restitution: config.restitution || 0.5,
            friction: config.friction || 0.1,
            density: config.density || 0.001,
            label: config.label || config.type,
          }
        )
        break

      case 'circle':
        body = Bodies.circle(
          config.x,
          config.y,
          config.radius || 25,
          {
            angle: config.angle || 0,
            isStatic: config.isStatic || false,
            isSensor: config.isSensor || false,
            restitution: config.restitution || 0.5,
            friction: config.friction || 0.1,
            density: config.density || 0.001,
            label: config.label || config.type,
          }
        )
        break

      case 'polygon':
        if (!config.vertices) {
          throw new Error('Vertices required for polygon body')
        }
        // Convert vertices to proper format for Matter.js
        // Bodies.fromVertices expects Vector[][] (array of arrays for compound shapes)
        // For a single polygon, wrap in an array
        const vertices = config.vertices.map(v => Vector.create(v.x, v.y))
        body = Bodies.fromVertices(
          config.x,
          config.y,
          [vertices], // Wrap in array to match Vector[][] type
          {
            angle: config.angle || 0,
            isStatic: config.isStatic || false,
            isSensor: config.isSensor || false,
            restitution: config.restitution || 0.5,
            friction: config.friction || 0.1,
            density: config.density || 0.001,
            label: config.label || config.type,
          }
        )
        break

      default:
        // Default to rectangle
        body = Bodies.rectangle(
          config.x,
          config.y,
          config.width || 50,
          config.height || 50,
          {
            angle: config.angle || 0,
            isStatic: config.isStatic || false,
            isSensor: config.isSensor || false,
            restitution: config.restitution || 0.5,
            friction: config.friction || 0.1,
            density: config.density || 0.001,
            label: config.label || config.type,
          }
        )
    }

    // Store body reference with custom id in plugin
    if (body && body.plugin) {
      body.plugin.id = config.id
    }
    this.bodies.set(config.id, body)
    World.addBody(this.engine.world, body)
    
    this.bodyAddedCallbacks.forEach(cb => cb(body))
    
    return body
  }

  /**
   * Remove a physics body
   */
  removeBody(bodyId: string): void {
    const body = this.bodies.get(bodyId)
    if (body) {
      World.remove(this.engine.world, body)
      this.bodies.delete(bodyId)
      this.fabricObjects.delete(bodyId)
      this.bodyRemovedCallbacks.forEach(cb => cb(bodyId))
    }
  }

  /**
   * Get a physics body by ID
   */
  getBody(bodyId: string): Body | undefined {
    return this.bodies.get(bodyId)
  }

  /**
   * Get all physics bodies
   */
  getAllBodies(): Body[] {
    return Array.from(this.bodies.values())
  }

  /**
   * Link a Fabric object to a physics body
   */
  linkFabricObject(bodyId: string, fabricObj: FabricObject): void {
    this.fabricObjects.set(bodyId, fabricObj)
    const body = this.bodies.get(bodyId)
    if (body && fabricObj) {
      // Initial sync
      this.syncFabricObject(body, fabricObj)
    }
  }

  /**
   * Apply a throw force to a body
   */
  throwBody(bodyId: string, config: ThrowConfig): void {
    const body = this.bodies.get(bodyId)
    if (!body) return

    // Apply velocity
    Body.setVelocity(body, config.velocity)
    
    if (config.angularVelocity) {
      Body.setAngularVelocity(body, config.angularVelocity)
    }

    // Apply additional force if specified
    if (config.force) {
      const force = {
        x: config.velocity.x * config.force * body.mass,
        y: config.velocity.y * config.force * body.mass,
      }
      Body.applyForce(body, body.position, force)
    }

    // Wake up the body
    Body.setStatic(body, false)
  }

  /**
   * Apply attraction force to a body
   */
  attractBody(bodyId: string, config: ForceConfig): void {
    const body = this.bodies.get(bodyId)
    if (!body) return

    let targetPosition: { x: number; y: number }

    if (config.targetId) {
      const target = this.bodies.get(config.targetId)
      if (!target) return
      targetPosition = target.position
    } else if (config.position) {
      targetPosition = config.position
    } else {
      return
    }

    const dx = targetPosition.x - body.position.x
    const dy = targetPosition.y - body.position.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance === 0 || distance > config.radius) return

    const forceMagnitude = config.strength * body.mass / (distance * distance)
    const force = {
      x: (dx / distance) * forceMagnitude,
      y: (dy / distance) * forceMagnitude,
    }

    Body.applyForce(body, body.position, force)
  }

  /**
   * Apply repulsion force to a body
   */
  repelBody(bodyId: string, config: ForceConfig): void {
    const body = this.bodies.get(bodyId)
    if (!body) return

    let targetPosition: { x: number; y: number }

    if (config.targetId) {
      const target = this.bodies.get(config.targetId)
      if (!target) return
      targetPosition = target.position
    } else if (config.position) {
      targetPosition = config.position
    } else {
      return
    }

    const dx = body.position.x - targetPosition.x
    const dy = body.position.y - targetPosition.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance === 0 || distance > config.radius) return

    const forceMagnitude = config.strength * body.mass / (distance * distance)
    const force = {
      x: (dx / distance) * forceMagnitude,
      y: (dy / distance) * forceMagnitude,
    }

    Body.applyForce(body, body.position, force)
  }

  /**
   * Freeze/unfreeze a body without removing it — used to make a body follow
   * a manual Fabric drag (via setBodyPosition) without the simulation
   * fighting the user, then hand control back to physics on release.
   */
  setBodyStatic(bodyId: string, isStatic: boolean): void {
    const body = this.bodies.get(bodyId)
    if (!body) return
    Body.setStatic(body, isStatic)
  }

  /**
   * Directly set a body's position — used to keep a frozen (static) body
   * tracking the Fabric object it's linked to while the user drags it.
   */
  setBodyPosition(bodyId: string, position: { x: number; y: number }): void {
    const body = this.bodies.get(bodyId)
    if (!body) return
    Body.setPosition(body, position)
  }

  /**
   * Apply gravity to a body
   */
  applyGravity(bodyId: string, gravity: { x: number; y: number }): void {
    const body = this.bodies.get(bodyId)
    if (!body) return

    const force = {
      x: gravity.x * body.mass,
      y: gravity.y * body.mass,
    }

    Body.applyForce(body, body.position, force)
  }

  /**
   * Set gravity for the entire world
   */
  setGravity(gravity: { x: number; y: number }): void {
    this.engine.gravity.x = gravity.x
    this.engine.gravity.y = gravity.y
  }

  /**
   * Get gravity
   */
  getGravity(): { x: number; y: number } {
    return {
      x: this.engine.gravity.x,
      y: this.engine.gravity.y,
    }
  }

  /**
   * Set time scale
   */
  setTimeScale(scale: number): void {
    this.engine.timing.timeScale = scale
  }

  /**
   * Get time scale
   */
  getTimeScale(): number {
    return this.engine.timing.timeScale
  }

  /**
   * Register collision callback
   */
  onCollision(callback: (event: CollisionEvent) => void): () => void {
    this.collisionCallbacks.push(callback)
    return () => {
      const index = this.collisionCallbacks.indexOf(callback)
      if (index > -1) {
        this.collisionCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * Register body removed callback
   */
  onBodyRemoved(callback: (bodyId: string) => void): () => void {
    this.bodyRemovedCallbacks.push(callback)
    return () => {
      const index = this.bodyRemovedCallbacks.indexOf(callback)
      if (index > -1) {
        this.bodyRemovedCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * Register body added callback
   */
  onBodyAdded(callback: (body: Body) => void): () => void {
    this.bodyAddedCallbacks.push(callback)
    return () => {
      const index = this.bodyAddedCallbacks.indexOf(callback)
      if (index > -1) {
        this.bodyAddedCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * Handle collision events
   */
  private handleCollision(event: any): void {
    const pairs = event.pairs as Pair[]
    
    pairs.forEach((pair) => {
      this.collisionCallbacks.forEach(cb => {
        cb({
          bodyA: pair.bodyA,
          bodyB: pair.bodyB,
          pair: {
            bodyA: pair.bodyA,
            bodyB: pair.bodyB,
            collision: {
              normals: pair.collision.normal ? [pair.collision.normal] : [],
              supports: pair.collision.supports || [],
              depth: pair.collision.depth || 0,
            },
          },
        })
      })
    })
  }

  /**
   * Sync Fabric objects with physics bodies
   */
  private syncFabricObjects(): void {
    if (!this.canvas) return
    
    this.fabricObjects.forEach((fabricObj, bodyId) => {
      const body = this.bodies.get(bodyId)
      if (body) {
        this.syncFabricObject(body, fabricObj)
      }
    })
  }

  /**
   * Sync a single Fabric object with its physics body
   */
  private syncFabricObject(body: Body, fabricObj: FabricObject): void {
    if (!fabricObj || !this.canvas) return

    // Update position
    const objWidth = fabricObj.width || 50
    const objHeight = fabricObj.height || 50
    fabricObj.left = body.position.x - objWidth / 2
    fabricObj.top = body.position.y - objHeight / 2

    // Update rotation
    fabricObj.angle = (body.angle * 180) / Math.PI

    // Update size if needed
    if (body.bounds) {
      const width = body.bounds.max.x - body.bounds.min.x
      const height = body.bounds.max.y - body.bounds.min.y
      if (width > 0 && height > 0) {
        fabricObj.width = width
        fabricObj.height = height
      }
    }

    fabricObj.setCoords()
  }

  /**
   * Render loop for continuous updates
   */
  private renderLoop(): void {
    if (!this.isRunning) return

    this.animationFrame = requestAnimationFrame(() => {
      if (this.canvas && !this.isPaused) {
        this.canvas.renderAll()
      }
      this.renderLoop()
    })
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stop()
    this.bodies.clear()
    this.fabricObjects.clear()
    this.collisionCallbacks = []
    this.bodyRemovedCallbacks = []
    this.bodyAddedCallbacks = []
    this.canvas = null
    Engine.clear(this.engine)
  }
}

/**
 * Create a new physics engine instance
 */
export function createPhysicsEngine(config?: PhysicsConfig): PhysicsEngine {
  return new PhysicsEngine(config)
}
