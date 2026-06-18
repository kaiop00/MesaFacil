import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { CloseLg } from "react-coolicons";

const BaseModalWithHeader = ({ isOpen, onClose, title, subTitle, icon: Icon, children, zIndex = 50 }) => {
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative" style={{ zIndex }}>
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-start justify-center overflow-y-auto p-2 sm:items-center sm:p-4">
        <DialogPanel className="flex w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-lg max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100vh-2rem)]">
          {/* Cabeçalho */}
          <div className="font-inter flex shrink-0 items-center justify-between bg-primary-dynamic px-4 py-4 sm:px-6">
            <div className="flex items-start gap-3">
              {Icon && <Icon className="text-white w-9 h-9 mr-2" />}
              <div>
                <DialogTitle className="text-white text-base font-semibold leading-tight">
                  {title}
                </DialogTitle>
                {subTitle && <p className="text-white text-sm leading-tight">{subTitle}</p>}
              </div>
            </div>

            <button type="button" onClick={onClose}>
              <CloseLg className="text-white cursor-pointer" />
            </button>
          </div>

          {/* Corpo do modal scrollável */}
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            {children}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
};

export default BaseModalWithHeader;
