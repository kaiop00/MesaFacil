import TableCard from '@/components/TableCard'

const TableSection = ({
  title,
  occupied,    // true = “Pedidos em Andamento”, false = “Mesas Livres”
  items,       // array: { table, timeAgo?, price? }
}) => {
  // ponto colorido e texto “Ver Todos”
  const dotColor = occupied ? 'bg-yellow-500' : 'bg-green-500'

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
            key={idx}
            table={it.table}
            timeAgo={it.timeAgo}
            price={it.price}
            occupied={occupied}
            onMenuClick={() => console.log('Menu:', it.table)}
          />
        ))}
      </div>
    </section>
  )
}

export default TableSection
