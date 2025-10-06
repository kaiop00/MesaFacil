import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthInputGroup from "@/features/auth/components/AuthInputGroup";
import { registerWithEmail } from "@/services/firebase/authService";
import { translateFirebaseError } from "@/utils/firebaseErrorTranslator";
import { useToast } from "@/hooks/useToast";
import mesafacil from '@/assets/mesafacil.png';
import confirmacao from '@/assets/images/signup/confirmacao.png';
import LoadingSpinner from "@/components/LoadingSpinner";

export default function CadastroFormSection() {
    const [nome, setNome] = useState("");
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [mostrarSenha, setMostrarSenha] = useState(false);
    const [registrationSuccess, setRegistrationSuccess] = useState(false);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const { notify } = useToast();
    const [idRestaurante, setIdRestaurante] = useState(null);

    const handleCadastro = async () => {
        if (!nome || !email || !senha) {
            notify("Preencha todos os campos", "error");
            return;
        }

        setLoading(true);
        try {
            const { user, idRestaurante } = await registerWithEmail(email, senha, nome);

            if (!idRestaurante) {
                throw new Error("Falha ao associar restaurante.");
            }

            setIdRestaurante(idRestaurante);

            setRegistrationSuccess(true);
        } catch (error) {
            notify(translateFirebaseError(error), "error");
            setLoading(false);
        }
    };

    if (registrationSuccess) {
        return (
            <div className="w-full max-w-md px-8 py-12 mx-auto flex flex-col justify-center flex-grow">
                <div className="flex justify-center">
                    <img src={mesafacil} alt="logo" className="w-50" />
                </div>

                <div className="text-center mt-8">
                    <img src={confirmacao} alt="Sucesso" className="mx-auto max-w-40 mb-6" />
                    <h2 className="text-2xl font-semibold text-green-600 mb-4">Cadastro Realizado com Sucesso!</h2>
                    <p className="text-gray-600 mb-8">
                        Clique no botão abaixo para acessar o painel do sistema. Bem-vindo!
                    </p>
                    <button
                      onClick={() => {
                        navigate('/home', {state : { idRestaurante } });
                        window.location.reload();
                      }}
                        className="w-full h-[44px] bg-[#F8912E] text-white rounded font-semibold font-inter transition hover:bg-orange-600"
                    >
                        Ir para o painel
                    </button>
                </div>

                <footer className="text-xs text-gray-400 text-center py-4 mt-12">
                    &copy; Copyright 2025 MesaFácil
                </footer>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md px-8 py-12 mx-auto flex flex-col justify-center flex-grow">
            <div className="flex justify-center">
                <img src={mesafacil} alt="logo" className="w-50" />
            </div>

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
                className="w-full h-[44px] bg-[#F8912E] text-white rounded font-semibold font-inter transition mt-6 flex justify-center items-center cursor-pointer hover:bg-orange-600"
                disabled={loading}
            >
                {loading ? <LoadingSpinner /> : <span>Confirmar</span>}
            </button>

            <Link
                to="/login"
                className="w-full block text-center text-[#F8912E] py-2 rounded font-medium font-inter hover:underline hover:decoration-[#D9A23B] mt-4"
            >
                &lt; Voltar ao Login
            </Link>

            <footer className="text-xs text-gray-400 text-center py-4 mt-8">
                &copy; Copyright 2025 MesaFácil
            </footer>
        </div>
    );
}
