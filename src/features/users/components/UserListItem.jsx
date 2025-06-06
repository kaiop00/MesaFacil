import { MoreHorizontal } from "react-coolicons";

const UserListItem = ({ user }) => {
  return (
    <div className="grid grid-cols-4 gap-4 px-6 py-4 hover:bg-gray-50">
      <p className="self-center text-sm font-medium text-gray-900">
        {user.name}
      </p>

      <p className="self-center text-sm text-gray-600">
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

      <div className="flex justify-end">
        <button className="text-gray-400 hover:text-gray-600">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default UserListItem;