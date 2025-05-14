import React from "react";
import { useFirebaseTest } from "@/hooks/useFirebaseTest";

const FirebaseTestPage = () => {
  const { data, loading } = useFirebaseTest();

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-6">
        Teste de Conexão com Firebase
      </h1>

      {loading ? (
        <p className="text-center text-lg text-gray-500">Carregando dados...</p>
      ) : (
        <>
          {data.length === 0 ? (
            <p className="text-center text-lg text-red-500">
              Nenhum dado encontrado.
            </p>
          ) : (
            <ul className="space-y-4">
              {data.map((item) => (
                <li
                  key={item.id}
                  className="p-4 border border-gray-200 rounded-lg shadow-sm bg-white"
                >
                  <pre className="text-sm text-gray-700">
                    {JSON.stringify(item, null, 2)}
                  </pre>
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
