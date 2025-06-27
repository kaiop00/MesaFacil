import { Settings } from "react-coolicons";

const ModalIntro = () => (
  <div className="w-full md:w-1/2 bg-gradient-to-b from-orange-400 to-red-500 rounded-lg p-6 text-white flex flex-col justify-center">
    <div className="text-2xl mb-2"><Settings /></div>
    <h2 className="text-lg font-semibold leading-snug">Antes de Começar,</h2>
    <p className="text-sm leading-snug mt-1">
      precisamos só definir algumas configurações
    </p>
    <p className="text-sm mt-4 opacity-90">Preencha as informações para continuar</p>
  </div>
);

export default ModalIntro;
