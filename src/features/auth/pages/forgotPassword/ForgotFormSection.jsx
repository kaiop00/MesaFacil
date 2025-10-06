import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthInputGroup from "@/features/auth/components/AuthInputGroup";
import { resetPassword } from "@/services/firebase/authService";
import { ChevronLeft } from "react-coolicons";
import { useToast } from "@/hooks/useToast";
import mesafacil from '@/assets/mesafacil.png';
import LoadingSpinner from "@/components/LoadingSpinner";

export default function ForgotFormSection() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { notify } = useToast();

    const handleForgot = async () => {
        if (!email) {
            notify("Informe um e-mail válido", "error");
            return;
        }

        setLoading(true);
        try {
            await resetPassword(email);
            notify("Um e-mail foi enviado com as instruções para redefinir sua senha", "success");
            navigate("/login");
        } catch (error) {
            console.error(error);
            if (error.code === "auth/user-not-found") {
                notify("Nenhuma conta encontrada com este email", "error");
            } else if (error.code === "auth/invalid-email") {
                notify("E-mail inválido", "error");
            } else {
                notify("Erro ao enviar o e-mail. tente novamente", "error");
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="w-full max-w-md px-8 py-12 mx-auto flex flex-col justify-center flex-grow">
            <div class="flex justify-center">
                <img src={mesafacil} alt="logo" className="w-50" />
            </div>
            <p className="text-[24px] text-center font-semibold text-[#010647] mt-4 mb-2 font-inter">Esqueceu a senha?</p>
            <p className="text-[15px] text-[#7F7F7F] text-center mb-8 font-inter">Sem problema, siga o passo a passo para ajudarmos a redefinir sua senha, informe seu e-mail</p>

            <AuthInputGroup label="E-mail" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Digite seu e-mail" />

            <button
                onClick={handleForgot}
                className="w-full h-[44px] bg-[#F8912E] text-white rounded font-semibold font-inter transition mt-6 flex justify-center items-center cursor-pointer"
                disabled={loading}
            >
                {loading ? (
                    <LoadingSpinner/>
                ) : (
                    <span>Enviar</span>
                )}
            </button>

            <Link
                to="/login"
                className="w-full flex items-center justify-center gap-1 text-[#F8912E] py-2 rounded font-medium font-inter hover:underline hover:decoration-[#D9A23B] mt-4"
            >
                <ChevronLeft size={16} /> Voltar ao Login
            </Link>

            <footer className="relative bottom-0 text-xs text-gray-200 text-center">© Copyright 2025 MesaFácil</footer>

        </div>
    );

} 