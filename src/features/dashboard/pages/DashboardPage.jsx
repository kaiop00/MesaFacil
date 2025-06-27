import { AplicaCorDoSistema } from "@/components/AplicaCorDoSistema";
import { useAuth } from "@/contexts/AuthContext";

const DashboardPage = () => {
  const { role } = useAuth();

  return (
    <>
      <AplicaCorDoSistema />

      {role === "user" && <h1>HomePage user</h1>}
      {role === "admin" && <h1>HomePage admin</h1>}

      <button className="bg-primary-dynamic text-white p-4 rounded">
        Teste de Cor
      </button>
    </>
  );
};

export default DashboardPage;
