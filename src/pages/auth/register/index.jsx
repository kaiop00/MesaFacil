import CadastroFormSection from "./CadastroFormSection";
import LoginVisualSection from "../components/LoginVisualSection";

export default function Cadastro() {
  return (
    <div className="min-h-screen flex">
      <div className="w-full md:w-[30%] flex flex-col justify-between bg-white min-h-screen">
        <CadastroFormSection />
      </div>
      <LoginVisualSection />
    </div>
  );
}
