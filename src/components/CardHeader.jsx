import { AddPlusCircle } from "react-coolicons";

const CardHeader = ({ title, subtitle, onNewClick, showButton = true }) => {
  return (
    <div
      className="
      flex flex-col sm:flex-row        /* coluna no mobile, linha em sm+ */ 
      items-center justify-between    /* alinhar conteúdo */
      bg-white rounded-lg shadow      
      p-10 sm:p-6                      /* padding responsivo */ 
      gap-4                          /* espaçamento entre title e button */
    "
    >
      {/* Título e subtítulo */}
      <div className="text-center sm:text-left">
        <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
        <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
      </div>

      {/* Botão Novo Pedido */}
      {showButton && (
        <button
          type="button"
          onClick={onNewClick}
          className="
            w-full sm:w-auto
            inline-flex items-center justify-center
            gap-2
            bg-yellow-500 hover:bg-yellow-600
            text-white text-sm font-medium
            py-2 px-4 rounded-lg shadow-sm transition
          "
        >
          <span className="hidden sm:inline">Novo Pedido</span>
          <AddPlusCircle width={20} height={20} />
        </button>
      )}
    </div>
  );
};

export default CardHeader;
