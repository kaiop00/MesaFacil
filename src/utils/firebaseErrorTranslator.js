const firebaseErrorMessages = {
    "auth/user-not-found": "Usuário não encontrado.",
    "auth/wrong-password": "Senha incorreta.",
    "auth/invalid-email": "E-mail inválido.",
    "auth/email-already-in-use": "Este e-mail já está em uso.",
    "auth/weak-password": "A senha deve conter no mínimo 6 caracteres.",
    "auth/too-many-requests": "Muitas tentativas. Tente novamente mais tarde.",
    "auth/network-request-failed": "Erro de conexão. Verifique sua internet.",
    "auth/invalid-credential": "Credenciais inválidas. Verifique seu e-mail e senha.",
};

export function translateFirebaseError(error) {
    if (!error?.code) return "Ocorreu um erro inesperado.";
    return firebaseErrorMessages[error.code] || "Erro desconhecido: " + error.code;
}
