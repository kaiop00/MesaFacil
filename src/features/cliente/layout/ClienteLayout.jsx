import CardapioClienteProvider from "../context/CardapioClienteContext";
import CarrinhoProvider from "../context/CarrinhoContext";
import { ClienteProvider } from "../context/ClienteContext";
import CarrinhoFooter from "./CarrinhoFooter";
import ClienteBanner from "./ClienteBanner";
import ClienteHeader from "./ClienteHeader";

export default function ClienteLayout({ children }) {
    return (
        <ClienteProvider>
            <CardapioClienteProvider>
                <CarrinhoProvider>
                    <main className="min-h-screen">
                        <ClienteHeader />
                        <ClienteBanner />
                        {children}
                        <CarrinhoFooter />
                    </main>
                </CarrinhoProvider>
            </CardapioClienteProvider>
        </ClienteProvider>
    );
}