
import SelectIdioma from "../components/SelectIdicoma";
import Logo from "../../../assets/logo.png"



export default function ClienteHeader() {
    return (
        <header className="flex items-center justify-between px-4 py-3 shadow-sm bg-white">
            {/* Logo */}
            <img src={Logo} alt="Logo" className="h-10 w-10" />

            {/* Idioma */}
            <SelectIdioma />
        </header>
    );
}
