// ClienteLayout.jsx
import { Outlet } from "react-router-dom";
import CardapioClienteProvider from "../context/CardapioClienteContext";
import CarrinhoProvider from "../context/CarrinhoContext";
import { ClienteProvider } from "../context/ClienteContext";
// import CarrinhoFooter from "./CarrinhoFooter";  // REMOVER
import ClienteBanner from "./ClienteBanner";
import ClienteHeader from "./ClienteHeader";
import NavFooter from "./NavFooter";

export default function ClienteLayout() {
    return (
        <ClienteProvider>
            <CardapioClienteProvider>
                <CarrinhoProvider>
                    <main className="min-h-screen pb-24">
                        <ClienteHeader />
                        {/* <ClienteBanner /> */}
                        <Outlet />
                        <NavFooter />
                    </main>
                </CarrinhoProvider>
            </CardapioClienteProvider>
        </ClienteProvider>
    );
}
