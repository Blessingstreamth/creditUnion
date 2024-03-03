import { connectMongooseDB } from "@/lib/mongodb";
import User from "@/model/user";
import { NextResponse } from "next/server";


export async function POST(req: Request) {
    try {
        await connectMongooseDB();
        const {email} = await req.json();
        const user = await User.findOne({email}).select("_id");
        console.log("user: ", user);
        return NextResponse.json({ user });
    } catch (error) {
        console.log(error);
    }
}