import { User01, Mail, Lock } from "react-coolicons";
import { useTranslation } from "react-i18next";

const UserForm = ({ formData, setFormData, isEditing = false }) => {
  const { t } = useTranslation();
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          {t("users:form.name")}
        </label>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <User01 className="h-5 w-5 text-gray-400" />
          </div>

          <input
            type="text"
            name="name"
            id="name"
            value={formData.name}
            onChange={handleInputChange}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
            placeholder={t("users:form.namePlaceholder")}
            required
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          {t("users:form.email")}
        </label>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Mail className="h-5 w-5 text-gray-400" />
          </div>

          <input
            disabled={isEditing}
            type="email"
            name="email"
            id="email"
            value={formData.email}
            onChange={handleInputChange}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 disabled:bg-gray-100"
            placeholder={t("users:form.emailPlaceholder")}
            required
          />
        </div>
      </div>

      {!isEditing && (
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            {t("users:form.password")}
          </label>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>

            <input
              type="password"
              name="password"
              id="password"
              value={formData.password || ''}
              onChange={handleInputChange}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
              placeholder={t("users:form.passwordPlaceholder")}
              required={!isEditing}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default UserForm;
