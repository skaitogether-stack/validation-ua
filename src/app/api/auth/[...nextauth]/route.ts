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
        role: { label: "Role", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null
        
        const email = credentials.email.toLowerCase()
        const role = credentials.role || 'student'
        const name = credentials.name || (role === 'teacher' ? 'Вчитель' : 'Учень')

        try {
          let dbUser = await db.user.findUnique({
            where: { email },
          })

          if (!dbUser) {
            dbUser = await db.user.create({
              data: {
                email,
                name,
                role,
              },
            })
          } else {
            // Оновлюємо роль якщо входимо через відповідну кнопку швидкого входу
            dbUser = await db.user.update({
              where: { email },
              data: { role },
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
        token.sub = user.id
        // @ts-ignore
        token.role = user.role || 'student'
      }
      return token
    },

    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.sub as string
        
        // Завжди дістаємо свіжу роль з БД для підтримки миттєвого перемикання
        try {
          const dbUser = await db.user.findUnique({
            where: { id: token.sub as string },
          })
          if (dbUser) {
            // @ts-ignore
            session.user.role = dbUser.role
          } else {
            // @ts-ignore
            session.user.role = (token.role as string) || 'student'
          }
        } catch (e) {
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
