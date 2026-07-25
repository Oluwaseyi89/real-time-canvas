import NextAuth from 'next-auth'

const handler = NextAuth({
  providers: [],
  // Add your NextAuth options here
})

export { handler as GET, handler as POST }