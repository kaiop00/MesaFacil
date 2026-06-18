// NavFooter.jsx
import { NavLink, useLocation, useParams } from "react-router-dom";
import { ListOrdered, Handbag, EditPencilLine01 } from "react-coolicons";
import { useCarrinho } from "../context/CarrinhoContext";

function Item({ to, label, icon, badge, end }) {
    return (
        <NavLink
            to={to}
            end={end}
            className={({ isActive }) =>
                [
                    // MOBILE: mantém como estava
                    "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition",
                    // DESKTOP/TABLET: mais área de clique
                    "md:px-4 md:py-2 lg:px-5 lg:py-3",
                    isActive ? "text-[#D9A23B]" : "text-gray-600 hover:text-gray-800",
                    // foco acessível
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D9A23B]/40"
                ].join(" ")
            }
        >
            <div className="relative md:scale-110 lg:scale-125">
                {icon}
                {typeof badge === "number" && badge > 0 && (
                    <span
                        className="
              absolute -top-1 -right-2 text-[10px] leading-none bg-red-500 text-white rounded-full px-1.5 py-0.5
              md:-top-1.5 md:-right-2 md:text-[11px] md:px-2 md:py-0.5
            "
                    >
                        {badge > 99 ? "99+" : badge}
                    </span>
                )}
            </div>
            <span className="text-[11px] leading-none md:text-xs lg:text-sm">{label}</span>
        </NavLink>
    );
}

export default function NavFooter() {
    const location = useLocation();
    const { slug } = useParams();
    const { quantidade } = useCarrinho();

    const basePath = slug ? `/mesa/${slug}` : "/mesa";
    const search = location.search || "";
    const cardapioTo = { pathname: basePath, search };
    const sacolaTo = { pathname: `${basePath}/sacola`, search };
    const pedidoTo = { pathname: `${basePath}/pedido`, search };

    return (
        <nav
            className="
        fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur
        border-t border-gray-200 px-4 py-2
        flex items-center justify-center
        shadow-[0_-6px_20px_rgba(0,0,0,0.06)]
        z-40

        /* TABLET/DESKTOP: flutuante e centralizada */
        md:bottom-4 md:left-1/2 md:-translate-x-1/2 md:w-auto md:px-3 md:py-3
        md:rounded-2xl md:border md:shadow-lg md:border-gray-200 md:bg-white/90
      "
            aria-label="Navegação do cliente"
        >
            <div
                className="
          flex w-full max-w-md items-center justify-between
          md:max-w-none md:w-auto md:gap-6
          lg:gap-10
        "
            >
                <Item
                    to={cardapioTo}
                    end
                    label="Cardápio"
                    icon={<EditPencilLine01 size={24} />}
                />
                <Item
                    to={sacolaTo}
                    label="Sacola"
                    icon={<Handbag size={24} />}
                    badge={quantidade}
                />
                <Item
                    to={pedidoTo}
                    label="Pedidos"
                    icon={<ListOrdered size={24} />}
                />
            </div>
        </nav>
    );
}
