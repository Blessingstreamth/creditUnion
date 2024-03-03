"use client";

import Link from "next/link";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginForm(): JSX.Element {

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const router = useRouter()

    const handleSubmit = async (e: any) => {
        e.preventDefault();

        try {
            const res:  any= await signIn("credentials", {
                email,
                password,
                redirect: false,
            })
            
            if (res.error) {
                setError("Invalid Credentials")
                return
            }
            
            router.replace("dashboard")
        } catch (error) {
            console.log(error)
        }
    }

    return <div className="grid place-items-center h-screen">
        <div className="shadow-lg p-5 rounded-lg border-t-4 border-blue-400">
        <h1 className="text-xl font-bold my-4">Login</h1>

        <form onSubmit={handleSubmit} className="flex-col gap-3">
            <input onChange={(e) => setEmail(e.target.value)} className="" type="text" placeholder="Email" /><br />
            <input onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" /><br />
            <button className="bg-blue-600 text-white font-bold curs-pointer px-6 py-2 rounded-lg">Login</button>

            {error && (
            <div className="bg-red-500 text-white w-fit text-sm py-1 px-3 rounded-sm mt-2">
                {error}
            </div>
            )}
            <br />
            <Link className="text-right text-sm mt-3" href={'/register'}>
                Dont have an account?<span className="underline">Register</span>
            </Link>
        </form>
        </div>    
    </div>
}