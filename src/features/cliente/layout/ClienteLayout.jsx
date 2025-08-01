import { ClienteProvider } from "../context/ClienteContext";
import ClienteBanner from "./ClienteBanner";
import ClienteHeader from "./ClienteHeader";

export default function ClienteLayout({ children }) {
    return (
        <ClienteProvider>
            <main className="min-h-screen">
                <ClienteHeader />
                <ClienteBanner />
                {children}
            </main>
        </ClienteProvider>
    );
}