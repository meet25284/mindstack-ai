import connectDB from "./services/mongoConnect";

export async function register() {
  await connectDB();
}
