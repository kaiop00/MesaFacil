import { ClienteProvider } from "../context/ClienteContext";

export default function ClienteLayout({ children }) {
    return (
        <ClienteProvider>
            <main className="min-h-screen">
                {children}
            </main>
        </ClienteProvider>
    );
}