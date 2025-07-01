import TableCard from '@/features/order/components/TableCard'

const TableSection = ({
  title,
  status,  
  items,
  idRestaurante,   
}) => {

  const dotColorMap = {
    livre: 'bg-green-500',
    andamento: 'bg-yellow-500',
    pendente: 'bg-red-500',
  };

  const dotColor = dotColorMap[status] || 'bg-gray-400';

  return (
    <section className="mb-8">
      <header className="flex items-center px-2 mb-4">
        <span className={`w-2 h-2 rounded-full ${dotColor} mr-2`} />
        <h2 className="text-lg font-semibold">{title}</h2>
        <a
          href="#"
          className="ml-auto text-sm text-gray-500 hover:underline"
        >
          Ver Todos
        </a>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((it, idx) => (
          <TableCard
            key={it.mesa.id}
            numero={it.numero}
            status={status}
            timeAgo={it.timeAgo}
            price={it.price}
            mesa={it.mesa}
            idRestaurante={idRestaurante}
          />
        ))}
      </div>
    </section>
  )
}

export default TableSection;
