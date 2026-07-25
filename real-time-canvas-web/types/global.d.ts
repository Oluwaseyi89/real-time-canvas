/// <reference types="next" />
/// <reference types="next/image-types/global" />

// Extend Window interface for custom properties
interface Window {
  __CANVAS_INITIALIZED__?: boolean
}

// Declare Fabric.js module
declare module 'fabric' {
  export * from 'fabric/dist/fabric'
}

// Declare Matter.js module  
declare module 'matter-js' {
  export * from 'matter-js'
}
