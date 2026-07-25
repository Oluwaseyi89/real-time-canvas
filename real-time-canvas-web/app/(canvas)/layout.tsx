export default function CanvasLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <section className="w-full h-screen">{children}</section>
}