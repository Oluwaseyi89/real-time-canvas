/**
 * Physics types for Matter.js integration
 * Defines physics bodies, interactions, and configuration
 */

import { Body, Composite, Engine, World } from 'matter-js'

/**
 * Physics body types
 */
export type PhysicsBodyType = 'rectangle' | 'circle' | 'polygon' | 'text' | 'image' | 'sticky'

/**
 * Physics body configuration
 */
export interface PhysicsBodyConfig {
  id: string
  type: PhysicsBodyType
  x: number
  y: number
  width?: number
  height?: number
  radius?: number
  angle?: number
  isStatic?: boolean
  isSensor?: boolean
  restitution?: number
  friction?: number
  density?: number
  label?: string
  vertices?: { x: number; y: number }[]
  plugin?: {
    canvasObjectId?: string
    metadata?: Record<string, unknown>
  }
}

/**
 * Physics interaction types
 */
export type PhysicsInteraction = 'throw' | 'collision' | 'attract' | 'repel' | 'gravity'

/**
 * Throw configuration
 */
export interface ThrowConfig {
  velocity: { x: number; y: number }
  angularVelocity?: number
  force?: number
  damping?: number
}

/**
 * Attraction/Repulsion configuration
 */
export interface ForceConfig {
  targetId?: string
  position?: { x: number; y: number }
  strength: number
  radius: number
  type: 'attract' | 'repel'
  damping?: number
}

/**
 * Collision event data
 */
export interface CollisionEvent {
  bodyA: Body
  bodyB: Body
  pair: {
    bodyA: Body
    bodyB: Body
    collision: {
      normals: { x: number; y: number }[]
      supports: { x: number; y: number }[]
      depth: number
    }
  }
}

/**
 * Physics engine state
 */
export interface PhysicsState {
  engine: Engine | null
  world: World | null
  bodies: Map<string, Body>
  isRunning: boolean
  isPaused: boolean
  gravity: { x: number; y: number }
  timeScale: number
}

/**
 * Physics configuration
 */
export interface PhysicsConfig {
  gravity?: { x: number; y: number }
  enableSleeping?: boolean
  timeScale?: number
  collisionDetection?: boolean
  debug?: boolean
}
