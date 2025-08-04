export default function SelectIdioma() {
    return (
        <div className="flex items-center gap-2 border rounded-full px-3 py-1">
            <img
                src="https://flagcdn.com/w40/br.png"
                alt="PT-BR"
                className="h-4 w-6 object-cover rounded-sm"
            />
            <span className="text-sm font-medium">PT - BR</span>
            <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
        </div>
    )
}