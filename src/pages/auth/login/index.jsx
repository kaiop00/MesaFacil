import LoginFormSection from "./LoginFormSection";
import LoginVisualSection from "../components/LoginVisualSection";

export default function Login() {
  return (
    <div className="min-h-screen flex">
      <div className="w-full md:w-[30%] flex flex-col justify-between bg-white min-h-screen">
        <LoginFormSection />
      </div>
      <LoginVisualSection />
    </div>
  );
}
