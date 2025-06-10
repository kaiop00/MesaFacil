import { MoreHorizontal, MagnifyingGlassPlus, EditPencil01, CloseLg } from "react-coolicons";
import { useState, useRef, useEffect } from "react";

const UserListItem = ({ user, onDetailsClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleDropdown = (e) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleAction = (e, action) => {
    e.stopPropagation();
    setIsOpen(false);

    if (action === 'details' && onDetailsClick) {
      onDetailsClick(user);
    } else {
      console.log(`${action} user:`, user.id);
    }
  };

  return (
    <div className="grid grid-cols-4 gap-4 px-6 py-4 hover:bg-gray-50 relative">
      <p className="self-center text-sm font-medium text-gray-900 wrap-anywhere">
        {user.name}
      </p>

      <p className="self-center text-sm text-gray-600 wrap-anywhere">
        {user.email}
      </p>

      <div>
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${user.status === 'Ativo'
            ? 'bg-green-100 text-green-800'
            : 'bg-orange-100 text-orange-800'
            }`}
        >
          {user.status}
        </span>
      </div>

      <div className="flex justify-end relative" ref={dropdownRef}>
        <button
          onClick={toggleDropdown}
          className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
          aria-label="Ações"
        >
          <MoreHorizontal className="w-5 h-5" />
        </button>

        {isOpen && (
          <menu className="absolute right-0 mt-8 w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
            <div className="py-1">
              <p className="px-4 py-2 text-xs font-medium text-gray-500 border-b border-gray-100">
                Ações
              </p>

              <button
                onClick={(e) => handleAction(e, 'details')}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <MagnifyingGlassPlus className="w-4 h-4 mr-2 text-gray-500" />
                Detalhes
              </button>

              <button
                onClick={(e) => handleAction(e, 'edit')}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <EditPencil01 className="w-4 h-4 mr-2 text-gray-500" />
                Editar
              </button>

              <button
                onClick={(e) => handleAction(e, 'deactivate')}
                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
              >
                <CloseLg className="w-4 h-4 mr-2 text-red-500" />
                Inativar
              </button>
            </div>
          </menu>
        )}
      </div>
    </div>
  );
};

export default UserListItem;