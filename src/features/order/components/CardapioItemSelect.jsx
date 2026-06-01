import { Fragment, useState, useMemo } from "react";
import { Combobox, Transition } from "@headlessui/react";
import { Check, ChevronDown } from "react-coolicons";
import { useTranslation } from "react-i18next";

export default function CardapioItemSelect({
    items,
    selectedItemId,
    setSelectedItemId,
}) {
    const { t } = useTranslation('order');
    const [query, setQuery] = useState("");

    // ✅ useMemo para filtrar apenas quando necessário
    const filteredItems = useMemo(() => {
        if (query === "") return items.slice(0, 50); // limite para prevenir lista grande
        const lowerQuery = query.toLowerCase();
        return items
            .filter((item) =>
                item.nome.toLowerCase().includes(lowerQuery)
            )
            .slice(0, 50); // limite máximo de resultados
    }, [items, query]);

    return (
        <Combobox value={selectedItemId} onChange={setSelectedItemId}>
            <div className="relative w-full">
                <div className="relative w-full cursor-default overflow-hidden rounded-md border border-gray-300 bg-white text-left shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-dynamic focus:border-primary-dynamic sm:text-sm">
                    <Combobox.Input
                        className="w-full border-none py-2 pl-3 pr-10 leading-5 text-gray-900 focus:ring-0"
                        displayValue={(id) =>
                            items.find((i) => i.id === id)?.nome || ""
                        }
                        placeholder={t('modals.addItems.searchItems')}
                        onChange={(event) => setQuery(event.target.value)}
                    />
                    <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                        <ChevronDown className="h-5 w-5 text-gray-400 cursor-pointer" />
                    </Combobox.Button>
                </div>

                <Transition
                    as={Fragment}
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                    afterLeave={() => setQuery("")}
                >
                    <Combobox.Options className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                        {filteredItems.length === 0 && query !== "" ? (
                            <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                                {t('modals.addItems.noItems')}
                            </div>
                        ) : (
                            filteredItems.map((item) => (
                                <Combobox.Option
                                    key={item.id}
                                    value={item.id}
                                    className={({ active }) =>
                                        `relative cursor-default select-none py-2 pl-10 pr-4 ${active
                                            ? "bg-primary-dynamic text-white"
                                            : "text-gray-900"
                                        }`
                                    }
                                >
                                    {({ selected, active }) => (
                                        <>
                                            <span
                                                className={`block truncate ${selected ? "font-medium" : "font-normal"
                                                    }`}
                                            >
                                                {item.nome} - R$ {Number(item.price).toFixed(2)}
                                            </span>
                                            {selected ? (
                                                <span
                                                    className={`absolute inset-y-0 left-0 flex items-center pl-3 ${active
                                                            ? "text-white"
                                                            : "text-primary-dynamic"
                                                        }`}
                                                >
                                                    <Check className="h-5 w-5" />
                                                </span>
                                            ) : null}
                                        </>
                                    )}
                                </Combobox.Option>
                            ))
                        )}
                    </Combobox.Options>
                </Transition>
            </div>
        </Combobox>
    );
}
