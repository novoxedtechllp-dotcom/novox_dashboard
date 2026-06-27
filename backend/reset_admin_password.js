import "dotenv/config";
import bcrypt from "bcrypt";
import { supabase } from "./src/config/supabase.js";

async function resetPassword() {
  const email = "admin@novox.com";
  const newPassword = "admin@novox";
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const { data, error } = await supabase
    .from("users")
    .update({ password_hash: hashedPassword })
    .eq("email", email);

  if (error) {
    console.error("Failed to reset password:", error);
  } else {
    console.log("Successfully reset password for", email, "to", newPassword);
  }
}
resetPassword();
