import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthInputGroup from "@/features/auth/components/AuthInputGroup";
import { loginWithEmail } from "@/services/firebase/authService";
import { translateFirebaseError } from "@/utils/firebaseErrorTranslator";
import { useToast } from "@/hooks/useToast";
import mesafacil from '@/assets/mesafacil.png';

export default function LoginFormSection() {
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [mostrarSenha, setMostrarSenha] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { notify } = useToast();
    

    const handleLogin = async () => {
        if (!email.trim() || !senha.trim()) {
            notify("Preencha todos os campos", "error");
            return;
        }

        setLoading(true);
        try {
            await loginWithEmail(email, senha);
            notify("Usuário logado!", "success");
            navigate("/home");
        } catch (error) {
            notify(translateFirebaseError(error), "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md px-8 py-12 mx-auto flex flex-col justify-center flex-grow">
            <div class="flex justify-center">
                <img src={mesafacil} alt="logo" className="w-50" />
            </div>
            <p className="text-[24px] text-center font-semibold text-[#010647] mt-4 mb-2 font-inter">Seja bem-vindo!</p>
            <p className="text-[15px] text-[#7F7F7F] text-center mb-8 font-inter">Preencha seus dados para realizar o Login</p>

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
                onClick={handleLogin}
                className="w-full h-[44px] bg-[#F8912E] text-white rounded font-semibold font-inter  transition mt-6 flex justify-center items-center cursor-pointer"
                disabled={loading}
            >
                {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                    <span>Login</span>
                )}
            </button>

            <button
                onClick={() => navigate("/cadastro")}
                className="w-full border border-[#D9A23B] text-[#D9A23B] py-2 rounded font-medium font-inter hover:bg-[#fdf6e8] transition mt-4 cursor-pointer"
                disabled={loading}
            >
                Cadastre-se
            </button>

            <button onClick={() => navigate("/recuperar-senha")} className="text-sm text-[#0149FD] hover:underline mt-4 font-inter" disabled={loading}>Esqueceu a senha?</button>

            <footer className="text-xs text-gray-200 text-center py-4 mt-8">© Copyright 2025 MesaFácil</footer>
        </div>
    );
}
