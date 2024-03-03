import { connectMongooseDB } from "@/lib/mongodb";
import User from "@/model/user";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
    try {
        const {name ,email ,password} = await req.json();
        const hashedPassword = await bcrypt.hash(password, 10)
        await connectMongooseDB();
        await User.create({name, email, password: hashedPassword})

        return NextResponse.json({message: "User registered."}, 
        {status:201});
    } catch (error) {
        return NextResponse.json({message: "An error occurred while register the user"},
        {status: 500})
    }
    
}