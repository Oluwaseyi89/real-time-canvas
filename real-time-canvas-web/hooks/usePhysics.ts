/**
 * Custom hook for physics engine integration
 * Provides physics interactions for canvas objects
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { PhysicsEngine, createPhysicsEngine } from '@/lib/physics/PhysicsEngine'
import type { PhysicsBodyConfig, ThrowConfig, ForceConfig } from '@/types/physics'
import { Object as FabricObject } from 'fabric'

interface UsePhysicsOptions {
  enabled?: boolean
  gravity?: { x: number; y: number }
  autoStart?: boolean
  onCollision?: (bodyA: any, bodyB: any) => void
}

export function usePhysics(options: UsePhysicsOptions = {}) {
  const {
    enabled = true,
    gravity = { x: 0, y: 1 },
    autoStart = true,
    onCollision,
  } = options

  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const engineRef = useRef<PhysicsEngine | null>(null)
  const bodiesRef = useRef<Map<string, any>>(new Map())

  /**
   * Initialize physics engine
   */
  const initEngine = useCallback((canvas?: any) => {
    if (engineRef.current) {
      engineRef.current.dispose()
    }

    const engine = createPhysicsEngine({ gravity })
    
    if (canvas) {
      engine.setCanvas(canvas)
    }

    // Set up collision callback
    if (onCollision) {
      engine.onCollision((event) => {
        onCollision(event.bodyA, event.bodyB)
      })
    }

    engineRef.current = engine

    if (autoStart) {
      engine.start()
      setIsRunning(true)
    }

    return engine
  }, [gravity, autoStart, onCollision])

  /**
   * Start physics engine
   */
  const start = useCallback(() => {
    if (engineRef.current && !isRunning) {
      engineRef.current.start()
      setIsRunning(true)
      setIsPaused(false)
    }
  }, [isRunning])

  /**
   * Stop physics engine
   */
  const stop = useCallback(() => {
    if (engineRef.current && isRunning) {
      engineRef.current.stop()
      setIsRunning(false)
      setIsPaused(false)
    }
  }, [isRunning])

  /**
   * Pause physics engine
   */
  const pause = useCallback(() => {
    if (engineRef.current && isRunning) {
      engineRef.current.pause()
      setIsPaused(true)
    }
  }, [isRunning])

  /**
   * Resume physics engine
   */
  const resume = useCallback(() => {
    if (engineRef.current && isPaused) {
      engineRef.current.resume()
      setIsPaused(false)
    }
  }, [isPaused])

  /**
   * Add a physics body for a canvas object
   */
  const addBody = useCallback((config: PhysicsBodyConfig, fabricObj?: FabricObject) => {
    if (!engineRef.current) return null

    const body = engineRef.current.addBody(config)
    bodiesRef.current.set(config.id, body)

    if (fabricObj) {
      engineRef.current.linkFabricObject(config.id, fabricObj)
    }

    return body
  }, [])

  /**
   * Remove a physics body
   */
  const removeBody = useCallback((bodyId: string) => {
    if (engineRef.current) {
      engineRef.current.removeBody(bodyId)
      bodiesRef.current.delete(bodyId)
    }
  }, [])

  /**
   * Apply throw force to a body
   */
  const throwBody = useCallback((bodyId: string, config: ThrowConfig) => {
    if (engineRef.current) {
      engineRef.current.throwBody(bodyId, config)
    }
  }, [])

  /**
   * Apply attraction force
   */
  const attractBody = useCallback((bodyId: string, config: ForceConfig) => {
    if (engineRef.current) {
      engineRef.current.attractBody(bodyId, config)
    }
  }, [])

  /**
   * Apply repulsion force
   */
  const repelBody = useCallback((bodyId: string, config: ForceConfig) => {
    if (engineRef.current) {
      engineRef.current.repelBody(bodyId, config)
    }
  }, [])

  /**
   * Get a body by ID
   */
  const getBody = useCallback((bodyId: string) => {
    if (engineRef.current) {
      return engineRef.current.getBody(bodyId)
    }
    return undefined
  }, [])

  /**
   * Get all bodies
   */
  const getAllBodies = useCallback(() => {
    if (engineRef.current) {
      return engineRef.current.getAllBodies()
    }
    return []
  }, [])

  /**
   * Set gravity
   */
  const setGravity = useCallback((gravity: { x: number; y: number }) => {
    if (engineRef.current) {
      engineRef.current.setGravity(gravity)
    }
  }, [])

  /**
   * Set time scale
   */
  const setTimeScale = useCallback((scale: number) => {
    if (engineRef.current) {
      engineRef.current.setTimeScale(scale)
    }
  }, [])

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (engineRef.current) {
        engineRef.current.dispose()
        engineRef.current = null
      }
    }
  }, [])

  return {
    engine: engineRef.current,
    isRunning,
    isPaused,
    start,
    stop,
    pause,
    resume,
    addBody,
    removeBody,
    throwBody,
    attractBody,
    repelBody,
    getBody,
    getAllBodies,
    setGravity,
    setTimeScale,
    initEngine,
  }
}
