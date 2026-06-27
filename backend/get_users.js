import "dotenv/config";
import { supabase } from "./src/config/supabase.js";

async function run() {
  const { data, error } = await supabase.from("users").select("email, role");
  if (error) console.error(error);
  else console.log(data);
}
run();
