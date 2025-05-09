export default function LoginFormSection({
    email,
    senha,
    mostrarSenha,
    erro,
    setEmail,
    setSenha,
    setMostrarSenha,
    handleLogin,
    navigate,
    loading,
}) {
    return (
        <div className="w-full md:w-[30%] flex flex-col justify-between bg-white min-h-screen">
            <div className="w-full max-w-md px-8 py-12 mx-auto flex flex-col justify-center flex-grow">
                <h1 className="text-[36px] font-inter font-extrabold text-center mb-2">
                    <span className="text-[#010647]">Mesa</span>
                    <span className="text-[#D9A23B]">Fácil</span>
                </h1>

                <p className="text-[24px] text-center font-semibold text-[#010647] mt-4 mb-2 font-inter">Seja bem-vindo!</p>
                <p className="text-[15px] text-[#7F7F7F] text-center mb-15 font-inter">
                    Preencha seus dados para realizar o Login
                </p>

                <div className="space-y-2">
                    <label className="text-sm text-gray-700 block font-inter">E-mail</label>
                    <input
                        type="email"
                        className="w-full border border-gray-300 rounded px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-5"
                        placeholder="Digite seu e-mail"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />

                    <label className="text-sm text-gray-700 block font-inter">Senha</label>
                    <div className="relative">
                        <input
                            type={mostrarSenha ? "text" : "password"}
                            className="w-full border border-gray-300 rounded px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Digite sua senha"
                            value={senha}
                            onChange={(e) => setSenha(e.target.value)}
                        />
                        <button
                            type="button"
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm"
                            onClick={() => setMostrarSenha(!mostrarSenha)}
                        >
                            {mostrarSenha ? "👁️" : "👁️"}
                        </button>
                    </div>

                    {erro && <p className="text-red-500 text-sm">{erro}</p>}

                    <button
                        onClick={handleLogin}
                        className="w-full bg-[#D9A23B] text-white py-2 rounded font-semibold font-inter hover:bg-yellow-600 transition cursor-pointer mt-10 h-[44px]"
                    >
                        {loading ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span className="text-sm"></span>
                            </div>
                        ) : (
                            "Login"
                        )}
                    </button>

                    <button
                        onClick={() => navigate("/")}
                        className="w-full border border-[#D9A23B] text-[#D9A23B] py-2 rounded font-medium font-inter hover:bg-[#fdf6e8] transition cursor-pointer"
                    >
                        Cadastre-se
                    </button>

                    <div className="text-center">
                        <button
                            onClick={() => navigate("/")}
                            className="text-sm text-[#0149FD] hover:underline mt-4 cursor-pointer font-inter"
                        >
                            Esqueceu a senha?
                        </button>
                    </div>
                </div>
            </div>

            <footer className="text-xs text-gray-200 text-center py-4">
                © Copyright 2025 MesaFácil
            </footer>
        </div>
    );
}
