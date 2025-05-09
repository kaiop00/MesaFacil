import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginWithEmail } from "../../services/firebase/authService";
import { translateFirebaseError } from '../../utils/firebaseErrorTranslator';
import LoginFormSection from './components/LoginFormSection';
import LoginVisualSection from './components/LoginVisualSection';

export default function Login() {
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [mostrarSenha, setMostrarSenha] = useState(false);
    const [erro, setErro] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async () => {
        if (!email.trim() || !senha.trim()) {
            alert("Por favor, preencha todos os campos.");
            return;
        }
        
        setLoading(true);

        try {
            await loginWithEmail(email, senha);
            alert('usuario logado');
        } catch (error) {
            const mensagem = translateFirebaseError(error);
            alert(mensagem);
        } finally{
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            <LoginFormSection
                email={email}
                senha={senha}
                mostrarSenha={mostrarSenha}
                erro={erro}
                setEmail={setEmail}
                setSenha={setSenha}
                setMostrarSenha={setMostrarSenha}
                handleLogin={handleLogin}
                navigate={navigate}
                loading={loading}
            />
            <LoginVisualSection />
        </div>
    );
}