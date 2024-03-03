"use client";

import Link from "next/link";
import { useRouter } from "next/navigation"; 
import { useState } from "react";


export default function RegisterForm(): JSX.Element {
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")

    const router = useRouter()

    const handleSubmit: any = async (e: any) => {
        e.preventDefault();

        if (!name || !email || !password) {
            setError("All fields are necessary");
            return;
        }

        try {
            const resUserExists = await fetch('api/userExists', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email })
            })

            const { user } = await resUserExists.json()

            if (user) {
                setError("User already exists.")
                return
            }

            const res = await fetch('api/register', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name, email, password
                })
            })

            if (res.ok){
                const form = e.target
                form.reset()
                router.push("/")
            } else {
                console.log("User registation failed.")
            }
        } catch (error) {
            console.log("Error during registation.", error)
        }
    };
    
    console.log("Name: ", email);


    return <div className="grid place-items-center h-screen">
        <div className="shadow-lg p-5 rounded-lg border-t-4 border-blue-400">
        <h1 className="text-xl font-bold my-4">Register</h1>
            <form onSubmit={handleSubmit} className="flex-col gap-3">
                <input onChange={(e) => setName(e.target.value)} type="text" placeholder="Full name" /><br />
                <input onChange={(e) => setEmail(e.target.value)} type="text" placeholder="Email" /><br />
                <input onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" /><br />
                <button className="bg-blue-600 text-white font-bold curs-pointer px-6 py-2 rounded-lg">Register</button>
                <br />
                {error && (
                <div className="bg-red-500 text-white w-fit text-sm py-1 px-3 rounded-sm mt-2">
                {error}
                </div>
                )}
                <Link className="text-right text-sm mt-3" href={'/'}>
                Already have an account?<span className="underline">Login</span>
                </Link>
            </form>
        </div>
    </div>
}
