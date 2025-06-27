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
            <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
            />
        </div>
    </div>
);

export default CorInput;
