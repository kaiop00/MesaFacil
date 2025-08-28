import LoadingSpinner from "@/components/LoadingSpinner";

export default function CategoriaForm({
    value = "",
    onChange,
    onSubmit,
    loading = false,
    autoFocus = true,
}) {

    function handleSubmit(e) {
        e.preventDefault();
        const trimmed = (value || "").trim();
        if (!trimmed) return;
        onSubmit?.(trimmed);
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 mb-4">
            <div className="flex flex-col sm:flex-row gap-2">
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange?.(e.target.value)}
                    placeholder="Nome da categoria (ex: Massas)"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-dynamic focus:border-primary-dynamic"
                    autoFocus={autoFocus}
                />
                <button
                    type="submit"
                    disabled={loading || !value.trim()}
                    className="bg-primary-dynamic cursor-pointer text-white text-sm font-medium px-6 py-2 rounded transition min-w-[120px] flex items-center justify-center disabled:opacity-60"
                >
                    {loading ? <LoadingSpinner /> : "Adicionar"}
                </button>
            </div>
        </form>
    );
}