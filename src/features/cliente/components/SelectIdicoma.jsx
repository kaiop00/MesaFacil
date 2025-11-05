import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";

export default function SelectIdioma() {
    const { t, i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const changeLanguage = (lng) => {
        i18n.changeLanguage(lng);
        localStorage.setItem('language', lng);
        setIsOpen(false);
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const currentLanguage = i18n.language || 'pt-BR';
    const isPortuguese = currentLanguage === 'pt-BR';
    const isEnglish = currentLanguage === 'en';
    const isSpanish = currentLanguage === 'es';
    const isItalian = currentLanguage === 'it';
    const isFrench = currentLanguage === 'fr';

    const getLanguageFlag = () => {
        if (isPortuguese) return "🇧🇷";
        if (isEnglish) return "🇺🇸";
        if (isSpanish) return "🇪🇸";
        if (isItalian) return "🇮🇹";
        if (isFrench) return "🇫🇷";
        return "🇧🇷";
    };

    const getLanguageLabel = () => {
        if (isPortuguese) return "PT-BR";
        if (isEnglish) return "EN";
        if (isSpanish) return "ES";
        if (isItalian) return "IT";
        if (isFrench) return "FR";
        return "PT-BR";
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 border rounded-full px-3 py-1 hover:bg-gray-50 transition-colors"
            >
                <span className="text-xl">
                    {getLanguageFlag()}
                </span>
                <span className="text-sm font-medium">
                    {getLanguageLabel()}
                </span>
                <svg
                    className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg py-1 border z-50">
                    <button
                        onClick={() => changeLanguage("pt-BR")}
                        className={`flex items-center w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                            isPortuguese ? "bg-gray-100 font-semibold text-gray-900" : "text-gray-700"
                        }`}
                    >
                        <span className="mr-2 text-lg">🇧🇷</span>
                        {t("common:languages.pt-BR")}
                    </button>
                    <button
                        onClick={() => changeLanguage("en")}
                        className={`flex items-center w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                            isEnglish ? "bg-gray-100 font-semibold text-gray-900" : "text-gray-700"
                        }`}
                    >
                        <span className="mr-2 text-lg">🇺🇸</span>
                        {t("common:languages.en")}
                    </button>
                    <button
                        onClick={() => changeLanguage("es")}
                        className={`flex items-center w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                            isSpanish ? "bg-gray-100 font-semibold text-gray-900" : "text-gray-700"
                        }`}
                    >
                        <span className="mr-2 text-lg">🇪🇸</span>
                        {t("common:languages.es")}
                    </button>
                    <button
                        onClick={() => changeLanguage("it")}
                        className={`flex items-center w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                            isItalian ? "bg-gray-100 font-semibold text-gray-900" : "text-gray-700"
                        }`}
                    >
                        <span className="mr-2 text-lg">🇮🇹</span>
                        {t("common:languages.it")}
                    </button>
                    <button
                        onClick={() => changeLanguage("fr")}
                        className={`flex items-center w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                            isFrench ? "bg-gray-100 font-semibold text-gray-900" : "text-gray-700"
                        }`}
                    >
                        <span className="mr-2 text-lg">🇫🇷</span>
                        {t("common:languages.fr")}
                    </button>
                </div>
            )}
        </div>
    );
}