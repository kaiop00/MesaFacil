export default function AuthInputGroup({
  label,
  type = "text",
  value,
  onChange,
  placeholder = "",
  showToggle = false,
  mostrarSenha,
  setMostrarSenha
}) {
  return (
    <div className="mb-4">
      <label className="text-sm text-gray-700 block font-inter mb-1">{label}</label>
      <div className="relative">
        <input
          type={showToggle ? (mostrarSenha ? "text" : "password") : type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full border border-gray-300 rounded px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {showToggle && (
          <button
            type="button"
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm"
            onClick={() => setMostrarSenha(!mostrarSenha)}
          >
            👁️
          </button>
        )}
      </div>
    </div>
  );
}
