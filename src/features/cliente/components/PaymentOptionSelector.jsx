const OPTIONS = [
    {
        id: "pix",
        title: "Pagar com Pix",
        description: "",
        accentClass: "border-[#10B981]",
        badge: "Pix",
    },
    {
        id: "garcom",
        title: "Chamar Garçom",
        description: "O garçom irá até sua mesa auxiliar no pagamento",
        accentClass: "border-[#D9A23B]",
        badge: "Garçom",
    },
];

const PaymentOptionSelector = ({
    selectedOption,
    onSelect,
    garcomDisabled,
    garcomSolicitado,
    showSelectionError,
}) => {
    return (
        <section className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Escolha uma das opções</h3>

            <div className="space-y-3">
                {OPTIONS.map((option) => {
                    const isSelected = selectedOption === option.id;
                    const disabled = option.id === "garcom" ? garcomDisabled : false;

                    const classes = [
                        "w-full",
                        "border",
                        "rounded-xl",
                        "p-4",
                        "flex",
                        "items-center",
                        "gap-3",
                        "transition",
                        "text-left",
                        option.id === "garcom" && garcomSolicitado ? "opacity-80" : "",
                    ].filter(Boolean);

                    if (isSelected) {
                        classes.push(option.id === "garcom" ? "bg-[#FDF0D8]" : "bg-[#ECFDF5]");
                        classes.push(option.accentClass);
                        classes.push("border-2");
                    } else {
                        classes.push("border-gray-200");
                        classes.push("hover:border-[#D9A23B]/60");
                    }

                    return (
                        <button
                            type="button"
                            key={option.id}
                            className={classes.join(" ")}
                            onClick={() => onSelect(option.id)}
                            disabled={disabled}
                        >
                            <span
                                className={`h-5 w-5 rounded-full border ${
                                    isSelected ? option.accentClass : "border-gray-300"
                                } flex items-center justify-center text-[10px] uppercase font-semibold`}
                            >
                                {isSelected ? "•" : ""}
                            </span>
                            <div className="flex-1">
                                <p className="font-semibold text-gray-900 text-sm">{option.title}</p>
                                {option.description && (
                                    <p className="text-xs text-gray-600 mt-1">{option.description}</p>
                                )}
                            </div>
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                                {option.badge}
                            </span>
                        </button>
                    );
                })}

                {showSelectionError && (
                    <p className="text-xs text-red-500">Selecione uma opção para continuar.</p>
                )}
            </div>
        </section>
    );
};

export default PaymentOptionSelector;
