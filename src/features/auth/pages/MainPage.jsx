import loginBg from '@/assets/images/login/login-bg.jpg';
import logo from '@/assets/logo-white.png';
import mesafacil from '@/assets/mesafacil.png';
import { LogOut } from "react-coolicons"
import { Navigate, useNavigate } from "react-router-dom";

export default function MainPage() {

    const navigate = useNavigate();

    return (
        <div className="font-inter h-screen overflow-hidden relative">
            {/* Header fixo */}
            <header className="absolute top-0 left-0 w-full bg-white flex justify-between items-center px-8 py-4 z-20 shadow-md">
                <img src={mesafacil} alt="logo" className="w-40 sm:w-32" />

                <button className="bg-[#F8912E] text-white font-medium rounded px-4 py-2 hover:opacity-90 transition text-sm sm:text-base cursor-pointer" onClick={() => navigate("/login")}>
                    Acessar Sistema
                </button>
            </header>

            {/* Fundo com imagem e gradiente */}
            <div
                className="fixed inset-0 bg-cover bg-center z-0"
                style={{ backgroundImage: `url(${loginBg})` }}
            >
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/10 to-transparent z-10" />
            </div>

            {/* Logo e textos */}
            <div className="absolute bottom-36 md:bottom-24 left-1/2 md:left-24 transform -translate-x-1/2 md:translate-x-0 text-center md:text-left z-20 w-11/12 md:w-auto">
                <img src={logo} alt="Logo" className="mb-4 mx-auto md:mx-0 w-40 md:w-auto" />

                <h2 className="text-white text-lg md:text-xl lg:text-2xl font-semibold font-sora">
                    Uma solução completa para seu restaurante
                </h2>
                <p className="text-white text-sm md:text-base mt-2 font-sora">
                    Dashboards, Gerenciamento de Pedidos, Cardápio, Promoções e muito mais.
                </p>
            </div>

            {/* Botão inferior */}
            <div className="absolute bottom-12 lg:bottom-24 right-1/2 lg:right-24 transform lg:translate-x-0 translate-x-1/2 z-20">
                <button className="bg-white rounded-full flex items-center gap-2 px-8 py-5 shadow-md text-sm md:text-base cursor-pointer" onClick={() => navigate("/login")}>
                    <LogOut className="w-8 h-8 text-[#F89950]" />
                    <span className="text-[#1E293B]">Clique para Acessar</span>
                </button>
            </div>

        </div>
    );
}
