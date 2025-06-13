import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // هنا لازم تضيف كود التحقق من المستخدم في قاعدة بياناتك
        // لو صح رجع بيانات المستخدم، لو غلط رجع null

        const { email, password } = credentials;

        // مثال بسيط: لو الايميل والباسورد صح ارجع object مستخدم وهمي
        if (email === "user@example.com" && password === "123456") {
          return { id: 1, name: "Mano", email: "user@example.com" };
        }
        return null; // يعني فشل في تسجيل الدخول
      },
    }),
  ],

  session: {
    strategy: "jwt",
  },

  jwt: {
    secret: process.env.NEXTAUTH_SECRET, // خلي عندك متغير بيئي اسمه ده
  },

  pages: {
    signIn: "/login", // صفحة تسجيل الدخول عندك
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };