// NavFooter.jsx
import { NavLink, useResolvedPath } from "react-router-dom";
import { ListOrdered, Handbag, EditPencilLine01 } from "react-coolicons";
import { useCarrinho } from "../context/CarrinhoContext";

function Item({ to, label, icon, badge, end }) {
    const resolved = useResolvedPath(to);

    return (
        <NavLink
            to={resolved}
            end={end}
            className={({ isActive }) =>
                [
                    "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition",
                    isActive ? "text-[#D9A23B]" : "text-gray-600 hover:text-gray-800",
                ].join(" ")
            }
        >
            <div className="relative">
                {icon}
                {typeof badge === "number" && badge > 0 && (
                    <span className="absolute -top-1 -right-2 text-[10px] leading-none bg-red-500 text-white rounded-full px-1.5 py-0.5">
                        {badge > 99 ? "99+" : badge}
                    </span>
                )}
            </div>
            <span className="text-[11px] leading-none">{label}</span>
        </NavLink>
    );
}

export default function NavFooter() {
    const { quantidade } = useCarrinho();

    return (
        <nav
            className="
        fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur
        border-t border-gray-200 px-4 py-2
        flex items-center justify-center
        shadow-[0_-6px_20px_rgba(0,0,0,0.06)]
        z-40
      "
            aria-label="Navegação do cliente"
        >
            <div className="flex w-full max-w-md items-center justify-between">
                <Item
                    to="."
                    end
                    label="Cardápio"
                    icon={<EditPencilLine01 size={24} />}
                />
                <Item
                    to="sacola"
                    label="Sacola"
                    icon={<Handbag size={24} />}
                    badge={quantidade}
                />
                <Item
                    to="pedido"
                    label="Pedidos"
                    icon={<ListOrdered size={24} />}
                />
            </div>
        </nav>
    );
}
