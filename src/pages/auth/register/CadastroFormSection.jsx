import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthInputGroup from "../components/AuthInputGroup";
import { registerWithEmail } from "../../../services/firebase/authService";
import { translateFirebaseError } from "../../../utils/firebaseErrorTranslator";

export default function CadastroFormSection() {
    const [nome, setNome] = useState("");
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [mostrarSenha, setMostrarSenha] = useState(false);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);


    const handleCadastro = async () => {
        if (!nome || !email || !senha) {
            alert("Preencha todos os campos.");
            return;
        }
        setLoading(true);
        try {
            await registerWithEmail(email, senha, nome);
            alert("usuario cadastrado com sucesso");
            navigate("/login");
        } catch (error) {
            alert(translateFirebaseError(error));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md px-8 py-12 mx-auto flex flex-col justify-center flex-grow">
            <h1 className="text-[36px] font-extrabold text-center mb-2 font-inter">
                <span className="text-[#010647]">Mesa</span>
                <span className="text-[#D9A23B]">Fácil</span>
            </h1>
            <p className="text-[24px] text-center font-semibold text-[#010647] mt-4 mb-2 font-inter">Seja bem-vindo!</p>
            <p className="text-[15px] text-[#7F7F7F] text-center mb-8 font-inter">Preencha seus dados para realizar o cadastro</p>

            <AuthInputGroup label="Nome do Restaurante" value={nome} onChange={e => setNome(e.target.value)} placeholder="Digite o nome" />
            <AuthInputGroup label="E-mail" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Digite seu e-mail" />
            <AuthInputGroup
                label="Senha"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="Digite sua senha"
                showToggle
                mostrarSenha={mostrarSenha}
                setMostrarSenha={setMostrarSenha}
            />

            <button
                onClick={handleCadastro}
                className="w-full h-[44px] bg-[#D9A23B] text-white rounded font-semibold font-inter hover:bg-yellow-600 transition mt-6 flex justify-center items-center"
                disabled={loading}
            >
                {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                    <span>Confirmar</span>
                )}
            </button>


            <Link
                to="/login"
                className="w-full block text-center text-[#D9A23B] py-2 rounded font-medium font-inter hover:underline hover:decoration-[#D9A23B] mt-4"
            >
                &lt; Voltar ao Login
            </Link>

            <footer className="text-xs text-gray-200 text-center py-4 mt-8">© Copyright 2025 MesaFácil</footer>
        </div>
    );
}
