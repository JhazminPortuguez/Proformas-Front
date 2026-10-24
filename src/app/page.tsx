import { redirect } from "next/navigation";

/**
 * La raíz nunca se renderiza: el proxy manda a /dashboard o /login según la
 * cookie, y este redirect cubre el caso de una navegación directa.
 */
export default function Home() {
  redirect("/dashboard");
}
