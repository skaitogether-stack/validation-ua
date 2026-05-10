import NextAuth, { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { db } from '../../../../lib/db'

export const authOptions: NextAuthOptions = {
  // НЕ використовуємо PrismaAdapter — він конфліктує з Prisma 7 WASM engine.
  // Замість цього вручну зберігаємо користувача в БД через callbacks.

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        // Перевіряємо, чи є такий користувач у БД
        const existingUser = await db.user.findUnique({
          where: { email: user.email! },
        })

        if (!existingUser) {
          // Створюємо нового користувача
          await db.user.create({
            data: {
              email: user.email,
              name: user.name,
              image: user.image,
              role: 'student',
            },
          })
        } else {
          // Оновлюємо дані (ім'я, аватарку)
          await db.user.update({
            where: { email: user.email! },
            data: {
              name: user.name,
              image: user.image,
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
        // Перший логін — дістаємо роль з БД
        try {
          const dbUser = await db.user.findUnique({
            where: { email: user.email! },
          })
          if (dbUser) {
            token.sub = dbUser.id
            token.role = dbUser.role
          }
        } catch (e) {
          console.error('Error fetching user role:', e)
          token.role = 'student'
        }
      }
      return token
    },

    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.sub as string
        // @ts-ignore
        session.user.role = (token.role as string) || 'student'
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
