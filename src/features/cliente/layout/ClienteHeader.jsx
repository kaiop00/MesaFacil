import { useState } from "react";
import { HamburgerMd, CloseLg } from "react-coolicons";
import SelectIdioma from "../components/SelectIdicoma";


export default function ClienteHeader() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <header className="flex items-center justify-between px-4 py-3 shadow-sm bg-white">
            {/* Logo */}
            <img src="src/assets/react.svg" alt="Logo" className="h-10 w-10" />

            {/* Idioma */}
           <SelectIdioma />

            {/* Botão menu */}
            <button onClick={() => setIsOpen(!isOpen)} className="md:hidden">
                {isOpen ? <CloseLg size={24} /> : <HamburgerMd size={24} />}
            </button>
        </header>
    );
}
