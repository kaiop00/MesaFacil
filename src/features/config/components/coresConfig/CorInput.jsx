const CorInput = ({ color, setColor }) => (
  <div className="flex flex-col space-y-2">
    <label className="text-sm font-medium text-gray-700">
      Cores da Marca <span className="text-gray-400">(Opcional)</span>
    </label>
    <div className="flex items-center space-x-2">
      <div
        className="w-10 h-10 rounded border border-gray-300"
        style={{ backgroundColor: color }}
      />
      <select
        value={color}
        onChange={(e) => setColor(e.target.value)}
        className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
      >
        <option value="">Selecione uma cor</option>
        <option value="#FF0000">Vermelho</option>
        <option value="#0000FF">Azul</option>
        <option value="#008000">Verde</option>
        <option value="#FFFF00">Amarelo</option>
        <option value="#FFA500">Laranja</option>
        <option value="#800080">Roxo</option>
      </select>
    </div>
  </div>
);

export default CorInput;
