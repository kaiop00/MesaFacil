import { useAuth } from "@/contexts/AuthContext";

const DashboardPage = () => {
  const { role } = useAuth();
  return (
    <>
      {role === "user" && <h1>HomePage user</h1>}
      {role === "admin" && <h1>HomePage admin</h1>}
    </>
  )
}

export default DashboardPage;