import { redirect } from "next/navigation";

/** Legacy URL — single compare experience at /compare */
export default function Compare2Redirect() {
  redirect("/compare");
}
