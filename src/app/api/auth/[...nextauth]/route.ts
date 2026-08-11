import NextAuth, { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'

export const dynamic = 'force-dynamic'
import { db } from '../../../../lib/db'

export const authOptions: NextAuthOptions = {
  // НЕ використовуємо PrismaAdapter — він конфліктує з Prisma 7 WASM engine.
  // Замість цього вручну зберігаємо користувача в БД через callbacks.

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "text" },
        name: { label: "Name", type: "text" },
      },
      // Роль НІКОЛИ не приймається з клієнта — тільки з БД (виставляється через прийняте Invite
      // або вручну для першого адміна школи). Інакше будь-хто міг би увійти як admin/teacher.
      async authorize(credentials) {
        if (!credentials?.email) return null

        const email = credentials.email.toLowerCase()
        const name = credentials.name || 'Учень'

        try {
          let dbUser = await db.user.findUnique({
            where: { email },
          })

          if (dbUser?.deletedAt) return null

          if (!dbUser) {
            dbUser = await db.user.create({
              data: {
                email,
                name,
                role: 'student',
                lastLoginAt: new Date(),
              },
            })
          } else {
            dbUser = await db.user.update({
              where: { email },
              data: { lastLoginAt: new Date() },
            })
          }

          return {
            id: dbUser.id,
            name: dbUser.name,
            email: dbUser.email,
            role: dbUser.role,
          }
        } catch (e) {
          console.error('Error during credentials authorization:', e)
          return null
        }
      }
    }),
  ],

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async signIn({ user, account, profile }) {
      // Для Credentials входу не потрібні додаткові дії в signIn
      if (account?.provider === 'credentials') return true

      try {
        // Перевіряємо, чи є такий користувач у БД
        const existingUser = await db.user.findUnique({
          where: { email: user.email! },
        })

        if (existingUser?.deletedAt) return false

        if (!existingUser) {
          // Створюємо нового користувача
          await db.user.create({
            data: {
              email: user.email,
              name: user.name,
              image: user.image,
              role: 'student',
              lastLoginAt: new Date(),
            },
          })
        } else {
          // Оновлюємо дані (ім'я, аватарку, останній вхід)
          await db.user.update({
            where: { email: user.email! },
            data: {
              name: user.name,
              image: user.image,
              lastLoginAt: new Date(),
            },
          })
        }
      } catch (e) {
        console.error('Error saving user to DB:', e)
        // Дозволяємо вхід навіть якщо БД недоступна
      }
      return true
    },

    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
        // @ts-ignore
        token.role = user.role || 'student'

        if (user.email) {
          try {
            const dbUser = await db.user.findUnique({
              where: { email: user.email.toLowerCase() },
            })
            if (dbUser) {
              token.sub = dbUser.id
              token.role = dbUser.role
            }
          } catch (e) {
            console.error('Error mapping jwt sub to db user id:', e)
          }
        }
      }
      return token
    },

    async session({ session, token }) {
      if (session.user && token) {
        let dbUser = null
        try {
          dbUser = await db.user.findUnique({
            where: { id: token.sub as string },
          })
        } catch (e) {}

        if (!dbUser && session.user.email) {
          try {
            dbUser = await db.user.findUnique({
              where: { email: session.user.email.toLowerCase() },
            })
          } catch (e) {}
        }

        if (dbUser) {
          session.user.id = dbUser.id
          // @ts-ignore
          session.user.role = dbUser.role
        } else {
          session.user.id = token.sub as string
          // @ts-ignore
          session.user.role = (token.role as string) || 'student'
        }
      }
      return session
    },
  },

  pages: {
    signIn: '/login',
  },

  debug: process.env.NODE_ENV === 'development',
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
