import TableCard from '@/features/order/components/TableCard'
import { useTranslation } from "react-i18next";

const TableSection = ({
  title,
  status,
  items,
  idRestaurante,
  onOpenDetail,
  onTransfer,
}) => {
  const { t } = useTranslation('order');

  const dotColorMap = {
    livre: 'bg-green-500',
    andamento: 'bg-yellow-500',
    entregue: 'bg-red-500',
  };


  const dotColor = dotColorMap[status] || 'bg-gray-400';

  return (
    <section className="mb-8">
      <header className="flex items-center px-2 mb-4">
        <span className={`w-2 h-2 rounded-full ${dotColor} mr-2`} />
        <h2 className="text-lg font-semibold">{title}</h2>
        <button
          type="button"
          className="ml-auto text-sm text-gray-500 hover:underline"
        >
          {t('common.actions')}
        </button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((it, idx) => (
          <TableCard
            key={it.mesa?.id || `mesa-${it.numero}-${idx}`}
            numero={it.numero}
            status={status}
            timeAgo={it.timeAgo}
            total={it.total}
            mesa={it.mesa}
            idRestaurante={idRestaurante}
            onOpenDetail={onOpenDetail}
            onTransfer={onTransfer}
          />
        ))}
      </div>
    </section>
  )
}

export default TableSection;
