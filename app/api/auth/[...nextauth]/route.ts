import { Session } from "inspector";
import { RequestInternal, Awaitable } from "next-auth";
import NextAuth from "next-auth/next";
import CredentialsProvider from "next-auth/providers/credentials";
import { signIn } from "next-auth/react";
import { pages } from "next/dist/build/templates/app-page";
import { Provider } from "next-auth/providers/index";
import { connectMongooseDB } from "@/lib/mongodb";
import User from "@/model/user";
import bcrypt from 'bcryptjs'

export const authOptions: any = {
    providers: [
        CredentialsProvider({
            name: "credentials",
            credentials: {},

            async authorize(credentials) {
                const {email, password} = credentials
                
                try {
                    await connectMongooseDB()
                    const user = await User.findOne({ email })

                    if (!user) {
                        return null
                    }

                    const passwordMatch = await bcrypt.compare(password, user.password)

                    if (!passwordMatch) {
                        return null
                    }

                    return user
                } catch (error) {
                    console.log("Error, error")
                }
            },
        }),
    ],
    session: {
        strategy: "jwt",
    },
    secret: process.env.NEXTAUTH_SECRET,
    pages: {
        signIn : "/"
    },
};

const handler = NextAuth(authOptions);

export {handler as GET, handler as POST};