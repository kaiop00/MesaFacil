import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { CloseLg } from "react-coolicons";

const BaseModalWithHeader = ({ isOpen, onClose, title, subTitle, icon: Icon, children }) => {
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-2xl rounded-lg bg-white shadow-xl overflow-hidden">
          {/* Cabeçalho */}
          <div className="font-inter flex justify-between items-center px-6 py-4 bg-primary-dynamic">
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
          <div className="max-h-[80vh] overflow-y-auto px-4 sm:px-6 py-4">
            {children}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
};

export default BaseModalWithHeader;
