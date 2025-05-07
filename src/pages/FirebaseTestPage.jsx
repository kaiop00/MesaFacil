import React from "react";
import { useFirebaseTest } from "@/hooks/useFirebaseTest";

const FirebaseTestPage = () => {
  const { data, loading } = useFirebaseTest();

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Teste de Conexão com Firebase</h1>

      {loading ? (
        <p>Carregando dados...</p>
      ) : (
        <>
          {data.length === 0 ? (
            <p>Nenhum dado encontrado.</p>
          ) : (
            <ul>
              {data.map((item) => (
                <li key={item.id}>
                  <pre>{JSON.stringify(item, null, 2)}</pre>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
};

export default FirebaseTestPage;
