/**
 * Canvas Room Loading Component
 * Renders a dark glassmorphic loading screen while canvas assets,
 * physics engines, and real-time sockets initialize.
 */

export default function CanvasRoomLoading() {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen w-screen bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
      {/* Dynamic Background Mesh Grid (Matching Canvas Workspace) */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

      {/* Main Glassmorphic Loading Card */}
      <div className="relative z-10 flex flex-col items-center max-w-sm w-full mx-auto p-8 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-2xl shadow-2xl text-center">
        {/* Animated Multi-Ring Spinner Icon */}
        <div className="relative flex items-center justify-center mb-6">
          {/* Outer glowing halo */}
          <div className="absolute -inset-2 rounded-full bg-indigo-500/20 blur-xl animate-pulse" />
          
          {/* Outer spinner ring */}
          <div className="w-16 h-16 rounded-full border-2 border-slate-800 border-t-indigo-500 animate-spin" />
          
          {/* Inner reverse spinner ring */}
          <div className="absolute w-10 h-10 rounded-full border-2 border-slate-800 border-b-emerald-400 animate-spin [animation-direction:reverse]" />
          
          {/* Center Icon */}
          <span className="absolute text-xl">🎨</span>
        </div>

        {/* Heading & Subtitle */}
        <h2 className="text-sm font-semibold tracking-widest text-slate-200 uppercase font-mono">
          Loading Canvas
        </h2>
        <p className="text-xs text-slate-400 mt-2 font-mono leading-relaxed">
          Preparing your collaborative spatial workspace
        </p>

        {/* Status Telemetry Pills */}
        <div className="mt-6 w-full space-y-2 text-[11px] font-mono">
          <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800/60 text-slate-400">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              Canvas Engine
            </span>
            <span className="text-slate-500">Initializing...</span>
          </div>

          <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800/60 text-slate-400">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              WebSocket Sync
            </span>
            <span className="text-slate-500">Connecting...</span>
          </div>
        </div>
      </div>
    </div>
  )
}